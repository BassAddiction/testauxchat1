# PowerShell скрипт для деплоя функций на Yandex Cloud

$FOLDER_ID = "b1gkp83nigr9dp5c9ucb"
$SA_ID = "ajeotruq9j7qeup7jn6g"

# Запросить секреты
Write-Host "=== Введи секреты проекта ===" -ForegroundColor Yellow
$DATABASE_URL = Read-Host "DATABASE_URL"
$TIMEWEB_S3_ACCESS_KEY = Read-Host "TIMEWEB_S3_ACCESS_KEY"
$TIMEWEB_S3_SECRET_KEY = Read-Host "TIMEWEB_S3_SECRET_KEY"
$TIMEWEB_S3_BUCKET_NAME = Read-Host "TIMEWEB_S3_BUCKET_NAME"
$TIMEWEB_S3_ENDPOINT = Read-Host "TIMEWEB_S3_ENDPOINT (Enter для https://s3.twcstorage.ru)"
if ([string]::IsNullOrEmpty($TIMEWEB_S3_ENDPOINT)) { $TIMEWEB_S3_ENDPOINT = "https://s3.twcstorage.ru" }
$TIMEWEB_S3_REGION = Read-Host "TIMEWEB_S3_REGION (Enter для ru-1)"
if ([string]::IsNullOrEmpty($TIMEWEB_S3_REGION)) { $TIMEWEB_S3_REGION = "ru-1" }
$SMSRU_API_KEY = Read-Host "SMSRU_API_KEY"
$YOOKASSA_SHOP_ID = Read-Host "YOOKASSA_SHOP_ID"
$YOOKASSA_SECRET_KEY = Read-Host "YOOKASSA_SECRET_KEY"
$ADMIN_SECRET = Read-Host "ADMIN_SECRET"

# Генерация JWT секрета
$JWT_SECRET = [Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
Write-Host "JWT_SECRET сгенерирован автоматически" -ForegroundColor Green

$urls = @{}
$deployed = 0
$failed = 0

Write-Host "`n=== Начинаю деплой функций ===`n" -ForegroundColor Green

Get-ChildItem -Path "backend" -Directory | ForEach-Object {
    $funcName = $_.Name
    
    # Пропустить служебные
    if ($funcName -eq "func2url.json" -or $funcName -eq "webapp") {
        return
    }
    
    Write-Host "[$funcName] Обработка..." -ForegroundColor Yellow
    
    $funcPath = $_.FullName
    
    # Определить runtime
    if (Test-Path "$funcPath\index.py") {
        $runtime = "python311"
        $entrypoint = "index.handler"
    } elseif (Test-Path "$funcPath\index.ts") {
        $runtime = "nodejs18"
        $entrypoint = "index.handler"
    } else {
        Write-Host "[$funcName] Пропущено - нет handler" -ForegroundColor Red
        return
    }
    
    # Создать функцию
    yc serverless function create --name $funcName --folder-id $FOLDER_ID 2>$null
    
    # Создать ZIP
    $zipPath = "$env:TEMP\$funcName.zip"
    Compress-Archive -Path "$funcPath\*" -DestinationPath $zipPath -Force
    
    # Деплой
    $result = yc serverless function version create `
        --function-name $funcName `
        --runtime $runtime `
        --entrypoint $entrypoint `
        --memory 256m `
        --execution-timeout 30s `
        --source-path $zipPath `
        --folder-id $FOLDER_ID `
        --service-account-id $SA_ID `
        --environment DATABASE_URL=$DATABASE_URL `
        --environment TIMEWEB_S3_ACCESS_KEY=$TIMEWEB_S3_ACCESS_KEY `
        --environment TIMEWEB_S3_SECRET_KEY=$TIMEWEB_S3_SECRET_KEY `
        --environment TIMEWEB_S3_BUCKET_NAME=$TIMEWEB_S3_BUCKET_NAME `
        --environment TIMEWEB_S3_ENDPOINT=$TIMEWEB_S3_ENDPOINT `
        --environment TIMEWEB_S3_REGION=$TIMEWEB_S3_REGION `
        --environment SMSRU_API_KEY=$SMSRU_API_KEY `
        --environment YOOKASSA_SHOP_ID=$YOOKASSA_SHOP_ID `
        --environment YOOKASSA_SECRET_KEY=$YOOKASSA_SECRET_KEY `
        --environment ADMIN_SECRET=$ADMIN_SECRET `
        --environment JWT_SECRET=$JWT_SECRET `
        2>&1
    
    if ($LASTEXITCODE -eq 0) {
        # Получить ID функции
        $funcInfo = yc serverless function get $funcName --folder-id $FOLDER_ID --format json | ConvertFrom-Json
        $funcId = $funcInfo.id
        
        # Публичный доступ
        yc serverless function allow-unauthenticated-invoke $funcName --folder-id $FOLDER_ID 2>$null
        
        $funcUrl = "https://functions.yandexcloud.net/$funcId"
        Write-Host "[$funcName] Успешно -> $funcUrl" -ForegroundColor Green
        
        $urls[$funcName] = $funcUrl
        $deployed++
    } else {
        Write-Host "[$funcName] Ошибка деплоя" -ForegroundColor Red
        $failed++
    }
    
    Remove-Item $zipPath -Force
}

# Сохранить func2url.json
$urls | ConvertTo-Json | Set-Content "backend\func2url.json" -Encoding UTF8

Write-Host "`n=== Результат ===" -ForegroundColor Green
Write-Host "Успешно: $deployed" -ForegroundColor Green
Write-Host "Ошибок: $failed" -ForegroundColor Red

Write-Host "`nfunc2url.json обновлен!" -ForegroundColor Green
Write-Host "Теперь:" -ForegroundColor Yellow
Write-Host "  1. git add backend\func2url.json"
Write-Host "  2. git commit -m 'Migrate to Yandex Cloud'"
Write-Host "  3. git push"
Write-Host "  4. Опубликуй фронтенд на poehali.dev"
