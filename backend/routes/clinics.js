const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Clinic = require('../models/Clinic');
const User = require('../models/User');
const Patient = require('../models/Patient');
const MedicalRecord = require('../models/MedicalRecord');
const MedicalInvoice = require('../models/MedicalInvoice');
const { auth } = require('../middleware/auth');

function requireSuperAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'super_admin') {
    return res.status(403).json({
      success: false,
      message: 'Only super admin can manage clinics'
    });
  }
  return next();
}

function toSlug(value = '') {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function resolveClinic(clinicRef) {
  if (!clinicRef) return null;
  const filters = [{ slug: String(clinicRef).toLowerCase() }];
  if (mongoose.Types.ObjectId.isValid(clinicRef)) {
    filters.push({ _id: clinicRef });
  }
  return Clinic.findOne({ $or: filters });
}

// GET /api/clinics
router.get('/', auth, requireSuperAdmin, async (req, res) => {
  try {
    const clinics = await Clinic.find({}).sort({ createdAt: -1 }).lean();

    const statsByClinic = await User.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$clinicId',
          totalUsers: { $sum: 1 },
          adminUsers: {
            $sum: {
              $cond: [{ $eq: ['$role', 'admin'] }, 1, 0]
            }
          }
        }
      }
    ]);

    const statsMap = new Map(statsByClinic.map((x) => [x._id, x]));
    const clinicList = clinics.map((clinic) => {
      const stats = statsMap.get(clinic.slug) || { totalUsers: 0, adminUsers: 0 };
      return {
        ...clinic,
        totalUsers: stats.totalUsers || 0,
        adminUsers: stats.adminUsers || 0
      };
    });

    return res.json({
      success: true,
      data: clinicList
    });
  } catch (error) {
    console.error('Error loading clinics:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load clinics',
      error: error.message
    });
  }
});

// POST /api/clinics
router.post('/', auth, requireSuperAdmin, async (req, res) => {
  try {
    const { name, slug, contactEmail, contactPhone } = req.body || {};
    const clinicName = String(name || '').trim();
    const clinicSlug = toSlug(slug || name);

    if (!clinicName) {
      return res.status(400).json({
        success: false,
        message: 'Clinic name is required'
      });
    }

    if (!clinicSlug) {
      return res.status(400).json({
        success: false,
        message: 'Clinic slug is required'
      });
    }

    const existing = await Clinic.findOne({ slug: clinicSlug });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Clinic slug already exists'
      });
    }

    const clinic = await Clinic.create({
      name: clinicName,
      slug: clinicSlug,
      contactEmail: contactEmail ? String(contactEmail).trim().toLowerCase() : undefined,
      contactPhone: contactPhone ? String(contactPhone).trim() : undefined,
      isActive: true
    });

    return res.status(201).json({
      success: true,
      message: 'Clinic created successfully',
      data: clinic
    });
  } catch (error) {
    console.error('Error creating clinic:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create clinic',
      error: error.message
    });
  }
});

