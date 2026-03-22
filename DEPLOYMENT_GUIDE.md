# Clinic Management System - Deployment Guide

## 🚀 Quick Start for Other PCs

### 1. Prerequisites
Before running the application on a new PC, ensure you have:

- **Node.js** (version 14 or higher) - [Download here](https://nodejs.org/)
- **MongoDB** (version 4.4 or higher) - [Download here](https://www.mongodb.com/try/download/community)
- **Git** (for cloning the repository)

### 2. Installation Steps

#### Option A: Using the Setup Script (Recommended)
1. Copy all project files to the new PC
2. Double-click `setup-deployment.bat`
3. Follow the on-screen instructions

#### Option B: Manual Setup
```bash
# 1. Clone or copy the project files
cd "clinic new life"

# 2. Install backend dependencies
cd backend
npm install
cd ..

# 3. Install frontend dependencies
cd frontend
npm install
cd ..

# 4. Set up environment variables (creates .env file)
# The setup script does this automatically
```

### 3. Database Setup

#### If using local MongoDB:
1. Install MongoDB and start the service
2. The application expects the database at: `mongodb://localhost:27017/clinic-cms`

#### If using MongoDB Atlas (cloud):
Update the `.env` file:
```
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/clinic-cms
```

### 4. Starting the Application

#### Development Mode:
```bash
npm run dev
```
This starts both backend (port 5002) and frontend (port 5173)

#### Production Mode:
```bash
npm run start-all
```

## 🔧 Common Issues & Solutions

### Issue 1: "Port already in use"
**Symptoms:** Error about port 5002 or 5173 being occupied

**Solutions:**
- Close other applications using these ports
- Change ports in `.env` file:
  ```
  PORT=5003
  FRONTEND_URL=http://localhost:5174
  ```

### Issue 2: "MongoDB connection failed"
**Symptoms:** Database connection errors

**Solutions:**
1. **Check if MongoDB is running:**
   ```bash
   # Windows
   net start MongoDB

   # Or check services.msc for MongoDB service
   ```

2. **Update connection string in `.env`:**
   ```env
   MONGO_URI=mongodb://localhost:27017/clinic-cms
   ```

3. **Use MongoDB Atlas (cloud database):**
   - Create account at [mongodb.com/atlas](https://mongodb.com/atlas)
   - Get connection string and update `.env`

### Issue 3: "Module not found" errors
**Symptoms:** Cannot find certain npm packages

**Solutions:**
1. **Clear npm cache:**
   ```bash
   npm cache clean --force
   ```

2. **Reinstall dependencies:**
   ```bash
   cd backend && rm -rf node_modules package-lock.json && npm install
   cd ../frontend && rm -rf node_modules package-lock.json && npm install
   ```

3. **Update Node.js:**
   - Install latest LTS version from nodejs.org

### Issue 4: "CORS errors" in browser
**Symptoms:** Frontend can't connect to backend

**Solutions:**
1. **Check if backend is running on correct port**
2. **Update CORS settings in `.env`:**
   ```env
   FRONTEND_URL=http://localhost:5173
   ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
   ```

### Issue 5: "Permission denied" or "Access denied"
**Symptoms:** Cannot start server or access files

**Solutions:**
1. **Run as Administrator (Windows):**
   - Right-click Command Prompt → "Run as administrator"

2. **Check file permissions:**
   ```bash
   # Make sure .env file exists and has proper permissions
   dir .env
   ```

3. **Firewall issues:**
   - Allow Node.js through Windows Firewall
   - Or temporarily disable firewall for testing

### Issue 6: "Build failed" - Frontend compilation errors
**Symptoms:** Vite build errors during development

**Solutions:**
1. **Clear build cache:**
   ```bash
   cd frontend
   rm -rf dist node_modules/.vite
   npm install
   ```

2. **Update dependencies:**
   ```bash
   npm update
   ```

## 🛠️ Environment Configuration

### Required Environment Variables:
```env
NODE_ENV=development
PORT=5002
MONGO_URI=mongodb://localhost:27017/clinic-cms
JWT_SECRET=clinic-management-system-default-secret-key-12345
FRONTEND_URL=http://localhost:5173
```

### For Production Deployment:
1. Change `NODE_ENV=production`
2. Update `MONGO_URI` with production database URL
3. Generate a secure `JWT_SECRET`
4. Update `FRONTEND_URL` with your domain
5. Configure proper SMTP settings for email notifications

## 📋 Troubleshooting Checklist

- [ ] Node.js installed and accessible
- [ ] MongoDB running on port 27017
- [ ] All npm dependencies installed
- [ ] `.env` file exists and configured
- [ ] No port conflicts (5002, 5173)
- [ ] Firewall allows Node.js connections
- [ ] Antivirus not blocking the application

## 🔍 Testing the Setup

1. **Test backend:**
   ```bash
   curl http://localhost:5002/api/health
   ```

2. **Test frontend:**
   - Open browser to `http://localhost:5173`
   - Should see the login page

3. **Test database connection:**
   - Check if you can login with existing credentials
   - Verify patient data loads correctly

## 📞 Need Help?

If you're still having issues:

1. Check the console/logs for specific error messages
2. Verify all prerequisites are installed correctly
3. Try running the setup script again
4. Check if any security software is blocking the application

## 🚀 Production Deployment

For production deployment, consider:

1. **Process Manager:** Use PM2 to keep the app running
2. **Reverse Proxy:** Nginx or Apache for better performance
3. **SSL Certificate:** Let's Encrypt for HTTPS
4. **Database:** MongoDB Atlas for cloud database
5. **Monitoring:** Set up logging and monitoring

Example PM2 configuration:
```bash
npm install -g pm2
pm2 start backend/server.js --name "clinic-backend"
pm2 start "npm run dev" --name "clinic-frontend" --cwd frontend
pm2 startup
pm2 save
```

---

*This guide was created to help deploy the Clinic Management System on other PCs. If you encounter any issues not covered here, please document them for future reference.*