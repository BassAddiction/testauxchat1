# Database Migration: poehali.dev → Timeweb PostgreSQL

## Overview

Complete migration toolkit for exporting all data from the poehali.dev PostgreSQL database and importing it into Timeweb PostgreSQL database.

## Source & Target Databases

### Source (poehali.dev)
- **Host:** poehali.dev
- **Port:** 5432
- **Database:** t_p53416936_auxchat_energy_messa
- **User:** p53416936_auxchat_energy_messa
- **Password:** gFj!27Np

### Target (Timeweb)
- **Host:** b4951e9ce41239a524d6f182.twc1.net
- **Port:** 5432
- **Database:** default_db
- **User:** gen_user
- **Password:** =^yZn^;2Nyg2g1

## Data to Migrate

| Table | Rows | Status |
|-------|------|--------|
| users | 2 | Required |
| messages | 88 | Required - 30 rows missing (IDs 59-88) |
| private_messages | 71 | Required - 33 rows missing (IDs 39-71) |
| user_photos | 4 | All exported |
| subscriptions | 2 | All exported |
| sms_codes | 4 | All exported |
| blacklist | 0 | Empty |
| reactions | 0 | Empty |
| message_reactions | 0 | Empty |

**Total: 171 rows across 9 tables**

## Quick Start (3 Steps)

### Step 1: Install Dependencies
```bash
pip install psycopg2-binary
```

### Step 2: Run Export Script
```bash
python3 export_database.py
```

Output: `timeweb_database_import.sql`

### Step 3: Import to Timeweb
```bash
PGPASSWORD='=^yZn^;2Nyg2g1' psql \
  -h b4951e9ce41239a524d6f182.twc1.net \
  -p 5432 \
  -U gen_user \
  -d default_db \
  -f timeweb_database_import.sql
```

Done! ✅

## Available Tools

### 1. Complete Export (Recommended)
**File:** `export_database.py`

Exports ALL tables and ALL data in a single SQL file.

```bash
python3 export_database.py
```

**Output:** `timeweb_database_import.sql`

**Contents:**
- CREATE TABLE statements
- CREATE INDEX statements
- INSERT statements for all 171 rows
- Sequence updates (setval)

### 2. Remaining Data Only
**File:** `export_remaining_data.py`

Exports only the missing rows:
- messages with ID > 58
- private_messages with ID > 38

```bash
python3 export_remaining_data.py
```

**Output:** `remaining_data.sql`

Use this if you already have partial data exported.

### 3. Manual SQL Queries
**File:** `manual_export_queries.sql`

Contains SQL queries you can run directly in psql to:
- Export data to CSV files
- Generate INSERT statements
- Verify row counts

### 4. Import Template
**File:** `timeweb_complete_import_template.sql`

Complete SQL template with:
- Full schema (CREATE TABLE statements)
- Placeholder comments for data
- Verification queries

Use this to manually build your import file.

### 5. Bash Automation
**File:** `run_export.sh`

Automated script that:
1. Installs dependencies
2. Runs export
3. Shows success message

```bash
chmod +x run_export.sh
./run_export.sh
```

## Methods Comparison

| Method | Speed | Difficulty | Completeness |
|--------|-------|------------|--------------|
| Python Script (export_database.py) | ⚡⚡⚡ Fast | ✅ Easy | 100% |
| pg_dump/pg_restore | ⚡⚡⚡⚡ Fastest | ⚠️ Medium | 100% |
| Manual Queries | ⚡ Slow | ❌ Hard | Manual |
| CSV Export/Import | ⚡⚡ Medium | ⚠️ Medium | 100% |

## Step-by-Step Guide

### Method 1: Python Script (RECOMMENDED)

#### Prerequisites
- Python 3.6+
- Network access to both databases
- psycopg2-binary package

#### Steps
1. **Install psycopg2:**
   ```bash
   pip install psycopg2-binary
   ```

2. **Run export script:**
   ```bash
   python3 export_database.py
   ```

3. **Review output:**
   - Check console for row counts
   - Verify `timeweb_database_import.sql` was created
   - Check file size (should be several KB)

