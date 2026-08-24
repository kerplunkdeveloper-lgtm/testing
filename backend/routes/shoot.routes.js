const express = require('express');
const {
  createShoot,
  getShoots,
  getShoot,
  updateShoot,
  updateShootStatus,
  deleteShoot
} = require('../controllers/shoot.controller');

const { protect } = require('../middleware/auth');

const router = express.Router();

router
  .route('/')
  .post(protect, createShoot)
  .get(protect, getShoots);

// Static/specific routes before /:id if any exist in the future

router
  .route('/:id/status')
  .patch(protect, updateShootStatus);

router
  .route('/:id')
  .get(protect, getShoot)
  .put(protect, updateShoot)
  .delete(protect, deleteShoot);

module.exports = router;
