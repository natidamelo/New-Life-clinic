# 🏥 How Your Clinic Management System Works

## 📋 Overview

This guide explains how services, inventory, and stock management work together in your clinic system.

---

## 🔄 TWO WAYS TO CREATE SERVICES

### **Method 1: Create Service in Service Management**

**Location:** `Service Management` page

**What happens:**
1. You create a service (name, category, price)
2. **Optionally** provide stock information:
   - Quantity
   - Cost Price
   - Selling Price
3. System checks:
   - **For lab services** (urinalysis, chemistry, etc.):
     - ✅ Automatically finds existing lab inventory items
     - ✅ Links service to lab inventory
     - ✅ **Service appears in Stock Management under "Laboratory" category**
   - **For other services**:
     - ✅ Creates inventory item with category `service` (if stock info provided)
     - ✅ **Service appears in Stock Management under "Service" category**
     - ❌ If no stock info provided, service exists but **NO inventory item created**

**Result:**
- ✅ Service created in Service Management
- ✅ If stock info provided → Inventory item created → **Appears in Stock Management**
- ✅ If no stock info → Service exists but **NOT in Stock Management**

---

### **Method 2: Create Service from Inventory Form**

**Location:** `Stock Management` → `Add New Item` → Select "Service" as Item Type

**What happens:**
1. You fill inventory form with:
   - Item Type: **Service**
   - Service Name (e.g., "Urine HCG")
   - Category (e.g., "Urinalysis")
   - Stock information (Quantity, Cost Price, Selling Price)
2. System creates:
   - ✅ **Inventory Item** (appears in Stock Management immediately)
   - ✅ **Service** (appears in Service Management)
   - ✅ Links them together

**Result:**
- ✅ Inventory item created → **Appears in Stock Management**
- ✅ Service created → **Appears in Service Management**
- ✅ They are linked together

---

## 📊 STOCK MANAGEMENT DISPLAY

### What Appears in Stock Management?

Stock Management shows **Inventory Items** organized by category:

1. **Laboratory** - Lab test items (Glucose strips, Urine HCG kits, etc.)
2. **Medication** - Medications (Paracetamol, Depo Injection, etc.)
3. **Service** - Service items (only if created with stock information)
4. **Other** - Equipment, supplies, etc.

### When Does a Service Appear in Stock Management?

A service appears in Stock Management **ONLY if**:
- ✅ An inventory item with category `service` was created, OR
- ✅ The service is linked to an existing inventory item (lab, medication, etc.)

**Examples:**

| Scenario | Service Created? | Inventory Item Created? | Appears in Stock? |
|----------|-----------------|------------------------|-------------------|
| Service without stock info | ✅ Yes | ❌ No | ❌ No |
| Service with stock info | ✅ Yes | ✅ Yes (category: service) | ✅ Yes (Service category) |
| Lab service (links to lab item) | ✅ Yes | ✅ Uses existing lab item | ✅ Yes (Laboratory category) |
| Created from Inventory Form | ✅ Yes | ✅ Yes | ✅ Yes |

---

## 🔗 HOW SERVICES AND INVENTORY ARE LINKED

### The Connection

```
Service (Service Management)
    ↓
linkedInventoryItems: [inventoryItemId]
    ↓
Inventory Item (Stock Management)
```

### How It Works

1. **Service** stores `linkedInventoryItems` array
2. **Inventory Item** is referenced by ID
3. When service is used → Deducts from linked inventory item

---

## 🎯 COMPLETE WORKFLOW EXAMPLES

### Example 1: Creating "Urine HCG" Service

**Scenario A: Service Management (No Stock Info)**
```
1. Go to Service Management
2. Create "Urine HCG" service
   - Category: Urinalysis
   - Price: 100 ETB
   - No stock information
3. Result:
   ✅ Service created in Service Management
   ❌ NOT in Stock Management (no inventory item)
   ❌ No inventory deduction when used
```

**Scenario B: Service Management (With Stock Info)**
```
1. Go to Service Management
2. Create "Urine HCG" service
   - Category: Urinalysis
   - Price: 100 ETB
   - Quantity: 50
   - Cost Price: 50 ETB
   - Selling Price: 100 ETB
3. System checks for existing lab item:
   - If "Urine HCG" exists in Lab Inventory → Links to it
   - If not → Creates new inventory item (category: service)
4. Result:
   ✅ Service created in Service Management
   ✅ Appears in Stock Management (Service or Laboratory category)
   ✅ Inventory deducts when service is used
```

