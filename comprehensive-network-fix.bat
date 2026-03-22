@echo off
echo =========================================
echo CLINIC MANAGEMENT SYSTEM - COMPREHENSIVE NETWORK FIX
echo =========================================
echo.
echo This script will diagnose and fix ALL network connectivity issues.
echo.

REM Check if running as administrator
net session >nul 2>&1
if errorlevel 1 (
    echo ❌ ERROR: This script needs Administrator privileges!
    echo.
    echo To fix this:
    echo 1. Right-click this file
    echo 2. Select "Run as administrator"
    echo 3. Click "Yes" when prompted
    echo.
    pause
    exit /b 1
)

echo ✅ Running as Administrator - proceeding with fixes...
echo.

echo [1/8] Stopping all Node.js processes...
taskkill /f /im node.exe >nul 2>&1
echo ✅ Node.js processes stopped

echo.
echo [2/8] Getting current network configuration...
for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr /C:"IPv4 Address" ^| findstr /V "127.0.0.1"') do (
    set SERVER_IP=%%i
    set SERVER_IP=!SERVER_IP: =!
    goto :found_server_ip
)
:found_server_ip

echo ✅ Server IP: %SERVER_IP%
echo ✅ Client should connect to: http://%SERVER_IP%:5175/

echo.
echo [3/8] Configuring Windows Firewall...
echo Removing old firewall rules...
netsh advfirewall firewall delete rule name="Clinic Backend Server" >nul 2>&1
netsh advfirewall firewall delete rule name="Clinic Frontend Server" >nul 2>&1
netsh advfirewall firewall delete rule name="Node.js Server" >nul 2>&1

echo Adding new firewall rules...
netsh advfirewall firewall add rule name="Clinic Backend Server" dir=in action=allow protocol=TCP localport=5002
if errorlevel 1 (
    echo ❌ Failed to add backend firewall rule
) else (
    echo ✅ Backend firewall rule added (port 5002)
)

netsh advfirewall firewall add rule name="Clinic Frontend Server" dir=in action=allow protocol=TCP localport=5175
if errorlevel 1 (
    echo ❌ Failed to add frontend firewall rule
) else (
    echo ✅ Frontend firewall rule added (port 5175)
)

echo.
echo [4/8] Testing network connectivity...
echo Testing ping to client PC (192.168.222.44)...
ping -n 1 192.168.222.44 >nul 2>&1
if errorlevel 1 (
    echo ⚠️  Cannot ping client PC - this indicates network issues
    echo    Both PCs may not be on the same network segment
) else (
    echo ✅ Can ping client PC - network connectivity is good
)

echo.
echo [5/8] Starting backend server...
cd backend
start /b npm start >nul 2>&1
cd ..

echo Waiting for backend to start...
timeout /t 5 /nobreak >nul

echo Testing backend server...
curl -s http://localhost:5002/ >nul 2>&1
if errorlevel 1 (
    echo ❌ Backend server failed to start
) else (
    echo ✅ Backend server is running
)

curl -s http://%SERVER_IP%:5002/ >nul 2>&1
if errorlevel 1 (
    echo ❌ Backend server not accessible on network IP
    echo    This indicates firewall or server binding issues
) else (
    echo ✅ Backend server accessible on network IP
)

echo.
echo [6/8] Starting frontend server...
cd frontend
start /b npm run dev >nul 2>&1
cd ..

echo Waiting for frontend to start...
timeout /t 8 /nobreak >nul

echo Testing frontend server...
curl -s http://localhost:5175 >nul 2>&1
if errorlevel 1 (
    echo ❌ Frontend server failed to start
) else (
    echo ✅ Frontend server is running
)

curl -s http://%SERVER_IP%:5175 >nul 2>&1
if errorlevel 1 (
    echo ❌ Frontend server not accessible on network IP
    echo    This indicates firewall or server binding issues
) else (
    echo ✅ Frontend server accessible on network IP
)

echo.
echo [7/8] Testing CORS configuration...
echo Testing cross-origin request...
curl -s -X OPTIONS -H "Origin: http://192.168.222.44:5175" -H "Access-Control-Request-Method: GET" http://%SERVER_IP%:5002/ -w "%%{http_code}" -o nul > temp_cors_test.txt 2>&1
set /p CORS_RESULT=<temp_cors_test.txt
del temp_cors_test.txt

if "%CORS_RESULT%"=="200" (
    echo ✅ CORS configuration allows client PC
) else (
    echo ❌ CORS configuration may block client PC (HTTP %CORS_RESULT%)
)

echo.
echo [8/8] Final connectivity test...
echo Testing complete application access...

echo Backend API test:
curl -s http://%SERVER_IP%:5002/ >nul 2>&1
if errorlevel 1 (
    echo ❌ Backend API not accessible
) else (
    echo ✅ Backend API accessible
)

echo Frontend web interface test:
curl -s http://%SERVER_IP%:5175 >nul 2>&1
if errorlevel 1 (
    echo ❌ Frontend web interface not accessible
) else (
    echo ✅ Frontend web interface accessible
)

echo.
echo =========================================
echo COMPREHENSIVE FIX COMPLETE
echo =========================================
echo.
echo CONNECTION INFORMATION:
echo.
echo From the other PC (192.168.222.44), use:
echo 🌐 Web Interface: http://%SERVER_IP%:5175/
echo 🔌 Backend API: http://%SERVER_IP%:5002/api/
echo.
echo QUICK TESTS (run on client PC):
echo   ping %SERVER_IP%
echo   curl http://%SERVER_IP%:5002/
echo   curl http://%SERVER_IP%:5175
echo.
echo TROUBLESHOOTING:
echo.
echo If still not working:
echo 1. Both PCs must be on the same WiFi network
echo 2. Check if antivirus is blocking connections
echo 3. Try accessing by computer name: http://%COMPUTERNAME%:5175/
echo 4. Verify both PCs show same network in ipconfig
echo.
echo COMMON ISSUES:
echo - Different WiFi networks (PCs on different routers)
echo - Antivirus software blocking connections
echo - Windows network discovery disabled
echo - Router blocking internal communication
echo.

pause
