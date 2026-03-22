# Daily Consolidated Invoice System

## Overview

The Daily Consolidated Invoice System is a comprehensive solution that ensures **each patient gets exactly one invoice per day** that consolidates all their services (card payments, lab tests, imaging, medications, etc.). This system eliminates the need for multiple invoices and provides a clean, organized billing experience.

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
- Partial payments supported
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

const invoice = await DailyConsolidatedInvoiceService.addCardToDailyInvoice(
  patientId,
  cardData,
  userId
);
```

### 2. **Adding Lab Orders**
```javascript
// When lab tests are ordered
const labOrders = [
  { testName: 'CBC', totalPrice: 150 },
  { testName: 'Glucose', totalPrice: 200 }
];

const invoice = await DailyConsolidatedInvoiceService.addLabOrdersToDailyInvoice(
  patientId,
  labOrders,
  userId
);
```

### 3. **Adding Prescriptions**
```javascript
// When medications are prescribed
const prescriptionData = {
  prescriptionId: 'prescriptionId',
  medicationNames: 'Amoxicillin, Paracetamol',
  totalCost: 250,
  medications: [ /* medication details */ ],
  instructions: 'Take with food'
};

const invoice = await DailyConsolidatedInvoiceService.addPrescriptionToDailyInvoice(
  patientId,
  prescriptionData,
  userId
);
```

### 4. **Processing Payments**
```javascript
// When payment is made
const paymentData = {
  amount: 800,
  method: 'cash',
  reference: 'PAY-2025-001',
  notes: 'Payment on daily consolidated invoice'
};

const invoice = await DailyConsolidatedInvoiceService.processPayment(
  invoiceId,
  paymentData,
  userId
);
```

## Invoice Structure

### Invoice Number Format
```
INV-DAILY-YYYYMMDD-PATIENTSUFFIX-TIMESTAMP
Example: INV-DAILY-20250115-P001-123456
```

### Invoice Items Structure
```javascript
{
  itemType: 'lab|medication|card|imaging|service',
  category: 'lab|medication|card|imaging|service',
  description: 'Service description',
  quantity: 1,
  unitPrice: 150,
  total: 150,
  discount: 0,
  tax: 0,
  metadata: {
    // Service-specific data
    testName: 'CBC',
    labOrderId: 'labOrderId',
    // ... other metadata
  },
  addedAt: new Date(),
  addedBy: 'userId'
}
```

## Database Schema Updates

### MedicalInvoice Model
Added new field to support daily consolidation:
```javascript
isDailyConsolidated: {
  type: Boolean,
  default: false,
  index: true
}
```

## Service Methods

### Core Methods

#### `getOrCreateDailyInvoice(patientId, userId, date)`
- Gets existing daily invoice or creates new one
- Ensures one invoice per patient per day
- Returns the consolidated invoice

#### `addServiceToDailyInvoice(patientId, serviceType, serviceData, userId, date)`
- Adds any service to the daily invoice
- Automatically recalculates totals
- Updates invoice status

#### `processPayment(invoiceId, paymentData, userId)`
- Processes payment on consolidated invoice
- Updates payment history
- Recalculates balance and status

### Specialized Methods

#### `addCardToDailyInvoice(patientId, cardData, userId, date)`
- Adds card payment to daily invoice
- Handles card-specific metadata

#### `addLabOrdersToDailyInvoice(patientId, labOrders, userId, date)`
- Adds multiple lab orders to daily invoice
- Links lab orders to invoice
- Updates lab order references

#### `addPrescriptionToDailyInvoice(patientId, prescriptionData, userId, date)`
- Adds prescription/medication to daily invoice
- Handles medication details and instructions

#### `addImagingToDailyInvoice(patientId, imagingData, userId, date)`
- Adds imaging services to daily invoice
- Handles imaging-specific metadata

### Utility Methods

#### `getDailyInvoice(patientId, date)`
- Gets daily invoice for specific date
- Returns null if no invoice exists

#### `getPatientDailyInvoices(patientId, options)`
- Gets all daily invoices for a patient
- Supports date range filtering

#### `migrateToDailyInvoices(patientId, startDate, endDate, userId)`
- Migrates existing services to daily invoices
- Useful for system transition

## Integration Points

### Updated Controllers

#### Patient Registration (`patientController.js`)
- Uses `addCardToDailyInvoice()` for card payments
- Creates daily consolidated invoice automatically

#### Lab Orders (`labOrderController.js`)
- Uses `addServiceToDailyInvoice()` for lab tests
- Links lab orders to daily invoice

#### Prescriptions (`prescriptionController.js`)
- Uses `addPrescriptionToDailyInvoice()` for medications
- Consolidates all medications for the day

### Frontend Integration

The frontend can now:
- Display consolidated invoices by date
- Show all services for a patient on a specific day
- Process payments on the entire daily invoice
- Track payment status across all services

## Benefits

### For Patients
- **Single Invoice**: One invoice per day instead of multiple
- **Clear Overview**: See all services and total cost
- **Simplified Payment**: Pay once for all daily services
- **Better Experience**: Organized and professional billing

### For Staff
- **Reduced Complexity**: Fewer invoices to manage
- **Better Organization**: Services grouped by date
- **Easier Tracking**: Clear payment status per day
- **Improved Efficiency**: Less administrative overhead

### For Management
- **Better Reporting**: Daily consolidated financial reports
- **Clearer Analytics**: Service patterns by day
- **Improved Billing**: More professional invoice presentation
- **Reduced Errors**: Fewer invoice-related issues

## Example Scenarios

### Scenario 1: Patient Visit with Multiple Services
```
Patient: John Doe
Date: January 15, 2025

