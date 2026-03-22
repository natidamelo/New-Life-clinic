@echo off
echo =========================================
echo CLINIC MANAGEMENT SYSTEM - NETWORK CONNECTIVITY TEST
echo =========================================
echo.
echo Testing network connectivity for Clinic Management System...
echo.

REM Get current IP address
for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr /C:"IPv4 Address" ^| findstr /V "127.0.0.1"') do set IP_ADDRESS=%%i
set IP_ADDRESS=%IP_ADDRESS: =%
echo Current IP Address: %IP_ADDRESS%
echo.

echo [1/4] Testing backend server (port 5002)...
curl -s http://localhost:5002/api/health >nul 2>&1
if errorlevel 1 (
    echo ❌ Backend server NOT accessible on localhost:5002
) else (
    echo ✅ Backend server accessible on localhost:5002
)

curl -s http://%IP_ADDRESS%:5002/api/health >nul 2>&1
if errorlevel 1 (
    echo ❌ Backend server NOT accessible on %IP_ADDRESS%:5002
    echo    This indicates firewall or server configuration issues
) else (
    echo ✅ Backend server accessible on %IP_ADDRESS%:5002
)

echo.
echo [2/4] Testing frontend server (port 5175)...
curl -s http://localhost:5175 >nul 2>&1
if errorlevel 1 (
    echo ❌ Frontend server NOT accessible on localhost:5175
) else (
    echo ✅ Frontend server accessible on localhost:5175
)

curl -s http://%IP_ADDRESS%:5175 >nul 2>&1
if errorlevel 1 (
    echo ❌ Frontend server NOT accessible on %IP_ADDRESS%:5175
    echo    This indicates firewall or server configuration issues
) else (
    echo ✅ Frontend server accessible on %IP_ADDRESS%:5175
)

echo.
echo [3/4] Testing backend API endpoints...
curl -s http://localhost:5002/api/patients >nul 2>&1
if errorlevel 1 (
    echo ❌ API endpoint NOT accessible on localhost:5002/api/patients
) else (
    echo ✅ API endpoint accessible on localhost:5002/api/patients
)

curl -s http://%IP_ADDRESS%:5002/api/patients >nul 2>&1
if errorlevel 1 (
    echo ❌ API endpoint NOT accessible on %IP_ADDRESS%:5002/api/patients
) else (
    echo ✅ API endpoint accessible on %IP_ADDRESS%:5002/api/patients
)

echo.
echo [4/4] Testing cross-origin requests...
echo Testing CORS configuration...

REM Test CORS preflight request
curl -s -X OPTIONS -H "Origin: http://%IP_ADDRESS%:5175" -H "Access-Control-Request-Method: GET" http://localhost:5002/api/health -w "%%{http_code}" -o nul > temp_cors_test.txt 2>&1
set /p CORS_RESULT=<temp_cors_test.txt
del temp_cors_test.txt

if "%CORS_RESULT%"=="200" (
    echo ✅ CORS configuration looks good
) else (
    echo ❌ CORS configuration may have issues (HTTP %CORS_RESULT%)
)

echo.
echo =========================================
echo NETWORK TEST RESULTS
echo =========================================
echo.
echo Your application should be accessible from other PCs at:
echo Frontend: http://%IP_ADDRESS%:5175/
echo Backend API: http://%IP_ADDRESS%:5002/api/
echo.
echo If other PCs still can't connect:
echo 1. Run configure-firewall.bat as Administrator
echo 2. Check if both PCs are on the same network
echo 3. Disable antivirus temporarily for testing
echo 4. Try accessing by computer name: http://%COMPUTERNAME%:5175/
echo.
echo For troubleshooting other PCs, they should run:
echo curl http://%IP_ADDRESS%:5002/api/health
echo curl http://%IP_ADDRESS%:5175
echo.

pause
