# Duplicate Check Fix for Inventory Sync

## Issue
After implementing the dual inventory system and atomic locks, inventory categories were still going out of sync. Glucose Strip inventory showed:
- Laboratory: 45 units
- Service: 44 units

Investigation revealed that 4 laboratory deductions occurred without corresponding service syncs.

## Root Cause
The duplicate check in the service sync logic was **too broad**. It was checking:

```javascript
// OLD LOGIC - TOO BROAD
const existingServiceTransaction = await InventoryTransaction.findOne({
  item: serviceItem._id,
  reason: { $regex: new RegExp(`Lab test completed.*${labOrder.testName}`, 'i') },
  createdAt: { $gte: new Date(Date.now() - 60000) } // Within last minute
});
```

### Problem
When multiple lab orders for the **same test** (e.g., "Glucose Test Strips") were processed within 60 seconds:
1. First order completes → creates both Laboratory and Service transactions
2. Second order starts processing
3. Second order's service sync checks for duplicates
4. Finds the FIRST order's transaction (same test name, within 60 seconds)
5. **Skips the service sync** thinking it's a duplicate
6. Result: Second order only deducts from Laboratory, not Service

This caused the categories to gradually drift out of sync when the same test was ordered multiple times in quick succession.

## Solution

### 1. Fixed Lab Inventory Deduction (`backend/services/inventoryDeductionService.js`)
Changed the duplicate check to be **specific to the lab order**:

```javascript
// NEW LOGIC - SPECIFIC TO THIS LAB ORDER
const existingServiceTransaction = await InventoryTransaction.findOne({
  item: serviceItem._id,
  documentReference: labOrder._id,  // ✅ Check for THIS specific lab order
  reason: { $regex: new RegExp(`Lab test completed.*synced from Laboratory`, 'i') }
  // ❌ Removed time-based check - not needed when we have specific order ID
});
```

### 2. Fixed Medication Administration (`backend/routes/medicationAdministration.js`)
Applied the same fix to medication administration:

```javascript
// NEW LOGIC - SPECIFIC TO THIS TASK AND DOSE
const existingServiceTransaction = await InventoryTransaction.findOne({
  item: serviceItem._id,
  documentReference: taskId,  // ✅ Specific task ID
  reason: { $regex: new RegExp(`${medicationName}.*Day ${day}.*${standardizedTimeSlot}.*synced from Medication`, 'i') }
  // ❌ Removed time-based check
});
```

### 3. Synced Existing Inventory
Created adjustment transactions to bring the mismatched categories back in sync:
- Adjusted Laboratory: 45 → 44
- Service remained: 44

## Key Changes
1. **Document Reference Required**: Duplicate checks now require matching `documentReference` (order ID / task ID)
2. **More Specific Reason Regex**: Now includes "synced from Laboratory" or "synced from Medication" to ensure we're checking for sync transactions specifically
3. **Removed Time-Based Check**: No longer needed since we're matching on specific document IDs

## Testing
To verify the fix works:
1. Order the same lab test multiple times in quick succession
2. Process all the lab orders
3. Check that both Laboratory and Service categories deduct the same total amount

## Impact
- ✅ Prevents categories from drifting out of sync
- ✅ Allows multiple orders of the same item to be processed simultaneously
- ✅ More precise duplicate detection
- ✅ Maintains atomic protection against true duplicates (same order processed twice)

## Files Modified
1. `backend/services/inventoryDeductionService.js` - Lab inventory sync duplicate check
2. `backend/routes/medicationAdministration.js` - Medication sync duplicate check

## Related Documentation
- See `INVENTORY_RACE_CONDITION_FIXES.md` for atomic lock implementation
- See `COMPLETE_INVENTORY_AUDIT.md` for full system audit


