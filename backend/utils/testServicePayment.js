const mongoose = require('mongoose');
const ServiceRequest = require('../models/ServiceRequest');
const MedicalInvoice = require('../models/MedicalInvoice');
const ImagingOrder = require('../models/ImagingOrder');
const Service = require('../models/Service');
const Patient = require('../models/Patient');

/**
 * Test the service payment flow to ensure it's working correctly
 */
async function testServicePayment() {
  try {
    console.log('🔍 Testing service payment flow...');
    
    // Connect to MongoDB if not already connected
    if (mongoose.connection.readyState === 0) {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms';
      await mongoose.connect(mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log('📡 Connected to MongoDB');
    }
    
    // Find the specific service request you mentioned
    const serviceRequestId = '68d40ad1dbd09a245ea982f8';
    const serviceRequest = await ServiceRequest.findById(serviceRequestId)
      .populate('service')
      .populate('invoice')
      .populate('patient');
    
    if (!serviceRequest) {
      console.log('❌ Service request not found:', serviceRequestId);
      return;
    }
    
    console.log('\n📋 Service Request Details:');
    console.log(`   ID: ${serviceRequest._id}`);
    console.log(`   Patient: ${serviceRequest.patient ? `${serviceRequest.patient.firstName} ${serviceRequest.patient.lastName}` : 'N/A'}`);
    console.log(`   Service: ${serviceRequest.service ? serviceRequest.service.name : 'N/A'}`);
    console.log(`   Category: ${serviceRequest.service ? serviceRequest.service.category : 'N/A'}`);
    console.log(`   Status: ${serviceRequest.status}`);
    console.log(`   Invoice ID: ${serviceRequest.invoice ? serviceRequest.invoice._id : 'N/A'}`);
    console.log(`   Invoice Status: ${serviceRequest.invoice ? serviceRequest.invoice.status : 'N/A'}`);
    
    if (serviceRequest.invoice) {
      console.log('\n💰 Invoice Details:');
      console.log(`   Invoice Number: ${serviceRequest.invoice.invoiceNumber}`);
      console.log(`   Total: ETB ${serviceRequest.invoice.total}`);
      console.log(`   Amount Paid: ETB ${serviceRequest.invoice.amountPaid}`);
      console.log(`   Balance: ETB ${serviceRequest.invoice.balance}`);
      console.log(`   Status: ${serviceRequest.invoice.status}`);
      
      if (serviceRequest.invoice.items && serviceRequest.invoice.items.length > 0) {
        console.log('\n📦 Invoice Items:');
        for (const item of serviceRequest.invoice.items) {
          console.log(`   - ${item.description}: ETB ${item.total} (Type: ${item.itemType}, Category: ${item.category || 'N/A'})`);
        }
      }
    }
    
    // Check if there's already an imaging order
    const existingImagingOrder = await ImagingOrder.findOne({
      serviceRequestId: serviceRequest._id
    });
    
    console.log('\n📸 Imaging Order Status:');
    if (existingImagingOrder) {
      console.log(`   ✅ Imaging order exists: ${existingImagingOrder._id}`);
      console.log(`   Type: ${existingImagingOrder.imagingType}`);
      console.log(`   Body Part: ${existingImagingOrder.bodyPart}`);
      console.log(`   Status: ${existingImagingOrder.status}`);
    } else {
      console.log(`   ❌ No imaging order found for this service request`);
    }
    
    // Simulate what should happen when payment is made
    console.log('\n🔧 Simulating Service Payment Process:');
    
    if (serviceRequest.invoice && serviceRequest.invoice.status === 'paid') {
      console.log('   💳 Invoice is already paid');
      
      if (serviceRequest.status === 'pending') {
        console.log('   ⚠️ ISSUE: Service request is still pending despite payment!');
        console.log('   🔧 This should be updated to "in-progress" when payment is processed');
        
        // Test if we can update it manually
        console.log('   🧪 Testing manual status update...');
        serviceRequest.status = 'in-progress';
        serviceRequest.updatedAt = new Date();
        await serviceRequest.save();
        console.log('   ✅ Status updated to in-progress');
        
        if (!existingImagingOrder) {
          console.log('   🧪 Testing imaging order creation...');
          
          // Determine imaging type and body part from service name
          const serviceName = serviceRequest.service.name.toLowerCase();
          let imagingType = 'Ultrasound';
          let bodyPart = 'Abdomen';
          
          if (serviceName.includes('abdomin') || serviceName.includes('abdomen')) {
            bodyPart = 'Abdomen';
          } else if (serviceName.includes('pelvis') || serviceName.includes('pelvic')) {
            bodyPart = 'Pelvis';
          }
          
          // Find a doctor to assign as ordering doctor
          const User = require('../models/User');
          let orderingDoctorId = serviceRequest.patient.assignedDoctorId;
          if (!orderingDoctorId) {
            const availableDoctor = await User.findOne({ role: 'doctor' });
            if (availableDoctor) {
              orderingDoctorId = availableDoctor._id;
            }
          }
          
          const imagingOrder = new ImagingOrder({
            patientId: serviceRequest.patient._id,
            orderingDoctorId: orderingDoctorId,
            imagingType: imagingType,
            bodyPart: bodyPart,
            clinicalInfo: `${serviceRequest.service.name} - Manual test creation`,
            priority: 'Routine',
            status: 'Ordered',
            orderDateTime: new Date(),
            serviceRequestId: serviceRequest._id,
            notes: `Test creation for service request: ${serviceRequest.service.name}`
          });
          
          await imagingOrder.save();
          console.log(`   ✅ Test imaging order created: ${imagingOrder._id}`);
        }
      } else {
        console.log('   ✅ Service request status is correct:', serviceRequest.status);
      }
    } else {
      console.log('   💸 Invoice is not paid yet');
      console.log('   ℹ️ Payment needs to be processed first');
    }
    
    return {
      serviceRequest: serviceRequest._id,
      status: serviceRequest.status,
      invoiceStatus: serviceRequest.invoice ? serviceRequest.invoice.status : 'N/A',
      hasImagingOrder: !!existingImagingOrder
    };
    
  } catch (error) {
    console.error('❌ Error testing service payment:', error);
    throw error;
  }
}

// Export for use in other scripts
module.exports = { testServicePayment };

// Run directly if this file is executed
if (require.main === module) {
  testServicePayment()
    .then((result) => {
      console.log('\n🎉 Test completed successfully!', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Test failed:', error);
      process.exit(1);
    });
}
