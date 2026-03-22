# How to Verify Lab Inventory Deduction is Working

## Quick Verification Steps

### 1. Check Inventory Items Exist
Run this command to verify all lab inventory items are in the database:
```bash
cd backend
node -e "const mongoose = require('mongoose'); const InventoryItem = require('./models/InventoryItem'); mongoose.connect('mongodb://localhost:27017/clinic_db').then(async () => { const items = await InventoryItem.find({ category: 'laboratory' }).select('name quantity'); console.log('Lab inventory items:'); items.forEach(item => console.log('  ✓', item.name, '-', item.quantity, 'units')); await mongoose.disconnect(); });"
```

Expected output:
```
Lab inventory items:
  ✓ ESR (Erythrocyte Sedimentation Rate) - 100 units
  ✓ WBC (White Blood Cell Count) - 100 units
  ✓ RBC (Red Blood Cell Count) - 100 units
  ✓ Platelet Count - 100 units
  ✓ ASO (Anti-Streptolysin O) - 50 units
  ✓ C-Reactive Protein - 50 units
  ✓ Widal Test - 50 units
  ✓ RF (Rheumatoid Factor) - 50 units
```

### 2. Test the Workflow in the Application

#### Step-by-Step:
1. **Login as Lab Technician**
   - Navigate to the lab dashboard

2. **Select a Pending Lab Test**
   - Find a test like "ESR", "WBC", "ASO", "CRP", or "Widal"
   - Note the current inventory quantity (check Inventory Management page)

3. **Enter Test Results**
   - Click on the test
   - Enter the test results
   - Click "Submit" or "Complete"

4. **Verify Inventory Deduction**
   - Go to Inventory Management page
   - Find the corresponding lab test item (e.g., "ESR (Erythrocyte Sedimentation Rate)")
   - Verify that the quantity has decreased by 1

5. **Check Backend Logs**
   - Look for these log messages in the backend console:
   ```
   🔬 [UPDATE LAB ORDER] Processing inventory deduction for completed lab order: ESR
   🔬 [INVENTORY] ========== STARTING LAB INVENTORY DEDUCTION ==========
   🔬 [INVENTORY] ✅ Deduction lock acquired for lab order [id]
   🔬 [INVENTORY] Found mapping for ESR: { itemName: 'ESR (Erythrocyte Sedimentation Rate)', quantity: 1, category: 'laboratory' }
   ✅ [INVENTORY] Lab test details:
      Test: ESR
      Inventory item: ESR (Erythrocyte Sedimentation Rate)
      Current quantity: 100
      Quantity to consume: 1
   ✅ [INVENTORY] Inventory updated successfully:
      Previous quantity: 100
      New quantity: 99
   ✅ [UPDATE LAB ORDER] Inventory deducted successfully for ESR:
      Item: ESR (Erythrocyte Sedimentation Rate)
      Quantity consumed: 1
      New quantity: 99
   ```

### 3. Check Inventory Transaction History
1. Go to **Inventory Management** in the application
2. Click on a lab test item (e.g., "ESR (Erythrocyte Sedimentation Rate)")
3. View the transaction history
4. You should see an entry like:
   - Type: `medical-use`
   - Reason: `Lab test completed: ESR`
   - Quantity: `-1`
   - Previous Quantity: `100`
   - New Quantity: `99`

## Lab Tests That Should Work

The following lab tests now have inventory deduction enabled:

### Hematology Tests
- ✅ **ESR** (Erythrocyte Sedimentation Rate)
- ✅ **WBC** (White Blood Cell Count)
- ✅ **RBC** (Red Blood Cell Count)
- ✅ **Platelet Count** / **PLT**
- ✅ **CBC** (Complete Blood Count) - uses Hemoglobin mapping

### Serological Tests
- ✅ **ASO** (Anti-Streptolysin O)
- ✅ **CRP** (C-Reactive Protein)
- ✅ **Widal** (Widal Test for Typhoid)
- ✅ **RF** (Rheumatoid Factor)

### Other Common Tests (already configured)
- ✅ Glucose Tests (FBS, RBS)
- ✅ Urinalysis
- ✅ Hepatitis Tests (HBsAg, HCV)
- ✅ HIV Test
- ✅ Malaria Test
- And many more...

## What Happens Behind the Scenes

When a lab technician marks a test as "Completed" or "Results Available":

1. **Frontend** → Calls `updateLabOrderStatus(testId, 'Results Available', results)`
2. **Backend Controller** → Checks if inventory needs to be deducted
3. **Atomic Lock** → Sets `inventoryDeducted = true` to prevent double deduction
4. **Finds Mapping** → Looks up test name in `labTestInventoryMap.js`
5. **Finds Inventory Item** → Searches for the inventory item by name and category
6. **Deducts Quantity** → Uses atomic `$inc` to decrease quantity by 1
7. **Creates Transaction** → Records the deduction in inventory transaction history
8. **Logs Success** → Outputs detailed logs for debugging

## Troubleshooting

### Problem: "No inventory mapping found for test: [TestName]"
**Solution:** Add the test to `backend/config/labTestInventoryMap.js`:
```javascript
'Your Test Name': { itemName: 'Inventory Item Name', quantity: 1, category: 'laboratory' },
```

### Problem: "Inventory item not found: [ItemName]"
**Solution:** Create the inventory item in the database or run:
```bash
cd backend
node scripts/add-missing-lab-inventory.js
```

### Problem: "Inventory already deducted, skipping"
**Solution:** This is normal! The system prevents double deduction. Each lab order can only have inventory deducted once.

### Problem: Inventory not decreasing
**Checklist:**
1. ✓ Is the inventory item active? (`isActive: true`)
2. ✓ Is the category correct? (`category: 'laboratory'`)
3. ✓ Does the test name match exactly in the mapping?
4. ✓ Is there sufficient stock? (quantity > 0)
5. ✓ Check backend logs for detailed error messages

## Backend Console Logs to Look For

### Success:
```
✅ [UPDATE LAB ORDER] Inventory deducted successfully for [TestName]
✅ [INVENTORY] Inventory updated successfully
```

### Skipped (Normal):
```
⏭️ [INVENTORY] SKIPPED - Inventory already deducted for lab order [id]
```

### No Mapping (Needs Fix):
```
🔬 [INVENTORY] No inventory mapping found for test: [TestName]
```

### No Inventory Item (Needs Fix):
```
🔬 [INVENTORY] Inventory item not found: [ItemName]
```

### Insufficient Stock (Low Inventory):
```
⚠️ [INVENTORY] Insufficient stock. Available: 0, Required: 1
```

## Need to Add More Tests?

See the guide in `LAB_INVENTORY_DEDUCTION_FIX_COMPLETE.md` under "Next Steps" section.

## Status
✅ All common lab tests (ESR, WBC, ASO, CRP, Widal, etc.) are now properly configured for inventory deduction.

