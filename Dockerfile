# Multi-stage build для фронтенда AuxChat
# Stage 1: Build с использованием Bun
FROM oven/bun:1 AS builder

WORKDIR /app

# Копируем package.json и lockfile
COPY package.json bun.lockb* ./

# Устанавливаем зависимости
RUN bun install --frozen-lockfile

# Копируем весь исходный код
COPY . .

# DEBUG: Проверим что в func2url.ts ПЕРЕД сборкой
RUN echo "=== CHECKING func2url.ts BEFORE BUILD ===" && head -10 src/lib/func2url.ts

# ЖЁСТКАЯ очистка всех кешей
RUN rm -rf node_modules/.vite .vite dist node_modules/.cache

# Пересобираем зависимости без кеша
RUN bun install --frozen-lockfile --force

# Собираем production build с чистого листа
RUN bun run build

# DEBUG: Проверим содержимое собранного JS (должны быть yandexcloud.net URLs)
RUN echo "=== CHECKING BUILT JS FILES ===" && grep -o "functions\.[a-z]*\.dev" dist/assets/*.js | head -20 || echo "NO FUNCTION URLS FOUND"

# DEBUG: Проверим что собралось
RUN ls -la /app/dist

# Stage 2: Production с nginx
FROM nginx:alpine

# Копируем собранные файлы из builder
COPY --from=builder /app/dist /usr/share/nginx/html

# DEBUG: Проверим что скопировалось
RUN ls -la /usr/share/nginx/html

# Настраиваем nginx для SPA (чтобы работал React Router)
RUN echo 'server { \
    listen 80; \
    server_name _; \
    root /usr/share/nginx/html; \
    index index.html; \
    \
    # ПОЛНОСТЬЮ отключаем кеш для всех файлов \
    location / { \
        add_header Cache-Control "no-cache, no-store, must-revalidate, max-age=0"; \
        add_header Pragma "no-cache"; \
        add_header Expires "0"; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]