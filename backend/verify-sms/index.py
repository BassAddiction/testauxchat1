import json
import os
import psycopg2
from typing import Dict, Any
from datetime import datetime

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Verify SMS code and return session token
    Args: event with httpMethod, body (phone, code)
          context with request_id
    Returns: HTTP response with verification result
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
    code = body_data.get('code', '').strip()
    
    if not phone or not code:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Phone and code required'}),
            'isBase64Encoded': False
        }
    
    dsn = os.environ.get('TIMEWEB_DB_URL')
    if dsn and '?' in dsn:
        dsn += '&sslmode=require'
    elif dsn:
        dsn += '?sslmode=require'
    conn = psycopg2.connect(dsn)
    cur = conn.cursor()
    
    # Ищем код в БД
    safe_phone = phone.replace("'", "''")
    cur.execute(
        f"SELECT id, code, expires_at, verified FROM sms_codes WHERE phone = '{safe_phone}' ORDER BY created_at DESC LIMIT 1"
    )
    result = cur.fetchone()
    
    if not result:
        cur.close()
        conn.close()
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Code not found'}),
            'isBase64Encoded': False
        }
    
    code_id, db_code, expires_at, verified = result
    
    # Проверяем код
    if verified:
        cur.close()
        conn.close()
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Code already used'}),
            'isBase64Encoded': False
        }
    
    if datetime.now() > expires_at:
        cur.close()
        conn.close()
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Code expired'}),
            'isBase64Encoded': False
        }
    
    if code != db_code:
        cur.close()
        conn.close()
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Invalid code'}),
            'isBase64Encoded': False
        }
    
    # Помечаем код как использованный
    safe_code_id = str(code_id).replace("'", "''")
    cur.execute(f"UPDATE sms_codes SET verified = TRUE WHERE id = '{safe_code_id}'")
    
    # Проверяем, есть ли пользователь с таким телефоном
    cur.execute(f"SELECT id FROM users WHERE phone = '{safe_phone}'")
    user_row = cur.fetchone()
    
    user_id = None
    if user_row:
        user_id = user_row[0]
    
    conn.commit()
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'success': True, 'phone': phone, 'user_id': user_id, 'is_new': user_id is None}),
        'isBase64Encoded': False
    }