# ⚡ Quick Guide: Set Static IP (5 Minutes)

## Why Do This?
Your IP keeps changing. Setting a static IP means it NEVER changes!

## Simple Steps

### 1. Open Settings
- Press `Win + I`
- Click **Network & Internet**
- Click **Ethernet** (or **Wi-Fi**)

### 2. Edit IP Settings
- Click **Properties** (under your connection)
- Scroll to **IP assignment**
- Click **Edit**

### 3. Change to Manual
- Change dropdown from **Automatic (DHCP)** to **Manual**
- Turn ON: **IPv4**

### 4. Enter These Values

```
IP address:        192.168.1.100
Subnet prefix:     24  (or Subnet mask: 255.255.255.0)
Gateway:           192.168.1.1
Preferred DNS:     8.8.8.8
Alternate DNS:     8.8.4.4
```

### 5. Click Save

### 6. Test
Open Command Prompt and run:
```cmd
ipconfig
ping google.com
```

## Done! ✅

Your IP is now: **`192.168.1.100`**

**Share this URL with everyone:**
```
http://192.168.1.100:5175
```

**This URL will NEVER change!** Even after restarts, network changes, etc.

## If Internet Stops Working

**Wrong gateway!** Change `192.168.1.1` to your router's IP:
- Common options: 192.168.1.1, 192.168.0.1, 10.0.0.1
- Check your router or run `ipconfig` and look for "Default Gateway"

## Recommendation

Use: **`192.168.1.100`** (easy to remember, rarely conflicts with DHCP)

Then the clinic URL is permanently: **`http://192.168.1.100:5175`** 🎯










