@echo off
echo.
echo ========================================
echo    AUTOMATIC DATABASE FIX TOOL
echo ========================================
echo.
echo This will fix ALL database reference issues
echo and ensure only clinic-cms is used.
echo.

echo Starting comprehensive database fix...
node comprehensive-database-fix.js

echo.
echo Database fix completed!
echo.
pause
