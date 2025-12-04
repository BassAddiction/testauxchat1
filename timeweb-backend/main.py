from fastapi import FastAPI, HTTPException, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import psycopg2
from psycopg2.extras import RealDictCursor
import os
import json
import hashlib
from datetime import datetime

app = FastAPI(title="AuxChat API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    dsn = os.environ.get('DATABASE_URL')
    if not dsn:
        raise HTTPException(status_code=500, detail="DATABASE_URL not configured")
    
    # URL-decode password if needed
    from urllib.parse import unquote
    if '%' in dsn:
        dsn = unquote(dsn)
    
    return psycopg2.connect(dsn, cursor_factory=RealDictCursor)

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def verify_user(x_user_id: Optional[str] = Header(None)) -> int:
    if not x_user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    try:
        return int(x_user_id)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid user ID")

# Models
class LoginRequest(BaseModel):
    username: str
    password: str

class RegisterRequest(BaseModel):
    username: str
    phone: str
    password: str
    code: str

class SendMessageRequest(BaseModel):
    conversation_id: int
    content: str
    voice_url: Optional[str] = None
    voice_duration: Optional[int] = None

class SendSMSRequest(BaseModel):
    phone: str

class VerifySMSRequest(BaseModel):
    phone: str
    code: str

class ResetPasswordRequest(BaseModel):
    phone: str
    code: str
    new_password: str

class SubscribeRequest(BaseModel):
    target_user_id: int

class BlacklistRequest(BaseModel):
    user_id: int

class PhotoRequest(BaseModel):
    photo_url: str

class AdminActionRequest(BaseModel):
    user_id: int
    action: str
    amount: Optional[int] = None

class CreatePaymentRequest(BaseModel):
    amount: float
    description: str

# Routes
@app.get("/health")
async def health():
    return {"status": "ok", "message": "AuxChat API"}

@app.post("/login")
async def login(data: LoginRequest):
    conn = get_db()
    cur = conn.cursor()
    try:
        password_hash = hash_password(data.password)
        cur.execute(
            "SELECT id, username, energy FROM users WHERE phone = %s AND password_hash = %s",
            (data.username, password_hash)
        )
        user = cur.fetchone()
        if not user:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        return {
            "success": True,
            "userId": user['id'],
            "username": user['username'],
            "energy": user['energy']
        }
    finally:
        cur.close()
        conn.close()

@app.post("/register")
async def register(data: RegisterRequest):
    conn = get_db()
    cur = conn.cursor()
    try:
        # Verify SMS code
        cur.execute(
            "SELECT code, verified FROM sms_codes WHERE phone = %s ORDER BY created_at DESC LIMIT 1",
            (data.phone,)
        )
        code_row = cur.fetchone()
        if not code_row or code_row['code'] != data.code:
            raise HTTPException(status_code=400, detail="Invalid verification code")
        
        # Check if user exists
        cur.execute("SELECT id FROM users WHERE phone = %s", (data.phone,))
        if cur.fetchone():
            raise HTTPException(status_code=400, detail="User already exists")
        
        # Create user
        password_hash = hash_password(data.password)
        cur.execute(
            "INSERT INTO users (username, phone, password_hash, energy) VALUES (%s, %s, %s, 100) RETURNING id",
            (data.username, data.phone, password_hash)
        )
        user_id = cur.fetchone()['id']
        conn.commit()
        
        return {"success": True, "userId": user_id}
    finally:
        cur.close()
        conn.close()

@app.get("/user")
async def get_user(x_user_id: str = Header(None)):
    user_id = verify_user(x_user_id)
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute(
            "SELECT id, username, phone, avatar_url, energy, is_admin, bio, status, created_at FROM users WHERE id = %s",
            (user_id,)
        )
        user = cur.fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return dict(user)
    finally:
        cur.close()
        conn.close()

@app.post("/update-activity")
async def update_activity(x_user_id: str = Header(None)):
    user_id = verify_user(x_user_id)
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute(
            "UPDATE users SET last_activity = NOW() WHERE id = %s",
            (user_id,)
        )
        conn.commit()
        return {"success": True}
    finally:
        cur.close()
        conn.close()

@app.post("/update-username")
async def update_username(username: str, x_user_id: str = Header(None)):
    user_id = verify_user(x_user_id)
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute(
            "UPDATE users SET username = %s WHERE id = %s",
            (username, user_id)
        )
        conn.commit()
        return {"success": True}
    finally:
        cur.close()
        conn.close()

@app.get("/messages")
async def get_messages(limit: int = 20, offset: int = 0):
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT 
                m.id, m.text, m.created_at, m.voice_url, m.voice_duration,
                u.id as user_id, u.username
            FROM messages m
            JOIN users u ON m.user_id = u.id
            ORDER BY m.created_at DESC
            LIMIT %s OFFSET %s
        """, (limit, offset))
        
        rows = cur.fetchall()
        
        if not rows:
            return {"messages": []}
        
        message_ids = [row['id'] for row in rows]
        user_ids = list(set([row['user_id'] for row in rows]))
        
        # Get reactions
        cur.execute("""
            SELECT message_id, emoji, COUNT(*) as count
            FROM message_reactions
            WHERE message_id = ANY(%s)
            GROUP BY message_id, emoji
        """, (message_ids,))
        
        reactions_map = {}
        for r in cur.fetchall():
            msg_id = r['message_id']
            if msg_id not in reactions_map:
                reactions_map[msg_id] = []
            reactions_map[msg_id].append({'emoji': r['emoji'], 'count': r['count']})
        
        # Get avatars
        cur.execute("""
            SELECT DISTINCT ON (user_id) user_id, photo_url
            FROM user_photos
            WHERE user_id = ANY(%s)
            ORDER BY user_id, display_order ASC, created_at DESC
        """, (user_ids,))
        
        avatars_map = {row['user_id']: row['photo_url'] for row in cur.fetchall()}
        
        messages = []
        for row in rows:
            user_avatar = avatars_map.get(row['user_id'], f"https://api.dicebear.com/7.x/avataaars/svg?seed={row['username']}")
            messages.append({
                'id': row['id'],
                'text': row['text'],
                'created_at': row['created_at'].isoformat() + 'Z',
                'voice_url': row['voice_url'],
                'voice_duration': row['voice_duration'],
                'user': {
                    'id': row['user_id'],
                    'username': row['username'],
                    'avatar': user_avatar
                },
                'reactions': reactions_map.get(row['id'], [])
            })
        
        messages.reverse()
        return {"messages": messages}
    finally:
        cur.close()
        conn.close()

@app.post("/messages")
async def send_message(data: SendMessageRequest, x_user_id: str = Header(None)):
    user_id = verify_user(x_user_id)
    conn = get_db()
    cur = conn.cursor()
    try:
        # For public chat, conversation_id=1 means global chat
        if data.conversation_id == 1:
            cur.execute(
                "INSERT INTO messages (user_id, text, voice_url, voice_duration) VALUES (%s, %s, %s, %s) RETURNING id",
                (user_id, data.content, data.voice_url, data.voice_duration)
            )
        else:
            # Private message
            cur.execute(
                "INSERT INTO private_messages (sender_id, receiver_id, text, voice_url, voice_duration) VALUES (%s, %s, %s, %s, %s) RETURNING id",
                (user_id, data.conversation_id, data.content, data.voice_url, data.voice_duration)
            )
        
        message_id = cur.fetchone()['id']
        conn.commit()
        return {"success": True, "messageId": message_id}
    finally:
        cur.close()
        conn.close()

@app.get("/conversations")
async def get_conversations(x_user_id: str = Header(None)):
    user_id = verify_user(x_user_id)
    conn = get_db()
    cur = conn.cursor()
    try:
        # Get unique conversation partners
        cur.execute("""
            SELECT DISTINCT 
                CASE 
                    WHEN sender_id = %s THEN receiver_id 
                    ELSE sender_id 
                END as partner_id
            FROM private_messages
            WHERE sender_id = %s OR receiver_id = %s
        """, (user_id, user_id, user_id))
        
        partner_ids = [row['partner_id'] for row in cur.fetchall()]
        
        if not partner_ids:
            return {"conversations": []}
        
        conversations = []
        for partner_id in partner_ids:
            # Get partner info
            cur.execute("SELECT id, username, avatar_url FROM users WHERE id = %s", (partner_id,))
            partner = cur.fetchone()
            
            # Get last message
            cur.execute("""
                SELECT text, created_at, sender_id
                FROM private_messages
                WHERE (sender_id = %s AND receiver_id = %s) OR (sender_id = %s AND receiver_id = %s)
                ORDER BY created_at DESC LIMIT 1
            """, (user_id, partner_id, partner_id, user_id))
            last_msg = cur.fetchone()
            
            # Get unread count
            cur.execute("""
                SELECT COUNT(*) as unread
                FROM private_messages
                WHERE sender_id = %s AND receiver_id = %s AND is_read = FALSE
            """, (partner_id, user_id))
            unread = cur.fetchone()['unread']
            
            conversations.append({
                'id': partner_id,
                'partner': dict(partner),
                'lastMessage': last_msg['text'] if last_msg else None,
                'lastMessageAt': last_msg['created_at'].isoformat() + 'Z' if last_msg else None,
                'unreadCount': unread
            })
        
        return {"conversations": conversations}
    finally:
        cur.close()
        conn.close()

@app.get("/messages/{conversation_id}")
async def get_conversation_messages(conversation_id: int, x_user_id: str = Header(None)):
    user_id = verify_user(x_user_id)
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT 
                id, sender_id, receiver_id, text, is_read, created_at, voice_url, voice_duration
            FROM private_messages
            WHERE (sender_id = %s AND receiver_id = %s) OR (sender_id = %s AND receiver_id = %s)
            ORDER BY created_at ASC
        """, (user_id, conversation_id, conversation_id, user_id))
        
        messages = []
        for row in cur.fetchall():
            messages.append(dict(row))
        
        # Mark as read
        cur.execute("""
            UPDATE private_messages SET is_read = TRUE
            WHERE sender_id = %s AND receiver_id = %s AND is_read = FALSE
        """, (conversation_id, user_id))
        conn.commit()
        
        return {"messages": messages}
    finally:
        cur.close()
        conn.close()

