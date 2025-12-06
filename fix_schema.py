import os
import re

# Список файлов для исправления
files = [
    'backend/get-conversations/index.py',
    'backend/private-messages/index.py',
    'backend/subscribe/index.py',
    'backend/get-subscriptions/index.py',
    'backend/create-user/index.py',
    'backend/reset-password/index.py',
    'backend/update-activity/index.py',
    'backend/profile-photos/index.py',
    'backend/admin-users/index.py',
    'backend/payment-webhook/index.py'
]

# Паттерн для замены
pattern = r't_p53416936_auxchat_energy_messa\.'
replacement = ''

for file_path in files:
    if not os.path.exists(file_path):
        print(f"❌ Файл не найден: {file_path}")
        continue
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = re.sub(pattern, replacement, content)
    
    if content != new_content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        
        count = content.count('t_p53416936_auxchat_energy_messa.')
        print(f"✅ {file_path}: заменено {count} вхождений")
    else:
        print(f"⏭️  {file_path}: уже исправлен")

print("\n🎉 Все файлы обработаны!")
