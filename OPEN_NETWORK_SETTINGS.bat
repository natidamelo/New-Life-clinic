@echo off
echo Opening Network Settings...
echo.
echo Follow these steps in the window that opens:
echo 1. Click "Ethernet" or "Wi-Fi"
echo 2. Click "Properties"
echo 3. Scroll to "IP assignment" and click "Edit"
echo 4. Change to "Manual" and turn ON IPv4
echo 5. Enter:
echo    IP address:      192.168.1.100
echo    Subnet prefix:   24
echo    Gateway:         192.168.1.1
echo    DNS:             8.8.8.8
echo 6. Click Save
echo.
pause

REM Open Network Settings
start ms-settings:network-status










