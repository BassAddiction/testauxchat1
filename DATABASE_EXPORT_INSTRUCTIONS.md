# Database Export Instructions

## Overview
This guide helps you export ALL data from the poehali.dev PostgreSQL database and import it into Timeweb PostgreSQL database.

## Source Database (poehali.dev)
- Host: poehali.dev
- Port: 5432
- Database: t_p53416936_auxchat_energy_messa
- User: p53416936_auxchat_energy_messa
- Password: gFj!27Np

## Target Database (Timeweb)
- Host: b4951e9ce41239a524d6f182.twc1.net
- Port: 5432
- Database: default_db
- User: gen_user
- Password: =^yZn^;2Nyg2g1

## Tables to Export (with row counts)
- users: 2 rows
- messages: 88 rows
- private_messages: 71 rows
- user_photos: 4 rows
- subscriptions: 2 rows
- sms_codes: 4 rows
- blacklist: 0 rows
- reactions: 0 rows
- message_reactions: 0 rows

## Method 1: Using Python Script (Recommended)

### Step 1: Install Dependencies
```bash
pip install psycopg2-binary
```

### Step 2: Run Export Script
```bash
python3 export_database.py
```

This will generate `timeweb_database_import.sql` with:
- All table CREATE statements
- All INSERT statements for data
- All CREATE INDEX statements
- All sequence updates (setval)

### Step 3: Import into Timeweb
```bash
psql -h b4951e9ce41239a524d6f182.twc1.net -p 5432 -U gen_user -d default_db -f timeweb_database_import.sql
```

Enter password when prompted: =^yZn^;2Nyg2g1

## Method 2: Using pg_dump and pg_restore

### Step 1: Export from poehali.dev
```bash
pg_dump -h poehali.dev -p 5432 -U p53416936_auxchat_energy_messa \
  -d t_p53416936_auxchat_energy_messa \
  --no-owner --no-acl --clean --if-exists \
  -f poehali_export.sql
```

### Step 2: Clean up schema prefixes (if needed)
The source database uses schema prefix `t_p53416936_auxchat_energy_messa.`
You may need to remove these prefixes if target database uses default `public` schema.

```bash
sed 's/t_p53416936_auxchat_energy_messa\.//g' poehali_export.sql > timeweb_import.sql
```

### Step 3: Import into Timeweb
```bash
psql -h b4951e9ce41239a524d6f182.twc1.net -p 5432 -U gen_user -d default_db -f timeweb_import.sql
```

## Method 3: Direct Data Copy (Fastest)

If both databases are accessible from the same machine:

```bash
pg_dump -h poehali.dev -p 5432 -U p53416936_auxchat_energy_messa \
  -d t_p53416936_auxchat_energy_messa \
  --data-only --inserts | \
psql -h b4951e9ce41239a524d6f182.twc1.net -p 5432 -U gen_user -d default_db
```

## Verification After Import

Connect to Timeweb database and verify row counts:

```sql
SELECT 'users' as table, COUNT(*) as rows FROM users
UNION ALL
SELECT 'messages', COUNT(*) FROM messages
UNION ALL
SELECT 'private_messages', COUNT(*) FROM private_messages
UNION ALL
SELECT 'user_photos', COUNT(*) FROM user_photos
UNION ALL
SELECT 'subscriptions', COUNT(*) FROM subscriptions
UNION ALL
SELECT 'sms_codes', COUNT(*) FROM sms_codes
UNION ALL
SELECT 'blacklist', COUNT(*) FROM blacklist
UNION ALL
SELECT 'reactions', COUNT(*) FROM reactions
UNION ALL
SELECT 'message_reactions', COUNT(*) FROM message_reactions;
```

Expected results:
- users: 2
- messages: 88
- private_messages: 71
- user_photos: 4
- subscriptions: 2
- sms_codes: 4
- blacklist: 0
- reactions: 0
- message_reactions: 0

## Troubleshooting

### Connection Issues
If you can't connect to poehali.dev:
1. Check if your IP is whitelisted
2. Verify firewall rules
3. Try from a different network

### Import Errors
If you get foreign key constraint errors:
1. Import users table first
2. Then import messages and private_messages
3. Finally import all other tables

### Sequence Issues
If auto-increment IDs are wrong after import, manually set sequences:
```sql
SELECT setval('users_id_seq', (SELECT MAX(id) FROM users) + 1);
SELECT setval('messages_id_seq', (SELECT MAX(id) FROM messages) + 1);
SELECT setval('private_messages_id_seq', (SELECT MAX(id) FROM private_messages) + 1);
-- etc for all tables
```

## Files Generated
- `export_database.py` - Python script to export data
- `timeweb_database_import.sql` - Generated SQL file for import
- `run_export.sh` - Bash script to automate the process

## Security Note
These credentials are included for migration purposes. After migration is complete, consider:
1. Changing database passwords
2. Removing credential files from version control
3. Using environment variables for credentials
