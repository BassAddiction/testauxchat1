import json
import os
import psycopg2
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Get user data by ID
    Args: event with httpMethod, queryStringParameters (user_id)
          context with request_id
    Returns: HTTP response with user data
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 204,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    if method != 'GET':
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    # Получаем user_id из query параметров или из заголовка X-User-Id
    params = event.get('queryStringParameters') or {}
    headers = event.get('headers') or {}
    user_id = params.get('user_id') or headers.get('X-User-Id') or headers.get('x-user-id')
    
    if not user_id:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'User ID required'}),
            'isBase64Encoded': False
        }
    
    dsn = os.environ.get('TIMEWEB_DB_URL')
    if dsn and '?' in dsn:
        dsn += '&sslmode=require'
    elif dsn:
        dsn += '?sslmode=require'
    conn = psycopg2.connect(dsn)
    cur = conn.cursor()
    
    # Use simple query protocol - escape single quotes
    safe_user_id = str(user_id).replace("'", "''")
    cur.execute(
        f"SELECT id, phone, username, avatar_url, energy, is_banned, bio, last_activity FROM users WHERE id = '{safe_user_id}'"
    )
    row = cur.fetchone()
    
    cur.close()
    conn.close()
    
    if not row:
        return {
            'statusCode': 404,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'User not found'}),
            'isBase64Encoded': False
        }
    
    # Проверяем активность (онлайн если был активен менее 5 минут назад)
    from datetime import datetime, timedelta
    last_activity = row[7]
    is_online = False
    if last_activity:
        time_diff = datetime.utcnow() - last_activity
        is_online = time_diff < timedelta(minutes=5)
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({
            'id': row[0],
            'phone': row[1],
            'username': row[2],
            'avatar': row[3] if row[3] else '',
            'energy': row[4],
            'is_admin': False,
            'is_banned': row[5] if row[5] is not None else False,
            'bio': row[6] if row[6] else '',
            'status': 'online' if is_online else 'offline'
        }),
        'isBase64Encoded': False
    }