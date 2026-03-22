// Comprehensive investigation script for Gedion's medication invoice issue
console.log('🔍 Investigating Gedion Temotios medication invoice issue...');

async function investigateGedionMedicationInvoice() {
  try {
    console.log('\n=== STEP 1: Find Gedion Patient ===');
    
    // Get patient data
    const response = await fetch('/api/patients/quick-load');
    if (!response.ok) {
      throw new Error(`Failed to fetch patients: ${response.status}`);
    }
    
    const data = await response.json();
    const patients = data.patients || [];
    
    // Find Gedion
    const gedionPatient = patients.find(p => 
      p.firstName?.toLowerCase().includes('gedion') || 
      p.lastName?.toLowerCase().includes('temotiyos')
    );
    
    if (!gedionPatient) {
      console.log('❌ Could not find Gedion Temotios');
      return;
    }
    
    console.log('👤 Found Gedion:', {
      name: `${gedionPatient.firstName} ${gedionPatient.lastName}`,
      id: gedionPatient._id || gedionPatient.id,
      patientId: gedionPatient.patientId,
      status: gedionPatient.status
    });

    console.log('\n=== STEP 2: Check Prescriptions ===');
    
    // Check for prescriptions
    try {
      const prescriptionResponse = await fetch(`/api/prescriptions/patient/${gedionPatient._id || gedionPatient.id}`);
      if (prescriptionResponse.ok) {
        const prescriptionData = await prescriptionResponse.json();
        console.log(`📋 Found ${prescriptionData.length || 0} prescriptions for Gedion`);
        
        if (prescriptionData.length > 0) {
          prescriptionData.forEach((prescription, index) => {
            console.log(`\nPrescription ${index + 1}:`, {
              id: prescription._id,
              medicationName: prescription.medicationName,
              status: prescription.status,
              paymentStatus: prescription.paymentStatus,
              totalCost: prescription.totalCost,
              createdAt: prescription.createdAt,
              medications: prescription.medications?.length || 0
            });
            
            // Check if prescription has medications array
            if (prescription.medications && prescription.medications.length > 0) {
              prescription.medications.forEach((med, medIndex) => {
                console.log(`  Medication ${medIndex + 1}:`, {
                  name: med.name,
                  dosage: med.dosage,
                  frequency: med.frequency,
                  duration: med.duration,
                  totalPrice: med.totalPrice
                });
              });
            }
          });
        }
      } else {
        console.log('❌ Could not fetch prescriptions');
      }
    } catch (error) {
      console.log('❌ Error fetching prescriptions:', error.message);
    }

    console.log('\n=== STEP 3: Check Invoices ===');
    
    // Check for invoices
    try {
      const invoiceResponse = await fetch(`/api/billing/invoices?patientId=${gedionPatient._id || gedionPatient.id}`);
      if (invoiceResponse.ok) {
        const invoiceData = await invoiceResponse.json();
        console.log(`💰 Found ${invoiceData.length || 0} invoices for Gedion`);
        
        if (invoiceData.length > 0) {
          invoiceData.forEach((invoice, index) => {
            console.log(`\nInvoice ${index + 1}:`, {
              id: invoice._id,
              invoiceNumber: invoice.invoiceNumber,
              status: invoice.status,
              total: invoice.total,
              balance: invoice.balance,
              amountPaid: invoice.amountPaid,
              items: invoice.items?.length || 0,
              createdAt: invoice.createdAt
            });
            
            // Check invoice items
            if (invoice.items && invoice.items.length > 0) {
              invoice.items.forEach((item, itemIndex) => {
                console.log(`  Item ${itemIndex + 1}:`, {
                  description: item.description,
                  itemType: item.itemType,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  total: item.total
                });
              });
            }
          });
        }
      } else {
        console.log('❌ Could not fetch invoices');
      }
    } catch (error) {
      console.log('❌ Error fetching invoices:', error.message);
    }

    console.log('\n=== STEP 4: Check Payment Notifications ===');
    
    // Check payment notifications
    try {
      const notificationResponse = await fetch('/api/notifications?type=medication_payment_required,lab_payment_required,service_payment_required,card_payment_required');
      if (notificationResponse.ok) {
        const notificationData = await notificationResponse.json();
        const gedionNotifications = notificationData.data?.filter(n => 
          n.data?.patientName?.toLowerCase().includes('gedion') ||
          n.data?.patientId === gedionPatient._id ||
          n.data?.patientId === gedionPatient.id
        ) || [];
        
        console.log(`🔔 Found ${gedionNotifications.length} payment notifications for Gedion`);
        gedionNotifications.forEach((notification, index) => {
          console.log(`\nNotification ${index + 1}:`, {
            type: notification.type,
            message: notification.message,
            patientName: notification.data?.patientName,
            patientId: notification.data?.patientId,
            totalAmount: notification.data?.totalAmount,
            prescriptionId: notification.data?.prescriptionId,
            invoiceId: notification.data?.invoiceId,
            createdAt: notification.createdAt
          });
        });
      }
    } catch (error) {
      console.log('❌ Error fetching notifications:', error.message);
    }

    console.log('\n=== STEP 5: Check Medical Records ===');
    
    // Check medical records
    try {
      const medicalRecordResponse = await fetch(`/api/medical-records/patient/${gedionPatient._id || gedionPatient.id}`);
      if (medicalRecordResponse.ok) {
        const medicalRecordData = await medicalRecordResponse.json();
        console.log(`📋 Found ${medicalRecordData.length || 0} medical records for Gedion`);
        
        if (medicalRecordData.length > 0) {
          medicalRecordData.forEach((record, index) => {
            console.log(`\nMedical Record ${index + 1}:`, {
              id: record._id,
              visit: record.visit,
              primaryProvider: record.primaryProvider,
              medicationsAdministered: record.medicationsAdministered?.length || 0,
              servicesProvided: record.servicesProvided?.length || 0,
              labResults: record.labResults?.length || 0,
              invoice: record.invoice,
              createdAt: record.createdAt
            });
          });
        }
      } else {
        console.log('❌ Could not fetch medical records');
      }
    } catch (error) {
      console.log('❌ Error fetching medical records:', error.message);
    }

    console.log('\n=== STEP 6: Check Billable Items ===');
    
    // Check if medications exist in billable items
    try {
      const billableResponse = await fetch('/api/billable-items?category=medication');
      if (billableResponse.ok) {
        const billableData = await billableResponse.json();
        console.log(`💊 Found ${billableData.length || 0} billable medication items`);
        
        // Check if any of Gedion's prescribed medications are in billable items
        if (billableData.length > 0) {
          const medicationNames = billableData.map(item => item.name.toLowerCase());
          console.log('Available medication names:', medicationNames);
        }
      } else {
        console.log('❌ Could not fetch billable items');
      }
    } catch (error) {
      console.log('❌ Error fetching billable items:', error.message);
    }

    console.log('\n=== STEP 7: Check Inventory Items ===');
    
    // Check inventory items for medications
    try {
      const inventoryResponse = await fetch('/api/inventory/items?category=medication');
      if (inventoryResponse.ok) {
        const inventoryData = await inventoryResponse.json();
        console.log(`📦 Found ${inventoryData.length || 0} inventory medication items`);
        
        if (inventoryData.length > 0) {
          inventoryData.slice(0, 5).forEach((item, index) => {
            console.log(`  Item ${index + 1}:`, {
              name: item.name,
              category: item.category,
              unitPrice: item.unitPrice,
              sellingPrice: item.sellingPrice
            });
          });
        }
      } else {
        console.log('❌ Could not fetch inventory items');
      }
    } catch (error) {
      console.log('❌ Error fetching inventory items:', error.message);
    }

    console.log('\n=== ANALYSIS SUMMARY ===');
    console.log('Based on the investigation above, here are the possible issues:');
    console.log('1. Prescription created but invoice not generated');
    console.log('2. Prescription created but not linked to billing system');
    console.log('3. Medication not found in billable items/inventory');
    console.log('4. Invoice created but not visible in billing interface');
    console.log('5. Payment notification created but invoice missing');

  } catch (error) {
    console.error('❌ Error during investigation:', error);
  }
}

// Run the investigation
console.log('🚀 Starting comprehensive investigation...\n');
investigateGedionMedicationInvoice();
