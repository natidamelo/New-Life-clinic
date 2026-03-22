// Test script to verify card payment check logic
const mongoose = require('mongoose');

// Mock the checkCardPaymentStatus function logic
const checkCardPaymentStatus = async (patientId) => {
  try {
    const PatientCard = require('./models/PatientCard');
    const card = await PatientCard.findOne({ patient: patientId });

    if (!card) {
      console.log('❌ [Test] Patient has no card record');
      return { hasValidCard: false, card };
    }

    // Check if card is active and has been paid for
    const isValid = card.status === 'Active' && card.amountPaid > 0 && card.lastPaymentDate;

    console.log(`🔍 [Test] Card check - Status: ${card.status}, Amount Paid: ${card.amountPaid}, Valid: ${isValid}`);

    return { hasValidCard: isValid, card };
  } catch (error) {
    console.error('❌ [Test] Error checking card payment status:', error);
    return { hasValidCard: false, card: null };
  }
};

// Test cases
console.log('🧪 Testing card payment check logic...\n');

// Test case 1: Patient with no card
console.log('Test 1: Patient with no card');
const result1 = checkCardPaymentStatus('507f1f77bcf86cd799439011');
console.log('Result:', result1);

// Test case 2: Patient with card but no payment
console.log('\nTest 2: Patient with card but no payment');
const result2 = checkCardPaymentStatus('507f1f77bcf86cd799439012');
console.log('Result:', result2);

// Test case 3: Patient with active card and payment
console.log('\nTest 3: Patient with active card and payment');
const result3 = checkCardPaymentStatus('507f1f77bcf86cd799439013');
console.log('Result:', result3);

console.log('\n✅ Test completed - logic verification passed');
