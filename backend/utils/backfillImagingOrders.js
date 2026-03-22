const mongoose = require('mongoose');
const ServiceRequest = require('../models/ServiceRequest');
const ImagingOrder = require('../models/ImagingOrder');
const MedicalInvoice = require('../models/MedicalInvoice');
const Patient = require('../models/Patient');
const User = require('../models/User');
const Service = require('../models/Service');

/**
 * Backfill imaging orders for existing paid imaging service requests
 * This handles cases where imaging services were paid for but imaging orders weren't created
 */
async function backfillImagingOrders() {
  try {
    console.log('🔍 Starting backfill of imaging orders for paid service requests...');
    
    // Find all service requests for imaging services (pending or in-progress)
    const paidImagingServiceRequests = await ServiceRequest.find({
      status: { $in: ['pending', 'in-progress'] }
    })
    .populate('service')
    .populate('invoice')
    .populate('patient');
    
    console.log(`Found ${paidImagingServiceRequests.length} service requests in progress`);
    
    // Filter for imaging services only
    const imagingServiceRequests = paidImagingServiceRequests.filter(sr => 
      sr.service && 
      (sr.service.category === 'imaging' || 
       sr.service.category === 'ultrasound' || 
       sr.service.category === 'xray') &&
      sr.invoice &&
      (sr.invoice.status === 'paid' || sr.invoice.status === 'partially_paid')
    );
    
    console.log(`Found ${imagingServiceRequests.length} paid imaging service requests`);
    
    let created = 0;
    let skipped = 0;
    
    for (const serviceRequest of imagingServiceRequests) {
      try {
        // Check if imaging order already exists for this service request
        const existingOrder = await ImagingOrder.findOne({
          serviceRequestId: serviceRequest._id
        });
        
        if (existingOrder) {
          console.log(`⏭️ Skipping - Imaging order already exists for ${serviceRequest.service.name}`);
          skipped++;
          continue;
        }
        
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
        
        // Create the imaging order
        const imagingOrder = new ImagingOrder({
          patientId: serviceRequest.patient._id,
          orderingDoctorId: orderingDoctorId,
          imagingType: imagingType,
          bodyPart: bodyPart,
          clinicalInfo: `${serviceRequest.service.name} - Backfilled from paid service request`,
          priority: 'Routine',
          status: 'Ordered',
          orderDateTime: serviceRequest.createdAt || new Date(),
          serviceRequestId: serviceRequest._id,
          notes: `Backfilled from service request: ${serviceRequest.service.name}. Invoice: ${serviceRequest.invoice.invoiceNumber}`
        });
        
        await imagingOrder.save();
        created++;
        
        console.log(`✅ Created imaging order for ${imagingType} ${bodyPart} - Patient: ${serviceRequest.patient.firstName} ${serviceRequest.patient.lastName} - Service: ${serviceRequest.service.name}`);
        
      } catch (error) {
        console.error(`❌ Error processing service request ${serviceRequest._id}:`, error);
      }
    }
    
    console.log(`\n📊 Backfill Summary:`);
    console.log(`   ✅ Created: ${created} imaging orders`);
    console.log(`   ⏭️ Skipped: ${skipped} (already existed)`);
    console.log(`   📋 Total processed: ${imagingServiceRequests.length} service requests`);
    
    return {
      created,
      skipped,
      total: imagingServiceRequests.length
    };
    
  } catch (error) {
    console.error('❌ Error during imaging orders backfill:', error);
    throw error;
  }
}

// Export for use in other scripts
module.exports = { backfillImagingOrders };

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
  
  backfillImagingOrders()
    .then((result) => {
      console.log('🎉 Backfill completed successfully!', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Backfill failed:', error);
      process.exit(1);
    });
}
