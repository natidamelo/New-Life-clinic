# PowerShell script to stop MongoDB replica set on Windows

Write-Host "🛑 Stopping MongoDB Replica Set..." -ForegroundColor Red

# Stop all mongod processes
Get-Process mongod -ErrorAction SilentlyContinue | Stop-Process -Force

Write-Host "✅ MongoDB replica set stopped" -ForegroundColor Green
Write-Host ""
Write-Host "Note: Data is preserved in C:\data\rs0-* directories" -ForegroundColor Cyan
Write-Host "To start again, run: .\start-mongodb-replica.ps1" -ForegroundColor Cyan

