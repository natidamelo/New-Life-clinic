@echo off
echo.
echo ========================================
echo    DATABASE REFERENCE FIX TOOL
echo ========================================
echo.
echo This tool will fix all incorrect database references
echo in your project to use only clinic-cms database.
echo.

echo Choose an option:
echo 1. Quick Fix (Critical files only)
echo 2. Full Fix (All files - Recommended)
echo 3. Exit
echo.

set /p choice="Enter your choice (1-3): "

if "%choice%"=="1" goto quickfix
if "%choice%"=="2" goto fullfix
if "%choice%"=="3" goto exit
goto invalid

:quickfix
echo.
echo Running Quick Database Fix...
echo.
node quick-database-fix.js
echo.
echo Quick fix completed!
pause
goto exit

:fullfix
echo.
echo Running Full Database Reference Fix...
echo.
node fix-database-references.js
echo.
echo Full fix completed!
pause
goto exit

:invalid
echo.
echo Invalid choice. Please enter 1, 2, or 3.
echo.
pause
goto exit

:exit
echo.
echo Thank you for using the Database Reference Fix Tool!
echo.
pause
