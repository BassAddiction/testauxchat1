import json
import os
import psycopg2
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Get user data by ID with geolocation and city
    Args: event with httpMethod, queryStringParameters (user_id)
          context with request_id
    Returns: HTTP response with user data including latitude, longitude, city
    '''
    print('[GET-USER v2] Handler called')  # Force redeploy
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
    print(f'[DEBUG GET-USER] DSN value: {dsn[:60] if dsn else "None/Empty"}')
    if dsn and '?' in dsn:
        dsn += '&sslmode=require'
    elif dsn:
        dsn += '?sslmode=require'
    print(f'[DEBUG GET-USER] Final DSN: {dsn[:60] if dsn else "None/Empty"}')
    conn = psycopg2.connect(dsn)
    cur = conn.cursor()
    
    # Use simple query protocol - escape single quotes
    safe_user_id = str(user_id).replace("'", "''")
    
    # Try with city column first, fallback if it doesn't exist
    try:
        cur.execute(
            f"SELECT id, phone, username, avatar_url, energy, is_banned, bio, last_activity, latitude, longitude, city FROM users WHERE id = '{safe_user_id}'"
        )
        row = cur.fetchone()
        has_city = True
    except Exception as e:
        print(f'[GET-USER] Error with city column, trying without: {e}')
        cur = conn.cursor()  # Reset cursor
        cur.execute(
            f"SELECT id, phone, username, avatar_url, energy, is_banned, bio, last_activity, latitude, longitude FROM users WHERE id = '{safe_user_id}'"
        )
        row = cur.fetchone()
        has_city = False
    
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
    
    result_data = {
        'id': row[0],
        'phone': row[1],
        'username': row[2],
        'avatar': row[3] if row[3] else '',
        'energy': row[4],
        'is_admin': False,
        'is_banned': row[5] if row[5] is not None else False,
        'bio': row[6] if row[6] else '',
        'status': 'online' if is_online else 'offline',
        'latitude': float(row[8]) if len(row) > 8 and row[8] is not None else None,
        'longitude': float(row[9]) if len(row) > 9 and row[9] is not None else None,
        'city': row[10] if has_city and len(row) > 10 and row[10] else ''
    }
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps(result_data),
        'isBase64Encoded': False
    }