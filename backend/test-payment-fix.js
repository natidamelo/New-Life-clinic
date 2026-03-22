const mongoose = require('mongoose');
const MedicalInvoice = require('./models/MedicalInvoice');
const billingController = require('./controllers/billingController');

async function testPaymentProcessing() {
  try {
    console.log('🔍 Connecting to database...');
    
    await mongoose.connect('mongodb://localhost:27017/clinic-cms', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ Connected to MongoDB');
    
    // Target the prescription invoice with 1500 ETB remaining
    const invoiceId = '68961b80a2474360e6736f30';
    const payAmount = 1500;
    console.log(`Looking for invoice: ${invoiceId}`);
    
    const invoice = await MedicalInvoice.findById(invoiceId);
    if (!invoice) {
      console.log('❌ Invoice not found');
      return;
    }
    
    console.log('✅ Invoice found:', {
      id: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      total: invoice.total,
      balance: invoice.balance,
      status: invoice.status,
      items: invoice.items?.length || 0
    });
    
    const mockReq = {
      params: { invoiceId: invoiceId },
      body: {
        amount: payAmount,
        paymentMethod: 'cash',
        transactionId: 'TEST-1500',
        notes: 'Test 1500 payment'
      },
      user: {
        _id: '682461b58a2bfb0a7539984c'
      }
    };
    
    const mockRes = {
      status: (code) => ({
        json: (data) => {
          console.log(`Response ${code}:`, data);
        }
      }),
      json: (data) => {
        console.log('Response:', data);
      }
    };
    
    console.log(`🔄 Testing payment processing of ${payAmount} ETB...`);
    await billingController.addPaymentToInvoice(mockReq, mockRes);
    
  } catch (error) {
    console.error('❌ Error in test:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    await mongoose.disconnect();
  }
}

testPaymentProcessing();
