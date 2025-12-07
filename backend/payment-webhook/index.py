'''
Business: Handle YooKassa payment webhook and add energy to user
Args: event with httpMethod, body containing payment notification from YooKassa
Returns: HTTP 200 response
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
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
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
    
    body_data = json.loads(event.get('body', '{}'))
    
    event_type = body_data.get('event')
    if event_type != 'payment.succeeded':
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'status': 'ignored'}),
            'isBase64Encoded': False
        }
    
    payment_object = body_data.get('object', {})
    metadata = payment_object.get('metadata', {})
    
    user_id = metadata.get('user_id')
    energy_amount = metadata.get('energy_amount')
    
    if not user_id or not energy_amount:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Invalid metadata'}),
            'isBase64Encoded': False
        }
    
    dsn = os.environ.get('TIMEWEB_DB_URL')
    if dsn and '?' in dsn:
        dsn += '&sslmode=require'
    elif dsn:
        dsn += '?sslmode=require'
    conn = psycopg2.connect(dsn)
    cur = conn.cursor()
    
    safe_energy_amount = str(int(energy_amount)).replace("'", "''")
    safe_user_id = str(int(user_id)).replace("'", "''")
    cur.execute(
        f"UPDATE users SET energy = energy + {safe_energy_amount} WHERE id = '{safe_user_id}'"
    )
    
    conn.commit()
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'isBase64Encoded': False,
        'body': json.dumps({'status': 'ok'})
    }