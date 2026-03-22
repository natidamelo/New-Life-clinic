@echo off
echo ========================================
echo    CLINIC MANAGEMENT SYSTEM
echo ========================================
echo.
echo Starting backend server on port 5002...
echo.

cd backend
echo [BACKEND] Installing dependencies...
call npm install

echo [BACKEND] Starting server on port 5002...
start "Backend Server" cmd /k "node server.js"

echo.
echo Backend server started!
echo.
echo ========================================
echo    SERVER STATUS
echo ========================================
echo Backend: http://localhost:5002
echo Health Check: http://localhost:5002/ping
echo.
echo Press any key to continue...
pause > nul 