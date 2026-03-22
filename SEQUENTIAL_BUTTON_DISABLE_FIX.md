# Sequential Button Disable Fix - Check-in/Check-out Flow

## Overview

Fixed the check-in and check-out buttons to disable sequentially after successful operations, following the proper workflow for both regular hours and overtime.

## Sequential Flow

### 1. Start of Day (Not Checked In)
- ✅ **Check-in Button**: ENABLED
- ❌ **Check-out Button**: DISABLED
- **User Action**: Click "Check In" → Generate QR → Scan on phone

### 2. After Regular Check-in Success
- ❌ **Check-in Button**: DISABLED (with text "Already Checked In")
- ✅ **Check-out Button**: ENABLED
- **Status**: `clocked_in`
- **User Action**: Click "Check Out" → Generate QR → Scan on phone

### 3. After Regular Check-out Success
**Case A: During Overtime Hours (after 5 PM or before 8:30 AM)**
- ✅ **Check-in Button**: ENABLED (shows "Check In for Overtime")
- ❌ **Check-out Button**: DISABLED
- **Status**: `clocked_out` with `isOvertimeTime: true`
- **User Action**: Can check in for overtime shift

**Case B: Outside Overtime Hours**
- ❌ **Check-in Button**: DISABLED
- ❌ **Check-out Button**: DISABLED
- **Status**: `clocked_out`
- **Message**: "Checkout complete - see you tomorrow!"

### 4. After Overtime Check-in Success
- ❌ **Check-in Button**: DISABLED (with text "Already Checked In")
- ✅ **Check-out Button**: ENABLED (shows "Check Out (Overtime)")
- **Status**: `overtime_active`
- **User Action**: Click "Check Out" → Generate QR → Scan on phone

### 5. After Overtime Check-out Success
- ❌ **Check-in Button**: DISABLED
- ❌ **Check-out Button**: DISABLED
- **Status**: `overtime_completed`
- **Message**: "Overtime completed - all work done for today"
- **Note**: Both buttons stay disabled until next day

## Files Modified

### 1. `frontend/src/components/QRCodeModal.tsx`

**Location**: Event listener for `attendance-status-updated` (Lines 500-565)

**Changes Made**:

```typescript
// Enhanced logic to handle sequential button disabling
const handleAttendanceUpdate = (event) => {
  if (event.detail && event.detail.action) {
    const isOvertime = event.detail.isOvertime || event.detail.isOvertimeTime || false;
    
    if (event.detail.action === 'checkout') {
      if (isOvertime) {
        // Overtime checkout complete - DISABLE BOTH BUTTONS
        setCurrentStatus({
          status: 'overtime_completed',
          canCheckIn: false,
          canCheckOut: false,
          message: 'Overtime completed - all work done for today',
          isOvertimeTime: false,
          isOvertime: true
        });
      } else {
        // Regular checkout - enable overtime check-in ONLY if in overtime hours
        const now = new Date();
        const ethiopianTime = new Date(now.getTime() + (3 * 60 * 60 * 1000));
        const currentHour = ethiopianTime.getUTCHours();
        const isOvertimeHours = currentHour >= 17 || currentHour < 8 || 
                               (currentHour === 8 && ethiopianTime.getUTCMinutes() < 30);
        
        setCurrentStatus({
          status: 'clocked_out',
          canCheckIn: isOvertimeHours, // Only allow if in overtime hours
          canCheckOut: false,
          message: isOvertimeHours ? 
                   'Regular checkout complete - can check in for overtime' : 
                   'Checkout complete',
          isOvertimeTime: isOvertimeHours,
          isOvertime: false
        });
      }
    } else if (event.detail.action === 'checkin') {
      // After check-in, DISABLE check-in and ENABLE check-out
      setCurrentStatus({
        status: isOvertime ? 'overtime_active' : 'clocked_in',
        canCheckIn: false, // DISABLE after check-in
        canCheckOut: true, // ENABLE for check-out
        message: isOvertime ? 
                 'Overtime check-in successful - can check out' : 
                 'Check-in successful - can check out',
        isOvertimeTime: isOvertime,
        isOvertime: isOvertime
      });
    }
  }
};
```

