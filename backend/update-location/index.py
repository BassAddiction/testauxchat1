import json
import os
import psycopg2
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Обновить геолокацию пользователя (latitude, longitude, city)
    Args: event with httpMethod, headers (X-User-Id), body (latitude, longitude, city)
          context with request_id
    Returns: HTTP response with success status
    '''
    print('[UPDATE-LOCATION v3] Handler called - deployed to poehali.dev')  # Force redeploy
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    if method != 'POST':
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
            'body': json.dumps({'error': 'Unauthorized'}),
            'isBase64Encoded': False
        }
    
    body_data = json.loads(event.get('body', '{}'))
    latitude = body_data.get('latitude')
    longitude = body_data.get('longitude')
    city = body_data.get('city', '').strip()
    
    if latitude is None or longitude is None:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Latitude and longitude required'}),
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
    
    safe_city = city.replace("'", "''") if city else ''
    
    # Try to update with city column, fallback if it doesn't exist
    try:
        cur.execute(f"""
            UPDATE users 
            SET latitude = {latitude}, longitude = {longitude}, city = '{safe_city}'
            WHERE id = {user_id}
        """)
        affected = cur.rowcount
        conn.commit()
        print(f'[UPDATE-LOCATION] Updated with city, rows affected: {affected}')
        cur.close()
        conn.close()
    except Exception as e:
        print(f'[UPDATE-LOCATION] Error with city column: {e}, reconnecting for fallback')
        # Close failed connection and create new one
        try:
            cur.close()
            conn.close()
        except:
            pass
        # Reconnect
        conn = psycopg2.connect(dsn)
        cur = conn.cursor()
        cur.execute(f"""
            UPDATE users 
            SET latitude = {latitude}, longitude = {longitude}
            WHERE id = {user_id}
        """)
        affected = cur.rowcount
        conn.commit()
        print(f'[UPDATE-LOCATION] Updated without city, rows affected: {affected}')
        cur.close()
        conn.close()
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({
            'success': True,
            'latitude': latitude,
            'longitude': longitude,
            'city': city
        }),
        'isBase64Encoded': False
    }