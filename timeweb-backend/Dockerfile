# Combined Frontend + Backend for AuxChat
# Stage 1: Build frontend
FROM node:20-alpine AS frontend-build

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Backend only (Flask serves everything)
FROM python:3.11-slim

WORKDIR /app

# Install Python dependencies
COPY timeweb-backend/requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY timeweb-backend/main.py ./

# Copy frontend build from stage 1
COPY --from=frontend-build /app/dist /app/static

EXPOSE 8080

# Add healthcheck
HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8080/health').read()" || exit 1

# Use gunicorn with logging
CMD ["gunicorn", "--bind", "0.0.0.0:8080", "--workers", "1", "--timeout", "120", "--log-level", "debug", "--access-logfile", "-", "--error-logfile", "-", "main:app"]