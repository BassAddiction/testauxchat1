import psycopg2
import os

# Подключение к базе
dsn = "postgresql://gen_user:K=w7hxumpubT-F@f54d84cf7c4086988278b301.twc1.net:5432/default_db?sslmode=require"
conn = psycopg2.connect(dsn)
cur = conn.cursor()

# Проверяем схемы
print("=== СХЕМЫ В БАЗЕ ===")
cur.execute("SELECT schema_name FROM information_schema.schemata;")
for row in cur.fetchall():
    print(f"Схема: {row[0]}")

print("\n=== ТАБЛИЦЫ ===")
cur.execute("""
    SELECT table_schema, table_name 
    FROM information_schema.tables 
    WHERE table_type = 'BASE TABLE' AND table_schema NOT IN ('pg_catalog', 'information_schema')
    ORDER BY table_schema, table_name;
""")
for row in cur.fetchall():
    print(f"{row[0]}.{row[1]}")

print("\n=== ТЕСТ ЗАПРОСА К users ===")
# Пробуем разные варианты
try:
    cur.execute("SELECT COUNT(*) FROM users;")
    print(f"✅ users (без схемы): {cur.fetchone()[0]} строк")
except Exception as e:
    print(f"❌ users (без схемы): {e}")

try:
    cur.execute("SELECT COUNT(*) FROM public.users;")
    print(f"✅ public.users: {cur.fetchone()[0]} строк")
except Exception as e:
    print(f"❌ public.users: {e}")

try:
    cur.execute("SELECT COUNT(*) FROM t_p53416936_auxchat_energy_messa.users;")
    print(f"✅ t_p53416936_auxchat_energy_messa.users: {cur.fetchone()[0]} строк")
except Exception as e:
    print(f"❌ t_p53416936_auxchat_energy_messa.users: {e}")

cur.close()
conn.close()
