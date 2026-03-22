// Simple Service Test Script
// Run this in the browser console after refreshing the page

console.log('🧪 === SIMPLE SERVICE TEST ===');

// Wait a moment for services to load
setTimeout(() => {
  // Test 1: Check if services are exposed
  console.log('🔍 Testing service exposure...');
  console.log('billingService:', typeof window.billingService);
  console.log('notificationService:', typeof window.notificationService);
  console.log('prescriptionService:', typeof window.prescriptionService);
  console.log('patientService:', typeof window.patientService);
  console.log('apiService:', typeof window.apiService);

  // Test 2: Test billing service if available
  if (window.billingService) {
    console.log('✅ Billing service found, testing...');
    window.billingService.getAllInvoices()
      .then(response => {
        console.log('✅ Billing service test successful:', response);
        if (response.data) {
          const invoices = response.data;
          const extensions = invoices.filter(inv => inv.isExtension);
          console.log(`📊 Total invoices: ${invoices.length}`);
          console.log(` Extension invoices: ${extensions.length}`);
        }
      })
      .catch(error => {
        console.error('❌ Billing service test failed:', error);
      });
  } else {
    console.log('❌ Billing service not found');
  }

  // Test 3: Test direct API call
  console.log('🔍 Testing direct API call...');
  fetch('/api/billing/invoices', {
    headers: {
      'Authorization': `Bearer ${localStorage.auth_token}`,
      'Content-Type': 'application/json'
    }
  })
  .then(res => {
    console.log('🔍 Direct billing API status:', res.status);
    return res.json();
  })
  .then(data => {
    console.log('✅ Direct billing API successful:', data);
    if (data.data) {
      const invoices = data.data;
      const extensions = invoices.filter(inv => inv.isExtension);
      console.log(`📊 Direct API - Total invoices: ${invoices.length}`);
      console.log(` Direct API - Extension invoices: ${extensions.length}`);
    }
  })
  .catch(err => {
    console.error('❌ Direct billing API failed:', err);
  });

  // Test 4: Summary
  console.log('📊 === TEST SUMMARY ===');
  console.log('Services available:', {
    billingService: !!window.billingService,
    notificationService: !!window.notificationService,
    prescriptionService: !!window.prescriptionService,
    patientService: !!window.patientService,
    apiService: !!window.apiService
  });
  console.log('=== END TEST SUMMARY ===');
}, 2000);

console.log('🧪 === SERVICE TESTING STARTED ===');
