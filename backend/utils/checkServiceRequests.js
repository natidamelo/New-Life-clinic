const mongoose = require('mongoose');
const ServiceRequest = require('../models/ServiceRequest');
const MedicalInvoice = require('../models/MedicalInvoice');
const ImagingOrder = require('../models/ImagingOrder');
const Service = require('../models/Service');
const Patient = require('../models/Patient');

/**
 * Check the current state of service requests and invoices to debug the issue
 */
async function checkServiceRequests() {
  try {
    console.log('🔍 Checking all service requests and invoices...');
    
    // Connect to MongoDB if not already connected
    if (mongoose.connection.readyState === 0) {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms';
      await mongoose.connect(mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log('📡 Connected to MongoDB');
    }
    
    // Check all service requests
    console.log('\n📋 All Service Requests:');
    const allServiceRequests = await ServiceRequest.find({})
      .populate('service')
      .populate('invoice')
      .populate('patient')
      .sort({ createdAt: -1 })
      .limit(10);
    
    for (const sr of allServiceRequests) {
      console.log(`\n🔸 Service Request ID: ${sr._id}`);
      console.log(`   📅 Created: ${sr.createdAt}`);
      console.log(`   👤 Patient: ${sr.patient ? `${sr.patient.firstName} ${sr.patient.lastName}` : 'N/A'}`);
      console.log(`   🏥 Service: ${sr.service ? sr.service.name : 'N/A'}`);
      console.log(`   📂 Category: ${sr.service ? sr.service.category : 'N/A'}`);
      console.log(`   📊 Status: ${sr.status}`);
      console.log(`   💰 Invoice: ${sr.invoice ? sr.invoice.invoiceNumber : 'No Invoice'}`);
      console.log(`   💳 Invoice Status: ${sr.invoice ? sr.invoice.status : 'N/A'}`);
      console.log(`   💵 Invoice Total: ${sr.invoice ? `ETB ${sr.invoice.total}` : 'N/A'}`);
      console.log(`   💸 Amount Paid: ${sr.invoice ? `ETB ${sr.invoice.amountPaid}` : 'N/A'}`);
    }
    
    // Check recent invoices for abdominal ultrasound
    console.log('\n\n💰 Recent Invoices (last 10):');
    const recentInvoices = await MedicalInvoice.find({})
      .populate('patient')
      .sort({ createdAt: -1 })
      .limit(10);
    
    for (const invoice of recentInvoices) {
      console.log(`\n💳 Invoice: ${invoice.invoiceNumber}`);
      console.log(`   📅 Created: ${invoice.createdAt}`);
      console.log(`   👤 Patient: ${invoice.patient ? `${invoice.patient.firstName} ${invoice.patient.lastName}` : invoice.patientName || 'N/A'}`);
      console.log(`   📊 Status: ${invoice.status}`);
      console.log(`   💵 Total: ETB ${invoice.total}`);
      console.log(`   💸 Paid: ETB ${invoice.amountPaid}`);
      console.log(`   📦 Items: ${invoice.items ? invoice.items.length : 0} items`);
      
      if (invoice.items && invoice.items.length > 0) {
        for (const item of invoice.items) {
          console.log(`      - ${item.description}: ETB ${item.total}`);
        }
      }
    }
    
    // Check existing imaging orders
    console.log('\n\n📸 Existing Imaging Orders:');
    const imagingOrders = await ImagingOrder.find({})
      .populate('patientId')
      .populate('orderingDoctorId')
      .sort({ createdAt: -1 })
      .limit(5);
    
    console.log(`Found ${imagingOrders.length} imaging orders:`);
    for (const order of imagingOrders) {
      console.log(`\n🔸 Imaging Order ID: ${order._id}`);
      console.log(`   📅 Created: ${order.createdAt}`);
      console.log(`   👤 Patient: ${order.patientId ? `${order.patientId.firstName} ${order.patientId.lastName}` : 'N/A'}`);
      console.log(`   🏥 Type: ${order.imagingType}`);
      console.log(`   🎯 Body Part: ${order.bodyPart}`);
      console.log(`   📊 Status: ${order.status}`);
      console.log(`   🔗 Service Request: ${order.serviceRequestId || 'None'}`);
    }
    
    // Check for abdominal ultrasound specifically
    console.log('\n\n🔍 Searching for Abdominal Ultrasound related data:');
    
    // Search invoices with "abdominal" in description
    const abdominalInvoices = await MedicalInvoice.find({
      'items.description': { $regex: /abdomin/i }
    }).populate('patient');
    
    console.log(`\nFound ${abdominalInvoices.length} invoices with "abdominal" in description:`);
    for (const invoice of abdominalInvoices) {
      console.log(`\n💳 Abdominal Invoice: ${invoice.invoiceNumber}`);
      console.log(`   📅 Created: ${invoice.createdAt}`);
      console.log(`   👤 Patient: ${invoice.patient ? `${invoice.patient.firstName} ${invoice.patient.lastName}` : invoice.patientName || 'N/A'}`);
      console.log(`   📊 Status: ${invoice.status}`);
      console.log(`   💵 Total: ETB ${invoice.total}`);
      console.log(`   💸 Paid: ETB ${invoice.amountPaid}`);
      
      // Check if there's a corresponding service request
      const correspondingServiceRequest = await ServiceRequest.findOne({
        invoice: invoice._id
      }).populate('service');
      
      if (correspondingServiceRequest) {
        console.log(`   🔗 Service Request: ${correspondingServiceRequest._id}`);
        console.log(`   🏥 Service: ${correspondingServiceRequest.service ? correspondingServiceRequest.service.name : 'N/A'}`);
        console.log(`   📂 Category: ${correspondingServiceRequest.service ? correspondingServiceRequest.service.category : 'N/A'}`);
        console.log(`   📊 SR Status: ${correspondingServiceRequest.status}`);
        
        // Check if there's already an imaging order
        const existingImagingOrder = await ImagingOrder.findOne({
          serviceRequestId: correspondingServiceRequest._id
        });
        
        if (existingImagingOrder) {
          console.log(`   📸 Imaging Order: EXISTS (${existingImagingOrder._id})`);
        } else {
          console.log(`   📸 Imaging Order: MISSING - Should be created!`);
        }
      } else {
        console.log(`   🔗 Service Request: NOT FOUND`);
      }
    }
    
    return {
      serviceRequests: allServiceRequests.length,
      invoices: recentInvoices.length,
      imagingOrders: imagingOrders.length,
      abdominalInvoices: abdominalInvoices.length
    };
    
  } catch (error) {
    console.error('❌ Error checking service requests:', error);
    throw error;
  }
}

// Export for use in other scripts
module.exports = { checkServiceRequests };

// Run directly if this file is executed
if (require.main === module) {
  checkServiceRequests()
    .then((result) => {
      console.log('\n🎉 Check completed successfully!', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Check failed:', error);
      process.exit(1);
    });
}
