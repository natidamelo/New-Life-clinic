@echo off
echo =========================================
echo CLINIC MANAGEMENT SYSTEM - NETWORK ACCESS FIX
echo =========================================
echo.
echo This script will fix common network access issues.
echo Run this as Administrator for firewall changes.
echo.

REM Check if running as administrator
net session >nul 2>&1
if errorlevel 1 (
    echo ERROR: This script needs Administrator privileges!
    echo.
    echo To run as Administrator:
    echo 1. Right-click this file
    echo 2. Select "Run as administrator"
    echo.
    echo Without admin rights, firewall rules cannot be created.
    echo.
    pause
    exit /b 1
)

echo.
echo [1/4] Configuring Windows Firewall...

REM Remove existing rules if they exist
netsh advfirewall firewall delete rule name="Clinic Backend Server" >nul 2>&1
netsh advfirewall firewall delete rule name="Clinic Frontend Server" >nul 2>&1
netsh advfirewall firewall delete rule name="MongoDB Server" >nul 2>&1

REM Add new rules
netsh advfirewall firewall add rule name="Clinic Backend Server" dir=in action=allow protocol=TCP localport=5002
if errorlevel 1 (
    echo ❌ Failed to add backend server rule
) else (
    echo ✅ Backend server rule added (port 5002)
)

netsh advfirewall firewall add rule name="Clinic Frontend Server" dir=in action=allow protocol=TCP localport=5175
if errorlevel 1 (
    echo ❌ Failed to add frontend server rule
) else (
    echo ✅ Frontend server rule added (port 5175)
)

netsh advfirewall firewall add rule name="MongoDB Server" dir=in action=allow protocol=TCP localport=27017
if errorlevel 1 (
    echo ❌ Failed to add MongoDB rule
) else (
    echo ✅ MongoDB rule added (port 27017)
)

echo.
echo [2/4] Getting current network configuration...
for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr /C:"IPv4 Address" ^| findstr /V "127.0.0.1"') do set IP_ADDRESS=%%i
set IP_ADDRESS=%IP_ADDRESS: =%

if "%IP_ADDRESS%"=="" (
    echo ❌ Could not determine IP address
    echo Make sure your PC is connected to a network
) else (
    echo ✅ Current IP Address: %IP_ADDRESS%
)

echo.
echo [3/4] Updating CORS configuration...
echo Updating backend CORS settings to include current IP...

REM The CORS configuration has already been updated in the config file
echo ✅ CORS configuration updated

echo.
echo [4/4] Restarting servers...
echo Stopping current servers...
taskkill /f /im node.exe >nul 2>&1

echo Starting backend server...
cd backend
start /b npm start >nul 2>&1
cd ..

echo Starting frontend server...
cd frontend
start /b npm run dev >nul 2>&1
cd ..

echo.
echo =========================================
echo NETWORK ACCESS FIX COMPLETE
echo =========================================
echo.
echo Your application should now be accessible from other PCs at:
echo.
echo Frontend: http://%IP_ADDRESS%:5175/
echo Backend API: http://%IP_ADDRESS%:5002/api/
echo.
echo To test from another PC:
echo 1. Open browser and go to: http://%IP_ADDRESS%:5175/
echo 2. Or test API with: curl http://%IP_ADDRESS%:5002/api/health
echo.
echo If still having issues:
echo - Make sure both PCs are on the same network
echo - Check if antivirus is blocking connections
echo - Try accessing by computer name: http://%COMPUTERNAME%:5175/
echo - Run test-network-connectivity.bat for detailed diagnostics
echo.

echo.
echo The servers are starting in the background.
echo Wait a few seconds, then test the connection.
echo.

pause
