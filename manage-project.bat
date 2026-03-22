@echo off
title Clinic Management System - Project Manager
color 0A

:menu
cls
echo ========================================
echo    CLINIC MANAGEMENT SYSTEM
echo ========================================
echo.
echo [1] Start Backend Server (Port 5002)
echo [2] Test Server Connection
echo [3] View Server Status
echo [4] Stop Server
echo [5] Install Dependencies
echo [6] View Logs
echo [7] Exit
echo.
echo ========================================
set /p choice="Enter your choice (1-7): "

if "%choice%"=="1" goto start_server
if "%choice%"=="2" goto test_server
if "%choice%"=="3" goto status
if "%choice%"=="4" goto stop_server
if "%choice%"=="5" goto install_deps
if "%choice%"=="6" goto view_logs
if "%choice%"=="7" goto exit
goto menu

:start_server
cls
echo ========================================
echo    STARTING BACKEND SERVER
echo ========================================
echo.
echo Starting server on port 5002...
echo.

cd backend
echo [BACKEND] Installing dependencies...
call npm install

echo [BACKEND] Starting server...
start "Backend Server - Port 5002" cmd /k "node server.js"

echo.
echo [SUCCESS] Backend server started on port 5002!
echo.
echo Server URL: http://localhost:5002
echo Health Check: http://localhost:5002/ping
echo.
pause
goto menu

:test_server
cls
echo ========================================
echo    TESTING SERVER CONNECTION
echo ========================================
echo.

echo Testing backend server on port 5002...
echo.

netstat -ano | findstr :5002 > nul
if %errorlevel% equ 0 (
    echo [SUCCESS] Port 5002 is in use - server is running!
    echo.
    echo Testing health check...
    curl -s http://localhost:5002/ping > nul
    if %errorlevel% equ 0 (
        echo [SUCCESS] Health check passed!
        echo Backend server is responding correctly.
        echo.
        echo Response:
        curl -s http://localhost:5002/ping
    ) else (
        echo [WARNING] Health check failed - server may not be fully started.
    )
) else (
    echo [ERROR] Port 5002 is not in use - server is not running!
    echo.
    echo Please start the server first.
)

echo.
pause
goto menu

:status
cls
echo ========================================
echo    SERVER STATUS
echo ========================================
echo.

echo Checking server status...
echo.

netstat -ano | findstr :5002
if %errorlevel% equ 0 (
    echo.
    echo [STATUS] Server is running on port 5002
    echo.
    echo Connection details:
    echo - Backend URL: http://localhost:5002
    echo - Health Check: http://localhost:5002/ping
    echo - API Base: http://localhost:5002/api
) else (
    echo [STATUS] Server is not running
    echo.
    echo To start the server, choose option 1 from the main menu.
)

echo.
pause
goto menu

:stop_server
cls
echo ========================================
echo    STOPPING SERVER
echo ========================================
echo.

echo Stopping server on port 5002...
echo.

for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5002') do (
    echo Stopping process ID: %%a
    taskkill /PID %%a /F > nul 2>&1
)

echo.
echo [SUCCESS] Server stopped!
echo.
pause
goto menu

:install_deps
cls
echo ========================================
echo    INSTALLING DEPENDENCIES
echo ========================================
echo.

echo Installing backend dependencies...
cd backend
call npm install

echo.
echo [SUCCESS] Dependencies installed!
echo.
pause
goto menu

:view_logs
cls
echo ========================================
echo    VIEWING LOGS
echo ========================================
echo.

echo Recent server activity:
echo.

if exist "backend\logs\combined.log" (
    echo [COMBINED LOG]
    type "backend\logs\combined.log" | tail -20
) else (
    echo No combined log file found.
)

echo.
if exist "backend\logs\error.log" (
    echo [ERROR LOG]
    type "backend\logs\error.log" | tail -10
) else (
    echo No error log file found.
)

echo.
pause
goto menu

:exit
cls
echo ========================================
echo    THANK YOU FOR USING
echo    CLINIC MANAGEMENT SYSTEM
echo ========================================
echo.
echo Goodbye!
pause
exit 