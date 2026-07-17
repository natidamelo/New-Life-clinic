#!/bin/bash

# ==============================================================================
# 🗄️ Clinical Management System - Automated MongoDB Backup Script
# ==============================================================================
# Description: This script extracts a full database dump, compresses it, and
#              prunes local backups older than 7 days.
#
# Setup Instructions (Linux CRON job):
# 1. Make this script executable:
#    chmod +x scripts/backup-db.sh
#
# 2. Open the crontab editor:
#    crontab -e
#
# 3. Add the following line to run backups daily at 2:00 AM:
#    0 2 * * * /path/to/your/project/scripts/backup-db.sh >> /path/to/your/project/logs/backup.log 2>&1
# ==============================================================================

# Set working directory to project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT" || exit 1

# Load environment variables
ENV_FILE=".env"
if [ ! -f "$ENV_FILE" ]; then
    echo "$(date '+%Y-%m-%d %H:%M:%S') - ❌ ERROR: .env file not found at $PROJECT_ROOT/$ENV_FILE"
    exit 1
fi

# Extract MONGO_URI from .env
MONGO_URI=$(grep -E "^MONGODB_URI=" "$ENV_FILE" | cut -d'=' -f2- | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')
if [ -z "$MONGO_URI" ]; then
    MONGO_URI=$(grep -E "^MONGO_URI=" "$ENV_FILE" | cut -d'=' -f2- | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')
fi

if [ -z "$MONGO_URI" ]; then
    echo "$(date '+%Y-%m-%d %H:%M:%S') - ❌ ERROR: MONGO_URI or MONGODB_URI is not defined in .env"
    exit 1
fi

# Define backup paths
BACKUP_DIR="backups"
TIMESTAMP=$(date '+%Y-%m-%d_%H%M%S')
TEMP_DUMP_DIR="$BACKUP_DIR/temp_$TIMESTAMP"
BACKUP_FILE="$BACKUP_DIR/db_backup_$TIMESTAMP.tar.gz"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "$(date '+%Y-%m-%d %H:%M:%S') - 🔄 Starting database backup..."

# 1. Execute mongodump
# Note: mongodump must be installed on your VPS (apt install mongo-tools)
if ! command -v mongodump &> /dev/null; then
    echo "$(date '+%Y-%m-%d %H:%M:%S') - ❌ ERROR: mongodump command is not installed on this server."
    echo "To install: sudo apt update && sudo apt install -y mongo-tools"
    exit 1
fi

# Run database dump
mongodump --uri="$MONGO_URI" --out="$TEMP_DUMP_DIR" > /dev/null 2>&1
DUMP_STATUS=$?

if [ $DUMP_STATUS -ne 0 ]; then
    echo "$(date '+%Y-%m-%d %H:%M:%S') - ❌ ERROR: mongodump failed."
    rm -rf "$TEMP_DUMP_DIR"
    exit 1
fi

# 2. Compress the dump directory
tar -czf "$BACKUP_FILE" -C "$TEMP_DUMP_DIR" .
TAR_STATUS=$?

# Cleanup temp dump folder
rm -rf "$TEMP_DUMP_DIR"

if [ $TAR_STATUS -ne 0 ]; then
    echo "$(date '+%Y-%m-%d %H:%M:%S') - ❌ ERROR: Compression failed."
    exit 1
fi

echo "$(date '+%Y-%m-%d %H:%M:%S') - ✅ Database backup created successfully at: $BACKUP_FILE"

# 3. Clean up backups older than 7 days
echo "$(date '+%Y-%m-%d %H:%M:%S') - 🧹 Pruning local backups older than 7 days..."
find "$BACKUP_DIR" -name "db_backup_*.tar.gz" -type f -mtime +7 -delete

echo "$(date '+%Y-%m-%d %H:%M:%S') - ✅ Backup process complete!"
exit 0
