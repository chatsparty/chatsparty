#!/bin/bash
# Convenience script for cloud database management
# This script uses the .env.cloud configuration

set -e

echo "🌐 Managing Cloud Database (.env.cloud)"
echo "======================================"

case "$1" in
    "migrate")
        echo "Running cloud database migrations..."
        python manage_db.py migrate --env=.env.cloud
        ;;
    "create-migration")
        echo "Creating new migration for cloud database..."
        python manage_db.py create-migration --env=.env.cloud
        ;;
    "reset")
        echo "⚠️  WARNING: This will reset the PRODUCTION cloud database!"
        echo "Are you absolutely sure you want to continue? (type 'RESET_CLOUD_DB' to confirm)"
        read -r confirmation
        if [ "$confirmation" = "RESET_CLOUD_DB" ]; then
            python manage_db.py reset --env=.env.cloud
        else
            echo "Cloud database reset cancelled."
        fi
        ;;
    "init")
        echo "Initializing cloud database..."
        python manage_db.py init --env=.env.cloud
        ;;
    "status")
        echo "Checking cloud database status..."
        python -c "
from dotenv import load_dotenv
import os
load_dotenv('.env.cloud')
print(f'Database Host: {os.getenv(\"POSTGRES_HOST\")}')
print(f'Database Name: {os.getenv(\"POSTGRES_DB\")}')
print(f'Database User: {os.getenv(\"POSTGRES_USER\")}')
print(f'Frontend URL: {os.getenv(\"FRONTEND_URL\")}')
print(f'Social Auth Only: {os.getenv(\"SOCIAL_AUTH_ONLY\")}')
"
        ;;
    *)
        echo "Usage: $0 {migrate|create-migration|reset|init|status}"
        echo ""
        echo "Commands:"
        echo "  migrate           - Run pending migrations on cloud database"
        echo "  create-migration  - Create a new migration for cloud database"
        echo "  reset            - Reset cloud database (DESTRUCTIVE - requires confirmation)"
        echo "  init             - Initialize fresh cloud database"
        echo "  status           - Show cloud database configuration"
        echo ""
        echo "This script uses the .env.cloud configuration file."
        exit 1
        ;;
esac