@app.get("/unread-count")
async def get_unread_count(x_user_id: str = Header(None)):
    user_id = verify_user(x_user_id)
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT COUNT(*) as count
            FROM private_messages
            WHERE receiver_id = %s AND is_read = FALSE
        """, (user_id,))
        count = cur.fetchone()['count']
        return {"count": count}
    finally:
        cur.close()
        conn.close()

@app.get("/subscriptions")
async def get_subscriptions(x_user_id: str = Header(None)):
    user_id = verify_user(x_user_id)
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT s.subscribed_to_id, u.username, u.avatar_url
            FROM subscriptions s
            JOIN users u ON s.subscribed_to_id = u.id
            WHERE s.subscriber_id = %s
        """, (user_id,))
        
        subscriptions = [dict(row) for row in cur.fetchall()]
        return {"subscriptions": subscriptions}
    finally:
        cur.close()
        conn.close()

@app.post("/subscribe/{target_user_id}")
async def subscribe(target_user_id: int, x_user_id: str = Header(None)):
    user_id = verify_user(x_user_id)
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute(
            "INSERT INTO subscriptions (subscriber_id, subscribed_to_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
            (user_id, target_user_id)
        )
        conn.commit()
        return {"success": True}
    finally:
        cur.close()
        conn.close()

