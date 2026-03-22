@echo off
echo ========================================
echo   Network Interface Check
echo ========================================
echo.
echo Current network interfaces:
echo.
ipconfig | findstr "IPv4 Address"
echo.
echo For mobile access, use the WiFi IP address (usually 192.168.x.x)
echo.
pause
