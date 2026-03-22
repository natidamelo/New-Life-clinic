# Setting Up a Consistent URL for Your Clinic System

## Problem
Your computer's IP address changes every time you restart, making it difficult for other PCs to access your clinic system.

## Solution Options

### Option 1: Use Your Computer's Hostname (RECOMMENDED) ✅

Your computer has a hostname (computer name) that stays the same even when the IP changes.

**Steps:**

1. **Find your computer's hostname:**
   - Press `Win + R`
   - Type `cmd` and press Enter
   - Type `hostname` and press Enter
   - You'll see something like `DESKTOP-ABC123` or `HP-PC`

2. **Access the frontend using hostname:**
   ```
   http://YOUR-COMPUTER-NAME:5175
   ```
   Example: `http://DESKTOP-ABC123:5175`

3. **The backend will automatically use:**
   ```
   http://YOUR-COMPUTER-NAME:5002
   ```

4. **Share this URL with other PCs:**
   - Other PCs on the same network can access: `http://YOUR-COMPUTER-NAME:5175`
   - The hostname stays the same even if your IP changes!

### Option 2: Set a Static IP Address

If you prefer using an IP address, set a static IP in Windows:

1. **Open Network Settings:**
   - Press `Win + I` → Network & Internet → Properties
   - Click "Edit" under IP assignment

2. **Set Manual IP:**
   - Change from "Automatic (DHCP)" to "Manual"
   - Enter:
     - IP address: `192.168.1.100` (or similar, check your router)
     - Subnet mask: `255.255.255.0`
     - Gateway: `192.168.1.1` (your router IP)
     - DNS: `8.8.8.8` and `8.8.4.4`

3. **Create `.env` file in `frontend` folder:**
   ```
   VITE_API_URL=http://192.168.1.100:5002
   ```

### Option 3: Use Environment Variable (Easiest)

1. **Create `.env` file in `frontend` folder:**
   ```env
   VITE_API_URL=http://YOUR-COMPUTER-NAME:5002
   ```
   Replace `YOUR-COMPUTER-NAME` with your actual computer name.

2. **Restart the frontend server:**
   ```bash
   cd frontend
   npm run dev
   ```

## Testing

1. **Find your hostname:**
   ```cmd
   hostname
   ```

2. **Test access:**
   - Open browser on the same PC: `http://localhost:5175`
   - Open browser on another PC: `http://YOUR-COMPUTER-NAME:5175`

3. **Check if it works:**
   - The frontend should load
   - Check browser console for the API URL being used
   - Should see: `✅ Using hostname-based URL` in console

## Troubleshooting

### If hostname doesn't work:

1. **Check Windows Network Discovery:**
   - Settings → Network & Internet → Network profile
   - Make sure "Network discovery" is ON

2. **Check Windows Firewall:**
   - Settings → Privacy & Security → Windows Security → Firewall
   - Allow Node.js and your browser through firewall

3. **Try using IP with static configuration:**
   - Use Option 2 above to set a static IP

### Quick Fix Script

Run this in PowerShell (as Administrator) to add firewall rules:

```powershell
New-NetFirewallRule -DisplayName "Clinic Frontend" -Direction Inbound -LocalPort 5175 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "Clinic Backend" -Direction Inbound -LocalPort 5002 -Protocol TCP -Action Allow
```

## Best Practice

**Use hostname!** It's the easiest and most reliable solution:
- ✅ Works automatically
- ✅ Doesn't require network configuration
- ✅ Stays consistent across restarts
- ✅ Easy to share with team members

Just share: `http://YOUR-COMPUTER-NAME:5175` with your team!










