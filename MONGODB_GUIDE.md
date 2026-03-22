# MongoDB Connection Guide

## ✅ Issue Resolved!

Your project is now successfully connected to MongoDB.

---

## 📊 Your Database Configuration

- **Database Type:** MongoDB 8.0
- **Database Name:** `clinic-cms`
- **Connection String:** `mongodb://localhost:27017/clinic-cms`
- **Data Directory:** `C:\Users\HP\OneDrive\Desktop\clinic new life\data\db`
- **Port:** 27017

---

## 🎯 What Was The Problem?

Your MongoDB service was stopped, even though a MongoDB process was running. The process wasn't accepting connections properly, causing timeout errors when your Node.js backend tried to connect.

**Solution:** We stopped the old process and restarted MongoDB with the correct configuration.

---

## 🚀 Quick Commands

### Start MongoDB
```bash
start-mongodb.bat
```
Double-click this file or run it from command prompt to start MongoDB.

### Stop MongoDB
```bash
stop-mongodb.bat
```
Safely stops the MongoDB server.

### Check Status
```bash
check-mongodb-status.bat
```
Shows if MongoDB is running and lists all database collections.

---

## 📁 Your Database Collections

Your `clinic-cms` database currently contains **25 collections**:

1. `users` - User accounts and authentication
2. `patients` - Patient information
3. `appointments` - Appointment scheduling
4. `prescriptions` - Medical prescriptions
5. `laborders` - Laboratory test orders
6. `inventoryitems` - Medical inventory
7. `inventorytransactions` - Inventory movements
8. `payments` - Payment records
9. `invoices` - Billing invoices
10. `medicalinvoices` - Medical service invoices
11. `notifications` - System notifications
12. `vitalsigns` - Patient vital signs
13. `medicalrecords` - Patient medical records
14. `patientcards` - Patient card information
15. `services` - Medical services
16. `labtests` - Laboratory tests
17. `equipment` - Medical equipment
18. `imagings` - Imaging records
19. `imagingorders` - Imaging test orders
20. `rooms` - Room management
21. `departments` - Department information
22. `cardtypes` - Payment card types
23. `maintenancerequests` - Equipment maintenance
24. `buildings` - Building management
25. `visits` - Patient visits

---

## 🔧 Configuration Files

### .env File Location
```
C:\Users\HP\OneDrive\Desktop\clinic new life\.env
```

### Current Settings
```
MONGO_URI=mongodb://localhost:27017/clinic-cms
PORT=5002
```

---

## ⚙️ Backend Configuration

Your backend uses **Mongoose** (ODM) with these connection settings:

- **Max Pool Size:** 5 connections
- **Connection Timeout:** 5 seconds
- **Socket Timeout:** 20 seconds
- **Auto-reconnect:** Enabled
- **IPv4 Only:** Yes

Configuration file: `backend/config/db.js`

---

## 🐛 Troubleshooting

### MongoDB won't start?
1. Check if port 27017 is already in use:
   ```bash
   netstat -ano | findstr ":27017"
   ```

2. Make sure the data directory exists:
   ```bash
   dir "data\db"
   ```

3. Try running MongoDB as administrator

### Connection timeout errors?
1. Make sure MongoDB is running: `check-mongodb-status.bat`
2. Verify .env file has correct connection string
3. Restart MongoDB: `stop-mongodb.bat` then `start-mongodb.bat`

### Backend can't connect?
1. Check MongoDB is running on port 27017
2. Verify .env file exists in project root
3. Restart your backend server
4. Check backend logs: `backend/server.log`

---

## 📝 Starting Your Application

### Option 1: Start Everything
```bash
# 1. Start MongoDB
start-mongodb.bat

# 2. Start Backend (in one terminal)
cd backend
npm start

# 3. Start Frontend (in another terminal)
cd frontend
npm run dev
```

### Option 2: Use Concurrent Script
```bash
# Start MongoDB first
start-mongodb.bat

# Then start both backend and frontend
npm run dev:full
```

---

## 💡 Tips

1. **Always start MongoDB first** before starting your backend server
2. **Use the batch files** for easy MongoDB management
3. **Check status** if you get connection errors
4. Your data is safely stored in the `data/db` folder
5. MongoDB runs locally - no internet connection needed

---

## 🔒 Security Note

Your MongoDB is running without authentication (localhost only). This is fine for development but should be secured for production use.

---

## ✅ Verification

To verify everything is working:

1. Run `check-mongodb-status.bat`
2. You should see "✅ MongoDB is RUNNING"
3. All 25 collections should be listed
4. Connection test should succeed

---

**Need help?** Check the logs in `backend/logs/` or `mongodb.log`










