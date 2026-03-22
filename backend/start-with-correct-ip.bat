@echo off
echo ========================================
echo    Starting Backend with Correct IP
echo ========================================
echo.

echo Setting environment variables...
set FRONTEND_IP=10.41.144.157
set FRONTEND_URL=
echo FRONTEND_IP=%FRONTEND_IP%
echo FRONTEND_URL=%FRONTEND_URL%

echo.
echo Starting backend server...
echo QR codes will use: http://10.41.144.157:5175
echo.

npm start
