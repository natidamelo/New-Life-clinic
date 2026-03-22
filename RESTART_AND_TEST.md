# Quick Start Guide - Restart & Test

## 🚀 STEP 1: Restart Backend

### Option A: Using Command Prompt/PowerShell
```bash
cd "C:\Users\HP\OneDrive\Desktop\clinic new life\backend"
npm start
```

### Option B: Using the Batch File
Double-click: **`RESTART_BACKEND.bat`**

### Wait for:
```
✅ MongoDB connected
✅ Server is running on port 5002
```

---

## 🧪 STEP 2: Test Inventory Deduction

### Test #1: ESR (Erythrocyte Sedimentation Rate)
1. Go to **Lab Dashboard**
2. Find a test with name containing "ESR"
3. Enter results (any value like "10 mm/hr")
4. Mark as **"Results Available"**
5. Click Submit
6. ✅ Check **Inventory Management** → Search "ESR" → Quantity should decrease by 1

### Test #2: CRP (C-Reactive Protein)
1. Find test with "CRP" in the name
2. Enter results
3. Mark as "Results Available"
4. ✅ Check inventory → "CRP Fluid/Reagent" should decrease by 1

### Test #3: Widal
1. Find "Widal" test
2. Complete it
3. ✅ Check "Widal O & H Test (100 tests)" inventory

---

## 👀 STEP 3: Watch Backend Logs

When you complete a test, you should see in the backend window:

### ✅ SUCCESS (Inventory Deducted):
```
🔬 [UPDATE LAB ORDER] Processing inventory deduction for completed lab order: ESR
🔬 [INVENTORY] Found mapping for ESR: { itemName: 'Erythrocyte Sedimentation Rate (ESR)', ... }
🔬 [INVENTORY] Lab test details:
   Test: ESR
   Inventory item: Erythrocyte Sedimentation Rate (ESR)
   Current quantity: 1000
   Quantity to consume: 1
✅ [INVENTORY] Inventory updated successfully:
   Previous quantity: 1000
   New quantity: 999
✅ [UPDATE LAB ORDER] Inventory deducted successfully for ESR
```

### ℹ️ INFO (No Inventory Item):
```
🔬 [INVENTORY] Inventory item not found: [ItemName]
ℹ️ [UPDATE LAB ORDER] Inventory deduction skipped for [TestName]
```
**This is OK!** The test still completes. Just means you need to add that inventory item.

### ⏭️ SKIPPED (Already Deducted):
```
⏭️ [INVENTORY] SKIPPED - Inventory already deducted for lab order [id]
```
**This is GOOD!** Prevents double-deduction.

---

## 📊 STEP 4: Verify Database

Run this to see deduction history:
```bash
cd backend
node -e "const mongoose = require('mongoose'); mongoose.connect('mongodb://localhost:27017/clinic-cms').then(async () => { const LabOrder = require('./models/LabOrder'); const orders = await LabOrder.find({ status: 'Results Available', inventoryDeducted: true }).sort({ updatedAt: -1 }).limit(5).select('testName inventoryDeductedAt'); console.log('Recently deducted tests:'); orders.forEach(o => console.log('✅', o.testName, '- Deducted:', o.inventoryDeductedAt.toISOString().split('T')[0])); await mongoose.disconnect(); });"
```

---

## ✅ WHAT TO EXPECT

### Working Correctly:
- ✅ Inventory quantity decreases when test completed
- ✅ Backend logs show successful deduction
- ✅ `inventoryDeducted: true` on lab order
- ✅ Transaction record created

### Test Doesn't Have Inventory:
- ✅ Test still completes (no error)
- ℹ️ Backend logs "Inventory item not found"
- ℹ️ No deduction happens (nothing to deduct from)
- ✅ System continues working

### Test Already Completed Before:
- ✅ Updating it doesn't deduct again
- ⏭️ Backend logs "Already deducted"
- ✅ Prevents double-deduction

---

## 🎯 ALL TESTS THAT WILL WORK

These will deduct inventory when completed:

1. ✅ **ESR** → Erythrocyte Sedimentation Rate (ESR)
2. ✅ **WBC** → White Blood Cell Count
3. ✅ **Hemoglobin** → Hemoglobin
4. ✅ **ASO** → ASO Fluid/Reagent
5. ✅ **CRP** → CRP Fluid/Reagent (100 tests)
6. ✅ **Widal** → Widal O & H Test (100 tests)
7. ✅ **Complete Urinalysis** → Complete Urinalysis
8. ✅ **Stool Exam** → Stool Exam (Routine)
9. ✅ **Glucose, Fasting** → Glucose, Fasting
10. ✅ **Uric Acid** → Uric Acid
11. ✅ **HIV** → HIV Antibody
12. ✅ **HBsAg** → Hepatitis B Surface Antigen
13. ✅ **HCV** → Hepatitis C Antibody
14. ✅ **VDRL/RPR** → VDRL/RPR
15. ✅ **H. pylori** → H. pylori Antigen
16. ✅ **FOBT** → Fecal Occult Blood Test (FOBT)
17. ✅ **Weil-Felix** → Weil-Felix Test (100 tests)
18. ✅ **Urine HCG** → Urine HCG

---

## 📞 TROUBLESHOOTING

### Backend Won't Start
```bash
# Kill all Node processes first
taskkill /F /IM node.exe

# Then start fresh
cd "C:\Users\HP\OneDrive\Desktop\clinic new life\backend"
npm start
```

### Port 5002 Already in Use
```bash
# Check what's using port 5002
netstat -ano | findstr :5002

# Kill the process (replace PID with actual number)
taskkill /F /PID [PID]
```

### Inventory Not Decreasing
1. ✅ Check backend is running (look for backend window)
2. ✅ Check backend logs (what does it say when you complete test?)
3. ✅ Check test name matches mapping (see COMPREHENSIVE_LAB_MAPPING_COMPLETE.md)
4. ✅ Check inventory item name is EXACT match

---

## ✅ SUCCESS CHECKLIST

- [ ] Backend running on port 5002
- [ ] Completed a test marked as "Results Available"
- [ ] Checked backend logs (saw success message)
- [ ] Verified inventory decreased in Inventory Management
- [ ] Tested 2-3 different test types

**If all checked ✅ → SYSTEM IS WORKING PERFECTLY!** 🎉

---

**Need Help?**
- Check backend logs first
- See COMPREHENSIVE_LAB_MAPPING_COMPLETE.md for all mappings
- See COMPLETE_FIX_SUMMARY.md for detailed explanation

