# QR Attendance System Troubleshooting Guide

## 🚨 **Issue: QR Scan Not Recording Attendance**

### **Symptoms:**
- Staff member scans QR code successfully
- Phone shows "success" message
- But attendance overview shows "absent"
- No attendance record in database

### **Root Causes & Solutions:**

## 1. **Device Registration Issues** 🔧

### **Problem:** Device not properly registered
**Check:** Look for these error messages:
- "❌ Device Not Registered"
- "❌ Unauthorized Device"
- "❌ Device Registration Corrupted"

**Solution:**
1. **Re-register the device:**
   - Scan a **staff-registration** QR code first
   - Wait for "Device registered successfully" message
   - Then scan check-in/check-out QR codes

2. **Clear and re-register:**
   ```javascript
   // Clear browser storage
   localStorage.removeItem('staffHash');
   localStorage.removeItem('staffUserId');
   localStorage.removeItem('deviceRegistered');
   ```

## 2. **Hash Verification Failures** 🔐

### **Problem:** Hash mismatch between QR code and device
**Check:** Browser console for:
- "❌ QR Code hash mismatch detected"
- "Hash verification failed"

**Solution:**
1. **Generate new QR codes** for the staff member
2. **Re-register the device** with new registration QR
3. **Use fresh check-in/check-out QR codes**

## 3. **Network/API Issues** 🌐

### **Problem:** Backend API calls failing
**Check:** Network tab in browser developer tools
- Failed requests to `/api/qr/verify-url`
- 500/400 error responses
- Network timeouts

**Solution:**
1. **Check backend server status:**
   ```bash
   curl http://localhost:5002/api/qr/attendance-test
   ```

2. **Restart backend server:**
   ```bash
   cd backend
   npm start
   ```

3. **Check database connection:**
   - Ensure MongoDB is running
   - Verify database connection in backend logs

## 4. **Browser Storage Corruption** 💾

### **Problem:** localStorage data corrupted or missing
**Check:** Browser developer tools → Application → Local Storage
- Missing `staffHash`
- Missing `staffUserId`
- Missing `deviceRegistered`

**Solution:**
1. **Clear all attendance-related storage:**
   ```javascript
   localStorage.removeItem('staffHash');
   localStorage.removeItem('staffUserId');
   localStorage.removeItem('deviceRegistered');
   localStorage.removeItem('registrationTimestamp');
   ```

2. **Re-register device completely**

## 5. **User ID Mismatch** 👤

### **Problem:** QR code belongs to different user
**Check:** Error message:
- "Security violation: This QR code belongs to another user"

**Solution:**
1. **Ensure correct QR code** is being scanned
2. **Check user ID** in QR code URL parameters
3. **Generate new QR codes** if needed

## 🔧 **Quick Fix Commands**

### **For Administrators:**

1. **Check attendance records:**
   ```bash
   curl http://localhost:5002/api/qr/attendance-test
   ```

2. **Add test attendance data:**
   ```bash
   cd backend
   node scripts/populate-attendance-data.js
   ```

3. **Check specific user attendance:**
   ```bash
   # Check if user has attendance records
   # (Requires database access)
   ```

### **For Staff Members:**

1. **Clear device registration:**
   - Open browser settings
   - Clear site data for the clinic website
   - Re-register device

2. **Re-register device:**
   - Scan staff-registration QR code
   - Wait for confirmation
   - Then scan check-in QR code

## 🚀 **Prevention Best Practices**

### **For Administrators:**
1. **Regular monitoring:**
   - Check attendance records daily
   - Monitor for failed QR verifications
   - Keep backend server logs

2. **QR code management:**
   - Generate fresh QR codes regularly
   - Keep backup QR codes for each staff member
   - Document QR code generation process

3. **System maintenance:**
   - Regular database backups
   - Monitor server performance
   - Keep attendance system updated

### **For Staff Members:**
1. **Device management:**
   - Use the same device for attendance
   - Don't clear browser data unnecessarily
   - Keep device charged during work hours

2. **QR scanning process:**
   - Always scan registration QR first (if prompted)
   - Wait for confirmation messages
   - Check attendance overview after scanning

## 🆘 **Emergency Procedures**

### **If QR system is completely down:**
1. **Manual attendance entry:**
   - Use the populate script to add attendance records
   - Document manual entries for later verification

2. **Backup attendance tracking:**
   - Use paper-based attendance sheets
   - Update digital records when system is restored

### **If multiple staff affected:**
1. **Check backend server status**
2. **Restart backend services**
3. **Run attendance data population script**
4. **Notify all staff to re-register devices**

## 📞 **Support Contacts**

- **Technical Issues:** Check backend server logs
- **QR Code Issues:** Regenerate QR codes
- **Database Issues:** Check MongoDB connection
- **Network Issues:** Verify server connectivity

---

**Last Updated:** September 9, 2025
**Version:** 1.0

