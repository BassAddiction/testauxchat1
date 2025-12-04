-- =====================================================
-- COMPLETE DATABASE IMPORT FOR TIMEWEB POSTGRESQL
-- =====================================================
-- Source: poehali.dev (t_p53416936_auxchat_energy_messa)
-- Target: Timeweb (default_db)
-- Host: b4951e9ce41239a524d6f182.twc1.net
-- User: gen_user
-- Password: =^yZn^;2Nyg2g1
-- =====================================================

-- Set client encoding
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;

-- =====================================================
-- DROP EXISTING TABLES (if needed)
-- =====================================================

DROP TABLE IF EXISTS message_reactions CASCADE;
DROP TABLE IF EXISTS reactions CASCADE;
DROP TABLE IF EXISTS blacklist CASCADE;
DROP TABLE IF EXISTS sms_codes CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS user_photos CASCADE;
DROP TABLE IF EXISTS private_messages CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- =====================================================
-- CREATE TABLES
-- =====================================================

-- Users table
CREATE TABLE users (
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

-- Messages table
CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    voice_url TEXT,
    voice_duration INTEGER
);

-- Message reactions table
CREATE TABLE message_reactions (
    id SERIAL PRIMARY KEY,
    message_id INTEGER REFERENCES messages(id),
    user_id INTEGER REFERENCES users(id),
    emoji VARCHAR(10) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Private messages table
CREATE TABLE private_messages (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER NOT NULL REFERENCES users(id),
    receiver_id INTEGER NOT NULL REFERENCES users(id),
    text TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    voice_url TEXT,
    voice_duration INTEGER
);

-- User photos table
CREATE TABLE user_photos (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    photo_url TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    display_order INTEGER DEFAULT 0
);

-- Subscriptions table
CREATE TABLE subscriptions (
    id SERIAL PRIMARY KEY,
    subscriber_id INTEGER NOT NULL,
    subscribed_to_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(subscriber_id, subscribed_to_id),
    CHECK (subscriber_id != subscribed_to_id)
);

-- SMS codes table
CREATE TABLE sms_codes (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(20) NOT NULL,
    code VARCHAR(4) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    verified BOOLEAN DEFAULT FALSE
);

-- Blacklist table
CREATE TABLE blacklist (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    blocked_user_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, blocked_user_id)
);

-- Reactions table
CREATE TABLE reactions (
    id SERIAL PRIMARY KEY,
    message_id INTEGER REFERENCES messages(id),
    user_id INTEGER REFERENCES users(id),
    emoji VARCHAR(10) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(message_id, user_id, emoji)
);

-- =====================================================
-- CREATE INDEXES
-- =====================================================

CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_messages_user_id ON messages(user_id);
CREATE INDEX idx_private_messages_sender ON private_messages(sender_id);
CREATE INDEX idx_private_messages_receiver ON private_messages(receiver_id);
CREATE INDEX idx_private_messages_conversation ON private_messages(sender_id, receiver_id);
CREATE INDEX idx_user_photos_user_id ON user_photos(user_id);
CREATE INDEX idx_subscriptions_subscriber ON subscriptions(subscriber_id);
CREATE INDEX idx_subscriptions_subscribed_to ON subscriptions(subscribed_to_id);
CREATE INDEX idx_sms_codes_phone ON sms_codes(phone);
CREATE INDEX idx_sms_codes_expires_at ON sms_codes(expires_at);
CREATE INDEX idx_blacklist_user_id ON blacklist(user_id);
CREATE INDEX idx_blacklist_blocked_user_id ON blacklist(blocked_user_id);
CREATE INDEX idx_reactions_message_id ON reactions(message_id);
CREATE INDEX idx_message_reactions_message_id ON message_reactions(message_id);
CREATE INDEX idx_message_reactions_user_id ON message_reactions(user_id);

-- =====================================================
-- INSERT DATA - USERS (2 rows expected)
-- =====================================================
-- TODO: Replace with actual data from poehali.dev
-- Run: SELECT * FROM users ORDER BY id;

-- Example format:
-- INSERT INTO users (id, phone, username, avatar, energy, is_admin, is_banned, created_at, password, bio, status, last_activity) 
-- VALUES (1, '+79123456789', 'username1', 'avatar_url', 100, FALSE, FALSE, '2024-01-01 12:00:00', 'hashed_password', NULL, 'online', '2024-01-01 12:00:00');

