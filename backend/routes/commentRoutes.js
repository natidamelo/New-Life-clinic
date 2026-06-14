const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');
const { auth } = require('../middleware/auth');

router.route('/')
  .get(auth, commentController.getComments)
  .post(auth, commentController.createComment);

module.exports = router;
