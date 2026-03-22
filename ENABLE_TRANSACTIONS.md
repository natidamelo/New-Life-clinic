# Re-enabling Transactions After Replica Set Setup

Once your MongoDB replica set is running, you can optionally re-enable transactions for critical operations.

## Why Re-enable Transactions?

For a medical system, transactions provide important guarantees:

1. **Medical Record Finalization** - Ensures record is saved AND patient status is updated together
2. **Payment Processing** - Ensures payment is recorded AND invoice is updated atomically
3. **Inventory Deductions** - Prevents duplicate deductions and ensures consistency
4. **Prescription Dispensing** - Ensures prescription status matches payment status

## Current State (No Transactions)

The code currently works WITHOUT transactions to support standalone MongoDB. This works fine for most operations but has potential edge cases:

- If server crashes between saving medical record and updating patient status
- If payment is recorded but invoice update fails
- If inventory is deducted but transaction log fails

For production medical systems, these edge cases could cause data inconsistencies.

## How to Re-enable Transactions

### Option 1: Use the Helper Function (Recommended)

The `withTransaction` helper automatically detects if replica set is available:

```javascript
const { withTransaction } = require('../config/db-transaction-enabled');

// Example: Medical Record Finalization
medicalRecordSchema.methods.finalize = async function(finalizedBy, userRole) {
  const self = this;
  
  const result = await withTransaction(async (session) => {
    // Update record status
    self.status = 'Finalized';
    self.lastUpdatedBy = finalizedBy;
    self.updatedAt = new Date();
    
    // Save with session (if available)
    if (session) {
      await self.save({ session });
    } else {
      await self.save();
    }
    
    // Update patient status
    const Patient = require('./Patient');
    const updateOptions = session ? { new: true, session } : { new: true };
    
    const updateResult = await Patient.findByIdAndUpdate(
      self.patient,
      { 
        status: 'completed',
        completedAt: new Date(),
        lastUpdated: new Date()
      },
      updateOptions
    );
    
    if (!updateResult) {
      throw new Error(`Patient ${self.patient} not found`);
    }
    
    return true;
  });
  
  return result.success;
};
```

### Option 2: Conditional Transactions

Check if transactions are available and use them conditionally:

```javascript
const { areTransactionsAvailable } = require('../config/db-transaction-enabled');

async function processPayment(paymentData) {
  const useTransactions = await areTransactionsAvailable();
  let session = null;
  
  if (useTransactions) {
    session = await mongoose.startSession();
    session.startTransaction();
  }
  
  try {
    // Your operations here
    const saveOptions = session ? { session } : {};
    await invoice.save(saveOptions);
    await payment.save(saveOptions);
    
    if (session) {
      await session.commitTransaction();
      session.endSession();
    }
    
    return { success: true };
    
  } catch (error) {
    if (session) {
      await session.abortTransaction();
      session.endSession();
    }
    throw error;
  }
}
```

## Files to Update

### 1. Database Connection

Replace in `backend/server.js` or wherever you initialize DB:

```javascript
// OLD
const connectDB = require('./config/db');

// NEW
const { connectDB } = require('./config/db-transaction-enabled');
```

### 2. Medical Record Finalization

File: `backend/models/MedicalRecord.js`

The current implementation (lines 376-437) can be updated to use the `withTransaction` helper shown above.

### 3. Payment Controller

File: `backend/controllers/paymentController.js`

Current implementation works without transactions. To add transaction support:

```javascript
const { withTransaction } = require('../config/db-transaction-enabled');

exports.recordPayment = async (req, res) => {
  try {
    const result = await withTransaction(async (session) => {
      const saveOptions = session ? { session } : {};
      
      // Create payment transaction
      const paymentTransaction = new PaymentTransaction(paymentData);
      await paymentTransaction.save(saveOptions);
      
      // Update invoice
      invoice.amountPaid += parseFloat(amountPaid);
      await invoice.save(saveOptions);
      
      return { paymentTransaction, invoice };
    });
    
    res.status(201).json({
      message: 'Payment recorded successfully',
      ...result.result
    });
    
  } catch (error) {
    res.status(500).json({ message: 'Failed to record payment', error: error.message });
  }
};
```

### 4. Inventory Service

File: `backend/services/inventoryService.js`

The service already has transaction logic (commented out with `useTransactions = false`). 

To enable:

```javascript
// Line 24 - Change from:
let useTransactions = false;

// To:
const { areTransactionsAvailable } = require('../config/db-transaction-enabled');
let useTransactions = await areTransactionsAvailable();
```

## Testing After Enabling Transactions

1. **Run the transaction test:**
   ```bash
   node backend/test-transactions.js
   ```

2. **Test medical record finalization:**
   - Create a medical record
   - Finalize it
   - Check logs for transaction messages
   - Verify patient status updated

3. **Test payment processing:**
   - Record a payment
   - Check both payment and invoice are updated
   - Try aborting mid-transaction (kill server) to verify rollback

4. **Monitor logs:**
   - Look for transaction messages
   - Check for any "replica set" errors

## Rollback Plan

If transactions cause issues, you can quickly rollback:

1. **Revert database connection:**
   ```javascript
   // Use old connection
   const connectDB = require('./config/db');
   ```

2. **Update MONGODB_URI:**
   ```env
   # Use single instance
   MONGODB_URI=mongodb://localhost:27017/clinic_db
   ```

3. **Restart server**

The non-transaction code is still in place and will work fine.

## Production Checklist

Before enabling transactions in production:

- [ ] Replica set is running with 3+ members
- [ ] All members show as healthy in `rs.status()`
- [ ] Test transactions work (`node backend/test-transactions.js`)
- [ ] Backup your database
- [ ] Test in staging environment first
- [ ] Monitor replication lag (should be < 1 second)
- [ ] Have rollback plan ready

## Performance Considerations

Transactions have a small performance overhead:

- **Latency:** +5-20ms per transaction
- **Throughput:** Slightly reduced under heavy load
- **Resources:** More memory for oplog

For most clinic operations (not high-frequency trading), this overhead is negligible and worth the data consistency guarantee.

## Summary

- ✅ Transactions provide data consistency for critical operations
- ✅ Use `withTransaction` helper for automatic fallback
- ✅ Test thoroughly before production deployment
- ✅ Monitor replica set health
- ✅ Keep non-transaction code as fallback

For a production medical system handling sensitive patient data and financial transactions, I **strongly recommend** using transactions once your replica set is properly configured.

