# Files Created for Database Migration

This document lists all files created for the poehali.dev → Timeweb PostgreSQL migration.

## 📋 Quick Reference

**Want to migrate NOW?** → Read `EXECUTE_NOW.md`

**Need step-by-step guide?** → Read `QUICK_START.md`

**Want all details?** → Read `DATABASE_MIGRATION_README.md`

---

## 📁 Files Overview

### 🟢 Primary Migration Tools

#### 1. `export_database.py` ⭐ RECOMMENDED
**Purpose:** Complete automated database export

**What it does:**
- Connects to poehali.dev PostgreSQL database
- Exports ALL 9 tables with complete schema
- Generates INSERT statements for all 171 rows
- Creates indexes and updates sequences
- Outputs: `timeweb_database_import.sql`

**Usage:**
```bash
python3 export_database.py
```

**Requirements:**
- Python 3.6+
- psycopg2-binary (`pip install psycopg2-binary`)
- Network access to poehali.dev

---

#### 2. `export_remaining_data.py`
**Purpose:** Export only missing data

**What it does:**
- Exports messages with ID > 58 (~30 rows)
- Exports private_messages with ID > 38 (~33 rows)
- Outputs: `remaining_data.sql`

**Usage:**
```bash
python3 export_remaining_data.py
```

**Use when:** You already have partial data exported and only need the remaining rows.

---

### 📘 Documentation Files

#### 3. `EXECUTE_NOW.md` ⚡
**Purpose:** Quick execution guide

**Contents:**
- One-line commands to run
- Expected output at each step
- Quick troubleshooting
- Total time estimate: 3-5 minutes

**Best for:** Someone who wants to execute the migration immediately

---

#### 4. `QUICK_START.md` 🚀
**Purpose:** Fast-track guide

**Contents:**
- Fastest method (Python script)
- Alternative methods
- Verification steps
- Common issues

**Best for:** Experienced users who want the fastest path

---

#### 5. `DATABASE_MIGRATION_README.md` 📖
**Purpose:** Comprehensive migration guide

**Contents:**
- Complete overview
- Multiple migration methods
- Detailed troubleshooting
- Security notes
- Verification procedures
- 20+ pages of detailed instructions

**Best for:** Complete understanding of the migration process

---

#### 6. `DATABASE_EXPORT_INSTRUCTIONS.md` 📝
**Purpose:** Detailed step-by-step instructions

**Contents:**
- Three different migration methods
- Connection details
- Verification queries
- Troubleshooting section

**Best for:** Users who want detailed instructions for each method

---

### 🛠️ Supporting Tools

#### 7. `manual_export_queries.sql`
**Purpose:** Manual SQL queries for export

**Contents:**
- SQL queries to export each table
- CSV export commands
- INSERT statement generators
- Verification queries

**Usage:**
```bash
psql -h poehali.dev -p 5432 -U p53416936_auxchat_energy_messa -d t_p53416936_auxchat_energy_messa -f manual_export_queries.sql
```

**Best for:** Manual control or when Python is not available

---

#### 8. `timeweb_complete_import_template.sql`
**Purpose:** SQL template for manual data insertion

**Contents:**
- Complete CREATE TABLE statements
- CREATE INDEX statements
- Placeholder comments for INSERT statements
- Sequence update commands
- Verification queries

**Best for:** Building import file manually

---

#### 9. `run_export.sh`
**Purpose:** Automated bash script

**Contents:**
```bash
#!/bin/bash
pip install psycopg2-binary
python3 export_database.py
```

**Usage:**
```bash
chmod +x run_export.sh
./run_export.sh
```

**Best for:** One-click execution

---

## 🎯 Which File Should I Use?

### Scenario 1: "I just want to migrate everything NOW"
→ **Read:** `EXECUTE_NOW.md`
→ **Run:** `export_database.py`

### Scenario 2: "I need a quick guide"
→ **Read:** `QUICK_START.md`
→ **Run:** `export_database.py`

### Scenario 3: "I want to understand everything first"
→ **Read:** `DATABASE_MIGRATION_README.md`
→ **Then run:** `export_database.py`

### Scenario 4: "I already exported some data"
→ **Run:** `export_remaining_data.py`

### Scenario 5: "I can't use Python"
→ **Read:** `DATABASE_EXPORT_INSTRUCTIONS.md` (Method 2 or 3)
→ **Use:** `manual_export_queries.sql`

### Scenario 6: "I want to build the import file manually"
→ **Use:** `timeweb_complete_import_template.sql`
→ **Fill in:** Data from source database

---

## 📊 File Dependency Tree

```
EXECUTE_NOW.md
    └── export_database.py
        └── timeweb_database_import.sql (generated)

QUICK_START.md
    ├── export_database.py
    └── export_remaining_data.py

DATABASE_MIGRATION_README.md
    ├── export_database.py
    ├── export_remaining_data.py
    ├── manual_export_queries.sql
    └── timeweb_complete_import_template.sql

DATABASE_EXPORT_INSTRUCTIONS.md
    ├── export_database.py
    └── manual_export_queries.sql
```