**Scenario C: Inventory Form (Recommended for Lab Services)**
```
1. Go to Stock Management → Add New Item
2. Select Item Type: "Service"
3. Fill form:
   - Service Name: "Urine HCG"
   - Category: "Urinalysis"
   - Quantity: 50
   - Cost Price: 50 ETB
   - Selling Price: 100 ETB
4. Result:
   ✅ Inventory item created → Appears in Stock Management
   ✅ Service created → Appears in Service Management
   ✅ They are linked
   ✅ Inventory deducts when service is used
```

---

## 📝 BEST PRACTICES

### For Lab Services (Urinalysis, Chemistry, etc.)

**Recommended Approach:**
1. ✅ **First**: Add item to **Lab Inventory** via Inventory Form
   - Item Type: "Lab Item"
   - Category: "Urinalysis" (or appropriate lab category)
   - Add stock information
2. ✅ **Then**: Create service in Service Management
   - System automatically finds and links to lab inventory
   - Service appears in Stock Management under "Laboratory"

**Why?**
- ✅ Stock is managed in one place (Lab Inventory)
- ✅ Both lab orders and services deduct from same inventory
- ✅ Better organization

### For Other Services (Consultation, Procedure, etc.)

**Option 1: Service Management (Simple)**
- Create service without stock info
- No inventory tracking needed

**Option 2: Service Management (With Inventory)**
- Create service with stock info
- Creates inventory item automatically
- Appears in Stock Management

**Option 3: Inventory Form**
- Create from Inventory Form
- Both inventory item and service created
- Full control over inventory

---

## 🔍 CHECKING IF SERVICE IS IN STOCK MANAGEMENT

### How to Verify

1. **Go to Stock Management**
2. **Filter by Category:**
   - Check "Service" category
   - Check "Laboratory" category (for lab services)
3. **Search for service name**

### If Service is NOT in Stock Management

**Possible Reasons:**
- ❌ Service was created without stock information
- ❌ No inventory item was created
- ❌ Service is not linked to any inventory item

**Solution:**
- ✅ Update service in Service Management
- ✅ Add stock information (quantity, cost price, selling price)
- ✅ System will create inventory item
- ✅ Service will appear in Stock Management

---

## 🎯 SUMMARY

### Key Points

1. **Services and Inventory are Separate but Linked**
   - Services = What you offer to patients
   - Inventory Items = Physical stock you track

2. **Services Appear in Stock Management IF:**
   - ✅ They have linked inventory items, OR
   - ✅ An inventory item was created for them

3. **Two Ways to Create:**
   - **Service Management**: Create service first, optionally add inventory
   - **Inventory Form**: Create inventory first, service created automatically

4. **For Lab Services:**
   - ✅ Add to Lab Inventory first (recommended)
   - ✅ Then create service (auto-links to lab inventory)
   - ✅ Both lab orders and services deduct from same inventory

5. **Stock Management Shows:**
   - All inventory items (by category)
   - Services that have inventory items
   - Lab items that services are linked to

---

## ❓ FAQ

**Q: I created a service in Service Management, but it's not in Stock Management. Why?**
A: Services only appear in Stock Management if they have linked inventory items. Add stock information to the service to create an inventory item.

**Q: Should I create services from Service Management or Inventory Form?**
A: 
- **Lab services**: Use Inventory Form (add to Lab Inventory first)
- **Other services**: Either way works, but Inventory Form gives you more control

**Q: Can I have a service without inventory?**
A: Yes! Services can exist without inventory items. They just won't deduct stock when used.

**Q: How do I link an existing service to inventory?**
A: Update the service in Service Management and add stock information (quantity, cost price, selling price).

---

## 🔄 COMPLETE SYSTEM FLOW

```
┌─────────────────────────────────────────────────────────┐
│                    CREATE SERVICE                        │
└─────────────────────────────────────────────────────────┘
                        │
        ┌───────────────┴───────────────┐
        │                               │
   Service Management            Inventory Form
        │                               │
        │                               │
        ▼                               ▼
┌──────────────────┐          ┌──────────────────┐
│  Service Created │          │ Inventory Item   │
│                  │          │ Created          │
└──────────────────┘          └──────────────────┘
        │                               │
        │                               │
        └───────────────┬───────────────┘
                        │
                        ▼
            ┌───────────────────────┐
            │  Link Together        │
            │  (linkedInventoryItems)│
            └───────────────────────┘
                        │
                        ▼
            ┌───────────────────────┐
            │  Appears in Both:     │
            │  - Service Management │
            │  - Stock Management   │
            └───────────────────────┘
                        │
                        ▼
            ┌───────────────────────┐
            │  When Service Used:   │
            │  - Deducts Inventory  │
            │  - Creates Transaction│
            └───────────────────────┘
```

---

This is how your clinic management system works! Services and inventory are connected, and the system automatically handles the linking for lab services.






