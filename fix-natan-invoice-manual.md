# Manual Fix for Natan Kinfe's Invoice

## 🎯 Invoice to Fix
- **Invoice Number**: `INV-EXT-1756132268415-ibriy`
- **Patient**: Natan Kinfe
- **Current Issue**: Shows "3 days × 1 dose/day = 3 total doses" (incorrect)
- **Should Be**: "3 days × 2 doses/day = 6 total doses" (correct for BID)

## 🔧 Manual MongoDB Commands

### Step 1: Find the Invoice
```javascript
// Connect to your MongoDB database and run:
db.medicalinvoices.findOne({
  invoiceNumber: "INV-EXT-1756132268415-ibriy"
})
```

### Step 2: Fix the Invoice
```javascript
// Update the invoice with correct BID calculation
db.medicalinvoices.updateOne(
  { invoiceNumber: "INV-EXT-1756132268415-ibriy" },
  {
    $set: {
      "items.0.quantity": 6,
      "items.0.total": 1800,
      "items.0.description": "Medication Extension - Dexamethasone (+3 days × 2 doses/day = 6 total doses)",
      "items.0.metadata.dosesPerDay": 2,
      "items.0.metadata.frequency": "BID (twice daily)",
      "items.0.metadata.additionalDoses": 6,
      "items.0.metadata.totalDoses": 6,
      "subtotal": 1800,
      "total": 1800,
      "balance": 1800,
      "status": "pending",
      "extensionDetails.dosesPerDay": 2,
      "extensionDetails.frequency": "BID (twice daily)",
      "extensionDetails.explicitAdditionalDoses": 6,
      "extensionDetails.totalDoses": 6,
      "extensionDetails.extensionType": "dose-based"
    }
  }
)
```

### Step 3: Verify the Fix
```javascript
// Check that the invoice was updated correctly
db.medicalinvoices.findOne(
  { invoiceNumber: "INV-EXT-1756132268415-ibriy" },
  { 
    invoiceNumber: 1, 
    "items.description": 1, 
    "items.quantity": 1, 
    "items.total": 1, 
    total: 1, 
    balance: 1,
    status: 1
  }
)
```

## 📋 Expected Results After Fix

### Before Fix:
- **Description**: "Medication Extension - Dexamethasone (+3 days × 1 dose/day = 3 total doses)"
- **Quantity**: 3 doses
- **Total**: ETB 900.00
- **Balance**: ETB 900.00

### After Fix:
- **Description**: "Medication Extension - Dexamethasone (+3 days × 2 doses/day = 6 total doses)"
- **Quantity**: 6 doses
- **Total**: ETB 1,800.00
- **Balance**: ETB 1,800.00

## 🚀 How to Execute

1. **Open MongoDB Compass** or your MongoDB shell
2. **Connect to your database** (clinic-cms)
3. **Run the commands** in the order shown above
4. **Refresh the web application** to see the changes

## 🔗 View the Fixed Invoice

After running the commands, you can view the corrected invoice at:
```
http://localhost:5175/app/billing/invoices/[invoice-id]
```

## ✅ Verification

The invoice should now show:
- ✅ **6 doses** instead of 3
- ✅ **ETB 1,800** instead of ETB 900
- ✅ **Correct description** showing "2 doses/day"
- ✅ **Proper BID calculation** (3 days × 2 doses/day = 6 total doses)

## 🎉 Future Prevention

The frequency detection system has been fixed to prevent this issue in the future:
- All BID medications will now calculate as 2 doses/day
- All TID medications will calculate as 3 doses/day
- All QID medications will calculate as 4 doses/day
- All QD medications will calculate as 1 dose/day
