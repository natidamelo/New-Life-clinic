@echo off
title New Life Clinic — System Startup
color 0A
echo.
echo  ============================================
echo   NEW LIFE CLINIC — CCTV SYSTEM STARTUP
echo  ============================================
echo.

:: Find PM2
set PM2_CMD=pm2

:: Stop old processes if any
echo [1/3] Stopping any previous processes...
%PM2_CMD% delete all >nul 2>&1

:: Start all services via ecosystem config
echo [2/3] Starting backend + go2rtc via PM2...
cd /d "C:\Users\HP\OneDrive\Desktop\clinic new life"
%PM2_CMD% start ecosystem.config.js

:: Wait for startup
echo [3/3] Waiting 20 seconds for services to boot...
timeout /t 20 /nobreak >nul

:: Status check
echo.
echo  ============================================
%PM2_CMD% list
echo  ============================================
echo.
echo  Backend:        http://localhost:5002
echo  go2rtc API:     http://192.168.1.25:1984
echo  CCTV Dashboard: http://localhost:3000/app/cctv
echo.
echo  To see live logs: pm2 logs
echo  To stop all:      pm2 delete all
echo.
echo  Services are running in background.
echo  You can close this window.
echo.
pause
