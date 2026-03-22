Write-Host "🔧 COMPREHENSIVE DATABASE REFERENCE FIX" -ForegroundColor Green
Write-Host "=======================================" -ForegroundColor Green
Write-Host ""

# Get all JavaScript files
$files = Get-ChildItem -Recurse -Include "*.js" | Where-Object { 
    $_.FullName -notmatch "node_modules|\.git|database-fix-backup|logs|uploads" 
}

$totalFixed = 0
$totalChanges = 0

Write-Host "🔍 Scanning $($files.Count) files for database issues..." -ForegroundColor Yellow

foreach ($file in $files) {
    try {
        $content = Get-Content $file.FullName -Raw
        $originalContent = $content
        $changesMade = 0
        
        # Fix MongoDB connection strings
        $content = $content -replace 'mongodb://[^/]+/clinic(?![a-zA-Z_-])', 'mongodb://localhost:27017/clinic-cms'
        $content = $content -replace 'mongodb://[^/]+/clinic-management(?![a-zA-Z_-])', 'mongodb://localhost:27017/clinic-cms'
        $content = $content -replace 'mongodb://[^/]+/clinic-management-system(?![a-zA-Z_-])', 'mongodb://localhost:27017/clinic-cms'
        $content = $content -replace 'mongodb://[^/]+/clinic_new_life(?![a-zA-Z_-])', 'mongodb://localhost:27017/clinic-cms'
        $content = $content -replace 'mongodb://[^/]+/clinic_management(?![a-zA-Z_-])', 'mongodb://localhost:27017/clinic-cms'
        $content = $content -replace 'mongodb://[^/]+/clinic_db(?![a-zA-Z_-])', 'mongodb://localhost:27017/clinic-cms'
        $content = $content -replace 'mongodb://[^/]+/clinic_test(?![a-zA-Z_-])', 'mongodb://localhost:27017/clinic-cms'
        
        # Fix database name references
        $content = $content -replace "'clinic'", "'clinic-cms'"
        $content = $content -replace '"clinic"', "'clinic-cms'"
        $content = $content -replace "'clinic-management'", "'clinic-cms'"
        $content = $content -replace '"clinic-management"', "'clinic-cms'"
        $content = $content -replace "'clinic-management-system'", "'clinic-cms'"
        $content = $content -replace '"clinic-management-system"', "'clinic-cms'"
        $content = $content -replace "'clinic_new_life'", "'clinic-cms'"
        $content = $content -replace '"clinic_new_life"', "'clinic-cms'"
        $content = $content -replace "'clinic_management'", "'clinic-cms'"
        $content = $content -replace '"clinic_management"', "'clinic-cms'"
        
        # Fix over-fixed database names
        $content = $content -replace 'clinic-cms(-cms)+', 'clinic-cms'
        
        if ($content -ne $originalContent) {
            # Create backup
            $backupPath = "$($file.FullName).ps1-fix-backup"
            Set-Content -Path $backupPath -Value $originalContent
            
            # Write fixed content
            Set-Content -Path $file.FullName -Value $content
            
            Write-Host "✅ Fixed: $($file.Name)" -ForegroundColor Green
            $totalFixed++
            $totalChanges++
        }
    }
    catch {
        Write-Host "❌ Error with $($file.Name): $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "📊 FIX RESULTS" -ForegroundColor Cyan
Write-Host "==============" -ForegroundColor Cyan
Write-Host "🔧 Files Fixed: $totalFixed" -ForegroundColor Green
Write-Host "🔄 Total Changes: $totalChanges" -ForegroundColor Green

if ($totalFixed -gt 0) {
    Write-Host ""
    Write-Host "✅ ALL database reference issues fixed!" -ForegroundColor Green
    Write-Host "💡 Backups created with .ps1-fix-backup extension" -ForegroundColor Yellow
    Write-Host "🚨 All database names should now be exactly 'clinic-cms'" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "✅ No database reference issues found!" -ForegroundColor Green
}

Write-Host ""
Write-Host "🔍 Comprehensive fix completed!" -ForegroundColor Cyan
Read-Host "Press Enter to continue..."
