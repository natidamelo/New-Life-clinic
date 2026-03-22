# Quick Start: MongoDB Replica Set Setup

## 🚀 Fastest Way to Get Started (Docker)

### Windows
```bash
setup-replica-set-docker.bat
```

### Linux/Mac
```bash
chmod +x setup-replica-set-docker.sh
./setup-replica-set-docker.sh
```

This will:
- ✅ Start 3 MongoDB containers
- ✅ Initialize replica set
- ✅ Configure for transaction support
- ✅ Give you the connection string

**Then:**
1. Update your `.env` file with the connection string
2. Run `node backend/test-transactions.js` to verify
3. Start your application

---

## 📚 Detailed Guides

### For Development
See **[MONGODB_REPLICA_SET_SETUP.md](./MONGODB_REPLICA_SET_SETUP.md)** for:
- Docker setup (recommended)
- Manual local setup
- Testing and verification

### For Production
See **[MONGODB_REPLICA_SET_SETUP.md](./MONGODB_REPLICA_SET_SETUP.md)** for:
- MongoDB Atlas (cloud, easiest)
- DigitalOcean Managed MongoDB
- Self-hosted replica set setup
- Security and monitoring

### Enabling Transactions
Once replica set is running, see **[ENABLE_TRANSACTIONS.md](./ENABLE_TRANSACTIONS.md)** to:
- Re-enable transactions in your code
- Use the `withTransaction` helper
- Test transaction support

---

## ✅ Verification Checklist

After setup, verify everything works:

```bash
# 1. Check replica set status
docker exec mongo1 mongosh --eval "rs.status()"

# 2. Test transactions
node backend/test-transactions.js

# 3. Start your server
npm run dev
```

Expected output from test:
```
✅ Connected to MongoDB replica set
✅ Replica Set: rs0 (3 members)
✅ Transaction test passed!
🎉 All transaction tests passed!
```

---

## 🛑 Troubleshooting

### Error: "Transaction numbers are only allowed..."
**Cause:** Not connected to replica set  
**Fix:** Check your MONGODB_URI includes `?replicaSet=rs0`

### Docker containers won't start
**Cause:** Ports 27017-27019 already in use  
**Fix:** 
```bash
# Windows: Stop existing MongoDB
net stop MongoDB

# Linux/Mac: Stop existing MongoDB
sudo systemctl stop mongod
```

### "Cannot connect to Docker daemon"
**Cause:** Docker not running  
**Fix:** Start Docker Desktop

---

## 📞 Need Help?

1. Check [MONGODB_REPLICA_SET_SETUP.md](./MONGODB_REPLICA_SET_SETUP.md) - Detailed troubleshooting section
2. Run the test script: `node backend/test-transactions.js` - Shows detailed error messages
3. Check Docker logs: `docker-compose -f docker-compose.mongodb-replica.yml logs`

---

## 🎯 Summary

**Development (Docker):**
```bash
setup-replica-set-docker.bat  # or .sh on Linux/Mac
# Update .env
node backend/test-transactions.js
npm run dev
```

**Production (MongoDB Atlas):**
1. Create Atlas cluster
2. Copy connection string to `.env`
3. Done! ✅

That's it! Your application now supports transactions for data consistency.

