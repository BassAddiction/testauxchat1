import json
import os
import psycopg2
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Add reaction to message
    Args: event with httpMethod, body (user_id, message_id, emoji)
          context with request_id
    Returns: HTTP response with operation result
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
    message_id = body_data.get('message_id')
    emoji = body_data.get('emoji', '').strip()
    
    if not user_id or not message_id or not emoji:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'User ID, message ID, and emoji required'})
        }
    
    dsn = os.environ.get('DATABASE_URL')
    conn = psycopg2.connect(dsn)
    cur = conn.cursor()
    
    cur.execute(
        "SELECT id FROM message_reactions WHERE message_id = %s AND user_id = %s AND emoji = %s",
        (message_id, user_id, emoji)
    )
    existing = cur.fetchone()
    
    if existing:
        cur.execute(
            "DELETE FROM message_reactions WHERE id = %s",
            (existing[0],)
        )
        action = 'removed'
    else:
        cur.execute(
            "INSERT INTO message_reactions (message_id, user_id, emoji) VALUES (%s, %s, %s)",
            (message_id, user_id, emoji)
        )
        action = 'added'
    
    conn.commit()
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'success': True, 'action': action})
    }