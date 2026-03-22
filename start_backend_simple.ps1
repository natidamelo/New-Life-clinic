Write-Host "Starting Minimal Backend Server..." -ForegroundColor Green
Write-Host "================================" -ForegroundColor Yellow

# Kill any existing processes on port 5002
Write-Host "Killing existing processes on port 5002..." -ForegroundColor Cyan
Get-NetTCPConnection -LocalPort 5002 -ErrorAction SilentlyContinue | ForEach-Object {
    Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
    Write-Host "Killed process $($_.OwningProcess)" -ForegroundColor Red
}

# Start the server
Write-Host "Starting server..." -ForegroundColor Cyan
Start-Process -FilePath "node" -ArgumentList "minimal_backend_server.js" -WorkingDirectory $PWD

# Wait a moment for server to start
Write-Host "Waiting for server to start..." -ForegroundColor Cyan
Start-Sleep -Seconds 3

# Test the connection
Write-Host "Testing server connection..." -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5002/ping" -Method GET -TimeoutSec 5
    Write-Host "✅ Server is running! Response: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Response content: $($response.Content)" -ForegroundColor White
} catch {
    Write-Host "❌ Server connection failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "================================" -ForegroundColor Yellow
Write-Host "Backend server should be running on http://localhost:5002" -ForegroundColor Green
Write-Host "Frontend can now connect to the backend!" -ForegroundColor Green 