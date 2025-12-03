from fastapi import FastAPI, HTTPException, Header, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from typing import Optional, List
import psycopg2
from psycopg2.extras import RealDictCursor
import os
import hashlib
import secrets
from datetime import datetime, timedelta
import hmac
import boto3
from botocore.client import Config

app = FastAPI(title="BaseAddiction API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    if 'DATABASE_URL' in os.environ:
        return psycopg2.connect(os.environ['DATABASE_URL'], cursor_factory=RealDictCursor)
    
    return psycopg2.connect(
        host=os.environ['DB_HOST'],
        port=os.environ['DB_PORT'],
        database=os.environ['DB_NAME'],
        user=os.environ['DB_USER'],
        password=os.environ['DB_PASSWORD'],
        sslmode='require',
        cursor_factory=RealDictCursor
    )

# Models
class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6)
    phone: str
    code: str

class LoginRequest(BaseModel):
    username: str
    password: str

class SendMessageRequest(BaseModel):
    conversation_id: int
    content: Optional[str] = None
    voice_url: Optional[str] = None
    voice_duration: Optional[int] = None

class CreateConversationRequest(BaseModel):
    user_id: int

class AddReactionRequest(BaseModel):
    message_id: int
    emoji: str

class AddEnergyRequest(BaseModel):
    amount: int

class SubscribeRequest(BaseModel):
    plan: str

class UpdateActivityRequest(BaseModel):
    pass

class SendSMSRequest(BaseModel):
    phone: str

class VerifySMSRequest(BaseModel):
    phone: str
    code: str

class ResetPasswordRequest(BaseModel):
    phone: str
    code: str
    new_password: str

class BlacklistRequest(BaseModel):
    user_id: int

class CreatePaymentRequest(BaseModel):
    amount: float
    description: str

# Auth Helper
def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def verify_token(x_user_id: Optional[str] = Header(None)) -> int:
    if not x_user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    try:
        return int(x_user_id)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid user ID")

# Routes
@app.get("/")
async def root():
    return {"message": "Hello World"}

@app.post("/register")
async def register(data: RegisterRequest):
    conn = get_db()
    cur = conn.cursor()
    
    try:
        cur.execute("SELECT id FROM users WHERE username = %s", (data.username,))
        if cur.fetchone():
            raise HTTPException(status_code=400, detail="Username already exists")
        
        cur.execute(
            "SELECT code FROM sms_codes WHERE phone = %s ORDER BY created_at DESC LIMIT 1",
            (data.phone,)
        )
        code_row = cur.fetchone()
        if not code_row or code_row['code'] != data.code:
            raise HTTPException(status_code=400, detail="Invalid verification code")
        
        password_hash = hash_password(data.password)
        cur.execute(
            "INSERT INTO users (username, password_hash, phone, energy_balance) VALUES (%s, %s, %s, 100) RETURNING id",
            (data.username, password_hash, data.phone)
        )
        user_id = cur.fetchone()['id']
        conn.commit()
        
        return {"success": True, "userId": user_id}
    finally:
        cur.close()
        conn.close()

@app.post("/login")
async def login(data: LoginRequest):
    conn = get_db()
    cur = conn.cursor()
    
    try:
        password_hash = hash_password(data.password)
        cur.execute(
            "SELECT id, username, energy_balance FROM users WHERE username = %s AND password_hash = %s",
            (data.username, password_hash)
        )
        user = cur.fetchone()
        
        if not user:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        return {
            "success": True,
            "userId": user['id'],
            "username": user['username'],
            "energyBalance": user['energy_balance']
        }
    finally:
        cur.close()
        conn.close()

@app.get("/user")
async def get_user(x_user_id: str = Header(None)):
    user_id = verify_token(x_user_id)
    conn = get_db()
    cur = conn.cursor()
    
    try:
        cur.execute(
            "SELECT id, username, phone, energy_balance, subscription_plan, subscription_expires_at, created_at FROM users WHERE id = %s",
            (user_id,)
        )
        user = cur.fetchone()
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        return dict(user)
    finally:
        cur.close()
        conn.close()

