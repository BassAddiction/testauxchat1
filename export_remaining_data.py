#!/usr/bin/env python3
"""
Export ONLY the remaining data (messages 59-88, private_messages 39-71)
from poehali.dev database and generate SQL INSERT statements.

This is a focused export for the missing rows.
"""

import sys
try:
    import psycopg2
except ImportError:
    print("Error: psycopg2 not installed. Run: pip install psycopg2-binary")
    sys.exit(1)

from datetime import datetime

# Source database connection (poehali.dev)
SOURCE_DB_CONFIG = {
    'dbname': 't_p53416936_auxchat_energy_messa',
    'user': 'p53416936_auxchat_energy_messa',
    'password': 'gFj!27Np',
    'host': 'poehali.dev',
    'port': 5432
}

def escape_sql_string(value):
    """Escape string values for SQL"""
    if value is None:
        return 'NULL'
    if isinstance(value, bool):
        return 'TRUE' if value else 'FALSE'
    if isinstance(value, (int, float)):
        return str(value)
    if isinstance(value, datetime):
        return f"'{value.isoformat()}'"
    # Escape single quotes by doubling them
    value = str(value).replace("'", "''")
    return f"'{value}'"

def generate_insert_statement(table_name, columns, row):
    """Generate INSERT statement for a row"""
    values = []
    for col in columns:
        values.append(escape_sql_string(row[col]))
    
    cols_str = ', '.join(columns)
    vals_str = ', '.join(values)
    return f"INSERT INTO {table_name} ({cols_str}) VALUES ({vals_str});"

def main():
    print("=" * 60)
    print("EXPORTING REMAINING DATA FROM POEHALI.DEV DATABASE")
    print("=" * 60)
    print()
    
    try:
        print("Connecting to poehali.dev database...")
        conn = psycopg2.connect(**SOURCE_DB_CONFIG)
        cursor = conn.cursor()
        print("✅ Connected successfully!\n")
        
        sql_statements = []
        
        sql_statements.append("-- =====================================================")
        sql_statements.append("-- REMAINING DATA EXPORT")
        sql_statements.append(f"-- Generated: {datetime.now().isoformat()}")
        sql_statements.append("-- =====================================================\n")
        
        # Export messages with id > 58
        print("Querying messages table (id > 58)...")
        cursor.execute("SELECT * FROM messages WHERE id > 58 ORDER BY id")
        rows = cursor.fetchall()
        columns = [desc[0] for desc in cursor.description]
        
        print(f"✅ Found {len(rows)} remaining messages (IDs {rows[0][0] if rows else 'N/A'} - {rows[-1][0] if rows else 'N/A'})")
        
        sql_statements.append("\n-- Remaining Messages (IDs 59-88)")
        for row in rows:
            row_dict = dict(zip(columns, row))
            sql_statements.append(generate_insert_statement('messages', columns, row_dict))
        
        # Export private_messages with id > 38
        print("\nQuerying private_messages table (id > 38)...")
        cursor.execute("SELECT * FROM private_messages WHERE id > 38 ORDER BY id")
        rows = cursor.fetchall()
        columns = [desc[0] for desc in cursor.description]
        
        print(f"✅ Found {len(rows)} remaining private messages (IDs {rows[0][0] if rows else 'N/A'} - {rows[-1][0] if rows else 'N/A'})")
        
        sql_statements.append("\n-- Remaining Private Messages (IDs 39-71)")
        for row in rows:
            row_dict = dict(zip(columns, row))
            sql_statements.append(generate_insert_statement('private_messages', columns, row_dict))
        
        # Get total counts for verification
        print("\n" + "=" * 60)
        print("VERIFICATION - Total Row Counts:")
        print("=" * 60)
        
        cursor.execute("SELECT COUNT(*) FROM users")
        print(f"users: {cursor.fetchone()[0]} rows")
        
        cursor.execute("SELECT COUNT(*) FROM messages")
        print(f"messages: {cursor.fetchone()[0]} rows")
        
        cursor.execute("SELECT COUNT(*) FROM private_messages")
        print(f"private_messages: {cursor.fetchone()[0]} rows")
        
        cursor.execute("SELECT COUNT(*) FROM user_photos")
        print(f"user_photos: {cursor.fetchone()[0]} rows")
        
        cursor.execute("SELECT COUNT(*) FROM subscriptions")
        print(f"subscriptions: {cursor.fetchone()[0]} rows")
        
        cursor.execute("SELECT COUNT(*) FROM sms_codes")
        print(f"sms_codes: {cursor.fetchone()[0]} rows")
        
        cursor.execute("SELECT COUNT(*) FROM blacklist")
        print(f"blacklist: {cursor.fetchone()[0]} rows")
        
        cursor.execute("SELECT COUNT(*) FROM message_reactions")
        print(f"message_reactions: {cursor.fetchone()[0]} rows")
        
        cursor.execute("SELECT COUNT(*) FROM reactions")
        print(f"reactions: {cursor.fetchone()[0]} rows")
        
        # Update sequences
        sql_statements.append("\n-- Update sequences after import")
        sql_statements.append("SELECT setval('messages_id_seq', (SELECT MAX(id) FROM messages) + 1, false);")
        sql_statements.append("SELECT setval('private_messages_id_seq', (SELECT MAX(id) FROM private_messages) + 1, false);")
        
        # Write to file
        output_file = 'remaining_data.sql'
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write('\n'.join(sql_statements))
        
        print("\n" + "=" * 60)
        print("✅ EXPORT COMPLETE!")
        print("=" * 60)
        print(f"\n📄 SQL file saved to: {output_file}")
        print(f"\n🔧 To import into Timeweb database:")
        print(f"   psql -h b4951e9ce41239a524d6f182.twc1.net -p 5432 -U gen_user -d default_db -f {output_file}")
        print(f"\n   Password: =^yZn^;2Nyg2g1")
        
        cursor.close()
        conn.close()
        
    except psycopg2.Error as e:
        print(f"\n❌ Database Error: {e}")
        print(f"\nDetails:")
        print(f"  - Make sure the poehali.dev database is accessible")
        print(f"  - Verify credentials are correct")
        print(f"  - Check if your IP is whitelisted")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()
