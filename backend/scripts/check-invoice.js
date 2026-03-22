#!/usr/bin/env node

const mongoose = require('mongoose');
require('dotenv').config();

const MedicalInvoice = require('../models/MedicalInvoice');
const ServiceRequest = require('../models/ServiceRequest');
const Service = require('../models/Service');

async function checkInvoice() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic');
    console.log('✅ Connected to MongoDB');
    
    const invoiceId = '68bc8f9257e3ed4f1552a190';
    console.log(`\n🔍 Checking invoice: ${invoiceId}`);
    
    const invoice = await MedicalInvoice.findById(invoiceId);
    
    if (invoice) {
      console.log('\n📋 Invoice Details:');
      console.log(`   ID: ${invoice._id}`);
      console.log(`   Patient: ${invoice.patientName}`);
      console.log(`   Total: ${invoice.total} ETB`);
      console.log(`   Balance: ${invoice.balance} ETB`);
      console.log(`   Status: ${invoice.status}`);
      console.log(`   Created: ${invoice.createdAt}`);
      
      console.log('\n📦 Invoice Items:');
      if (invoice.items && invoice.items.length > 0) {
        invoice.items.forEach((item, index) => {
          console.log(`   ${index + 1}. ${item.description}`);
          console.log(`      - Type: ${item.itemType}`);
          console.log(`      - Quantity: ${item.quantity}`);
          console.log(`      - Unit Price: ${item.unitPrice} ETB`);
          console.log(`      - Total: ${item.total} ETB`);
          if (item.metadata) {
            console.log(`      - Metadata:`, JSON.stringify(item.metadata, null, 8));
          }
        });
      } else {
        console.log('   No items found');
      }
      
      // Check if this is related to a service request
      console.log('\n🔍 Checking related service requests...');
      const serviceRequests = await ServiceRequest.find({
        invoice: invoiceId
      }).populate('service');
      
      if (serviceRequests.length > 0) {
        console.log(`   Found ${serviceRequests.length} related service requests:`);
        serviceRequests.forEach((sr, index) => {
          console.log(`   ${index + 1}. Service: ${sr.service?.name || 'Unknown'}`);
          console.log(`      - Price: ${sr.service?.price || 0} ETB`);
          console.log(`      - Status: ${sr.status}`);
          console.log(`      - Patient: ${sr.patientName}`);
        });
      } else {
        console.log('   No related service requests found');
      }
      
      // Check all services to see wound care pricing
      console.log('\n💰 Checking wound care service pricing...');
      const woundCareServices = await Service.find({
        name: { $regex: /wound.*care/i }
      });
      
      if (woundCareServices.length > 0) {
        console.log(`   Found ${woundCareServices.length} wound care services:`);
        woundCareServices.forEach((service, index) => {
          console.log(`   ${index + 1}. ${service.name}: ${service.price} ETB`);
        });
      } else {
        console.log('   No wound care services found in database');
      }
      
    } else {
      console.log('❌ Invoice not found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

checkInvoice();
