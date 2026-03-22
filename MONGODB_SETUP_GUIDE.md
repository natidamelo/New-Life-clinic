# MongoDB Connection Setup Guide

## Current Issue
MongoDB service is installed but **STOPPED**. Your backend is trying to connect to:
```
mongodb://localhost:27017/clinic-cms
```

## Quick Fix (Choose ONE method)

### Method 1: Using the Batch File (Easiest) ⭐
1. Right-click on `start-mongodb.bat`
2. Select **"Run as administrator"**
3. MongoDB will start automatically
4. Run `node test-mongodb-connection.js` to verify

### Method 2: Using Services Manager
1. Press `Win + R`
2. Type `services.msc` and press Enter
3. Scroll down and find **"MongoDB"**
4. Right-click on it and select **"Start"**
5. (Optional) Right-click again → Properties → Set "Startup type" to **"Automatic"** so it starts automatically

### Method 3: Using Command Prompt
1. Press `Win + X` and select **"Command Prompt (Admin)"** or **"PowerShell (Admin)"**
2. Run: `net start MongoDB`
3. You should see: "The MongoDB service was started successfully."

### Method 4: Using PowerShell (Admin)
```powershell
Start-Service MongoDB
```

## Verify Connection
After starting MongoDB, run:
```bash
node test-mongodb-connection.js
```

You should see:
```
✅ SUCCESS! MongoDB is connected!
📊 Database: clinic-cms
🌐 Host: localhost
🔢 Port: 27017
```

## Set MongoDB to Auto-Start (Recommended)
To avoid this issue in the future:
1. Open Services (`services.msc`)
2. Find "MongoDB"
3. Right-click → Properties
4. Change "Startup type" to **"Automatic"**
5. Click Apply and OK

## Restart Your Backend
Once MongoDB is running:
1. Go to your backend terminal
2. Press `Ctrl + C` to stop the current server (if running)
3. Run `npm run dev` again
4. You should see: `✅ Connected to MongoDB`

## Troubleshooting

### If MongoDB Service Doesn't Exist
MongoDB might not be installed correctly. Reinstall MongoDB:
1. Download from: https://www.mongodb.com/try/download/community
2. During installation, make sure to select **"Install MongoDB as a Service"**
3. Use default port: 27017

### If You Get "Access Denied"
You need administrator privileges. Run Command Prompt or PowerShell as Administrator.

### If Connection Still Fails
Check if MongoDB is listening on port 27017:
```bash
netstat -ano | findstr :27017
```

### Check MongoDB Configuration
MongoDB config file is usually at:
```
C:\Program Files\MongoDB\Server\{version}\bin\mongod.cfg
```

## Current Configuration
- **Database Name:** clinic-cms [[memory:11197882]]
- **Host:** localhost
- **Port:** 27017
- **Connection String:** mongodb://localhost:27017/clinic-cms

## Backend Server Ports
- **Backend API:** Port 5002 [[memory:8116768]]
- **Frontend:** Port 5175

Once MongoDB is running, your application will work normally! 🚀









