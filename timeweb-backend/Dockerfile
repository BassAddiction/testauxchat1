# Combined Frontend + Backend for AuxChat
# Stage 1: Build frontend
FROM node:20-alpine AS frontend-build

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Backend + Nginx
FROM python:3.11-slim

# Install nginx and supervisor
RUN apt-get update && \
    apt-get install -y nginx supervisor && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY timeweb-backend/requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY timeweb-backend/main.py ./

# Copy frontend build from stage 1
COPY --from=frontend-build /app/dist /var/www/html

# Nginx configuration
RUN echo 'server {\n\
    listen 8080;\n\
    root /var/www/html;\n\
    index index.html;\n\
    \n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
    \n\
    location /api/ {\n\
        rewrite ^/api/(.*) /$1 break;\n\
        proxy_pass http://127.0.0.1:5000;\n\
        proxy_set_header Host $host;\n\
        proxy_set_header X-Real-IP $remote_addr;\n\
    }\n\
}' > /etc/nginx/sites-available/default

# Supervisor config (run both nginx and gunicorn)
RUN echo '[supervisord]\n\
nodaemon=true\n\
\n\
[program:gunicorn]\n\
command=gunicorn --bind 127.0.0.1:5000 --workers 2 main:app\n\
directory=/app\n\
autostart=true\n\
autorestart=true\n\
\n\
[program:nginx]\n\
command=nginx -g "daemon off;"\n\
autostart=true\n\
autorestart=true' > /etc/supervisor/conf.d/supervisord.conf

EXPOSE 8080

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]