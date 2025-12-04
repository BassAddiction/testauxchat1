# ⚡ EXECUTE DATABASE MIGRATION NOW

## What You Need to Do

Run these commands in your terminal:

### 1. Install Requirements (30 seconds)
```bash
pip install psycopg2-binary
```

### 2. Run Export Script (1-2 minutes)
```bash
python3 export_database.py
```

**Expected Output:**
```
Connecting to poehali.dev database...
Connected successfully!

Exporting users table...
Found 2 users

Exporting messages table (ALL 88 rows)...
Found 88 messages

Exporting private_messages table (ALL 71 rows)...
Found 71 private messages

Exporting user_photos table...
Found 4 user photos

Exporting subscriptions table...
Found 2 subscriptions

Exporting sms_codes table...
Found 4 sms codes

Exporting blacklist table...
Found 0 blacklist entries

Exporting message_reactions table...
Found 0 message reactions

Exporting reactions table...
Found 0 reactions

✅ Export completed successfully!
📄 SQL file saved to: timeweb_database_import.sql

📊 Export summary:
   - Users: 2 rows
   - Messages: 88 rows
   - Private Messages: 71 rows
   - User Photos: 4 rows
   - Subscriptions: 2 rows
   - SMS Codes: 4 rows
   - Blacklist: 0 rows
   - Message Reactions: 0 rows
   - Reactions: 0 rows
```

### 3. Import to Timeweb (30 seconds - 1 minute)
```bash
PGPASSWORD='=^yZn^;2Nyg2g1' psql -h b4951e9ce41239a524d6f182.twc1.net -p 5432 -U gen_user -d default_db -f timeweb_database_import.sql
```

### 4. Verify Import (10 seconds)
```bash
PGPASSWORD='=^yZn^;2Nyg2g1' psql -h b4951e9ce41239a524d6f182.twc1.net -p 5432 -U gen_user -d default_db -c "
SELECT 'users' as table, COUNT(*) as rows FROM users
UNION ALL SELECT 'messages', COUNT(*) FROM messages
UNION ALL SELECT 'private_messages', COUNT(*) FROM private_messages
UNION ALL SELECT 'user_photos', COUNT(*) FROM user_photos
UNION ALL SELECT 'subscriptions', COUNT(*) FROM subscriptions
UNION ALL SELECT 'sms_codes', COUNT(*) FROM sms_codes;
"
```

**Expected Output:**
```
      table       | rows 
------------------+------
 users            |    2
 messages         |   88
 private_messages |   71
 user_photos      |    4
 subscriptions    |    2
 sms_codes        |    4
```

## ✅ Done!

If you see the expected row counts above, your migration is **COMPLETE**.

---

## Alternative: One-Line Command (if you trust the script)

```bash
pip install psycopg2-binary && python3 export_database.py && PGPASSWORD='=^yZn^;2Nyg2g1' psql -h b4951e9ce41239a524d6f182.twc1.net -p 5432 -U gen_user -d default_db -f timeweb_database_import.sql && echo "✅ MIGRATION COMPLETE"
```

---

## If Something Goes Wrong

### Can't connect to poehali.dev?
- Check your network connection
- Try from a different network/location
- Verify the database is running

### psycopg2 not found?
```bash
# Try with pip3
pip3 install psycopg2-binary

# Or with sudo
sudo pip install psycopg2-binary
```

### Import fails?
- Check if you have the SQL file: `ls -lh timeweb_database_import.sql`
- Verify file is not empty: `wc -l timeweb_database_import.sql`
- Try importing just the schema first

### Need more help?
- Read `QUICK_START.md` for troubleshooting
- Read `DATABASE_MIGRATION_README.md` for detailed guide

---

## What the Script Does

1. ✅ Connects to poehali.dev database
2. ✅ Exports ALL 9 tables with complete schema
3. ✅ Generates INSERT statements for all 171 rows
4. ✅ Creates indexes
5. ✅ Updates sequences (auto-increment IDs)
6. ✅ Saves everything to `timeweb_database_import.sql`

## What Gets Migrated

| Table | Rows |
|-------|------|
| users | 2 |
| messages | 88 ← **ALL messages including 59-88** |
| private_messages | 71 ← **ALL private messages including 39-71** |
| user_photos | 4 |
| subscriptions | 2 |
| sms_codes | 4 |
| blacklist | 0 |
| reactions | 0 |
| message_reactions | 0 |
| **TOTAL** | **171 rows** |

## Time Required

- **Setup:** 30 seconds
- **Export:** 1-2 minutes
- **Import:** 30 seconds - 1 minute
- **Verification:** 10 seconds

**Total:** ~3-5 minutes

---

## Ready? Let's Go! 🚀

Copy and paste these commands one by one:

```bash
# Step 1: Install
pip install psycopg2-binary

# Step 2: Export
python3 export_database.py

# Step 3: Import
PGPASSWORD='=^yZn^;2Nyg2g1' psql -h b4951e9ce41239a524d6f182.twc1.net -p 5432 -U gen_user -d default_db -f timeweb_database_import.sql

# Step 4: Verify
PGPASSWORD='=^yZn^;2Nyg2g1' psql -h b4951e9ce41239a524d6f182.twc1.net -p 5432 -U gen_user -d default_db -c "SELECT 'messages', COUNT(*) FROM messages UNION ALL SELECT 'private_messages', COUNT(*) FROM private_messages;"
```

You should see:
```
 ?column?         | count 
------------------+-------
 messages         |    88
 private_messages |    71
```

**If you see 88 and 71, you're done! ✅**
