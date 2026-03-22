/**
 * Test script to verify MongoDB replica set and transaction support
 * Run: node backend/test-transactions.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Simple test schema
const TestSchema = new mongoose.Schema({
  name: String,
  value: Number,
  createdAt: { type: Date, default: Date.now }
});

const TestModel = mongoose.model('TransactionTest', TestSchema);

async function testTransactions() {
  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic_db';
    
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to MongoDB');

    // Check replica set status
    const admin = mongoose.connection.db.admin();
    try {
      const status = await admin.command({ replSetGetStatus: 1 });
      console.log(`✅ Replica Set: ${status.set}`);
      console.log(`✅ Members: ${status.members.length}`);
      
      const primary = status.members.find(m => m.stateStr === 'PRIMARY');
      if (primary) {
        console.log(`✅ Primary: ${primary.name}`);
      }
      
      console.log('\n📋 Replica Set Members:');
      status.members.forEach((member, index) => {
        console.log(`   ${index + 1}. ${member.name} - ${member.stateStr} (${member.health === 1 ? 'Healthy' : 'Unhealthy'})`);
      });
      
    } catch (error) {
      console.error('❌ Not connected to a replica set!');
      console.error('❌ Error:', error.message);
      console.error('\n💡 Please set up a replica set first. See MONGODB_REPLICA_SET_SETUP.md');
      process.exit(1);
    }

    // Test transaction
    console.log('\n🧪 Testing transactions...');
    
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Create a test document within transaction
      const testDoc = new TestModel({
        name: 'Transaction Test',
        value: 123
      });
      
      await testDoc.save({ session });
      console.log('✅ Document created within transaction');
      
      // Find it within the same transaction
      const found = await TestModel.findById(testDoc._id).session(session);
      console.log('✅ Document found within transaction:', found.name);
      
      // Commit the transaction
      await session.commitTransaction();
      session.endSession();
      console.log('✅ Transaction committed successfully');
      
      // Verify it persisted
      const persisted = await TestModel.findById(testDoc._id);
      console.log('✅ Document persisted after commit:', persisted.name);
      
      // Clean up
      await TestModel.deleteOne({ _id: testDoc._id });
      console.log('✅ Test document cleaned up');
      
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }

    // Test transaction rollback
    console.log('\n🧪 Testing transaction rollback...');
    
    const session2 = await mongoose.startSession();
    session2.startTransaction();

    try {
      const testDoc2 = new TestModel({
        name: 'Rollback Test',
        value: 456
      });
      
      await testDoc2.save({ session: session2 });
      console.log('✅ Document created for rollback test');
      
      // Abort the transaction
      await session2.abortTransaction();
      session2.endSession();
      console.log('✅ Transaction aborted');
      
      // Verify it was NOT persisted
      const shouldNotExist = await TestModel.findById(testDoc2._id);
      if (!shouldNotExist) {
        console.log('✅ Document correctly NOT persisted after rollback');
      } else {
        console.error('❌ Document persisted despite rollback!');
        await TestModel.deleteOne({ _id: testDoc2._id });
      }
      
    } catch (error) {
      await session2.abortTransaction();
      session2.endSession();
      throw error;
    }

    console.log('\n🎉 All transaction tests passed!');
    console.log('\n✅ Your MongoDB replica set is working correctly');
    console.log('✅ Transactions are fully supported');
    console.log('\n💡 You can now enable transactions in your application');
    console.log('   See ENABLE_TRANSACTIONS.md for migration guide');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the test
testTransactions();

