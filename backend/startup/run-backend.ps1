$ErrorActionPreference = "Stop"

# Determine important paths
$backendDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $backendDir

# Ensure logs directory exists
$logDir = Join-Path $backendDir "logs"
New-Item -ItemType Directory -Path $logDir -Force | Out-Null
$outLog = Join-Path $logDir "startup.out.log"
$errLog = Join-Path $logDir "startup.err.log"

# Prefer managed starter to avoid duplicate instances
$starter = Join-Path $backendDir "start-server.js"
$node = $null
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if ($nodeCmd) { $node = $nodeCmd.Source }
if (-not $node) {
    throw "Node.js is not available in PATH. Please install Node 18+ and ensure 'node' is accessible."
}

# Build command: run in production
$env:NODE_ENV = "production"

if (Test-Path $starter) {
    $exe = $node
    $args = "`"$starter`" start"
} else {
    # Fallback to running server.js directly
    $server = Join-Path $backendDir "server.js"
    if (-not (Test-Path $server)) { throw "Backend entry not found: $starter or $server" }
    $exe = $node
    $args = "`"$server`""
}

# Start detached with logs
Start-Process -FilePath $exe -ArgumentList $args -WorkingDirectory $backendDir -WindowStyle Hidden -RedirectStandardOutput $outLog -RedirectStandardError $errLog

