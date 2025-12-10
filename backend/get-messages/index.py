import json
import os
import psycopg2
from typing import Dict, Any
from math import radians, cos, sin, asin, sqrt

def calculate_distance(lat1, lon1, lat2, lon2):
    """Расчет расстояния между двумя точками в км (формула гаверсинуса)"""
    if not all([lat1, lon1, lat2, lon2]):
        return float('inf')
    
    lat1, lon1, lat2, lon2 = map(float, [lat1, lon1, lat2, lon2])
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a))
    km = 6371 * c
    return km

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Get nearby chat messages with user info and reactions based on geolocation
    Args: event with httpMethod, queryStringParameters (limit, offset), headers (X-User-Id)
          context with request_id
    Returns: HTTP response with messages array filtered by distance
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 204,
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
    
    params = event.get('queryStringParameters') or {}
    limit = int(params.get('limit', 20))
    offset = int(params.get('offset', 0))
    max_distance_km = float(params.get('radius', 100))  # Радиус по умолчанию 100км
    
    headers = event.get('headers', {})
    user_id_str = headers.get('X-User-Id') or headers.get('x-user-id')
    
    dsn = os.environ.get('TIMEWEB_DB_URL')
    if dsn and '?' in dsn:
        dsn += '&sslmode=require'
    elif dsn:
        dsn += '?sslmode=require'
    conn = psycopg2.connect(dsn)
    cur = conn.cursor()
    
    # Получаем координаты текущего пользователя
    current_user_lat = None
    current_user_lon = None
    
    if user_id_str:
        safe_user_id = str(int(user_id_str)).replace("'", "''")
        cur.execute(f"""
            SELECT latitude, longitude FROM users WHERE id = '{safe_user_id}'
        """)
        user_location = cur.fetchone()
        if user_location:
            current_user_lat, current_user_lon = user_location
    
    safe_limit = str(limit).replace("'", "''")
    safe_offset = str(offset).replace("'", "''")
    cur.execute(f"""
        SELECT 
            m.id, m.text, m.created_at,
            u.id, u.username, u.latitude, u.longitude
        FROM messages m
        JOIN users u ON m.user_id = u.id
        ORDER BY m.created_at DESC
        LIMIT {safe_limit} OFFSET {safe_offset}
    """)
    
    rows = cur.fetchall()
    
    if not rows:
        cur.close()
        conn.close()
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'isBase64Encoded': False,
            'body': json.dumps({'messages': []})
        }
    
    message_ids = [row[0] for row in rows]
    user_ids = list(set([row[3] for row in rows]))
    
    safe_message_ids = ','.join(str(int(mid)) for mid in message_ids)
    cur.execute(f"""
        SELECT message_id, emoji, COUNT(*) as count
        FROM message_reactions
        WHERE message_id IN ({safe_message_ids})
        GROUP BY message_id, emoji
    """)
    
    reactions_map = {}
    for r in cur.fetchall():
        msg_id = r[0]
        if msg_id not in reactions_map:
            reactions_map[msg_id] = []
        reactions_map[msg_id].append({'emoji': r[1], 'count': r[2]})
    
    safe_user_ids = ','.join(str(int(uid)) for uid in user_ids)
    cur.execute(f"""
        SELECT DISTINCT ON (user_id) user_id, photo_url
        FROM user_photos
        WHERE user_id IN ({safe_user_ids})
        ORDER BY user_id, display_order ASC, created_at DESC
    """)
    
    avatars_map = {row[0]: row[1] for row in cur.fetchall()}
    
    messages = []
    for row in rows:
        msg_id, text, created_at, user_id, username, msg_lat, msg_lon = row
        user_avatar = avatars_map.get(user_id, f'https://api.dicebear.com/7.x/avataaars/svg?seed={username}')
        
        # Фильтруем по расстоянию, если у пользователя установлены координаты
        if current_user_lat and current_user_lon:
            distance = calculate_distance(current_user_lat, current_user_lon, msg_lat, msg_lon)
            if distance > max_distance_km:
                continue  # Пропускаем слишком далёкие сообщения
        
        messages.append({
            'id': msg_id,
            'text': text,
            'created_at': created_at.isoformat() + 'Z',
            'user': {
                'id': user_id,
                'username': username,
                'avatar': user_avatar
            },
            'reactions': reactions_map.get(msg_id, [])
        })
    
    messages.reverse()
    
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'isBase64Encoded': False,
        'body': json.dumps({'messages': messages})
    }