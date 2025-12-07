import json
import os
import psycopg2
import hashlib
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Login user with phone and password via CI/CD test
    Args: event with httpMethod, body (phone, password)
          context with request_id
    Returns: HTTP response with user data and session
    '''
    print(f"[LOGIN] Received request: {event.get('httpMethod', 'GET')}")
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    body_data = json.loads(event.get('body', '{}'))
    phone = body_data.get('phone', '').strip()
    password = body_data.get('password', '').strip()
    
    if not phone or not password:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Phone and password required'}),
            'isBase64Encoded': False
        }
    
    dsn = os.environ.get('TIMEWEB_DB_URL')
    print(f'[DEBUG] Original DSN: {dsn[:50] if dsn else "None"}')
    if dsn and '?' in dsn:
        dsn += '&sslmode=require'
    elif dsn:
        dsn += '?sslmode=require'
    print(f'[DEBUG] Modified DSN: {dsn[:50] if dsn else "None"}')
    conn = psycopg2.connect(dsn)
    cur = conn.cursor()
    
    safe_phone = phone.replace("'", "''")
    cur.execute(
        f"SELECT id, username, avatar_url, password_hash, is_banned, is_admin, energy FROM users WHERE phone = '{safe_phone}'"
    )
    result = cur.fetchone()
    
    if not result:
        cur.close()
        conn.close()
        return {
            'statusCode': 401,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Invalid phone or password'}),
            'isBase64Encoded': False
        }
    
    user_id, username, avatar, password_hash, is_banned, is_admin, energy = result
    
    if not password_hash:
        cur.close()
        conn.close()
        return {
            'statusCode': 401,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Password not set. Please use SMS recovery.'}),
            'isBase64Encoded': False
        }
    
    input_hash = hashlib.sha256(password.encode()).hexdigest()
    
    if input_hash != password_hash:
        cur.close()
        conn.close()
        return {
            'statusCode': 401,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Invalid phone or password'}),
            'isBase64Encoded': False
        }
    
    if is_banned:
        cur.close()
        conn.close()
        return {
            'statusCode': 403,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'User is banned'}),
            'isBase64Encoded': False
        }
    
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({
            'id': user_id,
            'phone': phone,
            'username': username,
            'avatar': avatar if avatar else f'https://api.dicebear.com/7.x/avataaars/svg?seed={username}',
            'energy': energy,
            'is_admin': is_admin,
            'is_banned': is_banned
        }),
        'isBase64Encoded': False
    }