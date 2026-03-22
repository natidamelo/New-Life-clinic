@echo off
echo ========================================
echo  Fix Internet Access (Add DNS Servers)
echo ========================================
echo.
echo If you set static IP but lost internet access, 
echo this script will add DNS servers.
echo.
echo IMPORTANT: Make sure you're connected to CLINIC WiFi!
echo.
pause

echo.
echo Checking current network...
ipconfig | findstr /i "IPv4"
echo.

echo Setting DNS servers...
echo - Primary DNS: Gateway (for local network)
echo - Secondary DNS: 8.8.8.8 (for internet)
echo.

:: Get the gateway IP from WiFi adapter
for /f "tokens=2 delims=:" %%a in ('netsh interface ip show config name="Wi-Fi" ^| findstr /i "Default Gateway"') do set GATEWAY=%%a
set GATEWAY=%GATEWAY:~1%

echo Gateway detected: %GATEWAY%
echo.

if "%GATEWAY%"=="" (
    echo ERROR: Could not detect gateway. Please check WiFi connection.
    pause
    exit /b 1
)

echo Setting DNS servers...
netsh interface ip set dns "Wi-Fi" static %GATEWAY% primary
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to set primary DNS. Run as Administrator!
    pause
    exit /b 1
)

netsh interface ip add dns "Wi-Fi" 8.8.8.8 index=2
if %ERRORLEVEL% NEQ 0 (
    echo WARNING: Failed to set secondary DNS.
)

echo.
echo ========================================
echo DNS Configuration Complete!
echo ========================================
echo.
echo Primary DNS: %GATEWAY%
echo Secondary DNS: 8.8.8.8
echo.

echo Testing internet connection...
ping -n 2 google.com >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo ✅ Internet is working!
) else (
    echo ⚠️ Internet test failed. Trying again with IP...
    ping -n 2 8.8.8.8 >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        echo ✅ Can reach internet (DNS might need time to update)
    ) else (
        echo ❌ Cannot reach internet. Please check WiFi connection.
    )
)
echo.
pause










