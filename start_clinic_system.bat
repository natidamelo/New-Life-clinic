@echo off
echo ========================================
echo Starting Clinic Management System
echo ========================================
echo.

REM Check if MongoDB is running
echo Checking MongoDB...
sc query MongoDB | findstr "RUNNING" >nul
if %errorlevel% neq 0 (
    echo [WARNING] MongoDB is not running. Starting MongoDB...
    net start MongoDB
    timeout /t 3 >nul
)
echo [OK] MongoDB is running
echo.

REM Start Backend Server
echo Starting Backend Server...
cd /d "%~dp0backend"
start "Clinic Backend Server" cmd /k "npm start"
timeout /t 5 >nul
echo [OK] Backend server starting...
echo.

REM Start Frontend Server
echo Starting Frontend Server...
cd /d "%~dp0frontend"
start "Clinic Frontend Server" cmd /k "npm start"
echo [OK] Frontend server starting...
echo.

REM Get network IP dynamically
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address"') do (
    set NETWORK_IP=%%a
    set NETWORK_IP=!NETWORK_IP:~1!
    goto :ip_found
)
:ip_found

if "!NETWORK_IP!"=="" (
    set NETWORK_IP=localhost
)

echo ========================================
echo System Starting!
echo ========================================
echo.
echo Backend: http://localhost:5002 or http://!NETWORK_IP!:5002
echo Frontend: http://localhost:5175 or http://!NETWORK_IP!:5175
echo.
echo Use network IP (!NETWORK_IP!) to access from other PCs
echo.
echo Press any key to close this window...
pause >nul
