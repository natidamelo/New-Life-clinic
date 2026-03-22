const { MongoClient } = require('mongodb');

async function createLaloDexamethasoneInvoice() {
  const client = new MongoClient('mongodb://127.0.0.1:27017/clinic-cms');
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('clinic-cms');
    
    // Find Lalo's dexamethasone notification
    const notification = await db.collection('notifications').findOne({
      type: 'medication_payment_required',
      'data.patientName': 'lalo natan',
      'data.medications': {
        $elemMatch: {
          $or: [
            { name: { $regex: /dexamethasone/i } },
            { medication: { $regex: /dexamethasone/i } }
          ]
        }
      }
    });
    
    if (!notification) {
      console.log('❌ Lalo\'s dexamethasone notification not found');
      return;
    }
    
    console.log('✅ Found Lalo\'s dexamethasone notification:', notification._id);
    console.log('Patient:', notification.data.patientName);
    console.log('Total Amount:', notification.data.totalAmount);
    
    // Check if invoice already exists
    const existingInvoice = await db.collection('medicalinvoices').findOne({
      'patientName': 'lalo natan',
      'items.description': { $regex: /dexamethasone/i }
    });
    
    if (existingInvoice) {
      console.log('✅ Invoice already exists:', existingInvoice._id);
      console.log('Invoice Number:', existingInvoice.invoiceNumber);
      console.log('Status:', existingInvoice.status);
      return;
    }
    
    // Find the patient
    const patient = await db.collection('patients').findOne({
      $or: [
        { firstName: { $regex: /lalo/i } },
        { lastName: { $regex: /lalo/i } }
      ]
    });
    
    if (!patient) {
      console.log('❌ Patient not found');
      return;
    }
    
    console.log('✅ Found patient:', patient._id);
    
    // Create the invoice
    const invoiceNumber = `MED-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    
    const invoice = {
      invoiceNumber: invoiceNumber,
      patient: patient._id,
      patientId: patient.patientId || patient._id.toString(),
      patientName: `${patient.firstName} ${patient.lastName}`,
      dateIssued: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      status: 'pending',
      items: [{
        itemType: 'medication',
        category: 'medication',
        serviceName: 'Dexamethasone',
        description: 'Medication: Dexamethasone',
        quantity: 1,
        unitPrice: 3000,
        totalPrice: 3000,
        total: 3000,
        metadata: {
          medicationName: 'Dexamethasone',
          frequency: 'Twice daily (BID)',
          duration: '5 days',
          notificationId: notification._id
        }
      }],
      subtotal: 3000,
      taxTotal: 0,
      discountTotal: 0,
      total: 3000,
      amountPaid: 0,
      balance: 3000,
      type: 'medication',
      notes: 'Dexamethasone prescription - 5 days, twice daily',
      createdBy: notification.createdBy || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Insert the invoice
    const result = await db.collection('medicalinvoices').insertOne(invoice);
    
    console.log('✅ Created invoice:', result.insertedId);
    console.log('Invoice Number:', invoiceNumber);
    console.log('Total Amount:', invoice.total);
    console.log('Status:', invoice.status);
    
    // Update the notification to link it to the invoice
    await db.collection('notifications').updateOne(
      { _id: notification._id },
      { 
        $set: { 
          'data.invoiceId': result.insertedId,
          'data.invoiceNumber': invoiceNumber
        }
      }
    );
    
    console.log('✅ Updated notification with invoice reference');
    
    // Also check if we need to create a prescription record
    const prescription = await db.collection('prescriptions').findOne({
      patient: patient._id,
      medicationName: { $regex: /dexamethasone/i }
    });
    
    if (prescription) {
      console.log('✅ Found existing prescription:', prescription._id);
      
      // Update prescription with invoice reference
      await db.collection('prescriptions').updateOne(
        { _id: prescription._id },
        { 
          $set: { 
            invoiceId: result.insertedId,
            status: 'Active'
          }
        }
      );
      
      console.log('✅ Updated prescription with invoice reference');
    } else {
      console.log('⚠️ No prescription record found - creating one');
      
      // Create prescription record
      const prescriptionData = {
        patient: patient._id,
        patientId: patient.patientId || patient._id.toString(),
        medicationName: 'Dexamethasone',
        dosage: 'Standard',
        frequency: 'Twice daily (BID)',
        duration: '5 days',
        status: 'Active',
        paymentStatus: 'pending',
        totalCost: 3000,
        datePrescribed: new Date(),
        invoiceId: result.insertedId,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const prescriptionResult = await db.collection('prescriptions').insertOne(prescriptionData);
      console.log('✅ Created prescription record:', prescriptionResult.insertedId);
    }
    
    console.log('\n🎉 Successfully created invoice for Lalo\'s dexamethasone prescription!');
    console.log('📋 Invoice ID:', result.insertedId);
    console.log('📋 Invoice Number:', invoiceNumber);
    console.log('💰 Amount:', invoice.total);
    console.log('📱 Now check your billing interface at http://localhost:5175/app/billing/invoices');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

createLaloDexamethasoneInvoice();
