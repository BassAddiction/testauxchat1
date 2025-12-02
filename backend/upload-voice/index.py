'''
Business: Upload voice message to ImgBB and return URL
Args: event with httpMethod, body (base64 encoded audio), headers
Returns: HTTP response with image URL
'''

import json
import os
import base64
import requests
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
        
        print('=== STEP 3: Getting ImgBB API key ===')
        imgbb_api_key = os.environ.get('IMGBB_API_KEY')
        
        if not imgbb_api_key:
            return {
                'statusCode': 500,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'ImgBB API key not configured'}),
                'isBase64Encoded': False
            }
        
        print(f'=== STEP 4: Uploading to ImgBB (size: {len(audio_base64)} chars) ===')
        
        try:
            response = requests.post(
                'https://api.imgbb.com/1/upload',
                data={
                    'key': imgbb_api_key,
                    'image': audio_base64,
                    'name': f'voice_{datetime.now().strftime("%Y%m%d_%H%M%S")}'
                },
                timeout=15
            )
            
            print(f'ImgBB response status: {response.status_code}')
            
            if response.status_code != 200:
                print(f'ImgBB error: {response.text}')
                return {
                    'statusCode': 500,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'ImgBB upload failed'}),
                    'isBase64Encoded': False
                }
            
            result = response.json()
            file_url = result['data']['url']
            print(f'Upload successful! URL: {file_url}')
            
        except Exception as upload_error:
            print(f'=== UPLOAD ERROR: {upload_error} ===')
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