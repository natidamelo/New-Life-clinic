const mongoose = require('mongoose');
const Patient = require('./models/Patient');
const CardType = require('./models/CardType');
const MedicalInvoice = require('./models/MedicalInvoice');
const Notification = require('./models/Notification');

async function testPatientRegistration() {
  try {
    await mongoose.connect('mongodb://localhost:27017/clinic-cms');
    console.log('Connected to MongoDB');
    
    console.log('\n🔍 Testing Patient Registration Components...\n');
    
    // Test 1: Check if CardType model exists and has data
    console.log('📋 Test 1: Checking CardType Model');
    try {
      const cardTypes = await CardType.find({});
      console.log(`Found ${cardTypes.length} card types:`, cardTypes.map(ct => ({ name: ct.name, price: ct.price })));
    } catch (error) {
      console.error('❌ CardType model error:', error.message);
    }
    
    // Test 2: Check if Patient model can be instantiated
    console.log('\n📋 Test 2: Testing Patient Model Creation');
    try {
      const testPatient = new Patient({
        firstName: 'Test',
        lastName: 'Patient',
        age: 30,
        gender: 'male',
        contactNumber: '1234567890',
        email: 'test@example.com',
        address: 'Test Address',
        department: 'general',
        priority: 'normal',
        status: 'waiting'
      });
      
      console.log('✅ Patient model instantiated successfully');
      console.log('Patient data:', {
        firstName: testPatient.firstName,
        lastName: testPatient.lastName,
        age: testPatient.age,
        gender: testPatient.gender
      });
    } catch (error) {
      console.error('❌ Patient model error:', error.message);
    }
    
    // Test 3: Check if MedicalInvoice model can be instantiated
    console.log('\n📋 Test 3: Testing MedicalInvoice Model');
    try {
      const testInvoice = new MedicalInvoice({
        patient: new mongoose.Types.ObjectId(),
        patientId: 'P12345',
        patientName: 'Test Patient',
        items: [{
          itemType: 'card',
          category: 'card',
          description: 'Test Card',
          quantity: 1,
          unitPrice: 100,
          total: 100
        }],
        subtotal: 100,
        total: 100,
        balance: 100,
        status: 'pending'
      });
      
      console.log('✅ MedicalInvoice model instantiated successfully');
    } catch (error) {
      console.error('❌ MedicalInvoice model error:', error.message);
    }
    
    // Test 4: Check if Notification model can be instantiated
    console.log('\n📋 Test 4: Testing Notification Model');
    try {
      const testNotification = new Notification({
        title: 'Test Notification',
        message: 'Test message',
        type: 'card_payment_required',
        senderRole: 'system',
        recipientRole: 'reception',
        priority: 'high',
        data: {
          patientId: new mongoose.Types.ObjectId(),
          patientName: 'Test Patient',
          amount: 100
        },
        read: false
      });
      
      console.log('✅ Notification model instantiated successfully');
    } catch (error) {
      console.error('❌ Notification model error:', error.message);
    }
    
    // Test 5: Simulate the exact patient creation process
    console.log('\n📋 Test 5: Simulating Patient Creation Process');
    try {
      // Step 1: Create patient
      const newPatient = new Patient({
        firstName: 'Test',
        lastName: 'Patient',
        age: 30,
        gender: 'male',
        contactNumber: '1234567890',
        email: 'test@example.com',
        address: 'Test Address',
        department: 'general',
        priority: 'normal',
        status: 'waiting',
        registrationDate: new Date(),
        lastVisit: new Date()
      });
      
      await newPatient.save();
      console.log('✅ Patient saved successfully:', newPatient._id);
      
      // Step 2: Get card type
      const cardTypes = await CardType.find({});
      if (cardTypes.length > 0) {
        const selectedCardTypeId = cardTypes[0]._id;
        const cardAmount = cardTypes[0].price || 0;
        const cardTypeName = cardTypes[0].name || 'Patient Card';
        
        console.log('✅ Card type found:', { cardTypeName, cardAmount });
        
        // Step 3: Create invoice
        const billingService = require('./services/billingService');
        
        const serviceData = {
          description: `${cardTypeName} - Annual Fee`,
          amount: cardAmount,
          quantity: 1,
          metadata: {
            cardTypeId: selectedCardTypeId,
            cardType: cardTypeName,
            benefits: cardTypes[0].benefits || {}
          }
        };
        
        console.log('Creating invoice with billing service...');
        const invoice = await billingService.addServiceToInvoice(
          newPatient._id, 
          'card', 
          serviceData, 
          null // No user ID for test
        );
        console.log('✅ Invoice created successfully:', invoice._id);
        
        // Step 4: Create notification
        const cardNotification = new Notification({
          title: 'Card Payment Required',
          message: `Card payment of ETB ${cardAmount} required for ${newPatient.firstName} ${newPatient.lastName} (${cardTypeName})`,
          type: 'card_payment_required',
          senderId: null,
          senderRole: 'system',
          recipientRole: 'reception',
          priority: 'high',
          data: {
            patientId: newPatient._id,
            patientName: `${newPatient.firstName} ${newPatient.lastName}`,
            invoiceId: invoice._id,
            invoiceNumber: invoice.invoiceNumber,
            amount: cardAmount,
            totalAmount: cardAmount,
            cardTypeId: selectedCardTypeId,
            cardType: cardTypeName,
            paymentStatus: 'pending'
          },
          read: false
        });
        
        await cardNotification.save();
        console.log('✅ Notification created successfully');
        
        // Clean up test data
        await Patient.findByIdAndDelete(newPatient._id);
        await MedicalInvoice.findByIdAndDelete(invoice._id);
        await Notification.findByIdAndDelete(cardNotification._id);
        console.log('✅ Test data cleaned up');
        
      } else {
        console.log('⚠️ No card types found, skipping invoice creation test');
      }
      
    } catch (error) {
      console.error('❌ Patient creation process error:', error.message);
      console.error('Stack trace:', error.stack);
    }
    
    console.log('\n✅ All tests completed');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await mongoose.connection.close();
  }
}

testPatientRegistration(); 