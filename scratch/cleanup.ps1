$f = "c:\Users\HP\OneDrive\Desktop\clinic new life\frontend\src\pages\Dashboard\StaffControlCenter.tsx"
$lines = [System.IO.File]::ReadAllLines($f)
$newLines = New-Object System.Collections.ArrayList
for($i=0; $i -lt $lines.Length; $i++) {
    # Remove lines 1477-1857 (0-indexed: 1476-1856)
    if($i -ge 1476 -and $i -le 1856) { continue }
    [void]$newLines.Add($lines[$i])
}
[System.IO.File]::WriteAllLines($f, $newLines.ToArray())
Write-Host "Done. Removed old duplicate attendance code. New total lines: $($newLines.Count)"
