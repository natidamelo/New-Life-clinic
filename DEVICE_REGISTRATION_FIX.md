# Device Registration Fix - "Not Registered" Error for Clock In/Out

## Issue Description

**Problem:** Device is registered on the phone, but when trying to clock in/out for regular hours or overtime, the system shows "Device not registered on the phone."

**Root Cause:** The system had inconsistent device validation logic:
- Registration endpoint properly created a `DeviceRegistration` record with the device fingerprint
- However, clock-in/out endpoints were NOT validating the current device's fingerprint against the registered device
- They only checked if the user had ANY device registration, not if THIS SPECIFIC device matched

## What Was Broken

### 1. `processCheckInOut` in backend/app.js (Line 297-424)
```javascript
// OLD CODE - WRONG ❌
const deviceRegistration = await DeviceRegistration.findOne({
  userId: userId,
  isActive: true  // Only checked if user has ANY registration
});
```

**Problem:** This only verified that a user had a registration somewhere, but didn't validate if the CURRENT device making the request was the registered one.

### 2. `/api/qr/verify-url` in backend/routes/qrCode.js (Line 946-1330)
```javascript
// OLD CODE - WRONG ❌
const staffHash = await StaffHash.findOne({ 
  userId: userId,
  hashType: 'staff-registration',
  isActive: true 
});

if (staffHash && staffHash.deviceFingerprint) {
  // Only checked StaffHash table, not DeviceRegistration
  // Had RELAXED mode that auto-updated fingerprints
}
```

**Problem:** This used the `StaffHash` table instead of the proper `DeviceRegistration` table, and was too lenient by auto-updating fingerprints.

## The Fix

### 1. Fixed `processCheckInOut` in backend/app.js

**NEW CODE - CORRECT ✅**
```javascript
// Generate device fingerprint from request headers
const userAgent = req.headers['user-agent'] || 'unknown';
const acceptLanguage = req.headers['accept-language'] || 'unknown';
const acceptEncoding = req.headers['accept-encoding'] || 'unknown';

const deviceFingerprint = crypto.createHash('sha256')
  .update(userAgent + acceptLanguage + acceptEncoding + 'browser-device-fingerprint')
  .digest('hex');

// SECURITY: Check if THIS specific device is registered to this user
const deviceRegistration = await DeviceRegistration.findOne({
  userId: userId,
  deviceFingerprint: deviceFingerprint,  // ✅ Must match current device
  isActive: true
});

if (!deviceRegistration) {
  // Block the operation
  throw new Error(`Device not registered...`);
}
```

**Changes:**
1. ✅ Generates device fingerprint from current request headers
2. ✅ Validates that the fingerprint matches the registered device
3. ✅ Blocks the operation if device doesn't match
4. ✅ Uses same fingerprint algorithm as registration process

### 2. Fixed `/api/qr/verify-url` in backend/routes/qrCode.js

**NEW CODE - CORRECT ✅**
```javascript
// NEW: Check DeviceRegistration table for proper device validation
const DeviceRegistration = require('../models/DeviceRegistration');
const crypto = require('crypto');

// Generate device fingerprint from request headers
const userAgent = req.headers['user-agent'] || 'unknown';
const acceptLanguage = req.headers['accept-language'] || 'unknown';
const acceptEncoding = req.headers['accept-encoding'] || 'unknown';

const serverDeviceFingerprint = crypto.createHash('sha256')
  .update(userAgent + acceptLanguage + acceptEncoding + 'browser-device-fingerprint')
  .digest('hex');

// Check if THIS specific device is registered to this user
const deviceRegistration = await DeviceRegistration.findOne({
  userId: userId,
  deviceFingerprint: serverDeviceFingerprint,  // ✅ Must match current device
  isActive: true
});

if (!deviceRegistration) {
  // Block and log security incident
  await SecurityIncident.create({
    userId: userId,
    incidentType: 'UNREGISTERED_DEVICE',
    severity: 'HIGH',
    description: `Attempted ${type} from unregistered device`,
    details: { ... }
  });
  
  return res.status(403).json({
    success: false,
    message: `Device not registered...`,
    error: 'DEVICE_NOT_REGISTERED',
    code: 'DEVICE_NOT_REGISTERED'
  });
}

// Update device last used time
deviceRegistration.lastUsed = new Date();
await deviceRegistration.save();
```

**Changes:**
1. ✅ Added DeviceRegistration table check BEFORE processing check-in/out
2. ✅ Generates server-side device fingerprint from request headers
3. ✅ Validates that fingerprint matches registered device
4. ✅ Blocks unregistered devices with 403 Forbidden
5. ✅ Logs security incidents for attempted unauthorized access
6. ✅ Updates lastUsed timestamp on successful validation

## How Device Registration Works Now

