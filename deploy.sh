#!/bin/bash

echo "🚀 Deploying HomeLab Project..."

# Create data directory if it doesn't exist
mkdir -p data

# Build and start the application
echo "📦 Building Docker image..."
docker-compose build

echo "🔄 Starting services..."
docker-compose up -d

echo "⏳ Waiting for application to start..."
sleep 10

echo "🔍 Checking application health..."
curl -f http://localhost:3000/api/health || echo "❌ Health check failed"

echo "✅ Deployment complete!"
echo "🌐 Application is available at: http://localhost:3000"
echo ""
echo "📋 Login credentials:"
echo "   Admin: admin / admin123"
echo "   User:  dule / password123"
echo ""
echo "📊 To view logs: docker-compose logs -f"
echo "🛑 To stop: docker-compose down"
