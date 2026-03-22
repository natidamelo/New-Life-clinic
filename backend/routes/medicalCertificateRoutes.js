const express = require('express');
const path = require('path');
const router = express.Router();
const { auth } = require('../middleware/auth');

// Serve the medical certificate form
router.get('/form', auth, (req, res) => {
    res.sendFile(path.join(__dirname, '../public/medical-certificates/certificate-form.html'));
});

// Serve static files for medical certificates
router.use('/static', express.static(path.join(__dirname, '../public/medical-certificates')));

module.exports = router;