4. **Import to Timeweb:**
   ```bash
   PGPASSWORD='=^yZn^;2Nyg2g1' psql \
     -h b4951e9ce41239a524d6f182.twc1.net \
     -p 5432 \
     -U gen_user \
     -d default_db \
     -f timeweb_database_import.sql
   ```

5. **Verify:**
   ```bash
   PGPASSWORD='=^yZn^;2Nyg2g1' psql \
     -h b4951e9ce41239a524d6f182.twc1.net \
     -p 5432 \
     -U gen_user \
     -d default_db \
     -c "SELECT COUNT(*) FROM users; SELECT COUNT(*) FROM messages; SELECT COUNT(*) FROM private_messages;"
   ```

### Method 2: pg_dump (ALTERNATIVE)

#### Export from Source
```bash
PGPASSWORD='gFj!27Np' pg_dump \
  -h poehali.dev \
  -p 5432 \
  -U p53416936_auxchat_energy_messa \
  -d t_p53416936_auxchat_energy_messa \
  --clean --if-exists --no-owner --no-acl \
  -f complete_export.sql
```

#### Clean Schema Prefix (if needed)
```bash
sed 's/t_p53416936_auxchat_energy_messa\.//g' complete_export.sql > import_ready.sql
```

#### Import to Target
```bash
PGPASSWORD='=^yZn^;2Nyg2g1' psql \
  -h b4951e9ce41239a524d6f182.twc1.net \
  -p 5432 \
  -U gen_user \
  -d default_db \
  -f import_ready.sql
```

### Method 3: CSV Export/Import

#### Export to CSV
```bash
PGPASSWORD='gFj!27Np' psql \
  -h poehali.dev \
  -p 5432 \
  -U p53416936_auxchat_energy_messa \
  -d t_p53416936_auxchat_energy_messa \
  -c "\copy users TO 'users.csv' WITH CSV HEADER"

# Repeat for all tables
```

#### Import from CSV
```bash
PGPASSWORD='=^yZn^;2Nyg2g1' psql \
  -h b4951e9ce41239a524d6f182.twc1.net \
  -p 5432 \
  -U gen_user \
  -d default_db \
  -c "\copy users FROM 'users.csv' WITH CSV HEADER"

# Repeat for all tables
```

## Verification After Import

### Check Row Counts
```sql
SELECT 
    'users' as table_name, COUNT(*) as rows FROM users
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

**Expected Results:**
```
table_name         | rows
-------------------+------
users              |    2
messages           |   88
private_messages   |   71
user_photos        |    4
subscriptions      |    2
sms_codes          |    4
blacklist          |    0
reactions          |    0
message_reactions  |    0
```

### Check Data Integrity
```sql
-- Verify all messages have valid user_id
SELECT COUNT(*) FROM messages WHERE user_id NOT IN (SELECT id FROM users);
-- Expected: 0

-- Verify all private messages have valid sender/receiver
SELECT COUNT(*) FROM private_messages 
WHERE sender_id NOT IN (SELECT id FROM users) 
   OR receiver_id NOT IN (SELECT id FROM users);
-- Expected: 0

-- Verify sequence values
SELECT 
    'users_id_seq' as sequence, last_value FROM users_id_seq
UNION ALL
    SELECT 'messages_id_seq', last_value FROM messages_id_seq
UNION ALL
    SELECT 'private_messages_id_seq', last_value FROM private_messages_id_seq;
```

### Sample Data Check
```sql
-- Check first and last message
SELECT id, user_id, LEFT(text, 50) as text_preview, created_at 
FROM messages 
WHERE id IN (1, 88);

