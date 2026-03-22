@echo off
echo =========================================
echo CLINIC MANAGEMENT SYSTEM - CLIENT SIDE TEST
echo =========================================
echo.
echo Run this script on the OTHER PC (192.168.222.44) to test connectivity.
echo.

echo [1/6] Checking network configuration...
echo Current PC IP configuration:
ipconfig | findstr /C:"IPv4 Address"
echo.

echo [2/6] Testing basic network connectivity...
echo Testing ping to server PC (192.168.222.157)...
ping -n 3 192.168.222.157
echo.

echo [3/6] Testing backend server access...
echo Testing backend API: http://192.168.222.157:5002/
curl -s http://192.168.222.157:5002/
echo.
echo Backend test result: %ERRORLEVEL%
if errorlevel 1 (
    echo ❌ Backend server not accessible
    echo    Possible causes:
    echo    - Server PC firewall blocking connections
    echo    - Server PC not running the application
    echo    - Different network segments
) else (
    echo ✅ Backend server accessible
)

echo.
echo [4/6] Testing frontend server access...
echo Testing frontend: http://192.168.222.157:5175/
curl -s http://192.168.222.157:5175/
echo.
echo Frontend test result: %ERRORLEVEL%
if errorlevel 1 (
    echo ❌ Frontend server not accessible
    echo    Possible causes:
    echo    - Server PC firewall blocking connections
    echo    - Server PC not running the application
    echo    - Different network segments
) else (
    echo ✅ Frontend server accessible
)

echo.
echo [5/6] Testing with different methods...
echo Testing by computer name...
echo Try: http://SERVER_COMPUTER_NAME:5175/
echo.
echo Testing localhost (should fail from this PC)...
curl -s http://localhost:5175/ >nul 2>&1
if errorlevel 1 (
    echo ✅ Localhost correctly not accessible (expected)
) else (
    echo ❌ Localhost accessible (unexpected - check if app is running on this PC)
)

echo.
echo [6/6] Providing solutions...
echo.
echo =========================================
echo CLIENT SIDE TEST RESULTS
echo =========================================
echo.
echo If tests failed, try these solutions:
echo.
echo 1. SERVER PC ISSUES:
echo    - Make sure server PC is running the clinic application
echo    - Run "comprehensive-network-fix.bat" as Administrator on server PC
echo.
echo 2. NETWORK ISSUES:
echo    - Both PCs must be on the same WiFi network
echo    - Check if both show same network in ipconfig (e.g., both 192.168.222.x)
echo.
echo 3. FIREWALL ISSUES:
echo    - Server PC needs firewall rules for ports 5002 and 5175
echo    - Client PC may need to allow Node.js through firewall
echo.
echo 4. ANTIVIRUS ISSUES:
echo    - Temporarily disable antivirus on both PCs
echo    - Some antivirus software blocks network connections
echo.
echo 5. ROUTER ISSUES:
echo    - Some routers block communication between devices
echo    - Check router settings for "AP Isolation" or "Client Isolation"
echo.
echo NEXT STEPS:
echo 1. Run "comprehensive-network-fix.bat" as Administrator on SERVER PC
echo 2. Ensure both PCs are on the same WiFi network
echo 3. Test again with this script
echo.

pause
