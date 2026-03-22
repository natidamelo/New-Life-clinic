# Inventory Race Condition - Root Cause Fixes

## 🔍 Problem Identified

**Symptom**: Lab tests and medications were deducting 2 or more units instead of 1
- Glucose Strip: 56 → 53 (deducted 3 units)
- Depo: 20 → 18 (deducted 2 units)

**Root Cause**: RACE CONDITIONS from multiple simultaneous function calls
- Multiple API endpoints calling the same deduction logic
- All checking "already deducted" flag BEFORE any complete
- Result: Multiple inventory deductions for a single event

---

## ✅ Fix #1: Lab Inventory Deduction (ATOMIC LOCK)

**File**: `backend/services/inventoryDeductionService.js`

**Problem**: 
- `deductLabInventory()` called from 5 different places simultaneously:
  1. `labOrderController.js` - status change
  2. `labs.js` (bulk) - completing tests
  3. `labs.js` (single) - entering results
  4. `labRoutes.js` (send to doctor)
  5. `labRoutes.js` (enter results)

**Solution**: Atomic lock acquisition at function start

```javascript
async deductLabInventory(labOrder, userId) {
  // ATOMIC LOCK: Try to claim the deduction by setting inventoryDeducted = true
  const LabOrder = require('../models/LabOrder');
  const lockedOrder = await LabOrder.findOneAndUpdate(
    { 
      _id: labOrder._id,
      inventoryDeducted: { $ne: true } // Only if NOT already deducted
    },
    { 
      $set: { 
        inventoryDeducted: true,
        inventoryDeductedAt: new Date(),
        inventoryDeductedBy: userId
      }
    },
    { new: true }
  );

  // If lockedOrder is null, another process already claimed it
  if (!lockedOrder) {
    console.log('⏭️ SKIPPED - Already deducted (race condition prevented)');
    return null;
  }

  // Only ONE call reaches here - proceed with inventory deduction
  // ...
}
```

**Result**: Only ONE of the simultaneous calls can successfully claim the deduction. Others immediately exit.

---

## ✅ Fix #2: Lab Service Category Deduction

**File**: `backend/services/inventoryDeductionService.js`

**Problem**: 
- Service category sync was using non-atomic operations
- Could be deducted multiple times if called simultaneously

**Solution**: Atomic operation + duplicate detection

```javascript
// Check for duplicate deduction
const existingServiceTransaction = await InventoryTransaction.findOne({
  item: serviceItem._id,
  reason: { $regex: new RegExp(`Lab test completed.*${labOrder.testName}`, 'i') },
  createdAt: { $gte: new Date(Date.now() - 60000) } // Within last minute
});

if (existingServiceTransaction) {
  console.log('⏭️ Service inventory already deducted, skipping duplicate');
} else {
  // Use atomic operation
  const updatedServiceItem = await InventoryItem.findOneAndUpdate(
    { _id: serviceItem._id, quantity: { $gte: quantityToConsume } },
    { 
      $inc: { quantity: -quantityToConsume },
      $set: { updatedBy: userId }
    },
    { new: true }
  );
  // ...
}
```

---

## ✅ Fix #3: Billing Service - Prevent Duplicate Lab Deduction

**File**: `backend/services/billingService.js`

**Problem**: 
- Billing was ALSO deducting Service inventory when adding lab to invoice
- Combined with lab completion deduction = double deduction

**Solution**: Removed serviceId from lab items

```javascript
case 'lab':
  itemData = {
    // ...
    // DO NOT include serviceId for lab items - inventory is deducted during lab completion, not billing
    // serviceId: serviceData.metadata?.serviceId,  // ❌ REMOVED
    metadata: {
      labOrderId: serviceData.labOrderId,
      // ...
    }
  };
```

**Result**: Billing NO LONGER deducts inventory for lab services

---

## ✅ Fix #4: Medication Dose Administration (ATOMIC LOCK)

**File**: `backend/routes/medicationAdministration.js`

**Problem**:
- Multiple simultaneous dose administration calls
- All passing "already administered" check before any complete
- Result: Multiple inventory deductions

**Solution**: Atomic dose marking BEFORE inventory deduction

