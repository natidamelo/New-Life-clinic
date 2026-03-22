@echo off
echo ========================================
echo   Restarting Frontend Development Server
echo ========================================
echo.

echo Stopping any existing frontend processes...
taskkill /f /im node.exe 2>nul

echo.
echo Starting frontend development server...
cd frontend
npm run dev

echo.
echo Frontend server started!
echo Please open http://localhost:5175 in your browser
echo.
echo If you still see connection errors:
echo 1. Press Ctrl+Shift+R to hard refresh
echo 2. Clear browser storage in Developer Tools
echo 3. Try opening in an incognito/private window
 