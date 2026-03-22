@echo off
echo Starting backend server...
cd /d C:\clinic-new-life\backend
echo Current directory: %CD%
echo Starting server on port 5002...
npm run dev
pause 