# Clinic CMS - Quick Start Guide

This guide provides multiple ways to start the complete development environment for the Clinic CMS application.

## Prerequisites

Before running any of these scripts, ensure you have:

1. **Node.js** (v14 or higher) installed
2. **MongoDB** installed and accessible via command line
3. **npm** dependencies installed:
   ```bash
   npm install
   cd backend && npm install
   cd ../frontend && npm install
   ```

## Quick Start Options

### Option 1: NPM Scripts (Recommended)

#### Start Everything with Database
```bash
npm run dev:with-db
```
This starts MongoDB, Backend, and Frontend in one command using concurrently.

#### Start Just Backend and Frontend (if MongoDB is already running)
```bash
npm run dev:full
```

#### Start Everything (Alternative)
```bash
npm run start-all:full
```

### Option 2: Windows Batch Script

Double-click `start-all.bat` or run:
```cmd
start-all.bat
```

This script will:
- Check if MongoDB is running
- Start MongoDB if needed
- Start the Backend server
- Start the Frontend development server

### Option 3: PowerShell Script (Enhanced)

```powershell
.\start-clinic.ps1
```

Features:
- Port availability checking
- Better error handling
- Colored output
- Automatic directory creation

### Option 4: Node.js Script

```bash
node start-clinic.js
```

Features:
- Cross-platform compatibility
- Port checking
- Graceful shutdown with Ctrl+C

## What Each Service Does

### MongoDB (Port 27017)
- Database server for storing application data
- Data stored in `./data/db` directory
- Automatically created if doesn't exist

### Backend Server (Port 5002)
- Express.js API server
- Handles authentication, data processing
- WebSocket server for real-time features

### Frontend Server (Port 5173)
- Vite development server
- React application with hot reloading
- Connects to backend API

## Access Points

Once all services are running:

- **Frontend Application**: http://localhost:5173
- **Backend API**: http://localhost:5002
- **API Health Check**: http://localhost:5002/ping
- **MongoDB**: mongodb://localhost:27017

## Troubleshooting

### Port Already in Use
If you get port errors:

1. **Find and kill processes using the ports:**
   ```bash
   # Windows
   netstat -ano | findstr :5002
   taskkill /PID <PID> /F
   
   # Or use npm script to kill frontend port
   cd frontend && npm run restart
   ```

2. **Check what's running:**
   ```bash
   # Windows
   netstat -ano | findstr LISTENING
   ```

### MongoDB Issues

1. **MongoDB not found:**
   - Ensure MongoDB is installed and in PATH
   - Or start MongoDB service manually

2. **Database connection failed:**
   - Check if MongoDB is running: `mongod --version`
   - Verify data directory exists and has permissions

### Backend/Frontend Issues

1. **Dependencies not installed:**
   ```bash
   npm install
   cd backend && npm install
   cd ../frontend && npm install
   ```

2. **Environment variables:**
   - Check if `.env` files exist in backend directory
   - Verify configuration in `backend/config/`

## Manual Start (Alternative)

If scripts don't work, you can start services manually:

```bash
# Terminal 1 - MongoDB
mongod --dbpath ./data/db --port 27017

# Terminal 2 - Backend
cd backend
npm start

# Terminal 3 - Frontend
cd frontend
npm run dev
```

## Stop Services

- **NPM Scripts**: Press `Ctrl+C` in the terminal
- **Windows Scripts**: Close the opened terminal windows
- **PowerShell/Node.js**: Press `Ctrl+C` for graceful shutdown

## Development Tips

1. **Hot Reloading**: Frontend automatically reloads on file changes
2. **Backend Changes**: Use `npm run dev:backend` for nodemon auto-restart
3. **Database Inspection**: Use MongoDB Compass or CLI tools
4. **API Testing**: Use http://localhost:5002/ping to verify backend

## Common Commands

```bash
# Quick development start (just backend + frontend)
npm run dev:full

# Full stack with database
npm run dev:with-db

# Backend only
npm run dev:backend

# Frontend only
npm run dev:frontend

# Production build
cd frontend && npm run build
``` 