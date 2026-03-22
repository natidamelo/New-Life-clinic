@echo off
echo ==============================
echo  Starting Backend & Frontend 
echo ==============================

:: Kill any process on ports 5002 and 5175
for %%p in (5002 5175) do (
  echo Killing port %%p if in use...
  npx kill-port %%p >nul 2>&1
)

:: Launch backend (minimal server)
start "Backend" cmd /k "cd /d \"C:\Users\HP\OneDrive\Desktop\clinic new life\" && node minimal_backend_server.js"

:: Small delay to ensure backend binds
timeout /t 2 >nul

:: Launch frontend (Vite on 5175)
start "Frontend" cmd /k "cd /d \"C:\Users\HP\OneDrive\Desktop\clinic new life\frontend\" && npm run dev"

echo Both servers are starting in their own windows.
echo Backend : http://localhost:5002
echo Frontend: http://localhost:5175
echo.
echo Close those windows to stop the servers.
pause 