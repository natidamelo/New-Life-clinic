# Clear Devices Button Fix - Individual User

## Problem

- ❌ **"Clear Devices" button for individual users wasn't working**
- ✅ **"Clear All Devices" button was working perfectly**

## Root Cause

The issue was a **userId type mismatch** in MongoDB queries.

### Why It Failed

MongoDB stores `userId` as ObjectId, but the query was only trying to match as a string:

```javascript
// OLD - Only tried string match
const staffHashResult = await StaffHash.deleteMany({ userId });
const deviceRegResult = await DeviceRegistration.deleteMany({ userId });
```

If the userId in the database was stored as ObjectId but the parameter was a string, the query would find 0 records and delete nothing.

### Why "Clear All" Worked

The "Clear All Devices" endpoint uses `deleteMany({})` with no filter, so it doesn't matter what type the userId is - it deletes everything:

```javascript
// Clear All - No filter, deletes everything
const staffHashResult = await StaffHash.deleteMany({});
const deviceRegResult = await DeviceRegistration.deleteMany({});
```

## The Fix

Updated `/api/qr/deactivate-device/:userId` to try BOTH string and ObjectId:

```javascript
// Convert userId to ObjectId
const userObjectId = new mongoose.Types.ObjectId(userId);

// Try BOTH string and ObjectId formats
const staffHashResult = await StaffHash.deleteMany({ 
  $or: [
    { userId: userId },        // Try as string
    { userId: userObjectId }   // Try as ObjectId
  ]
});

const deviceRegResult = await DeviceRegistration.deleteMany({ 
  $or: [
    { userId: userId },        // Try as string
    { userId: userObjectId }   // Try as ObjectId
  ]
});
```

### Additional Improvements

1. **Better error handling:**
   ```javascript
   try {
     userObjectId = new mongoose.Types.ObjectId(userId);
   } catch (e) {
     return res.status(400).json({
       success: false,
       message: 'Invalid user ID format'
     });
   }
   ```

2. **Enhanced logging:**
   ```javascript
   console.log(`🧹 [ClearDevice] Clearing for user: ${userId}`);
   console.log(`🧹 [ClearDevice] Cleared ${staffHashResult.deletedCount} staff hashes`);
   console.log(`🧹 [ClearDevice] Cleared ${deviceRegResult.deletedCount} device registrations`);
   console.log(`🧹 [ClearDevice] Total cleared: ${totalCleared} records`);
   ```

3. **Clearer response when nothing found:**
   ```javascript
   if (totalCleared === 0) {
     console.warn(`⚠️ [ClearDevice] No registrations found for user ${userId}`);
     res.json({
       success: true,
       message: 'No device registration found for this user',
       details: { staffHashes: 0, deviceRegistrations: 0, total: 0 }
     });
   }
   ```

## How It Works Now

### Step-by-Step Flow

1. **Admin clicks "Clear Devices"** for Mahlet Yohannes
2. **Frontend sends:** `POST /api/qr/deactivate-device/67890abcdef12345` (userId as string)
3. **Backend receives:** userId = "67890abcdef12345"
4. **Backend converts:** userObjectId = ObjectId("67890abcdef12345")
5. **Backend queries:**
   ```javascript
   // Tries BOTH formats in one query
   { $or: [
       { userId: "67890abcdef12345" },           // String
       { userId: ObjectId("67890abcdef12345") }  // ObjectId
   ]}
   ```
6. **MongoDB finds matches** regardless of how userId is stored
7. **Deletes records** from both tables
8. **Returns success** with count

### Frontend Response

```javascript
const details = response.data.details;
toast.success(`✅ Cleared ${details?.total || 0} device registration(s) for Mahlet Yohannes`);

// Updates local state immediately
setDeviceRegistrationStatus(prev => ({
  ...prev,
  [userId]: false
}));

// Refreshes after 500ms
setTimeout(() => fetchUsers(), 500);
```

## Testing

### Test 1: Clear Individual User Device ✅

1. **Find user with "Registered" status**
2. **Click "Clear Devices"** button
3. **Confirm** action
4. **Expected:**
   - Console logs: "Cleared X staff hashes", "Cleared Y device registrations"
   - Toast: "✅ Cleared 2 device registration(s)"
   - Status immediately changes to "Not Registered"
   - Button disappears

### Test 2: Clear User with No Devices ✅

1. **Find user with "Not Registered" status**
2. **Button should not appear** (hidden by condition)
3. **If button somehow visible and clicked:**
   - Returns: "No device registration found for this user"
   - Still returns success (not an error)

### Test 3: Clear All Devices ✅

1. **Click "🧹 Clear All Devices"** button
2. **Confirm** the warning dialog
3. **Expected:**
   - Clears ALL users' devices
   - All statuses change to "Not Registered"
   - All "Clear Devices" buttons disappear

## Console Output Examples

### Successful Clear

```
🧹 [ClearDevice] Clearing all device registrations for user: 67890abcdef12345
🧹 [ClearDevice] Cleared 1 staff hashes
🧹 [ClearDevice] Cleared 1 device registrations
🧹 [ClearDevice] Total cleared: 2 records for user 67890abcdef12345
```

### No Registrations Found

```
🧹 [ClearDevice] Clearing all device registrations for user: 67890abcdef12345
🧹 [ClearDevice] Cleared 0 staff hashes
🧹 [ClearDevice] Cleared 0 device registrations
⚠️ [ClearDevice] No registrations found for user 67890abcdef12345
```

### Invalid User ID

```
❌ [ClearDevice] Invalid userId format: invalid-id-123
```

## MongoDB Query Comparison

### Before (Broken) ❌

```javascript
// Only matched if userId was stored as exact string
db.staffhashes.deleteMany({ userId: "67890abcdef12345" })
db.deviceregistrations.deleteMany({ userId: "67890abcdef12345" })

// If stored as ObjectId, found 0 records → deleted nothing
```

### After (Fixed) ✅

```javascript
// Matches BOTH string and ObjectId
db.staffhashes.deleteMany({ 
  $or: [
    { userId: "67890abcdef12345" },
    { userId: ObjectId("67890abcdef12345") }
  ]
})

db.deviceregistrations.deleteMany({ 
  $or: [
    { userId: "67890abcdef12345" },
    { userId: ObjectId("67890abcdef12345") }
  ]
})

// Finds records regardless of storage format
```

## Files Modified

✅ `backend/routes/qrCode.js` (Lines 797-872)
- Added mongoose ObjectId conversion
- Added $or query to try both string and ObjectId
- Enhanced error handling
- Improved logging
- Better response messages

## Summary

The "Clear Devices" button for individual users now works because:

1. ✅ **Tries both userId formats** (string and ObjectId)
2. ✅ **Better error handling** for invalid IDs
3. ✅ **Enhanced logging** for debugging
4. ✅ **Clearer responses** when no records found
5. ✅ **Works regardless** of how userId is stored in database

The fix ensures compatibility with different userId storage formats in MongoDB, making the individual clear function as reliable as the "Clear All" function.

