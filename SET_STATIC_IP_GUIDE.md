# How to Set a Static IP Address (Never Changes!)

## Quick Summary

Set your computer to ALWAYS use the same IP address (e.g., `192.168.1.100`)

## Step-by-Step Instructions

### Option 1: Through Windows Settings (Easiest)

1. **Open Network Settings**
   - Press `Win + I` (Settings)
   - Go to: **Network & Internet**
   - Click: **Ethernet** (or **Wi-Fi** if using wireless)
   - Click: **Properties** next to your active connection

2. **Edit IP Settings**
   - Scroll to: **IP assignment**
   - Click: **Edit** button
   - Change from: **Automatic (DHCP)** 
   - To: **Manual**

3. **Set Static IP**
   - Turn on: **IPv4**
   - Fill in these values:

   ```
   IP address:        192.168.1.100
   Subnet mask:       255.255.255.0
   Gateway:           192.168.1.1
   Preferred DNS:     8.8.8.8
   Alternate DNS:     8.8.4.4
   ```

   **IMPORTANT:** Adjust these based on your router:
   - IP address: Choose any IP in your network range (192.168.1.100 - 192.168.1.254)
   - Gateway: Usually 192.168.1.1 (check your router)

4. **Click Save**

5. **Test Connection**
   - Open Command Prompt
   - Run: `ping google.com`
   - Should get replies (if not, check gateway/DNS settings)

### Option 2: Through Command Prompt (Advanced)

1. **Find your current network info:**
   ```cmd
   ipconfig /all
   ```
   
   Note down:
   - Current IP address
   - Subnet mask
   - Default Gateway
   - DNS servers

2. **Find your network adapter name:**
   ```cmd
   netsh interface show interface
   ```
   
   Note the name (e.g., "Ethernet" or "Wi-Fi")

3. **Set static IP:**
   ```cmd
   netsh interface ip set address name="Ethernet" static 192.168.1.100 255.255.255.0 192.168.1.1
   ```
   
   Replace:
   - `"Ethernet"` with your adapter name
   - `192.168.1.100` with your chosen IP
   - `192.168.1.1` with your gateway

4. **Set DNS:**
   ```cmd
   netsh interface ip set dns name="Ethernet" static 8.8.8.8
   netsh interface ip add dns name="Ethernet" 8.8.4.4 index=2
   ```

## Choosing Your Static IP

### Good IP Choices:
- `192.168.1.100` - Easy to remember
- `192.168.1.50` - Middle range
- `192.168.1.200` - High range

### Bad IP Choices (Avoid):
- `192.168.1.1` - Usually the router
- `192.168.1.2` - `192.168.1.50` - Often used by DHCP (may conflict)

### Best Practice:
Use IPs in range: **192.168.1.100 - 192.168.1.254**

## After Setting Static IP

1. **Restart your computer** (optional but recommended)

2. **Verify IP is static:**
   ```cmd
   ipconfig
   ```
   
   Should show your chosen IP (192.168.1.100)

3. **Update SHARE_URL.txt** with your new static IP

4. **Share with team:**
   ```
   http://192.168.1.100:5175
   ```
   
   This URL will now NEVER change! ✅

## Common Network Settings

| Router Type | Gateway | Subnet Mask | DNS |
|------------|---------|-------------|-----|
| Most home routers | 192.168.1.1 | 255.255.255.0 | 8.8.8.8 |
| Some routers | 192.168.0.1 | 255.255.255.0 | 8.8.8.8 |
| Office networks | 10.0.0.1 | 255.255.255.0 | 8.8.8.8 |

## Troubleshooting

### If internet stops working:

1. **Check gateway:**
   - Make sure gateway IP is correct (usually 192.168.1.1)
   - Try pinging: `ping 192.168.1.1`

2. **Check DNS:**
   - Set DNS to 8.8.8.8 (Google DNS)
   - Try: `ping google.com`

3. **Switch back to DHCP** if needed:
   - Network Settings → IP assignment → Edit
   - Change to: **Automatic (DHCP)**

## Recommended Static IP for Clinic

Choose: **`192.168.1.100`**

Then share: **`http://192.168.1.100:5175`**

This URL will work forever! ✅










