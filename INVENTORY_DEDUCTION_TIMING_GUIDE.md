# ⏰ Inventory Deduction Timing - Complete Guide

## 🚨 **CRITICAL RULE**: No Deduction on Order Creation

**Your system NEVER deducts inventory when orders are created.** Inventory is only deducted when the actual service is performed.

---

## 📋 LAB TEST INVENTORY DEDUCTION

### ❌ When Lab Order is Created (NO DEDUCTION)

**Scenario 1: Doctor Creates Lab Order**
```
Doctor Dashboard → Lab Request → Submit
```
**What happens:**
- ✅ Creates LabOrder (Status: "Pending Payment")
- ✅ Creates Invoice
- ❌ **NO inventory deduction**
- ❌ Glucose strips stay the same

**Scenario 2: Reception Creates Service Request (Lab)**
```
Reception → Service Request → Lab Service → Submit
```
**What happens:**
- ✅ Creates ServiceRequest
- ✅ Creates LabOrder (Status: "Pending Payment")
- ✅ Creates Invoice
- ❌ **NO inventory deduction**
- ❌ Glucose strips stay the same

### ✅ When Lab Test is Actually Performed (DEDUCTION HAPPENS)

**Only these actions deduct inventory:**

#### 1. Lab Tech Enters Results
```
Lab Dashboard → Enter Results → Submit
```
**Backend:** `POST /api/lab-results/submit-results`
```javascript
// In labRoutes.js line 527-559
if (!labOrder.inventoryDeducted) {
  const inventoryResult = await inventoryDeductionService.deductLabInventory(labOrder, req.user._id);
  // ✅ DEDUCTS: Laboratory category (-1)
  // ✅ DEDUCTS: Service category (-1) - sync
}
```

#### 2. Lab Tech Sends Results to Doctor
```
Lab Dashboard → Send to Doctor
```
**Backend:** `POST /api/lab-results/send-to-doctor`
```javascript
// In labRoutes.js line 131-160
const inventoryResult = await inventoryDeductionService.deductLabInventory(order, req.user._id);
// ✅ DEDUCTS: Laboratory category (-1)
// ✅ DEDUCTS: Service category (-1) - sync
```

#### 3. Lab Tech Updates Lab Test Status
```
Lab Dashboard → Update Test → Mark Complete
```
**Backend:** `PUT /api/lab-tests/:id`
```javascript
// In labs.js line 390-415
const inventoryResult = await inventoryDeductionService.deductLabInventory(labOrder, req.user._id);
// ✅ DEDUCTS: Laboratory category (-1)
// ✅ DEDUCTS: Service category (-1) - sync
```

---

## 💊 MEDICATION INVENTORY DEDUCTION

### ❌ When Prescription is Created (NO DEDUCTION)

**Scenario 1: Doctor Prescribes Medication**
```
Doctor Dashboard → Prescription → Submit
```
**What happens:**
- ✅ Creates Prescription (Status: "Active")
- ✅ Creates Invoice
- ❌ **NO inventory deduction**
- ❌ Medication quantity stays the same

**Scenario 2: Reception Creates Service Request (Medication)**
```
Reception → Service Request → Medication Service → Submit
```
**What happens:**
- ✅ Creates ServiceRequest
- ✅ Creates Prescription (Status: "Active")
- ✅ Creates Invoice
- ❌ **NO inventory deduction**
- ❌ Medication quantity stays the same

### ✅ When Medication is Actually Administered (DEDUCTION HAPPENS)

**Only this action deducts inventory:**

#### Nurse Administers Dose
```
Nursing Station → Medication Task → Mark as Given
```
**Backend:** `POST /api/medication-administration/administer-dose`
```javascript
// In medicationAdministration.js line 728-781
const updatedItem = await InventoryItem.findOneAndUpdate(
  { _id: medicationItem._id, quantity: { $gte: 1 } },
  { $inc: { quantity: -1 } },  // ✅ DEDUCTS: 1 unit per dose
  { new: true }
);

// Creates transaction record
const inventoryTransaction = new InventoryTransaction({
  transactionType: 'medical-use',
  item: medicationItem._id,
  quantity: -1,
  reason: `${medicationName} dose administered - Day ${day}, ${timeSlot}`,
  documentReference: taskId
});
```

