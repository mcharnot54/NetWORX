#!/bin/bash

echo "🔧 Quick deployment fix and rebuild..."

# Clean everything aggressively
docker-compose -f docker-compose.production.yml down --remove-orphans
docker system prune -a -f
docker builder prune -a -f

# Remove Next.js cache
rm -rf .next
rm -rf node_modules/.cache
rm -rf /tmp/.next*

# Clear pnpm cache
pnpm store prune

echo "✅ Cache cleared. Starting fresh build..."

# Rebuild with no cache
docker-compose -f docker-compose.production.yml build --no-cache

echo "🚀 Starting services..."
docker-compose -f docker-compose.production.yml up -d

echo "📊 Checking status..."
sleep 10
docker-compose -f docker-compose.production.yml ps
