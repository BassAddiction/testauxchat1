# Python backend for AuxChat
FROM python:3.11-slim

WORKDIR /app

# Copy requirements and install dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY main.py ./
COPY asgi.py ./

# Expose port (use 8000 or $PORT from env)
EXPOSE 8000

# Run Flask through ASGI adapter with uvicorn
CMD ["uvicorn", "asgi:application", "--host", "0.0.0.0", "--port", "8000"]