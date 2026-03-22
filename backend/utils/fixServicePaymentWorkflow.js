const mongoose = require('mongoose');
const ServiceRequest = require('../models/ServiceRequest');
const MedicalInvoice = require('../models/MedicalInvoice');
const ImagingOrder = require('../models/ImagingOrder');
const Service = require('../models/Service');
const Patient = require('../models/Patient');
const User = require('../models/User');

/**
 * Comprehensive fix for service payment workflow
 * 1. Find all pending service requests with paid invoices
 * 2. Update their status to 'in-progress'
 * 3. Create missing imaging orders
 * 4. Ensure complete workflow
 */
async function fixServicePaymentWorkflow() {
  try {
    console.log('🔧 Starting comprehensive service payment workflow fix...');
    
    // Connect to MongoDB if not already connected
    if (mongoose.connection.readyState === 0) {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms';
      await mongoose.connect(mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log('📡 Connected to MongoDB');
    }
    
    // Find all service requests that are pending but have paid invoices
    console.log('🔍 Finding pending service requests with paid invoices...');
    
    const pendingServiceRequests = await ServiceRequest.find({
      status: 'pending'
    })
    .populate('service')
    .populate('invoice')
    .populate('patient');
    
    console.log(`Found ${pendingServiceRequests.length} pending service requests`);
    
    // Filter for imaging services with paid invoices
    const imagingServiceRequests = pendingServiceRequests.filter(sr => 
      sr.service && 
      sr.invoice &&
      (sr.service.category === 'imaging' || 
       sr.service.category === 'ultrasound' || 
       sr.service.category === 'xray' ||
       sr.service.name.toLowerCase().includes('ultrasound') ||
       sr.service.name.toLowerCase().includes('imaging')) &&
      (sr.invoice.status === 'paid' || sr.invoice.status === 'partially_paid')
    );
    
    console.log(`Found ${imagingServiceRequests.length} imaging service requests with paid invoices`);
    
    let statusUpdated = 0;
    let imagingOrdersCreated = 0;
    let errors = 0;
    
    for (const serviceRequest of imagingServiceRequests) {
      try {
        console.log(`\n🔄 Processing: ${serviceRequest.patient.firstName} ${serviceRequest.patient.lastName} - ${serviceRequest.service.name}`);
        
        // 1. Update service request status
        if (serviceRequest.status === 'pending') {
          serviceRequest.status = 'in-progress';
          serviceRequest.updatedAt = new Date();
          await serviceRequest.save();
          statusUpdated++;
          console.log(`   ✅ Status updated: pending → in-progress`);
        }
        
        // 2. Check if imaging order already exists
        const existingImagingOrder = await ImagingOrder.findOne({
          serviceRequestId: serviceRequest._id
        });
        
        if (!existingImagingOrder) {
          // 3. Create imaging order
          console.log(`   🏥 Creating imaging order...`);
          
          // Determine imaging type and body part from service name
          const serviceName = serviceRequest.service.name.toLowerCase();
          let imagingType = 'Ultrasound';
          let bodyPart = 'Abdomen';
          
          if (serviceName.includes('ultrasound') || serviceName.includes('u/s')) {
            imagingType = 'Ultrasound';
          } else if (serviceName.includes('x-ray') || serviceName.includes('xray')) {
            imagingType = 'X-Ray';
          } else if (serviceName.includes('ct') || serviceName.includes('computed')) {
            imagingType = 'CT Scan';
          } else if (serviceName.includes('mri')) {
            imagingType = 'MRI';
          }
          
          // Determine body part
          if (serviceName.includes('abdomin') || serviceName.includes('abdomen')) {
            bodyPart = 'Abdomen';
          } else if (serviceName.includes('pelvis') || serviceName.includes('pelvic')) {
            bodyPart = 'Pelvis';
          } else if (serviceName.includes('obstetric') || serviceName.includes('pregnancy') || serviceName.includes('fetal')) {
            bodyPart = 'Obstetric';
          } else if (serviceName.includes('breast')) {
            bodyPart = 'Breast';
          } else if (serviceName.includes('thyroid')) {
            bodyPart = 'Thyroid';
          } else if (serviceName.includes('chest')) {
            bodyPart = 'Chest';
          } else if (serviceName.includes('head')) {
            bodyPart = 'Head';
          }
          
          // Find a doctor to assign as ordering doctor
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
            clinicalInfo: `${serviceRequest.service.name} - Service payment completed`,
            priority: 'Routine',
            status: 'Ordered',
            orderDateTime: serviceRequest.createdAt || new Date(),
            serviceRequestId: serviceRequest._id,
            notes: `Created from paid service request: ${serviceRequest.service.name}. Invoice: ${serviceRequest.invoice.invoiceNumber}`
          });
          
          await imagingOrder.save();
          imagingOrdersCreated++;
          console.log(`   ✅ Imaging order created: ${imagingType} ${bodyPart}`);
        } else {
          console.log(`   ⏭️ Imaging order already exists`);
        }
        
      } catch (error) {
        console.error(`   ❌ Error processing ${serviceRequest._id}:`, error.message);
        errors++;
      }
    }
    
    console.log(`\n📊 Workflow Fix Summary:`);
    console.log(`   ✅ Status updated: ${statusUpdated} service requests`);
    console.log(`   📸 Imaging orders created: ${imagingOrdersCreated}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`   📋 Total processed: ${imagingServiceRequests.length}`);
    
    // Additional fix: Ensure all paid service requests are in-progress
    console.log(`\n🔧 Additional fix: Updating all paid service requests to in-progress...`);
    
    const additionalUpdates = await ServiceRequest.updateMany(
      {
        status: 'pending',
        invoice: { $exists: true }
      },
      {
        $set: {
          status: 'in-progress',
          updatedAt: new Date()
        }
      }
    );
    
    console.log(`   ✅ Additional status updates: ${additionalUpdates.modifiedCount} service requests`);
    
    return {
      statusUpdated,
      imagingOrdersCreated,
      errors,
      totalProcessed: imagingServiceRequests.length,
      additionalUpdates: additionalUpdates.modifiedCount
    };
    
  } catch (error) {
    console.error('❌ Error fixing service payment workflow:', error);
    throw error;
  }
}

// Export for use in other scripts
module.exports = { fixServicePaymentWorkflow };

// Run directly if this file is executed
if (require.main === module) {
  fixServicePaymentWorkflow()
    .then((result) => {
      console.log('\n🎉 Service payment workflow fix completed successfully!', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Service payment workflow fix failed:', error);
      process.exit(1);
    });
}
