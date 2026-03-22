@echo off
echo ========================================
echo Fixing Nuhamin's Procedures Assignment
echo ========================================
echo.
echo This script will:
echo 1. Check Nuhamin's user account
echo 2. Find all procedures in the database
echo 3. Assign unassigned procedures to Nuhamin
echo 4. Reassign all procedures to Nuhamin
echo.
echo Press any key to continue...
pause > nul
echo.

cd backend
node scripts/assign-procedures-to-nuhamin.js

echo.
echo ========================================
echo Done! Check the output above for results.
echo ========================================
echo.
pause

