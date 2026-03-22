@echo off
echo =========================================
echo CLINIC MANAGEMENT SYSTEM - SETUP SCRIPT
echo =========================================
echo.

echo [1/5] Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from: https://nodejs.org/
    echo.
    pause
    exit /b 1
) else (
    echo ✓ Node.js is installed
)

echo.
echo [2/5] Installing backend dependencies...
cd backend
if exist package.json (
    npm install
    if errorlevel 1 (
        echo ERROR: Failed to install backend dependencies
        cd ..
        pause
        exit /b 1
    ) else (
        echo ✓ Backend dependencies installed
    )
) else (
    echo ERROR: package.json not found in backend folder
    cd ..
    pause
    exit /b 1
)
cd ..

echo.
echo [3/5] Installing frontend dependencies...
cd frontend
if exist package.json (
    npm install
    if errorlevel 1 (
        echo ERROR: Failed to install frontend dependencies
        cd ..
        pause
        exit /b 1
    ) else (
        echo ✓ Frontend dependencies installed
    )
) else (
    echo ERROR: package.json not found in frontend folder
    cd ..
    pause
    exit /b 1
)
cd ..

echo.
echo [4/5] Setting up environment configuration...
if not exist .env (
    echo Creating .env file...
    (
        echo # =========================================
        echo # CLINIC MANAGEMENT SYSTEM - ENVIRONMENT CONFIGURATION
        echo # =========================================
        echo.
        echo # Server Configuration
        echo NODE_ENV=development
        echo PORT=5002
        echo HOST=localhost
        echo.
        echo # Database Configuration
        echo MONGO_URI=mongodb://localhost:27017/clinic-cms
        echo.
        echo # Authentication ^& Security
        echo JWT_SECRET=clinic-management-system-default-secret-key-12345
        echo JWT_EXPIRATION=24h
        echo.
        echo # CORS Configuration
        echo FRONTEND_URL=http://localhost:5173
        echo ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:5002
        echo.
        echo # Session Configuration
        echo SESSION_SECRET=clinic-session-secret-key-67890
        echo.
        echo # API Rate Limiting
        echo RATE_LIMIT_WINDOW_MS=900000
        echo RATE_LIMIT_MAX_REQUESTS=100
    ) > .env
    echo ✓ .env file created
) else (
    echo ✓ .env file already exists
)

echo.
echo [5/5] Starting MongoDB (if needed)...
echo Checking if MongoDB is running...
mongod --version >nul 2>&1
if errorlevel 1 (
    echo WARNING: MongoDB not found in PATH
    echo Make sure MongoDB is installed and running on port 27017
    echo Or update MONGO_URI in .env file if using different database
) else (
    echo ✓ MongoDB is available
)

echo.
echo =========================================
echo SETUP COMPLETE!
echo =========================================
echo.
echo To start the application:
echo 1. Make sure MongoDB is running (or update MONGO_URI in .env)
echo 2. Run: npm run dev
echo.
echo For production deployment:
echo 1. Update .env with production values
echo 2. Run: npm run start-all
echo.
echo Common issues on other PCs:
echo - Install Node.js
echo - Install and start MongoDB
echo - Update firewall settings if needed
echo - Check if port 5002 is available
echo.
pause
