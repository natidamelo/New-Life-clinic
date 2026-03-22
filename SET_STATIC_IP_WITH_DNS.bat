@echo off
echo ========================================
echo  Set Static IP WITH DNS for Clinic WiFi
echo ========================================
echo.
echo This will configure:
echo - Static IP: 10.99.120.100
echo - Gateway: 10.99.120.1
echo - DNS: 10.99.120.1 and 8.8.8.8 (for internet)
echo.
echo IMPORTANT: Make sure you're connected to CLINIC WiFi first!
echo.
pause

echo.
echo Setting static IP address...
netsh interface ip set address "Wi-Fi" static 10.99.120.100 255.255.255.0 10.99.120.1

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Failed to set static IP!
    echo Make sure you're running as Administrator.
    echo.
    pause
    exit /b 1
)

echo.
echo Setting DNS servers (for internet access)...
netsh interface ip set dns "Wi-Fi" static 10.99.120.1 primary
netsh interface ip add dns "Wi-Fi" 8.8.8.8 index=2

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo WARNING: DNS configuration may have issues.
)

echo.
echo ========================================
echo Configuration Complete!
echo ========================================
echo.
echo Static IP: 10.99.120.100
echo Gateway: 10.99.120.1
echo DNS: 10.99.120.1, 8.8.8.8
echo.
echo Testing internet connection...
ping -n 1 8.8.8.8 >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo ✅ Internet is working!
) else (
    echo ⚠️ Internet test failed. Please check your WiFi connection.
)
echo.
pause










