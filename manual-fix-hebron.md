# Manual Fix for Hebron Dawit's Extension Calculation

## Problem
Hebron Dawit's medication extension shows "2 days × 2 doses/day = 4 total doses" instead of just "2 doses", resulting in incorrect billing of ETB 1,000 instead of ETB 500.

## Root Cause
The system stored `additionalDays: 2` instead of `additionalDoses: 2` when the doctor intended to add 2 doses.

## Manual Fix Steps

### 1. Update Prescription Data
In MongoDB, find Hebron Dawit's prescriptions and update the extension details:

```javascript
// Find prescriptions with the issue
db.prescriptions.find({
  "extensionDetails.additionalDays": 2,
  "extensionDetails.additionalDoses": 0
})

// Update each prescription
db.prescriptions.updateOne(
  { _id: ObjectId("PRESCRIPTION_ID") },
  {
    $set: {
      "extensionDetails.additionalDays": 0,
      "extensionDetails.additionalDoses": 2
    }
  }
)
```

### 2. Update Invoice Data
Find and update related invoices:

```javascript
// Find invoices for the prescription
db.medicalinvoices.find({
  "items.metadata.extensionForPrescriptionId": "PRESCRIPTION_ID"
})

// Update invoice items
db.medicalinvoices.updateOne(
  { _id: ObjectId("INVOICE_ID") },
  {
    $set: {
      "items.0.description": "Medication Extension - Ceftriaxone (+2 doses)",
      "items.0.quantity": 2,
      "items.0.total": 500,
      "items.0.metadata.additionalDays": 0,
      "items.0.metadata.additionalDoses": 2,
      "items.0.metadata.totalDoses": 2,
      "subtotal": 500,
      "total": 500,
      "balance": 500
    }
  }
)
```

### 3. Update Notification Data
Find and update related notifications:

```javascript
// Find notifications for the prescription
db.notifications.find({
  "data.prescriptionId": ObjectId("PRESCRIPTION_ID"),
  "type": "medication_payment_required"
})

// Update notification
db.notifications.updateOne(
  { _id: ObjectId("NOTIFICATION_ID") },
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

## Expected Results After Fix
- **Invoice Description:** "Medication Extension - Ceftriaxone (+2 doses)"
- **Invoice Amount:** ETB 500 (instead of ETB 1,000)
- **Notification Amount:** ETB 500
- **Display:** Shows "2 doses" instead of "4 doses"

## Prevention
The frontend form has been updated to include:
- Radio buttons to choose between "By Days" or "By Doses"
- Proper dose input field when "By Doses" is selected
- Correct API calls that send `additionalDoses` instead of `additionalDays`

## Test the Fix
1. Check the invoice list page - should show ETB 500 instead of ETB 1,000
2. Check the notification - should show ETB 500
3. Check the payment processing page - should show "2 doses" calculation
