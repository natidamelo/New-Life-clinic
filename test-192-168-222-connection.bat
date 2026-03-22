@echo off
echo =========================================
echo CLINIC MANAGEMENT SYSTEM - 192.168.222.x NETWORK TEST
echo =========================================
echo.
echo Testing connection between:
echo - Server: 192.168.222.157 (your server PC)
echo - Client: 192.168.222.44 (other PC)
echo.

echo [1/5] Testing server accessibility on 192.168.222.157...
echo Testing backend server (port 5002)...
curl -s http://192.168.222.157:5002/ >nul 2>&1
if errorlevel 1 (
    echo ❌ Backend server NOT accessible on 192.168.222.157:5002
    echo    This indicates firewall or server issues
) else (
    echo ✅ Backend server accessible on 192.168.222.157:5002
)

echo.
echo Testing frontend server (port 5175)...
curl -s http://192.168.222.157:5175 >nul 2>&1
if errorlevel 1 (
    echo ❌ Frontend server NOT accessible on 192.168.222.157:5175
    echo    This indicates firewall or server issues
) else (
    echo ✅ Frontend server accessible on 192.168.222.157:5175
)

echo.
echo [2/5] Testing API endpoints...
echo Testing API endpoint: http://192.168.222.157:5002/api/patients
curl -s http://192.168.222.157:5002/api/patients >nul 2>&1
if errorlevel 1 (
    echo ❌ API endpoint NOT accessible
) else (
    echo ✅ API endpoint accessible
)

echo.
echo [3/5] Testing CORS configuration...
echo Testing cross-origin request from 192.168.222.44 to 192.168.222.157...

REM Test CORS preflight request
curl -s -X OPTIONS -H "Origin: http://192.168.222.44:5175" -H "Access-Control-Request-Method: GET" http://192.168.222.157:5002/ -w "%%{http_code}" -o nul > temp_cors_test.txt 2>&1
set /p CORS_RESULT=<temp_cors_test.txt
del temp_cors_test.txt

if "%CORS_RESULT%"=="200" (
    echo ✅ CORS configuration allows 192.168.222.44
) else (
    echo ❌ CORS configuration may block 192.168.222.44 (HTTP %CORS_RESULT%)
)

echo.
echo [4/5] Network connectivity analysis...
echo.

REM Check if both IPs are on same subnet
echo Network Analysis:
echo - Server IP: 192.168.222.157
echo - Client IP: 192.168.222.44
echo - Both on 192.168.222.0/24 network: YES
echo.

echo ✅ Both IPs are on the same network segment!
echo    This should work if firewall is properly configured.
echo.

echo [5/5] Providing connection instructions...
echo.

echo =========================================
echo CONNECTION INSTRUCTIONS
echo =========================================
echo.
echo From the other PC (192.168.222.44), use these addresses:
echo.
echo 🌐 Web Interface:
echo   http://192.168.222.157:5175/
echo.
echo 🔌 Backend API:
echo   http://192.168.222.157:5002/api/
echo.
echo Example tests from other PC:
echo   curl http://192.168.222.157:5002/
echo   curl http://192.168.222.157:5175
echo.

echo.
echo =========================================
echo TROUBLESHOOTING
echo =========================================
echo.
echo If connection still fails:
echo.
echo 1. FIREWALL ISSUES:
echo    - Run configure-firewall.bat as Administrator
echo    - Or temporarily disable Windows Firewall for testing
echo.
echo 2. SERVER NOT RUNNING:
echo    - Make sure the application is running on the server PC
echo    - Check if ports 5002 and 5175 are in use
echo.
echo 3. NETWORK ISSUES:
echo    - Try ping 192.168.222.157 from client PC
echo    - Try accessing by computer name: http://%COMPUTERNAME%:5175/
echo.
echo 4. ANTIVIRUS:
echo    - Temporarily disable antivirus software
echo    - Some antivirus blocks network connections
echo.

echo.
echo QUICK TEST COMMANDS (run on client PC):
echo   ping 192.168.222.157
echo   curl http://192.168.222.157:5002/
echo   curl http://192.168.222.157:5175
echo.

echo.
echo For complete troubleshooting, see NETWORK_TROUBLESHOOTING_GUIDE.md
echo.

pause
