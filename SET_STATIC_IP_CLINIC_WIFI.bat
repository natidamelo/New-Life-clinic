@echo off
echo ========================================
echo  Set Static IP for Clinic WiFi WITH DNS
echo ========================================
echo.
echo This will configure:
echo - Static IP: 10.99.120.100
echo - Gateway: 10.99.120.1
echo - DNS: 10.99.120.1, 8.8.8.8 (for internet)
echo.
echo IMPORTANT: You must be connected to CLINIC WiFi first!
echo (Should show 10.99.120.x IP range)
echo.
pause

echo.
echo Setting static IP address...
netsh interface ip set address "Wi-Fi" static 10.99.120.100 255.255.255.0 10.99.120.1

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Failed to set static IP!
    echo Make sure you're running as Administrator.
    echo Make sure you're connected to Clinic WiFi (10.99.120.x)
    echo.
    pause
    exit /b 1
)

echo.
echo Setting DNS servers (IMPORTANT for internet access)...
netsh interface ip set dns "Wi-Fi" static 10.99.120.1 primary

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to set primary DNS!
    pause
    exit /b 1
)

netsh interface ip add dns "Wi-Fi" 8.8.8.8 index=2

if %ERRORLEVEL% NEQ 0 (
    echo WARNING: Failed to set secondary DNS, but primary is set.
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
timeout /t 2 /nobreak >nul
ping -n 2 google.com >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo ✅ Internet is working!
) else (
    echo Testing with IP address...
    ping -n 2 8.8.8.8 >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        echo ✅ Network is working! DNS may need a moment.
    ) else (
        echo ⚠️ Cannot reach internet. Please check WiFi connection.
    )
)

echo.
echo Current configuration:
ipconfig | findstr /i "IPv4 Subnet Gateway DNS"
echo.
echo Your permanent clinic URL: http://10.99.120.100:5175
echo.
pause










