@echo off
echo =========================================
echo CLINIC MANAGEMENT SYSTEM - FIREWALL CONFIGURATION
echo =========================================
echo.
echo This script needs to be run as Administrator!
echo.
echo Right-click this file and select "Run as administrator"
echo.
pause
exit /b 1

REM This script configures Windows Firewall to allow the clinic application
REM Run this as Administrator to allow network access

echo.
echo Configuring firewall rules for Clinic Management System...
echo.

REM Add rule for backend server (port 5002)
netsh advfirewall firewall add rule name="Clinic Backend Server" dir=in action=allow protocol=TCP localport=5002
if errorlevel 1 (
    echo ERROR: Failed to add backend server rule
) else (
    echo ✅ Backend server rule added (port 5002)
)

REM Add rule for frontend server (port 5175)
netsh advfirewall firewall add rule name="Clinic Frontend Server" dir=in action=allow protocol=TCP localport=5175
if errorlevel 1 (
    echo ERROR: Failed to add frontend server rule
) else (
    echo ✅ Frontend server rule added (port 5175)
)

REM Add rule for MongoDB (port 27017) if needed
netsh advfirewall firewall add rule name="MongoDB Server" dir=in action=allow protocol=TCP localport=27017
if errorlevel 1 (
    echo ERROR: Failed to add MongoDB rule
) else (
    echo ✅ MongoDB rule added (port 27017)
)

echo.
echo =========================================
echo FIREWALL CONFIGURATION COMPLETE
echo =========================================
echo.
echo The following ports are now open for network access:
echo - Port 5002: Backend API server
echo - Port 5175: Frontend web server
echo - Port 27017: MongoDB database
echo.
echo Your application should now be accessible from other PCs on the network.
echo.
echo To test from another PC, use:
echo http://%COMPUTERNAME%:5175/
echo or
echo http://YOUR_IP_ADDRESS:5175/
echo.
echo If you still can't connect, check:
echo 1. Antivirus software blocking connections
echo 2. Network discovery settings
echo 3. Both PCs are on the same network
echo.
pause