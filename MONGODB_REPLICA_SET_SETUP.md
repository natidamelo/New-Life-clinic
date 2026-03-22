# MongoDB Replica Set Setup Guide

## Overview
This guide will help you set up a MongoDB replica set to enable transaction support for your clinic management system.

## Table of Contents
1. [Local Development Setup](#local-development-setup)
2. [Production Setup (Cloud)](#production-setup-cloud)
3. [Production Setup (Self-Hosted)](#production-setup-self-hosted)
4. [Updating Application Configuration](#updating-application-configuration)
5. [Testing Transactions](#testing-transactions)

---

## Local Development Setup

### Option 1: Docker Compose (Recommended for Development)

**Pros:** Easy setup, isolated environment, works on Windows/Mac/Linux

#### Step 1: Create Docker Compose File
A `docker-compose.mongodb-replica.yml` file has been created in your project root.

#### Step 2: Start the Replica Set
```bash
# Stop any existing MongoDB
# Close your current MongoDB instance

# Start replica set
docker-compose -f docker-compose.mongodb-replica.yml up -d

# Wait 10 seconds for containers to start
timeout 10

# Initialize the replica set (run once)
docker exec mongo1 mongosh --eval "rs.initiate({
  _id: 'rs0',
  members: [
    { _id: 0, host: 'mongo1:27017' },
    { _id: 1, host: 'mongo2:27017' },
    { _id: 2, host: 'mongo3:27017' }
  ]
})"
```

#### Step 3: Update Environment Variables
```env
MONGODB_URI=mongodb://localhost:27017,localhost:27018,localhost:27019/clinic_db?replicaSet=rs0
```

#### Step 4: Verify Replica Set
```bash
# Check replica set status
docker exec mongo1 mongosh --eval "rs.status()"

# You should see 3 members with states: PRIMARY, SECONDARY, SECONDARY
```

---

### Option 2: Local Replica Set (No Docker)

**Pros:** No Docker required, runs directly on your machine

#### Step 1: Create Data Directories
```bash
# Windows
mkdir C:\data\rs0-0
mkdir C:\data\rs0-1
mkdir C:\data\rs0-2

# Linux/Mac
mkdir -p /data/rs0-{0,1,2}
```

#### Step 2: Start MongoDB Instances
Use the provided PowerShell script `start-mongodb-replica.ps1` (Windows) or bash script `start-mongodb-replica.sh` (Linux/Mac).

**Windows:**
```powershell
.\start-mongodb-replica.ps1
```

**Linux/Mac:**
```bash
chmod +x start-mongodb-replica.sh
./start-mongodb-replica.sh
```

#### Step 3: Initialize Replica Set
```bash
# Connect to first instance
mongosh --port 27017

# In mongosh, run:
rs.initiate({
  _id: "rs0",
  members: [
    { _id: 0, host: "localhost:27017" },
    { _id: 1, host: "localhost:27018" },
    { _id: 2, host: "localhost:27019" }
  ]
})

# Wait 10 seconds, then verify
rs.status()
```

#### Step 4: Update Environment Variables
```env
MONGODB_URI=mongodb://localhost:27017,localhost:27018,localhost:27019/clinic_db?replicaSet=rs0
```

---

## Production Setup (Cloud)

### Option 1: MongoDB Atlas (Easiest - Recommended)

**Pros:** Fully managed, automatic backups, scaling, security

#### Step 1: Create Account
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up for a free account
3. Create a new cluster

#### Step 2: Choose Configuration
- **Cluster Tier:** M10 or higher (required for replica sets)
- **Region:** Choose closest to your users
- **Cluster Name:** clinic-production

#### Step 3: Configure Network Access
1. Go to **Network Access**
2. Add your server's IP address
3. For testing, you can use `0.0.0.0/0` (not recommended for production)

#### Step 4: Create Database User
1. Go to **Database Access**
2. Create a new user with read/write permissions
3. Save username and password

#### Step 5: Get Connection String
1. Click **Connect** on your cluster
2. Choose **Connect your application**
3. Copy the connection string
4. Replace `<password>` and `<dbname>`

```env
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/clinic_db?retryWrites=true&w=majority
```

**Cost Estimate:**
- M10 (Development): ~$57/month
- M30 (Production): ~$250/month

---

### Option 2: DigitalOcean Managed MongoDB

**Pros:** Good balance of cost and features

#### Step 1: Create Database Cluster
1. Go to [DigitalOcean](https://www.digitalocean.com)
2. Navigate to **Databases**
3. Create MongoDB cluster
4. Choose configuration:
   - **Size:** 2GB RAM minimum ($30/month)
   - **Nodes:** 3 (for replica set)
   - **Region:** Closest to your server

#### Step 2: Configure Access
1. Add your server's IP to trusted sources
2. Create database user

#### Step 3: Get Connection String
```env
MONGODB_URI=mongodb://username:password@host1:27017,host2:27017,host3:27017/clinic_db?replicaSet=rs0&tls=true
```

---

## Production Setup (Self-Hosted)

### Requirements
- 3 servers (VPS/dedicated) with Ubuntu 20.04+
- Minimum 2GB RAM each
- Good network connectivity between servers

### Step 1: Install MongoDB on Each Server

```bash
# Run on all 3 servers

# Import MongoDB public key
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -

# Add MongoDB repository
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

# Install MongoDB
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
```

### Step 2: Configure Each Server

**Server 1 (IP: 192.168.1.10):**
```bash
sudo nano /etc/mongod.conf
```

```yaml
net:
  port: 27017
  bindIp: 0.0.0.0  # Allow external connections

replication:
  replSetName: rs0

security:
  authorization: enabled
  keyFile: /etc/mongodb-keyfile
```

**Repeat for Server 2 (192.168.1.11) and Server 3 (192.168.1.12)**

### Step 3: Create Security Key File

```bash
# On Server 1, generate key
openssl rand -base64 756 > mongodb-keyfile
chmod 400 mongodb-keyfile
sudo mv mongodb-keyfile /etc/mongodb-keyfile
sudo chown mongodb:mongodb /etc/mongodb-keyfile

# Copy to other servers
scp /etc/mongodb-keyfile user@192.168.1.11:/tmp/
scp /etc/mongodb-keyfile user@192.168.1.12:/tmp/

# On Server 2 and 3
sudo mv /tmp/mongodb-keyfile /etc/mongodb-keyfile
sudo chmod 400 /etc/mongodb-keyfile
sudo chown mongodb:mongodb /etc/mongodb-keyfile
```

### Step 4: Restart MongoDB on All Servers

```bash
sudo systemctl restart mongod
```

### Step 5: Initialize Replica Set

```bash
# Connect to Server 1
mongosh --host 192.168.1.10

# Initialize replica set
rs.initiate({
  _id: "rs0",
  members: [
    { _id: 0, host: "192.168.1.10:27017" },
    { _id: 1, host: "192.168.1.11:27017" },
    { _id: 2, host: "192.168.1.12:27017" }
  ]
})

# Create admin user (on PRIMARY only)
use admin
db.createUser({
  user: "admin",
  pwd: "your-secure-password",
  roles: ["root"]
})

# Create application user
use clinic_db
db.createUser({
  user: "clinic_app",
  pwd: "your-app-password",
  roles: [
    { role: "readWrite", db: "clinic_db" }
  ]
})
```

### Step 6: Update Application Connection

```env
MONGODB_URI=mongodb://clinic_app:your-app-password@192.168.1.10:27017,192.168.1.11:27017,192.168.1.12:27017/clinic_db?replicaSet=rs0&authSource=clinic_db
```

---

## Updating Application Configuration

### Update Environment Variables

Create/update `.env`:
```env
# Replace with your replica set connection string
MONGODB_URI=mongodb://localhost:27017,localhost:27018,localhost:27019/clinic_db?replicaSet=rs0

# Other settings
NODE_ENV=production
PORT=5000
```

### Update Database Connection

The `backend/config/db-transaction-enabled.js` file has been created with transaction-aware connection logic.

---

## Testing Transactions

### Test Script

A test script has been created: `backend/test-transactions.js`

Run it to verify transactions work:

```bash
# Make sure replica set is running
node backend/test-transactions.js
```

**Expected Output:**
```
✅ Connected to MongoDB replica set
✅ Testing transactions...
✅ Transaction test passed!
✅ Created test record: 60abc123...
✅ Transaction rolled back successfully
✅ All transaction tests passed!
```

---

## Troubleshooting

### Error: "not master and slaveOk=false"
**Solution:** You're connected to a SECONDARY node. Add `readPreference=primary`:
```
MONGODB_URI=mongodb://...?replicaSet=rs0&readPreference=primary
```

### Error: "Transaction numbers are only allowed..."
**Solution:** Replica set not properly initialized. Check:
```bash
mongosh
rs.status()
# Should show 3 members with states
```

### Connection Timeouts
**Solution:** 
- Check firewall rules allow port 27017-27019
- Verify servers can ping each other
- Check MongoDB logs: `sudo tail -f /var/log/mongodb/mongod.log`

### Docker containers not starting
**Solution:**
```bash
# Remove containers and volumes
docker-compose -f docker-compose.mongodb-replica.yml down -v

# Restart
docker-compose -f docker-compose.mongodb-replica.yml up -d
```

---

## Monitoring

### Check Replica Set Health

```bash
# Connect to any member
mongosh "mongodb://localhost:27017/?replicaSet=rs0"

# Check status
rs.status()

# Check configuration
rs.conf()

# Check oplog size (replication log)
rs.printReplicationInfo()
```

### Key Metrics to Monitor

1. **Replication Lag:** Should be < 1 second
2. **Oplog Size:** Should cover at least 24 hours of operations
3. **Member State:** All members should be healthy (PRIMARY/SECONDARY)

---

## Next Steps

1. ✅ Choose your setup method (Docker/Cloud/Self-hosted)
2. ✅ Set up replica set
3. ✅ Update environment variables
4. ✅ Test transactions using test script
5. ✅ Re-enable transactions in your code (see below)

---

## Re-enabling Transactions in Code

Once replica set is running, you can optionally re-enable transactions for critical operations. A migration guide has been created: `ENABLE_TRANSACTIONS.md`

