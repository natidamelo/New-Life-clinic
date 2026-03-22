// Direct Billing Service Test
// Run this in the browser console to test the billing service directly

console.log('🧪 === DIRECT BILLING TEST ===');

// Test 1: Check if billing service is imported
try {
  console.log('🔍 Testing direct import...');
  
  // Try to import the billing service directly
  const billingModule = await import('./src/services/billingService');
  console.log('✅ Billing service imported:', billingModule);
  
  if (billingModule.default) {
    console.log('✅ Default export found:', typeof billingModule.default);
    
    // Test the service
    const result = await billingModule.default.getAllInvoices();
    console.log('✅ Billing service test successful:', result);
    
    if (result.data) {
      const invoices = result.data;
      const extensions = invoices.filter(inv => inv.isExtension);
      console.log(`📊 Total invoices: ${invoices.length}`);
      console.log(` Extension invoices: ${extensions.length}`);
      
      // Show first few invoices
      const preview = invoices.slice(0, 3).map(inv => ({
        id: inv._id,
        patient: inv.patientName || inv.patient?.name || 'Unknown',
        amount: inv.total,
        isExtension: inv.isExtension,
        status: inv.status
      }));
      
      console.log('📋 Sample invoices:', preview);
    }
  } else {
    console.log('❌ No default export found');
  }
  
} catch (error) {
  console.error('❌ Import failed:', error);
}

// Test 2: Check if the billing page component is working
console.log('🔍 Checking billing page component...');
console.log('Current URL:', window.location.href);
console.log('Current pathname:', window.location.pathname);

// Test 3: Check if there are any React errors
if (window.React) {
  console.log('✅ React is available');
} else {
  console.log('❌ React not found');
}

// Test 4: Check if the billing service is available in the current scope
console.log('🔍 Checking current scope...');
console.log('window.billingService:', window.billingService);
console.log('window.services:', window.services);

// Test 5: Try to access the billing service from the current page
if (window.location.pathname.includes('/billing')) {
  console.log('🔍 On billing page, checking for component state...');
  
  // Wait a moment for the page to load
  setTimeout(() => {
    console.log('🔍 Checking for invoices in DOM...');
    
    // Look for invoice elements
    const invoiceElements = document.querySelectorAll('[data-invoice-id], .invoice-row, .invoice-item');
    console.log('Invoice elements found:', invoiceElements.length);
    
    if (invoiceElements.length > 0) {
      console.log('✅ Invoices found in DOM');
      invoiceElements.forEach((el, index) => {
        if (index < 3) { // Show first 3
          console.log(`Invoice ${index + 1}:`, el.textContent?.substring(0, 100));
        }
      });
    } else {
      console.log('❌ No invoice elements found in DOM');
      
      // Check for loading states
      const loadingElements = document.querySelectorAll('.loading, .skeleton, [data-loading]');
      console.log('Loading elements found:', loadingElements.length);
      
      // Check for error states
      const errorElements = document.querySelectorAll('.error, .alert, [data-error]');
      console.log('Error elements found:', errorElements.length);
    }
  }, 2000);
} else {
  console.log('❌ Not on billing page');
}

console.log('🧪 === DIRECT BILLING TEST COMPLETE ===');
