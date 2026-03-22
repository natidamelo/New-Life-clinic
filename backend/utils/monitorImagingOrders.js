const mongoose = require('mongoose');
const ServiceRequest = require('../models/ServiceRequest');
const ImagingOrder = require('../models/ImagingOrder');
const MedicalInvoice = require('../models/MedicalInvoice');
const Patient = require('../models/Patient');
const Service = require('../models/Service');

/**
 * Monitor and report on missing imaging orders
 * This script checks for paid imaging service requests that don't have corresponding imaging orders
 */
async function monitorImagingOrders() {
  try {
    console.log('🔍 Monitoring imaging orders...');
    
    // Find all paid service requests for imaging services
    const paidImagingServiceRequests = await ServiceRequest.find({
      status: { $in: ['pending', 'in-progress'] }
    })
    .populate('service')
    .populate('invoice')
    .populate('patient');
    
    // Filter for imaging services with paid invoices
    const imagingServiceRequests = paidImagingServiceRequests.filter(sr => 
      sr.service && 
      (sr.service.category === 'imaging' || 
       sr.service.category === 'ultrasound' || 
       sr.service.category === 'xray' ||
       sr.service.name.toLowerCase().includes('ultrasound') ||
       sr.service.name.toLowerCase().includes('imaging')) &&
      sr.invoice &&
      (sr.invoice.status === 'paid' || sr.invoice.status === 'partially_paid')
    );
    
    console.log(`Found ${imagingServiceRequests.length} paid imaging service requests`);
    
    // Check each one for corresponding imaging order
    const missingOrders = [];
    const existingOrders = [];
    
    for (const serviceRequest of imagingServiceRequests) {
      const existingOrder = await ImagingOrder.findOne({
        serviceRequestId: serviceRequest._id
      });
      
      if (existingOrder) {
        existingOrders.push({
          serviceRequestId: serviceRequest._id,
          imagingOrderId: existingOrder._id,
          patientName: `${serviceRequest.patient.firstName} ${serviceRequest.patient.lastName}`,
          serviceName: serviceRequest.service.name,
          status: existingOrder.status
        });
      } else {
        missingOrders.push({
          serviceRequestId: serviceRequest._id,
          patientName: `${serviceRequest.patient.firstName} ${serviceRequest.patient.lastName}`,
          serviceName: serviceRequest.service.name,
          invoiceStatus: serviceRequest.invoice.status,
          requestDate: serviceRequest.requestDate || serviceRequest.createdAt
        });
      }
    }
    
    // Report results
    console.log(`\n📊 Imaging Orders Monitoring Report:`);
    console.log(`   ✅ Service requests with imaging orders: ${existingOrders.length}`);
    console.log(`   ❌ Service requests missing imaging orders: ${missingOrders.length}`);
    
    if (missingOrders.length > 0) {
      console.log(`\n⚠️ Missing Imaging Orders:`);
      missingOrders.forEach((missing, index) => {
        console.log(`   ${index + 1}. ${missing.patientName} - ${missing.serviceName}`);
        console.log(`      Service Request ID: ${missing.serviceRequestId}`);
        console.log(`      Invoice Status: ${missing.invoiceStatus}`);
        console.log(`      Request Date: ${missing.requestDate}`);
        console.log('');
      });
      
      console.log(`\n🔧 To fix missing orders, run:`);
      console.log(`   node utils/fixMissingImagingOrder.js --all`);
      console.log(`\n   Or fix individual orders:`);
      missingOrders.forEach((missing, index) => {
        console.log(`   node utils/fixMissingImagingOrder.js ${missing.serviceRequestId}`);
      });
    }
    
    if (existingOrders.length > 0) {
      console.log(`\n✅ Existing Imaging Orders:`);
      existingOrders.slice(0, 5).forEach((existing, index) => {
        console.log(`   ${index + 1}. ${existing.patientName} - ${existing.serviceName} (${existing.status})`);
      });
      if (existingOrders.length > 5) {
        console.log(`   ... and ${existingOrders.length - 5} more`);
      }
    }
    
    return {
      total: imagingServiceRequests.length,
      existing: existingOrders.length,
      missing: missingOrders.length,
      missingOrders,
      existingOrders
    };
    
  } catch (error) {
    console.error('❌ Error monitoring imaging orders:', error);
    throw error;
  }
}

/**
 * Check if a specific service request has an imaging order
 */
async function checkServiceRequestImagingOrder(serviceRequestId) {
  try {
    const serviceRequest = await ServiceRequest.findById(serviceRequestId)
      .populate('service')
      .populate('invoice')
      .populate('patient');
    
    if (!serviceRequest) {
      return { found: false, error: 'Service request not found' };
    }
    
    const imagingOrder = await ImagingOrder.findOne({
      serviceRequestId: serviceRequest._id
    });
    
    return {
      found: true,
      serviceRequest: {
        id: serviceRequest._id,
        serviceName: serviceRequest.service?.name,
        serviceCategory: serviceRequest.service?.category,
        patientName: `${serviceRequest.patient?.firstName} ${serviceRequest.patient?.lastName}`,
        status: serviceRequest.status,
        invoiceStatus: serviceRequest.invoice?.status
      },
      imagingOrder: imagingOrder ? {
        id: imagingOrder._id,
        imagingType: imagingOrder.imagingType,
        bodyPart: imagingOrder.bodyPart,
        status: imagingOrder.status,
        orderDateTime: imagingOrder.orderDateTime
      } : null,
      hasImagingOrder: !!imagingOrder
    };
    
  } catch (error) {
    return { found: false, error: error.message };
  }
}

// Export functions
module.exports = { monitorImagingOrders, checkServiceRequestImagingOrder };

// Run directly if this file is executed
if (require.main === module) {
  // Connect to MongoDB if not already connected
  if (mongoose.connection.readyState === 0) {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms';
    mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  }
  
  // Check command line arguments
  const args = process.argv.slice(2);
  const serviceRequestId = args[0];
  
  if (serviceRequestId && serviceRequestId !== '--monitor') {
    // Check specific service request
    checkServiceRequestImagingOrder(serviceRequestId)
      .then((result) => {
        console.log('🔍 Service Request Check Result:');
        console.log(JSON.stringify(result, null, 2));
        process.exit(0);
      })
      .catch((error) => {
        console.error('💥 Check failed:', error);
        process.exit(1);
      });
  } else {
    // Run monitoring
    monitorImagingOrders()
      .then((result) => {
        console.log('\n🎉 Monitoring completed!');
        process.exit(result.missing > 0 ? 1 : 0);
      })
      .catch((error) => {
        console.error('💥 Monitoring failed:', error);
        process.exit(1);
      });
  }
}
