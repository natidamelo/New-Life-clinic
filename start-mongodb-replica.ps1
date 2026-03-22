# PowerShell script to start MongoDB replica set on Windows
# Run this script as Administrator

Write-Host "🚀 Starting MongoDB Replica Set..." -ForegroundColor Green

# Create data directories if they don't exist
$dataPath = "C:\data"
if (-not (Test-Path $dataPath)) {
    New-Item -ItemType Directory -Path $dataPath
}

for ($i = 0; $i -lt 3; $i++) {
    $dir = "$dataPath\rs0-$i"
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir
        Write-Host "✅ Created directory: $dir" -ForegroundColor Cyan
    }
}

# Start MongoDB instances
Write-Host "`n🔄 Starting MongoDB instances..." -ForegroundColor Yellow

# Instance 1 (Port 27017)
Start-Process -FilePath "mongod" -ArgumentList "--replSet rs0 --port 27017 --dbpath C:\data\rs0-0 --bind_ip localhost" -WindowStyle Minimized
Write-Host "✅ Started MongoDB on port 27017" -ForegroundColor Green

# Instance 2 (Port 27018)
Start-Process -FilePath "mongod" -ArgumentList "--replSet rs0 --port 27018 --dbpath C:\data\rs0-1 --bind_ip localhost" -WindowStyle Minimized
Write-Host "✅ Started MongoDB on port 27018" -ForegroundColor Green

# Instance 3 (Port 27019)
Start-Process -FilePath "mongod" -ArgumentList "--replSet rs0 --port 27019 --dbpath C:\data\rs0-2 --bind_ip localhost" -WindowStyle Minimized
Write-Host "✅ Started MongoDB on port 27019" -ForegroundColor Green

Write-Host "`n⏳ Waiting 10 seconds for MongoDB to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

Write-Host "`n📝 Next steps:" -ForegroundColor Cyan
Write-Host "1. Open a new terminal and run: mongosh --port 27017"
Write-Host "2. In mongosh, run the following command to initialize the replica set:"
Write-Host ""
Write-Host 'rs.initiate({' -ForegroundColor Yellow
Write-Host '  _id: "rs0",' -ForegroundColor Yellow
Write-Host '  members: [' -ForegroundColor Yellow
Write-Host '    { _id: 0, host: "localhost:27017" },' -ForegroundColor Yellow
Write-Host '    { _id: 1, host: "localhost:27018" },' -ForegroundColor Yellow
Write-Host '    { _id: 2, host: "localhost:27019" }' -ForegroundColor Yellow
Write-Host '  ]' -ForegroundColor Yellow
Write-Host '})' -ForegroundColor Yellow
Write-Host ""
Write-Host "3. Wait 10 seconds and run: rs.status()"
Write-Host "4. Update your .env file:"
Write-Host '   MONGODB_URI=mongodb://localhost:27017,localhost:27018,localhost:27019/clinic_db?replicaSet=rs0' -ForegroundColor Green
Write-Host ""
Write-Host "✅ MongoDB replica set processes started!" -ForegroundColor Green
Write-Host ""
Write-Host "To stop the replica set later, run: .\stop-mongodb-replica.ps1" -ForegroundColor Cyan

