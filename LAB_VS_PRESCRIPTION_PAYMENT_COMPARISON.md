# Lab Payment vs Prescription Payment System Comparison

## Overview

Your clinic management system handles two distinct payment workflows: **Lab Payments** and **Prescription Payments**. While both use similar notification and payment processing systems, they have key differences in their workflows, authorization, and business logic.

## 1. **Lab Payment System**

### **🔄 Lab Payment Flow**

#### **Step 1: Doctor Creates Lab Order**
```javascript
// backend/controllers/labOrderController.js
const createLabOrder = async (req, res) => {
  // 1. Doctor orders lab tests
  // 2. System calculates prices using LabPricingService
  // 3. Lab order saved with status 'Pending Payment'
  
  // 4. Add to daily consolidated invoice
  const newInvoice = await DailyConsolidatedInvoiceService.addLabOrdersToDailyInvoice(
    standardizedPatientId,
    singleLabOrder,
    doctorId
  );
```

#### **Step 2: Lab Payment Notification**
```javascript
// backend/controllers/labOrderController.js
const receptionNotification = new Notification({
  type: 'lab_payment_required',
  title: 'Lab Test Payment Required',
  message: `Payment required for lab tests: ${testNames.join(', ')} (Total: ETB ${totalAmount})`,
  recipientRole: 'reception',
  data: {
    invoiceId: newInvoice._id,
    labOrderIds: [savedLabOrder._id],
    patientId: standardizedPatientId,
    patientName: patientName,
    tests: [{
      testName: testName,
      price: price,
      labOrderId: savedLabOrder._id
    }],
    amount: price,
    totalAmount: price,
    itemCount: 1
  }
});
```

#### **Step 3: Lab Payment Processing**
```javascript
// backend/routes/billing.js
router.post('/process-lab-payment', auth, async (req, res) => {
  const { labOrderIds, paymentMethod, amountPaid, notes } = req.body;
  
  // 1. Update lab orders status
  for (const orderId of labOrderIds) {
    const labOrder = await LabOrder.findById(orderId);
    labOrder.status = 'Ordered'; // Ready for lab processing
    labOrder.paymentStatus = amountPaid >= orderTotal ? 'paid' : 'partially_paid';
    labOrder.paidAt = new Date();
    await labOrder.save();
  }
  
  // 2. Create lab notifications for technicians
  for (const labOrder of updatedLabOrders) {
    const labNotification = new Notification({
      title: 'Lab Test Ready for Processing',
      message: `Lab test "${labOrder.testName}" is paid and ready for processing.`,
      type: 'lab_result_ready',
      recipientRole: 'lab',
      data: {
        labOrderId: labOrder._id,
        testName: labOrder.testName,
        amountPaid: labOrder.totalPrice
      }
    });
    await labNotification.save();
  }
});
```

### **💰 Lab Payment Features**

#### **✅ Simple Payment Model**
- **One-time payment** for lab tests
- **No dose-based authorization** needed
- **Immediate processing** after payment
- **Lab technician notifications** for sample collection

#### **✅ Lab Order Status Flow**
```
Pending Payment → Ordered → Scheduled → Collected → Processing → Results Available
```

#### **✅ Payment Authorization**
```javascript
// Lab orders have simple payment status
labOrder.paymentStatus = 'paid' | 'partially_paid' | 'pending';
labOrder.status = 'Ordered'; // Ready for lab processing
```

## 2. **Prescription Payment System**

### **🔄 Prescription Payment Flow**

#### **Step 1: Doctor Creates Prescription**
```javascript
// backend/controllers/prescriptionController.js
const createPrescription = async (req, res) => {
  // 1. Doctor prescribes medications with duration
  // 2. System calculates total cost for entire duration
  // 3. Prescription saved with payment status 'pending'
  
  // 4. Add to daily consolidated invoice
  const invoice = await DailyConsolidatedInvoiceService.addPrescriptionToDailyInvoice(
    patientIdToUse,
    prescriptionData,
    doctorIdToUse
  );
```