### 2. `frontend/src/pages/VerifyQR.tsx`

**Location**: Event dispatch after successful scan (Lines 585-600)

**Changes Made**:

```typescript
// Added overtime information to event
const event = new CustomEvent('attendance-status-updated', {
  detail: {
    action: normalizedAction,
    userId: userId,
    timestamp: new Date().toISOString(),
    currentStatus: result.data.currentStatus,
    isOvertime: isOvertime,              // NEW
    isOvertimeTime: isOvertime,          // NEW
    shiftType: isOvertime ? 'OVERTIME' : 'REGULAR'  // NEW
  }
});
```

**Also Updated Fallback** (Lines 610-625):
```typescript
// Calculate overtime status even when no currentStatus
const currentHour = new Date().getHours();
const isOvertime = currentHour >= 17 || currentHour < 8;

window.dispatchEvent(new CustomEvent('attendance-status-updated', {
  detail: {
    action: normalizedAction,
    userId: userId,
    timestamp: new Date().toISOString(),
    isOvertime: isOvertime,              // NEW
    isOvertimeTime: isOvertime,          // NEW
    shiftType: isOvertime ? 'OVERTIME' : 'REGULAR'  // NEW
  }
}));
```

## How It Works

### Event-Based Communication

1. **User scans QR code** on their phone (VerifyQR page)
2. **Backend processes** the check-in or check-out
3. **VerifyQR page dispatches event** `attendance-status-updated` with:
   - `action`: 'checkin' or 'checkout'
   - `isOvertime`: true/false
   - `currentStatus`: Updated attendance status
4. **QRCodeModal listens** for the event
5. **Updates button states** based on the action and overtime status
6. **Buttons are disabled/enabled** immediately

### Status Detection

#### Overtime Hours Detection
```typescript
// Ethiopian timezone (UTC+3)
const ethiopianTime = new Date(now.getTime() + (3 * 60 * 60 * 1000));
const currentHour = ethiopianTime.getUTCHours();

// Overtime hours: After 5 PM (17:00) or before 8:30 AM
const isOvertimeHours = currentHour >= 17 || 
                       currentHour < 8 || 
                       (currentHour === 8 && ethiopianTime.getUTCMinutes() < 30);
```

#### Regular Hours
- **8:30 AM - 5:00 PM** (Ethiopian time)

#### Overtime Hours
- **5:00 PM - 8:30 AM** (next day)

## Button States Reference

### Check-in Button

| Scenario | Enabled | Text |
|----------|---------|------|
| Not checked in (regular hours) | ✅ Yes | "Check In" |
| Not checked in (overtime hours) | ✅ Yes | "Check In" |
| Already checked in (regular) | ❌ No | "Already Checked In" |
| Already checked in (overtime) | ❌ No | "Already Checked In" |
| Checked out (regular hours) | ❌ No | "Check In" |
| Checked out (overtime hours) | ✅ Yes | "Check In for Overtime" |
| Overtime completed | ❌ No | "Already Checked In" |

### Check-out Button

| Scenario | Enabled | Text |
|----------|---------|------|
| Not checked in | ❌ No | "Check Out" |
| Checked in (regular) | ✅ Yes | "Check Out" |
| Checked in (overtime) | ✅ Yes | "Check Out (Overtime)" |
| Already checked out | ❌ No | "Check Out" |
| Overtime completed | ❌ No | "Check Out (Overtime)" |

## Testing Instructions

### Test 1: Regular Shift Flow

1. **Morning (8:30 AM - 5:00 PM)**
   - Open QR Code Modal
   - Verify Check-in button is ENABLED ✅
   - Verify Check-out button is DISABLED ❌
   
