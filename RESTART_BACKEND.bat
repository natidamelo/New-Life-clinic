@echo off
echo Stopping all Node processes...
taskkill /F /IM node.exe 2>nul

echo.
echo Waiting 2 seconds...
timeout /t 2 /nobreak >nul

echo.
echo Starting Backend Server...
cd /d "%~dp0backend"
start "Clinic Backend Server - Port 5002" cmd /k "npm start"

echo.
echo Backend server starting on port 5002
echo Watch the new window for logs!
echo.
pause