#### **Step 2: Prescription Payment Notification**
```javascript
// backend/controllers/prescriptionController.js
const receptionNotification = new Notification({
  type: 'medication_payment_required',
  title: 'Medication Payment Required',
  message: `Medications prescribed for ${patientName}. Payment of ETB ${totalCost} required before dispensing.`,
  data: {
    prescriptionId: savedPrescription._id,
    invoiceId: invoice?._id,
    patientId: patientIdToUse,
    medications: medicationsList,
    totalAmount: totalCost,
    sendToNurse: sendToNurse
  }
});
```

#### **Step 3: Prescription Payment Processing**
```javascript
// backend/routes/billing.js
router.post('/process-payment/:prescriptionId', auth, async (req, res) => {
  // 1. Process payment with dose-based authorization
  const enhancedResult = await EnhancedMedicationPaymentProcessor.processPaymentWithAuthorization({
    prescriptionId,
    paymentMethod,
    amountPaid,
    prescription
  });
  
  // 2. Update prescription with authorization details
  prescription.paymentAuthorization = {
    paidDays: enhancedResult.authorizationSummary.paidDays,
    totalDays: enhancedResult.authorizationSummary.totalDays,
    authorizedDoses: enhancedResult.authorizationSummary.authorizedDoses,
    paymentPlan: enhancedResult.paymentPlan
  };
  
  // 3. Create nurse task with authorization
  if (sendToNurse) {
    const nurseTask = new NurseTask({
      taskType: 'MEDICATION',
      medicationDetails: {
        paymentAuthorization: prescription.paymentAuthorization
      }
    });
  }
});
```

### **💰 Prescription Payment Features**

#### **✅ Complex Payment Authorization**
- **Dose-based authorization** system
- **Partial payment support** with day-based coverage
- **Nurse authorization** for administering only paid doses
- **Payment reminders** for unpaid portions

#### **✅ Prescription Status Flow**
```
Pending Payment → Active (with authorization) → Completed → Refill Required
```

#### **✅ Payment Authorization Details**
```javascript
// Prescriptions have detailed authorization
prescription.paymentAuthorization = {
  paidDays: 7,           // Days covered by payment
  totalDays: 21,         // Total prescription duration
  authorizedDoses: 7,     // Doses that can be administered
  outstandingAmount: 1400, // Remaining balance
  paymentStatus: 'partially_paid'
};
```

## 3. **Key Differences Comparison**

### **📊 Payment Complexity**

| Aspect | Lab Payments | Prescription Payments |
|--------|-------------|---------------------|
| **Payment Model** | One-time payment | Dose-based authorization |
| **Partial Payments** | Simple partial/full | Day-based coverage tracking |
| **Authorization** | Immediate processing | Nurse authorization required |
| **Reminders** | Basic payment reminders | Scheduled payment reminders |
| **Processing** | Direct to lab | Through nurse administration |

### **🔔 Notification Differences**

#### **Lab Payment Notifications**
```javascript
// Lab notifications are simpler
{
  type: 'lab_payment_required',
  data: {
    labOrderIds: ['order1', 'order2'],
    tests: [{ testName: 'CBC', price: 200 }],
    totalAmount: 400
  }
}
```

#### **Prescription Payment Notifications**
```javascript
// Prescription notifications include medication details
{
  type: 'medication_payment_required',
  data: {
    prescriptionId: 'prescription1',
    medications: [{
      name: 'Amoxicillin',
      dosage: '500mg',
      frequency: '3x daily',
      duration: '7 days',
      totalPrice: 350
    }],
    sendToNurse: true
  }
}
```

### **💳 Payment Processing Differences**

#### **Lab Payment Processing**
```javascript
// Simple payment processing
router.post('/process-lab-payment', auth, async (req, res) => {
  // 1. Update lab order status to 'Ordered'
  labOrder.status = 'Ordered';
  labOrder.paymentStatus = 'paid';
  
  // 2. Create lab technician notification
  const labNotification = new Notification({
    type: 'lab_result_ready',
    recipientRole: 'lab'
  });
});
```

#### **Prescription Payment Processing**
```javascript
// Complex payment processing with authorization
router.post('/process-payment/:prescriptionId', auth, async (req, res) => {
  // 1. Calculate dose-based authorization
  const authorization = await EnhancedMedicationPaymentProcessor.processPaymentWithAuthorization({
    prescriptionId,
    amountPaid,
    prescription
  });
  
  // 2. Update prescription with authorization details
  prescription.paymentAuthorization = authorization;
  
  // 3. Create nurse task with authorization
  const nurseTask = new NurseTask({
    medicationDetails: {
      paymentAuthorization: authorization
    }
  });
});
```

