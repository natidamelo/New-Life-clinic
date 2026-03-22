@echo off
echo =========================================
echo PROCEDURES PAGE DIAGNOSTIC SCRIPT
echo =========================================
echo.
echo This script will diagnose why the procedures page
echo is not viewable on the small PC.
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

echo ✅ Running as Administrator - proceeding with diagnostics...
echo.

echo [1/10] Checking server status...
echo Testing if frontend server is running on port 5175...
netstat -an | findstr :5175
if errorlevel 1 (
    echo ❌ Frontend server is NOT running on port 5175
    echo Starting frontend server...
    cd frontend
    start /b npm run dev
    cd ..
    timeout /t 10 /nobreak >nul
) else (
    echo ✅ Frontend server is running on port 5175
)

echo.
echo [2/10] Testing network connectivity...
echo Testing ping to small PC (192.168.222.146)...
ping -n 1 192.168.222.146 >nul 2>&1
if errorlevel 1 (
    echo ❌ Cannot ping small PC - network connectivity issue
    echo This could be the root cause of the problem
) else (
    echo ✅ Can ping small PC - network connectivity is good
)

echo.
echo [3/10] Testing server accessibility from network...
echo Testing if server is accessible on network IP...
curl -I http://192.168.222.157:5175/ >nul 2>&1
if errorlevel 1 (
    echo ❌ Server not accessible on network IP
    echo This indicates firewall or binding issues
) else (
    echo ✅ Server is accessible on network IP
)

echo.
echo [4/10] Testing procedures page specifically...
echo Testing procedures page URL...
curl -I http://192.168.222.157:5175/app/procedures >nul 2>&1
if errorlevel 1 (
    echo ❌ Procedures page not accessible
) else (
    echo ✅ Procedures page is accessible
)

echo.
echo [5/10] Checking firewall rules...
echo Checking if firewall allows port 5175...
netsh advfirewall firewall show rule name="Clinic Frontend Server" >nul 2>&1
if errorlevel 1 (
    echo ❌ Firewall rule for port 5175 not found
    echo Adding firewall rule...
    netsh advfirewall firewall add rule name="Clinic Frontend Server" dir=in action=allow protocol=TCP localport=5175
    if errorlevel 1 (
        echo ❌ Failed to add firewall rule
    ) else (
        echo ✅ Firewall rule added for port 5175
    )
) else (
    echo ✅ Firewall rule exists for port 5175
)

echo.
echo [6/10] Testing CORS configuration...
echo Testing if CORS allows requests from small PC...
curl -s -X OPTIONS -H "Origin: http://192.168.222.146:5175" -H "Access-Control-Request-Method: GET" http://192.168.222.157:5175/ -w "%{http_code}" -o nul > temp_cors_test.txt 2>&1
set /p CORS_RESULT=<temp_cors_test.txt
del temp_cors_test.txt

if "%CORS_RESULT%"=="200" (
    echo ✅ CORS configuration allows small PC
) else (
    echo ❌ CORS configuration may block small PC (HTTP %CORS_RESULT%)
)

echo.
echo [7/10] Checking browser compatibility...
echo Testing if procedures page loads correctly...
curl -s http://192.168.222.157:5175/app/procedures | findstr -i "error\|exception\|failed" >nul 2>&1
if errorlevel 1 (
    echo ✅ No errors found in procedures page content
) else (
    echo ❌ Errors found in procedures page content
    echo Content with errors:
    curl -s http://192.168.222.157:5175/app/procedures | findstr -i "error\|exception\|failed"
)

echo.
echo [8/10] Testing JavaScript loading...
echo Checking if JavaScript files are accessible...
curl -I http://192.168.222.157:5175/src/main.tsx >nul 2>&1
if errorlevel 1 (
    echo ❌ JavaScript files not accessible
) else (
    echo ✅ JavaScript files are accessible
)

echo.
echo [9/10] Testing authentication requirements...
echo Checking if procedures page requires authentication...
curl -s http://192.168.222.157:5175/app/procedures | findstr -i "login\|auth\|token" >nul 2>&1
if errorlevel 1 (
    echo ✅ No authentication redirects found
) else (
    echo ❌ Authentication may be required
    echo Content with auth references:
    curl -s http://192.168.222.157:5175/app/procedures | findstr -i "login\|auth\|token"
)

echo.
echo [10/10] Final comprehensive test...
echo Testing complete application flow...

echo Testing root page:
curl -I http://192.168.222.157:5175/ >nul 2>&1
if errorlevel 1 (
    echo ❌ Root page not accessible
) else (
    echo ✅ Root page accessible
)

echo Testing procedures page:
curl -I http://192.168.222.157:5175/app/procedures >nul 2>&1
if errorlevel 1 (
    echo ❌ Procedures page not accessible
) else (
    echo ✅ Procedures page accessible
)

echo.
echo =========================================
echo DIAGNOSTIC COMPLETE
echo =========================================
echo.
echo TROUBLESHOOTING RECOMMENDATIONS:
echo.
echo 1. NETWORK CONNECTIVITY:
echo    - Ensure both PCs are on the same WiFi network
echo    - Check if small PC can ping 192.168.222.157
echo    - Verify no antivirus is blocking connections
echo.
echo 2. BROWSER ISSUES:
echo    - Clear browser cache on small PC
echo    - Try different browser (Chrome, Firefox, Edge)
echo    - Disable browser extensions temporarily
echo    - Check browser console for JavaScript errors
echo.
echo 3. FIREWALL/Antivirus:
echo    - Temporarily disable Windows Firewall
echo    - Check antivirus software settings
echo    - Ensure port 5175 is not blocked
echo.
echo 4. ALTERNATIVE ACCESS METHODS:
echo    - Try accessing by computer name: http://[COMPUTERNAME]:5175/app/procedures
echo    - Use localhost if accessing from same PC: http://localhost:5175/app/procedures
echo    - Check if other pages work: http://192.168.222.157:5175/app/nurse
echo.
echo 5. QUICK FIXES TO TRY:
echo    - Restart both PCs
echo    - Restart router/WiFi
echo    - Run this script on small PC to test connectivity
echo    - Check if small PC can access other websites
echo.
echo COMMON ISSUES:
echo - Different WiFi networks (PCs on different routers)
echo - Antivirus software blocking connections
echo - Windows network discovery disabled
echo - Router blocking internal communication
echo - Browser cache issues
echo - JavaScript disabled in browser
echo.
echo NEXT STEPS:
echo 1. Run this script on the small PC to test connectivity
echo 2. Check browser console for errors
echo 3. Try accessing other pages to isolate the issue
echo 4. Test with different browsers
echo.

pause