-- =====================================================
-- INSERT DATA - MESSAGES (88 rows expected)
-- =====================================================
-- TODO: Replace with actual data from poehali.dev
-- Run: SELECT * FROM messages ORDER BY id;

-- Example format:
-- INSERT INTO messages (id, user_id, text, created_at, voice_url, voice_duration) 
-- VALUES (1, 1, 'Message text here', '2024-01-01 12:00:00', NULL, NULL);

-- =====================================================
-- INSERT DATA - PRIVATE_MESSAGES (71 rows expected)
-- =====================================================
-- TODO: Replace with actual data from poehali.dev
-- Run: SELECT * FROM private_messages ORDER BY id;

-- Example format:
-- INSERT INTO private_messages (id, sender_id, receiver_id, text, is_read, created_at, voice_url, voice_duration) 
-- VALUES (1, 1, 2, 'Private message text', FALSE, '2024-01-01 12:00:00', NULL, NULL);

-- =====================================================
-- INSERT DATA - USER_PHOTOS (4 rows expected)
-- =====================================================
-- TODO: Replace with actual data from poehali.dev
-- Run: SELECT * FROM user_photos ORDER BY id;

-- Example format:
-- INSERT INTO user_photos (id, user_id, photo_url, created_at, display_order) 
-- VALUES (1, 1, 'photo_url', '2024-01-01 12:00:00', 0);

-- =====================================================
-- INSERT DATA - SUBSCRIPTIONS (2 rows expected)
-- =====================================================
-- TODO: Replace with actual data from poehali.dev
-- Run: SELECT * FROM subscriptions ORDER BY id;

-- Example format:
-- INSERT INTO subscriptions (id, subscriber_id, subscribed_to_id, created_at) 
-- VALUES (1, 1, 2, '2024-01-01 12:00:00');

-- =====================================================
-- INSERT DATA - SMS_CODES (4 rows expected)
-- =====================================================
-- TODO: Replace with actual data from poehali.dev
-- Run: SELECT * FROM sms_codes ORDER BY id;

-- Example format:
-- INSERT INTO sms_codes (id, phone, code, created_at, expires_at, verified) 
-- VALUES (1, '+79123456789', '1234', '2024-01-01 12:00:00', '2024-01-01 12:10:00', FALSE);

-- =====================================================
-- INSERT DATA - BLACKLIST (0 rows expected)
-- =====================================================
-- No data expected

-- =====================================================
-- INSERT DATA - MESSAGE_REACTIONS (0 rows expected)
-- =====================================================
-- No data expected

-- =====================================================
-- INSERT DATA - REACTIONS (0 rows expected)
-- =====================================================
-- No data expected

-- =====================================================
-- UPDATE SEQUENCES
-- =====================================================
-- After all data is inserted, update sequences to prevent ID conflicts

SELECT setval('users_id_seq', (SELECT COALESCE(MAX(id), 0) FROM users) + 1, false);
SELECT setval('messages_id_seq', (SELECT COALESCE(MAX(id), 0) FROM messages) + 1, false);
SELECT setval('private_messages_id_seq', (SELECT COALESCE(MAX(id), 0) FROM private_messages) + 1, false);
SELECT setval('user_photos_id_seq', (SELECT COALESCE(MAX(id), 0) FROM user_photos) + 1, false);
SELECT setval('subscriptions_id_seq', (SELECT COALESCE(MAX(id), 0) FROM subscriptions) + 1, false);
SELECT setval('sms_codes_id_seq', (SELECT COALESCE(MAX(id), 0) FROM sms_codes) + 1, false);
SELECT setval('blacklist_id_seq', (SELECT COALESCE(MAX(id), 0) FROM blacklist) + 1, false);
SELECT setval('message_reactions_id_seq', (SELECT COALESCE(MAX(id), 0) FROM message_reactions) + 1, false);
SELECT setval('reactions_id_seq', (SELECT COALESCE(MAX(id), 0) FROM reactions) + 1, false);

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these after import to verify data integrity

SELECT 'users' as table_name, COUNT(*) as row_count FROM users
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

-- Expected results:
-- users: 2
-- messages: 88
-- private_messages: 71
-- user_photos: 4
-- subscriptions: 2
-- sms_codes: 4
-- blacklist: 0
-- reactions: 0
-- message_reactions: 0

-- =====================================================
-- IMPORT COMPLETE
-- =====================================================
