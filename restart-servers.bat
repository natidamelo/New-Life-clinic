@echo off
echo 🔄 Restarting clinic servers...

echo.
echo 🛑 Stopping existing processes...

REM Kill any existing Node.js processes on our ports
FOR /f "tokens=5" %%a in ('netstat -ano ^| findstr :5002') do (
    echo Terminating process %%a on port 5002
    taskkill /F /PID %%a 2>nul
)

FOR /f "tokens=5" %%a in ('netstat -ano ^| findstr :5175') do (
    echo Terminating process %%a on port 5175
    taskkill /F /PID %%a 2>nul
)

echo.
echo ⏳ Waiting for ports to be free...
timeout /t 3 /nobreak >nul

echo.
echo 🚀 Starting backend server...
cd /d "%~dp0backend"
start "Backend Server" cmd /k "echo Backend starting on port 5002... && node server.js"

echo.
echo ⏳ Waiting for backend to initialize...
timeout /t 5 /nobreak >nul

echo.
echo 🎨 Starting frontend server...
cd /d "%~dp0frontend"
start "Frontend Server" cmd /k "echo Frontend starting on port 5175... && npm run dev"

echo.
echo ✅ Servers are starting...
echo 📍 Backend: http://localhost:5002
echo 📍 Frontend: http://localhost:5175
echo.
echo Press any key to test connectivity...
pause >nul

echo.
echo 🧪 Testing connectivity...
cd /d "%~dp0"
node test-connectivity.js

echo.
echo ✨ Server restart complete!
pause 