@echo off
echo ====================================
echo   Clinic Management System Startup
echo ====================================

echo.
echo Step 1: Killing existing Node.js processes...
taskkill /IM node.exe /F 2>nul
if %errorlevel% equ 0 (
    echo ✅ Existing Node.js processes terminated
) else (
    echo ℹ️  No existing Node.js processes found
)

echo.
echo Step 2: Starting Backend Server...
start "Backend Server" cmd /k "cd backend && echo Starting backend on port 5002... && node server.js"

echo.
echo Step 3: Waiting for backend to initialize...
timeout /t 3 /nobreak >nul

echo.
echo Step 4: Starting Frontend Server...
start "Frontend Server" cmd /k "cd frontend && echo Starting frontend on port 5175... && npm run dev"

echo.
echo ====================================
echo  🚀 Both servers are starting up!
echo ====================================
echo.
echo Backend:  http://localhost:5002
echo Frontend: http://localhost:5175
echo.
echo Press any key to close this window...
pause >nul 