@app.delete("/subscribe/{target_user_id}")
async def unsubscribe(target_user_id: int, x_user_id: str = Header(None)):
    user_id = verify_user(x_user_id)
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute(
            "DELETE FROM subscriptions WHERE subscriber_id = %s AND subscribed_to_id = %s",
            (user_id, target_user_id)
        )
        conn.commit()
        return {"success": True}
    finally:
        cur.close()
        conn.close()

@app.get("/profile-photos")
async def get_profile_photos(x_user_id: str = Header(None)):
    user_id = verify_user(x_user_id)
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute(
            "SELECT id, photo_url, display_order, created_at FROM user_photos WHERE user_id = %s ORDER BY display_order, created_at",
            (user_id,)
        )
        photos = [dict(row) for row in cur.fetchall()]
        return {"photos": photos}
    finally:
        cur.close()
        conn.close()

@app.post("/profile-photos")
async def add_profile_photo(data: PhotoRequest, x_user_id: str = Header(None)):
    user_id = verify_user(x_user_id)
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute(
            "INSERT INTO user_photos (user_id, photo_url) VALUES (%s, %s) RETURNING id",
            (user_id, data.photo_url)
        )
        photo_id = cur.fetchone()['id']
        conn.commit()
        return {"success": True, "photoId": photo_id}
    finally:
        cur.close()
        conn.close()

@app.delete("/profile-photos/{photo_id}")
async def delete_profile_photo(photo_id: int, x_user_id: str = Header(None)):
    user_id = verify_user(x_user_id)
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute(
            "DELETE FROM user_photos WHERE id = %s AND user_id = %s",
            (photo_id, user_id)
        )
        conn.commit()
        return {"success": True}
    finally:
        cur.close()
        conn.close()

