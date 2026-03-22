# Device Status Check Fix

## Problem

After clicking "Clear Devices" button, the device status still showed "Registered" ✅ even though all device data was cleared from the database.

## Root Cause

The backend endpoints `/api/qr/staff-registration-status/:userId` and `/api/qr/staff-registration-status/batch` were **only checking the StaffHash table**, but the "Clear Devices" button deletes from **BOTH** StaffHash AND DeviceRegistration tables.

### Before (Broken):
```javascript
// Only checked StaffHash table
const staffHash = await StaffHash.findOne({ userId });
const isRegistered = !!staffHash; // ❌ Incomplete check
```

**Problem**: 
- If StaffHash existed but DeviceRegistration was deleted, status showed "Registered" ✅
- If DeviceRegistration existed but StaffHash was deleted, status showed "Registered" ✅
- Inconsistent with actual device capability to check-in/out

## Solution

Updated both endpoints to check **BOTH tables** and require BOTH to exist for a user to be considered registered.

### After (Fixed):
```javascript
// Check BOTH tables
const staffHash = await StaffHash.findOne({ userId });
const deviceRegistration = await DeviceRegistration.findOne({ 
  userId: userId,
  isActive: true 
});

// User is registered ONLY if they have BOTH
const isRegistered = !!staffHash && !!deviceRegistration; // ✅ Complete check
```

## Changes Made

### 1. Updated Single User Status Check

**File**: `backend/routes/qrCode.js`  
**Endpoint**: `GET /api/qr/staff-registration-status/:userId`

**Before**:
```javascript
router.get('/staff-registration-status/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const staffHash = await StaffHash.findOne({ userId });
    
    res.json({
      success: true,
      data: {
        isRegistered: !!staffHash, // ❌ Only checked one table
        registrationDate: staffHash?.createdAt || null
      }
    });
  } catch (error) {
    // error handling
  }
});
```

**After**:
```javascript
router.get('/staff-registration-status/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Check BOTH tables to ensure accurate registration status
    const staffHash = await StaffHash.findOne({ userId });
    
    const DeviceRegistration = require('../models/DeviceRegistration');
    const deviceRegistration = await DeviceRegistration.findOne({ 
      userId: userId,
      isActive: true 
    });
    
    // User is considered registered if they have BOTH StaffHash AND DeviceRegistration
    const isRegistered = !!staffHash && !!deviceRegistration; // ✅ Checks both
    
    console.log(`📊 [RegistrationStatus] User ${userId}:`, {
      hasStaffHash: !!staffHash,
      hasDeviceReg: !!deviceRegistration,
      isRegistered: isRegistered
    });
    
    res.json({
      success: true,
      data: {
        isRegistered: isRegistered,
        registrationDate: staffHash?.createdAt || deviceRegistration?.registeredAt || null,
        hash: staffHash?.uniqueHash || null,
        hasStaffHash: !!staffHash,
        hasDeviceRegistration: !!deviceRegistration
      }
    });
  } catch (error) {
    // error handling
  }
});
```

### 2. Updated Batch Status Check

**File**: `backend/routes/qrCode.js`  
**Endpoint**: `POST /api/qr/staff-registration-status/batch`

**Before**:
```javascript
for (const userId of userIds) {
  try {
    // Check if user has any active staff registration hashes
    const staffHash = await StaffHash.findOne({ 
      userId: userId,
      hashType: 'staff-registration',
      isActive: true
    });
    
    registrationMap[userId] = !!staffHash; // ❌ Only checked one table
  } catch (error) {
    registrationMap[userId] = false;
  }
}
```

**After**:
```javascript
const DeviceRegistration = require('../models/DeviceRegistration');

for (const userId of userIds) {
  try {
    // Check if user has any active staff registration hashes
    const staffHash = await StaffHash.findOne({ 
      userId: userId,
      hashType: 'staff-registration',
      isActive: true
    });
    
    // Also check DeviceRegistration table
    const deviceRegistration = await DeviceRegistration.findOne({
      userId: userId,
      isActive: true
    });
    
    // User is registered only if they have BOTH
    const isRegistered = !!staffHash && !!deviceRegistration; // ✅ Checks both
    registrationMap[userId] = isRegistered;
    
    if (isRegistered) {
      console.log(`[QR] User ${userId} has active registration`);
    } else {
      console.log(`[QR] User ${userId} incomplete registration - StaffHash: ${!!staffHash}, DeviceReg: ${!!deviceRegistration}`);
    }
  } catch (error) {
    registrationMap[userId] = false;
  }
}
```

