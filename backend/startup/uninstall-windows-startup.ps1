param(
    [string]$TaskName = "ClinicBackendAutoStart"
)

$ErrorActionPreference = "Stop"

try {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "Scheduled Task '$TaskName' removed."
} catch {
    Write-Warning "Failed to remove task '$TaskName': $_"
}