@app.get("/blacklist")
async def get_blacklist(x_user_id: str = Header(None)):
    user_id = verify_user(x_user_id)
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT b.blocked_user_id, u.username
            FROM blacklist b
            JOIN users u ON b.blocked_user_id = u.id
            WHERE b.user_id = %s
        """, (user_id,))
        blocked = [dict(row) for row in cur.fetchall()]
        return {"blocked": blocked}
    finally:
        cur.close()
        conn.close()

@app.get("/blacklist/{target_user_id}")
async def check_block_status(target_user_id: int, x_user_id: str = Header(None)):
    user_id = verify_user(x_user_id)
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute(
            "SELECT id FROM blacklist WHERE user_id = %s AND blocked_user_id = %s",
            (user_id, target_user_id)
        )
        blocked = cur.fetchone() is not None
        return {"blocked": blocked}
    finally:
        cur.close()
        conn.close()

@app.post("/blacklist")
async def block_user(data: BlacklistRequest, x_user_id: str = Header(None)):
    user_id = verify_user(x_user_id)
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

@app.delete("/blacklist/{target_user_id}")
async def unblock_user(target_user_id: int, x_user_id: str = Header(None)):
    user_id = verify_user(x_user_id)
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute(
            "DELETE FROM blacklist WHERE user_id = %s AND blocked_user_id = %s",
            (user_id, target_user_id)
        )
        conn.commit()
        return {"success": True}
    finally:
        cur.close()
        conn.close()

@app.post("/send-sms")
async def send_sms(data: SendSMSRequest):
    conn = get_db()
    cur = conn.cursor()
    try:
        # Generate 4-digit code
        import random
        code = str(random.randint(1000, 9999))
        
        # Store code
        cur.execute(
            "INSERT INTO sms_codes (phone, code, expires_at) VALUES (%s, %s, NOW() + INTERVAL '10 minutes')",
            (data.phone, code)
        )
        conn.commit()
        
        # In production, send via SMS.RU API
        # For now, just return success
        return {"success": True, "code": code}  # Remove code in production
    finally:
        cur.close()
        conn.close()

@app.post("/verify-sms")
async def verify_sms(data: VerifySMSRequest):
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute(
            "SELECT id FROM sms_codes WHERE phone = %s AND code = %s AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1",
            (data.phone, data.code)
        )
        if not cur.fetchone():
            raise HTTPException(status_code=400, detail="Invalid or expired code")
        
        cur.execute(
            "UPDATE sms_codes SET verified = TRUE WHERE phone = %s AND code = %s",
            (data.phone, data.code)
        )
        conn.commit()
        return {"success": True}
    finally:
        cur.close()
        conn.close()

@app.post("/reset-password")
async def reset_password(data: ResetPasswordRequest):
    conn = get_db()
    cur = conn.cursor()
    try:
        # Verify code
        cur.execute(
            "SELECT id FROM sms_codes WHERE phone = %s AND code = %s AND verified = TRUE ORDER BY created_at DESC LIMIT 1",
            (data.phone, data.code)
        )
        if not cur.fetchone():
            raise HTTPException(status_code=400, detail="Invalid verification code")
        
        # Update password
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

@app.get("/admin/users")
async def admin_get_users(x_user_id: str = Header(None)):
    user_id = verify_user(x_user_id)
    conn = get_db()
    cur = conn.cursor()
    try:
        # Check if admin
        cur.execute("SELECT is_admin FROM users WHERE id = %s", (user_id,))
        if not cur.fetchone()['is_admin']:
            raise HTTPException(status_code=403, detail="Admin access required")
        
        cur.execute("SELECT id, username, phone, energy, is_banned, created_at FROM users ORDER BY created_at DESC")
        users = [dict(row) for row in cur.fetchall()]
        return {"users": users}
    finally:
        cur.close()
        conn.close()

@app.post("/admin/users")
async def admin_action(data: AdminActionRequest, x_user_id: str = Header(None)):
    user_id = verify_user(x_user_id)
    conn = get_db()
    cur = conn.cursor()
    try:
        # Check if admin
        cur.execute("SELECT is_admin FROM users WHERE id = %s", (user_id,))
        if not cur.fetchone()['is_admin']:
            raise HTTPException(status_code=403, detail="Admin access required")
        
        if data.action == 'ban':
            cur.execute("UPDATE users SET is_banned = TRUE WHERE id = %s", (data.user_id,))
        elif data.action == 'unban':
            cur.execute("UPDATE users SET is_banned = FALSE WHERE id = %s", (data.user_id,))
        elif data.action == 'add_energy':
            cur.execute("UPDATE users SET energy = energy + %s WHERE id = %s", (data.amount, data.user_id))
        elif data.action == 'remove_energy':
            cur.execute("UPDATE users SET energy = energy - %s WHERE id = %s", (data.amount, data.user_id))
        
        conn.commit()
        return {"success": True}
    finally:
        cur.close()
        conn.close()

@app.get("/upload-url")
async def get_upload_url(contentType: str, extension: str):
    # Return mock upload URL for now
    # In production, integrate with S3/Timeweb storage
    return {
        "uploadUrl": f"https://storage.example.com/upload",
        "fileUrl": f"https://storage.example.com/files/photo.{extension}"
    }

@app.post("/payment/create")
async def create_payment(data: CreatePaymentRequest, x_user_id: str = Header(None)):
    user_id = verify_user(x_user_id)
    # YooKassa integration placeholder
    return {
        "success": True,
        "paymentUrl": "https://yookassa.ru/checkout/payments/mock",
        "paymentId": "mock-payment-id"
    }

@app.post("/payment/webhook")
async def payment_webhook(request: Request):
    # YooKassa webhook handler placeholder
    body = await request.json()
    return {"success": True}

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)