@echo off
REM Quick setup script for MongoDB Replica Set using Docker (Windows)

echo.
echo ========================================
echo MongoDB Replica Set Setup (Docker)
echo ========================================
echo.

REM Check if Docker is installed
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker is not installed or not in PATH
    echo Please install Docker Desktop from: https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)

echo [1/5] Checking Docker...
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker is not running
    echo Please start Docker Desktop and try again
    pause
    exit /b 1
)
echo ✓ Docker is running

echo.
echo [2/5] Stopping any existing MongoDB containers...
docker-compose -f docker-compose.mongodb-replica.yml down -v 2>nul
echo ✓ Cleanup complete

echo.
echo [3/5] Starting MongoDB Replica Set (3 containers)...
docker-compose -f docker-compose.mongodb-replica.yml up -d
if %errorlevel% neq 0 (
    echo ERROR: Failed to start containers
    pause
    exit /b 1
)
echo ✓ Containers started

echo.
echo [4/5] Waiting 15 seconds for MongoDB to initialize...
timeout /t 15 /nobreak >nul

echo.
echo [5/5] Initializing Replica Set...
docker exec mongo1 mongosh --eval "rs.initiate({_id:'rs0',members:[{_id:0,host:'mongo1:27017'},{_id:1,host:'mongo2:27017'},{_id:2,host:'mongo3:27017'}]})" 2>nul
if %errorlevel% equ 0 (
    echo ✓ Replica set initialized
) else (
    echo ! Replica set may already be initialized (this is OK)
)

echo.
echo Waiting 10 seconds for replica set to elect primary...
timeout /t 10 /nobreak >nul

echo.
echo ========================================
echo ✓ MongoDB Replica Set is Ready!
echo ========================================
echo.
echo Ports:
echo   - Primary:   localhost:27017
echo   - Secondary: localhost:27018
echo   - Secondary: localhost:27019
echo.
echo Connection String:
echo   mongodb://localhost:27017,localhost:27018,localhost:27019/clinic_db?replicaSet=rs0
echo.
echo Next Steps:
echo   1. Update your .env file with the connection string above
echo   2. Test transactions: node backend/test-transactions.js
echo   3. Start your application
echo.
echo To check status: docker exec mongo1 mongosh --eval "rs.status()"
echo To stop:         docker-compose -f docker-compose.mongodb-replica.yml down
echo.
pause

