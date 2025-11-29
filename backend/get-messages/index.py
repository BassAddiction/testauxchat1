import json
import os
import psycopg2
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Get all chat messages with user info and reactions
    Args: event with httpMethod, queryStringParameters (limit, offset)
          context with request_id
    Returns: HTTP response with messages array
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    if method != 'GET':
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'})
        }
    
    params = event.get('queryStringParameters') or {}
    limit = int(params.get('limit', 50))
    offset = int(params.get('offset', 0))
    
    dsn = os.environ.get('DATABASE_URL')
    conn = psycopg2.connect(dsn)
    cur = conn.cursor()
    
    cur.execute("""
        SELECT 
            m.id, m.text, m.created_at,
            u.id, u.username, u.avatar_url
        FROM t_p53416936_auxchat_energy_messa.messages m
        JOIN t_p53416936_auxchat_energy_messa.users u ON m.user_id = u.id
        ORDER BY m.created_at DESC
        LIMIT %s OFFSET %s
    """, (limit, offset))
    
    rows = cur.fetchall()
    messages = []
    
    for row in rows:
        msg_id, text, created_at, user_id, username, avatar = row
        
        cur.execute("""
            SELECT emoji, COUNT(*) as count
            FROM t_p53416936_auxchat_energy_messa.message_reactions
            WHERE message_id = %s
            GROUP BY emoji
        """, (msg_id,))
        
        reactions = [{'emoji': r[0], 'count': r[1]} for r in cur.fetchall()]
        
        messages.append({
            'id': msg_id,
            'text': text,
            'created_at': created_at.isoformat(),
            'user': {
                'id': user_id,
                'username': username,
                'avatar': avatar if avatar else ''
            },
            'reactions': reactions
        })
    
    messages.reverse()
    
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'messages': messages})
    }