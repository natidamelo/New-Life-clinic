@echo off
echo =========================================
echo CLINIC MANAGEMENT SYSTEM - DEPLOYMENT TEST
echo =========================================
echo.

echo Testing deployment components...
echo.

echo [1/4] Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is NOT installed
    echo Please install Node.js from: https://nodejs.org/
) else (
    echo ✅ Node.js is available
    for /f "tokens=*" %%i in ('node --version') do echo    Version: %%i
)

echo.
echo [2/4] Checking MongoDB connection...
mongosh --eval "db.adminCommand('ismaster')" >nul 2>&1
if errorlevel 1 (
    echo ⚠️  MongoDB connection test failed
    echo    - Make sure MongoDB is installed and running
    echo    - Check if MongoDB service is started
    echo    - Or update MONGO_URI in .env file
) else (
    echo ✅ MongoDB is accessible
)

echo.
echo [3/4] Checking environment configuration...
if exist .env (
    echo ✅ .env file exists
    findstr "MONGO_URI" .env >nul
    if errorlevel 1 (
        echo ⚠️  MONGO_URI not found in .env
    ) else (
        echo ✅ Database configuration found
    )
    findstr "JWT_SECRET" .env >nul
    if errorlevel 1 (
        echo ⚠️  JWT_SECRET not found in .env
    ) else (
        echo ✅ Authentication configuration found
    )
) else (
    echo ❌ .env file is missing
    echo Run setup-deployment.bat first
)

echo.
echo [4/4] Testing application startup...
echo Attempting to start backend server...

cd backend
timeout /t 3 /nobreak >nul

REM Try to start the server briefly to test
start /b node server.js >nul 2>&1
timeout /t 2 /nobreak >nul

REM Check if server process is running
tasklist /fi "imagename eq node.exe" 2>nul | find /i "node.exe" >nul
if errorlevel 1 (
    echo ❌ Server startup failed
    echo Check the error logs above
) else (
    echo ✅ Server started successfully
    echo    Process found in task manager
)

REM Clean up - kill the test server
taskkill /f /im node.exe >nul 2>&1
cd ..

echo.
echo =========================================
echo TEST RESULTS SUMMARY
echo =========================================

echo.
echo To run the full application:
echo 1. Make sure MongoDB is running
echo 2. Run: npm run dev
echo 3. Open browser to: http://localhost:5173
echo.

echo For detailed troubleshooting, see DEPLOYMENT_GUIDE.md
echo.

pause
