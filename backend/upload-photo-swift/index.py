import json
import os
import requests
from typing import Dict, Any
from datetime import datetime
import base64

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Загружает фотографию в Timeweb Swift хранилище
    Args: event - dict с httpMethod, body (base64 изображение)
    Returns: HTTP response с публичным URL загруженного файла
    '''
    method: str = event.get('httpMethod', 'POST')
    
    # Handle CORS OPTIONS
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'})
        }
    
    # Parse request
    body_str = event.get('body') or '{}'
    body_data = json.loads(body_str) if body_str else {}
    
    file_base64 = body_data.get('fileData') or body_data.get('audioData') or body_data.get('file')
    content_type = body_data.get('contentType', 'image/jpeg')
    
    if not file_base64:
        return {
            'statusCode': 400,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'No file data provided'})
        }
    
    # Decode base64
    try:
        if ',' in file_base64:
            file_base64 = file_base64.split(',')[1]
        file_data = base64.b64decode(file_base64)
    except Exception as e:
        return {
            'statusCode': 400,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': f'Invalid base64: {str(e)}'})
        }
    
    # Generate unique filename
    timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S_%f')
    extension = content_type.split('/')[-1]
    filename = f'photos/{timestamp}.{extension}'
    
    # Timeweb Swift API
    swift_user = os.environ['TIMEWEB_SWIFT_ACCESS_KEY']
    swift_key = os.environ['TIMEWEB_SWIFT_SECRET_KEY']
    container = os.environ['TIMEWEB_S3_BUCKET_NAME']
    
    # Authenticate with Swift
    auth_url = 'https://api.selcdn.ru/auth/v1.0'
    auth_headers = {
        'X-Auth-User': swift_user,
        'X-Auth-Key': swift_key
    }
    
    try:
        print('[SWIFT] Authenticating...')
        auth_response = requests.get(auth_url, headers=auth_headers, timeout=10)
        
        if auth_response.status_code != 204:
            print(f'[SWIFT] Auth failed: {auth_response.status_code}')
            raise Exception(f'Authentication failed: {auth_response.status_code}')
        
        storage_url = auth_response.headers['X-Storage-Url']
        auth_token = auth_response.headers['X-Auth-Token']
        
        print(f'[SWIFT] Authenticated, storage URL: {storage_url}')
        
        # Upload file
        upload_url = f'{storage_url}/{container}/{filename}'
        upload_headers = {
            'X-Auth-Token': auth_token,
            'Content-Type': content_type
        }
        
        print(f'[SWIFT] Uploading {len(file_data)} bytes to {upload_url}')
        upload_response = requests.put(
            upload_url,
            headers=upload_headers,
            data=file_data,
            timeout=30
        )
        
        if upload_response.status_code not in (200, 201, 204):
            raise Exception(f'Upload failed: {upload_response.status_code} {upload_response.text}')
        
        print('[SWIFT] Upload successful!')
        
        # Generate public URL
        public_url = f'https://api.selcdn.ru/{container}/{filename}'
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'isBase64Encoded': False,
            'body': json.dumps({'url': public_url, 'fileUrl': public_url})
        }
        
    except Exception as e:
        print(f'[SWIFT] Error: {type(e).__name__}: {str(e)}')
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': f'Upload failed: {str(e)}'})
        }
