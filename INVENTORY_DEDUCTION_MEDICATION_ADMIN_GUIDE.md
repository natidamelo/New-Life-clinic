# Medication & IV Fluids Inventory Deduction System

## Overview
Your system automatically deducts inventory when nurses administer medications and IV fluids. This document explains how it works and how to ensure all items are properly tracked.

## How It Works

### 1. Automatic Deduction Process
When a nurse administers a medication or IV fluid:
1. **Task is identified**: The system finds the medication task (e.g., "Dextrose 5% - Day 1, Morning")
2. **Inventory search**: Searches for the medication in the inventory database
3. **Stock check**: Verifies sufficient quantity is available
4. **Atomic deduction**: Deducts 1 unit using atomic operations (prevents race conditions)
5. **Transaction record**: Creates an inventory transaction record for audit trail
6. **Success notification**: Shows confirmation with inventory details

### 2. Inventory Matching System
The system uses **intelligent name matching** to find medications in inventory:

#### Exact Matches
- "Normal Saline" matches "Normal Saline"

#### Flexible Matches
- "Normal Saline" also matches:
  - "Normal Saline (0.9% NaCl)"
  - "0.9% Normal Saline"
  - "NaCl 0.9%"
  - "Saline Solution"
  - "NS"

#### IV Fluids Currently Supported
All these IV fluids are automatically matched:
- **Normal Saline**: NS, 0.9% NaCl, Saline Solution
- **Ringer Lactate**: RL, Hartmann Solution, Hartmann's Solution, Lactated Ringer
- **Dextrose Solutions**: D5W, D10W, D40W, D50W, 5% Dextrose, 10% Dextrose, etc.
- **Half Normal Saline**: 0.45% NaCl, 0.45% Saline
- **Hypertonic Saline**: 3% Saline, 3% NaCl
- **D5NS**: 5% Dextrose in Normal Saline
- **Sodium Bicarbonate**: NaHCO3, Bicarbonate, Sodium Bicarbonate 8.4%
- **Potassium Chloride**: KCl, Potassium
- **Calcium Gluconate**: Calcium, Ca Gluconate
- **Magnesium Sulfate**: MgSO4, Magnesium
- **Mannitol**: Mannitol 20%, 20% Mannitol
- **Albumin**: Albumin 5%, Albumin 25%, 5% Albumin, 25% Albumin

### 3. Search Algorithm
The system searches in this order:
1. **Service category** (for injection tasks, allow 0 quantity)
2. **All other categories** (medication, supplies, equipment, laboratory, office, other)
3. **Flexible matching**: Case-insensitive, spacing variations, partial matches

### 4. Transaction Records
Every deduction creates a record with:
- **Item**: Inventory item reference
- **Quantity**: -1 (negative indicates deduction)
- **Previous Quantity**: Stock before deduction
- **New Quantity**: Stock after deduction
- **Reason**: "Dextrose 5% dose administered - Day 1, Morning"
- **Patient**: Patient reference
- **Performed By**: Nurse who administered
- **Document Reference**: Task ID
- **Status**: 'completed'

## Setup Requirements

### 1. Add Medications to Inventory
Before nurses can administer, medications must be in inventory:

#### Via Web Interface
1. Go to **Stock Management** → **Add Expense** → **New Inventory Item**
2. Select **Item Type**: "Medication"
3. Select **Category**: 
   - "IV Fluids" for IV solutions
   - "Antibiotics" for antibiotics
   - etc.
4. Enter **Medication Name** (e.g., "Normal Saline (0.9% NaCl)")
5. Enter **Quantity**, **Cost Price**, **Selling Price**
6. Click **Submit**

#### Important Naming Guidelines
- Use full descriptive names: "Normal Saline (0.9% NaCl)" instead of just "Saline"
- Include concentration: "Dextrose 5% (D5W)" not just "Dextrose"
- Be consistent with naming across prescriptions and inventory

### 2. Verify Inventory Items
To check if an item exists in inventory:
```javascript
// In MongoDB or via backend
db.inventoryitems.find({ name: /normal saline/i, category: 'medication' })
```

Or use the frontend:
1. Go to **Stock Management** → **Inventory**
2. Search for the medication
3. Check if it exists with stock > 0

### 3. Common Issues & Solutions

#### Issue: "Medication not found in inventory"
**Cause**: Medication doesn't exist in inventory or name doesn't match
**Solution**:
1. Add the medication to inventory
2. Ensure name matches (use variations list above)
3. Check spelling and spacing

#### Issue: "Insufficient stock"
**Cause**: Quantity in inventory is 0 or less than required
**Solution**:
1. Add stock via **Stock Management**
2. Use "Update Stock" to add quantity

#### Issue: "Inventory deducted twice"
**Prevention**: System automatically prevents double-deduction
- Checks for existing transaction before deducting
- Uses atomic operations to prevent race conditions

