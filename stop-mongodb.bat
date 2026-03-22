@echo off
echo.
echo ========================================
echo   Stopping MongoDB Server
echo ========================================
echo.

REM Find MongoDB process
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":27017"') do (
    set pid=%%a
    goto :found
)

:notfound
echo MongoDB is not running
echo.
pause
exit /b 0

:found
echo Found MongoDB process (PID: %pid%)
echo Stopping MongoDB...

taskkill /F /PID %pid% /T >nul 2>&1

if %errorlevel% equ 0 (
    echo.
    echo ✅ MongoDB stopped successfully!
    echo.
) else (
    echo.
    echo ⚠️  Could not stop MongoDB (may need administrator privileges)
    echo.
)

pause