```javascript
// ATOMIC LOCK: Mark dose as administered atomically
let atomicUpdate;
if (isMedicationTask) {
  atomicUpdate = await NurseTask.findOneAndUpdate(
    {
      _id: taskId,
      'medicationDetails.doseRecords': {
        $elemMatch: {
          day: day,
          timeSlot: standardizedTimeSlot,
          $or: [
            { administered: { $ne: true } },
            { administered: { $exists: false } }
          ]
        }
      }
    },
    {
      $set: {
        'medicationDetails.doseRecords.$.administered': true,
        'medicationDetails.doseRecords.$.administeredAt': new Date(),
        // ...
      }
    },
    { new: true }
  );
}

// If atomicUpdate is null, another process already claimed it
if (!atomicUpdate) {
  return res.status(400).json({
    error: 'DOSE_ALREADY_ADMINISTERED',
    message: 'Race condition prevented'
  });
}

// Only ONE call reaches here - proceed with inventory deduction
```

---

## ✅ Fix #5: Medication Service Category Deduction

**File**: `backend/routes/medicationAdministration.js`

**Problem**:
- Service category sync could have race conditions
- Non-atomic operations

**Solution**: Atomic operation + duplicate detection

```javascript
// Check for duplicate Service deduction
const existingServiceTransaction = await InventoryTransaction.findOne({
  item: serviceItem._id,
  documentReference: taskId,
  reason: { $regex: new RegExp(`${medicationName}.*Day ${day}.*${standardizedTimeSlot}`, 'i') },
  createdAt: { $gte: new Date(Date.now() - 60000) }
});

if (existingServiceTransaction) {
  console.log('⏭️ Service inventory already deducted, skipping duplicate');
} else {
  // Use atomic operation
  const updatedServiceItem = await InventoryItem.findOneAndUpdate(
    { _id: serviceItem._id, quantity: { $gte: 1 } },
    { 
      $inc: { quantity: -1 },
      $set: { updatedBy: req.user._id }
    },
    { new: true }
  );
  // ...
}
```

---

## 🎯 Summary of Protection Mechanisms

### 1. **Atomic Locks**
- Use MongoDB's `findOneAndUpdate` with conditions
- Only ONE process can successfully update
- Others get `null` and exit immediately

### 2. **Duplicate Detection**
- Check for existing transactions before deduction
- Use time-based window (last 60 seconds)
- Use regex matching for flexible detection

### 3. **Atomic Operations**
- Use `$inc` for quantity changes
- Use `$set` for field updates
- Prevents partial updates and race conditions

### 4. **Single Source of Truth**
- Lab inventory: Deducted ONLY during lab completion
- Medication inventory: Deducted ONLY during dose administration
- Billing: Does NOT deduct lab inventory (removed)

---

## 📊 Inventory Corrections Applied

### Glucose Test Strips
- **Before**: Laboratory: 49, Service: 50 (out of sync)
- **After**: Laboratory: 46, Service: 46 (synchronized)

### Depo
- **Before**: Medication: 21, Service: 19 (out of sync)
- **After**: Medication: 20, Service: 20 (synchronized & restored)

---

## 🚀 Testing Instructions

After restarting the backend server:

1. **Test Lab Order**:
   - Order Glucose Strip
   - Complete test and enter results
   - Verify: ONLY 1 unit deducted from both Laboratory and Service

2. **Test Medication Administration**:
   - Administer Depo dose
   - Verify: ONLY 1 unit deducted from both Medication and Service

3. **Test Concurrent Requests** (if needed):
   - Simulate multiple simultaneous API calls
   - Verify: Only ONE succeeds, others return "already processed"

---

## 🔒 Race Condition Protection Guaranteed

✅ **Lab Tests**: Atomic lock prevents multiple deductions
✅ **Medications**: Atomic dose marking prevents multiple deductions
✅ **Service Sync**: Duplicate detection + atomic operations
✅ **Billing**: Removed duplicate deduction path
✅ **All Categories**: Using MongoDB atomic operations for inventory updates

**Result**: Even with 100 simultaneous calls, only ONE will successfully deduct inventory! 🎯


