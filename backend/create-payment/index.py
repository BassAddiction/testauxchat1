'''
Business: Create YooKassa payment for energy purchase with progressive discount
Args: event with httpMethod, body containing user_id, amount (500-10000 RUB), and payment_method (sbp/sberPay/tPay)
Returns: HTTP response with payment confirmation URL and payment_id
Note: 1₽ = 1 energy base, up to +30% bonus at 10000₽
      payment_method is stored in metadata for analytics, YooKassa auto-selects best payment option
'''

import json
import os
import uuid
import base64
import urllib.request
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 204,
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
    
    body_data = json.loads(event.get('body', '{}'))
    user_id = body_data.get('user_id')
    price_rubles = body_data.get('amount', 500)
    payment_method = body_data.get('payment_method', 'sbp')  # sbp, sberPay, tPay
    
    if not user_id:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'user_id required'}),
            'isBase64Encoded': False
        }
    
    # Валидация суммы: от 500₽ до 10000₽
    if not isinstance(price_rubles, (int, float)) or price_rubles < 500 or price_rubles > 10000:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'amount must be between 500 and 10000'}),
            'isBase64Encoded': False
        }
    
    # Расчет энергии с прогрессивной скидкой до 30%
    discount_percent = ((price_rubles - 500) / (10000 - 500)) * 30
    base_energy = price_rubles  # 1₽ = 1 энергия
    bonus = int(base_energy * (discount_percent / 100))
    energy_amount = base_energy + bonus
    
    shop_id = os.environ.get('YOOKASSA_SHOP_ID')
    secret_key = os.environ.get('YOOKASSA_SECRET_KEY')
    
    if not shop_id or not secret_key:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'YooKassa credentials not configured'}),
            'isBase64Encoded': False
        }
    
    price = price_rubles
    
    idempotence_key = str(uuid.uuid4())
    
    payment_data = {
        "amount": {
            "value": f"{float(price):.2f}",
            "currency": "RUB"
        },
        "confirmation": {
            "type": "redirect",
            "return_url": "https://auxchat.ru"
        },
        "capture": True,
        "description": f"Пополнение {int(energy_amount)} энергии",
        "receipt": {
            "customer": {
                "email": "customer@auxchat.ru"
            },
            "items": [
                {
                    "description": f"Пополнение {int(energy_amount)} энергии",
                    "quantity": "1",
                    "amount": {
                        "value": f"{float(price):.2f}",
                        "currency": "RUB"
                    },
                    "vat_code": 1,
                    "payment_mode": "full_payment",
                    "payment_subject": "service"
                }
            ]
        },
        "metadata": {
            "user_id": str(user_id),
            "energy_amount": str(energy_amount),
            "payment_method": payment_method
        }
    }
    
    # Логируем данные запроса для отладки
    print(f"[DEBUG] Creating payment:")
    print(f"  user_id: {user_id}")
    print(f"  amount: {price}")
    print(f"  energy: {energy_amount}")
    print(f"  method: {payment_method}")
    print(f"  idempotence_key: {idempotence_key}")
    print(f"  payment_data: {json.dumps(payment_data, ensure_ascii=False)}")
    
    auth_string = f"{shop_id}:{secret_key}"
    auth_bytes = auth_string.encode('utf-8')
    auth_b64 = base64.b64encode(auth_bytes).decode('utf-8')
    
    req = urllib.request.Request(
        'https://api.yookassa.ru/v3/payments',
        data=json.dumps(payment_data).encode('utf-8'),
        headers={
            'Authorization': f'Basic {auth_b64}',
            'Idempotence-Key': idempotence_key,
            'Content-Type': 'application/json'
        },
        method='POST'
    )
    
    try:
        print("[DEBUG] Sending request to YooKassa...")
        response = urllib.request.urlopen(req)
        result = json.loads(response.read().decode('utf-8'))
        print(f"[DEBUG] Success! Payment ID: {result.get('id')}")
    except urllib.error.HTTPError as e:
        print(f"[ERROR] YooKassa returned {e.code}")
        try:
            error_body = e.read().decode('utf-8')
            print(f"[ERROR] Response body: {error_body}")
            error_json = json.loads(error_body)
        except:
            error_body = str(e)
            error_json = {'raw_error': error_body}
        
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'isBase64Encoded': False,
            'body': json.dumps({
                'error': f'YooKassa HTTP {e.code}',
                'details': error_json,
                'raw_response': error_body
            }, ensure_ascii=False)
        }
    except Exception as e:
        print(f"[ERROR] Unexpected error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'isBase64Encoded': False,
            'body': json.dumps({
                'error': 'Unexpected error',
                'details': str(e)
            })
        }
    
    confirmation_url = result.get('confirmation', {}).get('confirmation_url', '')
    payment_id = result.get('id', '')
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'isBase64Encoded': False,
        'body': json.dumps({
            'payment_url': confirmation_url,
            'payment_id': payment_id
        })
    }