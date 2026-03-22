@echo off
echo 🏥 Clinic Management System - Quick Start
echo ========================================
echo.

echo 📋 Starting Backend Server...
echo.
cd backend
start "Backend Server" cmd /k "npm start"
cd ..

echo.
echo 📋 Starting Frontend Server...
echo.
cd frontend
start "Frontend Server" cmd /k "npm run dev"
cd ..

echo.
echo ✅ Both servers are starting...
echo.
echo 🌐 Frontend will be available at: http://localhost:5175
echo 🔧 Backend will be available at: http://localhost:5002
echo.
echo 🔑 Login Credentials:
echo    Admin: admin@clinic.com / admin123
echo    Doctor: doctor@clinic.com / doctor123
echo    Nurse: nurse@clinic.com / nurse123
echo    Reception: reception@clinic.com / reception123
echo    Lab: lab@clinic.com / lab123
echo.
echo ⏳ Please wait for both servers to fully start...
echo.
pause
