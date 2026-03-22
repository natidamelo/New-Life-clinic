# Quick Fix - Lab Inventory Not Deducting

## Problem
Lab inventory (ESR, WBC, ASO, CRP, Widal, etc.) is not deducting when lab tests are completed.

## ✅ Fixes Already Applied
1. ✅ Added inventory mappings for ESR, WBC, ASO, CRP, Widal, etc.
2. ✅ Created inventory items in the database
3. ✅ Fixed controller logic

## 🚨 What You Need to Do NOW

### Step 1: Start the System
**Option A: Use the startup script (EASIEST)**
```
Double-click: START_CLINIC_SYSTEM.bat
```

**Option B: Manual startup**
1. Open 2 command prompts (CMD or PowerShell)

2. **In Terminal 1 - Start Backend:**
   ```bash
   cd "C:\Users\HP\OneDrive\Desktop\clinic new life\backend"
   npm start
   ```

3. **In Terminal 2 - Start Frontend:**
   ```bash
   cd "C:\Users\HP\OneDrive\Desktop\clinic new life\frontend"
   npm start
   ```

### Step 2: Test the Inventory Deduction

1. **Login to the system**
   - Go to http://localhost:3000
   - Login as a Lab Technician

2. **Find a Lab Order**
   - Go to Lab Dashboard
   - Look for pending tests like "ESR", "WBC", "ASO", "CRP", "Widal"

3. **Complete the Test**
   - Click on the test
   - Enter results (any value will work)
   - Mark as "Results Available" or "Complete"
   - Click Save/Submit

4. **Check Inventory**
   - Go to Inventory Management
   - Find the lab test item (e.g., "ESR (Erythrocyte Sedimentation Rate)")
   - **The quantity should have decreased by 1**

5. **Check Backend Console**
   - Look at the backend terminal/console
   - You should see logs like:
   ```
   🔬 [UPDATE LAB ORDER] Processing inventory deduction for completed lab order: ESR
   ✅ [INVENTORY] Inventory deducted successfully
   ```

### Step 3: Verify for Each Test Type

Test these common lab tests to verify inventory deduction works:

- [ ] **ESR** (Erythrocyte Sedimentation Rate)
- [ ] **WBC** (White Blood Cell Count) 
- [ ] **ASO** (Anti-Streptolysin O)
- [ ] **CRP** (C-Reactive Protein)
- [ ] **Widal** (Widal Test)

## 🔍 Troubleshooting

### Problem: Backend won't start
**Solution:**
```bash
cd "C:\Users\HP\OneDrive\Desktop\clinic new life\backend"
npm install
npm start
```

### Problem: Frontend won't start
**Solution:**
```bash
cd "C:\Users\HP\OneDrive\Desktop\clinic new life\frontend"
npm install
npm start
```

### Problem: MongoDB not running
**Solution (Windows):**
```bash
net start MongoDB
```

### Problem: Still not deducting inventory

**Check 1: Is the backend running?**
- Open http://localhost:5000/health
- Should show "OK" or server info

**Check 2: Check backend console logs**
Look for these messages when you complete a lab test:
- `🔬 [UPDATE LAB ORDER] Processing inventory deduction...`
- If you see: `No inventory mapping found for test: [TestName]`
  → The test name doesn't match. Check `backend/config/labTestInventoryMap.js`

**Check 3: Check test name spelling**
The test name in the lab order MUST match the key in `labTestInventoryMap.js` exactly.

Example:
- If database has: "wbc" → Won't work
- If database has: "WBC" → Will work ✅
- If database has: "White Blood Cell Count" → Will work ✅

**Check 4: Verify inventory item exists**
```bash
cd backend
node -e "const mongoose = require('mongoose'); const InventoryItem = require('./models/InventoryItem'); mongoose.connect('mongodb://localhost:27017/clinic_db').then(async () => { const items = await InventoryItem.find({ category: 'laboratory' }); console.log('Lab inventory:', items.map(i => i.name)); await mongoose.disconnect(); });"
```

### Problem: Test name doesn't match

If your test is called something different (e.g., "esr test" instead of "ESR"), add it to the mapping:

1. Open: `backend/config/labTestInventoryMap.js`
2. Add your test name:
```javascript
'esr test': { itemName: 'ESR (Erythrocyte Sedimentation Rate)', quantity: 1, category: 'laboratory' },
```
3. Restart backend server

## 📞 Getting Help

If it's still not working after following these steps:

1. **Check backend console** - Copy any error messages
2. **Check browser console** (F12) - Look for errors
3. **Run this diagnostic:**
```bash
cd backend
node -e "const mongoose = require('mongoose'); const LabOrder = require('./models/LabOrder'); mongoose.connect('mongodb://localhost:27017/clinic_db').then(async () => { const order = await LabOrder.findOne({}).select('testName status inventoryDeducted'); console.log('Sample lab order:', JSON.stringify(order, null, 2)); await mongoose.disconnect(); });"
```

## ✅ Expected Result

When you complete a lab test:
1. Backend logs show: `✅ [INVENTORY] Inventory deducted successfully`
2. Inventory quantity decreases by 1
3. Transaction record is created
4. Lab test marked as completed

---

**Date:** October 16, 2025
**Status:** System configured and ready - just need to start servers and test

