// Quick fix for 500 errors and server issues
const mongoose = require('mongoose');

async function quickFix() {
  try {
    console.log('🔧 Quick fix for 500 errors...');
    
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms');
    console.log('✅ Database connected');
    
    // Check if MedicalInvoice model exists and works
    try {
      const MedicalInvoice = require('./models/MedicalInvoice');
      console.log('✅ MedicalInvoice model loaded');
      
      // Test basic query
      const count = await MedicalInvoice.countDocuments();
      console.log(`✅ MedicalInvoice query successful: ${count} invoices found`);
      
    } catch (modelError) {
      console.error('❌ MedicalInvoice model error:', modelError.message);
    }
    
    // Check if Prescription model exists and works
    try {
      const Prescription = require('./models/Prescription');
      console.log('✅ Prescription model loaded');
      
      // Test basic query
      const count = await Prescription.countDocuments();
      console.log(`✅ Prescription query successful: ${count} prescriptions found`);
      
    } catch (modelError) {
      console.error('❌ Prescription model error:', modelError.message);
    }
    
    // Check for Gedion and create missing invoices
    console.log('\n🔍 Checking for Gedion...');
    const Patient = require('./models/Patient');
    
    const gedion = await Patient.findOne({
      $or: [
        { firstName: { $regex: /gedion/i } },
        { lastName: { $regex: /gedion/i } }
      ]
    });
    
    if (gedion) {
      console.log(`✅ Found Gedion: ${gedion.firstName} ${gedion.lastName}`);
      
      // Check prescriptions
      const prescriptions = await Prescription.find({ 
        $or: [
          { patient: gedion._id },
          { patientId: gedion._id }
        ]
      });
      
      console.log(`📋 Found ${prescriptions.length} prescriptions for Gedion`);
      
      // Check which ones need invoices
      const prescriptionsNeedingInvoices = prescriptions.filter(p => !p.invoiceId);
      console.log(`💡 ${prescriptionsNeedingInvoices.length} prescriptions need invoices`);
      
      if (prescriptionsNeedingInvoices.length > 0) {
        console.log('\n🔧 Creating missing invoices...');
        
        for (const prescription of prescriptionsNeedingInvoices) {
          try {
            const MedicalInvoice = require('./models/MedicalInvoice');
            
            const invoiceData = {
              patient: gedion._id,
              patientId: gedion.patientId || gedion._id.toString(),
              patientName: `${gedion.firstName} ${gedion.lastName}`,
              items: [{
                itemType: 'medication',
                category: 'medication',
                serviceName: prescription.medicationName,
                description: `Medication: ${prescription.medicationName}`,
                quantity: 1,
                unitPrice: prescription.totalCost || 100,
                totalPrice: prescription.totalCost || 100,
                total: prescription.totalCost || 100
              }],
              subtotal: prescription.totalCost || 100,
              total: prescription.totalCost || 100,
              balance: prescription.totalCost || 100,
              status: 'pending',
              dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              notes: `Quick fix invoice for prescription: ${prescription.medicationName}`,
              createdBy: prescription.doctor || gedion._id
            };
            
            const invoice = new MedicalInvoice(invoiceData);
            await invoice.save();
            
            // Update prescription
            prescription.invoiceId = invoice._id;
            prescription.invoiceNumber = invoice.invoiceNumber;
            await prescription.save();
            
            console.log(`✅ Created invoice ${invoice.invoiceNumber} for ${prescription.medicationName}`);
            
          } catch (error) {
            console.error(`❌ Failed to create invoice for ${prescription.medicationName}:`, error.message);
          }
        }
      }
      
    } else {
      console.log('❌ Gedion not found');
    }
    
    console.log('\n🎉 Quick fix completed!');
    
  } catch (error) {
    console.error('❌ Quick fix failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from database');
  }
}

// Run the fix
quickFix();
