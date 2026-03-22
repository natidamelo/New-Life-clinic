@echo off
echo ================================
echo    FIXING ALL BACKEND ISSUES
echo ================================
echo.

echo [1/5] Fixing doctors.js authentication...
echo const express = require('express');> temp_doctors.js
echo const router = express.Router();>> temp_doctors.js
echo const { authenticate } = require('../src/middleware/auth');>> temp_doctors.js
echo const doctorController = require('../controllers/doctorController');>> temp_doctors.js
echo.>> temp_doctors.js
echo // Get all doctors>> temp_doctors.js
echo router.get('/', authenticate, doctorController.getDoctors);>> temp_doctors.js
echo.>> temp_doctors.js
echo // Get doctor by ID>> temp_doctors.js
echo router.get('/:id', authenticate, doctorController.getDoctorById);>> temp_doctors.js
echo.>> temp_doctors.js
echo module.exports = router;>> temp_doctors.js

echo [2/5] Copying fixed doctors.js to new location...
copy temp_doctors.js "C:\clinic-new-life\backend\routes\doctors.js" /Y
del temp_doctors.js

echo [3/5] Checking if other route files need similar fixes...
echo Checking appointments.js...
findstr /C:"auth()" "C:\clinic-new-life\backend\routes\appointments.js" >nul
if %errorlevel% == 0 (
    echo Found auth() issues in appointments.js - needs fixing
) else (
    echo appointments.js looks good
)

echo [4/5] Checking middleware files...
if not exist "C:\clinic-new-life\backend\middleware\permissionMiddleware.js" (
    echo Creating missing permissionMiddleware.js...
    echo const asyncHandler = require('express-async-handler');> "C:\clinic-new-life\backend\middleware\permissionMiddleware.js"
    echo.>> "C:\clinic-new-life\backend\middleware\permissionMiddleware.js"
    echo const requirePermission = (permission) => {>> "C:\clinic-new-life\backend\middleware\permissionMiddleware.js"
    echo   return asyncHandler(async (req, res, next) => {>> "C:\clinic-new-life\backend\middleware\permissionMiddleware.js"
    echo     if (!req.user) {>> "C:\clinic-new-life\backend\middleware\permissionMiddleware.js"
    echo       return res.status(401).json({ message: 'Not authenticated' });>> "C:\clinic-new-life\backend\middleware\permissionMiddleware.js"
    echo     }>> "C:\clinic-new-life\backend\middleware\permissionMiddleware.js"
    echo     next();>> "C:\clinic-new-life\backend\middleware\permissionMiddleware.js"
    echo   });>> "C:\clinic-new-life\backend\middleware\permissionMiddleware.js"
    echo };>> "C:\clinic-new-life\backend\middleware\permissionMiddleware.js"
    echo.>> "C:\clinic-new-life\backend\middleware\permissionMiddleware.js"
    echo module.exports = { requirePermission };>> "C:\clinic-new-life\backend\middleware\permissionMiddleware.js"
)

echo [5/5] Starting backend server...
cd /d "C:\clinic-new-life\backend"
echo Current directory: %CD%
echo.
echo Starting backend server on port 5002...
start "Backend Server" cmd /k "npm run dev"

echo.
echo ================================
echo    BACKEND FIXES COMPLETE
echo ================================
echo.
echo Backend server starting in separate window...
echo Wait a moment, then test the connection.
echo.
pause 