Services:
1. Registration with Premium Card (ETB 500)
2. CBC Lab Test (ETB 150)
3. Blood Glucose Test (ETB 200)
4. Amoxicillin Prescription (ETB 250)

Result: Single Invoice INV-DAILY-20250115-P001-123456
Total: ETB 1,100
```

### Scenario 2: Patient Returns Next Day
```
Patient: John Doe
Date: January 16, 2025

Services:
1. Chest X-Ray (ETB 300)
2. Paracetamol Prescription (ETB 50)

Result: New Invoice INV-DAILY-20250116-P001-123457
Total: ETB 350
```

### Scenario 3: Partial Payment
```
Invoice Total: ETB 1,100
Payment Made: ETB 800
Balance: ETB 300
Status: Partial
```

## Testing

Run the test script to verify the system:
```bash
cd backend
node scripts/test-daily-consolidated-invoice.js
```

This will test:
- Patient registration with card
- Adding lab orders
- Adding prescriptions
- Processing payments
- Invoice consolidation
- Daily uniqueness

## Migration

For existing systems, use the migration utility:
```javascript
const results = await DailyConsolidatedInvoiceService.migrateToDailyInvoices(
  patientId,
  startDate,
  endDate,
  userId
);
```

This will:
- Group existing services by date
- Create daily consolidated invoices
- Preserve all existing data
- Maintain payment history

## Best Practices

### 1. **Always Use the Service**
- Don't create invoices manually
- Always use `DailyConsolidatedInvoiceService` methods
- Let the system handle consolidation automatically

### 2. **Handle Errors Gracefully**
- Check for existing invoices before creating new ones
- Validate payment amounts
- Handle partial payments correctly

### 3. **Maintain Data Integrity**
- Always link services to invoices
- Update service references when invoices change
- Preserve payment history

### 4. **Monitor Performance**
- Index the `isDailyConsolidated` field
- Use date ranges for queries
- Monitor invoice creation frequency

## Troubleshooting

### Common Issues

#### Issue: Multiple invoices created for same day
**Solution**: Check if `isDailyConsolidated: true` is set and use `getOrCreateDailyInvoice()`

#### Issue: Services not appearing in invoice
**Solution**: Ensure services are added using the service methods, not manually

#### Issue: Payment not reflecting correctly
**Solution**: Use `processPayment()` method and check payment data structure

#### Issue: Invoice totals incorrect
**Solution**: Use `recalculateInvoiceTotals()` method to fix calculations

### Debug Commands

```javascript
// Check daily invoice for patient
const invoice = await DailyConsolidatedInvoiceService.getDailyInvoice(patientId, date);

// Get all daily invoices for patient
const invoices = await DailyConsolidatedInvoiceService.getPatientDailyInvoices(patientId);

// Recalculate invoice totals
await DailyConsolidatedInvoiceService.recalculateInvoiceTotals(invoice);
```

## Future Enhancements

### Planned Features
- **Discount Management**: Apply discounts across all daily services
- **Insurance Integration**: Handle insurance claims for consolidated invoices
- **Payment Plans**: Support for installment payments
- **Automated Billing**: Scheduled invoice generation
- **Advanced Reporting**: Detailed analytics and insights

### API Endpoints
- `GET /api/invoices/daily/:patientId` - Get daily invoices
- `POST /api/invoices/daily/:patientId/services` - Add service to daily invoice
- `POST /api/invoices/daily/:invoiceId/payment` - Process payment
- `GET /api/invoices/daily/:patientId/summary` - Get billing summary

## Conclusion

The Daily Consolidated Invoice System provides a robust, scalable solution for managing patient billing. It ensures a clean, organized billing experience while maintaining full functionality and data integrity. The system is designed to be easy to use, maintain, and extend as your clinic grows. 