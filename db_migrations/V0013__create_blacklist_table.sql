-- Таблица для черного списка пользователей
CREATE TABLE IF NOT EXISTS blacklist (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    blocked_user_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, blocked_user_id)
);

CREATE INDEX idx_blacklist_user_id ON blacklist(user_id);
CREATE INDEX idx_blacklist_blocked_user_id ON blacklist(blocked_user_id);