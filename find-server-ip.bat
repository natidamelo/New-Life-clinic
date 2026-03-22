@echo off
echo =========================================
echo CLINIC MANAGEMENT SYSTEM - FIND SERVER IP
echo =========================================
echo.
echo This script helps you find the correct IP address to use from other PCs.
echo.

REM Get all IP addresses
echo Getting all network interfaces...
echo.

REM Get the main IPv4 address
for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr /C:"IPv4 Address" ^| findstr /V "127.0.0.1"') do (
    set SERVER_IP=%%i
    set SERVER_IP=!SERVER_IP: =!
    goto :found_ip
)

:found_ip
if "%SERVER_IP%"=="" (
    echo ❌ Could not find IP address
    echo Make sure your PC is connected to a network
) else (
    echo ✅ Found IP Address: %SERVER_IP%
)

echo.
echo =========================================
echo ACCESS INFORMATION
echo =========================================
echo.
echo Use these addresses from other PCs on the SAME network:
echo.
echo Frontend (Web Interface):
echo   http://%SERVER_IP%:5175/
echo.
echo Backend API:
echo   http://%SERVER_IP%:5002/api/
echo.
echo Example curl tests from other PC:
echo   curl http://%SERVER_IP%:5002/
echo   curl http://%SERVER_IP%:5175
echo.

echo.
echo =========================================
echo TROUBLESHOOTING
echo =========================================
echo.
if "%SERVER_IP:~0,11%"=="192.168.34." (
    echo ✅ Server is on 192.168.34.x network
    echo.
    echo For client PC on 192.168.22.x network:
    echo ❌ DIFFERENT NETWORK SEGMENTS
    echo.
    echo SOLUTIONS:
    echo 1. Connect client PC to the same WiFi as server
    echo 2. Or configure router to bridge both networks
    echo 3. Or use port forwarding if behind different routers
    echo.
) else if "%SERVER_IP:~0,11%"=="192.168.1." (
    echo ✅ Server is on 192.168.1.x network (most common)
    echo Client PC should also be on 192.168.1.x network
    echo.
) else if "%SERVER_IP:~0,11%"=="192.168.0." (
    echo ✅ Server is on 192.168.0.x network
    echo Client PC should also be on 192.168.0.x network
    echo.
) else (
    echo ❓ Server is on %SERVER_IP:~0,11%x network
    echo Client PC should be on the same network segment
)

echo.
echo QUICK TESTS:
echo 1. Run 'network-connectivity-troubleshooting.bat' for detailed analysis
echo 2. From client PC: ping %SERVER_IP%
echo 3. From client PC: curl http://%SERVER_IP%:5002/
echo.

echo.
echo For complete troubleshooting guide, see NETWORK_TROUBLESHOOTING_GUIDE.md
echo.

pause
