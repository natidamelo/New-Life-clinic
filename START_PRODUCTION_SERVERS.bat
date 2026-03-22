@echo off
setlocal enabledelayedexpansion

REM Get network IP address dynamically
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address"') do (
    set IP=%%a
    set IP=!IP:~1!
    goto :found_ip
)
:found_ip

if "%IP%"=="" (
    set IP=localhost
)

echo ========================================
echo Starting Clinic Management System
echo ========================================
echo.

REM Check if MongoDB is running
echo Checking MongoDB...
tasklist /fi "imagename eq mongod.exe" | find /i "mongod.exe" >nul
if %errorlevel% neq 0 (
    echo [!] Starting MongoDB...
    start "MongoDB" cmd /k "mongod --dbpath ./data/db --port 27017"
    timeout /t 3 >nul
)
echo [OK] MongoDB is running
echo.

REM Start Backend Server
echo Starting Backend Server...
start "Clinic Backend Server" cmd /k "cd backend && npm start"
timeout /t 5 >nul
echo [OK] Backend server starting on port 5002...
echo.

REM Start Frontend Server
echo Starting Frontend Server...
start "Clinic Frontend Server" cmd /k "cd frontend && npm run dev"
timeout /t 3 >nul
echo [OK] Frontend server starting on port 5175...
echo.

echo ========================================
echo Production servers started!
echo ========================================
echo.
echo Backend: Running in production mode
echo Frontend: Running on port 5175
echo.
echo Access at: http://%IP%:5175
echo.
echo Check logs in:
echo Backend: %~dp0backend\logs
echo Frontend: %~dp0frontend\startup\logs
echo.

REM Show dialog box
powershell -Command "& {Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.MessageBox]::Show('Production servers started!\n\nBackend: Running in production mode\nFrontend: Running on port 5175\n\nAccess at: http://%IP%:5175\n\nCheck logs in:\nBackend: %~dp0backend\logs\nFrontend: %~dp0frontend\startup\logs', 'Clinic Management System - Production', 'OK', [System.Windows.Forms.MessageBoxIcon]::Information)}"

endlocal