### Registration Flow (One-Time Setup)
1. Admin generates staff registration QR code for user
2. User scans QR code on their phone
3. System generates device fingerprint from browser headers:
   - `user-agent` (browser/OS info)
   - `accept-language` (language settings)
   - `accept-encoding` (compression support)
4. Creates `DeviceRegistration` record with:
   - `userId`: User's ID
   - `deviceFingerprint`: Unique hash of browser characteristics
   - `deviceHash`: QR code hash
   - `isActive`: true
5. Device is now registered ✅

### Clock In/Out Flow (Every Time)
1. User scans check-in or check-out QR code
2. System generates device fingerprint from current request
3. Looks up DeviceRegistration:
   - `userId` must match
   - `deviceFingerprint` must match current device
   - `isActive` must be true
4. If match found:
   - ✅ Allows clock in/out
   - Updates `lastUsed` timestamp
5. If no match:
   - ❌ Blocks operation
   - Returns 403 error
   - Logs security incident

## Device Fingerprint Algorithm

The system uses a consistent algorithm to generate device fingerprints:

```javascript
const crypto = require('crypto');

const userAgent = req.headers['user-agent'] || 'unknown';
const acceptLanguage = req.headers['accept-language'] || 'unknown';
const acceptEncoding = req.headers['accept-encoding'] || 'unknown';

const deviceFingerprint = crypto.createHash('sha256')
  .update(userAgent + acceptLanguage + acceptEncoding + 'browser-device-fingerprint')
  .digest('hex');
```

**Important:** The fingerprint must be generated the SAME WAY in:
- Registration endpoint (backend/app.js - `processQRRegistration`)
- Clock-in endpoint (backend/app.js - `processCheckInOut`)
- QR verify endpoint (backend/routes/qrCode.js - `/api/qr/verify-url`)

## Security Improvements

### Before (Vulnerable) ❌
- ✗ Only checked if user had any registration
- ✗ Didn't validate current device
- ✗ Could use registered user's QR on unregistered device
- ✗ Auto-updated fingerprints (too lenient)
- ✗ Inconsistent validation across endpoints

### After (Secure) ✅
- ✓ Validates THIS specific device is registered
- ✓ Blocks unregistered devices immediately
- ✓ Logs security incidents for unauthorized attempts
- ✓ Consistent validation across all endpoints
- ✓ Same device fingerprint algorithm everywhere

## Files Modified

1. **backend/app.js**
   - Function: `processCheckInOut` (Line 297-424)
   - Added device fingerprint generation
   - Added DeviceRegistration validation with fingerprint match

2. **backend/routes/qrCode.js**
   - Route: `POST /api/qr/verify-url` (Line 946-1330)
   - Added DeviceRegistration check at the beginning
   - Blocks unregistered devices before processing attendance
   - Logs security incidents

## Testing Instructions

### 1. Register a Device
1. Go to Staff Management
2. Click "Show QR" for a staff member
3. Scan the registration QR code on your phone
4. You should see "Device registered successfully"

### 2. Test Regular Clock In
1. Generate a check-in QR code
2. Scan with the SAME phone that was registered
3. Should succeed ✅
4. Try scanning with a DIFFERENT unregistered phone
5. Should fail with "Device not registered" ❌

### 3. Test Overtime Clock In/Out
1. Wait until after 5:00 PM (overtime hours)
2. Generate check-in QR code
3. Scan with registered phone
4. Should succeed for overtime ✅
5. Clock out
6. Should succeed ✅

### 4. Test Security
1. Try to clock in with unregistered device
2. Should see 403 error
3. Check Security Incidents table
4. Should see logged incident with:
   - Type: `UNREGISTERED_DEVICE`
   - Severity: `HIGH`
   - Details: device fingerprint, user agent, IP

## Error Messages

### User Not Registered
```
Device not registered for [Staff Name]. 
Please register your device first using the QR code registration system.
```

### Device Fingerprint Mismatch
```
Device not registered for [Staff Name]. 
Please register your device first by scanning the staff registration QR code 
before using check-in/check-out QR codes.
```

## Database Tables Used

### DeviceRegistration
- **Primary table** for device validation
- Fields:
  - `userId`: Reference to User
  - `deviceFingerprint`: SHA256 hash of browser characteristics
  - `deviceHash`: QR code hash
  - `isActive`: Boolean
  - `lastUsed`: Timestamp
  - `registeredAt`: Timestamp

### StaffHash (Legacy)
- Used for staff registration QR codes
- Now only used for location verification
- Fields:
  - `userId`: Reference to User
  - `uniqueHash`: QR code hash
  - `hashType`: 'staff-registration'
  - `deviceFingerprint`: Stored for backup
  - `registrationLocation`: GPS coordinates

## Conclusion

The fix ensures that ONLY the registered device can clock in/out for a user, both for regular hours and overtime. The device fingerprint validation is now consistent across all endpoints and properly enforces the one-device-per-user security policy.

