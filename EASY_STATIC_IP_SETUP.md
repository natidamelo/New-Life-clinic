# ⚡ EASIEST Way to Set Static IP

## Method 1: Run Script as Admin (RECOMMENDED)

1. **Find file:** `RUN_AS_ADMIN.bat`
2. **Double-click it**
3. Click **"Yes"** when Windows asks for permission
4. PowerShell window opens → Press **Y** when asked
5. **Done!** Your IP is now: `192.168.1.100`

## Method 2: Windows Settings (Manual - 3 Minutes)

### Simple Steps:

1. **Open Settings**
   - Press `Win + I` on keyboard

2. **Go to Network**
   - Click: **Network & Internet**
   - Click: **Ethernet** (or **Wi-Fi**)
   - Click: **Properties**

3. **Change IP Assignment**
   - Find: **IP assignment** section
   - Click: **Edit** button
   - Select: **Manual**
   - Turn ON: **IPv4**

4. **Enter These Values:**
   ```
   IP address:        192.168.1.100
   Subnet prefix:     24
   Gateway:           192.168.1.1
   Preferred DNS:     8.8.8.8
   Alternate DNS:     8.8.4.4
   ```

5. **Click Save**

6. **Test:**
   ```cmd
   ipconfig
   ping google.com
   ```

## After Setup

### Your Permanent Clinic URL:
```
http://192.168.1.100:5175
```

**Never changes!** Share this with everyone! ✅

## Troubleshooting

### Internet not working after change?

**Wrong gateway!** Your router might use a different IP.

Check current gateway:
```cmd
ipconfig /all
```

Look for "Default Gateway" - use that instead of 192.168.1.1

Common gateways:
- `192.168.1.1` (most common)
- `192.168.0.1`
- `10.0.0.1`

### Want to undo?

Go back to Settings → IP assignment → Edit → **Automatic (DHCP)**

## Summary

✅ **Run:** `RUN_AS_ADMIN.bat`  
✅ **Press:** Y when asked  
✅ **Get:** Permanent IP: 192.168.1.100  
✅ **Share:** http://192.168.1.100:5175  

**That's it! 🎉**










