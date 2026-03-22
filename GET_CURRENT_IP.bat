@echo off
echo ========================================
echo   Current Network IP for Clinic Access
echo ========================================
echo.

REM Get all IPv4 addresses
echo Your IP Addresses:
echo.
ipconfig | findstr /C:"IPv4 Address"

echo.
echo ========================================
echo To access from other PCs, use:
echo http://YOUR-IP:5175
echo ========================================
echo.
echo Example: If your IP is 192.168.1.9
echo Then share: http://192.168.1.9:5175
echo.
pause










