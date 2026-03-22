@echo off
echo Starting frontend server...
cd /d "C:\Users\HP\OneDrive\Desktop\clinic new life\frontend"
echo Current directory: %CD%
echo Starting frontend on port 5175...
echo Backend API: http://localhost:5002
npm run dev -- --port 5175
pause 