# Manual Fix for Hebron Dawit's Notification/Payment Amount Discrepancy

## Problem
- **Notification shows:** ETB 2000.00
- **Payment dialog shows:** ETB 1500.00
- **Both are wrong:** Should be ETB 500.00 for 2 doses

## Root Cause
The system is still using "days × doses/day" calculation instead of explicit doses:
- ETB 2000 = 4 doses × ETB 500 (2 days × 2 doses/day)
- ETB 1500 = 6 doses × ETB 250 (3 days × 2 doses/day)
- **Should be:** ETB 500 = 2 doses × ETB 250

## Manual MongoDB Fix

### 1. Connect to MongoDB
```bash
mongosh "your-mongodb-connection-string"
```

### 2. Find Hebron Dawit's Notifications
```javascript
// Find all notifications for Hebron Dawit
db.notifications.find({
  "data.patientName": { $regex: /hebron/i },
  type: "medication_payment_required"
})
```

### 3. Fix the ETB 2000 Notification
```javascript
// Update notification showing ETB 2000
db.notifications.updateOne(
  {
    "data.patientName": { $regex: /hebron/i },
    "data.totalAmount": 2000
  },
  {
    $set: {
      "data.totalAmount": 500,
      "data.amount": 500,
      "data.extensionCost": 500,
      "data.extensionDetails.additionalDays": 0,
      "data.extensionDetails.additionalDoses": 2,
      "data.billingUnits": 2,
      "data.medications.0.totalDoses": 2,
      "data.medications.0.additionalDoses": 2,
      "data.medications.0.totalPrice": 500
    }
  }
)
```

### 4. Fix the ETB 1500 Notification
```javascript
// Update notification showing ETB 1500
db.notifications.updateOne(
  {
    "data.patientName": { $regex: /hebron/i },
    "data.totalAmount": 1500
  },
  {
    $set: {
      "data.totalAmount": 500,
      "data.amount": 500,
      "data.extensionCost": 500,
      "data.extensionDetails.additionalDays": 0,
      "data.extensionDetails.additionalDoses": 2,
      "data.billingUnits": 2,
      "data.medications.0.totalDoses": 2,
      "data.medications.0.additionalDoses": 2,
      "data.medications.0.totalPrice": 500
    }
  }
)
```

### 5. Fix All Invoices for Hebron Dawit
```javascript
// Find Hebron Dawit's patient ID
db.patients.findOne({ firstName: { $regex: /hebron/i } })

// Update all invoices for Hebron Dawit
db.medicalinvoices.updateMany(
  {
    "patientId": ObjectId("HEBRON_PATIENT_ID"),
    "items.metadata.extension": true
  },
  [
    {
      $set: {
        "items": {
          $map: {
            input: "$items",
            as: "item",
            in: {
              $cond: {
                if: { $eq: ["$$item.metadata.extension", true] },
                then: {
                  $mergeObjects: [
                    "$$item",
                    {
                      "description": "Medication Extension - Ceftriaxone (+2 doses)",
                      "quantity": 2,
                      "total": 500,
                      "metadata.additionalDays": 0,
                      "metadata.additionalDoses": 2,
                      "metadata.totalDoses": 2
                    }
                  ]
                },
                else: "$$item"
              }
            }
          }
        }
      }
    },
    {
      $set: {
        "subtotal": { $sum: "$items.total" },
        "total": { $sum: "$items.total" },
        "balance": { $subtract: [{ $sum: "$items.total" }, { $ifNull: ["$amountPaid", 0] }] }
      }
    }
  ]
)
```

### 6. Verify the Fix
```javascript
// Check notifications
db.notifications.find({
  "data.patientName": { $regex: /hebron/i },
  type: "medication_payment_required"
}).pretty()

// Check invoices
db.medicalinvoices.find({
  "patientId": ObjectId("HEBRON_PATIENT_ID")
}).pretty()
```

## Expected Results After Fix
- **Notification:** ETB 500.00
- **Payment Dialog:** ETB 500.00
- **Invoice Description:** "Medication Extension - Ceftriaxone (+2 doses)"
- **Both amounts match:** No more discrepancy

## Why This Happened
1. **ETB 2000:** System calculated 2 days × 2 doses/day × ETB 500 = ETB 2000
2. **ETB 1500:** System calculated 3 days × 2 doses/day × ETB 250 = ETB 1500
3. **Should be:** 2 doses × ETB 250 = ETB 500

## Prevention
The frontend form now has:
- Radio buttons for "By Days" vs "By Doses"
- Proper validation to prevent this issue
- Backend fixes to handle explicit doses correctly

## Test After Fix
1. Refresh the reception dashboard - notification should show ETB 500
2. Open the payment dialog - should show ETB 500
3. Both amounts should now match
