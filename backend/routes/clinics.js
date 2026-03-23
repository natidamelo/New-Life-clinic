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

// POST /api/clinics/:clinicRef/migrate-default-data
// Body:
// {
//   sourceClinicId?: "default",
//   dryRun?: true,
//   includeUsers?: true,
//   confirmationCode: "YES_MIGRATE"
// }
router.post('/:clinicRef/migrate-default-data', auth, requireSuperAdmin, async (req, res) => {
  try {
    const { clinicRef } = req.params;
    const {
      sourceClinicId = 'default',
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

    const source = String(sourceClinicId || 'default').trim();
    const target = clinic.slug;
    if (!source || !target) {
      return res.status(400).json({
        success: false,
        message: 'Invalid source/target clinic id'
      });
    }
    if (source === target) {
      return res.status(400).json({
        success: false,
        message: 'Source and target clinic ids are the same'
      });
    }

    const userFilter = { clinicId: source, role: { $ne: 'super_admin' } };
    const dataFilter = { clinicId: source };

    const counts = {
      users: includeUsers ? await User.countDocuments(userFilter).setOptions({ skipTenantScope: true }) : 0,
      patients: await Patient.countDocuments(dataFilter).setOptions({ skipTenantScope: true }),
      medicalRecords: await MedicalRecord.countDocuments(dataFilter).setOptions({ skipTenantScope: true }),
      medicalInvoices: await MedicalInvoice.countDocuments(dataFilter).setOptions({ skipTenantScope: true })
    };

    if (dryRun) {
      return res.json({
        success: true,
        message: 'Dry run complete. No data changed.',
        data: {
          sourceClinicId: source,
          targetClinicId: target,
          dryRun: true,
          wouldMove: counts
        }
      });
    }

    const updates = {
      users: includeUsers
        ? await User.updateMany(userFilter, { $set: { clinicId: target } }).setOptions({ skipTenantScope: true })
        : { matchedCount: 0, modifiedCount: 0 },
      patients: await Patient.updateMany(dataFilter, { $set: { clinicId: target } }).setOptions({
        skipTenantScope: true
      }),
      medicalRecords: await MedicalRecord.updateMany(dataFilter, { $set: { clinicId: target } }).setOptions({
        skipTenantScope: true
      }),
      medicalInvoices: await MedicalInvoice.updateMany(dataFilter, { $set: { clinicId: target } }).setOptions({
        skipTenantScope: true
      })
    };

    return res.json({
      success: true,
      message: 'Migration completed successfully',
      data: {
        sourceClinicId: source,
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

