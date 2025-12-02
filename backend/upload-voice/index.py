'''
Business: Upload voice message to S3 and return URL
Args: event with httpMethod, body (base64 encoded audio), headers
Returns: HTTP response with S3 URL
'''

import json
import os
import boto3
import base64
from typing import Dict, Any
from datetime import datetime

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
        
        print('=== STEP 3: Loading S3 credentials ===')
        s3_access_key = os.environ.get('TIMEWEB_S3_ACCESS_KEY')
        s3_secret_key = os.environ.get('TIMEWEB_S3_SECRET_KEY')
        s3_bucket = os.environ.get('TIMEWEB_S3_BUCKET_NAME')
        s3_endpoint = os.environ.get('TIMEWEB_S3_ENDPOINT', 'https://s3.twcstorage.ru')
        s3_region = os.environ.get('TIMEWEB_S3_REGION', 'ru-1')
        print(f'S3 config: endpoint={s3_endpoint}, bucket={s3_bucket}, region={s3_region}')
        print(f'Credentials present: access_key={bool(s3_access_key)}, secret_key={bool(s3_secret_key)}')
        
        if not all([s3_access_key, s3_secret_key, s3_bucket]):
            return {
                'statusCode': 500,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'S3 credentials not configured'}),
                'isBase64Encoded': False
            }
        
        print('=== STEP 4: Creating S3 client ===')
        from botocore.config import Config
        
        s3_client = boto3.client(
            's3',
            aws_access_key_id=s3_access_key,
            aws_secret_access_key=s3_secret_key,
            region_name=s3_region,
            endpoint_url=s3_endpoint,
            config=Config(
                signature_version='s3v4',
                s3={'addressing_style': 'path'},
                connect_timeout=5,
                read_timeout=10
            )
        )
        print('S3 client created successfully')
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f'voice-messages/voice_{timestamp}.{file_extension}'
        content_type = 'audio/webm' if file_extension == 'webm' else 'audio/mp4'
        print(f'=== STEP 5: Uploading to S3: {filename} ===')
        
        s3_client.put_object(
            Bucket=s3_bucket,
            Key=filename,
            Body=audio_bytes,
            ContentType=content_type,
            ACL='public-read'
        )
        print('Upload successful!')
        
        file_url = f'{s3_endpoint}/{s3_bucket}/{filename}'
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