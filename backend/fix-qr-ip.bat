@echo off
echo ========================================
echo    QR Code IP Fix Script
echo ========================================
echo.

echo 1. Stopping all Node.js processes...
taskkill /f /im node.exe 2>nul
if %errorlevel% equ 0 (
    echo    ✅ Stopped Node.js processes
) else (
    echo    ℹ️  No Node.js processes found or already stopped
)

echo.
echo 2. Setting FRONTEND_IP environment variable...
set FRONTEND_IP=169.254.50.151
echo    ✅ Set FRONTEND_IP=169.254.50.151

echo.
echo 3. Starting backend server with correct IP...
echo    🌐 Server will use: http://169.254.50.151:5175
echo    📱 QR codes will work with your phone
echo.

npm start
