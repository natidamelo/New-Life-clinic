@echo off
echo ========================================
echo Configuring Windows Firewall for Backend
echo ========================================
echo.
echo This script will allow port 5002 through Windows Firewall
echo so that other PCs can access the backend server.
echo.
echo NOTE: This requires Administrator privileges!
echo.
pause

echo.
echo Adding firewall rule for port 5002...
netsh advfirewall firewall add rule name="Clinic Backend API" dir=in action=allow protocol=TCP localport=5002

if %errorlevel% equ 0 (
    echo.
    echo ✅ Firewall rule added successfully!
    echo.
    echo Port 5002 is now accessible from other PCs on the network.
) else (
    echo.
    echo ❌ Failed to add firewall rule.
    echo.
    echo Please run this script as Administrator:
    echo Right-click on allow-backend-firewall.bat and select "Run as administrator"
)

echo.
echo ========================================
echo Current Firewall Rules for Port 5002:
echo ========================================
netsh advfirewall firewall show rule name="Clinic Backend API"

echo.
pause

