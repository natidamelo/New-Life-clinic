# Prescription Payment System Analysis

## Overview

Your clinic management system has a comprehensive prescription payment workflow that handles medication payments from prescription creation through reception processing, including support for partial payments.

## 1. Prescription Creation & Payment Notification Flow

### **Step 1: Doctor Creates Prescription**
```javascript
// backend/controllers/prescriptionController.js
const createPrescription = async (req, res) => {
  // 1. Doctor creates prescription with medications
  // 2. System calculates total cost based on inventory prices
  // 3. Prescription is saved with payment status 'pending'
  
  // 4. Add to daily consolidated invoice
  const invoice = await DailyConsolidatedInvoiceService.addPrescriptionToDailyInvoice(
    patientIdToUse,
    prescriptionData,
    doctorIdToUse
  );
```

### **Step 2: Payment Notification Creation**
```javascript
// backend/controllers/prescriptionController.js
const receptionNotification = new Notification({
  senderId: doctorIdToUse,
  senderRole: 'doctor',
  recipientRole: 'reception',
  type: 'medication_payment_required',
  title: 'Medication Payment Required',
  message: `Medications prescribed for ${patientDoc?.firstName} ${patientDoc?.lastName}. Payment of ETB ${totalCost} required before dispensing.`,
  data: {
    prescriptionId: savedPrescription._id,
    invoiceId: invoice?._id || null,
    invoiceNumber: invoice?.invoiceNumber || null,
    patientId: patientIdToUse,
    patientName: `${patientDoc?.firstName} ${patientDoc?.lastName}`,
    totalAmount: totalCost,
    amount: totalCost,
    medications: medicationsList,
    sendToNurse: sendToNurse
  },
  priority: 'high',
  isRead: false
});
```

### **Step 3: Reception Dashboard Display**
```javascript
// frontend/src/pages/Reception/ReceptionDashboard.tsx
const fetchPaymentNotifications = async () => {
  const response = await api.get('/api/notifications?type=medication_payment_required,lab_payment_required,service_payment_required,card_payment_required');
  
  const notifications = response.data?.data || response.data?.notifications || [];
  const activeNotifications = notifications.filter((n: any) => !n.read);
  setPaymentNotifications(activeNotifications);
};
```

## 2. Payment Processing Flow

### **Step 4: Reception Clicks Payment Notification**
```javascript
// frontend/src/components/Reception/NotificationPanel.tsx
const handleNotificationClick = (notification: any) => {
  if (notification.type.includes('payment_required') && !notification.data?.paid) {
    navigate(`/billing/process-payment/${notification._id}`);
  }
};
```

### **Step 5: Payment Processing Page**
```javascript
// frontend/src/pages/Billing/ProcessPayment.tsx
// User enters payment details:
// - Payment method (cash, credit_card, debit_card, insurance, bank_transfer)
// - Amount to pay (can be partial)
// - Notes
// - Send to nurse flag
```

### **Step 6: Backend Payment Processing**
```javascript
// backend/routes/billing.js
router.post('/process-payment/:prescriptionId', auth, async (req, res) => {
  const { paymentMethod, amountPaid, notes, sendToNurse } = req.body;
  
  // 1. Validate prescription and invoice
  const prescription = await Prescription.findById(prescriptionId);
  const invoice = await MedicalInvoice.findById(invoiceId);
  
  // 2. Process payment with authorization
  const enhancedResult = await EnhancedMedicationPaymentProcessor.processPaymentWithAuthorization({
    prescriptionId,
    invoiceId,
    paymentMethod,
    amountPaid,
    notes,
    sendToNurse,
    prescription,
    invoice
  });
  
  // 3. Update invoice with payment
  invoice.payments.push({
    amount: amountPaid,
    method: paymentMethod,
    date: new Date(),
    reference: `MED-PAY-${Date.now()}`,
    notes: notes || 'Medication payment'
  });
  
  // 4. Update prescription status
  prescription.paymentStatus = enhancedResult.authorizationSummary.paidDays >= enhancedResult.authorizationSummary.totalDays ? 'paid' : 'partial';
  prescription.paidAt = new Date();
  
  // 5. Update notification
  await Notification.findOneAndUpdate(
    { 'data.prescriptionId': prescriptionId },
    { read: true, 'data.paymentStatus': 'paid' }
  );
});
```

