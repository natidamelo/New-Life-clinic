@echo off
title New Life Clinic — go2rtc Stream Relay & Tunnel
color 0A
cd /d "C:\Users\HP\OneDrive\Desktop\clinic new life"
echo.
echo  ============================================
echo   New Life Clinic — CCTV Stream Relay & Tunnel
echo   Automated DB Sync Enabled
echo  ============================================
echo.
echo  Keep this window open while using the CCTV dashboard.
echo  Close this window to stop streaming.
echo.
node start-go2rtc-tunnel.js
pause
