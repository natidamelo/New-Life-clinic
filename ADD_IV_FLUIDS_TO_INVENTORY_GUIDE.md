# Quick Guide: Adding IV Fluids to Inventory

## Step-by-Step Instructions

### Via Web Interface (Recommended)

1. **Navigate to Stock Management**
   - Click **Stock Management** in the sidebar
   - Select **Add Expense**
   - Click **New Inventory Item**

2. **Fill in Basic Information**
   - **Item Type**: Select **"Medication"**
   - **Category**: Select **"IV Fluids"** from the dropdown

3. **Enter Medication Details**
   
   **Medication Name** (Use full descriptive names):
   ```
   ✅ Good Examples:
   - Normal Saline (0.9% NaCl)
   - Dextrose 5% (D5W)
   - Ringer Lactate (Hartmann Solution)
   - Dextrose 10% (D10W)
   - Sodium Bicarbonate 8.4%
   
   ❌ Bad Examples:
   - Saline (too vague)
   - Dextrose (which concentration?)
   - RL (use full name)
   ```

   **Description** (Optional but recommended):
   ```
   Example: "Isotonic crystalloid solution for fluid resuscitation and maintenance"
   ```

4. **Stock Information**
   - **Quantity**: Current stock count (e.g., 50)
   - **Unit**: Select or type unit (e.g., "bag", "bottle", "vial")
   - **Minimum Stock Level**: When to show low stock warning (e.g., 10)
   - **Reorder Point**: When to reorder (e.g., 20)

5. **Pricing**
   - **Cost Price (ETB)**: Your purchase price per unit (e.g., 150)
   - **Selling Price (ETB)**: Price charged to patients (e.g., 200)

6. **Medication-Specific Fields**
   - **Dosage**: Volume per unit (e.g., "500ml", "1000ml")
   - **Administration Route**: Select **"IV"** or **"Intravenous"**
   - **Active Ingredient**: Main component (e.g., "Sodium Chloride 0.9%")
   - **Prescription Required**: Usually **No** for IV fluids

7. **Additional Information** (Optional)
   - **Manufacturer**: Brand name (e.g., "Baxter", "Fresenius")
   - **Batch Number**: Current batch
   - **Expiry Date**: Expiration date
   - **Location**: Storage location (e.g., "Pharmacy - IV Fluids Shelf")
   - **Supplier**: Supplier name
   - **Notes**: Any special handling instructions

8. **Submit**
   - Click **Submit** button
   - Verify success notification
   - Item should now appear in inventory

---

## Common IV Fluids to Add

### Essential IV Fluids (Add These First)

#### 1. Normal Saline
```
Name: Normal Saline (0.9% NaCl)
Category: IV Fluids
Dosage: 500ml or 1000ml
Administration Route: IV
Active Ingredient: Sodium Chloride 0.9%
Unit: bag
```

#### 2. Ringer Lactate
```
Name: Ringer Lactate (Hartmann Solution)
Category: IV Fluids
Dosage: 500ml or 1000ml
Administration Route: IV
Active Ingredient: Sodium Lactate, Sodium Chloride
Unit: bag
```

#### 3. Dextrose 5%
```
Name: Dextrose 5% (D5W)
Category: IV Fluids
Dosage: 500ml or 1000ml
Administration Route: IV
Active Ingredient: Dextrose 5%
Unit: bag
```

#### 4. Dextrose 10%
```
Name: Dextrose 10% (D10W)
Category: IV Fluids
Dosage: 500ml
Administration Route: IV
Active Ingredient: Dextrose 10%
Unit: bag
```

#### 5. Dextrose 50%
```
Name: Dextrose 50% (D50W)
Category: IV Fluids
Dosage: 50ml
Administration Route: IV
Active Ingredient: Dextrose 50%
Unit: vial
```

### Electrolyte Solutions

#### 6. Sodium Bicarbonate
```
Name: Sodium Bicarbonate 8.4%
Category: IV Fluids
Dosage: 50ml
Administration Route: IV
Active Ingredient: Sodium Bicarbonate 8.4%
Unit: vial
```

#### 7. Potassium Chloride
```
Name: Potassium Chloride (KCl)
Category: IV Fluids
Dosage: 10ml or 20ml
Administration Route: IV
Active Ingredient: Potassium Chloride
Unit: vial
⚠️ Note: Never give undiluted - must be added to IV fluid
```

#### 8. Calcium Gluconate
```
Name: Calcium Gluconate
Category: IV Fluids
Dosage: 10ml
Administration Route: IV
Active Ingredient: Calcium Gluconate
Unit: ampule
```

#### 9. Magnesium Sulfate
```
Name: Magnesium Sulfate
Category: IV Fluids
Dosage: 10ml
Administration Route: IV or IM
Active Ingredient: Magnesium Sulfate
Unit: vial
```

