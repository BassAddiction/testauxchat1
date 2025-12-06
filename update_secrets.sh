#!/bin/bash

# Секреты для всех функций
DATABASE_URL="postgresql://gen_user:K=w7hxumpubT-F@f54d84cf7c4086988278b301.twc1.net:5432/default_db?sslmode=require"
TIMEWEB_S3_ACCESS_KEY="SCNT881ZF0O4YGRJIR5S"
TIMEWEB_S3_SECRET_KEY="ufDaLrE5DyCLqD8nM4825pJrofQx0fu3pVOC12EU"
TIMEWEB_S3_BUCKET_NAME="271e14e8-dfb0140-f925-43fc-9e59-9c13eb081128"
TIMEWEB_S3_ENDPOINT="https://s3.twcstorage.ru"
TIMEWEB_S3_REGION="ru-1"
SMSRU_API_KEY="4FBA9B3D-C085-062E-D00C-0B734F1A51CA"
YOOKASSA_SHOP_ID="1173503"
YOOKASSA_SECRET_KEY="test_pSRroubtlIABfY4JiT6D-XYR09on5Nh6KPk-dRSJbak"
ADMIN_SECRET="o7OJN16x2uDyokGwVJ"
JWT_SECRET="uH9x3mK7pL2wN5qR8tY4vZ6aB1cD0eF3gH"
IMGBB_API_KEY="13b647d5f8a32c81c91c78bf7a121b33"

# Список всех функций
FUNCTIONS=(
  "add-energy"
  "add-reaction"
  "admin-users"
  "blacklist"
  "create-payment"
  "create-user"
  "generate-upload-url"
  "get-conversations"
  "get-messages"
  "get-subscriptions"
  "get-user"
  "login"
  "payment-webhook"
  "private-messages"
  "profile-photos"
  "register"
  "reset-password"
  "send-message"
  "send-sms"
  "subscribe"
  "update-activity"
  "verify-sms"
)

echo "Обновление секретов для ${#FUNCTIONS[@]} функций..."

for func in "${FUNCTIONS[@]}"; do
  echo "Обновляю функцию: $func"
  
  yc serverless function version create \
    --function-name="$func" \
    --runtime=python311 \
    --entrypoint=index.handler \
    --memory=256m \
    --execution-timeout=30s \
    --source-path="backend/$func" \
    --environment DATABASE_URL="$DATABASE_URL" \
    --environment TIMEWEB_S3_ACCESS_KEY="$TIMEWEB_S3_ACCESS_KEY" \
    --environment TIMEWEB_S3_SECRET_KEY="$TIMEWEB_S3_SECRET_KEY" \
    --environment TIMEWEB_S3_BUCKET_NAME="$TIMEWEB_S3_BUCKET_NAME" \
    --environment TIMEWEB_S3_ENDPOINT="$TIMEWEB_S3_ENDPOINT" \
    --environment TIMEWEB_S3_REGION="$TIMEWEB_S3_REGION" \
    --environment SMSRU_API_KEY="$SMSRU_API_KEY" \
    --environment YOOKASSA_SHOP_ID="$YOOKASSA_SHOP_ID" \
    --environment YOOKASSA_SECRET_KEY="$YOOKASSA_SECRET_KEY" \
    --environment ADMIN_SECRET="$ADMIN_SECRET" \
    --environment JWT_SECRET="$JWT_SECRET" \
    --environment IMGBB_API_KEY="$IMGBB_API_KEY"
  
  if [ $? -eq 0 ]; then
    echo "✅ $func обновлена"
  else
    echo "❌ Ошибка при обновлении $func"
  fi
  echo "---"
done

echo "Готово!"
