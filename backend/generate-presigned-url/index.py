import json
import os
import boto3
from typing import Dict, Any
from datetime import datetime
from botocore.config import Config

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Генерирует presigned URL для прямой загрузки фото в Timeweb S3
    Args: event - dict с httpMethod, queryStringParameters (fileName, contentType)
    Returns: HTTP response с presigned URL и публичным URL
    '''
    method: str = event.get('httpMethod', 'GET')
    
    # Handle CORS OPTIONS
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    if method != 'GET':
        return {
            'statusCode': 405,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'})
        }
    
    # Get parameters
    params = event.get('queryStringParameters') or {}
    content_type = params.get('contentType', 'image/jpeg')
    
    # Generate unique filename
    timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S_%f')
    extension = content_type.split('/')[-1]
    filename = f'photos/{timestamp}.{extension}'
    
    # Setup Timeweb S3 client
    endpoint = os.environ['TIMEWEB_S3_ENDPOINT']
    access_key = os.environ['TIMEWEB_S3_ACCESS_KEY']
    bucket_name = os.environ['TIMEWEB_S3_BUCKET_NAME']
    
    s3 = boto3.client('s3',
        endpoint_url=endpoint,
        aws_access_key_id=access_key,
        aws_secret_access_key=os.environ['TIMEWEB_S3_SECRET_KEY'],
        region_name=os.environ.get('TIMEWEB_S3_REGION', 'ru-1'),
        config=Config(signature_version='s3v4')
    )
    
    try:
        # Generate presigned URL (valid for 10 minutes)
        presigned_url = s3.generate_presigned_url(
            'put_object',
            Params={
                'Bucket': bucket_name,
                'Key': filename,
                'ContentType': content_type
            },
            ExpiresIn=600
        )
        
        # Generate public URL
        public_url = f"https://s3.twcstorage.ru/{access_key}/{bucket_name}/{filename}"
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'isBase64Encoded': False,
            'body': json.dumps({
                'uploadUrl': presigned_url,
                'publicUrl': public_url,
                'fileUrl': public_url
            })
        }
    except Exception as e:
        print(f'[PRESIGNED-URL] Error: {type(e).__name__}: {str(e)}')
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': f'Failed to generate URL: {str(e)}'})
        }
