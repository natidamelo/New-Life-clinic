@echo off
echo Starting Clinic CMS Backend Server...
echo.

cd /d "%~dp0backend"

echo Checking if MongoDB is running...
netstat -ano | findstr :27017 >nul
if %errorlevel% neq 0 (
    echo ERROR: MongoDB is not running on port 27017
    echo Please start MongoDB first
    pause
    exit /b 1
)
echo MongoDB is running ✓

echo.
echo Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo Starting backend server on port 5002...
echo Server will be available at: http://localhost:5002
echo.
echo Press Ctrl+C to stop the server
echo.

call npm start

pause
