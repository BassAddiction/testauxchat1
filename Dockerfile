FROM node:18

WORKDIR /app

# Копируем всё
COPY . .

# Устанавливаем зависимости
RUN npm install -g bun && bun install

# Билдим
RUN bun run build

# Устанавливаем простой HTTP сервер
RUN npm install -g serve

EXPOSE 3000

CMD ["serve", "-s", "dist", "-l", "3000"]