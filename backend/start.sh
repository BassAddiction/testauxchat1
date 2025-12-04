#!/bin/bash

# AuxChat Backend Startup Script

# Check if environment variables are set
if [ -z "$DATABASE_URL" ]; then
    echo "Error: DATABASE_URL environment variable is not set"
    exit 1
fi

# Set default port if not provided
export PORT=${PORT:-8000}

echo "Starting AuxChat API server on port $PORT..."
echo "Database: $DATABASE_URL"

# Run with gunicorn
exec gunicorn \
    --bind 0.0.0.0:$PORT \
    --workers 4 \
    --threads 2 \
    --timeout 120 \
    --access-logfile - \
    --error-logfile - \
    --log-level info \
    main:app