2. **Click Check-in button**
   - Generate QR code
   - Scan on phone
   - Wait for success message
   
3. **After Check-in Success**
   - QR Code Modal should auto-update
   - Check-in button should be DISABLED ❌
   - Check-out button should be ENABLED ✅
   
4. **Click Check-out button**
   - Generate QR code
   - Scan on phone
   - Wait for success message
   
5. **After Check-out Success (during regular hours)**
   - Both buttons should be DISABLED ❌
   - Message: "Checkout complete"

### Test 2: Regular + Overtime Flow

1. **Complete regular check-in and check-out** (as above)

2. **Wait until after 5:00 PM** (overtime hours)
   - Refresh the modal or reopen it
   
3. **After 5:00 PM**
   - Check-in button should be ENABLED ✅ (shows "Check In for Overtime")
   - Check-out button should be DISABLED ❌
   
4. **Click Check-in button for overtime**
   - Generate QR code
   - Scan on phone
   - Wait for success message
   
5. **After Overtime Check-in Success**
   - Check-in button should be DISABLED ❌
   - Check-out button should be ENABLED ✅ (shows "Check Out (Overtime)")
   
6. **Click Check-out button**
   - Generate QR code
   - Scan on phone
   - Wait for success message
   
7. **After Overtime Check-out Success**
   - Both buttons should be DISABLED ❌
   - Status: "Overtime completed - all work done for today"

### Test 3: Overtime-Only Shift

1. **Start after 5:00 PM** (overtime hours only)
   - Open QR Code Modal
   - Check-in button should be ENABLED ✅
   - Check-out button should be DISABLED ❌
   
2. **Complete overtime check-in**
   - Generate QR, scan, verify
   - Check-in button: DISABLED ❌
   - Check-out button: ENABLED ✅
   
3. **Complete overtime check-out**
   - Generate QR, scan, verify
   - Both buttons: DISABLED ❌
   - Status: "Overtime completed"

## Status Values

### Status Field Values
- `'not_clocked_in'` - Not checked in yet
- `'clocked_in'` - Checked in (regular hours)
- `'clocked_out'` - Checked out (regular hours)
- `'overtime_active'` - Checked in for overtime
- `'overtime_completed'` - Overtime shift completed

### Boolean Flags
- `canCheckIn`: true/false - Controls check-in button
- `canCheckOut`: true/false - Controls check-out button
- `isOvertime`: true/false - Current timesheet is overtime
- `isOvertimeTime`: true/false - Current time is in overtime hours

## Troubleshooting

### Buttons Not Updating After Scan

**Possible Causes:**
1. Event not being dispatched from VerifyQR page
2. QRCodeModal not listening for events
3. Network delay in status update

**Solutions:**
1. Check browser console for event logs:
   - "🔔 [VerifyQR] Dispatching attendance-status-updated event..."
   - "🔍 [QRCodeModal] Received attendance status update event"
2. Manually refresh the modal (close and reopen)
3. Check backend response includes `currentStatus`

### Wrong Button Enabled After Overtime

**Check:**
1. Is the time calculation correct? (Ethiopian timezone UTC+3)
2. Is `isOvertime` being passed in the event?
3. Check console logs for overtime detection

### Both Buttons Disabled Unexpectedly

**Check:**
1. Is status `overtime_completed`?
2. Check `canCheckIn` and `canCheckOut` values in console
3. Verify backend is returning correct status

## Summary

The sequential button disable feature ensures:

1. ✅ **Users can't check in twice** - Button disabled after first check-in
2. ✅ **Users can't check out without checking in** - Button disabled until checked in
3. ✅ **Overtime flow is clear** - Separate overtime check-in/out after regular shift
4. ✅ **Day completion is enforced** - Both buttons disabled after overtime complete
5. ✅ **Real-time updates** - Event-driven updates without page refresh
6. ✅ **Time-aware logic** - Different behavior for regular vs overtime hours

The system now properly guides users through the complete attendance flow from regular check-in through overtime completion.