@app.get("/conversations")
async def get_conversations(x_user_id: str = Header(None)):
    user_id = verify_token(x_user_id)
    conn = get_db()
    cur = conn.cursor()
    
    try:
        cur.execute("""
            SELECT 
                c.id,
                c.user1_id,
                c.user2_id,
                c.created_at,
                u1.username as user1_username,
                u2.username as user2_username,
                m.content as last_message,
                m.created_at as last_message_at
            FROM conversations c
            JOIN users u1 ON c.user1_id = u1.id
            JOIN users u2 ON c.user2_id = u2.id
            LEFT JOIN messages m ON m.id = (
                SELECT id FROM messages 
                WHERE conversation_id = c.id 
                ORDER BY created_at DESC LIMIT 1
            )
            WHERE c.user1_id = %s OR c.user2_id = %s
            ORDER BY COALESCE(m.created_at, c.created_at) DESC
        """, (user_id, user_id))
        
        conversations = cur.fetchall()
        return [dict(c) for c in conversations]
    finally:
        cur.close()
        conn.close()

@app.get("/messages/{conversation_id}")
async def get_messages(conversation_id: int, x_user_id: str = Header(None)):
    user_id = verify_token(x_user_id)
    conn = get_db()
    cur = conn.cursor()
    
    try:
        cur.execute(
            "SELECT user1_id, user2_id FROM conversations WHERE id = %s",
            (conversation_id,)
        )
        conv = cur.fetchone()
        
        if not conv or (conv['user1_id'] != user_id and conv['user2_id'] != user_id):
            raise HTTPException(status_code=403, detail="Access denied")
        
        cur.execute("""
            SELECT m.*, u.username as sender_username
            FROM messages m
            JOIN users u ON m.sender_id = u.id
            WHERE m.conversation_id = %s
            ORDER BY m.created_at ASC
        """, (conversation_id,))
        
        messages = cur.fetchall()
        return [dict(m) for m in messages]
    finally:
        cur.close()
        conn.close()

@app.post("/messages")
async def send_message(data: SendMessageRequest, x_user_id: str = Header(None)):
    user_id = verify_token(x_user_id)
    conn = get_db()
    cur = conn.cursor()
    
    try:
        cur.execute(
            "SELECT user1_id, user2_id FROM conversations WHERE id = %s",
            (data.conversation_id,)
        )
        conv = cur.fetchone()
        
        if not conv or (conv['user1_id'] != user_id and conv['user2_id'] != user_id):
            raise HTTPException(status_code=403, detail="Access denied")
        
        cur.execute(
            "SELECT energy_balance FROM users WHERE id = %s",
            (user_id,)
        )
        balance = cur.fetchone()['energy_balance']
        
        if balance < 1:
            raise HTTPException(status_code=402, detail="Insufficient energy")
        
        cur.execute(
            "UPDATE users SET energy_balance = energy_balance - 1 WHERE id = %s",
            (user_id,)
        )
        
        cur.execute(
            "INSERT INTO messages (conversation_id, sender_id, content, voice_url, voice_duration) VALUES (%s, %s, %s, %s, %s) RETURNING id, created_at",
            (data.conversation_id, user_id, data.content, data.voice_url, data.voice_duration)
        )
        result = cur.fetchone()
        conn.commit()
        
        return {
            "success": True,
            "messageId": result['id'],
            "createdAt": result['created_at'].isoformat()
        }
    finally:
        cur.close()
        conn.close()

@app.post("/conversations")
async def create_conversation(data: CreateConversationRequest, x_user_id: str = Header(None)):
    user_id = verify_token(x_user_id)
    conn = get_db()
    cur = conn.cursor()
    
    try:
        if user_id == data.user_id:
            raise HTTPException(status_code=400, detail="Cannot create conversation with yourself")
        
        cur.execute(
            "SELECT id FROM conversations WHERE (user1_id = %s AND user2_id = %s) OR (user1_id = %s AND user2_id = %s)",
            (user_id, data.user_id, data.user_id, user_id)
        )
        existing = cur.fetchone()
        
        if existing:
            return {"conversationId": existing['id']}
        
        cur.execute(
            "INSERT INTO conversations (user1_id, user2_id) VALUES (%s, %s) RETURNING id",
            (user_id, data.user_id)
        )
        conv_id = cur.fetchone()['id']
        conn.commit()
        
        return {"conversationId": conv_id}
    finally:
        cur.close()
        conn.close()

