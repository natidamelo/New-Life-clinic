# Testing Guide: Partial Payment Functionality

## 🎯 Overview

This guide will help you test the new partial payment functionality that allows reception staff to process due payments in multiple installments.

## ✅ Pre-Testing Checklist

- [ ] Backend server is running on port 5002
- [ ] Frontend is running and accessible
- [ ] You have a reception user account
- [ ] There are some invoices with outstanding balances in the system

## 🧪 Testing Steps

### Step 1: Access the Reception Dashboard

1. **Login to the system** as a reception user
2. **Navigate to Reception Dashboard** (`/app/reception`)
3. **Verify the "Due Payments" button** is visible in the top navigation

### Step 2: Test Due Payments Dashboard

1. **Click "Due Payments"** button
2. **Verify the dashboard loads** with:
   - Summary cards showing total due, overdue count, partial count
   - List of invoices with outstanding balances
   - Filter options (status, patient ID)
   - "Process Payment" buttons for each invoice

### Step 3: Test Partial Payment Processing

1. **Select an invoice** with outstanding balance
2. **Click "Process Payment"**
3. **Test the payment modal**:
   - Enter a partial amount (less than total balance)
   - Select payment method
   - Add optional notes
   - Submit payment

### Step 4: Verify Payment Processing

1. **Check payment success**:
   - Success notification appears
   - Modal closes automatically
   - Invoice list refreshes
   - Balance updates correctly

2. **Verify invoice status**:
   - Status changes to "partial" if balance remains
   - Status changes to "paid" if balance reaches zero
   - Payment history shows the new payment

### Step 5: Test Multiple Partial Payments

1. **Process another partial payment** on the same invoice
2. **Verify cumulative payments**:
   - Total paid amount increases
   - Remaining balance decreases
   - Payment history shows multiple entries

### Step 6: Test Full Payment Completion

1. **Process final payment** to complete the invoice
2. **Verify completion**:
   - Status changes to "paid"
   - Balance becomes zero
   - Invoice disappears from due payments list

## 🔍 Test Scenarios

### Scenario 1: New Invoice Payment
- Create a new invoice for a patient
- Process full payment immediately
- Verify status changes to "paid"

### Scenario 2: Partial Payment Series
- Create an invoice for $100
- Pay $30 (status: partial, balance: $70)
- Pay $40 (status: partial, balance: $30)
- Pay $30 (status: paid, balance: $0)

### Scenario 3: Payment Validation
- Try to pay more than the remaining balance
- Verify error message appears
- Verify payment is not processed

### Scenario 4: Different Payment Methods
- Test each payment method:
  - Cash
  - Credit Card
  - Debit Card
  - Bank Transfer
  - Insurance

## 🐛 Common Issues & Solutions

### Issue: "Due Payments" button not visible
**Solution**: Check user role permissions - only reception, finance, and admin roles can access

### Issue: No invoices showing in due payments
**Solution**: 
- Check if there are invoices with outstanding balances
- Verify invoice status is not "paid" or "cancelled"
- Check database for test data

### Issue: Payment not processing
**Solution**:
- Check browser console for errors
- Verify amount is within valid range
- Check network tab for API errors

### Issue: Balance not updating
**Solution**:
- Refresh the page
- Check if payment was actually saved to database
- Verify invoice calculations

## 📊 Expected Results

### API Responses

**GET /api/billing/due-payments**
```json
{
  "success": true,
  "data": {
    "invoices": [...],
    "summary": {
      "totalInvoices": 5,
      "totalDue": 500,
      "overdueCount": 2,
      "partialCount": 3
    }
  }
}
```

**POST /api/billing/process-partial-payment**
```json
{
  "success": true,
  "message": "Partial payment processed successfully",
  "data": {
    "invoice": {...},
    "payment": {...},
    "remainingBalance": 30,
    "notification": {...}
  }
}
```

### Database Changes

After processing a payment:
- `invoice.amountPaid` increases
- `invoice.balance` decreases
- `invoice.status` updates appropriately
- New payment record added to `invoice.payments` array

## 🎯 Success Criteria

The partial payment functionality is working correctly if:

1. ✅ Reception can access due payments dashboard
2. ✅ Partial payments can be processed successfully
3. ✅ Invoice balances update correctly
4. ✅ Status changes appropriately (pending → partial → paid)
5. ✅ Payment history is maintained
6. ✅ Multiple partial payments work correctly
7. ✅ Validation prevents overpayment
8. ✅ Error handling works properly

## 📝 Test Data Setup

To create test data for testing:

```javascript
// Create test patient
const patient = await Patient.create({
  firstName: 'Test',
  lastName: 'Patient',
  patientId: 'TEST001',
  age: 30,
  gender: 'male'
});

// Create test invoice
const invoice = await MedicalInvoice.create({
  invoiceNumber: 'INV-TEST-001',
  patient: patient._id,
  total: 100,
  balance: 100,
  amountPaid: 0,
  status: 'pending',
  items: [{
    description: 'Test Service',
    quantity: 1,
    unitPrice: 100,
    total: 100
  }]
});
```

## 🚀 Next Steps After Testing

1. **Document any issues** found during testing
2. **Verify all payment methods** work correctly
3. **Test with real patient data** if available
4. **Check performance** with large numbers of invoices
5. **Verify audit trail** is working correctly

## 📞 Support

If you encounter issues during testing:
1. Check the browser console for errors
2. Check the server logs for backend errors
3. Verify database connectivity
4. Contact the development team with specific error messages 