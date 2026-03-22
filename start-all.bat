@echo off
echo =========================================
echo Starting Clinic CMS Development Environment
echo =========================================

echo.
echo Checking if MongoDB is running...
tasklist /fi "imagename eq mongod.exe" | find /i "mongod.exe" >nul
if %errorlevel% == 0 (
    echo [✓] MongoDB is already running
) else (
    echo [!] Starting MongoDB...
    start "MongoDB" cmd /k "mongod --dbpath ./data/db --port 27017"
    timeout /t 3 >nul
    echo [✓] MongoDB started
)

echo.
echo [!] Starting Backend Server (Port 5002)...
start "Backend Server" cmd /k "cd backend && npm start"

echo.
echo [!] Waiting for backend to initialize...
timeout /t 5 >nul

echo.
echo [!] Starting Frontend Development Server (Port 5173)...
start "Frontend Server" cmd /k "cd frontend && npm run dev"

echo.
echo =========================================
echo All services are starting up!
echo =========================================
echo.
echo Access the application at:
echo Frontend: http://localhost:5175
echo Backend API: http://localhost:5002
echo.
echo Network Access: Will auto-detect your current IP
echo Just use the IP shown in the terminal output above
echo.
echo Press any key to close this window...
pause >nul 