---

## 🔍 File Details

| File | Type | Size Est. | Purpose |
|------|------|-----------|---------|
| export_database.py | Python | ~12 KB | Main export script |
| export_remaining_data.py | Python | ~7 KB | Partial export script |
| run_export.sh | Bash | ~200 B | Automation script |
| manual_export_queries.sql | SQL | ~5 KB | Manual queries |
| timeweb_complete_import_template.sql | SQL | ~8 KB | Import template |
| EXECUTE_NOW.md | Docs | ~4 KB | Quick execution |
| QUICK_START.md | Docs | ~3 KB | Fast-track guide |
| DATABASE_MIGRATION_README.md | Docs | ~25 KB | Complete guide |
| DATABASE_EXPORT_INSTRUCTIONS.md | Docs | ~10 KB | Detailed instructions |
| FILES_CREATED.md | Docs | ~4 KB | This file |

---

## 🎬 Recommended Workflow

### For Quick Migration (5 minutes)

1. Read `EXECUTE_NOW.md` (1 min)
2. Run `python3 export_database.py` (2 min)
3. Import SQL file to Timeweb (1 min)
4. Verify row counts (30 sec)

### For Careful Migration (15 minutes)

1. Read `DATABASE_MIGRATION_README.md` (5 min)
2. Review `export_database.py` script (2 min)
3. Run export script (2 min)
4. Review generated SQL file (2 min)
5. Import to Timeweb (2 min)
6. Run verification queries (2 min)

### For Manual Migration (30+ minutes)

1. Read `DATABASE_EXPORT_INSTRUCTIONS.md` (5 min)
2. Use `manual_export_queries.sql` (10 min)
3. Edit `timeweb_complete_import_template.sql` (10 min)
4. Import to Timeweb (2 min)
5. Verify and troubleshoot (3+ min)

---

## 📤 Generated Files (After Running Scripts)

After running the migration scripts, these files will be created:

### `timeweb_database_import.sql`
- Generated by: `export_database.py`
- Size: ~50-100 KB (depends on text content)
- Contains: Complete database dump ready for import
- **This is the main file you'll import to Timeweb**

### `remaining_data.sql`
- Generated by: `export_remaining_data.py`
- Size: ~20-30 KB
- Contains: Only missing messages and private_messages
- Use for partial imports

### CSV files (if using manual method)
- `users_all.csv`
- `messages_all.csv`
- `private_messages_all.csv`
- `user_photos_all.csv`
- `subscriptions_all.csv`
- `sms_codes_all.csv`
- `blacklist_all.csv`
- `message_reactions_all.csv`
- `reactions_all.csv`

---

## 🔒 Security Note

**All files contain database credentials:**
- Source database: poehali.dev
- Target database: Timeweb

**After migration:**
1. Delete or secure these files
2. Change database passwords
3. Remove from version control
4. Use environment variables in production

---

## ✅ Success Criteria

Migration is complete when:

- [ ] `timeweb_database_import.sql` is generated
- [ ] File contains ~171 INSERT statements
- [ ] Import to Timeweb succeeds without errors
- [ ] Row count verification shows:
  - users: 2
  - messages: 88
  - private_messages: 71
  - user_photos: 4
  - subscriptions: 2
  - sms_codes: 4
- [ ] Application works with new database
- [ ] Old database is backed up/archived

---

## 🆘 Need Help?

1. **Quick issue?** → Check `EXECUTE_NOW.md` troubleshooting section
2. **Common problem?** → Read `QUICK_START.md` troubleshooting
3. **Complex issue?** → Consult `DATABASE_MIGRATION_README.md` troubleshooting
4. **Still stuck?** → Check PostgreSQL logs on both servers

---

## 📞 Database Connection Info

### Source (poehali.dev)
```
Host: poehali.dev
Port: 5432
Database: t_p53416936_auxchat_energy_messa
User: p53416936_auxchat_energy_messa
Password: gFj!27Np
```

### Target (Timeweb)
```
Host: b4951e9ce41239a524d6f182.twc1.net
Port: 5432
Database: default_db
User: gen_user
Password: =^yZn^;2Nyg2g1
```

---

## 🎉 Summary

**Total files created: 10**

**Primary tools: 2**
- `export_database.py` ⭐
- `export_remaining_data.py`

**Documentation: 5**
- `EXECUTE_NOW.md` ⚡
- `QUICK_START.md` 🚀
- `DATABASE_MIGRATION_README.md` 📖
- `DATABASE_EXPORT_INSTRUCTIONS.md` 📝
- `FILES_CREATED.md` (this file)

**Supporting tools: 3**
- `manual_export_queries.sql`
- `timeweb_complete_import_template.sql`
- `run_export.sh`

**Recommended path:**
`EXECUTE_NOW.md` → `export_database.py` → Success! ✅