### 4. Monitoring Inventory Deductions

#### Via Transaction History
Check backend logs for:
```
✅ [DOSE ADMIN] Found medication in inventory: Normal Saline (Qty: 50)
📦 Inventory deducted: Normal Saline: 1 unit (50 → 49)
```

#### Via Database
```javascript
// Find all medication administrations
db.inventorytransactions.find({
  transactionType: 'medical-use',
  reason: /dose administered/i
}).sort({ createdAt: -1 })
```

#### Via Frontend Notification
When nurse administers, they see:
```
✅ Normal Saline administered successfully!
📦 Inventory deducted: Normal Saline: 1 unit (50 → 49)
```

## Best Practices

### 1. Maintain Adequate Stock Levels
- Set **Minimum Stock Level** for each item
- Set **Reorder Point** to trigger alerts
- Monitor low stock warnings

### 2. Regular Inventory Audits
- Check transaction history weekly
- Verify physical stock matches system
- Investigate discrepancies

### 3. Standardize Medication Names
- Use consistent naming convention
- Include concentration and form
- Document abbreviations

### 4. Train Nurses
- Ensure nurses understand the system
- Report any "not found" errors immediately
- Verify deduction notifications

## Technical Details

### Database Schema

#### InventoryItem
```javascript
{
  _id: ObjectId,
  name: String,           // "Normal Saline (0.9% NaCl)"
  category: String,       // 'medication', 'supplies', etc.
  quantity: Number,       // Current stock
  costPrice: Number,      // Purchase price
  sellingPrice: Number,   // Selling price
  minimumStockLevel: Number,
  reorderPoint: Number,
  isActive: Boolean
}
```

#### InventoryTransaction
```javascript
{
  _id: ObjectId,
  transactionType: 'medical-use',
  item: ObjectId,         // Reference to InventoryItem
  quantity: -1,           // Negative for deduction
  previousQuantity: Number,
  newQuantity: Number,
  reason: String,         // "Dextrose 5% dose administered - Day 1, Morning"
  documentReference: String, // Task ID
  patient: ObjectId,
  performedBy: ObjectId,  // Nurse who administered
  status: 'completed',
  createdAt: Date
}
```

### API Endpoints

#### Administer Dose (with inventory deduction)
```
POST /api/medication-administration/administer-dose
Authorization: Bearer <token>
Body: {
  taskId: "task_id",
  day: 1,
  timeSlot: "morning",
  notes: "optional notes"
}

Response: {
  success: true,
  data: {
    inventoryDeducted: true,
    inventoryDetails: {
      medicationName: "Normal Saline",
      itemsDeducted: [{
        name: "Normal Saline (0.9% NaCl)",
        quantityDeducted: 1,
        previousQuantity: 50,
        newQuantity: 49
      }]
    }
  }
}
```

## Troubleshooting

### Enable Debug Logs
Backend logs show detailed information:
```
🚀 [DOSE ADMIN] Administering dose: Normal Saline
💊 [DOSE ADMIN] Looking for medication in inventory: "Normal Saline"
📦 [DOSE ADMIN] All inventory items by category:
  medication: [Normal Saline (0.9% NaCl) (50), Dextrose 5% (100), ...]
🔍 [DOSE ADMIN] Trying variation: "Normal Saline"
✅ [DOSE ADMIN] Found in medication category: Normal Saline (0.9% NaCl)
✅ [DOSE ADMIN] Deducted 1 unit. New quantity: 49
```

### Common Error Messages

#### "Medication not found in inventory"
- Add medication to inventory
- Check spelling and name variations
- Verify category is correct

#### "Insufficient stock"
- Add stock to inventory
- Check if quantity > 0
- Verify item is active (isActive: true)

#### "Inventory already deducted for this dose"
- This is normal - prevents double deduction
- Dose was already administered previously

## Testing the System

### 1. Add Test Medication
```javascript
// Via MongoDB or Admin interface
{
  name: "Normal Saline (0.9% NaCl)",
  category: "medication",
  quantity: 100,
  costPrice: 50,
  sellingPrice: 75,
  unit: "bag",
  minimumStockLevel: 10,
  reorderPoint: 20,
  isActive: true
}
```

### 2. Create Prescription with IV Fluid
- Prescribe "Normal Saline" to a patient
- Create nurse task for administration

### 3. Administer via Nurse Dashboard
- Log in as nurse
- Go to **Medication Administration**
- Find the task and click "Administer"
- Check notification shows inventory deduction

### 4. Verify Deduction
- Check inventory: quantity should be 99
- Check transaction history: should show -1 deduction
- Check backend logs for confirmation

## Support

If you encounter issues:
1. Check backend logs for detailed error messages
2. Verify medication exists in inventory
3. Check name matches (use variations)
4. Ensure sufficient stock
5. Contact technical support with error logs

---

**Last Updated**: October 6, 2025
**System Version**: clinic-cms v2.0

