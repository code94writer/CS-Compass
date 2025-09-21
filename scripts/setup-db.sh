#!/bin/bash

# CS Compass Database Setup Script

echo "🚀 Setting up CS Compass Database..."


# Database configuration
DB_NAME="cs_compass"
DB_USER="postgres"

# Create database if it doesn't exist
echo "📦 Creating database '$DB_NAME'..."
createdb $DB_NAME 2>/dev/null || echo "Database '$DB_NAME' already exists or creation failed."

# Run schema
echo "📋 Running database schema..."
psql -d $DB_NAME -f database/schema.sql

if [ $? -eq 0 ]; then
    echo "✅ Database setup completed successfully!"
    echo "📊 Database: $DB_NAME"
    echo "👤 Default admin user: admin@cscompass.com"
    echo "🔑 Default admin password: admin123"
    echo ""
    echo "⚠️  Please change the default admin password after first login!"
else
    echo "❌ Database setup failed!"
    exit 1
fi

# ✅ Database setup completed successfully!
# 📊 Database: cs_compass
# 👤 Default admin user: admin@cscompass.com
# 🔑 Default admin password: admin123

# ⚠️  Please change the default admin password after first login!
