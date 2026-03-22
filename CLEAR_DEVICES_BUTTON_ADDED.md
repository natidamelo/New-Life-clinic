# Clear Devices Button Added to Staff Management

## Overview

Added a "Clear Devices" button to each staff row in the Staff Management page that allows admins to clear ALL device registrations for a specific user.

## Changes Made

### Backend: `backend/routes/qrCode.js`

**Endpoint**: `POST /api/qr/deactivate-device/:userId`

**Enhanced to clear BOTH tables:**

```javascript
// @route   POST /api/qr/deactivate-device/:userId
// @desc    Deactivate device registration for a staff member (clears ALL device data)
// @access  Private
router.post('/deactivate-device/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log(`🧹 [ClearDevice] Clearing all device registrations for user: ${userId}`);
    
    // Remove the staff hash record for this user
    const staffHashResult = await StaffHash.deleteMany({ userId });
    console.log(`🧹 [ClearDevice] Cleared ${staffHashResult.deletedCount} staff hashes`);
    
    // Also remove from DeviceRegistration table
    const DeviceRegistration = require('../models/DeviceRegistration');
    const deviceRegResult = await DeviceRegistration.deleteMany({ userId });
    console.log(`🧹 [ClearDevice] Cleared ${deviceRegResult.deletedCount} device registrations`);
    
    const totalCleared = staffHashResult.deletedCount + deviceRegResult.deletedCount;
    
    if (totalCleared > 0) {
      res.json({
        success: true,
        message: `Device cleared successfully! Removed ${totalCleared} registration(s).`,
        details: {
          staffHashes: staffHashResult.deletedCount,
          deviceRegistrations: deviceRegResult.deletedCount,
          total: totalCleared
        }
      });
    } else {
      res.json({
        success: true,
        message: 'No device registration found for this user'
      });
    }
  } catch (error) {
    console.error('Error clearing device:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});
```

**What it clears:**
1. ✅ **StaffHash** table - Registration QR code hashes
2. ✅ **DeviceRegistration** table - Device fingerprints and registration records

**Returns:**
```json
{
  "success": true,
  "message": "Device cleared successfully! Removed 2 registration(s).",
  "details": {
    "staffHashes": 1,
    "deviceRegistrations": 1,
    "total": 2
  }
}
```

### Frontend: `frontend/src/pages/Dashboard/StaffManagement.tsx`

**Location**: Actions column in staff table (Line 918-945)

**Button Features:**

```typescript
{/* Clear Devices Button */}
{deviceRegistrationStatus[user._id || user.id] && (
  <Button
    variant="outline"
    size="sm"
    onClick={async () => {
      if (window.confirm(`⚠️ Clear ALL device registrations for ${user.firstName} ${user.lastName}?\n\nThis will:\n• Remove all registered devices\n• Clear device fingerprints\n• Require them to re-register their device\n\nAre you sure?`)) {
        try {
          const response = await api.post(`/api/qr/deactivate-device/${user._id || user.id}`);
          if (response.data.success) {
            const details = response.data.details;
            toast.success(`✅ Cleared ${details?.total || 0} device registration(s) for ${user.firstName} ${user.lastName}`);
            fetchUsers(); // Refresh the list
          } else {
            toast.error('Failed to clear devices');
          }
        } catch (error) {
          console.error('Error clearing devices:', error);
          toast.error('Failed to clear devices');
        }
      }
    }}
    className="bg-destructive/10 hover:bg-destructive/20 text-destructive border-destructive/30 text-xs px-2 py-1 h-7"
  >
    <UserX className="h-3 w-3 mr-1" />
    Clear Devices
  </Button>
)}
```

**Button Properties:**
- ✅ **Only shown** when user has device registration
- ✅ **Destructive styling** (red color) to indicate dangerous action
- ✅ **Confirmation dialog** with detailed warning
- ✅ **UserX icon** to indicate device removal
- ✅ **Success toast** showing how many registrations were cleared
- ✅ **Auto-refreshes** staff list after clearing

## UI/UX

### Button Appearance

**Before clearing:**
- User has registered device → "Clear Devices" button appears in red

**After clearing:**
- Button disappears (no device registration)
- Device status changes from ✅ "Registered" to ❌ "Not Registered"

### Confirmation Dialog

```
⚠️ Clear ALL device registrations for John Doe?

This will:
• Remove all registered devices
• Clear device fingerprints
• Require them to re-register their device

Are you sure?
```

### Success Message

```
✅ Cleared 2 device registration(s) for John Doe
```

## User Flow

### Admin Actions

