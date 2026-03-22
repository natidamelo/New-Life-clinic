param(
    [switch]$System,
    [string]$TaskName = "ClinicBackendAutoStart"
)

$ErrorActionPreference = "Stop"

# Resolve paths
$projectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$backendDir = Join-Path $projectRoot "backend"
$runner = Join-Path $backendDir "startup\run-backend.ps1"

if (-not (Test-Path $runner)) {
    throw "Runner script not found: $runner"
}

# Ensure log directory exists
$logDir = Join-Path $backendDir "logs"
New-Item -ItemType Directory -Path $logDir -Force | Out-Null

# Build action to run PowerShell non-interactively
$pwsh = $null
$pwshCmd = Get-Command pwsh -ErrorAction SilentlyContinue
if ($pwshCmd) {
    $pwsh = $pwshCmd.Source
} else {
    $pwsh = (Get-Command powershell -ErrorAction SilentlyContinue).Source
}

$arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$runner`""

if ($System) {
    $principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -RunLevel Highest
    $trigger = New-ScheduledTaskTrigger -AtStartup
} else {
    $principal = New-ScheduledTaskPrincipal -UserId $env:UserName -RunLevel Highest
    $trigger = New-ScheduledTaskTrigger -AtLogOn
}

$action = New-ScheduledTaskAction -Execute $pwsh -Argument $arguments -WorkingDirectory $backendDir

# Remove existing task if present
try {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
} catch {}

$task = New-ScheduledTask -Action $action -Principal $principal -Trigger $trigger -Settings (New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -StartWhenAvailable)
Register-ScheduledTask -TaskName $TaskName -InputObject $task -Force | Out-Null

if ($System) {
    Write-Host "Scheduled Task '$TaskName' installed. It will start the backend on system startup."
} else {
    Write-Host "Scheduled Task '$TaskName' installed. It will start the backend on user logon."
}

