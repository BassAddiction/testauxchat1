import os
import re

# Функции которые используют DATABASE_URL
functions_with_db = [
    'get-messages',
    'send-message', 
    'get-user',
    'profile-photos',
    'add-energy',
    'add-reaction',
    'admin-users',
    'blacklist',
    'create-user',
    'get-conversations',
    'login',
    'private-messages',
    'register',
    'reset-password',
    'send-sms',
    'subscribe',
    'update-activity',
    'verify-sms'
]

for func in functions_with_db:
    index_path = f'{func}/index.py'
    if not os.path.exists(index_path):
        continue
    
    with open(index_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Ищем строку: dsn = os.environ.get('DATABASE_URL')
    # Заменяем на: dsn = os.environ.get('DATABASE_URL') + '?sslmode=disable'
    
    if "dsn = os.environ.get('DATABASE_URL')" in content:
        # Убираем старый sslmode если есть
        content = content.replace("+ '?sslmode=require'", "")
        
        # Добавляем новый
        if '?sslmode=disable' not in content:
            content = content.replace(
                "dsn = os.environ.get('DATABASE_URL')",
                "dsn = os.environ.get('DATABASE_URL') + '?sslmode=disable'"
            )
            
            with open(index_path, 'w', encoding='utf-8') as f:
                f.write(content)
            
            print(f'✅ Fixed {func}')
        else:
            print(f'⏭️  Skipped {func} (already fixed)')
    else:
        print(f'⚠️  Skipped {func} (no DATABASE_URL found)')

print('\n✅ All functions fixed!')