const express = require('express');
const {
  createServiceRequest,
  getServiceRequests,
  getServiceRequest,
  updateServiceRequest,
  deleteServiceRequest
} = require('../controllers/serviceRequestController');

const router = express.Router();

const { auth } = require('../middleware/auth');

router.use(auth);

router
  .route('/')
  .get(getServiceRequests)
  .post(createServiceRequest);

router
  .route('/:id')
  .get(getServiceRequest)
  .put(updateServiceRequest)
  .delete(deleteServiceRequest);

module.exports = router; 
