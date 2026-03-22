#!/usr/bin/env node

const mongoose = require('mongoose');
require('dotenv').config();

const MedicalInvoice = require('../models/MedicalInvoice');
const ServiceRequest = require('../models/ServiceRequest');
const Service = require('../models/Service');
const Patient = require('../models/Patient');

async function fixWoundCareService() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms');
    console.log('✅ Connected to MongoDB');
    
    // Step 1: Check existing invoices
    console.log('\n🔍 Step 1: Checking existing invoices...');
    const recentInvoices = await MedicalInvoice.find({}).sort({ createdAt: -1 }).limit(10);
    
    console.log(`Found ${recentInvoices.length} recent invoices:`);
    recentInvoices.forEach((invoice, index) => {
      console.log(`${index + 1}. ${invoice._id} - ${invoice.patientName} - ${invoice.total} ETB - ${invoice.status}`);
    });
    
    // Step 2: Check existing services
    console.log('\n🔍 Step 2: Checking existing services...');
    const services = await Service.find({});
    
    console.log(`Found ${services.length} services:`);
    services.forEach((service, index) => {
      console.log(`${index + 1}. ${service.name} - ${service.price} ETB - ${service.category}`);
    });
    
    // Step 3: Create or update wound care service
    console.log('\n🔧 Step 3: Creating/updating wound care service...');
    
    let woundCareService = await Service.findOne({ name: { $regex: /wound.*care/i } });
    
    if (!woundCareService) {
      woundCareService = new Service({
        name: 'wound care',
        description: 'Wound care and dressing service',
        category: 'procedure',
        price: 150, // Set a reasonable price
        isActive: true
      });
      
      await woundCareService.save();
      console.log(`✅ Created wound care service: ${woundCareService.name} - ${woundCareService.price} ETB`);
    } else {
      // Update price if it's zero
      if (woundCareService.price === 0) {
        woundCareService.price = 150;
        await woundCareService.save();
        console.log(`✅ Updated wound care service price to ${woundCareService.price} ETB`);
      } else {
        console.log(`ℹ️  Wound care service already exists with price: ${woundCareService.price} ETB`);
      }
    }
    
    // Step 4: Find melody Natan patient
    console.log('\n🔍 Step 4: Finding melody Natan patient...');
    
    let patient = await Patient.findOne({
      $or: [
        { firstName: 'melody', lastName: 'Natan' },
        { firstName: { $regex: /melody/i }, lastName: { $regex: /natan/i } }
      ]
    });
    
    if (!patient) {
      console.log('⚠️  melody Natan not found, creating patient...');
      patient = new Patient({
        firstName: 'melody',
        lastName: 'Natan',
        patientId: 'MN001',
        dateOfBirth: new Date('1985-01-01'),
        gender: 'female',
        contactNumber: '123-456-7890',
        address: {
          street: 'Test Street',
          city: 'Test City',
          state: 'Test State',
          zipCode: '12345',
          country: 'Test Country'
        }
      });
      
      await patient.save();
      console.log(`✅ Created patient: ${patient.firstName} ${patient.lastName}`);
    } else {
      console.log(`✅ Found patient: ${patient.firstName} ${patient.lastName}`);
    }
    
    // Step 5: Create service request and invoice
    console.log('\n🔧 Step 5: Creating service request and invoice...');
    
    // Check if service request already exists
    let serviceRequest = await ServiceRequest.findOne({
      patient: patient._id,
      service: woundCareService._id
    });
    
    if (!serviceRequest) {
      // Create service request
      serviceRequest = new ServiceRequest({
        patient: patient._id,
        service: woundCareService._id,
        status: 'pending',
        notes: 'Wound care service for patient'
      });
      
      await serviceRequest.save();
      console.log(`✅ Created service request: ${serviceRequest._id}`);
    } else {
      console.log(`ℹ️  Service request already exists: ${serviceRequest._id}`);
    }
    
    // Generate unique invoice number
    const invoiceNumber = `WC-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    
    // Create invoice
    const invoiceData = {
      invoiceNumber: invoiceNumber,
      patient: patient._id,
      patientId: patient.patientId || patient._id.toString(),
      patientName: `${patient.firstName} ${patient.lastName}`,
      items: [{
        itemType: 'service',
        description: woundCareService.name,
        quantity: 1,
        unitPrice: woundCareService.price,
        total: woundCareService.price,
        discount: 0,
        tax: 0,
        metadata: {
          serviceId: woundCareService._id,
          serviceRequestId: serviceRequest._id,
          category: woundCareService.category
        }
      }],
      subtotal: woundCareService.price,
      total: woundCareService.price,
      balance: woundCareService.price,
      status: 'pending',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      notes: `Invoice for ${woundCareService.name} service`,
      createdBy: '507f1f77bcf86cd799439011'
    };
    
    const invoice = new MedicalInvoice(invoiceData);
    await invoice.save();
    
    console.log(`✅ Created invoice: ${invoice._id}`);
    console.log(`   Patient: ${invoice.patientName}`);
    console.log(`   Service: ${woundCareService.name}`);
    console.log(`   Amount: ${invoice.total} ETB`);
    
    // Update service request with invoice reference
    serviceRequest.invoice = invoice._id;
    await serviceRequest.save();
    
    console.log('\n🎉 SUCCESS: Wound care service and invoice created!');
    console.log(`   New payment URL: http://localhost:5175/billing/process-payment/${invoice._id}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

fixWoundCareService();
