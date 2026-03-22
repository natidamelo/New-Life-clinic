// Test Services Script
// Run this in the browser console to test all services

console.log('🧪 === TESTING ALL SERVICES ===');

// Test 1: Check if services are exposed
console.log('🔍 Testing service exposure...');
console.log('billingService:', typeof window.billingService);
console.log('notificationService:', typeof window.notificationService);
console.log('prescriptionService:', typeof window.prescriptionService);
console.log('patientService:', typeof window.patientService);
console.log('apiService:', typeof window.apiService);

// Test 2: Test billing service
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
        
        // Show extension invoice details
        extensions.forEach((inv, index) => {
          console.log(`🔧 Extension ${index + 1}:`, {
            patient: inv.patientName || inv.patient?.name,
            amount: inv.total,
            date: inv.issueDate || inv.dateIssued,
            status: inv.status
          });
        });
      }
    })
    .catch(error => {
      console.error('❌ Billing service test failed:', error);
    });
} else {
  console.log('❌ Billing service not found');
}

// Test 3: Test notification service
if (window.notificationService) {
  console.log('✅ Notification service found, testing...');
  window.notificationService.getNotifications()
    .then(response => {
      console.log('✅ Notification service test successful:', response);
      if (response.data) {
        const extensions = response.data.filter(n => n.type === 'medication_payment_required');
        console.log(`🔧 Extension notifications: ${extensions.length}`);
      }
    })
    .catch(error => {
      console.error('❌ Notification service test failed:', error);
    });
} else {
  console.log('❌ Notification service not found');
}

// Test 4: Test direct API calls
console.log('🔍 Testing direct API calls...');
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

// Test 5: Test admin routes
console.log('🔍 Testing admin routes...');
const userData = JSON.parse(localStorage.user_data || '{}');
if (userData.role === 'admin') {
  console.log('✅ User is admin, testing admin routes...');
  
  // Test extension check route
  fetch('/api/prescriptions/check-extension-notifications', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${localStorage.auth_token}`,
      'Content-Type': 'application/json'
    }
  })
  .then(res => {
    console.log('🔍 Extension check route status:', res.status);
    return res.json();
  })
  .then(data => {
    console.log('✅ Extension check route successful:', data);
  })
  .catch(err => {
    console.error('❌ Extension check route failed:', err);
  });
  
  // Test create missing invoices route
  fetch('/api/prescriptions/create-missing-extension-invoices', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${localStorage.auth_token}`,
      'Content-Type': 'application/json'
    }
  })
  .then(res => {
    console.log('🔍 Create invoices route status:', res.status);
    return res.json();
  })
  .then(data => {
    console.log('✅ Create invoices route successful:', data);
  })
  .catch(err => {
    console.error('❌ Create invoices route failed:', err);
  });
} else {
  console.log('❌ User is not admin, cannot test admin routes');
}

// Test 6: Summary
setTimeout(() => {
  console.log('📊 === TEST SUMMARY ===');
  console.log('Services available:', {
    billingService: !!window.billingService,
    notificationService: !!window.notificationService,
    prescriptionService: !!window.prescriptionService,
    patientService: !!window.patientService,
    apiService: !!window.apiService
  });
  console.log('User role:', userData.role);
  console.log('Auth token exists:', !!localStorage.auth_token);
  console.log('=== END TEST SUMMARY ===');
}, 3000);

console.log('🧪 === SERVICE TESTING COMPLETE ===');
