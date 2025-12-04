# Quick Start Guide - Database Migration

## Fastest Method: Run Python Script

### 1. Install Requirements
```bash
pip install psycopg2-binary
```

### 2. Run Complete Export
```bash
python3 export_database.py
```

This creates `timeweb_database_import.sql` with ALL data.

### 3. Import to Timeweb
```bash
PGPASSWORD='=^yZn^;2Nyg2g1' psql -h b4951e9ce41239a524d6f182.twc1.net -p 5432 -U gen_user -d default_db -f timeweb_database_import.sql
```

## Alternative: Export Only Missing Data

If you already have some data exported, run:

```bash
python3 export_remaining_data.py
```

This exports only:
- Messages with ID > 58 (remaining ~30 rows)
- Private messages with ID > 38 (remaining ~33 rows)

## Alternative: Manual psql Method

### Export from Source
```bash
PGPASSWORD='gFj!27Np' pg_dump \
  -h poehali.dev \
  -p 5432 \
  -U p53416936_auxchat_energy_messa \
  -d t_p53416936_auxchat_energy_messa \
  --clean --if-exists --no-owner --no-acl \
  -f complete_export.sql
```

### Import to Target
```bash
PGPASSWORD='=^yZn^;2Nyg2g1' psql \
  -h b4951e9ce41239a524d6f182.twc1.net \
  -p 5432 \
  -U gen_user \
  -d default_db \
  -f complete_export.sql
```

## Verify After Import

```bash
PGPASSWORD='=^yZn^;2Nyg2g1' psql \
  -h b4951e9ce41239a524d6f182.twc1.net \
  -p 5432 \
  -U gen_user \
  -d default_db \
  -c "SELECT 'users', COUNT(*) FROM users UNION ALL SELECT 'messages', COUNT(*) FROM messages UNION ALL SELECT 'private_messages', COUNT(*) FROM private_messages;"
```

Expected output:
```
 ?column?         | count 
------------------+-------
 users            |     2
 messages         |    88
 private_messages |    71
```

## Files Available

1. **export_database.py** - Complete database export script (RECOMMENDED)
2. **export_remaining_data.py** - Export only missing rows (messages 59-88, private_messages 39-71)
3. **manual_export_queries.sql** - SQL queries to run manually in psql
4. **timeweb_complete_import_template.sql** - Template SQL file with schema
5. **DATABASE_EXPORT_INSTRUCTIONS.md** - Detailed instructions
6. **run_export.sh** - Automated bash script

## Troubleshooting

### Cannot connect to poehali.dev
- Check if database is accessible from your network
- Verify firewall rules
- Try from different IP/location

### Import fails with constraint errors
Import tables in this order:
1. users
2. messages
3. private_messages
4. All other tables

### Wrong sequence values
After import, run:
```sql
SELECT setval('users_id_seq', (SELECT MAX(id) FROM users) + 1);
SELECT setval('messages_id_seq', (SELECT MAX(id) FROM messages) + 1);
SELECT setval('private_messages_id_seq', (SELECT MAX(id) FROM private_messages) + 1);
```

## Need Help?

Check detailed instructions in `DATABASE_EXPORT_INSTRUCTIONS.md`
