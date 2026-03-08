#!/bin/sh
set -e

echo "==> Applying database migrations..."
npx prisma migrate deploy
echo "==> Migrations applied."

if [ "$SEED_DATABASE" = "true" ] && [ ! -f /app/.data/.seeded ]; then
  mkdir -p /app/.data
  echo "==> Seeding database with sample events..."
  npx tsx prisma/seed.ts
  touch /app/.data/.seeded
  echo "==> Database seeded."
else
  echo "==> Skipping database seed."
fi

echo "==> Starting server..."
exec npx tsx src/server.ts
