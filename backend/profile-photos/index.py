'''
Business: Manage user profile photo gallery (upload, list, delete)
Args: event with httpMethod, headers (X-User-Id), body for photo URLs
Returns: HTTP response with photos list or operation status
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
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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
            'body': json.dumps({'error': 'X-User-Id header required'}),
            'isBase64Encoded': False
        }
    
    user_id = int(user_id_str)
    dsn = os.environ.get('TIMEWEB_DB_URL')
    if dsn and '?' in dsn:
        dsn += '&sslmode=require'
    elif dsn:
        dsn += '?sslmode=require'
    
    conn = psycopg2.connect(dsn)
    cur = conn.cursor()
    
    if method == 'GET':
        query_params = event.get('queryStringParameters', {})
        target_user_id = query_params.get('userId', user_id)
        
        cur.execute(
            f"SELECT id, photo_url, created_at, display_order FROM user_photos WHERE user_id = {target_user_id} ORDER BY display_order ASC, created_at DESC LIMIT 6"
        )
        rows = cur.fetchall()
        
        photos = [
            {'id': row[0], 'url': row[1], 'created_at': row[2].isoformat(), 'order': row[3]}
            for row in rows
        ]
        
        cur.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'photos': photos}),
            'isBase64Encoded': False
        }
    
    if method == 'POST':
        body_data = json.loads(event.get('body', '{}'))
        photo_url = body_data.get('photo_url', body_data.get('photoUrl', '')).strip()
        
        if not photo_url:
            cur.close()
            conn.close()
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'photoUrl required'}),
                'isBase64Encoded': False
            }
        
        cur.execute(
            f"SELECT COUNT(*) FROM user_photos WHERE user_id = {user_id}"
        )
        count = cur.fetchone()[0]
        
        if count >= 6:
            cur.close()
            conn.close()
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Maximum 6 photos allowed'}),
                'isBase64Encoded': False
            }
        
        photo_url_escaped = photo_url.replace("'", "''")
        cur.execute(
            f"INSERT INTO user_photos (user_id, photo_url) VALUES ({user_id}, '{photo_url_escaped}') RETURNING id"
        )
        photo_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'success': True, 'photoId': photo_id}),
            'isBase64Encoded': False
        }
    
    if method == 'PUT':
        body_data = json.loads(event.get('body', '{}'))
        photo_id = body_data.get('photoId')
        action = body_data.get('action')
        
        if not photo_id or action != 'set_main':
            cur.close()
            conn.close()
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'photoId and action=set_main required'}),
                'isBase64Encoded': False
            }
        
        cur.execute(
            f"UPDATE user_photos SET display_order = 999 WHERE user_id = {user_id}"
        )
        
        cur.execute(
            f"UPDATE user_photos SET display_order = 0 WHERE id = {photo_id} AND user_id = {user_id}"
        )
        
        conn.commit()
        cur.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'success': True}),
            'isBase64Encoded': False
        }
    
    if method == 'DELETE':
        query_params = event.get('queryStringParameters', {})
        photo_id_str = query_params.get('photoId')
        
        if not photo_id_str:
            cur.close()
            conn.close()
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'photoId required'}),
                'isBase64Encoded': False
            }
        
        photo_id = int(photo_id_str)
        
        cur.execute(
            f"DELETE FROM user_photos WHERE id = {photo_id} AND user_id = {user_id}"
        )
        affected = cur.rowcount
        conn.commit()
        cur.close()
        conn.close()
        
        if affected == 0:
            return {
                'statusCode': 404,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Photo not found'}),
                'isBase64Encoded': False
            }
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'success': True}),
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