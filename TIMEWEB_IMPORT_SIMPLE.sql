-- =====================================================
-- УПРОЩЁННЫЙ ИМПОРТ БЕЗ БОЛЬШИХ ДАННЫХ
-- =====================================================

SET client_encoding = 'UTF8';

-- Удалить все таблицы если есть
DROP TABLE IF EXISTS reactions CASCADE;
DROP TABLE IF EXISTS message_reactions CASCADE;
DROP TABLE IF EXISTS blacklist CASCADE;
DROP TABLE IF EXISTS sms_codes CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS user_photos CASCADE;
DROP TABLE IF EXISTS private_messages CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Создать таблицы заново
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    telegram_id BIGINT,
    username VARCHAR(100) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    avatar_url TEXT,
    energy INTEGER DEFAULT 100,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_banned BOOLEAN DEFAULT FALSE,
    password_hash VARCHAR(255),
    is_admin BOOLEAN DEFAULT FALSE,
    bio TEXT,
    status VARCHAR(50) DEFAULT 'online',
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    voice_url TEXT,
    voice_duration INTEGER
);

CREATE TABLE private_messages (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    voice_url TEXT,
    voice_duration INTEGER
);

CREATE TABLE user_photos (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    display_order INTEGER DEFAULT 0
);

CREATE TABLE subscriptions (
    id SERIAL PRIMARY KEY,
    subscriber_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subscribed_to_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(subscriber_id, subscribed_to_id),
    CHECK (subscriber_id != subscribed_to_id)
);

CREATE TABLE sms_codes (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(20) NOT NULL,
    code VARCHAR(4) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    verified BOOLEAN DEFAULT FALSE
);

CREATE TABLE blacklist (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, blocked_user_id)
);

CREATE TABLE reactions (
    id SERIAL PRIMARY KEY,
    message_id INTEGER REFERENCES messages(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    emoji VARCHAR(10) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(message_id, user_id, emoji)
);

CREATE TABLE message_reactions (
    id SERIAL PRIMARY KEY,
    message_id INTEGER REFERENCES messages(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    emoji VARCHAR(10) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы
CREATE INDEX idx_messages_user_id ON messages(user_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
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

-- Вставка тестовых пользователей (БЕЗ огромного base64 аватара)
INSERT INTO users (id, username, phone, energy, password_hash, status) VALUES
(7, 'AuxChat', '+79221316334', 900, '474c621afa5cee313834ea20ec966db7325af549e60684a22d7b92972d58af77', 'online'),
(8, 'Лена', '+79999999999', 900, 'c2429058fcd3d65aa1d94dc42f8e6e6766e607ea9d1a28a32ce8e9dda3ad8bc5', 'online');

-- Сообщения (сокращённо, первые 20)
INSERT INTO messages (user_id, text, created_at) VALUES
(7, 'эй привет пацики на моциках!!!', '2025-11-30 13:17:56'),
(7, 'Всем доброго вечера', '2025-11-30 13:46:22'),
(7, 'Эй', '2025-11-30 14:45:31'),
(7, 'Есть кто?', '2025-11-30 14:49:41'),
(7, 'Привет', '2025-11-30 15:02:14'),
(7, 'Кто тут?', '2025-11-30 15:07:44'),
(7, 'Всем привет', '2025-11-30 15:08:24'),
(7, 'Добрый вечер', '2025-11-30 16:12:13'),
(7, 'Всем привет!', '2025-11-30 16:28:53'),
(7, 'Эй', '2025-11-30 19:41:43'),
(7, 'Да', '2025-11-30 20:13:38'),
(7, 'Да ну', '2025-11-30 20:14:13'),
(7, 'Епта', '2025-11-30 20:48:07'),
(7, 'Эй', '2025-11-30 20:48:36'),
(8, 'Привет', '2025-11-30 21:13:10'),
(7, 'О Привет', '2025-11-30 21:13:34'),
(7, 'Как дела', '2025-11-30 21:13:42'),
(8, 'Нормально', '2025-11-30 21:13:53'),
(8, 'Я тут новенькая', '2025-11-30 21:14:05'),
(7, 'Ну молодец', '2025-11-30 21:14:15');

-- Сбросить счётчики последовательностей
SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));
SELECT setval('messages_id_seq', (SELECT MAX(id) FROM messages));
