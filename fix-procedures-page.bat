@echo off
echo =========================================
echo FIXING PROCEDURES PAGE CONFIGURATION
echo =========================================
echo.
echo This script will fix the API configuration
echo to use the correct server IP address.
echo.

echo [1/4] Stopping frontend server...
taskkill /f /im node.exe >nul 2>&1
echo ✅ Frontend server stopped

echo.
echo [2/4] Configuration files updated:
echo ✅ frontend/src/config/index.ts - Updated to use 192.168.222.157:5002
echo ✅ frontend/src/config.ts - Updated to use 192.168.222.157:5002
echo ✅ frontend/src/pages/Nurse/Procedures.tsx - Updated API calls
echo ✅ frontend/src/services/apiService.ts - Updated server URLs
echo ✅ frontend/src/services/axiosConfig.ts - Updated base URL
echo ✅ frontend/src/services/prescriptionService.ts - Updated base URL

echo.
echo [3/4] Starting frontend server with new configuration...
cd frontend
start /b npm run dev
cd ..

echo Waiting for frontend to start...
timeout /t 8 /nobreak >nul

echo.
echo [4/4] Testing the fix...
echo Testing procedures page with new configuration...
curl -I http://192.168.222.157:5175/app/procedures >nul 2>&1
if errorlevel 1 (
    echo ❌ Procedures page still not accessible
) else (
    echo ✅ Procedures page is now accessible
)

echo.
echo =========================================
echo FIX COMPLETE
echo =========================================
echo.
echo CHANGES MADE:
echo.
echo 1. Updated all API configuration files to use 192.168.222.157:5002
echo 2. Fixed hardcoded localhost references
echo 3. Updated fallback URLs to prioritize correct server IP
echo 4. Restarted frontend server with new configuration
echo.
echo TESTING INSTRUCTIONS:
echo.
echo 1. On the small PC, open browser
echo 2. Go to: http://192.168.222.157:5175/app/procedures
echo 3. Check browser console (F12) for any remaining errors
echo 4. If still not working, try clearing browser cache
echo.
echo ALTERNATIVE ACCESS METHODS:
echo - Main page: http://192.168.222.157:5175/
echo - Login page: http://192.168.222.157:5175/login
echo - Nurse dashboard: http://192.168.222.157:5175/app/nurse
echo.
echo TROUBLESHOOTING:
echo - Clear browser cache on small PC
echo - Try different browser
echo - Check if antivirus is blocking connections
echo - Ensure both PCs are on same WiFi network
echo.

pause
