'''
Business: Get list of user conversations with last message preview
Args: event with httpMethod, headers (X-User-Id)
Returns: HTTP response with conversations list
'''

import json
import os
import psycopg2
from typing import Dict, Any
from datetime import datetime, timedelta

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'GET')
    
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
    
    if method != 'GET':
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
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
    dsn = os.environ.get('TIMEWEB_DB_URL')
    
    if not dsn or not dsn.startswith('postgresql://'):
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'isBase64Encoded': False,
            'body': json.dumps({'error': 'TIMEWEB_DB_URL не установлен или неправильный формат'})
        }
    
    # Добавляем sslmode=require для Timeweb Cloud
    if '?' in dsn:
        dsn += '&sslmode=require'
    else:
        dsn += '?sslmode=require'
    
    conn = psycopg2.connect(dsn)
    cur = conn.cursor()
    
    safe_user_id = str(user_id).replace("'", "''")
    cur.execute(f"""
        WITH last_messages AS (
            SELECT 
                CASE WHEN sender_id = '{safe_user_id}' THEN receiver_id ELSE sender_id END as other_user_id,
                text as last_message,
                created_at,
                ROW_NUMBER() OVER (PARTITION BY 
                    CASE WHEN sender_id = '{safe_user_id}' THEN receiver_id ELSE sender_id END 
                    ORDER BY created_at DESC) as rn
            FROM private_messages
            WHERE sender_id = '{safe_user_id}' OR receiver_id = '{safe_user_id}'
        ),
        unread_counts AS (
            SELECT receiver_id, sender_id, COUNT(*) as unread_count
            FROM private_messages
            WHERE receiver_id = '{safe_user_id}' AND is_read = FALSE
            GROUP BY receiver_id, sender_id
        )
        SELECT 
            u.id, u.username, u.avatar_url, u.last_activity,
            lm.last_message, lm.created_at,
            COALESCE(uc.unread_count, 0) as unread_count
        FROM last_messages lm
        JOIN users u ON u.id = lm.other_user_id
        LEFT JOIN unread_counts uc ON uc.sender_id = u.id
        WHERE lm.rn = 1
        ORDER BY lm.created_at DESC
    """)
    
    rows = cur.fetchall()
    
    conversations = []
    for row in rows:
        last_activity = row[3]
        is_online = False
        if last_activity:
            time_diff = datetime.utcnow() - last_activity
            is_online = time_diff < timedelta(minutes=5)
        
        conversations.append({
            'userId': row[0],
            'username': row[1],
            'avatarUrl': row[2],
            'status': 'online' if is_online else 'offline',
            'lastMessage': row[4],
            'lastMessageAt': row[5].isoformat(),
            'unreadCount': row[6]
        })
    
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'conversations': conversations}),
        'isBase64Encoded': False
    }