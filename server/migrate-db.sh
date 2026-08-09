#!/bin/bash

# Update these values before migrating.
# --- CONFIGURATION ---
LOCAL_DB_NAME=
TARGET_DB_NAME=
HOMEBREW_PORT=
DOCKER_PORT=
LOCAL_POSTGRES_USER=
TARGET_POSTGRES_USER=
BACKUP_FILE="homebrew_dump.sql"   # Temporary dump file location

echo "🚀 Starting migration from Homebrew Postgres ($HOMEBREW_PORT) to Docker Postgres ($DOCKER_PORT)..."

# 1. Take a logical backup from your running Homebrew cluster
echo "📦 Exporting data from local Homebrew database..."
pg_dump -h localhost -p $HOMEBREW_PORT -U $LOCAL_POSTGRES_USER -d $LOCAL_DB_NAME -F c -b -v -f "$BACKUP_FILE"

if [ $? -ne 0 ]; then
    echo "❌ Error: Failed to dump data from Homebrew Postgres. Is it running?"
    exit 1
fi
echo "✅ Backup successfully saved to $BACKUP_FILE"

# 2. Boot down the container if it was accidentally running already to clear state
echo "🔄 Preparing Docker environment..."
docker compose down -v  # The -v ensures anonymous or dirty volumes are wiped clean

# 3. Boot up the fresh Postgres container
echo "🐳 Launching Docker container..."
docker compose up -d postgres-db

# 4. Wait for the Docker database engine to finish initialization scripts
echo "⏳ Waiting for Docker Postgres to become active and ready..."
until docker compose exec -T postgres-db pg_isready -U $TARGET_POSTGRES_USER -d $TARGET_DB_NAME >/dev/null 2>&1; do
    printf "."
    sleep 1
done
echo -e "\n✅ Docker Postgres is healthy and ready!"

echo "🛌 Sleeping for 5 seconds to let the engine settle..."
sleep 5  # <--- ADD THIS LINE HERE

# 5. Restore the SQL custom dump directly over the network bridge into Docker
echo "📥 Restoring schema and data into Docker container..."
pg_restore -h localhost -p $DOCKER_PORT -U $TARGET_POSTGRES_USER -d $TARGET_DB_NAME -v "$BACKUP_FILE"

if [ $? -ne 0 ]; then
    echo "⚠️ Notice: Restore completed with some warnings/errors. Check logs above."
else
    echo "🎉 Success! Data completely migrated to Docker."
fi

# 6. Clean up host dump file
echo "🧹 Cleaning up local workspace..."
rm "$BACKUP_FILE"

echo "ℹ️ Your Docker database is live at localhost:$DOCKER_PORT"
