# Quick Setup: Consistent URL for Clinic System

## Your Computer Name: `DESKTOP-DC2ICOB`

## ✅ Simple Solution: Use Hostname Instead of IP

Instead of using IP addresses that change, use your computer's hostname which stays the same!

### Step 1: Find Your Computer Name (Already found: `DESKTOP-DC2ICOB`)

Run this command:
```cmd
hostname
```

### Step 2: Access Using Hostname

**On your PC:**
- Frontend: `http://DESKTOP-DC2ICOB:5175` or `http://localhost:5175`
- Backend API: `http://DESKTOP-DC2ICOB:5002`

**On other PCs on the same network:**
- Frontend: `http://DESKTOP-DC2ICOB:5175`
- Backend API: `http://DESKTOP-DC2ICOB:5002`

### Step 3: Share with Your Team

Tell everyone to use: **`http://DESKTOP-DC2ICOB:5175`**

This URL will work even if your IP address changes!

## How It Works

The system now automatically detects:
1. ✅ If you access via hostname → Uses hostname for backend (consistent!)
2. ✅ If you access via IP → Uses IP for backend (will change)
3. ✅ If you access via localhost → Uses proxy (best for development)

## Quick Test

1. Start backend: `cd backend && npm start`
2. Start frontend: `cd frontend && npm run dev`
3. Open browser: `http://DESKTOP-DC2ICOB:5175`
4. Check console - should see: `✅ Using hostname-based URL`

## Troubleshooting

### If hostname doesn't work:

**Option A: Set Environment Variable**
1. Create `frontend/.env` file:
   ```
   VITE_API_URL=http://DESKTOP-DC2ICOB:5002
   ```
2. Restart frontend server

**Option B: Set Static IP**
- See `SETUP_STATIC_URL.md` for detailed instructions

## Benefits

✅ **Consistent URL** - Same URL every time you restart  
✅ **Easy Sharing** - Share one URL with your team  
✅ **No Configuration** - Works automatically  
✅ **Network Friendly** - Works on same network  










