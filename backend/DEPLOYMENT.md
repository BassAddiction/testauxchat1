# AuxChat Backend - Unified Flask API for Timeweb

This is a unified Flask API server that combines all 23 backend cloud functions into a single deployable application for Timeweb hosting.

## Architecture

The application uses Flask to create a unified REST API that wraps all existing cloud function handlers. Each handler maintains its original logic, but is called through Flask routes instead of individual cloud functions.

## Structure

```
backend/
├── main.py                 # Flask application with all routes
├── requirements.txt        # Python dependencies
├── Dockerfile             # Docker configuration for deployment
├── .dockerignore          # Docker build optimization
└── [function-folders]/    # Original 23 function folders
    └── index.py           # Handler code (unchanged)
```

## API Endpoints

### Authentication & User Management
- `POST /api/login` - User login with phone and password
- `POST /api/register` - Register new user
- `POST /api/send-sms` - Send SMS verification code
- `POST /api/verify-sms` - Verify SMS code
- `POST /api/reset-password` - Reset user password
- `POST /api/create-user` - Create user after phone verification
- `GET /api/user` - Get user data by ID
- `POST /api/update-activity` - Update user activity timestamp

### Messages & Chat
- `GET /api/messages` - Get public chat messages
- `POST /api/messages` - Send public chat message
- `POST /api/add-reaction` - Add reaction to message
- `GET /api/conversations` - Get user conversations list
- `GET /api/messages/{id}` - Get private messages with user
- `POST /api/private-messages` - Send private message

### Subscriptions & Social
- `GET /api/subscriptions` - Get user subscriptions
- `GET /api/subscribe/{id}` - Check subscription status
- `POST /api/subscribe/{id}` - Subscribe to user
- `DELETE /api/subscribe/{id}` - Unsubscribe from user

### Profile & Photos
- `GET /api/profile-photos` - Get user photos
- `POST /api/profile-photos` - Upload photo URL
- `PUT /api/profile-photos` - Set main photo
- `DELETE /api/profile-photos/{id}` - Delete photo

### Blacklist
- `GET /api/blacklist` - Get blocked users
- `POST /api/blacklist` - Block user
- `DELETE /api/blacklist/{id}` - Unblock user

### Admin
- `GET /api/admin/users` - List all users
- `POST /api/admin/users` - Admin actions (ban/unban/add energy)
- `GET /api/export-database` - Export database as SQL

### Payments & Energy
- `POST /api/payment/create` - Create YooKassa payment
- `POST /api/payment/webhook` - YooKassa webhook handler
- `POST /api/add-energy` - Add energy to user

### Files
- `GET /api/upload-url` - Generate S3 pre-signed upload URL

### Health Check
- `GET /health` - API health status

## Environment Variables

Required environment variables:

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:port/dbname

# SMS Service
SMSRU_API_KEY=your_sms_ru_api_key

# Payment Gateway
YOOKASSA_SHOP_ID=your_shop_id
YOOKASSA_SECRET_KEY=your_secret_key

# S3 Storage (Timeweb)
TIMEWEB_S3_ACCESS_KEY=your_access_key
TIMEWEB_S3_SECRET_KEY=your_secret_key
TIMEWEB_S3_BUCKET_NAME=your_bucket_name
TIMEWEB_S3_ENDPOINT=https://s3.twcstorage.ru
TIMEWEB_S3_REGION=ru-1

# Admin
ADMIN_SECRET=your_admin_secret

# Server
PORT=8000
```

## Local Development

### Run with Python directly:
```bash
cd backend
pip install -r requirements.txt
export DATABASE_URL="postgresql://..."
# ... set other env vars
python main.py
```

### Run with Docker:
```bash
cd backend
docker build -t auxchat-api .
docker run -p 8000:8000 \
  -e DATABASE_URL="postgresql://..." \
  -e SMSRU_API_KEY="..." \
  auxchat-api
```

## Deployment to Timeweb

### Option 1: Docker Deployment (Recommended)

1. Build the Docker image:
```bash
cd backend
docker build -t auxchat-api:latest .
```

2. Push to Timeweb container registry (or Docker Hub)

3. Deploy on Timeweb using their container service

4. Configure environment variables in Timeweb panel

5. Set up domain and SSL certificate

### Option 2: Direct Python Deployment

1. Upload all files to Timeweb server

2. Install Python 3.11 and dependencies:
```bash
pip install -r requirements.txt
```

3. Configure environment variables

4. Run with gunicorn:
```bash
gunicorn --bind 0.0.0.0:8000 --workers 4 main:app
```

5. Configure nginx as reverse proxy

## CORS Configuration

The API has CORS enabled for all origins (`*`). In production, you should restrict this to your frontend domain:

```python
CORS(app, origins=['https://auxchat.ru'])
```

## Database Schema

The application expects PostgreSQL database with schema: `t_p53416936_auxchat_energy_messa`

Tables:
- `users` - User accounts
- `messages` - Public chat messages
- `private_messages` - Private messages between users
- `message_reactions` - Reactions to messages
- `user_photos` - User profile photos
- `subscriptions` - User subscriptions
- `blacklist` - Blocked users
- `sms_codes` - SMS verification codes

## Performance

- Runs with 4 Gunicorn workers
- 2 threads per worker
- 120 second timeout for long-running requests
- Connection pooling for database

## Monitoring

Check API health:
```bash
curl https://your-domain.com/health
```

Expected response:
```json
{
  "status": "ok",
  "message": "API is running"
}
```

## Migration from Cloud Functions

This unified API replaces all individual cloud functions. Update your frontend to use the new base URL:

**Before:**
- `https://functions.yandex.net/function-id-1/`
- `https://functions.yandex.net/function-id-2/`

**After:**
- `https://api.auxchat.ru/api/login`
- `https://api.auxchat.ru/api/messages`

All request/response formats remain the same.
