@echo off
echo ========================================
echo  Restarting WiFi to Apply Static IP
echo ========================================
echo.
echo This will disconnect and reconnect WiFi...
echo.
pause

echo Disabling WiFi adapter...
netsh interface set interface "Wi-Fi" admin=disable
timeout /t 2 /nobreak >nul

echo Enabling WiFi adapter...
netsh interface set interface "Wi-Fi" admin=enable
timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo WiFi Restarted!
echo ========================================
echo.
echo Your new static IP should now be active: 10.99.120.100
echo.
echo To verify, run: ipconfig
echo.
pause