1. **Navigate** to Staff Management page (`/app/staff-management`)
2. **Find** the staff member row
3. **Check** if they have a registered device (✅ green checkmark in "Registered" column)
4. **Click** "Clear Devices" button in the Actions column
5. **Confirm** the action in the dialog
6. **See** success toast message
7. **Verify** the device status changes to "Not Registered"

### Staff Member Impact

1. **Current state**: Device registered ✅
2. **Admin clears devices** 
3. **New state**: Device not registered ❌
4. **Staff tries to check-in/out**:
   - ❌ Blocked with "Device not registered" error
   - Must scan new registration QR code
5. **Staff scans registration QR** → Device registered again ✅

## When to Use

### Use "Clear Devices" when:

1. ✅ **Staff member lost their phone** - Clear old device, register new one
2. ✅ **Staff member got new phone** - Clear old device, register new one
3. ✅ **Device is acting up** - Clear and re-register to fix issues
4. ✅ **Staff member left/suspended** - Clear their devices to prevent access
5. ✅ **Testing purposes** - Clear to test registration flow
6. ✅ **Security concerns** - Clear if device may be compromised

### Don't use when:

1. ❌ **Just want to generate new QR** - Use "Regenerate" button instead
2. ❌ **Staff is working normally** - No need to disrupt their workflow
3. ❌ **Just checking registration status** - Use "Show QR" to view only

## Comparison with Other Buttons

### Show QR
- **Purpose**: Display the registration QR code
- **Impact**: None - just shows information
- **Use when**: Staff needs to see/scan QR code

### Regenerate
- **Purpose**: Generate new QR code (invalidates old one)
- **Impact**: Old QR code won't work, new one must be scanned
- **Use when**: QR code expired or compromised

### Clear Devices ⭐ NEW
- **Purpose**: Remove ALL device registrations
- **Impact**: Removes device from both tables, staff can't check-in/out
- **Use when**: Need to completely reset device registration

### Deactivate (OLD - replaced by Clear Devices)
- **Purpose**: Same as Clear Devices but only cleared one table
- **Impact**: Partial clearing (bug fixed)
- **Status**: Replaced by improved "Clear Devices"

## Technical Details

### Database Tables Affected

#### 1. StaffHash
```javascript
{
  userId: ObjectId,
  uniqueHash: String,
  hashType: 'staff-registration',
  deviceFingerprint: String,
  isActive: Boolean
}
```

#### 2. DeviceRegistration
```javascript
{
  userId: ObjectId,
  deviceFingerprint: String,
  deviceHash: String,
  isActive: Boolean,
  registeredAt: Date,
  lastUsed: Date
}
```

### Delete Operation

```javascript
// Delete from both tables
await StaffHash.deleteMany({ userId });
await DeviceRegistration.deleteMany({ userId });
```

**Note**: Uses `deleteMany` instead of `deleteOne` to handle cases where user has multiple registrations (shouldn't happen normally, but handles edge cases).

## Testing

### Test 1: Basic Clear Devices

1. **Setup**: User has registered device
2. **Action**: Click "Clear Devices" → Confirm
3. **Expected**: 
   - Success toast: "✅ Cleared 2 device registration(s)"
   - Button disappears
   - Device status shows "Not Registered"

### Test 2: Staff Can't Check-in After Clear

1. **Setup**: Admin clears staff device
2. **Action**: Staff tries to scan check-in QR code
3. **Expected**: 
   - ❌ Error: "Device not registered"
   - Must scan registration QR first

### Test 3: Re-registration After Clear

1. **Setup**: Admin clears staff device
2. **Action**: Staff scans registration QR code
3. **Expected**: 
   - ✅ "Device registered successfully"
   - Can now check-in/out

### Test 4: Clear Non-Existent Registration

1. **Setup**: User has no device registration
2. **Action**: Button should not appear
3. **Expected**: No "Clear Devices" button visible

## Files Modified

1. ✅ `backend/routes/qrCode.js` - Enhanced `/api/qr/deactivate-device/:userId` endpoint
2. ✅ `frontend/src/pages/Dashboard/StaffManagement.tsx` - Updated "Deactivate" button to "Clear Devices"

## Summary

The "Clear Devices" button provides admins with a quick and safe way to remove all device registrations for a staff member. It includes:

- ✅ Clear confirmation dialog
- ✅ Clears both StaffHash and DeviceRegistration tables
- ✅ Shows count of cleared registrations
- ✅ Destructive styling to prevent accidental clicks
- ✅ Auto-refreshes the list
- ✅ Only appears when user has registrations

This ensures complete device removal and prevents the staff member from checking in/out until they re-register their device.

