'''
Business: Управление подписками пользователей - подписка/отписка и проверка статуса
Args: event with httpMethod (GET/POST/DELETE), headers (X-User-Id), queryStringParameters (targetUserId)
Returns: HTTP response with subscription status
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
                'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
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
    conn = psycopg2.connect(dsn)
    conn.autocommit = True
    cur = conn.cursor()
    
    try:
        if method == 'GET':
            # Проверить статус подписки на пользователя
            params = event.get('queryStringParameters') or {}
            target_user_id = params.get('targetUserId')
            
            if not target_user_id:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'targetUserId required'}),
                    'isBase64Encoded': False
                }
            
            safe_user_id = str(user_id).replace("'", "''")
            safe_target_id = str(int(target_user_id)).replace("'", "''")
            cur.execute(f'''
                SELECT COUNT(*) FROM subscriptions
                WHERE subscriber_id = '{safe_user_id}' AND subscribed_to_id = '{safe_target_id}'
            ''')
            
            is_subscribed = cur.fetchone()[0] > 0
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'isSubscribed': is_subscribed}),
                'isBase64Encoded': False
            }
        
        elif method == 'POST':
            # Подписаться на пользователя
            body = json.loads(event.get('body', '{}'))
            target_user_id = body.get('targetUserId')
            
            if not target_user_id:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'targetUserId required'}),
                    'isBase64Encoded': False
                }
            
            if user_id == int(target_user_id):
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Cannot subscribe to yourself'}),
                    'isBase64Encoded': False
                }
            
            safe_user_id = str(user_id).replace("'", "''")
            safe_target_id = str(int(target_user_id)).replace("'", "''")
            cur.execute(f'''
                INSERT INTO subscriptions (subscriber_id, subscribed_to_id)
                VALUES ('{safe_user_id}', '{safe_target_id}')
                ON CONFLICT (subscriber_id, subscribed_to_id) DO NOTHING
            ''')
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'success': True, 'message': 'Subscribed'}),
                'isBase64Encoded': False
            }
        
        elif method == 'DELETE':
            # Отписаться от пользователя
            params = event.get('queryStringParameters') or {}
            target_user_id = params.get('targetUserId')
            
            if not target_user_id:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'targetUserId required'}),
                    'isBase64Encoded': False
                }
            
            safe_user_id = str(user_id).replace("'", "''")
            safe_target_id = str(int(target_user_id)).replace("'", "''")
            cur.execute(f'''
                DELETE FROM subscriptions
                WHERE subscriber_id = '{safe_user_id}' AND subscribed_to_id = '{safe_target_id}'
            ''')
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'success': True, 'message': 'Unsubscribed'}),
                'isBase64Encoded': False
            }
        
        else:
            return {
                'statusCode': 405,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Method not allowed'}),
                'isBase64Encoded': False
            }
    
    finally:
        cur.close()
        conn.close()