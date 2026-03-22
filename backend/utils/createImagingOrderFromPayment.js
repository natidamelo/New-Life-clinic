const mongoose = require('mongoose');
const ServiceRequest = require('../models/ServiceRequest');
const ImagingOrder = require('../models/ImagingOrder');
const MedicalInvoice = require('../models/MedicalInvoice');
const Patient = require('../models/Patient');
const User = require('../models/User');
const Service = require('../models/Service');

/**
 * Create imaging orders for service requests when their invoices are paid
 * This ensures imaging orders are created regardless of which payment endpoint is used
 */
async function createImagingOrdersFromPayment(invoiceId, paymentAmount = 0) {
  try {
    console.log(`🔍 [Imaging Order Check] Checking invoice ${invoiceId} for imaging services...`);
    
    // Get the invoice with populated data
    const invoice = await MedicalInvoice.findById(invoiceId);
    if (!invoice) {
      console.log(`⚠️ [Imaging Order Check] Invoice not found: ${invoiceId}`);
      return { success: false, message: 'Invoice not found' };
    }
    
    // Check if this invoice is fully paid or substantially paid (>80%)
    const isPaid = invoice.status === 'paid';
    const isSubstantiallyPaid = invoice.status === 'partial' && 
                               (invoice.amountPaid / invoice.total) >= 0.8;
    
    if (!isPaid && !isSubstantiallyPaid) {
      console.log(`⚠️ [Imaging Order Check] Invoice not sufficiently paid (${invoice.status}, ${Math.round((invoice.amountPaid / invoice.total) * 100)}%)`);
      return { success: false, message: 'Invoice not sufficiently paid' };
    }
    
    // Find service requests linked to this invoice
    const serviceRequests = await ServiceRequest.find({
      invoice: invoiceId
    })
    .populate('service')
    .populate('patient')
    .populate('orderedBy');
    
    console.log(`🔍 [Imaging Order Check] Found ${serviceRequests.length} service requests for invoice`);
    
    if (serviceRequests.length === 0) {
      console.log(`ℹ️ [Imaging Order Check] No service requests found for invoice`);
      return { success: true, message: 'No service requests found', created: 0 };
    }
    
    // Filter for imaging services
    const imagingServiceRequests = serviceRequests.filter(sr => 
      sr.service && 
      (sr.service.category === 'imaging' || 
       sr.service.category === 'ultrasound' || 
       sr.service.category === 'xray' ||
       sr.service.name.toLowerCase().includes('ultrasound') ||
       sr.service.name.toLowerCase().includes('imaging') ||
       sr.service.name.toLowerCase().includes('x-ray') ||
       sr.service.name.toLowerCase().includes('scan'))
    );
    
    console.log(`🔍 [Imaging Order Check] Found ${imagingServiceRequests.length} imaging service requests`);
    
    if (imagingServiceRequests.length === 0) {
      console.log(`ℹ️ [Imaging Order Check] No imaging services in this invoice`);
      return { success: true, message: 'No imaging services found', created: 0 };
    }
    
    let created = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const serviceRequest of imagingServiceRequests) {
      try {
        // Check if imaging order already exists
        const existingOrder = await ImagingOrder.findOne({
          serviceRequestId: serviceRequest._id
        });
        
        if (existingOrder) {
          console.log(`⏭️ [Imaging Order Check] Imaging order already exists for service request ${serviceRequest._id}`);
          skipped++;
          continue;
        }
        
        console.log(`🏥 [Imaging Order Check] Creating imaging order for: ${serviceRequest.service.name}`);
        
        // Parse service name to determine imaging type and body part
        const serviceName = serviceRequest.service.name.toLowerCase();
        let imagingType = 'Ultrasound';
        let bodyPart = 'Abdomen';
        
        // Determine imaging type
        if (serviceName.includes('ultrasound') || serviceName.includes('u/s')) {
          imagingType = 'Ultrasound';
        } else if (serviceName.includes('x-ray') || serviceName.includes('xray')) {
          imagingType = 'X-Ray';
        } else if (serviceName.includes('ct') || serviceName.includes('computed')) {
          imagingType = 'CT Scan';
        } else if (serviceName.includes('mri')) {
          imagingType = 'MRI';
        } else if (serviceName.includes('mammography') || serviceName.includes('mammo')) {
          imagingType = 'Mammography';
        }
        
        // Determine body part from service name
        if (serviceName.includes('abdomin') && serviceName.includes('pelv')) {
          bodyPart = 'Abdominopelvic';
        } else if (serviceName.includes('abdomin') || serviceName.includes('abdomen')) {
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
        } else if (serviceName.includes('head') || serviceName.includes('cranial')) {
          bodyPart = 'Head';
        } else if (serviceName.includes('neck')) {
          bodyPart = 'Neck';
        } else if (serviceName.includes('cardiac') || serviceName.includes('heart')) {
          bodyPart = 'Cardiac';
        }
        
        // Find ordering doctor
        let orderingDoctorId = serviceRequest.orderedBy?._id;
        
        if (!orderingDoctorId) {
          // Try to find a doctor from the patient's assigned doctor or any available doctor
          const availableDoctor = await User.findOne({ 
            role: 'doctor',
            isActive: { $ne: false }
          });
          
          if (availableDoctor) {
            orderingDoctorId = availableDoctor._id;
            console.log(`📋 [Imaging Order Check] Using available doctor: ${availableDoctor.firstName} ${availableDoctor.lastName}`);
          }
        }
        
        if (!orderingDoctorId) {
          console.error(`❌ [Imaging Order Check] No doctor found for service request ${serviceRequest._id}`);
          errors++;
          continue;
        }
        
        // Create the imaging order
        const imagingOrder = new ImagingOrder({
          patientId: serviceRequest.patient._id,
          orderingDoctorId: orderingDoctorId,
          imagingType: imagingType,
          bodyPart: bodyPart,
          priority: 'Routine',
          status: 'Ordered',
          orderDateTime: serviceRequest.requestDate || serviceRequest.createdAt || new Date(),
          serviceRequestId: serviceRequest._id,
          serviceId: serviceRequest.service._id,
          servicePrice: serviceRequest.service.price,
          notes: `${serviceRequest.notes || ''} - Auto-created from payment processing. Invoice: ${invoice.invoiceNumber || invoice._id}`
        });
        
        await imagingOrder.save();
        created++;
        
        console.log(`✅ [Imaging Order Check] Created imaging order: ${imagingOrder._id} for ${imagingType} ${bodyPart} - Patient: ${serviceRequest.patient.firstName} ${serviceRequest.patient.lastName}`);
        
      } catch (error) {
        console.error(`❌ [Imaging Order Check] Error creating imaging order for service request ${serviceRequest._id}:`, error);
        errors++;
      }
    }
    
    const summary = {
      success: true,
      message: `Imaging order check completed`,
      created,
      skipped,
      errors,
      total: imagingServiceRequests.length
    };
    
    console.log(`📊 [Imaging Order Check] Summary:`, summary);
    
    return summary;
    
  } catch (error) {
    console.error(`❌ [Imaging Order Check] Error processing invoice ${invoiceId}:`, error);
    return { 
      success: false, 
      message: 'Error checking for imaging orders',
      error: error.message 
    };
  }
}

/**
 * Check if an invoice contains imaging services
 */
function invoiceContainsImagingServices(invoice) {
  if (!invoice || !invoice.items) {
    return false;
  }
  
  return invoice.items.some(item => 
    item.itemType === 'imaging' ||
    item.category === 'imaging' ||
    item.category === 'ultrasound' ||
    item.category === 'xray' ||
    (item.serviceName && (
      item.serviceName.toLowerCase().includes('ultrasound') ||
      item.serviceName.toLowerCase().includes('imaging') ||
      item.serviceName.toLowerCase().includes('x-ray') ||
      item.serviceName.toLowerCase().includes('scan')
    ))
  );
}

module.exports = {
  createImagingOrdersFromPayment,
  invoiceContainsImagingServices
};
