#!/bin/bash

# Baloot Game Deployment Script

echo "🃏 Deploying Baloot Game..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 14+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 14 ]; then
    echo "❌ Node.js version 14+ required. Current: $(node -v)"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Run tests
echo "🧪 Running tests..."
npm test

if [ $? -ne 0 ]; then
    echo "❌ Tests failed. Deployment aborted."
    exit 1
fi

# Start server
echo "🚀 Starting server..."
echo "Game will be available at: http://localhost:8080"
echo "Press Ctrl+C to stop"

npm start