import json
import hashlib
import hmac
import os
import psycopg2
from typing import Dict, Any
from urllib.parse import parse_qs

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Validates Telegram login widget data and creates/updates user
    Args: event with httpMethod, body (Telegram auth data), queryStringParameters
          context with request_id
    Returns: HTTP response with user data or error
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'})
        }
    
    bot_token = os.environ.get('TELEGRAM_BOT_TOKEN')
    if not bot_token:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Bot token not configured'})
        }
    
    try:
        body_data = json.loads(event.get('body', '{}'))
        
        telegram_id = body_data.get('id')
        first_name = body_data.get('first_name', '')
        last_name = body_data.get('last_name', '')
        username = body_data.get('username', '')
        photo_url = body_data.get('photo_url', '')
        auth_date = body_data.get('auth_date', '')
        hash_value = body_data.get('hash', '')
        
        if not telegram_id or not hash_value:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Missing required fields'})
            }
        
        data_check_string_parts = []
        for key in sorted(body_data.keys()):
            if key != 'hash':
                data_check_string_parts.append(f"{key}={body_data[key]}")
        data_check_string = '\n'.join(data_check_string_parts)
        
        secret_key = hashlib.sha256(bot_token.encode()).digest()
        calculated_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
        
        if calculated_hash != hash_value:
            return {
                'statusCode': 401,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Invalid authentication data'})
            }
        
        display_name = username if username else f"{first_name} {last_name}".strip()
        if not display_name:
            display_name = f"User{telegram_id}"
        
        dsn = os.environ.get('DATABASE_URL')
        conn = psycopg2.connect(dsn)
        cur = conn.cursor()
        
        cur.execute(
            "SELECT id, username, energy, avatar_url FROM users WHERE telegram_id = %s",
            (telegram_id,)
        )
        existing_user = cur.fetchone()
        
        if existing_user:
            user_id, db_username, energy, db_avatar = existing_user
            cur.execute(
                "UPDATE users SET username = %s, avatar_url = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s",
                (display_name, photo_url or db_avatar, user_id)
            )
            conn.commit()
            
            result = {
                'id': user_id,
                'telegram_id': telegram_id,
                'username': display_name,
                'avatar': photo_url or db_avatar or f'https://api.dicebear.com/7.x/avataaars/svg?seed={display_name}',
                'energy': energy,
                'phone': 'Telegram'
            }
        else:
            cur.execute(
                "INSERT INTO users (telegram_id, username, avatar_url, phone, energy) VALUES (%s, %s, %s, %s, %s) RETURNING id, energy",
                (telegram_id, display_name, photo_url or f'https://api.dicebear.com/7.x/avataaars/svg?seed={display_name}', 'Telegram', 100)
            )
            user_id, energy = cur.fetchone()
            conn.commit()
            
            result = {
                'id': user_id,
                'telegram_id': telegram_id,
                'username': display_name,
                'avatar': photo_url or f'https://api.dicebear.com/7.x/avataaars/svg?seed={display_name}',
                'energy': energy,
                'phone': 'Telegram'
            }
        
        cur.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps(result)
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)})
        }
