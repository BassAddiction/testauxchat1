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
            'body': '',
            'isBase64Encoded': False
        }
    
    try:
        headers = event.get('headers', {})
        user_id_str = headers.get('X-User-Id') or headers.get('x-user-id')
        
        if not user_id_str:
            return {
                'statusCode': 401,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'X-User-Id header required'}),
                'isBase64Encoded': False
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
                    'body': json.dumps({'error': 'otherUserId query param required'}),
                    'isBase64Encoded': False
                }
            
            other_user_id = int(other_user_id_str)
            
            query = f"""
                SELECT pm.id, pm.sender_id, pm.receiver_id, pm.text, pm.is_read, pm.created_at,
                       u.username, u.avatar_url
                FROM t_p53416936_auxchat_energy_messa.private_messages pm
                JOIN t_p53416936_auxchat_energy_messa.users u ON u.id = pm.sender_id
                WHERE (pm.sender_id = {user_id} AND pm.receiver_id = {other_user_id}) 
                   OR (pm.sender_id = {other_user_id} AND pm.receiver_id = {user_id})
                ORDER BY pm.created_at ASC
                LIMIT 100
            """
            cur.execute(query)
            
            rows = cur.fetchall()
            
            messages = []
            for row in rows:
                messages.append({
                    'id': row[0],
                    'senderId': row[1],
                    'receiverId': row[2],
                    'text': row[3],
                    'isRead': row[4],
                    'createdAt': str(row[5]),
                    'sender': {'username': row[6], 'avatarUrl': row[7]}
                })
            
            update_query = f"""
                UPDATE t_p53416936_auxchat_energy_messa.private_messages 
                SET is_read = TRUE 
                WHERE receiver_id = {user_id} AND sender_id = {other_user_id} AND is_read = FALSE
            """
            cur.execute(update_query)
            conn.commit()
            
            cur.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'messages': messages}),
                'isBase64Encoded': False
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
                    'body': json.dumps({'error': 'receiverId and text required'}),
                    'isBase64Encoded': False
                }
            
            escaped_text = text.replace("'", "''")
            insert_query = f"""
                INSERT INTO t_p53416936_auxchat_energy_messa.private_messages 
                (sender_id, receiver_id, text) 
                VALUES ({user_id}, {receiver_id}, '{escaped_text}') 
                RETURNING id
            """
            cur.execute(insert_query)
            
            message_id = cur.fetchone()[0]
            conn.commit()
            cur.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'success': True, 'messageId': message_id}),
                'isBase64Encoded': False
            }
        
        cur.close()
        conn.close()
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    except Exception as e:
        print(f'Error in private-messages: {e}')
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)}),
            'isBase64Encoded': False
        }