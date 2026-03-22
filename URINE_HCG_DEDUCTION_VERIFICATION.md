# ✅ Urine HCG Service - Inventory Deduction Verification

## Your Question
**"If I added Urine HCG in Service Management, when I order a service for Urine HCG, will it deduct from stock (e.g., 24 → 23)?"**

## Answer: **YES, IF PROPERLY LINKED** ✅

---

## How It Works

### Step 1: Service Creation
When you create "Urine HCG" service in Service Management:
- Category: **Lab** (or Urinalysis)
- System automatically checks for existing lab inventory item named "Urine HCG"
- If found → **Links service to lab inventory item**
- If not found → Creates new inventory item (if stock info provided)

### Step 2: Service Ordering
When you order "Urine HCG" service for a patient:
1. Service is added to patient's invoice
2. System checks: Does service have `linkedInventoryItems`?
3. **If YES** → Deducts from linked inventory item (24 → 23)
4. **If NO** → No deduction (service still works, but no stock change)

---

## Verification Checklist

### ✅ Check 1: Is Service Linked to Inventory?

**To verify:**
1. Go to Service Management
2. Edit "Urine HCG" service
3. Check if it has "Inventory Settings" or linked inventory items
4. If you see inventory item linked → ✅ **WILL DEDUCT**
5. If no inventory linked → ❌ **WON'T DEDUCT**

### ✅ Check 2: Does Lab Inventory Item Exist?

**From your Stock Management:**
- ✅ "Urine HCG" exists in Laboratory category
- ✅ Quantity: 24
- ✅ This is the inventory item that should be linked

### ✅ Check 3: Automatic Linking

**For Lab services (Category: Lab), the system:**
1. Searches for inventory item with:
   - Name: "Urine HCG" (case-insensitive)
   - Category: "laboratory"
   - Status: Active
2. If found → Automatically links service to it
3. If not found → Creates new item (if stock info provided)

---

## Expected Behavior

### Scenario: Service is Linked ✅

```
Before Order:
- Stock Management: Urine HCG = 24 units

Action:
- Order "Urine HCG" service for patient

After Order:
- Stock Management: Urine HCG = 23 units ✅
- Transaction record created
- Inventory deducted successfully
```

### Scenario: Service is NOT Linked ❌

```
Before Order:
- Stock Management: Urine HCG = 24 units

Action:
- Order "Urine HCG" service for patient

After Order:
- Stock Management: Urine HCG = 24 units (NO CHANGE) ❌
- Service still works (patient gets billed)
- But no inventory deduction
```

---

## How to Ensure It Works

### Option 1: Verify Service Link (Recommended)

1. **Edit the "Urine HCG" service** in Service Management
2. **Check "Inventory Settings" section**
3. If you see inventory item linked → ✅ Good to go!
4. If not linked → Add stock information to link it

### Option 2: Re-create Service (If Not Linked)

1. **Delete** the current "Urine HCG" service
2. **Re-create** it in Service Management
3. System will automatically find and link to lab inventory
4. ✅ Now it will deduct!

### Option 3: Manual Link (Advanced)

If service exists but isn't linked:
1. Update service in Service Management
2. Add inventory settings (quantity, cost price, selling price)
3. System will link to existing lab inventory item

---

## Code Flow (Technical)

```
1. Service Ordered
   ↓
2. billingService.addServiceToDailyInvoice()
   ↓
3. Checks: itemData.serviceId exists?
   ↓
4. Calls: inventoryDeductionService.deductServiceInventory()
   ↓
5. Finds service by ID
   ↓
6. Checks: service.linkedInventoryItems exists?
   ↓
7. Finds inventory item by ID
   ↓
8. Deducts quantity: inventoryItem.quantity -= quantity
   ↓
9. Saves: inventoryItem.save()
   ↓
10. ✅ Stock Updated (24 → 23)
```

---

## Troubleshooting

### Problem: Service Not Deducting

**Possible Causes:**
1. ❌ Service not linked to inventory item
2. ❌ Service name doesn't match inventory item name exactly
3. ❌ Inventory item is inactive
4. ❌ Service category is not "Lab" (so auto-linking didn't work)

**Solutions:**
1. ✅ Edit service and add inventory settings
2. ✅ Ensure service name matches inventory item name
3. ✅ Check inventory item is active
4. ✅ Change service category to "Lab" and re-save

### Problem: Double Deduction

**Solution:**
- ✅ System has duplicate prevention (10-second window)
- ✅ Won't deduct twice for same service order

---

## Summary

**YES, it will deduct from stock (24 → 23) IF:**
- ✅ Service is linked to inventory item
- ✅ Inventory item exists and is active
- ✅ Service has `linkedInventoryItems` populated

**To verify:**
- ✅ Check service in Service Management
- ✅ Look for linked inventory items
- ✅ Test by ordering the service and checking stock

**If it's not deducting:**
- ✅ Edit service and add inventory settings
- ✅ System will automatically link to lab inventory
- ✅ Then it will deduct properly

---

## Quick Test

1. **Note current stock:** Urine HCG = 24
2. **Order service** for a test patient
3. **Check stock again:** Should be 23
4. **If still 24:** Service is not linked → Fix by editing service






