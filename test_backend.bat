@echo off
echo Testing backend server...
echo.

echo [1/2] Testing backend API endpoint...
curl -s http://localhost:5002/api/health || echo Backend not responding on port 5002

echo.
echo [2/2] Checking if backend port is in use...
netstat -ano | findstr ":5002" && echo Port 5002 is in use || echo Port 5002 is not in use

echo.
echo Test complete. Press any key to exit...
pause > nul 