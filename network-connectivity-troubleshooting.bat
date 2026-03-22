@echo off
echo =========================================
echo CLINIC MANAGEMENT SYSTEM - NETWORK CONNECTIVITY DIAGNOSTICS
echo =========================================
echo.

echo Diagnosing network connectivity issues...
echo.

REM Get server IP
for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr /C:"IPv4 Address" ^| findstr /V "127.0.0.1"') do set SERVER_IP=%%i
set SERVER_IP=%SERVER_IP: =%
echo Server IP Address: %SERVER_IP%
echo.

REM Test local connectivity
echo [1/5] Testing local server connectivity...
curl -s http://localhost:5002/ >nul 2>&1
if errorlevel 1 (
    echo ❌ Backend server not accessible locally
) else (
    echo ✅ Backend server accessible locally
)

curl -s http://localhost:5175 >nul 2>&1
if errorlevel 1 (
    echo ❌ Frontend server not accessible locally
) else (
    echo ✅ Frontend server accessible locally
)

echo.
echo [2/5] Testing server IP accessibility...
curl -s http://%SERVER_IP%:5002/ >nul 2>&1
if errorlevel 1 (
    echo ❌ Backend server not accessible on %SERVER_IP%:5002
    echo    This indicates firewall or network configuration issues
) else (
    echo ✅ Backend server accessible on %SERVER_IP%:5002
)

curl -s http://%SERVER_IP%:5175 >nul 2>&1
if errorlevel 1 (
    echo ❌ Frontend server not accessible on %SERVER_IP%:5175
    echo    This indicates firewall or network configuration issues
) else (
    echo ✅ Frontend server accessible on %SERVER_IP%:5175
)

echo.
echo [3/5] Getting network information...
echo SERVER NETWORK INFO:
echo - IP Address: %SERVER_IP%
for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr /C:"Subnet Mask"') do echo - Subnet Mask: %%i
for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr /C:"Default Gateway"') do echo - Default Gateway: %%i

echo.
echo CLIENT NETWORK INFO (to be filled by user):
echo - Client IP: 192.168.22.146
echo - Client should try: http://%SERVER_IP%:5175/
echo - Client should try: http://%SERVER_IP%:5002/api/
echo.

echo [4/5] Network connectivity analysis...
echo.

REM Analyze if IPs are on same subnet
echo Analyzing network segments:
echo - Server: %SERVER_IP% (Network: 192.168.34.0/24)
echo - Client: 192.168.22.146 (Network: 192.168.22.0/24)
echo.

if "%SERVER_IP:~0,11%"=="192.168.34." (
    if "192.168.22.146"=="192.168.34.146" (
        echo ✅ Both PCs appear to be on the same network segment
    ) else (
        echo ⚠️  PCs are on DIFFERENT network segments!
        echo    Server: 192.168.34.0/24
        echo    Client: 192.168.22.0/24
        echo.
        echo    This is why the client cannot connect directly.
    )
) else (
    echo ⚠️  Could not determine if networks match
)

echo.
echo [5/5] Providing solutions...
echo.

echo =========================================
echo NETWORK ANALYSIS COMPLETE
echo =========================================
echo.
echo DIAGNOSIS:
if "%SERVER_IP:~0,11%"=="192.168.34." (
    if "192.168.22.146"=="192.168.34.146" (
        echo ✅ Network configuration looks correct
        echo    Issue may be firewall or server configuration
    ) else (
        echo ❌ DIFFERENT NETWORK SEGMENTS DETECTED
        echo.
        echo SOLUTION REQUIRED:
        echo 1. Connect both PCs to the same WiFi router
        echo 2. Or configure router to bridge networks
        echo 3. Or use computer name if on same Windows network
        echo 4. Or set up port forwarding
    )
) else (
    echo ❓ Could not determine network configuration
)

echo.
echo IMMEDIATE ACTIONS:
echo 1. Verify both PCs are connected to the same router
echo 2. Try accessing by computer name: http://%COMPUTERNAME%:5175/
echo 3. Check router configuration for multiple network segments
echo 4. If on different routers, configure port forwarding or VPN
echo.

echo For detailed solutions, see NETWORK_TROUBLESHOOTING_GUIDE.md
echo.

pause
