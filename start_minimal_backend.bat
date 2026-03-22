@echo off
REM Updated script to start minimal backend inside backend folder
cd /d "C:\clinic-new-life\backend"
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5002"') do taskkill /pid %%a /f >nul 2>&1
node minimal_backend_server.js 