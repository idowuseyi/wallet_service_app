# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist

# Create a script to run migrations and start the app
COPY <<EOF /app/start.sh
#!/bin/sh
echo "Running database migrations..."
npm run migration:run || echo "Migrations failed or no migrations to run"
echo "Starting application..."
exec node dist/main
EOF

RUN chmod +x /app/start.sh

EXPOSE 6070

CMD ["/app/start.sh"]
