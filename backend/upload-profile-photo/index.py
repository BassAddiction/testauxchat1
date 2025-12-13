'''
Business: Upload profile photo to S3 storage
Args: event with POST body containing base64 image
Returns: HTTP response with S3 file URL
'''

import json
import os
import base64
import boto3
from datetime import datetime
from typing import Dict, Any

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
        print('[START] Profile photo upload')
        
        body_str = event.get('body', '{}')
        body_data = json.loads(body_str)
        
        file_base64 = body_data.get('fileData', '')
        content_type = body_data.get('contentType', 'image/jpeg')
        
        print(f'[INFO] Content-Type: {content_type}, Base64 length: {len(file_base64)}')
        
        if not file_base64:
            print('[ERROR] No fileData in body')
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'No file data provided'}),
                'isBase64Encoded': False
            }
        
        if ',' in file_base64:
            file_base64 = file_base64.split(',')[1]
        
        file_data = base64.b64decode(file_base64)
        print(f'[INFO] Decoded file size: {len(file_data)} bytes')
        
        s3_access_key = os.environ.get('TIMEWEB_S3_ACCESS_KEY')
        s3_secret_key = os.environ.get('TIMEWEB_S3_SECRET_KEY')
        s3_bucket = os.environ.get('TIMEWEB_S3_BUCKET_NAME')
        s3_endpoint = os.environ.get('TIMEWEB_S3_ENDPOINT', 'https://s3.twcstorage.ru')
        
        if not all([s3_access_key, s3_secret_key, s3_bucket]):
            print('[ERROR] S3 credentials not configured')
            return {
                'statusCode': 500,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'S3 not configured'}),
                'isBase64Encoded': False
            }
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S_%f')
        extension = content_type.split('/')[1] if '/' in content_type else 'jpg'
        filename = f'profile-photos/photo_{timestamp}.{extension}'
        
        print(f'[INFO] Uploading to S3: {filename}')
        
        from botocore.config import Config
        s3_client = boto3.client(
            's3',
            endpoint_url=s3_endpoint,
            aws_access_key_id=s3_access_key,
            aws_secret_access_key=s3_secret_key,
            region_name='ru-1',
            config=Config(
                signature_version='s3v4',
                connect_timeout=5,
                read_timeout=15
            )
        )
        
        s3_client.put_object(
            Bucket=s3_bucket,
            Key=filename,
            Body=file_data,
            ContentType=content_type,
            ACL='public-read'
        )
        
        file_url = f'{s3_endpoint}/{s3_bucket}/{filename}'
        print(f'[SUCCESS] File uploaded: {file_url}')
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'fileUrl': file_url}),
            'isBase64Encoded': False
        }
        
    except Exception as e:
        print(f'[ERROR] {e}')
        import traceback
        print(traceback.format_exc())
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)}),
            'isBase64Encoded': False
        }
