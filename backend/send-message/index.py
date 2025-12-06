import json
import os
import psycopg2
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Send chat message and deduct energy
    Args: event with httpMethod, body (user_id, text)
          context with request_id
    Returns: HTTP response with message data
    '''
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
            'body': ''
        }
    
    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'})
        }
    
    body_data = json.loads(event.get('body', '{}'))
    user_id = body_data.get('user_id')
    text = body_data.get('text', '').strip()
    
    if not user_id or not text:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'User ID and text required'})
        }
    
    if len(text) > 140:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Сообщение не должно превышать 140 символов'})
        }
    
    dsn = os.environ.get('DATABASE_URL')
    conn = psycopg2.connect(dsn)
    cur = conn.cursor()
    
    cur.execute("SELECT energy, is_banned FROM users WHERE id = %s", (user_id,))
    user_data = cur.fetchone()
    
    if not user_data:
        cur.close()
        conn.close()
        return {
            'statusCode': 404,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'User not found'})
        }
    
    energy = user_data[0]
    is_banned = user_data[1] if len(user_data) > 1 and user_data[1] is not None else False
    
    if is_banned:
        cur.close()
        conn.close()
        return {
            'statusCode': 403,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'User is banned'})
        }
    
    if energy < 10:
        cur.close()
        conn.close()
        return {
            'statusCode': 402,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Недостаточно энергии для отправки сообщения'})
        }
    
    cur.execute(
        "UPDATE users SET energy = energy - 10, last_activity = CURRENT_TIMESTAMP WHERE id = %s", 
        (user_id,)
    )
    
    cur.execute(
        "INSERT INTO messages (user_id, text) VALUES (%s, %s) RETURNING id, created_at",
        (user_id, text)
    )
    message_id, created_at = cur.fetchone()
    
    conn.commit()
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({
            'id': message_id,
            'user_id': user_id,
            'text': text,
            'created_at': created_at.isoformat(),
            'energy': energy - 10
        })
    }