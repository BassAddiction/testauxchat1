import json
import os
import base64
import requests
import hashlib
import hmac
from typing import Dict, Any
from datetime import datetime

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Загружает фотографию в Timeweb S3 через HTTP API
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
    
    # Timeweb S3 HTTP upload with AWS Signature v4
    bucket_name = os.environ['TIMEWEB_S3_BUCKET_NAME']
    access_key = os.environ['TIMEWEB_S3_ACCESS_KEY']
    secret_key = os.environ['TIMEWEB_S3_SECRET_KEY']
    region = os.environ.get('TIMEWEB_S3_REGION', 'ru-1')
    
    # AWS Signature v4
    now = datetime.utcnow()
    amz_date = now.strftime('%Y%m%dT%H%M%SZ')
    date_stamp = now.strftime('%Y%m%d')
    
    # Create canonical request
    method = 'PUT'
    canonical_uri = f'/{filename}'
    canonical_querystring = ''
    
    payload_hash = hashlib.sha256(file_data).hexdigest()
    
    canonical_headers = (
        f'content-type:{content_type}\n'
        f'host:{bucket_name}.s3.timeweb.com\n'
        f'x-amz-content-sha256:{payload_hash}\n'
        f'x-amz-date:{amz_date}\n'
    )
    signed_headers = 'content-type;host;x-amz-content-sha256;x-amz-date'
    
    canonical_request = (
        f'{method}\n{canonical_uri}\n{canonical_querystring}\n'
        f'{canonical_headers}\n{signed_headers}\n{payload_hash}'
    )
    
    # Create string to sign
    algorithm = 'AWS4-HMAC-SHA256'
    credential_scope = f'{date_stamp}/{region}/s3/aws4_request'
    string_to_sign = (
        f'{algorithm}\n{amz_date}\n{credential_scope}\n'
        f'{hashlib.sha256(canonical_request.encode()).hexdigest()}'
    )
    
    # Calculate signature
    def sign(key, msg):
        return hmac.new(key, msg.encode(), hashlib.sha256).digest()
    
    k_date = sign(('AWS4' + secret_key).encode(), date_stamp)
    k_region = sign(k_date, region)
    k_service = sign(k_region, 's3')
    k_signing = sign(k_service, 'aws4_request')
    signature = hmac.new(k_signing, string_to_sign.encode(), hashlib.sha256).hexdigest()
    
    # Create authorization header
    authorization = (
        f'{algorithm} Credential={access_key}/{credential_scope}, '
        f'SignedHeaders={signed_headers}, Signature={signature}'
    )
    
    upload_url = f"https://{bucket_name}.s3.timeweb.com/{filename}"
    
    try:
        print(f'[HTTP-UPLOAD] Uploading {len(file_data)} bytes with signature')
        
        response = requests.put(
            upload_url,
            data=file_data,
            headers={
                'Content-Type': content_type,
                'x-amz-date': amz_date,
                'x-amz-content-sha256': payload_hash,
                'Authorization': authorization
            },
            timeout=15
        )
        
        print(f'[HTTP-UPLOAD] Response: {response.status_code}')
        
        if response.status_code not in (200, 201, 204):
            print(f'[HTTP-UPLOAD] Error: {response.text}')
            raise Exception(f'Upload failed: {response.status_code}')
        
        print('[HTTP-UPLOAD] Success!')
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'isBase64Encoded': False,
            'body': json.dumps({'url': upload_url, 'fileUrl': upload_url})
        }
        
    except Exception as e:
        print(f'[HTTP-UPLOAD] Error: {type(e).__name__}: {str(e)}')
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': f'Upload failed: {str(e)}'})
        }