'''
Business: Получить список ID пользователей, на которых подписан текущий пользователь
Args: event with headers (X-User-Id)
Returns: HTTP response with array of subscribed user IDs
'''

import json
import os
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'GET')
    
    # Handle CORS OPTIONS
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    headers = event.get('headers', {})
    user_id_str = headers.get('X-User-Id') or headers.get('x-user-id')
    
    if not user_id_str:
        return {
            'statusCode': 401,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Unauthorized'}),
            'isBase64Encoded': False
        }
    
    user_id = int(user_id_str)
    
    import psycopg2
    dsn = os.environ.get('TIMEWEB_DB_URL')
    if dsn and '?' in dsn:
        dsn += '&sslmode=require'
    elif dsn:
        dsn += '?sslmode=require'
    conn = psycopg2.connect(dsn)
    cur = conn.cursor()
    
    try:
        safe_user_id = str(user_id).replace("'", "''")
        cur.execute(f'''
            SELECT subscribed_to_id FROM subscriptions
            WHERE subscriber_id = '{safe_user_id}'
        ''')
        
        subscribed_ids = [row[0] for row in cur.fetchall()]
        
        print(f'[GET_SUBSCRIPTIONS] user_id={user_id}, subscribed_ids={subscribed_ids}')
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'subscribedUserIds': subscribed_ids}),
            'isBase64Encoded': False
        }
    
    finally:
        cur.close()
        conn.close()