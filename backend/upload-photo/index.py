import json
import os
import boto3
import base64
from typing import Dict, Any
from datetime import datetime

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Загружает фотографию пользователя в Timeweb S3 хранилище
    Args: event - dict с httpMethod, body (base64 изображение)
    Returns: HTTP response с публичным URL загруженного файла
    '''
    print('[UPLOAD-PHOTO] Using Timeweb S3 storage')
    method: str = event.get('httpMethod', 'POST')
    
    # Handle CORS OPTIONS
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Content-Type',
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
    body_str = event.get('body') or ''
    is_base64_encoded = event.get('isBase64Encoded', False)
    
    print(f'[UPLOAD] Body length: {len(body_str)}, isBase64: {is_base64_encoded}')
    
    # Get content type from headers
    headers = event.get('headers') or {}
    content_type = headers.get('X-Content-Type') or headers.get('x-content-type') or 'image/jpeg'
    
    # Decode body
    if is_base64_encoded:
        try:
            file_data = base64.b64decode(body_str)
            print(f'[UPLOAD] Decoded binary, size: {len(file_data)} bytes')
        except Exception as e:
            return {
                'statusCode': 400,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': f'Invalid base64: {str(e)}'})
            }
    else:
        try:
            body_data = json.loads(body_str) if body_str else {}
            file_base64 = body_data.get('fileData') or body_data.get('audioData') or body_data.get('file')
            content_type = body_data.get('contentType', content_type)
            
            if not file_base64:
                return {
                    'statusCode': 400,
                    'headers': {'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'No file data provided'})
                }
            
            if ',' in file_base64:
                file_base64 = file_base64.split(',')[1]
            file_data = base64.b64decode(file_base64)
            print(f'[UPLOAD] Decoded from JSON, size: {len(file_data)} bytes')
        except Exception as e:
            return {
                'statusCode': 400,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': f'Invalid request: {str(e)}'})
            }
    
    # Generate unique filename
    timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
    extension = content_type.split('/')[-1]
    filename = f'photos/{timestamp}.{extension}'
    
    # Upload to Timeweb S3
    endpoint = os.environ['TIMEWEB_S3_ENDPOINT']
    access_key = os.environ['TIMEWEB_S3_ACCESS_KEY']
    bucket_name = os.environ['TIMEWEB_S3_BUCKET_NAME']
    
    print(f'[UPLOAD-PHOTO] Endpoint: {endpoint}')
    print(f'[UPLOAD-PHOTO] Access key: {access_key[:8]}...')
    print(f'[UPLOAD-PHOTO] Bucket: {bucket_name}')
    
    from botocore.config import Config
    import io
    
    s3 = boto3.client('s3',
        endpoint_url=endpoint,
        aws_access_key_id=access_key,
        aws_secret_access_key=os.environ['TIMEWEB_S3_SECRET_KEY'],
        region_name=os.environ.get('TIMEWEB_S3_REGION', 'ru-1'),
        config=Config(
            connect_timeout=5,
            read_timeout=20,
            retries={'max_attempts': 2}
        )
    )
    
    try:
        print(f'[UPLOAD-PHOTO] Uploading {len(file_data)} bytes')
        
        # Use BytesIO for efficient streaming
        file_obj = io.BytesIO(file_data)
        
        s3.upload_fileobj(
            file_obj,
            bucket_name,
            filename,
            ExtraArgs={'ContentType': content_type}
        )
        
        print(f'[UPLOAD-PHOTO] Success!')
    except Exception as e:
        print(f'[UPLOAD-PHOTO] Error: {type(e).__name__}: {str(e)}')
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': f'Upload failed: {str(e)}'})
        }
    
    # Generate public URL for Timeweb S3
    # Format: https://{bucket}.s3.timeweb.com/{filename}
    public_url = f"https://{bucket_name}.s3.timeweb.com/{filename}"
    print(f'[UPLOAD-PHOTO] Public URL: {public_url}')
    
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'isBase64Encoded': False,
        'body': json.dumps({'url': public_url, 'fileUrl': public_url})
    }