const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const ServiceRequest = require('../models/ServiceRequest');
const Patient = require('../models/Patient');
const Service = require('../models/Service');
const MedicalInvoice = require('../models/MedicalInvoice');

async function checkServiceRequests() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms');
    console.log('✅ Connected to MongoDB');

    console.log('🔍 Checking all service requests...');
    
    // Find all service requests
    const allServiceRequests = await ServiceRequest.find({})
    .populate('service')
    .populate('patient')
    .populate('invoice');

    console.log(`🔍 Found ${allServiceRequests.length} total service requests`);

    if (allServiceRequests.length === 0) {
      console.log('❌ No service requests found at all');
      return;
    }

    console.log('\n📋 All Service Requests:');
    allServiceRequests.forEach((sr, index) => {
      console.log(`\n${index + 1}. Service Request ID: ${sr._id}`);
      console.log(`   Patient: ${sr.patient ? `${sr.patient.firstName} ${sr.patient.lastName}` : 'No patient'}`);
      console.log(`   Service: ${sr.service ? sr.service.name : 'No service'}`);
      console.log(`   Category: ${sr.service ? sr.service.category : 'No category'}`);
      console.log(`   Price: ${sr.service ? sr.service.price : 'No price'}`);
      console.log(`   Status: ${sr.status}`);
      console.log(`   Created: ${sr.createdAt}`);
      console.log(`   Invoice: ${sr.invoice ? sr.invoice._id : 'No invoice'}`);
    });

    // Check for wound care specifically
    console.log('\n🔍 Looking for wound care related services...');
    const woundCareRequests = allServiceRequests.filter(sr => 
      sr.service && (
        sr.service.name.toLowerCase().includes('wound') ||
        sr.service.name.toLowerCase().includes('care') ||
        sr.service.category === 'procedure'
      )
    );

    console.log(`🔍 Found ${woundCareRequests.length} wound care related service requests`);

    if (woundCareRequests.length > 0) {
      console.log('\n📋 Wound Care Related Service Requests:');
      woundCareRequests.forEach((sr, index) => {
        console.log(`\n${index + 1}. Service Request ID: ${sr._id}`);
        console.log(`   Patient: ${sr.patient ? `${sr.patient.firstName} ${sr.patient.lastName}` : 'No patient'}`);
        console.log(`   Service: ${sr.service ? sr.service.name : 'No service'}`);
        console.log(`   Category: ${sr.service ? sr.service.category : 'No category'}`);
        console.log(`   Price: ${sr.service ? sr.service.price : 'No price'}`);
        console.log(`   Status: ${sr.status}`);
        console.log(`   Created: ${sr.createdAt}`);
        console.log(`   Invoice: ${sr.invoice ? sr.invoice._id : 'No invoice'}`);
      });
    }

    // Check for Melody specifically
    console.log('\n🔍 Looking for Melody...');
    const melodyRequests = allServiceRequests.filter(sr => 
      sr.patient && (
        sr.patient.firstName.toLowerCase().includes('melody') ||
        sr.patient.lastName.toLowerCase().includes('melody') ||
        sr.patient.firstName.toLowerCase().includes('melody') ||
        sr.patient.lastName.toLowerCase().includes('melody')
      )
    );

    console.log(`🔍 Found ${melodyRequests.length} service requests for Melody`);

    if (melodyRequests.length > 0) {
      console.log('\n📋 Melody\'s Service Requests:');
      melodyRequests.forEach((sr, index) => {
        console.log(`\n${index + 1}. Service Request ID: ${sr._id}`);
        console.log(`   Patient: ${sr.patient ? `${sr.patient.firstName} ${sr.patient.lastName}` : 'No patient'}`);
        console.log(`   Service: ${sr.service ? sr.service.name : 'No service'}`);
        console.log(`   Category: ${sr.service ? sr.service.category : 'No category'}`);
        console.log(`   Price: ${sr.service ? sr.service.price : 'No price'}`);
        console.log(`   Status: ${sr.status}`);
        console.log(`   Created: ${sr.createdAt}`);
        console.log(`   Invoice: ${sr.invoice ? sr.invoice._id : 'No invoice'}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

// Run the script
checkServiceRequests();
