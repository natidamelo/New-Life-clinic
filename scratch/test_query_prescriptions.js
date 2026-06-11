const fs = require('fs');

const envPath = 'c:/Users/HP/OneDrive/Desktop/clinic new life/backend/.env';
const dotenvContent = fs.readFileSync(envPath, 'utf8');
const mongoURIMatch = dotenvContent.match(/MONGODB_URI=(.*)/);
const mongoURI = mongoURIMatch ? mongoURIMatch[1].trim().replace(/'|"/g, '') : null;

// Require mongoose from backend local node_modules
const mongoose = require('c:/Users/HP/OneDrive/Desktop/clinic new life/backend/node_modules/mongoose');

// Require models first
require('c:/Users/HP/OneDrive/Desktop/clinic new life/backend/models/User');
require('c:/Users/HP/OneDrive/Desktop/clinic new life/backend/models/Patient');
require('c:/Users/HP/OneDrive/Desktop/clinic new life/backend/models/InventoryItem');
require('c:/Users/HP/OneDrive/Desktop/clinic new life/backend/models/Prescription');

// Require config or emulate tenantcontext
const { setTenantInCurrentContext, getCurrentTenantId } = require('c:/Users/HP/OneDrive/Desktop/clinic new life/backend/config/tenantContext');
// Apply plugin
require('c:/Users/HP/OneDrive/Desktop/clinic new life/backend/config/tenantIsolation');

async function test() {
  try {
    await mongoose.connect(mongoURI);
    console.log('Connected to MongoDB');

    const Prescription = mongoose.model('Prescription');
    const User = mongoose.model('User');
    const Patient = mongoose.model('Patient');

    const sami = await User.findOne({ $or: [{ username: /sami/i }, { firstName: /sami/i }] });
    if (!sami) {
      console.log('Sami user not found!');
      return;
    }
    console.log('Sami User ID:', sami._id, 'username:', sami.username, 'clinicId:', sami.clinicId);

    // Let's first query without tenant context (using skipTenantScope)
    console.log('--- Unscoped Query ---');
    const doctorObjId = sami._id;
    const doctorOrAssignedPatientFilter = [{ doctor: doctorObjId }, { doctorId: doctorObjId }];
    const andClauses = [{ $or: doctorOrAssignedPatientFilter }];
    const filter = { $and: andClauses };

    const unscoped = await Prescription.find(filter)
      .setOptions({ skipTenantScope: true })
      .lean();
    console.log('Unscoped results count:', unscoped.length);
    for (const r of unscoped) {
      console.log('Rx:', r._id, 'clinicId:', r.clinicId, 'medName:', r.medicationName, 'doctor:', r.doctor, 'doctorId:', r.doctorId);
    }

    console.log('--- Scoped Query ---');
    setTenantInCurrentContext(sami.clinicId || 'nat-clinic');
    console.log('Current tenant in context:', getCurrentTenantId());

    try {
      const scoped = await Prescription.find(filter)
        .maxTimeMS(5000)
        .lean();
      console.log('Scoped results count:', scoped.length);
      for (const r of scoped) {
        console.log('Rx:', r._id, 'clinicId:', r.clinicId, 'medName:', r.medicationName);
      }
    } catch (err) {
      console.error('Scoped query failed:', err.message);
    }

  } catch (e) {
    console.error('Test error:', e);
  } finally {
    await mongoose.disconnect();
  }
}

test();