// PATCH /api/clinics/:clinicRef/status
router.patch('/:clinicRef/status', auth, requireSuperAdmin, async (req, res) => {
  try {
    const { clinicRef } = req.params;
    const { isActive } = req.body || {};

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isActive must be a boolean'
      });
    }

    const clinic = await resolveClinic(clinicRef);
    if (!clinic) {
      return res.status(404).json({
        success: false,
        message: 'Clinic not found'
      });
    }

    clinic.isActive = isActive;
    await clinic.save();

    return res.json({
      success: true,
      message: `Clinic ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: clinic
    });
  } catch (error) {
    console.error('Error updating clinic status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update clinic status',
      error: error.message
    });
  }
});

// POST /api/clinics/:clinicRef/assign-admin
router.post('/:clinicRef/assign-admin', auth, requireSuperAdmin, async (req, res) => {
  try {
    const { clinicRef } = req.params;
    const { userId, identifier, makeAdmin = true } = req.body || {};

    const clinic = await resolveClinic(clinicRef);
    if (!clinic) {
      return res.status(404).json({
        success: false,
        message: 'Clinic not found'
      });
    }

    if (!clinic.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Cannot assign admin to an inactive clinic'
      });
    }

    let user = null;
    if (userId) {
      user = await User.findById(userId).setOptions({ skipTenantScope: true });
    } else if (identifier) {
      const value = String(identifier).trim();
      user = await User.findOne({
        $or: [{ email: new RegExp(`^${value}$`, 'i') }, { username: new RegExp(`^${value}$`, 'i') }]
      }).setOptions({ skipTenantScope: true });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.role === 'super_admin') {
      return res.status(400).json({
        success: false,
        message: 'Cannot assign super admin as clinic admin'
      });
    }

    user.clinicId = clinic.slug;
    if (makeAdmin && user.role !== 'admin') {
      user.role = 'admin';
    }
    await user.save();

    return res.json({
      success: true,
      message: `User assigned to clinic ${clinic.name} successfully`,
      data: {
        clinic: {
          _id: clinic._id,
          name: clinic.name,
          slug: clinic.slug
        },
        user: {
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
          email: user.email,
          role: user.role,
          clinicId: user.clinicId
        }
      }
    });
  } catch (error) {
    console.error('Error assigning clinic admin:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to assign clinic admin',
      error: error.message
    });
  }
});

// POST /api/clinics/:clinicRef/rehome-all-data
// Sets clinicId to this clinic's slug on every document (all collections) that is not already that slug,
// including missing/null/empty clinicId and legacy values (default, clinicnew, etc.).
// For single-organization databases only. Super admins are not modified on the users collection.
// Body: { dryRun?: boolean, confirmationCode: "REHOME_ALL_TO_CLINIC" }
router.post('/:clinicRef/rehome-all-data', auth, requireSuperAdmin, async (req, res) => {
  try {
    const { clinicRef } = req.params;
    const { dryRun = true, confirmationCode } = req.body || {};

    if (!dryRun && confirmationCode !== 'REHOME_ALL_TO_CLINIC') {
      return res.status(400).json({
        success: false,
        message: 'To apply changes, set confirmationCode to REHOME_ALL_TO_CLINIC and dryRun: false.'
      });
    }

    const clinic = await resolveClinic(clinicRef);
    if (!clinic) {
      return res.status(404).json({ success: false, message: 'Clinic not found' });
    }

    const target = clinic.slug;
    if (!target) {
      return res.status(400).json({ success: false, message: 'Clinic has no slug' });
    }

    const notYetThisClinic = {
      $or: [
        { clinicId: { $exists: false } },
        { clinicId: null },
        { clinicId: '' },
        { clinicId: { $ne: target } }
      ]
    };

    const db = mongoose.connection.db;
    const listed = await db.listCollections().toArray();
    const names = listed.map((c) => c.name).filter(Boolean);

    const perCollection = [];
    let totalWouldModify = 0;

    for (const name of names) {
      const lower = name.toLowerCase();
      if (lower.startsWith('system.')) continue;
      if (lower === 'clinics') continue;

      const coll = db.collection(name);
      let filter = notYetThisClinic;
      if (name === User.collection.collectionName) {
        filter = { $and: [notYetThisClinic, { role: { $ne: 'super_admin' } }] };
      }

      try {
        const count = await coll.countDocuments(filter);
        if (count > 0) {
          perCollection.push({ collection: name, count });
          totalWouldModify += count;
        }
        if (!dryRun && count > 0) {
          await coll.updateMany(filter, { $set: { clinicId: target } });
        }
      } catch (err) {
        perCollection.push({ collection: name, count: 0, error: err.message });
      }
    }

    return res.json({
      success: true,
      message: dryRun
        ? 'Dry run — no data changed. Review counts, then call with dryRun: false.'
        : 'All eligible documents updated to this clinic slug.',
      data: {
        targetClinicId: target,
        dryRun: Boolean(dryRun),
        totalDocuments: totalWouldModify,
        perCollection
      }
    });
  } catch (error) {
    console.error('Error rehoming clinic data:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to rehome clinic data',
      error: error.message
    });
  }
});

// POST /api/clinics/:clinicRef/migrate-default-data
// Body:
// {
//   sourceClinicId?: "default",
//   sourceClinicIds?: ["default", "clinicnew"],
//   dryRun?: true,
//   includeUsers?: true,
//   confirmationCode: "YES_MIGRATE"
// }
router.post('/:clinicRef/migrate-default-data', auth, requireSuperAdmin, async (req, res) => {
  try {
    const { clinicRef } = req.params;
    const {
      sourceClinicId = 'default',
      sourceClinicIds,
      dryRun = true,
      includeUsers = true,
      confirmationCode
    } = req.body || {};

    if (confirmationCode !== 'YES_MIGRATE') {
      return res.status(400).json({
        success: false,
        message: 'Invalid confirmationCode. Use YES_MIGRATE.'
      });
    }

    const clinic = await resolveClinic(clinicRef);
    if (!clinic) {
      return res.status(404).json({
        success: false,
        message: 'Clinic not found'
      });
    }

    const target = clinic.slug;
    const sources = Array.isArray(sourceClinicIds) && sourceClinicIds.length > 0
      ? sourceClinicIds.map((s) => String(s).trim()).filter(Boolean)
      : [String(sourceClinicId || 'default').trim()].filter(Boolean);

    if (!target) {
      return res.status(400).json({
        success: false,
        message: 'Invalid target clinic id'
      });
    }
    if (sources.length === 1 && sources[0] === target) {
      return res.status(400).json({
        success: false,
        message: 'Source and target clinic ids are the same'
      });
    }

    const tenantSourceFilter = {
      $or: [
        ...sources.map((s) => ({ clinicId: s })),
        { clinicId: null },
        { clinicId: '' },
        { clinicId: { $exists: false } }
      ]
    };
    const userFilter = { ...tenantSourceFilter, role: { $ne: 'super_admin' } };
    const dataFilter = tenantSourceFilter;

    // Use raw collections to bypass any tenant scoping middleware/plugins entirely.
    const usersCol = mongoose.connection.collection(User.collection.collectionName);
    const patientsCol = mongoose.connection.collection(Patient.collection.collectionName);
    const recordsCol = mongoose.connection.collection(MedicalRecord.collection.collectionName);
    const invoicesCol = mongoose.connection.collection(MedicalInvoice.collection.collectionName);

    const counts = {
      users: includeUsers ? await usersCol.countDocuments(userFilter) : 0,
      patients: await patientsCol.countDocuments(dataFilter),
      medicalRecords: await recordsCol.countDocuments(dataFilter),
      medicalInvoices: await invoicesCol.countDocuments(dataFilter)
    };

    if (dryRun) {
      return res.json({
        success: true,
        message: 'Dry run complete. No data changed.',
        data: {
          sourceClinicIds: sources,
          targetClinicId: target,
          dryRun: true,
          wouldMove: counts
        }
      });
    }

    const updates = {
      users: includeUsers
        ? await usersCol.updateMany(userFilter, { $set: { clinicId: target } })
        : { matchedCount: 0, modifiedCount: 0 },
      patients: await patientsCol.updateMany(dataFilter, { $set: { clinicId: target } }),
      medicalRecords: await recordsCol.updateMany(dataFilter, { $set: { clinicId: target } }),
      medicalInvoices: await invoicesCol.updateMany(dataFilter, { $set: { clinicId: target } })
    };

    return res.json({
      success: true,
      message: 'Migration completed successfully',
      data: {
        sourceClinicIds: sources,
        targetClinicId: target,
        dryRun: false,
        beforeCounts: counts,
        moved: {
          users: {
            matched: updates.users.matchedCount || 0,
            modified: updates.users.modifiedCount || 0
          },
          patients: {
            matched: updates.patients.matchedCount || 0,
            modified: updates.patients.modifiedCount || 0
          },
          medicalRecords: {
            matched: updates.medicalRecords.matchedCount || 0,
            modified: updates.medicalRecords.modifiedCount || 0
          },
          medicalInvoices: {
            matched: updates.medicalInvoices.matchedCount || 0,
            modified: updates.medicalInvoices.modifiedCount || 0
          }
        }
      }
    });
  } catch (error) {
    console.error('Error migrating clinic data:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to migrate clinic data',
      error: error.message
    });
  }
});

module.exports = router;

