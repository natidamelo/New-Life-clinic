# Consolidated Invoice System - Complete Guide

## Overview

The **Consolidated Invoice System** ensures that each patient gets exactly **one invoice per day** that consolidates all their services (card payments, lab tests, imaging, medications, etc.). This system eliminates multiple invoices and provides a clean, organized billing experience.

## Key Features

### 🎯 **One Invoice Per Patient Per Day**
- Each patient automatically gets one invoice per day
- All services on the same day are consolidated into a single invoice
- New day = new invoice automatically

### 🔄 **Automatic Service Consolidation**
- **Card Payments**: Patient registration with card fees
- **Lab Tests**: All lab orders for the day
- **Medications**: All prescriptions and medications
- **Imaging**: X-rays, MRIs, CT scans, etc.
- **Other Services**: Any additional medical services

### 💰 **Smart Payment Tracking**
- Track payments across all services
- **Partial payments supported** ✅
- Automatic balance calculation
- Status updates (pending, partial, paid)

### 📊 **Comprehensive Reporting**
- Service-specific metadata tracking
- Detailed payment history
- Itemized breakdown of all services
- Audit trail for all transactions

## How It Works

### 1. **Patient Registration with Card**
```javascript
// When a patient registers and selects a card
const cardData = {
  cardType: 'Premium',
  amount: 500,
  cardTypeId: 'cardTypeId',
  benefits: { /* card benefits */ },
  cardNumber: 'CARD-2025-001'
};

const invoice = await billingService.addServiceToDailyInvoice(
  patientId,
  'card',
  cardData,
  userId
);
```

### 2. **Adding Lab Orders**
```javascript
// When lab tests are ordered
const labData = {
  testName: 'CBC',
  totalPrice: 150,
  labOrderId: 'labOrderId',
  testType: 'blood'
};

const invoice = await billingService.addServiceToDailyInvoice(
  patientId,
  'lab',
  labData,
  userId
);
```

### 3. **Adding Medications**
```javascript
// When medications are prescribed
const medicationData = {
  medicationName: 'Amoxicillin',
  dosage: '500mg',
  frequency: 'BID',
  duration: 7,
  quantity: 14,
  unitPrice: 150,
  totalPrice: 2100,
  prescriptionId: 'prescriptionId'
};

const invoice = await billingService.addServiceToDailyInvoice(
  patientId,
  'medication',
  medicationData,
  userId
);
```

### 4. **Processing Payments**
```javascript
// Full payment
const response = await billingService.addPayment(invoiceId, {
  amount: totalAmount,
  method: 'cash',
  notes: 'Full payment'
});

// Partial payment
const response = await billingService.processPartialPayment(invoiceId, {
  amount: partialAmount,
  method: 'cash',
  notes: 'Partial payment'
});
```

## API Endpoints

### **Consolidated Invoice Management**
- `POST /api/billing/process-consolidated-payment` - Process full payment
- `POST /api/billing/process-partial-payment` - Process partial payment
- `GET /api/billing/invoices?isConsolidated=true` - Get consolidated invoices

### **Service Addition**
- `POST /api/billing/add-service` - Add service to daily invoice
- `PUT /api/billing/update-invoice` - Update invoice details

## Database Schema

### **MedicalInvoice Model**
```javascript
{
  invoiceNumber: String,
  patient: ObjectId,
  patientName: String,
  items: [{
    itemType: String, // 'card', 'lab', 'medication', 'imaging', 'service'
    category: String, // Same as itemType
    serviceName: String,
    description: String,
    quantity: Number,
    unitPrice: Number,
    totalPrice: Number,
    total: Number,
    metadata: Object, // Service-specific data
    addedAt: Date,
    addedBy: ObjectId
  }],
  subtotal: Number,
  total: Number,
  amountPaid: Number,
  balance: Number,
  status: String, // 'pending', 'partial', 'paid'
  isConsolidated: Boolean,
  type: String, // 'consolidated'
  payments: [{
    amount: Number,
    method: String,
    date: Date,
    reference: String,
    notes: String,
    processedBy: ObjectId
  }],
  createdAt: Date,
  updatedAt: Date
}
```

## Payment Processing Flow

