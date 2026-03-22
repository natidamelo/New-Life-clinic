/**
 * Run restore-missing-tasks for a patient by name.
 * Usage: from backend folder:
 *   node scripts/run-restore-missing-tasks-dawit.js
 *   node scripts/run-restore-missing-tasks-dawit.js "Melona Gizachewu"
 * Requires: backend server running (e.g. npm start) and MongoDB.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms';
const API_BASE = process.env.API_BASE || 'http://localhost:5002';

const searchName = process.argv[2] || 'Dawit Adibar';
const nameParts = searchName.trim().split(/\s+/);
const first = nameParts[0] || '';
const last = nameParts.slice(1).join(' ') || '';

async function main() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const Patient = require('../models/Patient');
    const patient = await Patient.findOne({
      $or: [
        { firstName: new RegExp(first, 'i'), lastName: new RegExp(last, 'i') },
        { firstName: first, lastName: last }
      ]
    });

    if (!patient) {
      console.log('Patient "' + searchName + '" not found.');
      const any = await Patient.find({}).select('firstName lastName _id').limit(5).lean();
      console.log('Sample patients:', any);
      process.exit(1);
    }

    const patientId = patient._id.toString();
    console.log('Found patient:', patient.firstName, patient.lastName, '(' + patientId + ')');

    let result;
    try {
      const url = `${API_BASE}/api/fix-nurse-tasks/restore-missing-tasks`;
      const res = await axios.post(url, { patientId }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 60000
      });
      result = res.data;
    } catch (apiErr) {
      if (apiErr.code === 'ECONNREFUSED') {
        console.log('API not running — running restore in-process...');
        const fixRouter = require('../routes/fix-nurse-tasks');
        const layer = fixRouter.stack.find(l => l.route && l.route.path === '/restore-missing-tasks' && l.route.methods.post);
        const handler = layer && layer.route.stack[0].handle;
        if (!handler) {
          console.error('Could not find restore handler');
          process.exit(1);
        }
        const req = { body: { patientId } };
        const res = {
          _data: null,
          json: (data) => { res._data = data; },
          status: (code) => ({ json: (data) => { res.statusCode = code; res._data = data; } })
        };
        await handler(req, res, () => {});
        if (res.statusCode && res.statusCode >= 400) {
          console.error('Restore failed:', res._data);
          process.exit(1);
        }
        result = res._data;
      } else {
        throw apiErr;
      }
    }

    console.log('Restore response:', result);
    if (result && result.created && result.created.length > 0) {
      console.log('Created', result.created.length, 'task(s):', result.created.map(c => c.medicationName).join(', '));
    }
  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

main();
