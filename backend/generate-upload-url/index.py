'''
Business: Generate pre-signed URL for Timeweb S3 upload
Args: event with httpMethod, query params (filename, contentType)
Returns: HTTP response with pre-signed upload URL
'''

import json
import os
import boto3
from botocore.config import Config
from typing import Dict, Any
from datetime import datetime

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    # Handle POST - direct upload via backend
    if method == 'POST':
        return handle_upload(event)
    
    # Handle GET - generate presigned URL (old way)
    if method == 'GET':
        return handle_get(event)
    
    return {
        'statusCode': 405,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'error': 'Method not allowed'}),
        'isBase64Encoded': False
    }

def handle_get(event: Dict[str, Any]) -> Dict[str, Any]:
    """Generate presigned URL for direct S3 upload"""
    try:
        query_params = event.get('queryStringParameters', {}) or {}
        content_type = query_params.get('contentType', 'audio/webm')
        extension = query_params.get('extension', 'webm')
        
        s3_access_key = os.environ.get('TIMEWEB_S3_ACCESS_KEY')
        s3_secret_key = os.environ.get('TIMEWEB_S3_SECRET_KEY')
        s3_bucket = os.environ.get('TIMEWEB_S3_BUCKET_NAME')
        s3_endpoint = os.environ.get('TIMEWEB_S3_ENDPOINT', 'https://s3.twcstorage.ru')
        s3_region = os.environ.get('TIMEWEB_S3_REGION', 'ru-1')
        
        if not all([s3_access_key, s3_secret_key, s3_bucket]):
            return {
                'statusCode': 500,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'S3 credentials not configured'}),
                'isBase64Encoded': False
            }
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S_%f')
        filename = f'voice-messages/voice_{timestamp}.{extension}'
        
        s3_client = boto3.client(
            's3',
            endpoint_url=s3_endpoint,
            aws_access_key_id=s3_access_key,
            aws_secret_access_key=s3_secret_key,
            region_name=s3_region,
            config=Config(signature_version='s3v4')
        )
        
        presigned_url = s3_client.generate_presigned_url(
            'put_object',
            Params={
                'Bucket': s3_bucket,
                'Key': filename,
                'ContentType': content_type
            },
            ExpiresIn=300
        )
        
        file_url = f'{s3_endpoint}/{s3_bucket}/{filename}'
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'uploadUrl': presigned_url,
                'fileUrl': file_url
            }),
            'isBase64Encoded': False
        }
        
    except Exception as e:
        print(f'Error: {e}')
        import traceback
        print(traceback.format_exc())
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)}),
            'isBase64Encoded': False
        }

def handle_upload(event: Dict[str, Any]) -> Dict[str, Any]:
    """Upload file (audio/image) directly through backend to avoid CORS"""
    import base64
    
    try:
        s3_access_key = os.environ.get('TIMEWEB_S3_ACCESS_KEY')
        s3_secret_key = os.environ.get('TIMEWEB_S3_SECRET_KEY')
        s3_bucket = os.environ.get('TIMEWEB_S3_BUCKET_NAME')
        s3_endpoint = os.environ.get('TIMEWEB_S3_ENDPOINT', 'https://s3.twcstorage.ru')
        s3_region = os.environ.get('TIMEWEB_S3_REGION', 'ru-1')
        
        if not all([s3_access_key, s3_secret_key, s3_bucket]):
            return {
                'statusCode': 500,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'S3 credentials not configured'}),
                'isBase64Encoded': False
            }
        
        # Parse JSON body with base64 data
        body_str = event.get('body', '{}')
        body_data = json.loads(body_str)
        file_base64 = body_data.get('audioData', '')
        content_type = body_data.get('contentType', 'audio/webm')
        
        if not file_base64:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'No file data provided'}),
                'isBase64Encoded': False
            }
        
        # Decode base64
        file_data = base64.b64decode(file_base64)
        
        # Generate filename based on content type
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S_%f')
        if content_type.startswith('image/'):
            extension = content_type.split('/')[1]
            filename = f'profile-photos/photo_{timestamp}.{extension}'
        else:
            filename = f'voice-messages/voice_{timestamp}.webm'
        
        # Upload to S3
        s3_client = boto3.client(
            's3',
            endpoint_url=s3_endpoint,
            aws_access_key_id=s3_access_key,
            aws_secret_access_key=s3_secret_key,
            region_name=s3_region,
            config=Config(signature_version='s3v4')
        )
        
        # Настройка CORS для бакета (один раз)
        try:
            s3_client.put_bucket_cors(
                Bucket=s3_bucket,
                CORSConfiguration={
                    'CORSRules': [{
                        'AllowedOrigins': ['*'],
                        'AllowedMethods': ['GET', 'HEAD', 'PUT', 'POST'],
                        'AllowedHeaders': ['*'],
                        'MaxAgeSeconds': 3600
                    }]
                }
            )
        except Exception as cors_error:
            print(f'CORS setup warning: {cors_error}')
        
        s3_client.put_object(
            Bucket=s3_bucket,
            Key=filename,
            Body=file_data,
            ContentType=content_type,
            ACL='public-read',
            CacheControl='public, max-age=31536000'
        )
        
        file_url = f'{s3_endpoint}/{s3_bucket}/{filename}'
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'fileUrl': file_url}),
            'isBase64Encoded': False
        }
        
    except Exception as e:
        print(f'Upload error: {e}')
        import traceback
        print(traceback.format_exc())
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)}),
            'isBase64Encoded': False
        }