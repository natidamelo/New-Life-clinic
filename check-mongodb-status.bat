@echo off
echo.
echo ========================================
echo   MongoDB Status Check
echo ========================================
echo.

REM Check if MongoDB is running
netstat -ano | findstr ":27017" >nul
if %errorlevel% equ 0 (
    echo ✅ MongoDB is RUNNING
    echo.
    echo Active connections:
    netstat -ano | findstr ":27017"
    echo.
    
    REM Test connection with Node.js
    if exist test-mongo-connection.js (
        echo Testing database connection...
        echo.
        node test-mongo-connection.js
    )
) else (
    echo ❌ MongoDB is NOT RUNNING
    echo.
    echo To start MongoDB, run: start-mongodb.bat
    echo.
)

echo.
echo Configuration:
echo   - Database: clinic-cms
echo   - Connection: mongodb://localhost:27017/clinic-cms
echo   - Data Path: %~dp0data\db
echo.

pause










