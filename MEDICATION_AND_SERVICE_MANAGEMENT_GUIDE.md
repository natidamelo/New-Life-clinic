# 💊 Medication & Service Management Guide

## 📋 Overview

This guide explains how medications and services are managed in the clinic system, including when and how inventory is deducted.

---

## 💊 MEDICATION MANAGEMENT

### How Medications Work

#### 1. **Adding Medications to Inventory**
- Medications are added as **Inventory Items** with category `medication`
- Each medication has:
  - Name (e.g., "Paracetamol 500mg", "Depo Injection")
  - Quantity (stock count)
  - Cost Price (what you paid)
  - Selling Price (what you charge)
  - Category: `medication`

#### 2. **Prescription Creation (NO DEDUCTION)**
When a doctor creates a prescription:
- ✅ Prescription is created (Status: "Active")
- ✅ Invoice is created
- ✅ Nurse tasks are created (if medication is in inventory)
- ❌ **NO inventory deduction happens yet**
- ❌ Medication quantity stays the same

**Why?** Because the medication hasn't been given to the patient yet.

#### 3. **Medication Administration (DEDUCTION HAPPENS)**
When a nurse administers a medication dose:
- ✅ Nurse marks dose as "Given" in the nursing station
- ✅ **Inventory is deducted immediately** (1 unit per dose)
- ✅ Transaction record is created
- ✅ Inventory quantity decreases

**Route:** `POST /api/medication-administration/administer-dose`

**Example:**
```
Before: Paracetamol 500mg - Quantity: 50
Nurse administers 1 dose
After: Paracetamol 500mg - Quantity: 49
```

### Medication Inventory Deduction Flow

```
1. Doctor Prescribes → Prescription Created → NO DEDUCTION
2. Patient Pays → Invoice Paid → NO DEDUCTION
3. Nurse Administers → Dose Given → ✅ DEDUCTION HAPPENS
```

### Key Features
- ✅ **Atomic operations** prevent double deductions
- ✅ **Stock checking** before administration
- ✅ **Transaction records** for every deduction
- ✅ **Automatic COGS calculation** (Cost of Goods Sold)

---

## 🏥 SERVICE MANAGEMENT

### How Services Work

#### 1. **Service Categories**
Services can be:
- **Consultation** (e.g., General Consultation)
- **Procedure** (e.g., Minor Surgery)
- **Lab Services** (e.g., Urine HCG, Glucose Test)
  - Chemistry
  - Hematology
  - Urinalysis
  - Immunology
  - etc.
- **Imaging** (e.g., X-ray, Ultrasound)
- **Injection** (e.g., Vaccination)

#### 2. **Creating Services**

**Option A: Service with Linked Inventory**
- Service is created
- System automatically checks for existing lab inventory items
- If found, service links to existing lab inventory
- If not found, creates new inventory item (if stock info provided)

**Option B: Service without Inventory**
- Service is created
- No inventory item created
- No deduction when service is used

#### 3. **Service Inventory Linking**

**For Lab Services (Urinalysis, Chemistry, etc.):**
- System **automatically finds** existing lab inventory items
- Links service to lab inventory
- When service is used, deducts from **lab inventory**

**Example:**
```
1. You have "Urine HCG" in Lab Inventory (Quantity: 50)
2. You create "Urine HCG" service (Category: Urinalysis)
3. System automatically links service to lab inventory
4. When patient gets Urine HCG test → Deducts from lab inventory (50 → 49)
```

#### 4. **Service Usage (DEDUCTION HAPPENS)**
When a service is added to a patient's invoice:
- ✅ Service is added to invoice
- ✅ **Inventory is deducted immediately** (if service has linked inventory)
- ✅ Transaction record is created
- ✅ Inventory quantity decreases

**Route:** `POST /api/billing/add-service-to-invoice`

**Service Deduction Logic:**
```javascript
1. Check if service has linkedInventoryItems
2. If yes → Deduct from linked inventory item
3. If no → Skip deduction (service still works)
```

### Service Inventory Deduction Flow

```
1. Service Created → Links to Inventory (if exists)
2. Service Added to Invoice → ✅ DEDUCTION HAPPENS
3. Inventory Quantity Decreases
```

### Key Features
- ✅ **Automatic lab inventory linking** for lab services
- ✅ **Duplicate prevention** (won't deduct twice)
- ✅ **Stock checking** before deduction
- ✅ **Transaction records** for every deduction

---

## 🔄 COMPARISON: Medication vs Service

| Feature | Medication | Service |
|---------|-----------|---------|
| **Inventory Deduction** | When nurse administers | When service added to invoice |
| **Timing** | After payment, when given | Immediately when billed |
| **Stock Check** | Before administration | Before adding to invoice |
| **Automatic Linking** | Manual (via prescription) | Automatic (for lab services) |
| **Transaction Record** | Yes | Yes |

---

## 📊 INVENTORY DEDUCTION SUMMARY

### Medications
- ❌ **NOT deducted** when prescription created
- ❌ **NOT deducted** when payment received
- ✅ **DEDUCTED** when nurse administers dose

### Services
- ✅ **DEDUCTED** when service added to invoice
- ✅ **Automatically links** to lab inventory (for lab services)
- ✅ **Works without inventory** (if no linked items)

### Lab Tests
- ✅ **DEDUCTED** when lab results completed
- ✅ **Uses lab test mapping** to find inventory items
- ✅ **Atomic locking** prevents double deductions

---

## 🎯 BEST PRACTICES

### For Medications
1. ✅ Add all medications to inventory with correct quantities
2. ✅ Set cost prices for accurate COGS calculation
3. ✅ Set selling prices for billing
4. ✅ Monitor stock levels regularly

### For Services
1. ✅ For lab services, add items to **Lab Inventory** first
2. ✅ Services will automatically link to lab inventory
3. ✅ Stock will deduct from lab inventory when service is used
4. ✅ No need to fill stock info in service form if lab item exists

### For Lab Tests
1. ✅ Add lab items to **Laboratory** category
2. ✅ System automatically finds and uses lab inventory
3. ✅ Both lab orders and services deduct from same inventory

---

## 🔍 TROUBLESHOOTING

### Medication Not Deducting?
- ✅ Check if medication is in inventory
- ✅ Check if nurse actually administered the dose
- ✅ Check medication name matches inventory name exactly

### Service Not Deducting?
- ✅ Check if service has linked inventory items
- ✅ Check if linked inventory item has stock
- ✅ For lab services, check if lab inventory item exists

### Double Deduction?
- ✅ System has atomic locking to prevent this
- ✅ Check transaction records for duplicates
- ✅ Contact support if issue persists

---

## 📝 SUMMARY

**Medications:**
- Deducted when **nurse administers** (not when prescribed)
- Requires medication to be in inventory
- Creates transaction records

**Services:**
- Deducted when **service added to invoice**
- Automatically links to lab inventory (for lab services)
- Can work without inventory (if no linked items)

**Both:**
- Use atomic operations to prevent double deductions
- Create transaction records
- Check stock before deducting
- Track COGS automatically






