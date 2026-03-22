# Set Static IP for Clinic System
# Run this as Administrator

Write-Host "==========================================" -ForegroundColor Green
Write-Host "  Static IP Setup for Clinic System" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""

# Get current network configuration
Write-Host "Checking current network configuration..." -ForegroundColor Yellow
Write-Host ""

$currentIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*"} | Select-Object -First 1)
$currentGateway = (Get-NetRoute -AddressFamily IPv4 | Where-Object {$_.DestinationPrefix -eq "0.0.0.0/0"} | Select-Object -First 1).NextHop

Write-Host "Current Configuration:" -ForegroundColor Cyan
Write-Host "  Current IP: $($currentIP.IPAddress)" -ForegroundColor White
Write-Host "  Gateway: $currentGateway" -ForegroundColor White
Write-Host ""

# Suggest a static IP based on current network
$suggestedIP = $currentIP.IPAddress -replace '\.\d+$', '.100'
$interfaceAlias = $currentIP.InterfaceAlias

Write-Host "Recommended Static IP Configuration:" -ForegroundColor Cyan
Write-Host "  IP Address:   $suggestedIP" -ForegroundColor Green
Write-Host "  Subnet Mask:  255.255.255.0 (or prefix 24)" -ForegroundColor Green
Write-Host "  Gateway:      $currentGateway" -ForegroundColor Green
Write-Host "  DNS:          8.8.8.8" -ForegroundColor Green
Write-Host ""

Write-Host "Network Adapter: $interfaceAlias" -ForegroundColor Yellow
Write-Host ""

# Ask for confirmation
$response = Read-Host "Do you want to set static IP to $suggestedIP? (Y/N)"

if ($response -eq 'Y' -or $response -eq 'y') {
    Write-Host ""
    Write-Host "Setting static IP..." -ForegroundColor Yellow
    
    try {
        # Remove existing IP configuration
        Remove-NetIPAddress -InterfaceAlias $interfaceAlias -AddressFamily IPv4 -Confirm:$false -ErrorAction SilentlyContinue
        Remove-NetRoute -InterfaceAlias $interfaceAlias -AddressFamily IPv4 -Confirm:$false -ErrorAction SilentlyContinue
        
        # Set static IP
        New-NetIPAddress -InterfaceAlias $interfaceAlias -IPAddress $suggestedIP -PrefixLength 24 -DefaultGateway $currentGateway
        
        # Set DNS (gateway first for local network, then Google DNS for internet)
        $dnsServers = @($currentGateway, "8.8.8.8")
        Set-DnsClientServerAddress -InterfaceAlias $interfaceAlias -ServerAddresses $dnsServers
        Write-Host "DNS configured: $($dnsServers -join ', ')" -ForegroundColor Green
        
        Write-Host ""
        Write-Host "==========================================" -ForegroundColor Green
        Write-Host "  Static IP Set Successfully!" -ForegroundColor Green
        Write-Host "==========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Your permanent clinic URL is:" -ForegroundColor Cyan
        Write-Host "  http://$suggestedIP:5175" -ForegroundColor Green -BackgroundColor Black
        Write-Host ""
        Write-Host "Share this URL with your team - it will NEVER change!" -ForegroundColor Yellow
        Write-Host ""
        
        # Update SHARE_URL.txt
        $shareUrlPath = Join-Path $PSScriptRoot "SHARE_URL.txt"
        $content = @"
================================================================
    CLINIC MANAGEMENT SYSTEM - NETWORK ACCESS
================================================================

Your Permanent Static IP: $suggestedIP

Access from other PCs on the same network:
http://${suggestedIP}:5175

Access from your PC:
http://localhost:5175

================================================================
This IP is STATIC - it will NEVER change!
================================================================

Share with your team:
http://${suggestedIP}:5175

================================================================
"@
        Set-Content -Path $shareUrlPath -Value $content
        Write-Host "Updated SHARE_URL.txt with static IP" -ForegroundColor Green
        
    } catch {
        Write-Host ""
        Write-Host "Error setting static IP: $_" -ForegroundColor Red
        Write-Host ""
        Write-Host "Please set manually using Windows Settings (see SET_STATIC_IP_GUIDE.md)" -ForegroundColor Yellow
    }
} else {
    Write-Host ""
    Write-Host "Static IP not set. Your IP will continue to change." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To set it manually, see: SET_STATIC_IP_GUIDE.md" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

