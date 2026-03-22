# Direct Database Fix for All Extension Calculation Issues

## Problem
All medication extensions are showing incorrect calculations like "2 days × 2 doses/day = 4 total doses" instead of just "2 doses", affecting all frequency types (QD, BID, TID, QID).

## Root Cause
The system stored `additionalDays` instead of `additionalDoses` when doctors intended to add specific doses.

## Direct MongoDB Fix Commands

### 1. Connect to MongoDB
```bash
mongosh "your-mongodb-connection-string"
```

### 2. Fix All Prescriptions
```javascript
// Find all prescriptions with the issue
db.prescriptions.find({
  "extensionDetails.additionalDays": { $gt: 0 },
  "extensionDetails.additionalDoses": 0
})

// Update all prescriptions to use doses instead of days
db.prescriptions.updateMany(
  {
    "extensionDetails.additionalDays": { $gt: 0 },
    "extensionDetails.additionalDoses": 0
  },
  [
    {
      $set: {
        "extensionDetails.additionalDoses": {
          $multiply: [
            "$extensionDetails.additionalDays",
            {
              $switch: {
                branches: [
                  { case: { $regexMatch: { input: { $toLower: "$frequency" }, regex: "bid|twice|2x|2 times|every 12" } }, then: 2 },
                  { case: { $regexMatch: { input: { $toLower: "$frequency" }, regex: "tid|three|thrice|3x|3 times|every 8" } }, then: 3 },
                  { case: { $regexMatch: { input: { $toLower: "$frequency" }, regex: "qid|four|4x|4 times|every 6" } }, then: 4 }
                ],
                default: 1
              }
            }
          ]
        },
        "extensionDetails.additionalDays": 0
      }
    }
  ]
)
```

### 3. Fix All Invoices
```javascript
// Find all extension invoices
db.medicalinvoices.find({
  "items.metadata.extension": true
})

// Update all extension invoice items
db.medicalinvoices.updateMany(
  {
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
                      "description": {
                        $concat: [
                          "Medication Extension - ",
                          "$$item.metadata.medicationName",
                          " (+",
                          { $toString: "$$item.metadata.additionalDoses" },
                          " dose",
                          { $cond: { if: { $eq: ["$$item.metadata.additionalDoses", 1] }, then: "", else: "s" } },
                          ")"
                        ]
                      },
                      "quantity": "$$item.metadata.additionalDoses",
                      "total": { $multiply: ["$$item.unitPrice", "$$item.metadata.additionalDoses"] },
                      "metadata.additionalDays": 0,
                      "metadata.totalDoses": "$$item.metadata.additionalDoses"
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

### 4. Fix All Notifications
```javascript
// Find all extension notifications
db.notifications.find({
  "type": "medication_payment_required",
  "data.extensionDetails": { $exists: true }
})

// Update all extension notifications
db.notifications.updateMany(
  {
    "type": "medication_payment_required",
    "data.extensionDetails": { $exists: true }
  },
  [
    {
      $set: {
        "data.totalAmount": { $multiply: ["$data.extensionDetails.additionalDoses", 250] },
        "data.amount": { $multiply: ["$data.extensionDetails.additionalDoses", 250] },
        "data.extensionCost": { $multiply: ["$data.extensionDetails.additionalDoses", 250] },
        "data.extensionDetails.additionalDays": 0,
        "data.billingUnits": "$data.extensionDetails.additionalDoses",
        "data.medications.0.totalDoses": "$data.extensionDetails.additionalDoses",
        "data.medications.0.additionalDoses": "$data.extensionDetails.additionalDoses",
        "data.medications.0.totalPrice": { $multiply: ["$data.extensionDetails.additionalDoses", 250] }
      }
    }
  ]
)
```

### 5. Verify the Fix
```javascript
// Check prescriptions
db.prescriptions.find({
  "extensionDetails.additionalDoses": { $gt: 0 }
}).pretty()

// Check invoices
db.medicalinvoices.find({
  "items.metadata.extension": true
}).pretty()

// Check notifications
db.notifications.find({
  "type": "medication_payment_required",
  "data.extensionDetails.additionalDoses": { $gt: 0 }
}).pretty()
```

## Expected Results
- **Prescriptions:** `additionalDays: 0, additionalDoses: X`
- **Invoices:** Show "Medication Extension - Name (+X doses)" and correct amounts
- **Notifications:** Show correct amounts based on doses, not days

## Prevention
The frontend form now has:
- Radio buttons for "By Days" vs "By Doses"
- Proper API calls that send `additionalDoses` when "By Doses" is selected
- Backend validation to ensure correct calculation

## Test After Fix
1. Check invoice list - should show correct amounts
2. Check notifications - should show correct amounts  
3. Try extending a medication by selecting "By Doses" - should work correctly
