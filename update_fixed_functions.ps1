$functions = @(
    "get-conversations",
    "private-messages",
    "subscribe",
    "get-subscriptions",
    "create-user",
    "reset-password",
    "update-activity",
    "profile-photos",
    "admin-users",
    "payment-webhook",
    "send-message",
    "get-messages",
    "verify-sms",
    "get-user",
    "login",
    "register"
)

$secrets = @(
    "--environment=DATABASE_URL='postgresql://gen_user:K=w7hxumpubT-F@f54d84cf7c4086988278b301.twc1.net:5432/default_db?sslmode=require'",
    "--environment=AWS_ACCESS_KEY_ID='UZ6JYHB7Q7QNPMBEDJ73'",
    "--environment=AWS_SECRET_ACCESS_KEY='K2rq1Oo0wY0jl04dM6wt-fzpQzgOY6D0ydKzJgJr'",
    "--environment=YOOKASSA_SHOP_ID='461084'",
    "--environment=YOOKASSA_SECRET='live_nL6Nl-LoUz4nDxME3jmOPZD7Y8s7HvyKgSj70lwq7Vs'",
    "--environment=SMS_LOGIN='stserrgo@mail.ru'",
    "--environment=SMS_PASSWORD='K6TmXwHMcEtNgJHp1KaA'",
    "--environment=AWS_ENDPOINT_URL='https://s3.timeweb.cloud'",
    "--environment=AWS_REGION='ru-1'",
    "--environment=S3_BUCKET='f2c17e24-auxchat-energy-messages'",
    "--environment=YANDEX_METRIKA_TOKEN='y0_AgAAAAB9sxGIAA73hwAAAAEcmrA6AABxc6dCjhzsBLNPsQvWTKU8SevVgQ'",
    "--environment=YANDEX_METRIKA_COUNTER_ID='101158355'",
    "--environment=ADMIN_SECRET='admin123'"
)

foreach ($func in $functions) {
    Write-Host "`n=== Обновляю функцию: $func ===" -ForegroundColor Cyan
    
    $command = "yc serverless function version create --function-name=$func --runtime=python311 --entrypoint=index.handler --memory=256m --execution-timeout=30s --source-path=`"backend\$func`" " + ($secrets -join " ")
    
    Write-Host "Выполняю команду..." -ForegroundColor Yellow
    Invoke-Expression $command
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Функция $func обновлена успешно" -ForegroundColor Green
    } else {
        Write-Host "❌ Ошибка обновления функции $func" -ForegroundColor Red
    }
}

Write-Host "`n🎉 Все функции обновлены!" -ForegroundColor Green
