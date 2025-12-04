# 🚀 Database Migration Toolkit

## Welcome!

This toolkit helps you export ALL data from **poehali.dev PostgreSQL** database and import it into **Timeweb PostgreSQL** database.

---

## ⚡ Super Quick Start (3 minutes)

Run these commands:

```bash
# Install requirements
pip install psycopg2-binary

# Export all data from poehali.dev
python3 export_database.py

# Import to Timeweb
PGPASSWORD='=^yZn^;2Nyg2g1' psql -h b4951e9ce41239a524d6f182.twc1.net -p 5432 -U gen_user -d default_db -f timeweb_database_import.sql

# Verify
PGPASSWORD='=^yZn^;2Nyg2g1' psql -h b4951e9ce41239a524d6f182.twc1.net -p 5432 -U gen_user -d default_db -c "SELECT 'messages', COUNT(*) FROM messages UNION ALL SELECT 'private_messages', COUNT(*) FROM private_messages;"
```

**Expected result:**
- messages: 88 rows ✅
- private_messages: 71 rows ✅

**Done!** 🎉

---

## 📚 Choose Your Path

### 🏃 I want to execute NOW
→ **Read:** [EXECUTE_NOW.md](EXECUTE_NOW.md)

Quick commands, no explanations. Get it done in 3-5 minutes.

---

### 🚀 I want a quick guide
→ **Read:** [QUICK_START.md](QUICK_START.md)

Fast-track with troubleshooting. Takes 5-10 minutes.

---

### 📖 I want to understand everything
→ **Read:** [DATABASE_MIGRATION_README.md](DATABASE_MIGRATION_README.md)

Complete guide with multiple methods, detailed explanations, and troubleshooting. Takes 15-30 minutes to read.

---

### 📝 I want detailed instructions
→ **Read:** [DATABASE_EXPORT_INSTRUCTIONS.md](DATABASE_EXPORT_INSTRUCTIONS.md)

Step-by-step instructions for three different migration methods.

---

### 📋 I want to see all files
→ **Read:** [FILES_CREATED.md](FILES_CREATED.md)

Complete list of all files in this toolkit with descriptions.

---

## 🎯 What Gets Migrated?

| Table | Rows |
|-------|------|
| users | 2 |
| messages | 88 |
| private_messages | 71 |
| user_photos | 4 |
| subscriptions | 2 |
| sms_codes | 4 |
| blacklist | 0 |
| reactions | 0 |
| message_reactions | 0 |
| **TOTAL** | **171 rows** |

---

## 🛠️ Tools Available

### Python Scripts (Recommended)

**1. Complete Export** ⭐
```bash
python3 export_database.py
```
Exports all 171 rows from all 9 tables.

**2. Partial Export**
```bash
python3 export_remaining_data.py
```
Exports only missing data (messages 59-88, private_messages 39-71).

### SQL Scripts

**3. Manual Queries**
```bash
psql -f manual_export_queries.sql
```
Run SQL queries manually in psql.

**4. Import Template**
```bash
psql -f timeweb_complete_import_template.sql
```
Complete SQL template with schema and placeholders.

### Bash Script

**5. Automated Script**
```bash
chmod +x run_export.sh
./run_export.sh
```
One-click export.

---

## 🔍 How It Works

1. **Connect** to poehali.dev database
2. **Query** all 9 tables
3. **Generate** SQL INSERT statements
4. **Create** complete import file
5. **Import** to Timeweb database
6. **Verify** row counts

---

## 📊 Migration Methods Comparison

| Method | Time | Difficulty | Recommended? |
|--------|------|------------|--------------|
| Python Script | 3-5 min | ✅ Easy | ⭐⭐⭐ |
| pg_dump | 2-3 min | ⚠️ Medium | ⭐⭐ |
| Manual SQL | 15+ min | ❌ Hard | ⭐ |

---

## ✅ Success Checklist

- [ ] Python 3.6+ installed
- [ ] psycopg2-binary installed
- [ ] Can connect to poehali.dev
- [ ] Can connect to Timeweb
- [ ] Run export script
- [ ] SQL file generated
- [ ] Import to Timeweb
- [ ] Verify row counts
- [ ] Test application
- [ ] Migration complete!

