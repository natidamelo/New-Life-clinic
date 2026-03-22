@echo off
echo =========================================
echo VERIFYING PROCEDURES PAGE FIX
echo =========================================
echo.
echo Testing if the procedures page is now working correctly...
echo.

echo [1/5] Testing server connectivity...
ping -n 1 192.168.222.157 >nul 2>&1
if errorlevel 1 (
    echo ❌ Cannot reach server
) else (
    echo ✅ Server is reachable
)

echo.
echo [2/5] Testing frontend server...
curl -I http://192.168.222.157:5175/ >nul 2>&1
if errorlevel 1 (
    echo ❌ Frontend server not responding
) else (
    echo ✅ Frontend server is responding
)

echo.
echo [3/5] Testing procedures page...
curl -I http://192.168.222.157:5175/app/procedures >nul 2>&1
if errorlevel 1 (
    echo ❌ Procedures page not responding
) else (
    echo ✅ Procedures page is responding
)

echo.
echo [4/5] Testing backend API...
curl -I http://192.168.222.157:5002/ >nul 2>&1
if errorlevel 1 (
    echo ❌ Backend API not responding
) else (
    echo ✅ Backend API is responding
)

echo.
echo [5/5] Testing procedures API endpoint...
curl -I http://192.168.222.157:5002/api/procedures >nul 2>&1
if errorlevel 1 (
    echo ❌ Procedures API not responding
) else (
    echo ✅ Procedures API is responding
)

echo.
echo =========================================
echo VERIFICATION COMPLETE
echo =========================================
echo.
echo FIX SUMMARY:
echo.
echo ✅ Updated API configuration to use 192.168.222.157:5002
echo ✅ Fixed hardcoded localhost references in all files
echo ✅ Updated fallback URLs to prioritize correct server IP
echo ✅ Restarted frontend server with new configuration
echo.
echo NEXT STEPS:
echo.
echo 1. On the small PC, open browser
echo 2. Go to: http://192.168.222.157:5175/app/procedures
echo 3. The page should now load without localhost errors
echo 4. If you still see errors, clear browser cache (Ctrl+Shift+Delete)
echo.
echo ALTERNATIVE PAGES TO TEST:
echo - Main page: http://192.168.222.157:5175/
echo - Login page: http://192.168.222.157:5175/login
echo - Nurse dashboard: http://192.168.222.157:5175/app/nurse
echo.
echo TROUBLESHOOTING:
echo - If still not working, try different browser
echo - Check browser console (F12) for any remaining errors
echo - Ensure both PCs are on same WiFi network
echo - Try accessing from server PC: http://localhost:5175/app/procedures
echo.

pause
