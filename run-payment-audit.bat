@echo off
echo ========================================
echo    CLINIC PAYMENT AUDIT & RECONCILIATION
echo ========================================
echo.

echo Step 1: Running Payment Audit...
echo ---------------------------------
cd backend
node scripts/paymentAuditScript.js
echo.

echo.
echo Step 2: Running Payment Reconciliation (DRY RUN)...
echo ---------------------------------------------------
echo This will show what changes would be made without actually making them.
echo.
node scripts/paymentReconciliationScript.js --fix-overpayments --fix-duplicates --fix-balances
echo.

echo.
echo ========================================
echo    AUDIT COMPLETED
echo ========================================
echo.
echo To apply the fixes, run:
echo   node scripts/paymentReconciliationScript.js --fix-overpayments --fix-duplicates --fix-balances --live
echo.
echo To fix a specific invoice, run:
echo   node scripts/paymentReconciliationScript.js --fix-overpayments --invoice=INVOICE_ID --live
echo.
pause 