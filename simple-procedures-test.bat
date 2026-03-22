@echo off
echo =========================================
echo SIMPLE PROCEDURES PAGE TEST
echo =========================================
echo.
echo Testing procedures page accessibility...
echo.

echo [1/5] Testing server connectivity...
ping -n 1 192.168.222.157
if errorlevel 1 (
    echo ❌ Cannot reach server at 192.168.222.157
    echo This is likely the root cause of the problem
) else (
    echo ✅ Server is reachable
)

echo.
echo [2/5] Testing port 5175 accessibility...
netstat -an | findstr :5175
if errorlevel 1 (
    echo ❌ Port 5175 is not listening
) else (
    echo ✅ Port 5175 is listening
)

echo.
echo [3/5] Testing procedures page response...
curl -I http://192.168.222.157:5175/app/procedures
if errorlevel 1 (
    echo ❌ Procedures page not responding
) else (
    echo ✅ Procedures page is responding
)

echo.
echo [4/5] Testing root page response...
curl -I http://192.168.222.157:5175/
if errorlevel 1 (
    echo ❌ Root page not responding
) else (
    echo ✅ Root page is responding
)

echo.
echo [5/5] Testing procedures page content...
curl -s http://192.168.222.157:5175/app/procedures | findstr -i "error\|exception\|failed"
if errorlevel 1 (
    echo ✅ No errors found in procedures page
) else (
    echo ❌ Errors found in procedures page
)

echo.
echo =========================================
echo TEST COMPLETE
echo =========================================
echo.
echo RECOMMENDATIONS:
echo.
echo 1. If server is not reachable:
echo    - Check if both PCs are on same WiFi network
echo    - Try pinging from small PC: ping 192.168.222.157
echo    - Check firewall settings on both PCs
echo.
echo 2. If port 5175 is not listening:
echo    - Restart the frontend server
echo    - Check if another application is using port 5175
echo.
echo 3. If procedures page not responding:
echo    - Check browser console for errors
echo    - Try different browser
echo    - Clear browser cache
echo.
echo 4. Quick fixes to try:
echo    - Restart both PCs
echo    - Restart WiFi router
echo    - Try accessing from small PC: http://192.168.222.157:5175/app/procedures
echo.
echo 5. Alternative access methods:
echo    - Try: http://localhost:5175/app/procedures (if on same PC)
echo    - Try: http://[COMPUTERNAME]:5175/app/procedures
echo    - Check if other pages work: http://192.168.222.157:5175/app/nurse
echo.

pause
