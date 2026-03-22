# PowerShell script to start MongoDB on Windows

Write-Host "Attempting to start MongoDB..." -ForegroundColor Yellow

# Try to start MongoDB service
try {
    $service = Get-Service -Name MongoDB -ErrorAction Stop
    if ($service.Status -eq 'Running') {
        Write-Host "✅ MongoDB service is already running" -ForegroundColor Green
    } else {
        Write-Host "Starting MongoDB service..." -ForegroundColor Yellow
        Start-Service -Name MongoDB -ErrorAction Stop
        Write-Host "✅ MongoDB service started successfully" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Could not start MongoDB service: $_" -ForegroundColor Red
    Write-Host "`nTrying alternative method..." -ForegroundColor Yellow
    
    # Try to start MongoDB manually
    try {
        $mongodPath = "C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe"
        if (Test-Path $mongodPath) {
            Write-Host "Starting MongoDB manually from: $mongodPath" -ForegroundColor Yellow
            Write-Host "Note: You may need to run this PowerShell window as Administrator" -ForegroundColor Yellow
            Start-Process -FilePath $mongodPath -ArgumentList "--dbpath", "C:\data\db" -WindowStyle Minimized
            Write-Host "✅ MongoDB process started" -ForegroundColor Green
        } else {
            Write-Host "❌ MongoDB executable not found at: $mongodPath" -ForegroundColor Red
            Write-Host "Please start MongoDB manually or check your installation." -ForegroundColor Yellow
        }
    } catch {
        Write-Host "❌ Failed to start MongoDB manually: $_" -ForegroundColor Red
        Write-Host "`nPlease try one of the following:" -ForegroundColor Yellow
        Write-Host "1. Run PowerShell as Administrator and try again" -ForegroundColor White
        Write-Host "2. Start MongoDB service manually from Services (services.msc)" -ForegroundColor White
        Write-Host "3. Start MongoDB from command line: mongod --dbpath C:\data\db" -ForegroundColor White
    }
}

Write-Host "`nWaiting 3 seconds for MongoDB to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# Check if MongoDB is accessible
try {
    $connection = Test-NetConnection -ComputerName localhost -Port 27017 -WarningAction SilentlyContinue
    if ($connection.TcpTestSucceeded) {
        Write-Host "✅ MongoDB is now accessible on localhost:27017" -ForegroundColor Green
    } else {
        Write-Host "⚠️  MongoDB may still be starting. Please wait a few more seconds." -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  Could not verify MongoDB connection" -ForegroundColor Yellow
}
