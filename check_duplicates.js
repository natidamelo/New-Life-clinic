const mongoose = require('mongoose');
require('dotenv').config();

async function checkDuplicates() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms');
    console.log('Connected to database');

    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }), 'users');

    // Check for Almaz Girmaye
    const almazResults = await User.find({
      firstName: { $regex: 'almaz', $options: 'i' },
      lastName: { $regex: 'girmaye', $options: 'i' }
    });

    console.log('\n=== ALMAZ GIRMATE REGISTRATIONS ===');
    console.log('Found', almazResults.length, 'records:');
    almazResults.forEach((user, index) => {
      console.log(`${index + 1}. ID: ${user._id}`);
      console.log(`   Name: ${user.firstName} ${user.lastName}`);
      console.log(`   Username: ${user.username || 'N/A'}`);
      console.log(`   Role: ${user.role || 'N/A'}`);
      console.log(`   Email: ${user.email || 'N/A'}`);
      console.log(`   Created: ${user.createdAt || user._id.getTimestamp()}`);
      console.log('');
    });

    // Check for Natan
    const natanResults = await User.find({
      firstName: { $regex: 'natan', $options: 'i' }
    });

    console.log('\n=== NATAN REGISTRATIONS ===');
    console.log('Found', natanResults.length, 'records:');
    natanResults.forEach((user, index) => {
      console.log(`${index + 1}. ID: ${user._id}`);
      console.log(`   Name: ${user.firstName} ${user.lastName}`);
      console.log(`   Username: ${user.username || 'N/A'}`);
      console.log(`   Role: ${user.role || 'N/A'}`);
      console.log(`   Email: ${user.email || 'N/A'}`);
      console.log(`   Created: ${user.createdAt || user._id.getTimestamp()}`);
      console.log('');
    });

    // Check StaffHash table for QR registrations
    const StaffHash = mongoose.model('StaffHash', new mongoose.Schema({}, { strict: false }), 'staffhashes');

    console.log('\n=== STAFF HASH REGISTRATIONS ===');

    // Check for Almaz
    const almazHashes = await StaffHash.find({
      'user.firstName': { $regex: 'almaz', $options: 'i' },
      'user.lastName': { $regex: 'girmaye', $options: 'i' }
    }).populate('userId');

    console.log('Almaz Staff Hashes:', almazHashes.length);
    almazHashes.forEach((hash, index) => {
      console.log(`${index + 1}. Hash: ${hash.uniqueHash?.substring(0, 12)}...`);
      console.log(`   Type: ${hash.hashType}`);
      console.log(`   Active: ${hash.isActive}`);
      console.log(`   User: ${hash.user?.firstName} ${hash.user?.lastName}`);
      console.log('');
    });

    // Check for Natan
    const natanHashes = await StaffHash.find({
      'user.firstName': { $regex: 'natan', $options: 'i' }
    }).populate('userId');

    console.log('Natan Staff Hashes:', natanHashes.length);
    natanHashes.forEach((hash, index) => {
      console.log(`${index + 1}. Hash: ${hash.uniqueHash?.substring(0, 12)}...`);
      console.log(`   Type: ${hash.hashType}`);
      console.log(`   Active: ${hash.isActive}`);
      console.log(`   User: ${hash.user?.firstName} ${hash.user?.lastName}`);
      console.log('');
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

checkDuplicates();