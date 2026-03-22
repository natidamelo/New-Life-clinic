@echo off
echo ========================================
echo    QR Code IP Fix - Corrected Version
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
echo 2. Setting correct FRONTEND_IP environment variable...
echo    Frontend detected at: 10.41.144.157:5175
echo    Setting FRONTEND_IP=10.41.144.157
set FRONTEND_IP=10.41.144.157
echo    ✅ Set FRONTEND_IP=10.41.144.157

echo.
echo 3. Starting backend server with correct IP...
echo    🌐 QR codes will now use: http://10.41.144.157:5175
echo    📱 Mobile devices can now access the correct URL
echo.

echo Starting backend server...
npm start
