# 📶 Clinic WiFi Access Guide

## Overview

Your clinic system can be accessed by **any device on the clinic WiFi network**!

## Current Setup

**Your PC WiFi IP:** 192.168.1.9 (changes on restart)

**For permanent access:** Set static IP to 192.168.1.100

## Who Can Access on Clinic WiFi?

✅ **Other PCs** on clinic WiFi  
✅ **Tablets** on clinic WiFi  
✅ **Smartphones** on clinic WiFi  
✅ **Any device** on clinic WiFi  

## Access URLs

### Current (Changes After Restart):
```
http://192.168.1.9:5175
```

### After Setting Static IP (Permanent):
```
http://192.168.1.100:5175
```

## Setup for Clinic WiFi Network

### Step 1: Set Your PC to Static IP

**Option A: Quick (Run Script as Admin)**
1. Right-click `RUN_AS_ADMIN.bat`
2. Click "Run as administrator"
3. Press Y when prompted
4. Done!

**Option B: Manual (Windows Settings)**
1. Win + I → Network & Internet → Wi-Fi → Properties
2. IP assignment → Edit → Manual → IPv4 ON
3. Set: IP=192.168.1.100, Subnet=24, Gateway=192.168.1.1, DNS=8.8.8.8
4. Save

### Step 2: Share URL with Team

Give everyone on clinic WiFi:
```
http://192.168.1.100:5175
```

### Step 3: Ensure Servers Are Running

```bash
cd backend
npm start

cd frontend  
npm run dev
```

## Device Setup (For Team Members)

### On Their Phone/Tablet:
1. Connect to clinic WiFi
2. Open browser
3. Go to: `http://192.168.1.100:5175`
4. Login with their credentials
5. Done!

### On Other PCs:
1. Connect to clinic WiFi
2. Open browser
3. Go to: `http://192.168.1.100:5175`
4. Login
5. Done!

## Important Notes

### ⚠️ All Devices Must Be on Same WiFi

- Server PC: Connected to clinic WiFi ✅
- Other devices: Must connect to SAME clinic WiFi ✅
- Different WiFi: Won't work ❌

### 🔒 Firewall Settings

If other devices can't connect:

1. **Run this on your PC:**
   ```cmd
   netsh advfirewall firewall add rule name="Clinic Frontend" dir=in action=allow protocol=TCP localport=5175
   netsh advfirewall firewall add rule name="Clinic Backend" dir=in action=allow protocol=TCP localport=5002
   ```

2. Or disable Windows Firewall for private networks

## WiFi Network Requirements

✅ **Same WiFi network** - All devices connected to clinic WiFi  
✅ **No client isolation** - WiFi router allows devices to talk to each other  
✅ **Private network** - Not public WiFi  

## Testing WiFi Access

### From Your PC (Server):
```
http://localhost:5175
✅ Should work
```

### From Another Device on Clinic WiFi:
```
http://192.168.1.9:5175
✅ Should work (current IP)

http://192.168.1.100:5175
✅ Will work after setting static IP
```

### Troubleshooting:
```cmd
# On another device, test connection:
ping 192.168.1.9

# Should get replies
# If timeout, check WiFi settings or firewall
```

## Best Practice for Clinic

### 1. Set Static IP on Server PC
- IP: `192.168.1.100`
- Always the same ✅

### 2. Share One URL with Everyone
```
http://192.168.1.100:5175
```
Print and post in clinic! ✅

### 3. All Devices Connect to Clinic WiFi
- Phones, tablets, PCs all on same WiFi ✅

### 4. Everyone Uses Same URL
- No confusion ✅
- Easy training ✅
- Works forever ✅

## Summary

**Current WiFi IP:** 192.168.1.9 (temporary)  
**Recommended Static IP:** 192.168.1.100 (permanent)  
**URL to Share:** http://192.168.1.100:5175  
**Works for:** All devices on clinic WiFi  

**Set static IP once, share URL forever! 🎉**










