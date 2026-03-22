# Clinic Management System - Port 5002 Setup

## 🚀 Quick Start

### Option 1: Use the Management Script (Recommended)
```bash
# Run the project manager
manage-project.bat
```

Then select option `1` to start the backend server.

### Option 2: Manual Start
```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Start server on port 5002
node server.js
```

## 📋 Project Configuration

### Backend Server
- **Port**: 5002
- **URL**: http://localhost:5002
- **Health Check**: http://localhost:5002/ping
- **API Base**: http://localhost:5002/api

### Frontend Configuration
- **Primary API URL**: http://localhost:5002
- **Fallback URLs**: 5002, 5003, 5004, 5005
- **Development Mode**: Uses relative URLs for Vite proxy

## 🔧 Available Scripts

### `manage-project.bat`
Comprehensive project management script with options:
- [1] Start Backend Server (Port 5002)
- [2] Test Server Connection
- [3] View Server Status
- [4] Stop Server
- [5] Install Dependencies
- [6] View Logs
- [7] Exit

### `start-project.bat`
Simple script to start the backend server.

### `test-server.bat`
Test script to verify server connection and health.

## 🌐 API Endpoints

### Health Check
- `GET /ping` - Server health check
- `GET /api/ping` - API health check

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

### Medical Records
- `GET /api/medical-records/finalized` - Get finalized records
- `POST /api/medical-records` - Create new record
- `PUT /api/medical-records/:id` - Update record

### Lab Results
- `GET /api/lab-results/patient/:patientId` - Get patient lab results
- `POST /api/lab-results/submit-results` - Submit lab results

### Patients
- `GET /api/patients` - Get all patients
- `GET /api/patients/:id` - Get specific patient
- `POST /api/patients` - Create new patient

## 🔍 Troubleshooting

### Server Not Starting
1. Check if port 5002 is already in use:
   ```bash
   netstat -ano | findstr :5002
   ```

2. Kill existing process if needed:
   ```bash
   taskkill /PID <process_id> /F
   ```

3. Check for syntax errors:
   ```bash
   cd backend
   node -c server.js
   ```

### Connection Issues
1. Verify server is running:
   ```bash
   curl http://localhost:5002/ping
   ```

2. Check frontend configuration in `frontend/src/config/index.ts`

3. Ensure CORS is properly configured for your frontend URL

### Database Issues
1. Ensure MongoDB is running on localhost:27017
2. Check database connection in backend logs
3. Verify database name: `clinic-cms`

## 📁 Project Structure

```
clinic new life/
├── backend/                 # Backend server (Port 5002)
│   ├── server.js           # Main server file
│   ├── routes/             # API routes
│   ├── models/             # Database models
│   ├── middleware/         # Express middleware
│   └── config/             # Configuration files
├── frontend/               # React frontend
│   ├── src/
│   │   ├── config/         # Frontend configuration
│   │   ├── components/     # React components
│   │   └── services/       # API services
├── manage-project.bat      # Project management script
├── start-project.bat       # Quick start script
├── test-server.bat         # Server test script
└── README-PORT-5002.md     # This file
```

## 🎯 Key Features

- ✅ **Single Port Configuration**: Everything runs on port 5002
- ✅ **Mock Data Removed**: Only real data from database
- ✅ **Health Checks**: Built-in server monitoring
- ✅ **Error Handling**: Comprehensive error management
- ✅ **Easy Management**: Simple batch scripts for common tasks

## 🔄 Recent Changes

1. **Port Standardization**: All services now use port 5002
2. **Mock Data Removal**: Eliminated fake lab results
3. **Enhanced Error Handling**: Better error messages and logging
4. **Project Management**: Added comprehensive management scripts
5. **Health Monitoring**: Built-in server health checks

## 📞 Support

If you encounter any issues:
1. Check the server logs in `backend/logs/`
2. Use the management script to test connections
3. Verify all dependencies are installed
4. Ensure MongoDB is running

---

**Last Updated**: July 20, 2025
**Version**: 1.0.0
**Port**: 5002 