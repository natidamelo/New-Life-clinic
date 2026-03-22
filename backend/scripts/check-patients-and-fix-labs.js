#!/usr/bin/env node

const mongoose = require('mongoose');
require('dotenv').config();

const Patient = require('../models/Patient');
const LabOrder = require('../models/LabOrder');
const Notification = require('../models/Notification');

async function checkPatientsAndFixLabs() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms');
    console.log('✅ Connected to MongoDB');
    
    // Step 1: Check existing patients
    console.log('\n🔍 Step 1: Checking existing patients...');
    const patients = await Patient.find({}).select('firstName lastName patientId _id').limit(10);
    
    console.log(`Found ${patients.length} patients:`);
    patients.forEach((patient, index) => {
      console.log(`${index + 1}. ${patient.firstName} ${patient.lastName} (ID: ${patient.patientId || patient._id})`);
    });
    
    if (patients.length === 0) {
      console.log('⚠️  No patients found. Creating test patients...');
      
      // Create test patients
      const testPatients = [
        { firstName: 'MR', lastName: 'x', patientId: 'MRx001' },
        { firstName: 'Natan', lastName: 'Kinfe', patientId: 'NK001' }
      ];
      
      for (const testPatientData of testPatients) {
        const patient = new Patient({
          firstName: testPatientData.firstName,
          lastName: testPatientData.lastName,
          patientId: testPatientData.patientId,
          dateOfBirth: new Date('1990-01-01'),
          gender: 'male',
          contactNumber: '123-456-7890',
          address: {
            street: 'Test Street',
            city: 'Test City',
            state: 'Test State',
            zipCode: '12345',
            country: 'Test Country'
          },
          emergencyContact: {
            name: 'Emergency Contact',
            contactNumber: '123-456-7890'
          }
        });
        
        await patient.save();
        console.log(`✅ Created patient: ${patient.firstName} ${patient.lastName}`);
      }
      
      // Re-fetch patients
      const newPatients = await Patient.find({}).select('firstName lastName patientId _id').limit(10);
      console.log(`\nNow have ${newPatients.length} patients`);
    }
    
    // Step 2: Create lab orders for the first few patients
    console.log('\n🔧 Step 2: Creating lab orders...');
    
    const patientsForLabs = await Patient.find({}).limit(2);
    
    const labTestPrices = {
      'Glucose, Fasting': 200,
      'Complete Urinalysis': 100,
      'Hemoglobin': 100,
      'HBsAg': 500
    };
    
    for (const patient of patientsForLabs) {
      // Check if this patient already has lab orders
      const existingOrders = await LabOrder.find({ 
        patientId: patient._id,
        paymentStatus: { $ne: 'paid' }
      });
      
      if (existingOrders.length === 0) {
        // Create lab orders for this patient
        const testsForPatient = patient.firstName === 'MR' ? 
          ['Glucose, Fasting'] : 
          ['Glucose, Fasting', 'Complete Urinalysis', 'Hemoglobin'];
        
        for (const testName of testsForPatient) {
          const labOrder = new LabOrder({
            patientId: patient._id,
            patient: patient._id,
            orderingDoctorId: '507f1f77bcf86cd799439011',
            testName: testName,
            status: 'Pending Payment',
            paymentStatus: 'pending',
            totalPrice: labTestPrices[testName] || 100,
            orderDateTime: new Date(),
            priority: 'Routine',
            category: 'Laboratory'
          });
          
          await labOrder.save();
          console.log(`✅ Created lab order: ${testName} for ${patient.firstName} ${patient.lastName} - ${labOrder.totalPrice} ETB`);
        }
      } else {
        console.log(`ℹ️  Patient ${patient.firstName} ${patient.lastName} already has ${existingOrders.length} lab orders`);
      }
    }
    
    // Step 3: Create consolidated notifications
    console.log('\n📋 Step 3: Creating consolidated lab notifications...');
    
    // Remove existing lab notifications
    const deleteResult = await Notification.deleteMany({
      type: 'lab_payment_required'
    });
    console.log(`🗑️  Removed ${deleteResult.deletedCount} existing lab notifications`);
    
    // Get all unpaid lab orders grouped by patient
    const labOrders = await LabOrder.find({
      paymentStatus: { $ne: 'paid' }
    }).populate('patientId');
    
    console.log(`📊 Found ${labOrders.length} unpaid lab orders`);
    
    // Group by patient
    const patientGroups = {};
    labOrders.forEach(order => {
      if (order.patientId) {
        const patientId = order.patientId._id.toString();
        if (!patientGroups[patientId]) {
          patientGroups[patientId] = {
            patient: order.patientId,
            orders: []
          };
        }
        patientGroups[patientId].orders.push(order);
      }
    });
    
    console.log(`👥 Grouped into ${Object.keys(patientGroups).length} patient groups`);
    
    // Create notifications for each patient group
    for (const [patientId, group] of Object.entries(patientGroups)) {
      const patient = group.patient;
      const orders = group.orders;
      
      let totalAmount = 0;
      const testNames = [];
      const labOrderIds = [];
      
      orders.forEach(order => {
        totalAmount += order.totalPrice || 0;
        testNames.push(order.testName);
        labOrderIds.push(order._id);
      });
      
      const notificationData = {
        title: 'Lab Tests Payment Required',
        message: `Payment required for ${testNames.length} lab tests for ${patient.firstName} ${patient.lastName}. Total amount: ${totalAmount} ETB.`,
        type: 'lab_payment_required',
        senderId: '507f1f77bcf86cd799439011',
        senderRole: 'system',
        recipientRole: 'reception',
        priority: 'medium',
        data: {
          patientId: patient._id,
          patientName: `${patient.firstName} ${patient.lastName}`,
          labOrderIds: labOrderIds,
          testNames: testNames,
          amount: totalAmount,
          consolidated: true
        },
        read: false,
        timestamp: new Date()
      };
      
      const notification = new Notification(notificationData);
      await notification.save();
      
      console.log(`✅ Created notification for ${patient.firstName} ${patient.lastName}:`);
      console.log(`   - Tests: ${testNames.join(', ')}`);
      console.log(`   - Amount: ${totalAmount} ETB`);
    }
    
    // Step 4: Verify the results
    console.log('\n📊 Step 4: Final verification...');
    
    const finalNotifications = await Notification.find({
      type: 'lab_payment_required',
      read: false
    });
    
    console.log(`\n✅ Created ${finalNotifications.length} lab notifications:`);
    
    finalNotifications.forEach((notif, index) => {
      console.log(`\n${index + 1}. Patient: ${notif.data?.patientName}`);
      console.log(`   Amount: ${notif.data?.amount} ETB`);
      console.log(`   Tests: ${notif.data?.testNames?.join(', ')}`);
      console.log(`   Lab Orders: ${notif.data?.labOrderIds?.length}`);
    });
    
    if (finalNotifications.length > 0 && finalNotifications.every(n => n.data?.amount > 0)) {
      console.log('\n🎉 SUCCESS: Lab notifications created with proper amounts!');
      console.log('   The frontend should now show the correct amounts instead of ETB 0.00');
    } else {
      console.log('\n⚠️  Issue: Some notifications may still have problems');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

checkPatientsAndFixLabs();
