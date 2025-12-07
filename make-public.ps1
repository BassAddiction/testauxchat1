# Make all Yandex Cloud functions public

$FOLDER_ID = "b1gjs392ibop1gc5stqn"

Write-Host "Making all functions public..." -ForegroundColor Green

$functions = @(
    "add-energy", "generate-upload-url", "create-payment", "payment-webhook",
    "get-messages", "login", "get-subscriptions", "get-conversations",
    "create-user", "verify-sms", "reset-password", "add-reaction",
    "profile-photos", "blacklist", "send-sms", "send-message",
    "register", "subscribe", "private-messages", "update-activity",
    "admin-users", "get-user"
)

foreach ($func in $functions) {
    Write-Host "[$func] Setting public access..." -ForegroundColor Yellow
    yc serverless function allow-unauthenticated-invoke $func --folder-id $FOLDER_ID 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[$func] OK" -ForegroundColor Green
    } else {
        Write-Host "[$func] Failed" -ForegroundColor Red
    }
}

Write-Host "`nDone! All functions are now public." -ForegroundColor Green