---

## 🆘 Common Issues

### Can't install psycopg2?
```bash
pip3 install psycopg2-binary
# or
sudo pip install psycopg2-binary
```

### Can't connect to poehali.dev?
- Check network access
- Verify firewall rules
- Try from different network

### Import fails?
- Check if SQL file exists
- Verify file is not empty
- Try importing schema first

---

## 📞 Connection Details

### Source Database (poehali.dev)
```
Host: poehali.dev
Port: 5432
Database: t_p53416936_auxchat_energy_messa
User: p53416936_auxchat_energy_messa
Password: gFj!27Np
```

### Target Database (Timeweb)
```
Host: b4951e9ce41239a524d6f182.twc1.net
Port: 5432
Database: default_db
User: gen_user
Password: =^yZn^;2Nyg2g1
```

---

## 🎬 Recommended Workflow

### First Time?
1. Read [QUICK_START.md](QUICK_START.md)
2. Run `python3 export_database.py`
3. Follow the instructions
4. You're done!

### Experienced?
1. Read [EXECUTE_NOW.md](EXECUTE_NOW.md)
2. Copy-paste commands
3. Done in 3 minutes!

### Want Full Control?
1. Read [DATABASE_MIGRATION_README.md](DATABASE_MIGRATION_README.md)
2. Choose your method
3. Execute carefully
4. Verify thoroughly

---

## 📦 What You'll Get

After running the export script:

✅ **timeweb_database_import.sql** - Complete SQL file ready for import

Contains:
- CREATE TABLE statements (9 tables)
- INSERT statements (171 rows)
- CREATE INDEX statements (12 indexes)
- Sequence updates (9 sequences)

Size: ~50-100 KB

---

## 🔒 Security Warning

⚠️ **These files contain database credentials!**

After migration:
1. Delete or secure files
2. Change passwords
3. Remove from version control
4. Use environment variables

---

## 📈 Migration Timeline

| Stage | Time |
|-------|------|
| Setup | 30 sec |
| Export | 1-2 min |
| Import | 30 sec - 1 min |
| Verify | 10 sec |
| **Total** | **3-5 min** |

---

## 🎉 Ready to Start?

### Quick Path (3 minutes)
👉 Open [EXECUTE_NOW.md](EXECUTE_NOW.md)

### Safe Path (10 minutes)
👉 Open [QUICK_START.md](QUICK_START.md)

### Complete Path (30 minutes)
👉 Open [DATABASE_MIGRATION_README.md](DATABASE_MIGRATION_README.md)

---

## 📚 File Structure

```
.
├── START_HERE.md                          ← You are here
├── EXECUTE_NOW.md                         ← Quick execution
├── QUICK_START.md                         ← Fast guide
├── DATABASE_MIGRATION_README.md           ← Complete guide
├── DATABASE_EXPORT_INSTRUCTIONS.md        ← Detailed steps
├── FILES_CREATED.md                       ← File list
│
├── export_database.py                     ← Main script ⭐
├── export_remaining_data.py               ← Partial export
├── run_export.sh                          ← Bash automation
│
├── manual_export_queries.sql              ← Manual SQL
└── timeweb_complete_import_template.sql   ← SQL template
```

---

## 💡 Tips

1. **Use Python script** - It's the easiest and most reliable
2. **Verify after import** - Always check row counts
3. **Backup first** - Save your current Timeweb data
4. **Test thoroughly** - Verify application works
5. **Secure credentials** - Delete files after migration

---

## 🏁 Let's Go!

Choose your path above and start migrating! 🚀

**Most users should start with:** [EXECUTE_NOW.md](EXECUTE_NOW.md)

---

## 📧 Questions?

Check the troubleshooting sections in:
- [QUICK_START.md](QUICK_START.md#troubleshooting)
- [DATABASE_MIGRATION_README.md](DATABASE_MIGRATION_README.md#troubleshooting)

---

**Good luck! 🍀**
