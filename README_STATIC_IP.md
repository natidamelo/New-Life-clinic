# 🎯 Make Your IP Always the Same

## Current Situation

Your IP: **192.168.1.9** (changes every restart)  
You want: **ALWAYS the same IP**

## Solution: Set Static IP

### Quick Method (Automated Script)

1. **Right-click** `setup-static-ip.ps1`
2. Click: **Run with PowerShell**
3. Choose: **Yes** when prompted
4. Done! Your IP is now: **192.168.1.100** (never changes)

### Manual Method (5 Minutes)

Follow the guide in: **`SIMPLE_STATIC_IP_STEPS.md`**

## After Setting Static IP

### Your permanent URLs:
```
http://192.168.1.100:5175  (for other PCs)
http://localhost:5175       (for your PC)
```

### Share with team:
```
http://192.168.1.100:5175
```

**This URL will NEVER change! ✅**

## Recommended Static IP

**Use: `192.168.1.100`**

Why?
- Easy to remember
- Unlikely to conflict with DHCP
- Professional looking
- In safe range (100-254)

## Files to Help You

- `setup-static-ip.ps1` - Automated setup script (RUN THIS!)
- `SET_STATIC_IP_GUIDE.md` - Detailed manual guide
- `SIMPLE_STATIC_IP_STEPS.md` - Step-by-step with screenshots description
- `STATIC_IP_VISUAL_GUIDE.txt` - Text-based visual guide

## Quick Setup (Recommended)

1. Open PowerShell **as Administrator**:
   - Press `Win + X`
   - Click "PowerShell (Admin)" or "Terminal (Admin)"

2. Navigate to clinic folder:
   ```powershell
   cd "C:\Users\HP\OneDrive\Desktop\clinic new life"
   ```

3. Run setup script:
   ```powershell
   .\setup-static-ip.ps1
   ```

4. Follow prompts (it will suggest: 192.168.1.100)

5. Done! Your IP is now permanent! ✅

## Summary

**Current:** IP changes every restart (192.168.1.9, 10.94.141.157, etc.)  
**After Fix:** IP is ALWAYS 192.168.1.100  
**URL to Share:** `http://192.168.1.100:5175` (permanent!)  

**Time needed:** 5 minutes  
**Benefit:** Never worry about changing IPs again! 🎉










