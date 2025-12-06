import json
import os
import psycopg2
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Admin panel - manage users (list, ban, unban, add energy, set admin)
    Args: event with httpMethod, body (admin_id, action, target_user_id, value)
          context with request_id
    Returns: HTTP response with operation result
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    dsn = os.environ.get('DATABASE_URL')
    conn = psycopg2.connect(dsn)
    cur = conn.cursor()
    
    if method == 'GET':
        cur.execute("""
            SELECT id, phone, username, avatar_url, energy, created_at, is_banned
            FROM users
            ORDER BY created_at DESC
        """)
        
        users = []
        for row in cur.fetchall():
            users.append({
                'id': row[0],
                'phone': row[1],
                'username': row[2],
                'avatar': row[3],
                'energy': row[4],
                'is_admin': False,
                'is_banned': row[6] if row[6] is not None else False,
                'created_at': row[5].isoformat()
            })
        
        cur.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'users': users})
        }
    
    if method != 'POST':
        cur.close()
        conn.close()
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'})
        }
    
    body_data = json.loads(event.get('body', '{}'))
    action = body_data.get('action')
    target_user_id = body_data.get('target_user_id')
    
    admin_secret = body_data.get('admin_secret')
    expected_secret = os.environ.get('ADMIN_SECRET')
    
    if not admin_secret or admin_secret != expected_secret:
        cur.close()
        conn.close()
        return {
            'statusCode': 403,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Invalid admin secret'})
        }
    
    if action == 'add_energy':
        amount = body_data.get('amount', 0)
        cur.execute("UPDATE users SET energy = energy + %s WHERE id = %s", (amount, target_user_id))
        conn.commit()
        result = {'message': f"Added {amount} energy", 'success': True}
        
    elif action == 'ban':
        cur.execute("UPDATE users SET is_banned = TRUE WHERE id = %s", (target_user_id,))
        conn.commit()
        result = {'message': 'User banned', 'success': True}
        
    elif action == 'unban':
        cur.execute("UPDATE users SET is_banned = FALSE WHERE id = %s", (target_user_id,))
        conn.commit()
        result = {'message': 'User unbanned', 'success': True}
        
    elif action == 'delete':
        cur.execute("DELETE FROM messages WHERE user_id = %s", (target_user_id,))
        cur.execute("DELETE FROM message_reactions WHERE user_id = %s", (target_user_id,))
        cur.execute("DELETE FROM users WHERE id = %s", (target_user_id,))
        conn.commit()
        result = {'message': 'User deleted', 'success': True}
        
    else:
        cur.close()
        conn.close()
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Invalid action'})
        }
    
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps(result)
    }