const mongoose = require('mongoose');

async function fixSpecificServiceRequest() {
  try {
    await mongoose.connect('mongodb://localhost:27017/clinic-cms');
    console.log('Connected to MongoDB');
    
    const ServiceRequest = require('../models/ServiceRequest');
    const ImagingOrder = require('../models/ImagingOrder');
    const User = require('../models/User');
    
    // Fix the specific service request
    const serviceRequestId = '68d40e37713da28508b459ad';
    
    const serviceRequest = await ServiceRequest.findById(serviceRequestId)
      .populate('service')
      .populate('patient')
      .populate('invoice');
    
    if (!serviceRequest) {
      console.log('❌ Service request not found');
      return;
    }
    
    console.log('📋 Found service request:');
    console.log(`- Patient: ${serviceRequest.patient.firstName} ${serviceRequest.patient.lastName}`);
    console.log(`- Service: ${serviceRequest.service.name}`);
    console.log(`- Status: ${serviceRequest.status}`);
    console.log(`- Invoice Status: ${serviceRequest.invoice ? serviceRequest.invoice.status : 'N/A'}`);
    
    // Update status to in-progress
    if (serviceRequest.status === 'pending') {
      serviceRequest.status = 'in-progress';
      serviceRequest.updatedAt = new Date();
      await serviceRequest.save();
      console.log('✅ Status updated to in-progress');
    }
    
    // Check if imaging order exists
    const existingOrder = await ImagingOrder.findOne({
      serviceRequestId: serviceRequest._id
    });
    
    if (!existingOrder) {
      console.log('📸 Creating imaging order...');
      
      // Find a doctor
      const doctor = await User.findOne({ role: 'doctor' });
      
      const imagingOrder = new ImagingOrder({
        patientId: serviceRequest.patient._id,
        orderingDoctorId: doctor ? doctor._id : serviceRequest.patient.assignedDoctorId,
        imagingType: 'Ultrasound',
        bodyPart: 'Abdomen',
        clinicalInfo: `${serviceRequest.service.name} - Direct fix`,
        priority: 'Routine',
        status: 'Ordered',
        orderDateTime: new Date(),
        serviceRequestId: serviceRequest._id,
        notes: `Direct fix for service request: ${serviceRequest.service.name}`
      });
      
      await imagingOrder.save();
      console.log('✅ Imaging order created:', imagingOrder._id);
    } else {
      console.log('⏭️ Imaging order already exists');
    }
    
    console.log('🎉 Fix completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixSpecificServiceRequest();
