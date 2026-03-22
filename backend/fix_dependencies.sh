#!/bin/bash

# Dependency and Environment Diagnostic Script

echo "🔍 Starting Clinic Management System Dependency Diagnostic"

# Check Node.js and npm versions
echo "📋 Current Environment:"
node --version
npm --version

# Clear npm cache
echo "🧹 Clearing npm cache..."
npm cache clean --force

# Remove existing node modules and lock file
echo "🗑️ Removing existing dependencies..."
rm -rf node_modules
rm -f package-lock.json

# Install dependencies with verbose logging
echo "📦 Reinstalling dependencies..."
npm install --verbose

# Check installation status
if [ $? -eq 0 ]; then
  echo "✅ Dependencies installed successfully!"
else
  echo "❌ Dependency installation failed. Attempting alternative method..."
  npm install --legacy-peer-deps
fi

# List installed packages
echo "📝 Installed packages:"
npm list --depth=1

echo "🚀 Dependency diagnostic complete!" 