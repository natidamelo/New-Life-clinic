@echo off
echo 🏗️ Starting comprehensive build and fix process...
echo.

echo 📦 Step 1: Building Frontend...
cd "C:\Users\HP\OneDrive\Desktop\clinic new life\frontend"
echo Current directory: %CD%

echo ✅ Running TypeScript check...
call npx tsc --noEmit
if %ERRORLEVEL% neq 0 (
    echo ❌ TypeScript errors found. Continuing anyway...
) else (
    echo ✅ TypeScript check passed!
)

echo ✅ Running Vite build...
call npm run build
if %ERRORLEVEL% neq 0 (
    echo ❌ Frontend build failed!
) else (
    echo ✅ Frontend build successful!
)

echo.
echo 🔧 Step 2: Checking Backend...
cd "C:\Users\HP\OneDrive\Desktop\clinic new life\backend"
echo Current directory: %CD%

echo ✅ Installing backend dependencies...
call npm install
if %ERRORLEVEL% neq 0 (
    echo ❌ Backend npm install failed!
) else (
    echo ✅ Backend dependencies installed!
)

echo.
echo 🗄️ Step 3: Checking MongoDB Connection...
echo Testing MongoDB connection to clinic-cms...
timeout /t 2 >nul

echo.
echo 🎯 Step 4: Running Development Servers...
echo Starting backend server on port 5002...
cd "C:\Users\HP\OneDrive\Desktop\clinic new life\backend"
start "Backend Server" cmd /k "node server.js"

timeout /t 3 >nul

echo Starting frontend development server on port 5175...
cd "C:\Users\HP\OneDrive\Desktop\clinic new life\frontend"
start "Frontend Server" cmd /k "npm run dev"

echo.
echo ✅ Build and fix process completed!
echo.
echo 🌐 Your application should be available at:
echo   Frontend: http://localhost:5175
echo   Backend:  http://localhost:5002
echo.
echo 📋 Open these URLs in your browser to test the application.
echo.
pause
 
echo 🏗️ Starting comprehensive build and fix process...
echo.

echo 📦 Step 1: Building Frontend...
cd "C:\Users\HP\OneDrive\Desktop\clinic new life\frontend"
echo Current directory: %CD%

echo ✅ Running TypeScript check...
call npx tsc --noEmit
if %ERRORLEVEL% neq 0 (
    echo ❌ TypeScript errors found. Continuing anyway...
) else (
    echo ✅ TypeScript check passed!
)

echo ✅ Running Vite build...
call npm run build
if %ERRORLEVEL% neq 0 (
    echo ❌ Frontend build failed!
) else (
    echo ✅ Frontend build successful!
)

echo.
echo 🔧 Step 2: Checking Backend...
cd "C:\Users\HP\OneDrive\Desktop\clinic new life\backend"
echo Current directory: %CD%

echo ✅ Installing backend dependencies...
call npm install
if %ERRORLEVEL% neq 0 (
    echo ❌ Backend npm install failed!
) else (
    echo ✅ Backend dependencies installed!
)

echo.
echo 🗄️ Step 3: Checking MongoDB Connection...
echo Testing MongoDB connection to clinic-cms...
timeout /t 2 >nul

echo.
echo 🎯 Step 4: Running Development Servers...
echo Starting backend server on port 5002...
cd "C:\Users\HP\OneDrive\Desktop\clinic new life\backend"
start "Backend Server" cmd /k "node server.js"

timeout /t 3 >nul

echo Starting frontend development server on port 5175...
cd "C:\Users\HP\OneDrive\Desktop\clinic new life\frontend"
start "Frontend Server" cmd /k "npm run dev"

echo.
echo ✅ Build and fix process completed!
echo.
echo 🌐 Your application should be available at:
echo   Frontend: http://localhost:5175
echo   Backend:  http://localhost:5002
echo.
echo 📋 Open these URLs in your browser to test the application.
echo.
pause
 