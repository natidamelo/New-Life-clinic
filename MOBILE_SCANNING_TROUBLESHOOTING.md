# Mobile QR Scanning Troubleshooting Guide

## 🔍 **Current Status:**

**Your Computer IP**: `192.168.224.90`  
**QR Code URL Should Be**: `http://192.168.224.90:5175/verify-qr?...`

---

## ✅ **Steps Already Completed:**

1. ✅ Windows Firewall rules added for ports 5002 and 5175
2. ✅ Backend server configured
3. ✅ Frontend accessible on network IP

---

## 📱 **Try These Steps:**

### **Step 1: Test Network Connection**

**On Your Phone**, open browser and type:
```
http://192.168.224.90:5175
```

**Expected Result:**
- ✅ Should show the clinic login page
- ❌ If it doesn't load → Phone and computer are on DIFFERENT WiFi networks

---

### **Step 2: Check WiFi Networks**

**On Computer**:
1. Click WiFi icon in taskbar
2. Note the WiFi network name (e.g., "ClinicWiFi")

**On Phone**:
1. Go to WiFi settings
2. Make sure you're connected to the **SAME network**
3. NOT mobile data - must be WiFi!

---

### **Step 3: Generate Fresh QR Code**

1. **On computer**: Refresh the staff management page
2. Click **"Clear All Devices"** button (top right)
3. Click **"Show QR"** for DR Natan again
4. **New QR code** will show with IP: `192.168.224.90`

---

### **Step 4: Scan with Phone**

1. Open phone camera
2. Point at QR code
3. Tap notification
4. Page should load within 3-5 seconds

**If stuck on loading:**
- Check WiFi connection on phone
- Try typing URL manually in phone browser
- Check if Windows Firewall is disabled

---

## 🔧 **Alternative: Manual URL Method**

**If QR scanning doesn't work**, try manual URL:

### **Get the Registration URL:**

1. On computer, click **"Show QR"** for a staff member
2. Under the QR code, you'll see "Registration URL"
3. Copy that entire URL
4. Send it to your phone (WhatsApp, SMS, email)
5. Click the link on your phone

---

## 🚨 **Common Issues:**

### **Issue: "Cannot connect" or stuck loading**

**Cause**: Phone and computer on different WiFi or firewall blocking

**Fix**:
```bash
# On computer, run this:
1. Check WiFi name
2. Connect phone to same WiFi
3. Disable Windows Firewall temporarily
4. Try again
```

---

### **Issue: "Page not found"**

**Cause**: Frontend not running

**Fix**:
```bash
# Make sure frontend is running:
cd frontend
npm run dev
```

---

### **Issue: QR code shows old IP (10.181.115.157)**

**Cause**: Server not restarted

**Fix**:
1. Close current QR modal
2. Click "Clear All Devices"
3. Wait 5 seconds
4. Click "Show QR" again
5. New QR should show: http://192.168.224.90:5175/...

---

## ✅ **Quick Test:**

**On your phone browser, type:**
```
http://192.168.224.90:5175
```

**Result:**
- ✅ **Loads login page** → Network is working, try QR code again
- ❌ **Doesn't load** → WiFi problem or firewall blocking

---

## 🎯 **Expected Behavior:**

When QR code works correctly:
1. Scan QR code → Page loads in 1-2 seconds
2. Shows "Staff Registration" page
3. Asks "Allow location?" → Click "Allow"
4. Shows "✅ Device registered successfully!"
5. Modal closes
6. Computer shows "Registered" status

---

## 📞 **Still Not Working?**

Try these **diagnostic tests**:

### **Test 1: Can phone access computer?**
```
Phone browser: http://192.168.224.90:5175
If loads → ✅ Network OK
If doesn't load → ❌ WiFi/Firewall issue
```

### **Test 2: Is backend running?**
```
Computer browser: http://localhost:5002/api/health
Should show: {"status": "ok"}
```

### **Test 3: Is frontend running?**
```
Computer browser: http://localhost:5175
Should show: Clinic login page
```

---

## 💡 **Emergency Workaround:**

If network issues persist, you can disable device fingerprint security temporarily:

**In `.env` file**, add:
```bash
ENABLE_DEVICE_FINGERPRINT=false
ENABLE_LOCATION_VERIFICATION=false
```

This will:
- ✅ Allow registration to work without network issues
- ⚠️ Reduces security (staff could share hashes)
- Use only for testing, re-enable for production

---

**Next Step**: Try typing `http://192.168.224.90:5175` in your phone browser and let me know if it loads!

