# Миграция функций на свой Яндекс.Cloud

## Что нужно:
1. Аккаунт на [cloud.yandex.ru](https://cloud.yandex.ru)
2. Установить [Yandex Cloud CLI](https://cloud.yandex.ru/docs/cli/quickstart)
3. Создать сервисный аккаунт с ролью `serverless.functions.invoker`

## Шаг 1: Установка YC CLI

```bash
# Linux/macOS
curl -sSL https://storage.yandexcloud.net/yandexcloud-yc/install.sh | bash

# Windows (PowerShell)
iex (New-Object System.Net.WebClient).DownloadString('https://storage.yandexcloud.net/yandexcloud-yc/install.ps1')
```

После установки:
```bash
yc init
```

## Шаг 2: Создание ресурсов

```bash
# Создать каталог (folder) для проекта
yc resource-manager folder create --name auxchat

# Получить ID каталога
yc resource-manager folder list

# Создать сервисный аккаунт
yc iam service-account create --name auxchat-sa --folder-id <FOLDER_ID>

# Получить ID сервисного аккаунта
yc iam service-account list

# Дать права на выполнение функций
yc resource-manager folder add-access-binding <FOLDER_ID> \
  --role serverless.functions.invoker \
  --subject serviceAccount:<SA_ID>
```

## Шаг 3: Деплой функций

Скрипт для автоматического деплоя всех функций:

```bash
#!/bin/bash

FOLDER_ID="<твой-folder-id>"
SA_ID="<твой-service-account-id>"

# Получить список всех функций
for dir in backend/*/; do
  FUNC_NAME=$(basename "$dir")
  
  # Пропустить служебные файлы
  if [ "$FUNC_NAME" = "func2url.json" ]; then
    continue
  fi
  
  echo "Deploying $FUNC_NAME..."
  
  # Определить runtime (Python или TypeScript)
  if [ -f "$dir/index.py" ]; then
    RUNTIME="python311"
    ENTRYPOINT="index.handler"
  elif [ -f "$dir/index.ts" ]; then
    RUNTIME="nodejs18"
    ENTRYPOINT="index.handler"
  else
    echo "Skipping $FUNC_NAME - no handler found"
    continue
  fi
  
  # Создать функцию
  yc serverless function create \
    --name "$FUNC_NAME" \
    --folder-id "$FOLDER_ID"
  
  # Деплой версии
  yc serverless function version create \
    --function-name "$FUNC_NAME" \
    --runtime "$RUNTIME" \
    --entrypoint "$ENTRYPOINT" \
    --memory 256m \
    --execution-timeout 10s \
    --source-path "$dir" \
    --environment DATABASE_URL="$DATABASE_URL" \
    --environment TIMEWEB_S3_ACCESS_KEY="$TIMEWEB_S3_ACCESS_KEY" \
    --environment TIMEWEB_S3_SECRET_KEY="$TIMEWEB_S3_SECRET_KEY" \
    --environment TIMEWEB_S3_BUCKET_NAME="$TIMEWEB_S3_BUCKET_NAME" \
    --environment JWT_SECRET="$JWT_SECRET" \
    --service-account-id "$SA_ID"
  
  # Получить URL функции
  FUNC_ID=$(yc serverless function get "$FUNC_NAME" --format json | jq -r '.id')
  echo "Function $FUNC_NAME deployed: https://functions.yandexcloud.net/$FUNC_ID"
done
```

## Шаг 4: Получить URL всех функций

```bash
#!/bin/bash

echo "{" > backend/func2url.json

for dir in backend/*/; do
  FUNC_NAME=$(basename "$dir")
  
  if [ "$FUNC_NAME" = "func2url.json" ]; then
    continue
  fi
  
  FUNC_ID=$(yc serverless function get "$FUNC_NAME" --format json 2>/dev/null | jq -r '.id')
  
  if [ ! -z "$FUNC_ID" ] && [ "$FUNC_ID" != "null" ]; then
    echo "  \"$FUNC_NAME\": \"https://functions.yandexcloud.net/$FUNC_ID\"," >> backend/func2url.json
  fi
done

# Убрать последнюю запятую
sed -i '$ s/,$//' backend/func2url.json
echo "}" >> backend/func2url.json
```

## Шаг 5: Настроить переменные окружения

Все секреты из poehali.dev нужно перенести в переменные окружения функций:

```bash
# Получить список секретов из poehali.dev
# (они показаны в UI проекта)

# Установить для каждой функции
yc serverless function version create \
  --function-name "function-name" \
  --runtime python311 \
  --entrypoint index.handler \
  --memory 256m \
  --execution-timeout 10s \
  --source-path backend/function-name/ \
  --environment DATABASE_URL="postgresql://..." \
  --environment TIMEWEB_S3_ACCESS_KEY="..." \
  --environment TIMEWEB_S3_SECRET_KEY="..." \
  --environment JWT_SECRET="..." \
  --service-account-id "$SA_ID"
```

## Стоимость

Яндекс.Cloud дает:
- **2 млн вызовов/месяц** бесплатно
- **10 ГБ-часов RAM** бесплатно
- Дальше: ~1₽ за 1 млн вызовов

## Плюсы миграции:
✅ Не мотаешь счетчик poehali.dev  
✅ Полный контроль над функциями  
✅ Больше лимитов (до 5 минут выполнения)  
✅ Можно подключить API Gateway для кастомных доменов  

## Минусы:
❌ Нужно вручную управлять переменными окружения  
❌ Нужно следить за квотами и оплатой  
❌ Нет автоматического деплоя из poehali.dev  

## После миграции:

1. Обнови `backend/func2url.json` с новыми URL
2. Сделай коммит и пуш в GitHub
3. Опубликуй фронтенд на poehali.dev (он подхватит новые URL)

---

**Важно**: Все функции используют простой протокол PostgreSQL. Убедись, что DATABASE_URL указывает на БД с поддержкой Simple Query Protocol.
