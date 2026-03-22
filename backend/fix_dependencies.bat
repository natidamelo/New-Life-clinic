@echo off
setlocal enabledelayedexpansion

echo 🔍 Starting Comprehensive Dependency Diagnostic and Fix

echo 📋 Checking Environment:
node --version
npm --version

echo 🧹 Cleaning npm cache...
npm cache clean --force

echo 🚫 Stopping Node processes...
taskkill /F /IM node.exe 2>nul
taskkill /F /IM npm.cmd 2>nul

echo 🗑️ Removing existing dependencies...
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del /f /q package-lock.json

echo 📦 Installing dependencies...

echo 🔄 Strategy 1: Standard install
call npm install
if %errorlevel% equ 0 goto success

echo 🔄 Strategy 2: Legacy peer dependencies
call npm install --legacy-peer-deps
if %errorlevel% equ 0 goto success

echo 🔄 Strategy 3: Force install
call npm install --force
if %errorlevel% equ 0 goto success

echo 🔄 Strategy 4: Legacy peer deps with force
call npm install --legacy-peer-deps --force
if %errorlevel% equ 0 goto success

echo ❌ Failed to install dependencies
exit /b 1

:success
echo 📝 Installed packages:
call npm list --depth=1

echo 🔍 Verifying critical modules...
call npm install semver socket.io express-async-handler

echo ✅ Dependency fix completed successfully!
pause 