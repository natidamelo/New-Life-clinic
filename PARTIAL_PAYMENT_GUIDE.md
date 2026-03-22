# Partial Payment System Guide

## Overview

The clinic management system now supports partial payments, allowing reception staff to process payments in multiple installments. This feature is essential for improving patient experience and cash flow management.

## Features

### 1. Partial Payment Processing
- **Multiple Payment Methods**: Cash, Credit Card, Debit Card, Bank Transfer, Insurance
- **Flexible Amounts**: Any amount up to the remaining balance
- **Payment Tracking**: Complete history of all payments per invoice
- **Status Management**: Automatic status updates (pending → partial → paid)

### 2. Reception Access
- **Due Payments Dashboard**: View all outstanding invoices
- **Payment Processing**: Direct payment processing from reception dashboard
- **Real-time Updates**: Immediate status updates after payment
- **Payment History**: Track all payments made by reception

### 3. Validation & Security
- **Amount Validation**: Cannot exceed remaining balance
- **Role-based Access**: Only authorized roles can process payments
- **Audit Trail**: All payments logged with user information
- **Error Handling**: Comprehensive error messages and validation

## API Endpoints

### Get Due Payments
```
GET /api/billing/due-payments
```
**Query Parameters:**
- `patientId` (optional): Filter by specific patient
- `status` (optional): Filter by invoice status
- `limit` (optional): Number of results (default: 50)

**Response:**
```json
{
  "success": true,
  "data": {
    "invoices": [
      {
        "_id": "invoice_id",
        "invoiceNumber": "INV-001",
        "patient": {
          "_id": "patient_id",
          "firstName": "John",
          "lastName": "Doe",
          "patientId": "P001"
        },
        "total": 100,
        "balance": 60,
        "amountPaid": 40,
        "status": "partial",
        "dueDate": "2024-01-15T00:00:00.000Z"
      }
    ],
    "summary": {
      "totalInvoices": 25,
      "totalDue": 1500,
      "overdueCount": 5,
      "partialCount": 15
    }
  }
}
```

### Process Partial Payment
```
POST /api/billing/process-partial-payment
```
**Request Body:**
```json
{
  "invoiceId": "invoice_id",
  "amountPaid": 30.00,
  "paymentMethod": "cash",
  "notes": "Partial payment"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Partial payment processed successfully",
  "data": {
    "invoice": {
      "_id": "invoice_id",
      "invoiceNumber": "INV-001",
      "total": 100,
      "amountPaid": 70,
      "balance": 30,
      "status": "partial"
    },
    "payment": {
      "amount": 30,
      "method": "cash",
      "date": "2024-01-10T10:30:00.000Z",
      "reference": "PARTIAL-PAY-1704892200000",
      "notes": "Partial payment"
    },
    "remainingBalance": 30,
    "notification": {
      "title": "Partial Payment Processed",
      "message": "Partial payment of 30 processed for John Doe. Remaining balance: 30"
    }
  }
}
```

## Frontend Components

### DuePaymentsManager
Located at: `frontend/src/components/Reception/DuePaymentsManager.tsx`

**Features:**
- Summary cards showing total due, overdue count, partial count
- Filterable list of due payments
- Payment processing modal
- Real-time updates

**Usage:**
```tsx
import DuePaymentsManager from '../components/Reception/DuePaymentsManager';

// In your component
<DuePaymentsManager />
```

### RecordPaymentForm
Located at: `frontend/src/components/Billing/RecordPaymentForm.tsx`

**Features:**
- Payment amount validation
- Multiple payment methods
- Reference number for card/bank payments
- Notes field

## Database Schema

### MedicalInvoice Model
```javascript
{
  invoiceNumber: String,
  patient: ObjectId,
  total: Number,
  amountPaid: Number,
  balance: Number,
  status: String, // 'pending', 'partial', 'paid', 'overdue', 'cancelled'
  payments: [{
    amount: Number,
    method: String,
    date: Date,
    reference: String,
    notes: String,
    processedBy: ObjectId
  }],
  dueDate: Date,
  createdBy: ObjectId
}
```

## Workflow

### 1. Patient Registration
1. Patient registers at reception
2. Invoice created with pending status
3. Patient can pay full amount or partial amount

### 2. Partial Payment Processing
1. Reception accesses "Due Payments" from dashboard
2. Views list of outstanding invoices
3. Selects invoice to process payment
4. Enters payment amount (up to remaining balance)
5. Selects payment method
6. Adds optional notes
7. Processes payment
8. System updates invoice status and balance

### 3. Multiple Payments
1. Patient can make multiple partial payments
2. Each payment is tracked separately
3. Invoice status updates automatically
4. When balance reaches zero, status becomes "paid"

## Error Handling

### Common Errors
1. **Amount Exceeds Balance**
   ```
   Error: Payment amount (150) exceeds remaining balance (100)
   ```

2. **Invalid Payment Method**
   ```
   Error: Invalid payment method
   ```

3. **Invoice Not Found**
   ```
   Error: Invoice not found
   ```

4. **Invoice Already Paid**
   ```
   Error: Cannot process payment for paid invoice
   ```

## Testing

Run the partial payment tests:
```bash
npm test -- partial-payment-test.js
```

Test scenarios:
- Partial payment processing
- Full payment processing
- Payment exceeding balance (should fail)
- Multiple partial payments
- Payment completion with final partial payment

## Security Considerations

1. **Role-based Access**: Only reception, finance, and admin roles can process payments
2. **Amount Validation**: Server-side validation prevents overpayment
3. **Audit Trail**: All payments logged with user information
4. **Input Sanitization**: All inputs validated and sanitized
5. **Transaction Safety**: Database transactions ensure data consistency

## Configuration

### Environment Variables
```env
# Payment processing
PAYMENT_METHODS=cash,credit_card,debit_card,bank_transfer,insurance
MAX_PAYMENT_AMOUNT=10000
MIN_PAYMENT_AMOUNT=0.01

# Notifications
ENABLE_PAYMENT_NOTIFICATIONS=true
PAYMENT_NOTIFICATION_RECIPIENTS=reception,finance
```

## Troubleshooting

### Common Issues

1. **Payment Not Processing**
   - Check user permissions
   - Verify invoice status
   - Ensure amount is within valid range

2. **Balance Not Updating**
   - Check database connection
   - Verify invoice exists
   - Check for validation errors

3. **Status Not Changing**
   - Verify payment amount calculation
   - Check status update logic
   - Ensure proper save operations

### Debug Mode
Enable debug logging:
```javascript
// In server.js
console.log('Payment processing debug:', {
  invoiceId,
  amountPaid,
  currentBalance,
  newBalance,
  status
});
```

## Future Enhancements

1. **Payment Plans**: Scheduled automatic payments
2. **Discounts**: Automatic discount application
3. **Refunds**: Partial and full refund processing
4. **Payment Reminders**: Automated reminder system
5. **Reporting**: Enhanced payment analytics
6. **Mobile Payments**: Integration with mobile payment systems

## Support

For technical support or questions about the partial payment system:
- Check the API documentation
- Review error logs
- Contact the development team
- Submit issues through the project repository 