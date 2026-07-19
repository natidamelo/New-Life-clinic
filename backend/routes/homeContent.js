const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const HomeContent = require('../models/HomeContent');
const User = require('../models/User');
const Patient = require('../models/Patient');
const Service = require('../models/Service');

// ─── Helper: inject real DB counts into stats ────────────────────────────────
async function injectRealCounts(content) {
  if (!content.useRealCounts) return content;

  try {
    const [doctorCount, patientCount, serviceCount] = await Promise.all([
      User.countDocuments({ role: { $in: ['doctor'] }, isActive: true }),
      Patient.countDocuments({}),
      Service.countDocuments({ isActive: true })
    ]);

    const countMap = {
      doctors: doctorCount > 0 ? `${doctorCount}+` : content.stats.find((s) => s.dynamicKey === 'doctors')?.value || '30+',
      patients: patientCount > 1000
        ? `${Math.round(patientCount / 1000)}k+`
        : patientCount > 0
        ? `${patientCount}+`
        : content.stats.find((s) => s.dynamicKey === 'patients')?.value || '25k+',
      services: serviceCount > 0 ? `${serviceCount}+` : content.stats.find((s) => s.dynamicKey === 'services')?.value || '250+'
    };

    const enrichedStats = content.stats.map((stat) => {
      if (stat.dynamicKey && countMap[stat.dynamicKey]) {
        return { ...stat.toObject ? stat.toObject() : stat, value: countMap[stat.dynamicKey] };
      }
      return stat.toObject ? stat.toObject() : stat;
    });

    const plain = content.toObject ? content.toObject() : { ...content };
    plain.stats = enrichedStats;
    plain._realCounts = { doctorCount, patientCount, serviceCount };
    return plain;
  } catch (err) {
    console.error('[HomeContent] Error injecting real counts:', err);
    return content;
  }
}

// ─── GET /api/home-content — Public, no auth required ───────────────────────
router.get('/', async (req, res) => {
  try {
    const clinicId = req.headers['x-clinic-id'] || 'new-life';
    let content = await HomeContent.getForClinic(clinicId);
    content = await injectRealCounts(content);
    return res.json({ success: true, data: content });
  } catch (error) {
    console.error('[HomeContent] GET error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load home content', error: error.message });
  }
});

// ─── PUT /api/home-content — Admin only ─────────────────────────────────────
router.put('/', auth, authorize('admin'), async (req, res) => {
  try {
    const clinicId = req.user?.clinicId || req.headers['x-clinic-id'] || 'new-life';
    const updates = req.body || {};

    // Remove protected fields
    delete updates._id;
    delete updates.__v;
    delete updates.createdAt;
    delete updates.updatedAt;
    delete updates._realCounts;

    let doc = await HomeContent.findOne({ clinicId });
    if (!doc) {
      doc = await HomeContent.create({ clinicId, ...updates });
    } else {
      Object.assign(doc, updates);
      await doc.save();
    }

    return res.json({ success: true, message: 'Home content updated', data: doc });
  } catch (error) {
    console.error('[HomeContent] PUT error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update home content', error: error.message });
  }
});

// ─── GET /api/home-content/stats — Public: live DB counts only ──────────────
router.get('/stats', async (req, res) => {
  try {
    const [doctorCount, patientCount, serviceCount] = await Promise.all([
      User.countDocuments({ role: 'doctor', isActive: true }),
      Patient.countDocuments({}),
      Service.countDocuments({ isActive: true })
    ]);

    return res.json({
      success: true,
      data: {
        doctors: doctorCount,
        patients: patientCount,
        services: serviceCount
      }
    });
  } catch (error) {
    console.error('[HomeContent] stats error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch stats' });
  }
});

// ─── POST /api/home-content/reset — Admin only: reset to defaults ───────────
router.post('/reset', auth, authorize('admin'), async (req, res) => {
  try {
    const clinicId = req.user?.clinicId || 'new-life';
    await HomeContent.deleteOne({ clinicId });
    const fresh = await HomeContent.getForClinic(clinicId);
    return res.json({ success: true, message: 'Home content reset to defaults', data: fresh });
  } catch (error) {
    console.error('[HomeContent] reset error:', error);
    return res.status(500).json({ success: false, message: 'Failed to reset home content' });
  }
});

module.exports = router;
