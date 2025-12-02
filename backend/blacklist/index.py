"""
Business: Управление черным списком - блокировка/разблокировка пользователей
Args: event - dict with httpMethod, queryStringParameters, headers
      context - object with attributes: request_id, function_name
Returns: HTTP response dict with blocked users list or action result
"""
import json
import os
import psycopg2
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'GET')
    
    # Handle CORS OPTIONS request
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    headers = event.get('headers', {})
    user_id = headers.get('X-User-Id') or headers.get('x-user-id')
    
    if not user_id:
        return {
            'statusCode': 401,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Unauthorized'})
        }
    
    dsn = os.environ.get('DATABASE_URL')
    conn = psycopg2.connect(dsn)
    
    try:
        if method == 'GET':
            # Получить список заблокированных пользователей
            with conn.cursor() as cur:
                cur.execute('''
                    SELECT b.blocked_user_id, u.username
                    FROM blacklist b
                    JOIN users u ON b.blocked_user_id = u.id
                    WHERE b.user_id = %s
                    ORDER BY b.created_at DESC
                ''', (user_id,))
                
                blocked_users = [
                    {'userId': row[0], 'username': row[1]}
                    for row in cur.fetchall()
                ]
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'blockedUsers': blocked_users})
            }
        
        elif method == 'POST':
            # Добавить пользователя в черный список
            body_data = json.loads(event.get('body', '{}'))
            blocked_user_id = body_data.get('blockedUserId')
            
            if not blocked_user_id:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'blockedUserId required'})
                }
            
            if str(user_id) == str(blocked_user_id):
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Cannot block yourself'})
                }
            
            with conn.cursor() as cur:
                cur.execute('''
                    INSERT INTO blacklist (user_id, blocked_user_id)
                    VALUES (%s, %s)
                    ON CONFLICT (user_id, blocked_user_id) DO NOTHING
                ''', (user_id, blocked_user_id))
                conn.commit()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'success': True, 'message': 'User blocked'})
            }
        
        elif method == 'DELETE':
            # Удалить пользователя из черного списка
            params = event.get('queryStringParameters', {})
            blocked_user_id = params.get('blockedUserId')
            
            if not blocked_user_id:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'blockedUserId required'})
                }
            
            with conn.cursor() as cur:
                cur.execute('''
                    DELETE FROM blacklist
                    WHERE user_id = %s AND blocked_user_id = %s
                ''', (user_id, blocked_user_id))
                conn.commit()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'success': True, 'message': 'User unblocked'})
            }
        
        else:
            return {
                'statusCode': 405,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Method not allowed'})
            }
    
    finally:
        conn.close()
