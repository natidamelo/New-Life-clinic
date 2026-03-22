# Clinic CMS Development Environment Startup Script
# PowerShell version with enhanced features

Write-Host "==========================================" -ForegroundColor Green
Write-Host "Starting Clinic CMS Development Environment" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""

# Function to check if a port is in use
function Test-Port {
    param([int]$Port)
    $connection = Test-NetConnection -ComputerName localhost -Port $Port -InformationLevel Quiet -WarningAction SilentlyContinue
    return $connection
}

# Function to check if a process is running
function Test-Process {
    param([string]$ProcessName)
    $process = Get-Process -Name $ProcessName -ErrorAction SilentlyContinue
    return $process -ne $null
}

# Check and start MongoDB
Write-Host "Checking MongoDB status..." -ForegroundColor Yellow
if (Test-Process "mongod") {
    Write-Host "[✓] MongoDB is already running" -ForegroundColor Green
} elseif (Test-Port 27017) {
    Write-Host "[✓] MongoDB service is running on port 27017" -ForegroundColor Green
} else {
    Write-Host "[!] Starting MongoDB..." -ForegroundColor Yellow
    
    # Create data directory if it doesn't exist
    if (!(Test-Path "data\db")) {
        New-Item -ItemType Directory -Path "data\db" -Force | Out-Null
        Write-Host "[!] Created data/db directory" -ForegroundColor Cyan
    }
    
    # Start MongoDB in a new window
    Start-Process -FilePath "mongod" -ArgumentList "--dbpath", ".\data\db", "--port", "27017" -WindowStyle Normal
    
    # Wait for MongoDB to start
    $timeout = 30
    $elapsed = 0
    while (!(Test-Port 27017) -and $elapsed -lt $timeout) {
        Start-Sleep -Seconds 1
        $elapsed++
        Write-Host "." -NoNewline -ForegroundColor Yellow
    }
    
    if (Test-Port 27017) {
        Write-Host ""
        Write-Host "[✓] MongoDB started successfully" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "[×] Failed to start MongoDB" -ForegroundColor Red
        Write-Host "Please ensure MongoDB is installed and accessible in PATH" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""

# Check Backend port
Write-Host "Checking Backend port (5002)..." -ForegroundColor Yellow
if (Test-Port 5002) {
    Write-Host "[!] Port 5002 is already in use. Backend might already be running." -ForegroundColor Yellow
} else {
    Write-Host "[✓] Port 5002 is available" -ForegroundColor Green
}

# Check Frontend port
Write-Host "Checking Frontend port (5173)..." -ForegroundColor Yellow
if (Test-Port 5173) {
    Write-Host "[!] Port 5173 is already in use. Frontend might already be running." -ForegroundColor Yellow
} else {
    Write-Host "[✓] Port 5173 is available" -ForegroundColor Green
}

Write-Host ""

# Start Backend Server
Write-Host "[!] Starting Backend Server (Port 5002)..." -ForegroundColor Yellow
Start-Process -FilePath "cmd" -ArgumentList "/k", "cd", "backend", "&&", "npm", "start" -WindowStyle Normal

Write-Host "[!] Waiting for backend to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Start Frontend Server
Write-Host "[!] Starting Frontend Development Server (Port 5173)..." -ForegroundColor Yellow
Start-Process -FilePath "cmd" -ArgumentList "/k", "cd", "frontend", "&&", "npm", "run", "dev" -WindowStyle Normal

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "All services are starting up!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
# Get network IP dynamically
$networkIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*"} | Select-Object -First 1).IPAddress
if (-not $networkIP) { $networkIP = "localhost" }

Write-Host ""
Write-Host "Access the application at:" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:5175 or http://$networkIP:5175" -ForegroundColor White
Write-Host "Backend API: http://localhost:5002 or http://$networkIP:5002" -ForegroundColor White
Write-Host "MongoDB: mongodb://localhost:27017" -ForegroundColor White
Write-Host ""
Write-Host "💡 Use the network IP ($networkIP) to access from other devices" -ForegroundColor Yellow
Write-Host ""
Write-Host "To stop all services, close the opened terminal windows" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press any key to close this window..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") 