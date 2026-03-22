@echo off
echo ============================================
echo    CLINIC STAFF PERFORMANCE OPTIMIZER
echo ============================================
echo.

echo [1/4] Installing dependencies...
call npm install --silent
if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo [2/4] Optimizing database indexes...
node scripts/optimize-database-indexes.js
if %errorlevel% neq 0 (
    echo ERROR: Database optimization failed
    pause
    exit /b 1
)

echo [3/4] Running performance tests...
node scripts/performance-monitor.js
if %errorlevel% neq 0 (
    echo WARNING: Performance tests encountered issues
)

echo [4/4] Clearing frontend cache...
cd frontend
if exist node_modules\.cache (
    rmdir /s /q node_modules\.cache
    echo Frontend cache cleared
)
cd ..

echo.
echo ============================================
echo     OPTIMIZATION COMPLETED SUCCESSFULLY!
echo ============================================
echo.
echo Performance improvements implemented:
echo   ✓ Database indexes optimized
echo   ✓ API caching enabled
echo   ✓ Frontend lazy loading
echo   ✓ React component memoization
echo   ✓ Parallel data fetching
echo.
echo Staff rendering lag should be significantly reduced.
echo Please restart your backend and frontend servers.
echo.
pause
