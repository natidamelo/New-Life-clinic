# Fixing 403 Forbidden Error

## Problem
Getting `403 Forbidden` when accessing `http://desktop-dc2icob:5175/`

## Solution Applied

The Vite dev server now allows connections via hostname. Changes made:

1. ✅ Added `allowedHosts` to Vite config
2. ✅ Configured to accept `desktop-dc2icob` and `DESKTOP-DC2ICOB`
3. ✅ Added `.local` pattern for flexibility

## Steps to Fix

### 1. Restart Frontend Server

Stop the current frontend server (Ctrl+C) and restart:

```bash
cd frontend
npm run dev
```

### 2. Access Using Hostname

Now you can access via:
- ✅ `http://desktop-dc2icob:5175` (lowercase)
- ✅ `http://DESKTOP-DC2ICOB:5175` (uppercase)
- ✅ `http://localhost:5175` (localhost)

### 3. Verify Backend is Running

Make sure backend is running on port 5002:
```bash
cd backend
npm start
```

## What Changed

**Before:** Vite blocked unknown hostnames → 403 error

**After:** Vite allows:
- `localhost`
- `127.0.0.1`
- `desktop-dc2icob` (your hostname)
- `DESKTOP-DC2ICOB` (uppercase)
- Any `.local` hostname

## Testing

1. Start backend: `cd backend && npm start`
2. Start frontend: `cd frontend && npm run dev`
3. Open browser: `http://desktop-dc2icob:5175`
4. Should work without 403 error!

## Troubleshooting

### If still getting 403:

1. **Check if server restarted:**
   - Make sure you restarted the frontend server after the config change

2. **Try uppercase:**
   - `http://DESKTOP-DC2ICOB:5175`

3. **Check firewall:**
   - Windows Firewall might be blocking port 5175
   - Allow Node.js through firewall

4. **Use localhost as fallback:**
   - `http://localhost:5175` (will still work for network access if configured)

### Alternative: Use IP Address

If hostname still doesn't work, you can:
1. Find your current IP: `ipconfig`
2. Access via: `http://YOUR-IP:5175`
3. Set static IP for consistency (see `SETUP_STATIC_URL.md`)










