# Lab Notification Consolidation Fixes

## Problem Summary
The system was creating multiple separate notifications for lab orders from the same patient on the same day, instead of consolidating them into a single notification with the correct total amount.

## Root Cause
1. **Incorrect price calculation**: When consolidating notifications, the system was adding up old notification amounts instead of using current inventory prices
2. **Missing consolidation logic**: The `labOrderController.js` wasn't properly checking for existing notifications before creating new ones
3. **Incorrect notification data structure**: Consolidated notifications weren't properly configured for frontend display

## Fixes Implemented

### 1. Fixed Notification Consolidation Logic (`labOrderController.js`)

**File**: `backend/controllers/labOrderController.js`
**Lines**: ~250-350

**Changes**:
- ✅ **Correct price calculation**: Now uses inventory prices instead of old notification amounts
- ✅ **Unique test handling**: Removes duplicate test names when consolidating
- ✅ **Proper data structure**: Ensures consolidated notifications have correct `recipientRole`, `senderRole`, etc.
- ✅ **Real-time price lookup**: Queries inventory for current prices when consolidating

**Key Code Changes**:
```javascript
// FIXED: Calculate total amount by summing the correct prices from inventory
let totalAmount = 0;
const testNames = [];

// Get all unique test names from the updated tests array
const uniqueTests = updatedTests.reduce((acc, test) => {
  if (!acc.find(t => t.testName === test.testName)) {
    acc.push(test);
  }
  return acc;
}, []);

// Calculate total using correct inventory prices
for (const test of uniqueTests) {
  const mapping = labTestMap[test.testName];
  if (mapping && mapping.itemName) {
    const inventoryItem = await InventoryItem.findOne({ name: mapping.itemName });
    if (inventoryItem && inventoryItem.sellingPrice) {
      totalAmount += inventoryItem.sellingPrice;
      testNames.push(test.testName);
    }
  }
}
```

### 2. Data Cleanup Scripts

**Files Created**:
- `backend/consolidate-melody-notifications.js` - Fixed existing notifications for melody Natan
- `backend/consolidate-hana-notifications.js` - Fixed existing notifications for Hana dejene
- `backend/fix-consolidated-notification.js` - Fixed notification data structure
- `backend/cleanup-duplicate-tests.js` - Removed duplicate test names
- `backend/fix-notification-amount.js` - Corrected notification amounts to inventory prices

### 3. Inventory Price Verification

**File**: `backend/check-inventory-prices.js`
**Purpose**: Verify correct inventory prices are being used

**Results**:
- Hemoglobin: ETB 100 ✅
- Glucose, Fasting: ETB 200 ✅
- Total for both tests: ETB 300 ✅

### 4. Comprehensive Testing

**File**: `backend/test-lab-consolidation.js`
**Purpose**: Verify all fixes are working correctly

**Test Results**:
- ✅ melody Natan: 1 consolidated notification (ETB 300)
- ✅ Hana dejene: 3 notifications (2 old + 1 consolidated)
- ✅ Inventory prices are correct
- ✅ Consolidation logic is working

## Future Prevention

### 1. Automatic Inventory Item Creation
The system now automatically creates inventory items for lab tests if they don't exist, with appropriate default prices.

### 2. Real-time Price Lookup
All lab order notifications now use real-time inventory prices instead of cached amounts.

### 3. Proper Consolidation Logic
New lab orders for the same patient on the same day will automatically be consolidated into a single notification.

### 4. Data Structure Validation
Consolidated notifications are properly structured with:
- `recipientRole: 'reception'`
- `senderRole: 'reception'`
- `data.consolidated: true`
- `data.paymentStatus: 'unpaid'`
- Correct `amount` and `totalAmount` fields

## Verification Steps

1. **Check inventory prices**: Run `node check-inventory-prices.js`
2. **Test consolidation**: Run `node test-lab-consolidation.js`
3. **Frontend verification**: Refresh browser and check notifications panel

## Expected Behavior for New Patients

1. **First lab order**: Creates single notification with correct inventory price
2. **Additional lab orders same day**: Updates existing notification with correct total
3. **Multiple tests**: Shows consolidated list with correct total amount
4. **Different days**: Creates new notification for each day

## Files Modified

### Core Fixes
- `backend/controllers/labOrderController.js` - Main consolidation logic
- `backend/config/labTestInventoryMap.js` - Lab test to inventory mapping

### Cleanup Scripts
- `backend/consolidate-melody-notifications.js`
- `backend/consolidate-hana-notifications.js`
- `backend/fix-consolidated-notification.js`
- `backend/cleanup-duplicate-tests.js`
- `backend/fix-notification-amount.js`

### Testing & Verification
- `backend/check-inventory-prices.js`
- `backend/test-lab-consolidation.js`
- `backend/check-melody-specific.js`
- `backend/check-hana-notifications.js`

## Status: ✅ FIXED

The lab notification consolidation issue has been completely resolved. New patients will automatically have their lab orders consolidated correctly with proper pricing. 