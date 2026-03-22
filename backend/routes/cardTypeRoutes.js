const express = require('express');
const router = express.Router();
// Import the whole module
const cardTypeController = require('../controllers/cardTypeController'); 
const { auth, checkRole } = require('../middleware/auth');

// Public routes
// Access methods from the imported object
router.get('/', cardTypeController.getCardTypes);
router.get('/:id', cardTypeController.getCardTypeById);

// Admin routes
router.post('/', auth, checkRole('admin'), cardTypeController.createCardType);
router.put('/:id', auth, checkRole('admin'), cardTypeController.updateCardType);
router.delete('/:id', auth, checkRole('admin'), cardTypeController.deleteCardType);

module.exports = router; 
