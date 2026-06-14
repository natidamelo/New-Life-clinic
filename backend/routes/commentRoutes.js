const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');
const { protect } = require('../middleware/authMiddleware'); // Verify this path

router.route('/')
  .get(protect, commentController.getComments)
  .post(protect, commentController.createComment);

module.exports = router;
