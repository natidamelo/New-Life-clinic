@echo off
echo Installing backend dependencies...
cd /d C:\clinic-new-life\backend
echo Current directory: %CD%
npm install mongodb express-async-handler express-rate-limit
echo Dependencies installed!
echo Starting backend server...
npm run dev
pause 