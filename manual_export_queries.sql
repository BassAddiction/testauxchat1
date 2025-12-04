-- =====================================================
-- MANUAL EXPORT QUERIES
-- Run these queries on poehali.dev database to get remaining data
-- =====================================================

-- Connect to poehali.dev database:
-- psql -h poehali.dev -p 5432 -U p53416936_auxchat_energy_messa -d t_p53416936_auxchat_energy_messa

-- =====================================================
-- 1. GET ALL MESSAGES (especially IDs 59-88)
-- =====================================================

\copy (SELECT * FROM messages ORDER BY id) TO 'messages_all.csv' WITH CSV HEADER;

-- Or get as INSERT statements:
SELECT 'INSERT INTO messages (id, user_id, text, created_at, voice_url, voice_duration) VALUES (' ||
       COALESCE(id::text, 'NULL') || ', ' ||
       COALESCE(user_id::text, 'NULL') || ', ' ||
       COALESCE('''' || REPLACE(text, '''', '''''') || '''', 'NULL') || ', ' ||
       COALESCE('''' || created_at::text || '''', 'NULL') || ', ' ||
       COALESCE('''' || voice_url || '''', 'NULL') || ', ' ||
       COALESCE(voice_duration::text, 'NULL') || 
       ');'
FROM messages
WHERE id > 58
ORDER BY id;

-- =====================================================
-- 2. GET ALL PRIVATE MESSAGES (especially IDs 39-71)
-- =====================================================

\copy (SELECT * FROM private_messages ORDER BY id) TO 'private_messages_all.csv' WITH CSV HEADER;

-- Or get as INSERT statements:
SELECT 'INSERT INTO private_messages (id, sender_id, receiver_id, text, is_read, created_at, voice_url, voice_duration) VALUES (' ||
       COALESCE(id::text, 'NULL') || ', ' ||
       COALESCE(sender_id::text, 'NULL') || ', ' ||
       COALESCE(receiver_id::text, 'NULL') || ', ' ||
       COALESCE('''' || REPLACE(text, '''', '''''') || '''', 'NULL') || ', ' ||
       COALESCE(is_read::text, 'FALSE') || ', ' ||
       COALESCE('''' || created_at::text || '''', 'NULL') || ', ' ||
       COALESCE('''' || voice_url || '''', 'NULL') || ', ' ||
       COALESCE(voice_duration::text, 'NULL') || 
       ');'
FROM private_messages
WHERE id > 38
ORDER BY id;

-- =====================================================
-- 3. VERIFY TOTAL COUNTS
-- =====================================================

SELECT 
    'users' as table_name, COUNT(*) as row_count FROM users
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
SELECT 'message_reactions', COUNT(*) FROM message_reactions
ORDER BY table_name;

-- =====================================================
-- 4. GET ALL DATA FROM ALL TABLES (COMPLETE EXPORT)
-- =====================================================

-- Users
\copy (SELECT * FROM users ORDER BY id) TO 'users_all.csv' WITH CSV HEADER;

-- Messages
\copy (SELECT * FROM messages ORDER BY id) TO 'messages_all.csv' WITH CSV HEADER;

-- Private Messages
\copy (SELECT * FROM private_messages ORDER BY id) TO 'private_messages_all.csv' WITH CSV HEADER;

-- User Photos
\copy (SELECT * FROM user_photos ORDER BY id) TO 'user_photos_all.csv' WITH CSV HEADER;

-- Subscriptions
\copy (SELECT * FROM subscriptions ORDER BY id) TO 'subscriptions_all.csv' WITH CSV HEADER;

-- SMS Codes
\copy (SELECT * FROM sms_codes ORDER BY id) TO 'sms_codes_all.csv' WITH CSV HEADER;

-- Blacklist
\copy (SELECT * FROM blacklist ORDER BY id) TO 'blacklist_all.csv' WITH CSV HEADER;

-- Message Reactions
\copy (SELECT * FROM message_reactions ORDER BY id) TO 'message_reactions_all.csv' WITH CSV HEADER;

-- Reactions
\copy (SELECT * FROM reactions ORDER BY id) TO 'reactions_all.csv' WITH CSV HEADER;

-- =====================================================
-- 5. AFTER EXPORTING, IMPORT INTO TIMEWEB
-- =====================================================

-- On Timeweb database (b4951e9ce41239a524d6f182.twc1.net):
-- psql -h b4951e9ce41239a524d6f182.twc1.net -p 5432 -U gen_user -d default_db

-- Then run:
-- \copy users FROM 'users_all.csv' WITH CSV HEADER;
-- \copy messages FROM 'messages_all.csv' WITH CSV HEADER;
-- \copy private_messages FROM 'private_messages_all.csv' WITH CSV HEADER;
-- \copy user_photos FROM 'user_photos_all.csv' WITH CSV HEADER;
-- \copy subscriptions FROM 'subscriptions_all.csv' WITH CSV HEADER;
-- \copy sms_codes FROM 'sms_codes_all.csv' WITH CSV HEADER;
-- \copy blacklist FROM 'blacklist_all.csv' WITH CSV HEADER;
-- \copy message_reactions FROM 'message_reactions_all.csv' WITH CSV HEADER;
-- \copy reactions FROM 'reactions_all.csv' WITH CSV HEADER;

-- Update sequences:
-- SELECT setval('users_id_seq', (SELECT MAX(id) FROM users) + 1, false);
-- SELECT setval('messages_id_seq', (SELECT MAX(id) FROM messages) + 1, false);
-- SELECT setval('private_messages_id_seq', (SELECT MAX(id) FROM private_messages) + 1, false);
-- SELECT setval('user_photos_id_seq', (SELECT MAX(id) FROM user_photos) + 1, false);
-- SELECT setval('subscriptions_id_seq', (SELECT MAX(id) FROM subscriptions) + 1, false);
-- SELECT setval('sms_codes_id_seq', (SELECT MAX(id) FROM sms_codes) + 1, false);
-- SELECT setval('blacklist_id_seq', (SELECT MAX(id) FROM blacklist) + 1, false);
-- SELECT setval('message_reactions_id_seq', (SELECT MAX(id) FROM message_reactions) + 1, false);
-- SELECT setval('reactions_id_seq', (SELECT MAX(id) FROM reactions) + 1, false);
