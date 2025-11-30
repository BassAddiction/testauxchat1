'''
Business: Send and receive private messages between users
Args: event with httpMethod, headers (X-User-Id), body with receiverId/text, query params
Returns: HTTP response with messages or send confirmation
'''

import json
import os
import psycopg2
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
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
    
    try:
        headers = event.get('headers', {})
        user_id_str = headers.get('X-User-Id') or headers.get('x-user-id')
        
        if not user_id_str:
            return {
                'statusCode': 401,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'X-User-Id header required'})
            }
        
        user_id = int(user_id_str)
        dsn = os.environ.get('DATABASE_URL')
        
        conn = psycopg2.connect(dsn)
        cur = conn.cursor()
        
        if method == 'GET':
            query_params = event.get('queryStringParameters', {}) or {}
            other_user_id_str = query_params.get('otherUserId')
            
            if not other_user_id_str:
                cur.close()
                conn.close()
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'otherUserId query param required'})
                }
            
            other_user_id = int(other_user_id_str)
            
            cur.execute("""
                SELECT pm.id, pm.sender_id, pm.receiver_id, pm.text, pm.is_read, pm.created_at,
                       u.username, u.avatar_url
                FROM t_p53416936_auxchat_energy_messa.private_messages pm
                JOIN t_p53416936_auxchat_energy_messa.users u ON u.id = pm.sender_id
                WHERE (pm.sender_id = %s AND pm.receiver_id = %s) 
                   OR (pm.sender_id = %s AND pm.receiver_id = %s)
                ORDER BY pm.created_at ASC
                LIMIT 100
            """, (user_id, other_user_id, other_user_id, user_id))
            
            rows = cur.fetchall()
            
            messages = [
                {
                    'id': row[0],
                    'senderId': row[1],
                    'receiverId': row[2],
                    'text': row[3],
                    'isRead': row[4],
                    'createdAt': row[5].isoformat(),
                    'sender': {'username': row[6], 'avatarUrl': row[7]}
                }
                for row in rows
            ]
            
            cur.execute("""
                UPDATE t_p53416936_auxchat_energy_messa.private_messages 
                SET is_read = TRUE 
                WHERE receiver_id = %s AND sender_id = %s AND is_read = FALSE
            """, (user_id, other_user_id))
            conn.commit()
            
            cur.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'messages': messages})
            }
        
        if method == 'POST':
            body_data = json.loads(event.get('body', '{}'))
            receiver_id = body_data.get('receiverId')
            text = body_data.get('text', '').strip()
            
            if not receiver_id or not text:
                cur.close()
                conn.close()
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'receiverId and text required'})
                }
            
            cur.execute("""
                INSERT INTO t_p53416936_auxchat_energy_messa.private_messages 
                (sender_id, receiver_id, text) 
                VALUES (%s, %s, %s) 
                RETURNING id
            """, (user_id, receiver_id, text))
            
            message_id = cur.fetchone()[0]
            conn.commit()
            cur.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'success': True, 'messageId': message_id})
            }
        
        cur.close()
        conn.close()
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'})
        }
    except Exception as e:
        print(f'Error in private-messages: {e}')
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)})
        }