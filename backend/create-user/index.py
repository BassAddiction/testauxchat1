import json
import os
import psycopg2
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Create new user after phone verification
    Args: event with httpMethod, body (phone, username, avatar)
          context with request_id
    Returns: HTTP response with user data
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
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
    username = body_data.get('username', '').strip()
    avatar = body_data.get('avatar', '')
    
    if not phone or not username:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Phone and username required'}),
            'isBase64Encoded': False
        }
    
    dsn = os.environ.get('TIMEWEB_DB_URL')
    conn = psycopg2.connect(dsn)
    cur = conn.cursor()
    
    safe_phone = phone.replace("'", "''")
    cur.execute(f"SELECT id FROM users WHERE phone = '{safe_phone}'")
    existing = cur.fetchone()
    
    if existing:
        cur.close()
        conn.close()
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'User already exists'}),
            'isBase64Encoded': False
        }
    
    safe_username = username.replace("'", "''")
    safe_avatar = avatar.replace("'", "''")
    cur.execute(
        f"INSERT INTO users (phone, username, avatar_url) VALUES ('{safe_phone}', '{safe_username}', '{safe_avatar}') RETURNING id"
    )
    user_id = cur.fetchone()[0]
    
    conn.commit()
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({
            'id': user_id,
            'phone': phone,
            'username': username,
            'avatar': avatar,
            'energy': 100,
            'is_admin': False
        }),
        'isBase64Encoded': False
    }