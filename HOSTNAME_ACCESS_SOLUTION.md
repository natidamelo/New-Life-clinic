# Solution: Access via Hostname (desktop-dc2icob)

## Problem
Getting `403 Forbidden` when accessing `http://desktop-dc2icob:5175/`

## Root Cause
Vite 4+ has strict host checking that validates the `Host` header. When accessing via hostname, Vite checks if it's an allowed host and blocks unknown hostnames.

## Solutions (Choose One)

### Solution 1: Use IP Address (WORKING NOW) ✅
The terminal shows: `Network: http://192.168.1.9:5175/`

**Access via:** `http://192.168.1.9:5175`

This works immediately without any configuration changes!

### Solution 2: Use Hostname with Configuration
After restarting frontend with the new config, try:
- `http://desktop-dc2icob:5175`
- `http://DESKTOP-DC2ICOB:5175`

### Solution 3: Use localhost (ALWAYS WORKS)
**Access via:** `http://localhost:5175`

This works from the same PC and can still be accessed from other PCs on the network if Windows Network Discovery is enabled.

## Recommended: Use IP Address

Since your IP changes, but you want consistency:

1. **Set a static IP** (see `SETUP_STATIC_URL.md`)
2. **Or use localhost** - Windows Network Discovery allows other PCs to access `http://YOUR-PC-NAME:5175` when accessing via `localhost` from the server PC

## Quick Fix Right Now

**Just use:** `http://192.168.1.9:5175` 

This is already working according to your terminal output!

## After Restarting Frontend

The new configuration should allow:
- ✅ `http://desktop-dc2icob:5175`
- ✅ `http://DESKTOP-DC2ICOB:5175`  
- ✅ `http://192.168.1.9:5175`
- ✅ `http://localhost:5175`

**Restart frontend to apply changes:**
```bash
# Stop current server (Ctrl+C)
cd frontend
npm run dev
```

## Why This Happens

Vite 4+ added host checking for security. When you access via `desktop-dc2icob`, Vite sees an "unknown" host and blocks it with 403.

The custom plugin we added should bypass this check after restart.










