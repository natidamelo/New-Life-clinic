@echo off
echo Starting MongoDB Service...
echo.
net start MongoDB
if %errorlevel% equ 0 (
    echo.
    echo ✅ MongoDB started successfully!
    echo.
    echo You can now restart your backend server.
    echo Press any key to close this window...
    pause > nul
) else (
    echo.
    echo ❌ Failed to start MongoDB. Please run this file as Administrator.
    echo Right-click on start-mongodb.bat and select "Run as administrator"
    echo.
    pause
)