### **Full Payment**
1. User selects invoice
2. Enters payment amount equal to balance
3. System processes payment via `/api/billing/process-consolidated-payment`
4. All services marked as paid
5. Invoice status updated to 'paid'

### **Partial Payment**
1. User selects invoice
2. Enters payment amount less than balance
3. System processes payment via `/api/billing/process-partial-payment`
4. Services marked as partially paid (proportional)
5. Invoice status updated to 'partial'
6. Balance recalculated

## Service Types Supported

### **Card Services**
- Annual fees
- Registration fees
- Card benefits

### **Lab Services**
- Blood tests
- Urine tests
- Specialized lab tests
- Test packages

### **Medication Services**
- Prescriptions
- Injections
- Medication packages
- Dosage calculations

### **Imaging Services**
- X-rays
- Ultrasounds
- MRIs
- CT scans

### **Other Services**
- Consultations
- Procedures
- Products
- Miscellaneous services

## Benefits

### **For Patients**
- ✅ **Simplified Billing**: One invoice per day instead of multiple
- ✅ **Better Experience**: Easier to understand and pay
- ✅ **Flexible Payments**: Can pay in installments
- ✅ **Clear Breakdown**: See all services in one place

### **For Staff**
- ✅ **Reduced Admin Work**: Fewer invoices to manage
- ✅ **Better Tracking**: Clear payment history
- ✅ **Improved Cash Flow**: Consolidated payments
- ✅ **Error Reduction**: Less chance of duplicate invoices

### **For Management**
- ✅ **Better Reporting**: Cleaner financial reports
- ✅ **Improved Analytics**: Consolidated data
- ✅ **Cost Savings**: Reduced administrative overhead
- ✅ **Better Compliance**: Organized billing records

## Error Handling

### **Common Issues & Solutions**

#### **1. Payment Amount Validation**
```javascript
// ❌ Error: Payment amount must be greater than zero
if (amountPaid <= 0) {
  return res.status(400).json({ 
    message: 'Payment amount must be greater than zero' 
  });
}
```

#### **2. Invoice Not Found**
```javascript
// ❌ Error: Invoice not found
const invoice = await MedicalInvoice.findById(invoiceId);
if (!invoice) {
  return res.status(404).json({ message: 'Invoice not found' });
}
```

#### **3. Payment Exceeds Balance**
```javascript
// ❌ Error: Payment amount exceeds outstanding balance
if (amountPaid > invoice.balance) {
  return res.status(400).json({ 
    message: 'Payment amount exceeds outstanding balance',
    amountPaid,
    invoiceBalance: invoice.balance
  });
}
```

## Testing

### **Test Scenarios**
1. **Patient Registration**: Create card payment invoice
2. **Add Lab Orders**: Add lab tests to same invoice
3. **Add Medications**: Add prescriptions to same invoice
4. **Partial Payment**: Pay 50% of total
5. **Full Payment**: Pay remaining balance
6. **New Day**: Verify new invoice created

### **Expected Results**
- ✅ One invoice per patient per day
- ✅ All services consolidated
- ✅ Partial payments tracked
- ✅ Balance calculated correctly
- ✅ Status updates properly

## Troubleshooting

### **Payment Processing Issues**
1. **Check invoice exists**: Verify invoice ID is valid
2. **Validate amount**: Ensure payment amount > 0
3. **Check balance**: Verify payment doesn't exceed balance
4. **Review logs**: Check server logs for errors

### **Consolidation Issues**
1. **Check date**: Ensure services are from same day
2. **Verify patient**: Confirm patient ID is correct
3. **Review items**: Check all items are properly added
4. **Check totals**: Verify calculations are correct

## Future Enhancements

### **Planned Features**
- 🔄 **Auto-payment reminders**
- 📱 **SMS notifications**
- 💳 **Online payment integration**
- 📊 **Advanced reporting dashboard**
- 🔐 **Payment security enhancements**

### **Integration Points**
- **Accounting systems**
- **Insurance providers**
- **Payment gateways**
- **Reporting tools**

---

## Summary

The **Consolidated Invoice System** provides a comprehensive solution for managing patient billing with:

- **One invoice per patient per day**
- **Automatic service consolidation**
- **Partial payment support**
- **Comprehensive tracking**
- **Error handling**
- **Scalable architecture**

This system ensures a smooth billing experience for patients while reducing administrative overhead for staff. 