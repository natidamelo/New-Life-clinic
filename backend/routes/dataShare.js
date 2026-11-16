const router = require('express').Router();
const { auth } = require('../middleware/auth');
const { checkRole } = require('../middleware/auth');
const ctrl = require('../controllers/dataShareController');

// Admin-only: create/list/revoke/delete shares
router.post('/shares', auth, checkRole('admin'), ctrl.createShare);
router.get('/shares', auth, checkRole('admin'), ctrl.listShares);
router.patch('/shares/:id/revoke', auth, checkRole('admin'), ctrl.revokeShare);
router.delete('/shares/:id', auth, checkRole('admin'), ctrl.deleteShare);

// Admin-only preview & stats
router.get('/stats', auth, checkRole('admin'), ctrl.getStats);
router.get('/preview/:dataset', auth, checkRole('admin'), ctrl.getDatasetPreview);

// Admin-only export endpoint
router.get('/export/:dataset', auth, checkRole('admin'), ctrl.exportDataset);

// Public/role-guarded share consumption via token
router.get('/shared/:token', auth, ctrl.consumeShare);

module.exports = router;
