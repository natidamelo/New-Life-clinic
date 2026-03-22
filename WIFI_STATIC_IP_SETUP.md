# 📶 Setting Static IP for Clinic WiFi

## ✅ Good News!

The auto-detection solution works for **WiFi** too! No changes needed!

## How It Works with WiFi

When you connect to your clinic WiFi:
1. You get an IP from the WiFi network (e.g., `192.168.1.9`)
2. Frontend auto-detects this IP
3. Backend uses the same IP
4. Everyone on the clinic WiFi can access!

## Make WiFi IP Permanent (Static)

### Quick Steps (WiFi Version):

1. **Open Settings**
   - Press `Win + I`
   - Click: **Network & Internet**
   - Click: **Wi-Fi** (not Ethernet!)
   - Click: **Properties** (under your WiFi network name)

2. **Edit IP Assignment**
   - Scroll to: **IP assignment**
   - Click: **Edit**
   - Change to: **Manual**
   - Turn ON: **IPv4**

3. **Enter Static IP for WiFi:**
   ```
   IP address:        192.168.1.100
   Subnet prefix:     24
   Gateway:           192.168.1.1
   Preferred DNS:     8.8.8.8
   Alternate DNS:     8.8.4.4
   ```

4. **Save**

## Important: WiFi-Specific Notes

### Check Your WiFi Router Settings

Your clinic WiFi might use a different IP range. To check:

```cmd
ipconfig | findstr "IPv4"
```

Look at your current WiFi IP:
- If it's `192.168.1.x` → Use `192.168.1.100`
- If it's `192.168.0.x` → Use `192.168.0.100`
- If it's `10.0.0.x` → Use `10.0.0.100`

### Check WiFi Gateway

```cmd
ipconfig | findstr "Default Gateway"
```

Common WiFi gateways:
- `192.168.1.1`
- `192.168.0.1`
- `10.0.0.1`

## Benefits of WiFi + Static IP

✅ **Mobile devices** can access via WiFi  
✅ **Other PCs** on clinic WiFi can access  
✅ **Tablets/phones** on WiFi can access  
✅ **No cables** needed  
✅ **Same IP always** (after setting static)  

## Recommended Setup for Clinic WiFi

### 1. Set Static IP on WiFi
- Use: `192.168.1.100` (or match your WiFi range)

### 2. Share This URL with All Clinic Devices
```
http://192.168.1.100:5175
```

### 3. All Devices Must Be on Clinic WiFi
- Phones: Connect to clinic WiFi
- Tablets: Connect to clinic WiFi
- Other PCs: Connect to clinic WiFi

## Current WiFi Info

Your current WiFi IP: **192.168.1.9**

### After setting static IP:
Your permanent WiFi IP: **192.168.1.100**

### URLs:
- **Current:** `http://192.168.1.9:5175`
- **After static:** `http://192.168.1.100:5175` (permanent!)

## Testing WiFi Access

### From your PC (WiFi):
```
http://localhost:5175
```

### From other devices on same WiFi:
```
http://192.168.1.100:5175
```
(After setting static IP)

## Automated Script for WiFi

The `setup-static-ip.ps1` script works for WiFi too! Just:

1. Right-click `RUN_AS_ADMIN.bat`
2. Click **"Run as administrator"**
3. Press **Y** when prompted
4. Script will detect you're on WiFi and configure it!

## WiFi vs Ethernet

Both work the same! The system auto-detects whether you're using:
- WiFi 📶
- Ethernet 🔌
- Both simultaneously

The frontend will always match your current connection!