---

## 🔄 COMPLETE FLOW EXAMPLES

### Lab Test Flow (Glucose Strip):

```
1. DOCTOR ORDERS TEST
   📝 LabOrder created: Status "Pending Payment"
   📝 Invoice created: Balance 200
   📦 Glucose Strips: 40 (NO CHANGE)

2. PATIENT PAYS
   💰 Payment processed: 200 ETB
   📝 LabOrder updated: Status "Ordered"
   📦 Glucose Strips: 40 (NO CHANGE)

3. LAB TECH PERFORMS TEST
   🧪 Test completed
   📝 LabOrder updated: Status "Results Available"
   📦 Glucose Strips: 40 → 39 (DEDUCTED!)
   📝 InventoryTransaction created
```

### Medication Flow (Amoxicillin):

```
1. DOCTOR PRESCRIBES
   📝 Prescription created: Status "Active"
   📝 Invoice created: Balance 210 (21 doses × 10 ETB)
   📦 Amoxicillin: 100 (NO CHANGE)

2. PATIENT PAYS
   💰 Payment processed: 210 ETB
   📝 Prescription updated: PaymentStatus "paid"
   📝 NurseTasks created: 21 tasks (3/day × 7 days)
   📦 Amoxicillin: 100 (NO CHANGE)

3. NURSE ADMINISTERS DOSES
   💊 Morning dose (Day 1)
   📦 Amoxicillin: 100 → 99 (DEDUCTED!)
   💊 Afternoon dose (Day 1)
   📦 Amoxicillin: 99 → 98 (DEDUCTED!)
   💊 Evening dose (Day 1)
   📦 Amoxicillin: 98 → 97 (DEDUCTED!)
   ... (continues for 7 days)
```

---

## 🛡️ Why This Design?

### Benefits:
1. **Accurate Tracking**: Only deduct when actually used
2. **Prevents Waste**: No deduction for cancelled orders
3. **Stock Management**: Real-time inventory reflects actual usage
4. **Audit Trail**: Every deduction tied to actual service

### Payment vs Service:
- **Payment**: Authorizes the service (makes it "ready")
- **Service**: Actually consumes inventory (deducts stock)

---

## 📊 Service vs Doctor Order Comparison

| Source | Order Creation | Payment | Service Performance |
|--------|---------------|---------|-------------------|
| **Doctor Lab Order** | ❌ No deduction | ❌ No deduction | ✅ Deducts on completion |
| **Service Lab Order** | ❌ No deduction | ❌ No deduction | ✅ Deducts on completion |
| **Doctor Prescription** | ❌ No deduction | ❌ No deduction | ✅ Deducts per dose |
| **Service Prescription** | ❌ No deduction | ❌ No deduction | ✅ Deducts per dose |

---

## 🔍 Key Code Locations

### Lab Test Deduction:
- `backend/routes/labRoutes.js` (lines 131-160, 527-559)
- `backend/routes/labs.js` (lines 390-415)
- `backend/services/inventoryDeductionService.js` (lines 16-275)

### Medication Deduction:
- `backend/routes/medicationAdministration.js` (lines 728-781)
- `backend/services/inventoryDeductionService.js` (lines 398-482)

### Payment Processing (NO DEDUCTION):
- `backend/routes/billing.js` (lines 1043-1064) - **DISABLED**
- `backend/routes/billing.js` (lines 975-1010) - Creates nurse tasks only

---

## 🎯 Summary

**The golden rule**: Your system only deducts inventory when the actual medical service is performed, never when orders are created or payments are made.

This ensures:
- ✅ Inventory reflects actual usage
- ✅ No waste from cancelled orders
- ✅ Accurate stock management
- ✅ Complete audit trail
- ✅ Proper separation of billing and inventory

**Remember**: Payment = Authorization, Service = Consumption
