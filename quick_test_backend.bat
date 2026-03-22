@echo off
echo Testing backend server connection...
echo.

echo [1/3] Checking if port 5002 is in use...
netstat -ano | findstr ":5002"
if %errorlevel% == 0 (
    echo ✅ Port 5002 is in use
) else (
    echo ❌ Port 5002 is not in use
    echo Backend server is not running!
    goto :end
)

echo.
echo [2/3] Testing API health endpoint...
curl -s -o nul -w "HTTP Status: %%{http_code}\n" http://localhost:5002/api/health
if %errorlevel% == 0 (
    echo ✅ API endpoint responded
) else (
    echo ❌ API endpoint not responding
)

echo.
echo [3/3] Testing ping endpoint...
curl -s -o nul -w "HTTP Status: %%{http_code}\n" http://localhost:5002/ping
if %errorlevel% == 0 (
    echo ✅ Ping endpoint responded
) else (
    echo ❌ Ping endpoint not responding
)

:end
echo.
echo Test complete. If backend is not running, use: fix_all_backend_issues.bat
pause 