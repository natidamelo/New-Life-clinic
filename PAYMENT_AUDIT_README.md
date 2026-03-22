# Payment Audit & Reconciliation System

## Overview

This system helps identify and fix payment discrepancies in your clinic management system, including the -ETB 400.00 outstanding amount issue you're experiencing.

## The Problem

Your financial report shows **-ETB 400.00 outstanding**, which indicates overpayment. This happens when:
- Total services invoiced: ETB 400 (100 + 300)
- Total amount paid: ETB 800
- Outstanding calculation: 400 - 800 = **-400**

## Files Created

1. **`backend/scripts/paymentAuditScript.js`** - Comprehensive payment audit
2. **`backend/scripts/paymentReconciliationScript.js`** - Fix payment discrepancies
3. **`run-payment-audit.bat`** - Easy-to-use Windows batch file
4. **`PAYMENT_AUDIT_README.md`** - This documentation

## Quick Start

### Option 1: Use the Batch File (Recommended)
```bash
# Double-click or run:
run-payment-audit.bat
```

### Option 2: Run Scripts Manually
```bash
# Step 1: Run the audit
cd backend
node scripts/paymentAuditScript.js

# Step 2: Run reconciliation (dry run first)
node scripts/paymentReconciliationScript.js --fix-overpayments --fix-duplicates --fix-balances

# Step 3: Apply fixes (after reviewing dry run)
node scripts/paymentReconciliationScript.js --fix-overpayments --fix-duplicates --fix-balances --live
```

## What the Audit Script Does

The audit script will:

1. **Scan all invoices** for payment discrepancies
2. **Identify overpaid invoices** (amount paid > invoice total)
3. **Find duplicate payments** (same amount, date, invoice)
4. **Check balance discrepancies** (calculated vs stored balance)
5. **Generate detailed report** with recommendations

## What the Reconciliation Script Does

The reconciliation script can:

1. **Fix overpayments** - Cap amount paid to invoice total
2. **Remove duplicate payments** - Keep first, remove duplicates
3. **Fix balance discrepancies** - Recalculate and update balances
4. **Recalculate all totals** - Ensure accuracy

## Script Options

### Audit Script
```bash
node scripts/paymentAuditScript.js
# No options needed - runs comprehensive audit
```

### Reconciliation Script
```bash
# Dry run (safe - no changes made)
node scripts/paymentReconciliationScript.js --fix-overpayments --fix-duplicates --fix-balances

# Live run (applies changes)
node scripts/paymentReconciliationScript.js --fix-overpayments --fix-duplicates --fix-balances --live

# Fix specific invoice
node scripts/paymentReconciliationScript.js --fix-overpayments --invoice=INVOICE_ID --live

# Fix only overpayments
node scripts/paymentReconciliationScript.js --fix-overpayments --live

# Fix only duplicates
node scripts/paymentReconciliationScript.js --fix-duplicates --live

# Fix only balance discrepancies
node scripts/paymentReconciliationScript.js --fix-balances --live
```

## Understanding the Output

### Audit Report Example
```
📊 Found 150 total invoices
Total Discrepancies Found: 3
Overpaid Invoices: 2
Underpaid Invoices: 1
Duplicate Payments: 0

🔴 OVERPAID INVOICES:
=====================
Invoice: INV-2024-001
Patient: John Doe (P12345)
Invoice Total: ETB 400.00
Amount Paid: ETB 800.00
Overpayment: ETB 400.00
Status: paid
```

### Reconciliation Report Example
```
🔧 STARTING PAYMENT RECONCILIATION
====================================
Mode: DRY RUN (no changes will be made)
Fix Overpayments: true
Fix Duplicate Payments: true
Fix Balance Discrepancies: true

🔴 FIXING OVERPAYMENTS...
Processing Invoice: INV-2024-001
Patient: John Doe
Invoice Total: ETB 400.00
Amount Paid: ETB 800.00
Overpayment: ETB 400.00

📋 RECONCILIATION SUMMARY
=========================
Total Changes: 3
Mode: DRY RUN
overpayment_fix_dry_run: 2
balance_fix_dry_run: 1
```

## Safety Features

1. **Dry Run by Default** - Scripts show what would change without making changes
2. **Database Transactions** - All changes are wrapped in transactions
3. **Backup Recommendations** - Always backup your database before running live fixes
4. **Detailed Logging** - Every change is logged for audit trail

## Step-by-Step Process

### 1. Run Initial Audit
```bash
node scripts/paymentAuditScript.js
```
Review the output to understand the scope of issues.

### 2. Run Dry Run Reconciliation
```bash
node scripts/paymentReconciliationScript.js --fix-overpayments --fix-duplicates --fix-balances
```
Review what changes would be made.

### 3. Backup Your Database
```bash
# Create a backup before making changes
mongodump --db clinic-cms --out ./backup-$(date +%Y%m%d-%H%M%S)
```

### 4. Apply Fixes
```bash
node scripts/paymentReconciliationScript.js --fix-overpayments --fix-duplicates --fix-balances --live
```

### 5. Verify Results
```bash
# Run audit again to confirm fixes
node scripts/paymentAuditScript.js
```

## Expected Results

After running the reconciliation:

1. **Outstanding amount should be positive or zero** (not negative)
2. **No overpaid invoices** should remain
3. **Duplicate payments** should be removed
4. **Balance discrepancies** should be resolved

## Troubleshooting

### Common Issues

1. **Script fails to connect to database**
   - Check your MongoDB connection string
   - Ensure MongoDB is running

2. **Permission errors**
   - Run as administrator if needed
   - Check file permissions

3. **No changes made in live mode**
   - Check if you included the `--live` flag
   - Verify the options you specified

### Getting Help

If you encounter issues:

1. Check the console output for error messages
2. Verify your database connection
3. Ensure all required models exist
4. Check that you have proper permissions

## Prevention

To prevent future payment discrepancies:

1. **Implement payment validation** in your application
2. **Add duplicate payment detection** at the API level
3. **Regular audits** - run these scripts monthly
4. **Proper error handling** for payment processing
5. **Transaction logging** for all payment operations

## Files Modified

The reconciliation script may modify:
- `MedicalInvoice` collection - invoice amounts and balances
- `Payment` collection - remove duplicate payments
- Payment history arrays within invoices

## Support

For questions or issues with these scripts, check:
1. The console output for detailed error messages
2. Your database logs for any MongoDB errors
3. The audit report for specific discrepancies found

---

**Important**: Always backup your database before running live fixes! 