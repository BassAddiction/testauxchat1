import json
import urllib.request
import urllib.parse
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Определить город по координатам через Nominatim API
    Args: event with httpMethod, queryStringParameters (lat, lon)
          context with request_id
    Returns: HTTP response with city name
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
    lat = params.get('lat')
    lon = params.get('lon')
    
    if not lat or not lon:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Latitude and longitude required'}),
            'isBase64Encoded': False
        }
    
    try:
        # Nominatim requires User-Agent header
        url = f'https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lon}&format=json&accept-language=ru'
        req = urllib.request.Request(url, headers={'User-Agent': 'AuxChat/1.0'})
        
        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read().decode('utf-8'))
            
            address = data.get('address', {})
            city = (
                address.get('city') or 
                address.get('town') or 
                address.get('village') or 
                address.get('municipality') or
                address.get('state') or
                ''
            )
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'city': city,
                    'address': address
                }),
                'isBase64Encoded': False
            }
    
    except Exception as e:
        print(f'[GEOCODE] Error: {e}')
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Geocoding failed', 'city': ''}),
            'isBase64Encoded': False
        }
