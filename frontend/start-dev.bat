@echo off
echo ========================================
echo   Clinic Frontend Development Server
echo ========================================
echo.
echo Choose your access mode:
echo 1. Localhost only (fastest, local access only)
echo 2. Network access (for mobile testing)
echo 3. Default (current vite.config.ts settings)
echo.
set /p choice="Enter your choice (1-3): "

if "%choice%"=="1" (
    echo Starting with localhost access...
    npm run dev:local
) else if "%choice%"=="2" (
    echo Starting with network access for mobile testing...
    echo Your app will be available at: http://192.168.118.157:5175
    echo.
    npm run dev:network
) else if "%choice%"=="3" (
    echo Starting with default settings...
    npm run dev
) else (
    echo Invalid choice. Starting with default settings...
    npm run dev
)
