@echo off
echo =========================================
echo  Running Static IP Setup as Administrator
echo =========================================
echo.
echo This will open a new window with admin rights...
echo.

REM Run PowerShell script as Administrator
powershell -Command "Start-Process powershell -ArgumentList '-ExecutionPolicy Bypass -File \"%~dp0setup-static-ip.ps1\"' -Verb RunAs"

echo.
echo Follow the prompts in the new window...
echo.
pause