## 3. Partial Payment System

### **Partial Payment Processing**
```javascript
// backend/routes/billing.js
router.post('/process-partial-payment', auth, async (req, res) => {
  const { prescriptionId, invoiceId, paymentMethod, amountPaid, notes } = req.body;
  
  // 1. Process partial payment
  const enhancedResult = await EnhancedMedicationPaymentProcessor.processPartialPayment({
    prescriptionId,
    invoiceId,
    paymentMethod,
    amountPaid,
    notes
  });
  
  // 2. Update invoice
  invoice.amountPaid = (invoice.amountPaid || 0) + amountPaid;
  invoice.balance = Math.max(0, invoice.total - invoice.amountPaid);
  invoice.status = invoice.balance === 0 ? 'paid' : 'partial';
  
  // 3. Update prescription
  prescription.paymentStatus = 'partially_paid';
  prescription.paymentAuthorization = {
    paidDays: enhancedResult.authorizationSummary.paidDays,
    totalDays: enhancedResult.authorizationSummary.totalDays,
    authorizedDoses: enhancedResult.authorizationSummary.authorizedDoses,
    paymentPlan: enhancedResult.paymentPlan
  };
  
  // 4. Create payment reminders if needed
  if (enhancedResult.paymentReminders.length > 0) {
    for (const reminder of enhancedResult.paymentReminders) {
      const notification = new Notification({
        title: 'Medication Payment Reminder',
        message: reminder.message,
        type: 'medication_payment_required',
        data: {
          prescriptionId: prescriptionId,
          medicationName: reminder.medicationName,
          unpaidDays: reminder.unpaidDays,
          outstandingAmount: reminder.outstandingAmount,
          nextDueDate: reminder.nextDueDate
        }
      });
      await notification.save();
    }
  }
});
```

### **Partial Payment Authorization**
```javascript
// EnhancedMedicationPaymentProcessor.processPartialPayment()
// 1. Calculate how many days of medication can be covered with partial payment
// 2. Determine authorized doses based on payment amount
// 3. Create payment plan for remaining balance
// 4. Generate payment reminders for unpaid portions
```

## 4. Payment Status Tracking

### **Payment Statuses**
- **`pending`**: Prescription created, no payment made
- **`partially_paid`**: Some payment made, but not full amount
- **`paid`**: Full payment received
- **`overdue`**: Payment past due date

### **Invoice Statuses**
- **`pending`**: Invoice created, no payment
- **`partial`**: Some payment received
- **`paid`**: Full payment received
- **`overdue`**: Payment past due

## 5. Frontend Payment Interface

### **Payment Notifications Panel**
```javascript
// frontend/src/components/Reception/PaymentNotifications.tsx
const NotificationsPanel = () => {
  // 1. Fetch all payment notifications
  const fetchAllNotifications = async () => {
    const response = await api.get('/api/notifications?recipientRole=reception');
    const notifications = response.data?.data || [];
    
    // 2. Filter active payment notifications
    const activeNotifications = notifications.filter(n => 
      !n.read && 
      n.type.includes('payment_required') &&
      (n.data?.amount > 0 || n.data?.totalAmount > 0)
    );
    
    // 3. Filter pending prescriptions
    const pendingPrescriptions = prescriptionsResponse.filter(p => {
      const isPaid = p.paymentStatus === 'paid';
      const isPartiallyPaid = p.paymentStatus === 'partially_paid';
      const hasAmount = (p.totalCost || 0) > 0;
      const isPending = p.paymentStatus === 'pending' || p.paymentStatus === 'unpaid';
      
      return isPending && hasAmount && !isPaid && !isPartiallyPaid;
    });
  };
};
```

### **Payment Processing Dialog**
```javascript
// frontend/src/pages/Billing/ProcessPayment.tsx
const ProcessPayment = () => {
  // 1. Display payment details
  // 2. Allow partial payment entry
  // 3. Show payment authorization summary
  // 4. Process payment with backend
  // 5. Update UI and notifications
};
```

## 6. Nurse Task Creation

