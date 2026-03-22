@echo off
echo ========================================
echo 🔧 Clinic CMS Port Standardization
echo ========================================
echo.

echo 📋 Target Configuration:
echo    - Backend: Port 5002
echo    - Frontend: Port 5175
echo.

echo 🛑 Stopping existing processes...
taskkill /f /im node.exe >nul 2>&1
timeout /t 2 >nul

echo.
echo 🔧 Running port standardization script...
node fix-ports.js

echo.
echo 🚀 Starting Backend Server (Port 5002)...
start "Backend Server" cmd /k "cd backend && npm start"

echo.
echo ⏳ Waiting for backend to start...
timeout /t 5 >nul

echo.
echo 🚀 Starting Frontend Server (Port 5175)...
start "Frontend Server" cmd /k "cd frontend && npm run dev"

echo.
echo ✅ Servers are starting...
echo.
echo 📱 Access URLs:
echo    - Frontend: http://192.168.78.157:5175
echo    - Backend:  http://192.168.78.157:5002
echo.
echo 🔍 QR Code URLs will be:
echo    - http://192.168.78.157:5175/verify-qr
echo.
echo ⏰ Please wait for both servers to fully start...
echo.
pause