### Special Solutions

#### 10. Mannitol
```
Name: Mannitol 20%
Category: IV Fluids
Dosage: 500ml
Administration Route: IV
Active Ingredient: Mannitol 20%
Unit: bag
```

#### 11. Albumin
```
Name: Albumin 5%
Category: IV Fluids
Dosage: 250ml
Administration Route: IV
Active Ingredient: Human Albumin 5%
Unit: bottle
```

---

## Verification

### After Adding IV Fluids

1. **Check Inventory List**
   - Go to **Stock Management** → **Inventory**
   - Search for the IV fluid
   - Verify it appears with correct quantity

2. **Test Administration**
   - Create a test prescription with the IV fluid
   - Have a nurse attempt to administer
   - Verify notification shows inventory deduction

3. **Check Transaction History**
   - After administration, check inventory
   - View transaction history
   - Verify deduction is recorded

---

## Bulk Import (Advanced)

If you have many IV fluids to add, you can use MongoDB directly:

```javascript
// Example: Add multiple IV fluids at once
const ivFluids = [
  {
    name: 'Normal Saline (0.9% NaCl)',
    category: 'medication',
    quantity: 100,
    unit: 'bag',
    costPrice: 150,
    sellingPrice: 200,
    dosage: '1000ml',
    administrationRoute: 'IV',
    activeIngredient: 'Sodium Chloride 0.9%',
    minimumStockLevel: 20,
    reorderPoint: 40,
    isActive: true
  },
  {
    name: 'Dextrose 5% (D5W)',
    category: 'medication',
    quantity: 80,
    unit: 'bag',
    costPrice: 160,
    sellingPrice: 210,
    dosage: '1000ml',
    administrationRoute: 'IV',
    activeIngredient: 'Dextrose 5%',
    minimumStockLevel: 20,
    reorderPoint: 40,
    isActive: true
  },
  // Add more...
];

// Insert via MongoDB
db.inventoryitems.insertMany(ivFluids);
```

---

## Troubleshooting

### Issue: IV fluid not being deducted after administration

**Solution 1: Check naming**
- Ensure name in inventory matches prescription
- Use full descriptive name with concentration
- Check for typos

**Solution 2: Verify item is active**
- Check `isActive: true` in database
- Ensure quantity > 0

**Solution 3: Check category**
- Category should be "medication" in database
- Frontend shows "IV Fluids" but database stores as "medication"

### Issue: Cannot find IV fluid in inventory

**Solution 1: Check search**
- Use partial name search
- Try searching by main component (e.g., "Saline", "Dextrose")

**Solution 2: Verify it was added**
- Check database: `db.inventoryitems.find({ name: /saline/i })`
- Check frontend inventory list

---

## Best Practices

### Naming Convention
Always use this format:
```
[Main Name] ([Concentration/Details])

Examples:
✅ Normal Saline (0.9% NaCl)
✅ Dextrose 5% (D5W)
✅ Ringer Lactate (Hartmann Solution)
```

### Stock Levels
Set appropriate levels:
```
Minimum Stock Level: 10-20 units
Reorder Point: 30-40 units
Initial Quantity: 50-100 units
```

### Pricing
Use realistic pricing:
```
Cost Price: Your purchase cost
Selling Price: Cost + markup (typically 30-50%)
```

### Units
Use standard units:
```
✅ bag (for large volume IV bags)
✅ bottle (for glass bottles)
✅ vial (for small volumes)
✅ ampule (for single-dose glass containers)
```

---

## Quick Reference Table

| IV Fluid | Typical Dosage | Unit | Common Use |
|----------|---------------|------|------------|
| Normal Saline | 500ml, 1000ml | bag | Fluid resuscitation, maintenance |
| Ringer Lactate | 500ml, 1000ml | bag | Fluid resuscitation |
| Dextrose 5% | 500ml, 1000ml | bag | Fluid + calories |
| Dextrose 10% | 500ml | bag | Fluid + more calories |
| Dextrose 50% | 50ml | vial | Hypoglycemia treatment |
| Sodium Bicarbonate | 50ml | vial | Metabolic acidosis |
| Potassium Chloride | 10ml, 20ml | vial | Hypokalemia (in IV fluid) |
| Calcium Gluconate | 10ml | ampule | Hypocalcemia |
| Magnesium Sulfate | 10ml | vial | Hypomagnesemia, eclampsia |
| Mannitol 20% | 500ml | bag | Cerebral edema |

---

## Need Help?

If you need assistance:
1. Read the main guide: `INVENTORY_DEDUCTION_MEDICATION_ADMIN_GUIDE.md`
2. Run verification script: `node verify-inventory-medications.js`
3. Check backend logs for detailed error messages
4. Contact technical support with specific error messages

---

**Last Updated**: October 6, 2025
**Status**: Ready to Use

