'''
Business: Upload voice message to Timeweb S3 and return URL
Args: event with httpMethod, body (base64 encoded audio), headers
Returns: HTTP response with S3 URL
'''

import json
import os
import base64
import hmac
import hashlib
import requests
from typing import Dict, Any
from datetime import datetime
from urllib.parse import quote

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'POST')
    
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
    
    try:
        print('=== STEP 1: Parsing body ===')
        body_data = json.loads(event.get('body', '{}'))
        audio_base64 = body_data.get('audioData', '')
        file_extension = body_data.get('extension', 'webm')
        print(f'Body parsed, extension: {file_extension}')
        
        if not audio_base64:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'audioData required'}),
                'isBase64Encoded': False
            }
        
        print('=== STEP 2: Decoding audio ===')
        audio_bytes = base64.b64decode(audio_base64)
        print(f'Audio decoded, size: {len(audio_bytes)} bytes')
        
        if len(audio_bytes) < 100:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Audio too short'}),
                'isBase64Encoded': False
            }
        
        print('=== STEP 3: Loading Timeweb S3 credentials ===')
        s3_access_key = os.environ.get('TIMEWEB_S3_ACCESS_KEY')
        s3_secret_key = os.environ.get('TIMEWEB_S3_SECRET_KEY')
        s3_bucket = os.environ.get('TIMEWEB_S3_BUCKET_NAME')
        s3_endpoint = os.environ.get('TIMEWEB_S3_ENDPOINT', 'https://s3.timeweb.cloud')
        
        if not all([s3_access_key, s3_secret_key, s3_bucket]):
            return {
                'statusCode': 500,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Timeweb S3 credentials not configured'}),
                'isBase64Encoded': False
            }
        
        print(f'S3 config: endpoint={s3_endpoint}, bucket={s3_bucket}')
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f'voice-messages/voice_{timestamp}.{file_extension}'
        content_type = 'audio/webm' if file_extension == 'webm' else 'audio/mp4'
        
        print(f'=== STEP 4: Uploading to Timeweb S3 via HTTP: {filename} ===')
        
        try:
            url = f'{s3_endpoint}/{s3_bucket}/{filename}'
            
            headers_to_sign = {
                'Content-Type': content_type,
                'x-amz-acl': 'public-read'
            }
            
            print(f'Uploading to: {url}')
            
            response = requests.put(
                url,
                data=audio_bytes,
                headers=headers_to_sign,
                auth=(s3_access_key, s3_secret_key),
                timeout=10
            )
            
            print(f'Upload response status: {response.status_code}')
            print(f'Upload response: {response.text[:200]}')
            
            if response.status_code not in [200, 201, 204]:
                return {
                    'statusCode': 500,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': f'S3 upload failed: {response.status_code}'}),
                    'isBase64Encoded': False
                }
            
            file_url = url
            print(f'Upload successful! URL: {file_url}')
            
        except Exception as upload_error:
            print(f'=== UPLOAD ERROR: {upload_error} ===')
            import traceback
            print(traceback.format_exc())
            raise
        print(f'File URL: {file_url}')
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'url': file_url}),
            'isBase64Encoded': False
        }
        
    except Exception as e:
        print(f'=== ERROR: {type(e).__name__}: {e} ===')
        import traceback
        print(f'Traceback: {traceback.format_exc()}')
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)}),
            'isBase64Encoded': False
        }