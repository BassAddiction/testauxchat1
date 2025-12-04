#!/usr/bin/env python3
"""
Export all data from poehali.dev database and generate SQL import script for Timeweb PostgreSQL
"""

import psycopg2
import json
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

def export_table(cursor, table_name, limit=None, offset=0, id_filter=None):
    """Export table data"""
    query = f"SELECT * FROM {table_name}"
    
    if id_filter:
        query += f" WHERE id > {id_filter}"
    
    query += " ORDER BY id"
    
    if limit:
        query += f" LIMIT {limit}"
    if offset:
        query += f" OFFSET {offset}"
    
    cursor.execute(query)
    rows = cursor.fetchall()
    columns = [desc[0] for desc in cursor.description]
    
    return rows, columns

def main():
    print("Connecting to poehali.dev database...")
    
    try:
        conn = psycopg2.connect(**SOURCE_DB_CONFIG)
        cursor = conn.cursor()
        
        print("Connected successfully!\n")
        
        # Start building SQL export
        sql_export = []
        
        sql_export.append("-- =====================================================")
        sql_export.append("-- COMPLETE DATABASE EXPORT FROM poehali.dev")
        sql_export.append(f"-- Generated: {datetime.now().isoformat()}")
        sql_export.append("-- Target: Timeweb PostgreSQL Database")
        sql_export.append("-- =====================================================\n")
        
        sql_export.append("-- Set client encoding")
        sql_export.append("SET client_encoding = 'UTF8';\n")
        
        # Create schema (tables)
        sql_export.append("-- =====================================================")
        sql_export.append("-- CREATE TABLES")
        sql_export.append("-- =====================================================\n")
        
        # Users table
        sql_export.append("""CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(20) UNIQUE NOT NULL,
    username VARCHAR(100) NOT NULL,
    avatar TEXT,
    energy INTEGER DEFAULT 100,
    is_admin BOOLEAN DEFAULT FALSE,
    is_banned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    password VARCHAR(255),
    bio TEXT,
    status VARCHAR(50) DEFAULT 'online',
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
""")
        
        # Messages table
        sql_export.append("""CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    voice_url TEXT,
    voice_duration INTEGER
);
""")
        
        # Message reactions table
        sql_export.append("""CREATE TABLE IF NOT EXISTS message_reactions (
    id SERIAL PRIMARY KEY,
    message_id INTEGER REFERENCES messages(id),
    user_id INTEGER REFERENCES users(id),
    emoji VARCHAR(10) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
""")
        
        # Private messages table
        sql_export.append("""CREATE TABLE IF NOT EXISTS private_messages (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER NOT NULL REFERENCES users(id),
    receiver_id INTEGER NOT NULL REFERENCES users(id),
    text TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    voice_url TEXT,
    voice_duration INTEGER
);
""")
        
        # User photos table
        sql_export.append("""CREATE TABLE IF NOT EXISTS user_photos (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    photo_url TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    display_order INTEGER DEFAULT 0
);
""")
        
        # Subscriptions table
        sql_export.append("""CREATE TABLE IF NOT EXISTS subscriptions (
    id SERIAL PRIMARY KEY,
    subscriber_id INTEGER NOT NULL,
    subscribed_to_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(subscriber_id, subscribed_to_id),
    CHECK (subscriber_id != subscribed_to_id)
);
""")
        
        # SMS codes table
        sql_export.append("""CREATE TABLE IF NOT EXISTS sms_codes (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(20) NOT NULL,
    code VARCHAR(4) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    verified BOOLEAN DEFAULT FALSE
);
""")
        
        # Blacklist table
        sql_export.append("""CREATE TABLE IF NOT EXISTS blacklist (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    blocked_user_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, blocked_user_id)
);
""")
        
        # Reactions table (empty but needed)
        sql_export.append("""CREATE TABLE IF NOT EXISTS reactions (
    id SERIAL PRIMARY KEY,
    message_id INTEGER REFERENCES messages(id),
    user_id INTEGER REFERENCES users(id),
    emoji VARCHAR(10) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(message_id, user_id, emoji)
);
""")
        
        # Create indexes
        sql_export.append("\n-- =====================================================")
        sql_export.append("-- CREATE INDEXES")
        sql_export.append("-- =====================================================\n")
        
        sql_export.append("CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);")
        sql_export.append("CREATE INDEX IF NOT EXISTS idx_private_messages_sender ON private_messages(sender_id);")
        sql_export.append("CREATE INDEX IF NOT EXISTS idx_private_messages_receiver ON private_messages(receiver_id);")
        sql_export.append("CREATE INDEX IF NOT EXISTS idx_private_messages_conversation ON private_messages(sender_id, receiver_id);")
        sql_export.append("CREATE INDEX IF NOT EXISTS idx_user_photos_user_id ON user_photos(user_id);")
        sql_export.append("CREATE INDEX IF NOT EXISTS idx_subscriptions_subscriber ON subscriptions(subscriber_id);")
        sql_export.append("CREATE INDEX IF NOT EXISTS idx_subscriptions_subscribed_to ON subscriptions(subscribed_to_id);")
        sql_export.append("CREATE INDEX IF NOT EXISTS idx_sms_codes_phone ON sms_codes(phone);")
        sql_export.append("CREATE INDEX IF NOT EXISTS idx_sms_codes_expires_at ON sms_codes(expires_at);")
        sql_export.append("CREATE INDEX IF NOT EXISTS idx_blacklist_user_id ON blacklist(user_id);")
        sql_export.append("CREATE INDEX IF NOT EXISTS idx_blacklist_blocked_user_id ON blacklist(blocked_user_id);")
        sql_export.append("CREATE INDEX IF NOT EXISTS idx_reactions_message_id ON reactions(message_id);\n")
        
        # Export data
        sql_export.append("\n-- =====================================================")
        sql_export.append("-- INSERT DATA")
        sql_export.append("-- =====================================================\n")
        
        # Export users
        print("Exporting users table...")
        sql_export.append("\n-- Users table")
        rows, columns = export_table(cursor, 'users')
        print(f"Found {len(rows)} users")
        for row in rows:
            row_dict = dict(zip(columns, row))
            sql_export.append(generate_insert_statement('users', columns, row_dict))
        
        # Export ALL messages (88 total)
        print("\nExporting messages table (ALL 88 rows)...")
        sql_export.append("\n-- Messages table (ALL)")
        rows, columns = export_table(cursor, 'messages')
        print(f"Found {len(rows)} messages")
        for row in rows:
            row_dict = dict(zip(columns, row))
            sql_export.append(generate_insert_statement('messages', columns, row_dict))
        
        # Export ALL private_messages (71 total)
        print("\nExporting private_messages table (ALL 71 rows)...")
        sql_export.append("\n-- Private messages table (ALL)")
        rows, columns = export_table(cursor, 'private_messages')
        print(f"Found {len(rows)} private messages")
        for row in rows:
            row_dict = dict(zip(columns, row))
            sql_export.append(generate_insert_statement('private_messages', columns, row_dict))
        
        # Export user_photos
        print("\nExporting user_photos table...")
        sql_export.append("\n-- User photos table")
        rows, columns = export_table(cursor, 'user_photos')
        print(f"Found {len(rows)} user photos")
        for row in rows:
            row_dict = dict(zip(columns, row))
            sql_export.append(generate_insert_statement('user_photos', columns, row_dict))
        
        # Export subscriptions
        print("\nExporting subscriptions table...")
        sql_export.append("\n-- Subscriptions table")
        rows, columns = export_table(cursor, 'subscriptions')
        print(f"Found {len(rows)} subscriptions")
        for row in rows:
            row_dict = dict(zip(columns, row))
            sql_export.append(generate_insert_statement('subscriptions', columns, row_dict))
        
        # Export sms_codes
        print("\nExporting sms_codes table...")
        sql_export.append("\n-- SMS codes table")
        rows, columns = export_table(cursor, 'sms_codes')
        print(f"Found {len(rows)} sms codes")
        for row in rows:
            row_dict = dict(zip(columns, row))
            sql_export.append(generate_insert_statement('sms_codes', columns, row_dict))
        
        # Export blacklist
        print("\nExporting blacklist table...")
        sql_export.append("\n-- Blacklist table")
        rows, columns = export_table(cursor, 'blacklist')
        print(f"Found {len(rows)} blacklist entries")
        for row in rows:
            row_dict = dict(zip(columns, row))
            sql_export.append(generate_insert_statement('blacklist', columns, row_dict))
        
        # Export message_reactions
        print("\nExporting message_reactions table...")
        sql_export.append("\n-- Message reactions table")
        rows, columns = export_table(cursor, 'message_reactions')
        print(f"Found {len(rows)} message reactions")
        for row in rows:
            row_dict = dict(zip(columns, row))
            sql_export.append(generate_insert_statement('message_reactions', columns, row_dict))
        
        # Export reactions (likely empty)
        print("\nExporting reactions table...")
        sql_export.append("\n-- Reactions table")
        rows, columns = export_table(cursor, 'reactions')
        print(f"Found {len(rows)} reactions")
        for row in rows:
            row_dict = dict(zip(columns, row))
            sql_export.append(generate_insert_statement('reactions', columns, row_dict))
        
        # Update sequences
        sql_export.append("\n-- =====================================================")
        sql_export.append("-- UPDATE SEQUENCES")
        sql_export.append("-- =====================================================\n")
        
        # Get max IDs
        cursor.execute("SELECT MAX(id) FROM users")
        max_user_id = cursor.fetchone()[0] or 0
        
        cursor.execute("SELECT MAX(id) FROM messages")
        max_message_id = cursor.fetchone()[0] or 0
        
        cursor.execute("SELECT MAX(id) FROM private_messages")
        max_pm_id = cursor.fetchone()[0] or 0
        
        cursor.execute("SELECT MAX(id) FROM user_photos")
        max_photo_id = cursor.fetchone()[0] or 0
        
        cursor.execute("SELECT MAX(id) FROM subscriptions")
        max_sub_id = cursor.fetchone()[0] or 0
        
        cursor.execute("SELECT MAX(id) FROM sms_codes")
        max_sms_id = cursor.fetchone()[0] or 0
        
        cursor.execute("SELECT MAX(id) FROM blacklist")
        max_blacklist_id = cursor.fetchone()[0] or 0
        
        cursor.execute("SELECT MAX(id) FROM message_reactions")
        max_mr_id = cursor.fetchone()[0] or 0
        
        cursor.execute("SELECT MAX(id) FROM reactions")
        max_reaction_id = cursor.fetchone()[0] or 0
        
        sql_export.append(f"SELECT setval('users_id_seq', {max_user_id + 1}, false);")
        sql_export.append(f"SELECT setval('messages_id_seq', {max_message_id + 1}, false);")
        sql_export.append(f"SELECT setval('private_messages_id_seq', {max_pm_id + 1}, false);")
        sql_export.append(f"SELECT setval('user_photos_id_seq', {max_photo_id + 1}, false);")
        sql_export.append(f"SELECT setval('subscriptions_id_seq', {max_sub_id + 1}, false);")
        sql_export.append(f"SELECT setval('sms_codes_id_seq', {max_sms_id + 1}, false);")
        sql_export.append(f"SELECT setval('blacklist_id_seq', {max_blacklist_id + 1}, false);")
        sql_export.append(f"SELECT setval('message_reactions_id_seq', {max_mr_id + 1}, false);")
        sql_export.append(f"SELECT setval('reactions_id_seq', {max_reaction_id + 1}, false);")
        
        sql_export.append("\n-- =====================================================")
        sql_export.append("-- EXPORT COMPLETE")
        sql_export.append("-- =====================================================")
        
        # Write to file
        output_file = 'timeweb_database_import.sql'
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write('\n'.join(sql_export))
        
        print(f"\n\n✅ Export completed successfully!")
        print(f"📄 SQL file saved to: {output_file}")
        print(f"\n📊 Export summary:")
        print(f"   - Users: {max_user_id} rows")
        print(f"   - Messages: {max_message_id} rows")
        print(f"   - Private Messages: {max_pm_id} rows")
        print(f"   - User Photos: {max_photo_id} rows")
        print(f"   - Subscriptions: {max_sub_id} rows")
        print(f"   - SMS Codes: {max_sms_id} rows")
        print(f"   - Blacklist: {max_blacklist_id} rows")
        print(f"   - Message Reactions: {max_mr_id} rows")
        print(f"   - Reactions: {max_reaction_id} rows")
        
        print(f"\n🔧 To import into Timeweb database, run:")
        print(f"   psql -h b4951e9ce41239a524d6f182.twc1.net -p 5432 -U gen_user -d default_db -f {output_file}")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    main()
