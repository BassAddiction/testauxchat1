from flask import Flask, request, jsonify
from flask_cors import CORS
import psycopg2
from psycopg2.extras import RealDictCursor
import os
import hashlib
from datetime import datetime

app = Flask(__name__)
CORS(app, resources={
    r"/*": {
        "origins": "*",
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "X-User-Id"],
        "supports_credentials": False
    }
})

@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,X-User-Id')
    response.headers.add('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
    return response

def get_db():
    db_host = os.environ.get('DB_HOST')
    db_port = os.environ.get('DB_PORT', '5432')
    db_name = os.environ.get('DB_NAME')
    db_user = os.environ.get('DB_USER')
    db_pass = os.environ.get('DB_PASSWORD')
    
    if not all([db_host, db_name, db_user, db_pass]):
        raise Exception("DB config missing")
    
    dsn = f"postgresql://{db_user}:{db_pass}@{db_host}:{db_port}/{db_name}"
    return psycopg2.connect(dsn, cursor_factory=RealDictCursor)

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

@app.route('/health', methods=['GET', 'OPTIONS'])
def health():
    if request.method == 'OPTIONS':
        return '', 200
    
    db_host = os.environ.get('DB_HOST', 'NOT_SET')
    db_port = os.environ.get('DB_PORT', 'NOT_SET')
    db_name = os.environ.get('DB_NAME', 'NOT_SET')
    db_user = os.environ.get('DB_USER', 'NOT_SET')
    db_pass = os.environ.get('DB_PASSWORD', 'NOT_SET')
    
    return jsonify({
        "status": "ok",
        "message": "AuxChat API Flask",
        "db_config": {
            "host": db_host[:20] if db_host != 'NOT_SET' else 'NOT_SET',
            "port": db_port,
            "name": db_name,
            "user": db_user,
            "pass_length": len(db_pass) if db_pass != 'NOT_SET' else 0
        }
    })

@app.route('/messages', methods=['GET', 'OPTIONS'])
def get_messages():
    if request.method == 'OPTIONS':
        return '', 200
    
    limit = int(request.args.get('limit', 20))
    offset = int(request.args.get('offset', 0))
    
    conn = get_db()
    cur = conn.cursor()
    
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
        cur.close()
        conn.close()
        return jsonify({"messages": []})
    
    message_ids = [row['id'] for row in rows]
    user_ids = list(set([row['user_id'] for row in rows]))
    
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
    
    cur.close()
    conn.close()
    
    return jsonify({"messages": messages})

@app.route('/login', methods=['POST', 'OPTIONS'])
def login():
    if request.method == 'OPTIONS':
        return '', 200
    
    data = request.get_json()
    conn = get_db()
    cur = conn.cursor()
    
    password_hash = hash_password(data['password'])
    cur.execute(
        "SELECT id, username, energy FROM users WHERE phone = %s AND password_hash = %s",
        (data['username'], password_hash)
    )
    user = cur.fetchone()
    
    cur.close()
    conn.close()
    
    if not user:
        return jsonify({"error": "Invalid credentials"}), 401
    
    return jsonify({
        "success": True,
        "userId": user['id'],
        "username": user['username'],
        "energy": user['energy']
    })

@app.route('/user', methods=['GET', 'OPTIONS'])
def get_user():
    if request.method == 'OPTIONS':
        return '', 200
    
    user_id = request.headers.get('X-User-Id')
    if not user_id:
        return jsonify({"error": "Authentication required"}), 401
    
    conn = get_db()
    cur = conn.cursor()
    
    cur.execute("""
        SELECT id, username, energy, last_active, 
               CASE 
                   WHEN last_active > NOW() - INTERVAL '5 minutes' THEN 'online'
                   ELSE 'offline'
               END as status
        FROM users
        WHERE id = %s
    """, (int(user_id),))
    
    user = cur.fetchone()
    
    cur.close()
    conn.close()
    
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    return jsonify({
        "id": user['id'],
        "username": user['username'],
        "energy": user['energy'],
        "status": user['status'],
        "avatar": f"https://api.dicebear.com/7.x/avataaars/svg?seed={user['username']}"
    })

@app.route('/update-activity', methods=['POST', 'OPTIONS'])
def update_activity():
    if request.method == 'OPTIONS':
        return '', 200
    
    user_id = request.headers.get('X-User-Id')
    if not user_id:
        return jsonify({"error": "Authentication required"}), 401
    
    conn = get_db()
    cur = conn.cursor()
    
    cur.execute("""
        UPDATE users
        SET last_active = NOW()
        WHERE id = %s
    """, (int(user_id),))
    
    conn.commit()
    cur.close()
    conn.close()
    
    return jsonify({"success": True})

@app.route('/conversations', methods=['GET', 'OPTIONS'])
def get_conversations():
    if request.method == 'OPTIONS':
        return '', 200
    
    user_id = request.headers.get('X-User-Id')
    if not user_id:
        return jsonify({"error": "Authentication required"}), 401
    
    # Return empty conversations for now
    return jsonify({"conversations": []})

@app.route('/messages/<int:conversation_id>', methods=['GET', 'OPTIONS'])
def get_conversation_messages(conversation_id):
    if request.method == 'OPTIONS':
        return '', 200
    
    user_id = request.headers.get('X-User-Id')
    if not user_id:
        return jsonify({"error": "Authentication required"}), 401
    
    conn = get_db()
    cur = conn.cursor()
    
    # Get private messages between two users
    cur.execute("""
        SELECT 
            pm.id, pm.sender_id as "senderId", pm.receiver_id as "receiverId",
            pm.text, pm.is_read as "isRead", pm.created_at as "createdAt",
            pm.voice_url as "voiceUrl", pm.voice_duration as "voiceDuration",
            u.username, up.photo_url as "avatarUrl"
        FROM private_messages pm
        JOIN users u ON pm.sender_id = u.id
        LEFT JOIN (
            SELECT DISTINCT ON (user_id) user_id, photo_url
            FROM user_photos
            ORDER BY user_id, display_order ASC, created_at DESC
        ) up ON u.id = up.user_id
        WHERE (pm.sender_id = %s AND pm.receiver_id = %s)
           OR (pm.sender_id = %s AND pm.receiver_id = %s)
        ORDER BY pm.created_at ASC
    """, (int(user_id), conversation_id, conversation_id, int(user_id)))
    
    messages = []
    for row in cur.fetchall():
        messages.append({
            'id': row['id'],
            'senderId': row['senderId'],
            'receiverId': row['receiverId'],
            'text': row['text'],
            'isRead': row['isRead'],
            'createdAt': row['createdAt'].isoformat() + 'Z',
            'voiceUrl': row['voiceUrl'],
            'voiceDuration': row['voiceDuration'],
            'sender': {
                'username': row['username'],
                'avatarUrl': row['avatarUrl']
            }
        })
    
    cur.close()
    conn.close()
    
    return jsonify({"messages": messages})

@app.route('/profile-photos', methods=['GET', 'OPTIONS', 'POST', 'DELETE'])
def profile_photos():
    if request.method == 'OPTIONS':
        return '', 200
    
    user_id = request.headers.get('X-User-Id')
    if not user_id:
        return jsonify({"error": "Authentication required"}), 401
    
    conn = get_db()
    cur = conn.cursor()
    
    if request.method == 'GET':
        cur.execute("""
            SELECT id, photo_url as url, display_order
            FROM user_photos
            WHERE user_id = %s
            ORDER BY display_order ASC, created_at DESC
        """, (int(user_id),))
        
        photos = [dict(row) for row in cur.fetchall()]
        cur.close()
        conn.close()
        return jsonify({"photos": photos})
    
    elif request.method == 'POST':
        data = request.get_json()
        photo_url = data.get('photo_url')
        
        cur.execute("""
            INSERT INTO user_photos (user_id, photo_url, display_order)
            VALUES (%s, %s, 0)
            RETURNING id
        """, (int(user_id), photo_url))
        
        photo_id = cur.fetchone()['id']
        conn.commit()
        cur.close()
        conn.close()
        
        return jsonify({"success": True, "id": photo_id})
    
    return jsonify({"error": "Method not allowed"}), 405

@app.route('/blacklist', methods=['GET', 'POST', 'OPTIONS'])
@app.route('/blacklist/<int:target_user_id>', methods=['GET', 'DELETE', 'OPTIONS'])
def blacklist(target_user_id=None):
    if request.method == 'OPTIONS':
        return '', 200
    
    user_id = request.headers.get('X-User-Id')
    if not user_id:
        return jsonify({"error": "Authentication required"}), 401
    
    conn = get_db()
    cur = conn.cursor()
    
    if request.method == 'GET' and target_user_id is None:
        # Get user's blacklist
        cur.execute("""
            SELECT b.blocked_user_id as "userId", u.username
            FROM blacklist b
            JOIN users u ON b.blocked_user_id = u.id
            WHERE b.user_id = %s
        """, (int(user_id),))
        
        blocked = [dict(row) for row in cur.fetchall()]
        cur.close()
        conn.close()
        return jsonify({"blockedUsers": blocked})
    
    elif request.method == 'GET' and target_user_id:
        # Check if specific user is blocked
        cur.execute("""
            SELECT b.blocked_user_id as "userId", u.username
            FROM blacklist b
            JOIN users u ON b.blocked_user_id = u.id
            WHERE b.user_id = %s
        """, (int(user_id),))
        
        blocked = [dict(row) for row in cur.fetchall()]
        cur.close()
        conn.close()
        return jsonify({"blockedUsers": blocked})
    
    elif request.method == 'POST':
        data = request.get_json()
        target_id = data.get('user_id')
        
        cur.execute("""
            INSERT INTO blacklist (user_id, blocked_user_id)
            VALUES (%s, %s)
            ON CONFLICT DO NOTHING
        """, (int(user_id), target_id))
        
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"success": True})
    
    elif request.method == 'DELETE' and target_user_id:
        cur.execute("""
            DELETE FROM blacklist
            WHERE user_id = %s AND blocked_user_id = %s
        """, (int(user_id), target_user_id))
        
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"success": True})
    
    return jsonify({"error": "Method not allowed"}), 405

@app.route('/unread-count', methods=['GET', 'OPTIONS'])
def get_unread_count():
    if request.method == 'OPTIONS':
        return '', 200
    
    user_id = request.headers.get('X-User-Id')
    if not user_id:
        return jsonify({"error": "Authentication required"}), 401
    
    conn = get_db()
    cur = conn.cursor()
    
    cur.execute("""
        SELECT COUNT(*) as count
        FROM private_messages
        WHERE receiver_id = %s AND is_read = FALSE
    """, (int(user_id),))
    
    count = cur.fetchone()['count']
    
    cur.close()
    conn.close()
    
    return jsonify({"count": count})

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 8000))
    app.run(host="0.0.0.0", port=port)