### **👥 Role-Based Workflow Differences**

#### **Lab Payment Workflow**
```
Doctor → Reception (Payment) → Lab Technician (Sample Collection) → Lab Technician (Results)
```

#### **Prescription Payment Workflow**
```
Doctor → Reception (Payment) → Nurse (Administration Authorization) → Nurse (Dose Administration)
```

### **📋 Status Tracking Differences**

#### **Lab Order Statuses**
```javascript
const labOrderStatuses = [
  'Pending Payment',    // Waiting for payment
  'Ordered',           // Paid, ready for collection
  'Scheduled',         // Collection scheduled
  'Collected',         // Sample collected
  'Processing',        // Lab processing
  'Results Available', // Results ready
  'Cancelled'          // Cancelled
];
```

#### **Prescription Statuses**
```javascript
const prescriptionStatuses = [
  'Pending Payment',   // Waiting for payment
  'Active',           // Paid, ready for administration
  'Completed',        // All doses administered
  'Refill Required',  // Need refill
  'Cancelled'         // Cancelled
];
```

## 4. **Partial Payment Handling**

### **Lab Partial Payments**
```javascript
// Simple partial payment for lab tests
if (amountPaid >= orderTotal) {
  labOrder.paymentStatus = 'paid';
} else {
  labOrder.paymentStatus = 'partially_paid';
}
// Lab orders are processed regardless of partial payment
```

### **Prescription Partial Payments**
```javascript
// Complex partial payment with dose authorization
const authorization = {
  paidDays: Math.floor(amountPaid / dailyCost),
  totalDays: prescription.duration,
  authorizedDoses: Math.floor(amountPaid / doseCost),
  outstandingAmount: totalCost - amountPaid
};

// Nurses can only administer authorized doses
if (authorization.paidDays < authorization.totalDays) {
  // Show partial payment warning
  // Only allow administration of paid doses
}
```

## 5. **Notification Differences**

### **Lab Payment Notifications**
- **Type**: `lab_payment_required`
- **Recipient**: `reception`
- **Data**: Lab order IDs, test names, prices
- **Follow-up**: `lab_result_ready` for technicians

### **Prescription Payment Notifications**
- **Type**: `medication_payment_required`
- **Recipient**: `reception`
- **Data**: Prescription ID, medications, dosage, duration
- **Follow-up**: `medication_ready` for nurses

## 6. **Invoice Integration**

### **Lab Invoice Items**
```javascript
// Lab invoice items are simple
{
  description: 'Complete Blood Count',
  quantity: 1,
  unitPrice: 200,
  total: 200,
  itemType: 'lab',
  category: 'lab'
}
```

### **Prescription Invoice Items**
```javascript
// Prescription invoice items include medication details
{
  description: 'Amoxicillin 500mg - 7 days',
  quantity: 21, // doses
  unitPrice: 16.67, // per dose
  total: 350,
  itemType: 'medication',
  category: 'pharmacy',
  medicationDetails: {
    dosage: '500mg',
    frequency: '3x daily',
    duration: '7 days'
  }
}
```

## 7. **Summary of Key Differences**

| Feature | Lab Payments | Prescription Payments |
|---------|-------------|---------------------|
| **Payment Model** | One-time, simple | Dose-based, complex |
| **Authorization** | Immediate processing | Nurse authorization required |
| **Partial Payments** | Basic partial/full | Day-based coverage tracking |
| **Workflow** | Doctor → Reception → Lab | Doctor → Reception → Nurse |
| **Notifications** | Lab technician alerts | Nurse administration alerts |
| **Status Tracking** | 6 statuses | 5 statuses |
| **Invoice Items** | Simple test descriptions | Detailed medication info |
| **Payment Reminders** | Basic reminders | Scheduled payment plans |
| **Processing** | Direct to lab | Through nurse administration |

---

**Both systems are well-integrated into your daily consolidated invoice system, ensuring all services for a patient on the same day are grouped into a single invoice for better financial tracking and patient experience.** 