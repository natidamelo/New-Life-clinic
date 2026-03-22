@echo off
echo ========================================
echo    TESTING SERVER CONNECTION
echo ========================================
echo.

echo Testing backend server on port 5002...
echo.

REM Test if port 5002 is in use
netstat -ano | findstr :5002 > nul
if %errorlevel% equ 0 (
    echo [SUCCESS] Port 5002 is in use - server is running!
    echo.
    echo Testing health check...
    curl -s http://localhost:5002/ping > nul
    if %errorlevel% equ 0 (
        echo [SUCCESS] Health check passed!
        echo Backend server is responding correctly.
    ) else (
        echo [WARNING] Health check failed - server may not be fully started.
    )
) else (
    echo [ERROR] Port 5002 is not in use - server is not running!
    echo.
    echo Please run start-project.bat to start the server.
)

echo.
echo ========================================
echo    CONNECTION STATUS
echo ========================================
echo Backend URL: http://localhost:5002
echo Health Check: http://localhost:5002/ping
echo.
echo Press any key to continue...
pause > nul 