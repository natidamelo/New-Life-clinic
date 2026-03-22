# New Life Clinic - Network Access Instructions

## Overview
The New Life Clinic system is now configured to accept connections from other devices on your local network. Both the frontend and backend servers are running and accessible from other PCs.

## Current Network Configuration
- **Server IP Address**: `10.41.144.157`
- **Frontend Port**: `5175`
- **Backend Port**: `5002`
- **Network**: Local network (10.41.144.x)

## How to Access from Other PCs

### 1. From Another PC on the Same Network

**Step 1: Ensure both servers are running**
- Backend server should be running on port 5002
- Frontend server should be running on port 5175

**Step 2: Open a web browser on the other PC**

**Step 3: Navigate to the clinic system**
```
http://10.41.144.157:5175
```

**Step 4: Login with your credentials**
- Username: `admin@clinic.com`
- Password: [your password]

### 2. Troubleshooting Network Access

#### If you can't connect from another PC:

**Check 1: Verify both servers are running**
On the main PC, run these commands to check if servers are listening:
```cmd
netstat -an | findstr :5002
netstat -an | findstr :5175
```
You should see `LISTENING` status for both ports.

**Check 2: Test connectivity from the other PC**
On the other PC, try to ping the server:
```cmd
ping 10.41.144.157
```

**Check 3: Test direct backend connection**
On the other PC, try accessing the backend directly:
```cmd
curl http://10.41.144.157:5002/api/ping
```
You should get a JSON response with `"success": true`.

**Check 4: Check Windows Firewall**
Ensure Windows Firewall allows connections on ports 5002 and 5175. The firewall rules have been configured automatically.

**Check 5: Verify network connectivity**
- Ensure both PCs are on the same network (10.41.144.x)
- Check if there are any network restrictions or VPNs that might block local connections

### 3. Mobile Device Access

You can also access the clinic system from mobile devices on the same network:

1. Connect your mobile device to the same Wi-Fi network
2. Open a web browser
3. Navigate to: `http://10.41.144.157:5175`
4. Login with your credentials

### 4. Security Considerations

**Important Security Notes:**
- The system is currently accessible to any device on your local network
- For production use, consider implementing additional security measures
- The connection is not encrypted (HTTP, not HTTPS)
- Consider using a VPN for remote access if needed

### 5. Server Management

**Starting the Servers:**
1. Navigate to the project directory
2. Start the backend server:
   ```cmd
   cd backend
   npm start
   ```
3. Start the frontend server (in a new terminal):
   ```cmd
   npm run dev
   ```

**Stopping the Servers:**
- Press `Ctrl+C` in each terminal window to stop the servers

### 6. Network Configuration Details

**Backend Server Configuration:**
- Port: 5002
- Host: 0.0.0.0 (accepts connections from any IP)
- Database: MongoDB (clinic-cms)

**Frontend Server Configuration:**
- Port: 5175
- Host: 0.0.0.0 (accepts connections from any IP)
- Development server with hot reload

**Firewall Rules:**
- Windows Firewall rules have been added for both ports
- Rule names: "Clinic CMS Backend" and "Clinic CMS Frontend"

### 7. Common Issues and Solutions

**Issue: "This site can't be reached"**
- Solution: Check if both servers are running and accessible
- Verify the IP address is correct (10.41.144.157)

**Issue: Login page loads but login fails**
- Solution: Check if the backend server is running on port 5002
- Verify the frontend can connect to the backend

**Issue: Slow loading or timeouts**
- Solution: Check network connectivity between devices
- Ensure no firewall or antivirus is blocking the connection

**Issue: "Not secure" warning in browser**
- Solution: This is normal for HTTP connections. Click "Advanced" and "Proceed to site"

### 8. Support

If you encounter any issues:
1. Check the server logs for error messages
2. Verify network connectivity
3. Ensure both servers are running
4. Check Windows Firewall settings

## Quick Access Summary

**For other PCs on the same network:**
- URL: `http://10.41.144.157:5175`
- Login: Use your existing clinic credentials

**For mobile devices:**
- Connect to the same Wi-Fi network
- Open browser and go to: `http://10.41.144.157:5175`

The system is now ready for multi-device access on your local network!
