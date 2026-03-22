# Migrate Your Existing MongoDB to Replica Set

## Current Setup
- Database: `clinic-cms-patients` on `localhost:27017`
- 7 patients + collections with data
- Single MongoDB instance (no transactions)

## Goal
- Set up 3-node replica set
- Keep all your existing data
- Enable transaction support

---

## 🔄 Step-by-Step Migration

### Option 1: Using Docker (Easiest - Recommended)

#### Step 1: Export Your Data from MongoDB Compass

1. **In MongoDB Compass:**
   - Select `patients` collection
   - Click "Export Collection"
   - Choose "Export Full Collection"
   - Format: JSON
   - Save as: `patients-export.json`

2. **Repeat for other collections:**
   - `payments`
   - `prescriptions`
   - `medicalrecords`
   - etc. (export each important collection)

#### Step 2: Start Docker Replica Set

1. **Stop your current MongoDB:**
   - Close MongoDB Compass
   - Stop MongoDB service:
   ```cmd
   net stop MongoDB
   ```

2. **Start Docker replica set:**
   ```cmd
   setup-replica-set-docker.bat
   ```

   Wait for:
   ```
   ✅ MongoDB Replica Set is Ready!
   Connection String:
   mongodb://localhost:27017,localhost:27018,localhost:27019/clinic_db?replicaSet=rs0
   ```

#### Step 3: Import Your Data

1. **Update connection in Compass:**
   - New Connection: `mongodb://localhost:27017,localhost:27018,localhost:27019/?replicaSet=rs0`
   - Connect

2. **Create database:**
   - Database name: `clinic-cms-patients` (same as before)

3. **Import each collection:**
   - Click "ADD DATA" → "Import JSON or CSV file"
   - Select your exported files
   - Import into correct collections

#### Step 4: Update Your App

Update `.env`:
```env
MONGODB_URI=mongodb://localhost:27017,localhost:27018,localhost:27019/clinic-cms-patients?replicaSet=rs0
```

Restart backend:
```cmd
cd backend
npm start
```

---

### Option 2: Keep Current MongoDB, Use MongoDB Compass Export/Import

**Simpler but manual:**

1. In Compass, export all collections to JSON
2. Stop MongoDB service
3. Run replica set setup
4. Import all JSONs back
5. Update connection string

---

## ✅ Verification Checklist

After migration:

- [ ] All patients visible in Compass
- [ ] All collections imported
- [ ] Backend connects successfully
- [ ] Can create new patient
- [ ] Can finalize medical record
- [ ] Transactions working

Test transactions:
```cmd
node backend/test-transactions.js
```

Expected:
```
✅ Replica Set: rs0 (3 members)
✅ Transactions: ENABLED
```

---

## 🔙 Rollback Plan

If something goes wrong:

1. Stop Docker containers:
   ```cmd
   docker-compose -f docker-compose.mongodb-replica.yml down
   ```

2. Start original MongoDB:
   ```cmd
   net start MongoDB
   ```

3. Your data is still in `C:\Program Files\MongoDB\Server\...\data`

---

## Next: Production with MongoDB Atlas

Once local replica set works, migrate to Atlas for production:

1. Export data from local replica set
2. Set up Atlas cluster (M10)
3. Import data to Atlas
4. Update connection string
5. Deploy backend to cloud server

See `PRODUCTION_SETUP_GUIDE.md` for Atlas setup.

