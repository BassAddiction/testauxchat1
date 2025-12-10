#!/usr/bin/env python3
"""
Скрипт для создания тестовых пользователей с геолокацией в разных городах
"""
import requests
import time

# URL функции регистрации
REGISTER_URL = "https://functions.poehali.dev/1d4d268e-0d0a-454a-a1cc-ecd19c83471a"
SEND_MESSAGE_URL = "https://functions.poehali.dev/8d34c54f-b2de-42c1-ac0c-9f6ecf5e16f6"

# Тестовые пользователи с координатами разных городов
test_users = [
    {
        "phone": "+79001111111",
        "username": "Иван из Лянтора",
        "password": "test123",
        "latitude": 61.6167,
        "longitude": 72.1667,
        "city": "Лянтор",
        "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=ivan",
        "distance": "0 км (это я!)"
    },
    {
        "phone": "+79002222222",
        "username": "Мария из Сургута",
        "password": "test123",
        "latitude": 61.25,
        "longitude": 73.4167,
        "city": "Сургут",
        "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=maria",
        "distance": "~60 км"
    },
    {
        "phone": "+79003333333",
        "username": "Петр из Нижневартовска",
        "password": "test123",
        "latitude": 60.9344,
        "longitude": 76.5531,
        "city": "Нижневартовск",
        "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=petr",
        "distance": "~200 км"
    },
    {
        "phone": "+79004444444",
        "username": "Анна из Тюмени",
        "password": "test123",
        "latitude": 57.1522,
        "longitude": 65.5272,
        "city": "Тюмень",
        "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=anna",
        "distance": "~800 км"
    },
    {
        "phone": "+79005555555",
        "username": "Дмитрий из Москвы",
        "password": "test123",
        "latitude": 55.7558,
        "longitude": 37.6173,
        "city": "Москва",
        "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=dmitry",
        "distance": "~2500 км"
    },
    {
        "phone": "+79006666666",
        "username": "Елена из СПБ",
        "password": "test123",
        "latitude": 59.9343,
        "longitude": 30.3351,
        "city": "Санкт-Петербург",
        "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=elena",
        "distance": "~3000 км"
    }
]

def create_user(user_data):
    """Создать пользователя через API регистрации"""
    print(f"Создаю пользователя: {user_data['username']} ({user_data['city']})")
    
    payload = {
        "phone": user_data["phone"],
        "username": user_data["username"],
        "password": user_data["password"],
        "latitude": user_data["latitude"],
        "longitude": user_data["longitude"],
        "city": user_data["city"],
        "avatar": user_data["avatar"]
    }
    
    try:
        response = requests.post(REGISTER_URL, json=payload, timeout=10)
        print(f"  Статус: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            user_id = data.get('id')
            print(f"  ✅ Создан! ID: {user_id}")
            return user_id
        else:
            print(f"  ⚠️ Ответ: {response.text}")
            # Возможно пользователь уже существует, это OK
            return None
    except Exception as e:
        print(f"  ❌ Ошибка: {e}")
        return None

def send_message(user_id, text):
    """Отправить сообщение от пользователя"""
    if not user_id:
        return
    
    print(f"  Отправляю сообщение от ID {user_id}")
    
    payload = {
        "userId": user_id,
        "receiverId": 0,  # 0 = общий чат
        "messageText": text
    }
    
    try:
        response = requests.post(SEND_MESSAGE_URL, json=payload, timeout=10)
        if response.status_code == 200:
            print(f"    ✅ Сообщение отправлено")
        else:
            print(f"    ⚠️ Статус: {response.status_code}")
    except Exception as e:
        print(f"    ❌ Ошибка: {e}")

def main():
    print("=" * 60)
    print("Создание тестовых пользователей для проверки геолокации")
    print("=" * 60)
    print()
    
    created_users = []
    
    # Создаём пользователей
    for user_data in test_users:
        user_id = create_user(user_data)
        if user_id:
            created_users.append({
                "id": user_id,
                "username": user_data["username"],
                "city": user_data["city"],
                "distance": user_data["distance"]
            })
        time.sleep(1)  # Небольшая задержка между запросами
        print()
    
    print("=" * 60)
    print(f"Создано пользователей: {len(created_users)}")
    print("=" * 60)
    print()
    
    # Отправляем сообщения от каждого пользователя
    if created_users:
        print("Отправка тестовых сообщений...")
        print()
        
        for user in created_users:
            messages = [
                f"Привет! Я из города {user['city']} 👋",
                "Тестирую радиус геолокации 📍",
                f"Моё расстояние до Лянтора: {user['distance']}"
            ]
            
            for msg in messages:
                send_message(user["id"], msg)
                time.sleep(0.5)
            
            print()
    
    print("=" * 60)
    print("✅ Готово!")
    print("=" * 60)
    print()
    print("Теперь можно:")
    print("1. Войти как пользователь 7 (AuxChat)")
    print("2. Установить свою геолокацию в Лянторе")
    print("3. Менять радиус (5км, 10км, 25км, 50км, 100км, 500км, 1000км)")
    print("4. Наблюдать как фильтруются сообщения:")
    print("   - 5-25км: только Иван и Мария")
    print("   - 50-100км: + Петр")
    print("   - 500-1000км: + Анна")
    print("   - Все: + Дмитрий и Елена")

if __name__ == "__main__":
    main()
