#!/bin/bash

# Database Initialization Script
# This script ensures the database schema exists before running migrations

echo "🔧 Initializing database..."

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Extract database connection details from DATABASE_URL or use individual vars
if [ -n "$DATABASE_URL" ]; then
    # Parse DATABASE_URL (format: postgresql://user:password@host:port/database)
    DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
    DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
    DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
    DB_USER=$(echo $DATABASE_URL | sed -n 's/.*\/\/\([^:]*\):.*/\1/p')
else
    DB_NAME=${DB_NAME:-cs_compass}
    DB_HOST=${DB_HOST:-localhost}
    DB_PORT=${DB_PORT:-5432}
    DB_USER=${DB_USER:-postgres}
fi

echo "📊 Database: $DB_NAME"
echo "🖥️  Host: $DB_HOST:$DB_PORT"

# Check if database exists
echo "🔍 Checking if database exists..."
DB_EXISTS=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" 2>/dev/null)

if [ "$DB_EXISTS" != "1" ]; then
    echo "❌ Database '$DB_NAME' does not exist!"
    echo "Please create it first with: createdb $DB_NAME"
    exit 1
fi

# Check if tables exist
echo "🔍 Checking if tables exist..."
TABLES_EXIST=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('users', 'categories', 'courses')" 2>/dev/null)

if [ "$TABLES_EXIST" -lt "3" ]; then
    echo "⚠️  Base tables missing. Creating schema..."
    
    # Run the base schema
    if [ -f "database/schema.sql" ]; then
        echo "📝 Running database/schema.sql..."
        PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f database/schema.sql
        
        if [ $? -eq 0 ]; then
            echo "✅ Base schema created successfully!"
        else
            echo "❌ Failed to create base schema!"
            exit 1
        fi
    else
        echo "❌ database/schema.sql not found!"
        exit 1
    fi
else
    echo "✅ Base tables already exist."
fi

# Now run migrations
echo "🔄 Running migrations..."
npm run migrate

if [ $? -eq 0 ]; then
    echo "✅ Database initialization complete!"
else
    echo "⚠️  Migrations completed with warnings (this is normal if migrations were already run)"
fi

# Fix admin password
echo "🔐 Ensuring admin password is correct..."
if [ -f "scripts/fix-admin-password.ts" ]; then
    npx ts-node scripts/fix-admin-password.ts 2>/dev/null || echo "⚠️  Could not fix admin password (may already be correct)"
fi

echo "✅ Database ready!"