-- Check first and last private message
SELECT id, sender_id, receiver_id, LEFT(text, 50) as text_preview, created_at 
FROM private_messages 
WHERE id IN (1, 71);
```

## Troubleshooting

### Issue: Cannot connect to poehali.dev

**Symptoms:**
```
psql: error: connection to server at "poehali.dev" failed
```

**Solutions:**
1. Check if database is accessible from your network
2. Verify firewall rules allow PostgreSQL (port 5432)
3. Try from different network/VPN
4. Ping the host: `ping poehali.dev`
5. Test port: `telnet poehali.dev 5432`

### Issue: Import fails with foreign key constraint errors

**Symptoms:**
```
ERROR: insert or update on table violates foreign key constraint
```

**Solutions:**
1. Import tables in correct order:
   - First: users
   - Then: messages, private_messages
   - Finally: all other tables

2. Or temporarily disable constraints:
   ```sql
   ALTER TABLE messages DISABLE TRIGGER ALL;
   ALTER TABLE private_messages DISABLE TRIGGER ALL;
   -- Import data
   ALTER TABLE messages ENABLE TRIGGER ALL;
   ALTER TABLE private_messages ENABLE TRIGGER ALL;
   ```

### Issue: Sequences not updated correctly

**Symptoms:**
- Next INSERT gets "duplicate key value" error
- New IDs start from 1 instead of max+1

**Solution:**
```sql
SELECT setval('users_id_seq', (SELECT MAX(id) FROM users) + 1);
SELECT setval('messages_id_seq', (SELECT MAX(id) FROM messages) + 1);
SELECT setval('private_messages_id_seq', (SELECT MAX(id) FROM private_messages) + 1);
SELECT setval('user_photos_id_seq', (SELECT MAX(id) FROM user_photos) + 1);
SELECT setval('subscriptions_id_seq', (SELECT MAX(id) FROM subscriptions) + 1);
SELECT setval('sms_codes_id_seq', (SELECT MAX(id) FROM sms_codes) + 1);
```

### Issue: Character encoding problems

**Symptoms:**
- Russian/special characters show as ???
- Import fails with encoding errors

**Solutions:**
1. Set UTF-8 encoding:
   ```sql
   SET client_encoding = 'UTF8';
   ```

2. Export with encoding:
   ```bash
   PGCLIENTENCODING=UTF8 pg_dump ...
   ```

3. Import with encoding:
   ```bash
   PGCLIENTENCODING=UTF8 psql ...
   ```

### Issue: psycopg2 not found

**Symptoms:**
```
ModuleNotFoundError: No module named 'psycopg2'
```

**Solution:**
```bash
pip install psycopg2-binary
# Or on some systems:
pip3 install psycopg2-binary
# Or with sudo:
sudo pip install psycopg2-binary
```

### Issue: Permission denied

**Symptoms:**
```
ERROR: permission denied for table users
```

**Solutions:**
1. Verify you're using correct credentials
2. Check user has necessary permissions:
   ```sql
   GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO gen_user;
   GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO gen_user;
   ```

## Security Notes

⚠️ **Important Security Considerations:**

1. **Credentials Exposed**: The database credentials in this migration toolkit are for temporary migration purposes only.

2. **After Migration:**
   - Change all database passwords
   - Remove credential files from version control
   - Use environment variables for production
   - Set up proper access controls

3. **File Permissions:**
   ```bash
   chmod 600 *.sql  # Restrict SQL files
   chmod 600 *.py   # Restrict Python scripts
   ```

4. **Clean Up:**
   ```bash
   # After successful migration, securely delete:
   rm -P timeweb_database_import.sql  # macOS
   shred -u timeweb_database_import.sql  # Linux
   ```

## Additional Resources

- **QUICK_START.md** - Fastest path to migration
- **DATABASE_EXPORT_INSTRUCTIONS.md** - Detailed step-by-step instructions
- **manual_export_queries.sql** - Manual SQL queries reference

## Support

If you encounter issues not covered in this guide:

1. Check the Troubleshooting section above
2. Verify network connectivity to both databases
3. Ensure you have correct permissions
4. Review error messages carefully
5. Check PostgreSQL logs on both servers

## Summary

This toolkit provides multiple methods to migrate your database:

✅ **Recommended:** Use `export_database.py` for complete automated export

✅ **Fast:** Use `pg_dump` for direct database copy

✅ **Manual:** Use SQL queries for granular control

Choose the method that best fits your needs and infrastructure access.

---

**Migration Checklist:**

- [ ] Install psycopg2-binary
- [ ] Test connection to source database
- [ ] Test connection to target database
- [ ] Run export script
- [ ] Verify export file created
- [ ] Import to target database
- [ ] Verify row counts match
- [ ] Check data integrity
- [ ] Update sequences
- [ ] Test application with new database
- [ ] Change database passwords
- [ ] Clean up temporary files
- [ ] Document migration completion

**Total Time Estimate:** 10-30 minutes (depending on network speed)
