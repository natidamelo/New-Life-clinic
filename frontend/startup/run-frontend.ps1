$ErrorActionPreference = "Stop"

# Determine important paths
$frontendDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $frontendDir

# Ensure logs directory exists
$logDir = Join-Path $frontendDir "logs"
New-Item -ItemType Directory -Path $logDir -Force | Out-Null
$outLog = Join-Path $logDir "startup.out.log"
$errLog = Join-Path $logDir "startup.err.log"

# Find npm
$npm = $null
$npmCmd = Get-Command npm -ErrorAction SilentlyContinue
if ($npmCmd) { $npm = $npmCmd.Source } else { throw "npm is not available in PATH. Install Node.js/npm and retry." }

# Start frontend via npm start
Start-Process -FilePath $npm -ArgumentList "run start" -WorkingDirectory $frontendDir -WindowStyle Hidden -RedirectStandardOutput $outLog -RedirectStandardError $errLog