@app.post("/reactions")
async def add_reaction(data: AddReactionRequest, x_user_id: str = Header(None)):
    user_id = verify_token(x_user_id)
    conn = get_db()
    cur = conn.cursor()
    
    try:
        cur.execute(
            "SELECT id FROM reactions WHERE message_id = %s AND user_id = %s",
            (data.message_id, user_id)
        )
        if cur.fetchone():
            cur.execute(
                "UPDATE reactions SET emoji = %s WHERE message_id = %s AND user_id = %s",
                (data.emoji, data.message_id, user_id)
            )
        else:
            cur.execute(
                "INSERT INTO reactions (message_id, user_id, emoji) VALUES (%s, %s, %s)",
                (data.message_id, user_id, data.emoji)
            )
        conn.commit()
        
        return {"success": True}
    finally:
        cur.close()
        conn.close()

@app.post("/energy/add")
async def add_energy(data: AddEnergyRequest, x_user_id: str = Header(None)):
    user_id = verify_token(x_user_id)
    conn = get_db()
    cur = conn.cursor()
    
    try:
        cur.execute(
            "UPDATE users SET energy_balance = energy_balance + %s WHERE id = %s RETURNING energy_balance",
            (data.amount, user_id)
        )
        new_balance = cur.fetchone()['energy_balance']
        conn.commit()
        
        return {"success": True, "newBalance": new_balance}
    finally:
        cur.close()
        conn.close()

@app.post("/subscribe")
async def subscribe(data: SubscribeRequest, x_user_id: str = Header(None)):
    user_id = verify_token(x_user_id)
    conn = get_db()
    cur = conn.cursor()
    
    try:
        expires_at = datetime.now() + timedelta(days=30)
        cur.execute(
            "UPDATE users SET subscription_plan = %s, subscription_expires_at = %s WHERE id = %s",
            (data.plan, expires_at, user_id)
        )
        conn.commit()
        
        return {"success": True, "expiresAt": expires_at.isoformat()}
    finally:
        cur.close()
        conn.close()

@app.get("/subscriptions")
async def get_subscriptions():
    return {
        "plans": [
            {"id": "basic", "name": "Basic", "price": 299, "energy": 1000},
            {"id": "premium", "name": "Premium", "price": 599, "energy": 3000},
            {"id": "unlimited", "name": "Unlimited", "price": 999, "energy": -1}
        ]
    }

@app.post("/activity")
async def update_activity(x_user_id: str = Header(None)):
    user_id = verify_token(x_user_id)
    conn = get_db()
    cur = conn.cursor()
    
    try:
        cur.execute(
            "UPDATE users SET last_active_at = NOW() WHERE id = %s",
            (user_id,)
        )
        conn.commit()
        return {"success": True}
    finally:
        cur.close()
        conn.close()

@app.post("/sms/send")
async def send_sms(data: SendSMSRequest):
    code = ''.join([str(secrets.randbelow(10)) for _ in range(4)])
    
    conn = get_db()
    cur = conn.cursor()
    
    try:
        cur.execute(
            "INSERT INTO sms_codes (phone, code) VALUES (%s, %s)",
            (data.phone, code)
        )
        conn.commit()
        
        print(f"SMS Code for {data.phone}: {code}")
        
        return {"success": True, "message": "Code sent"}
    finally:
        cur.close()
        conn.close()

@app.post("/sms/verify")
async def verify_sms(data: VerifySMSRequest):
    conn = get_db()
    cur = conn.cursor()
    
    try:
        cur.execute(
            "SELECT code FROM sms_codes WHERE phone = %s ORDER BY created_at DESC LIMIT 1",
            (data.phone,)
        )
        row = cur.fetchone()
        
        if not row or row['code'] != data.code:
            raise HTTPException(status_code=400, detail="Invalid code")
        
        return {"success": True}
    finally:
        cur.close()
        conn.close()

