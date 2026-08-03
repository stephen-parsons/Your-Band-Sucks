#!/bin/sh
set -eu

export DB_URL="$(
  node -e "process.stdout.write(require('./dist/databaseUrl.js').resolveDatabaseUrl())"
)"

echo "Running prisma generate..."
npx prisma generate

echo "Running prisma migrate deploy..."
npx prisma migrate deploy
echo "Migrations complete"
exec "$@"