### **After Payment Processing**
```javascript
// backend/routes/billing.js
if (sendToNurse) {
  const nurseTask = new NurseTask({
    taskType: 'MEDICATION',
    description: `Administer ${medicationName} to patient`,
    patientId: prescription.patient,
    assignedBy: req.user._id,
    status: 'PENDING',
    priority: 'MEDIUM',
    medicationDetails: {
      medicationName: medicationName,
      dosage: dosage,
      frequency: frequency,
      duration: duration,
      paymentAuthorization: prescription.paymentAuthorization
    }
  });
  
  // Create nurse notification
  const nurseNotification = new Notification({
    title: 'Medication Ready for Administration',
    message: `Medications for ${patient.firstName} ${patient.lastName} have been paid for and are ready for administration.`,
    type: 'medication_ready',
    recipientRole: 'nurse',
    data: {
      patientId: prescription.patient,
      prescriptionId: prescription._id,
      medications: prescription.medications,
      paymentCompleted: true
    }
  });
}
```

## 7. Payment Authorization for Nurses

### **Nurse Task Details**
```javascript
// frontend/src/components/nurse/TaskDetailsModal.tsx
const TaskDetailsModal = () => {
  const { paymentAuthorization } = task.medicationDetails;
  const isPartialPayment = paymentAuthorization.paymentStatus === 'partially_paid';
  
  return (
    <div>
      {isPartialPayment && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <strong>⚠️ Partial Payment Alert:</strong>
          <p>Only administer doses for Days 1-{paymentAuthorization.paidDays}.</p>
          <p>Remaining balance: ETB {paymentAuthorization.outstandingAmount}</p>
        </div>
      )}
      
      <div>
        <strong>Authorized Doses:</strong> {paymentAuthorization.authorizedDoses}
        <strong>Total Doses:</strong> {paymentAuthorization.totalDoses}
      </div>
    </div>
  );
};
```

## 8. Key Features

### **✅ Daily Consolidated Invoicing**
- All prescriptions for a patient on the same day are added to one invoice
- Prevents multiple invoices per patient per day

### **✅ Partial Payment Support**
- Patients can pay in installments
- System tracks paid vs unpaid portions
- Nurses are authorized only for paid doses

### **✅ Payment Authorization**
- Detailed tracking of which doses are paid for
- Nurses can only administer authorized doses
- Clear warnings for partial payments

### **✅ Payment Reminders**
- Automatic reminders for unpaid portions
- Scheduled follow-up notifications
- Outstanding balance tracking

### **✅ Multi-Medication Support**
- Handle multiple medications in one prescription
- Individual payment tracking per medication
- Combined payment processing

### **✅ Real-time Updates**
- Notifications update immediately after payment
- Queue filtering includes partial payments
- Payment status syncs across all components

## 9. Data Flow Summary

```
1. Doctor Creates Prescription
   ↓
2. System Calculates Total Cost
   ↓
3. Add to Daily Consolidated Invoice
   ↓
4. Create Payment Notification for Reception
   ↓
5. Reception Sees Notification in Dashboard
   ↓
6. Reception Clicks to Process Payment
   ↓
7. User Enters Payment Details (Full or Partial)
   ↓
8. Backend Processes Payment with Authorization
   ↓
9. Update Invoice and Prescription Status
   ↓
10. Create Nurse Task (if sendToNurse = true)
   ↓
11. Nurse Sees Task with Payment Authorization
   ↓
12. Nurse Administers Only Authorized Doses
```

## 10. Payment Status Visibility

### **In Reception Dashboard:**
- ✅ Pending payments show in notifications
- ✅ Partial payments are tracked
- ✅ Payment reminders are generated
- ✅ Queue filtering includes partial payments

### **In Billing Area:**
- ✅ Invoice status shows 'partial' for partial payments
- ✅ Payment history shows all payments
- ✅ Outstanding balance is clearly displayed
- ✅ Payment reminders are visible

### **In Nurse Dashboard:**
- ✅ Tasks show payment authorization details
- ✅ Partial payment warnings are displayed
- ✅ Only authorized doses can be administered
- ✅ Payment status affects task availability

---

**The prescription payment system is comprehensive and handles both full and partial payments with proper authorization and tracking throughout the clinic workflow.** 