@app.post("/password/reset")
async def reset_password(data: ResetPasswordRequest):
    conn = get_db()
    cur = conn.cursor()
    
    try:
        cur.execute(
            "SELECT code FROM sms_codes WHERE phone = %s ORDER BY created_at DESC LIMIT 1",
            (data.phone,)
        )
        row = cur.fetchone()
        
        if not row or row['code'] != data.code:
            raise HTTPException(status_code=400, detail="Invalid code")
        
        password_hash = hash_password(data.new_password)
        cur.execute(
            "UPDATE users SET password_hash = %s WHERE phone = %s",
            (password_hash, data.phone)
        )
        conn.commit()
        
        return {"success": True}
    finally:
        cur.close()
        conn.close()

@app.post("/blacklist")
async def blacklist_user(data: BlacklistRequest, x_user_id: str = Header(None)):
    user_id = verify_token(x_user_id)
    conn = get_db()
    cur = conn.cursor()
    
    try:
        cur.execute(
            "INSERT INTO blacklist (user_id, blocked_user_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
            (user_id, data.user_id)
        )
        conn.commit()
        
        return {"success": True}
    finally:
        cur.close()
        conn.close()

@app.get("/admin/users")
async def admin_users(x_user_id: str = Header(None)):
    user_id = verify_token(x_user_id)
    conn = get_db()
    cur = conn.cursor()
    
    try:
        cur.execute("SELECT is_admin FROM users WHERE id = %s", (user_id,))
        user = cur.fetchone()
        
        if not user or not user.get('is_admin'):
            raise HTTPException(status_code=403, detail="Admin access required")
        
        cur.execute("SELECT id, username, phone, energy_balance, created_at FROM users")
        users = cur.fetchall()
        
        return [dict(u) for u in users]
    finally:
        cur.close()
        conn.close()

@app.get("/profile-photos")
async def get_profile_photos(x_user_id: str = Header(None)):
    user_id = verify_token(x_user_id)
    conn = get_db()
    cur = conn.cursor()
    
    try:
        cur.execute(
            "SELECT photo_url FROM users WHERE id = %s",
            (user_id,)
        )
        user = cur.fetchone()
        
        return {"photos": [user['photo_url']] if user and user['photo_url'] else []}
    finally:
        cur.close()
        conn.close()

@app.get("/upload-url")
async def generate_upload_url(contentType: str, extension: str):
    s3_client = boto3.client(
        's3',
        endpoint_url='https://s3.twcstorage.ru',
        aws_access_key_id=os.environ['TIMEWEB_S3_ACCESS_KEY'],
        aws_secret_access_key=os.environ['TIMEWEB_S3_SECRET_KEY'],
        config=Config(signature_version='s3v4', s3={'addressing_style': 'path'})
    )
    
    bucket_name = '27fe14e8-df1b0140-f925-43fc-9e59-9c13eb081128'
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S_%f')
    file_key = f'voice-messages/voice_{timestamp}.{extension}'
    
    upload_url = s3_client.generate_presigned_url(
        'put_object',
        Params={
            'Bucket': bucket_name,
            'Key': file_key,
            'ContentType': contentType
        },
        ExpiresIn=300
    )
    
    file_url = f'https://s3.twcstorage.ru/{bucket_name}/{file_key}'
    
    return {'uploadUrl': upload_url, 'fileUrl': file_url}

@app.post("/payment/create")
async def create_payment(data: CreatePaymentRequest, x_user_id: str = Header(None)):
    user_id = verify_token(x_user_id)
    
    return {
        "paymentId": "test_payment_" + secrets.token_hex(8),
        "paymentUrl": "https://payment.example.com/pay",
        "amount": data.amount
    }

@app.post("/payment/webhook")
async def payment_webhook(request: Request):
    body = await request.json()
    
    print("Payment webhook:", body)
    
    return {"success": True}

@app.get("/private-messages")
async def get_private_messages(x_user_id: str = Header(None)):
    user_id = verify_token(x_user_id)
    
    return {"messages": []}

# Serve React frontend
if os.path.exists("dist"):
    app.mount("/assets", StaticFiles(directory="dist/assets"), name="assets")
    
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        file_path = os.path.join("dist", full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse("dist/index.html")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)