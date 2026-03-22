# Testing Billing Redirect Functionality

## How to Test the Patient Registration → Billing Redirect

### **Steps to Test:**

1. **Navigate to Patient Registration**:
   - Go to: `http://localhost:5175/app/reception/register-patient`
   - Or use the "Register New Patient" button in Reception

2. **Fill Out Patient Form**:
   - Enter patient details (First Name, Last Name, Age, etc.)
   - **IMPORTANT**: Select a **Card Type** (Standard Card, Premium Card, etc.)
   - This is what triggers the billing redirect

3. **Submit the Form**:
   - Click "Register Patient"
   - You should see a success message
   - **After 1 second**, you should be automatically redirected to: 
     - `http://localhost:5175/app/billing/invoices`

### **Expected Behavior:**

#### **With Card Selected:**
- ✅ Patient registered successfully
- ✅ Redirects to `/app/billing/invoices` 
- ✅ Payment notification created

#### **Without Card Selected:**
- ✅ Patient registered successfully  
- ✅ Redirects to `/app/reception` (reception dashboard)
- ✅ No payment notification

### **Troubleshooting:**

If the redirect doesn't work:

1. **Check Browser Console** for any JavaScript errors
2. **Hard Refresh** the page (Ctrl+F5 or Cmd+Shift+R)
3. **Clear Browser Cache** and try again
4. **Check Network Tab** to see if the registration API call succeeds

### **Alternative Test: Payment Processing Redirect**

1. Go to a medication payment notification
2. Process the payment successfully
3. Should redirect to `/app/billing/invoices` instead of `/reception`

---

**The billing redirect functionality has been implemented and should be working!**