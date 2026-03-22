# Fix for "Unable to Connect to Server" on Other PCs

## Problem
When accessing the application from another PC on the network, you get "Unable to connect to the server" error when opening procedures.

## Root Cause
The frontend is trying to connect to the backend API, but:
1. The backend server might not be accessible from other PCs
2. The firewall might be blocking port 5002
3. The frontend might be using the wrong API URL

## Solution

### Step 1: Ensure Backend Server is Running
On the server PC (where the backend runs):
```bash
cd backend
npm run dev
# or
node server.js
```

The server should show:
```
🚀 Server is running on port 5002
🌐 Server accessible at: http://localhost:5002
🌐 Network accessible at: http://192.168.1.8:5002  (your actual IP)
```

### Step 2: Check Windows Firewall
On the server PC, allow port 5002 through Windows Firewall:

1. Open Windows Defender Firewall
2. Click "Advanced settings"
3. Click "Inbound Rules" → "New Rule"
4. Select "Port" → Next
5. Select "TCP" and enter port "5002" → Next
6. Select "Allow the connection" → Next
7. Check all profiles (Domain, Private, Public) → Next
8. Name it "Clinic Backend API" → Finish

Or run this command as Administrator:
```cmd
netsh advfirewall firewall add rule name="Clinic Backend API" dir=in action=allow protocol=TCP localport=5002
```

### Step 3: Verify Network Access
From another PC, test if the backend is accessible:
```bash
# In browser console or terminal
fetch('http://192.168.1.8:5002/api/ping')
  .then(response => response.json())
  .then(data => console.log('Backend accessible:', data))
  .catch(error => console.error('Backend not accessible:', error));
```

Replace `192.168.1.8` with the actual IP of the server PC.

### Step 4: Access Frontend from Other PC
1. Find the server PC's IP address (run `ipconfig` on server PC)
2. From another PC, access: `http://192.168.1.8:5175` (replace with actual IP)
3. The frontend will automatically detect the IP and connect to `http://192.168.1.8:5002`

### Step 5: Check Browser Console
Open browser developer tools (F12) on the other PC and check:
- Console tab for any errors
- Network tab to see if API requests are being made
- Check if requests are going to the correct URL

## Troubleshooting

### If still can't connect:

1. **Check if backend is listening on all interfaces:**
   - Backend should show: `Server accessible at: http://0.0.0.0:5002`
   - If it only shows `localhost`, the server isn't accessible from network

2. **Check if both PCs are on the same network:**
   - Both PCs should be on the same Wi-Fi/LAN network
   - Try pinging: `ping 192.168.1.8` (from other PC)

3. **Check antivirus/firewall:**
   - Temporarily disable antivirus/firewall to test
   - If it works, add exception for Node.js and port 5002

4. **Check backend logs:**
   - Look for connection attempts in backend console
   - If no attempts appear, the request isn't reaching the server

5. **Manual API URL override:**
   - In browser console on the other PC, run:
   ```javascript
   localStorage.setItem('API_BASE_URL', 'http://192.168.1.8:5002');
   location.reload();
   ```
   Replace `192.168.1.8` with the actual server IP.

## Quick Fix Script

Create a file `check-network-access.bat` on the server PC:
```batch
@echo off
echo Checking network configuration...
echo.
echo Server IP Addresses:
ipconfig | findstr /i "IPv4"
echo.
echo Testing backend server...
curl http://localhost:5002/api/ping
echo.
echo If you see a response above, backend is running.
echo If not, start the backend server first.
echo.
pause
```

## Summary
- ✅ Backend server running on port 5002
- ✅ Firewall allows port 5002
- ✅ Both PCs on same network
- ✅ Access frontend via server IP (not localhost)
- ✅ Frontend auto-detects backend URL based on access IP

