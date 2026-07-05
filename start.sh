#!/bin/sh
echo "[start.sh] Running database migrations..."
npx prisma migrate deploy 2>&1 || echo "[start.sh] Migration failed, continuing anyway..."

echo "[start.sh] Preparing standalone static files..."
cp -r public .next/standalone/public
cp -r .next/static .next/standalone/.next/static

echo "[start.sh] Starting application..."
cd .next/standalone && exec node server.js