## Registration Status Logic

### Complete Registration ✅
- **StaffHash exists** AND **DeviceRegistration exists**
- Status: "Registered"
- Can check-in/out: YES

### Incomplete Registration ❌
Any of these scenarios:
1. **StaffHash exists** BUT **DeviceRegistration missing**
   - Status: "Not Registered"
   - Can check-in/out: NO
   
2. **DeviceRegistration exists** BUT **StaffHash missing**
   - Status: "Not Registered"
   - Can check-in/out: NO
   
3. **Both missing**
   - Status: "Not Registered"
   - Can check-in/out: NO

## Why Both Tables Are Required

### StaffHash Table
- Stores the registration QR code hash
- Contains device fingerprint (for reference)
- Used to verify registration QR codes
- **Purpose**: Authorization to register

### DeviceRegistration Table
- Stores the actual device fingerprint from registration
- Used to validate check-in/check-out requests
- Contains device metadata (user agent, IP, etc.)
- **Purpose**: Device authentication

### Both Required Because:
1. **StaffHash** = "This user is allowed to register"
2. **DeviceRegistration** = "This specific device is registered"
3. **Both** = "This user has successfully registered THIS device"

## Testing the Fix

### Test 1: Normal Registration

1. **Generate registration QR** for a user
2. **Scan on phone** → Creates both StaffHash and DeviceRegistration
3. **Check status** → Shows "Registered" ✅
4. **Try check-in** → Works ✅

### Test 2: Clear Devices Button

1. **User has registered device** → Status shows "Registered" ✅
2. **Click "Clear Devices"** → Deletes from both tables
3. **Refresh page** → Status should show "Not Registered" ❌
4. **Try check-in** → Should be blocked ❌

### Test 3: Partial Registration (Edge Case)

If somehow only one table has data:

1. **Only StaffHash exists** (DeviceRegistration missing)
   - Status: "Not Registered" ❌
   - Check-in: Blocked ❌
   
2. **Only DeviceRegistration exists** (StaffHash missing)
   - Status: "Not Registered" ❌
   - Check-in: Blocked ❌

## Response Format

### Single User Response

```json
{
  "success": true,
  "data": {
    "isRegistered": true,
    "registrationDate": "2025-01-15T10:30:00.000Z",
    "hash": "a1b2c3d4e5f6...",
    "hasStaffHash": true,
    "hasDeviceRegistration": true
  }
}
```

### Batch Users Response

```json
{
  "success": true,
  "data": {
    "507f1f77bcf86cd799439011": true,  // User 1: Registered
    "507f1f77bcf86cd799439012": false, // User 2: Not registered
    "507f1f77bcf86cd799439013": true   // User 3: Registered
  }
}
```

## Console Logging

### Single User Check
```
📊 [RegistrationStatus] User 507f1f77bcf86cd799439011:
  hasStaffHash: true
  hasDeviceReg: true
  isRegistered: true
```

### Batch Check
```
[QR] User 507f1f77bcf86cd799439011 has active registration: a1b2c3d4e5f6...
[QR] User 507f1f77bcf86cd799439012 incomplete registration - StaffHash: true, DeviceReg: false
[QR] Batch registration status requested for 2 users - found 1 registered
```

## Impact on UI

### Before Fix
- ❌ Status showed "Registered" even after clearing
- ❌ Confusing for admins
- ❌ Inconsistent with actual check-in capability

### After Fix
- ✅ Status shows "Not Registered" immediately after clearing
- ✅ Clear visual feedback
- ✅ Consistent with actual check-in capability

## Files Modified

1. ✅ `backend/routes/qrCode.js` - Updated `/api/qr/staff-registration-status/:userId` endpoint
2. ✅ `backend/routes/qrCode.js` - Updated `/api/qr/staff-registration-status/batch` endpoint

## Summary

The device status check now accurately reflects whether a user has a **complete, working device registration** by verifying both:
1. Registration QR code (StaffHash)
2. Device fingerprint (DeviceRegistration)

When you click "Clear Devices", both are deleted, and the status immediately updates to "Not Registered" as expected.

