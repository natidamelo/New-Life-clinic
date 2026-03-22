# Network Connectivity Troubleshooting Guide

## 🚨 Issue Identified: Different Network Segments

Your PCs are on **different network segments**:
- **Server PC**: `192.168.34.157` (Network: `192.168.34.0/24`)
- **Client PC**: `192.168.22.146` (Network: `192.168.22.0/24`)

This is why you cannot connect directly between the PCs.

## 🔍 Understanding the Problem

### Network Topology
```
Network A (192.168.34.0/24):    ┌─────────────┐
                               │ Server PC   │
Router A ──────────────────────┤ 192.168.34.157 │
                               └─────────────┘

Network B (192.168.22.0/24):    ┌─────────────┐
                               │ Client PC   │
Router B ──────────────────────┤ 192.168.22.146 │
                               └─────────────┘
```

The two networks cannot communicate directly without proper routing.

## ✅ Solutions

### Solution 1: Connect to Same Network (Recommended)
**Easiest and most reliable solution**

1. **Connect both PCs to the same WiFi router**
   - Both PCs should show the same network segment (e.g., both `192.168.1.x` or both `192.168.34.x`)

2. **Verify connection**:
   ```bash
   # On client PC, check IP
   ipconfig

   # Should show same network as server (192.168.34.x)
   ```

3. **Test connection**:
   ```bash
   # From client PC
   curl http://192.168.34.157:5175/
   ```

### Solution 2: Use Router with Multiple Networks
If you have a router that supports multiple network segments:

1. **Access router configuration** (usually `192.168.1.1` or `192.168.0.1`)
2. **Enable routing between networks**
3. **Or create a bridge between the two network segments**

### Solution 3: Port Forwarding
If the PCs are behind different routers:

1. **On the router with the server PC**:
   - Forward port `5175` to `192.168.34.157:5175`
   - Forward port `5002` to `192.168.34.157:5002`

2. **Find external IP of server router**:
   ```bash
   curl https://api.ipify.org
   ```

3. **Access from client**: `http://EXTERNAL_IP:5175/`

### Solution 4: Computer Name Access
Try using the Windows computer name instead of IP:

1. **Find server computer name**:
   ```bash
   echo %COMPUTERNAME%
   ```

2. **Access from client**: `http://SERVER_COMPUTER_NAME:5175/`

3. **Enable Network Discovery** on both PCs:
   - Go to Settings → Network & Internet → Advanced network settings
   - Turn on "Network discovery"

### Solution 5: VPN Connection
Set up a VPN to create a virtual network:

1. **Install VPN software** (OpenVPN, WireGuard, etc.)
2. **Connect both PCs to the same VPN**
3. **Access using VPN-assigned IPs**

## 🛠️ Diagnostic Tools

### Run Diagnostic Script
Execute `network-connectivity-troubleshooting.bat` for automated analysis.

### Manual Network Tests

**Test from client PC**:
```bash
# Test basic connectivity
ping 192.168.34.157

# Test application ports
curl http://192.168.34.157:5002/
curl http://192.168.34.157:5175

# Test with telnet (if available)
telnet 192.168.34.157 5002
telnet 192.168.34.157 5175
```

**Check routing**:
```bash
# Check routing table
route print

# Test if networks can route to each other
tracert 192.168.34.157
```

## ⚙️ Network Configuration Details

### Current Configuration
- **Server Network**: `192.168.34.0/24` (Subnet mask: `255.255.255.0`)
- **Client Network**: `192.168.22.0/24` (Subnet mask: `255.255.255.0`)
- **Network Range**:
  - Server can communicate with: `192.168.34.1` - `192.168.34.254`
  - Client can communicate with: `192.168.22.1` - `192.168.22.254`

### Required for Direct Connection
Both PCs need to be on the same network segment, for example:
- Both on `192.168.1.0/24` (most common home network)
- Both on `192.168.34.0/24` (current server network)

## 🔧 Quick Fixes to Try

### 1. Restart Network Adapters
```bash
# On both PCs
ipconfig /release
ipconfig /renew
```

### 2. Check Network Profiles
- Ensure both PCs are on "Private" or "Domain" network (not "Public")
- Go to Settings → Network & Internet → Properties

### 3. Disable Firewalls Temporarily (for testing)
```bash
# On server PC (run as administrator)
netsh advfirewall set allprofiles state off

# Test connection, then re-enable
netsh advfirewall set allprofiles state on
```

### 4. Check Antivirus Software
- Temporarily disable antivirus on both PCs
- Some antivirus software blocks network connections

## 📋 Troubleshooting Checklist

- [ ] Both PCs connected to same WiFi router?
- [ ] Both PCs show same network segment in ipconfig?
- [ ] Can ping between PCs?
- [ ] Firewall configured correctly?
- [ ] Antivirus disabled for testing?
- [ ] Router configuration allows communication?
- [ ] Network discovery enabled?

## 🚨 Most Common Solution

**Connect both PCs to the same WiFi network/router.** This is the simplest and most reliable solution. Both PCs should show IP addresses in the same range (e.g., both `192.168.1.x` or both `192.168.34.x`).

## 📞 Need More Help?

If you've tried all solutions and still can't connect:

1. **Verify router configuration** - Check if router supports multiple networks
2. **Check ISP restrictions** - Some ISPs block internal network communication
3. **Consider network topology** - You may need a more sophisticated router setup

The key issue is that `192.168.34.157` and `192.168.22.146` are on different network segments and cannot communicate directly without proper routing configuration.

---

*This guide addresses the specific network segmentation issue between your server and client PCs. The application itself is working correctly - it's a network topology problem.*
