import json
import os
import psycopg2
from datetime import datetime
from typing import Dict, Any

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
    for i, col in enumerate(columns):
        values.append(escape_sql_string(row[i]))
    
    cols_str = ', '.join(columns)
    vals_str = ', '.join(values)
    return f"INSERT INTO {table_name} ({cols_str}) VALUES ({vals_str});"

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Export all database data as SQL INSERT statements
    Args: event with httpMethod
          context with request_id
    Returns: HTTP response with SQL export
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    if method != 'GET':
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'})
        }
    
    dsn = os.environ.get('DATABASE_URL')
    conn = psycopg2.connect(dsn)
    cur = conn.cursor()
    
    sql_lines = []
    schema = 't_p53416936_auxchat_energy_messa'
    
    # Export users
    cur.execute(f"SELECT * FROM {schema}.users ORDER BY id")
    columns = [desc[0] for desc in cur.description]
    rows = cur.fetchall()
    sql_lines.append(f"-- Users table ({len(rows)} rows)")
    for row in rows:
        sql_lines.append(generate_insert_statement('users', columns, row))
    
    # Export messages
    cur.execute(f"SELECT * FROM {schema}.messages ORDER BY id")
    columns = [desc[0] for desc in cur.description]
    rows = cur.fetchall()
    sql_lines.append(f"\n-- Messages table ({len(rows)} rows)")
    for row in rows:
        sql_lines.append(generate_insert_statement('messages', columns, row))
    
    # Export private_messages
    cur.execute(f"SELECT * FROM {schema}.private_messages ORDER BY id")
    columns = [desc[0] for desc in cur.description]
    rows = cur.fetchall()
    sql_lines.append(f"\n-- Private messages table ({len(rows)} rows)")
    for row in rows:
        sql_lines.append(generate_insert_statement('private_messages', columns, row))
    
    # Export user_photos
    cur.execute(f"SELECT * FROM {schema}.user_photos ORDER BY id")
    columns = [desc[0] for desc in cur.description]
    rows = cur.fetchall()
    sql_lines.append(f"\n-- User photos table ({len(rows)} rows)")
    for row in rows:
        sql_lines.append(generate_insert_statement('user_photos', columns, row))
    
    # Export subscriptions
    cur.execute(f"SELECT * FROM {schema}.subscriptions ORDER BY id")
    columns = [desc[0] for desc in cur.description]
    rows = cur.fetchall()
    sql_lines.append(f"\n-- Subscriptions table ({len(rows)} rows)")
    for row in rows:
        sql_lines.append(generate_insert_statement('subscriptions', columns, row))
    
    # Export sms_codes
    cur.execute(f"SELECT * FROM {schema}.sms_codes ORDER BY id")
    columns = [desc[0] for desc in cur.description]
    rows = cur.fetchall()
    sql_lines.append(f"\n-- SMS codes table ({len(rows)} rows)")
    for row in rows:
        sql_lines.append(generate_insert_statement('sms_codes', columns, row))
    
    # Export blacklist
    cur.execute(f"SELECT * FROM {schema}.blacklist ORDER BY id")
    columns = [desc[0] for desc in cur.description]
    rows = cur.fetchall()
    sql_lines.append(f"\n-- Blacklist table ({len(rows)} rows)")
    for row in rows:
        sql_lines.append(generate_insert_statement('blacklist', columns, row))
    
    # Export reactions
    cur.execute(f"SELECT * FROM {schema}.reactions ORDER BY id")
    columns = [desc[0] for desc in cur.description]
    rows = cur.fetchall()
    sql_lines.append(f"\n-- Reactions table ({len(rows)} rows)")
    for row in rows:
        sql_lines.append(generate_insert_statement('reactions', columns, row))
    
    # Export message_reactions
    cur.execute(f"SELECT * FROM {schema}.message_reactions ORDER BY id")
    columns = [desc[0] for desc in cur.description]
    rows = cur.fetchall()
    sql_lines.append(f"\n-- Message reactions table ({len(rows)} rows)")
    for row in rows:
        sql_lines.append(generate_insert_statement('message_reactions', columns, row))
    
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'text/plain',
            'Access-Control-Allow-Origin': '*'
        },
        'isBase64Encoded': False,
        'body': '\n'.join(sql_lines)
    }
