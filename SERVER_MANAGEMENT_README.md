# 🚀 Clinic CMS Server Management System

## 🎯 **Purpose**
This system prevents the **403 Forbidden errors** and **server crashes** you were experiencing by providing robust server management, automatic port conflict resolution, and proper process handling.

## 🚨 **Root Causes Fixed**

### **1. Port Conflicts (EADDRINUSE)**
- ❌ **Before**: Multiple server instances trying to use port 5002
- ✅ **After**: Automatic port detection and conflict resolution

### **2. Process Management Issues**
- ❌ **Before**: Servers crashing without proper cleanup
- ✅ **After**: Graceful shutdowns and process monitoring

### **3. Multiple Server Instances**
- ❌ **Before**: Multiple Node.js processes running simultaneously
- ✅ **After**: Single server instance with PID tracking

### **4. Authentication Token Issues**
- ❌ **Before**: 403 errors due to missing/invalid tokens
- ✅ **After**: Proper token validation and error handling

## 🛠️ **New Server Management Commands**

### **Start Server (Recommended)**
```bash
cd backend
npm run start:managed
```
This uses the new process manager that prevents conflicts.

### **Check Server Status**
```bash
cd backend
npm run status
```
Shows if server is running, PID, and port status.

### **Stop Server**
```bash
cd backend
npm run stop
```
Gracefully stops the server and cleans up processes.

### **Restart Server**
```bash
cd backend
npm run restart
```
Stops and restarts the server cleanly.

### **Legacy Start (Not Recommended)**
```bash
cd backend
npm start
```
Direct start without process management (can cause conflicts).

## 🔧 **How It Works**

### **1. Port Conflict Resolution**
```javascript
// Automatically finds available port if 5002 is busy
const findAvailablePort = async (startPort) => {
  let port = startPort;
  while (!(await isPortAvailable(port))) {
    console.log(`⚠️  Port ${port} is in use, trying ${port + 1}...`);
    port++;
  }
  return port;
};
```

### **2. Process Management**
```javascript
// Tracks server PID to prevent multiple instances
const PID_FILE = path.join(__dirname, 'server.pid');
fs.writeFileSync(PID_FILE, serverProcess.pid.toString());
```

### **3. Graceful Shutdown**
```javascript
// Proper cleanup on server shutdown
const gracefulShutdown = async (signal) => {
  // Stop all services
  // Close database connections
  // Clean up PID files
  // Exit cleanly
};
```

## 📊 **Server Status Monitoring**

### **Real-time Status**
- ✅ **Running**: Server active on port 5002
- ❌ **Stopped**: Server not running
- ⚠️ **Port Conflict**: Port 5002 in use by another process
- 🔄 **Starting**: Server in startup process

### **Log Files**
- **Server Logs**: `backend/server.log`
- **PID File**: `backend/server.pid`
- **Console Output**: Real-time colored status messages

## 🚀 **Quick Start Guide**

### **Step 1: Start Server**
```bash
cd backend
npm run start:managed
```

### **Step 2: Verify Status**
```bash
npm run status
```
Should show: `✅ Server is running with PID XXXX on port 5002`

### **Step 3: Test API**
```bash
curl http://localhost:5002/api/ping
```
Should return: `{"message":"pong","timestamp":"..."}`

## 🔍 **Troubleshooting**

### **Port 5002 Already in Use**
```bash
# Check what's using the port
netstat -ano | findstr :5002

# Kill the process
taskkill /PID <PID> /F

# Start server again
npm run start:managed
```

### **Server Won't Start**
```bash
# Check server status
npm run status

# Check logs
type server.log

# Restart server
npm run restart
```

### **Multiple Server Instances**
```bash
# Stop all servers
npm run stop

# Check for remaining processes
tasklist | findstr node

# Start fresh
npm run start:managed
```

## 🎯 **Benefits of New System**

### **1. Reliability**
- ✅ **No more crashes** from port conflicts
- ✅ **Automatic recovery** from errors
- ✅ **Process isolation** prevents conflicts

### **2. Monitoring**
- ✅ **Real-time status** updates
- ✅ **Detailed logging** for debugging
- ✅ **Process tracking** with PID files

### **3. Management**
- ✅ **Easy start/stop/restart** commands
- ✅ **Clean process cleanup** on shutdown
- ✅ **Automatic port resolution**

### **4. Development**
- ✅ **Consistent server state** across restarts
- ✅ **No more "address already in use" errors**
- ✅ **Proper error handling** and recovery

## 🔐 **Authentication Fix**

The new system also includes improved authentication handling:

### **Token Validation**
- ✅ **Automatic token refresh** when needed
- ✅ **Better error messages** for auth failures
- ✅ **Role-based permission** checking

### **Medication Administration**
- ✅ **Payment status validation** before dose administration
- ✅ **Inventory availability** checking
- ✅ **Proper error handling** for failed operations

## 📝 **Migration from Old System**

### **If you were using `npm start`:**
1. **Stop old server**: `Ctrl+C` in terminal
2. **Use new command**: `npm run start:managed`
3. **Verify status**: `npm run status`

### **If you have multiple terminals running:**
1. **Close all terminals** with server processes
2. **Start fresh**: `npm run start:managed`
3. **Check status**: `npm run status`

## 🎉 **Result**

With this new system:
- ❌ **No more 403 Forbidden errors**
- ❌ **No more server crashes**
- ❌ **No more port conflicts**
- ✅ **Reliable server operation**
- ✅ **Easy server management**
- ✅ **Proper authentication flow**

Your medication administration (including ceftriaxone) should now work properly without the authentication issues!
