const express = require('express');
const {
  createCall,
  getCalls,
  updateCall,
  deleteCall
} = require('../controllers/clientCallController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Currently applying protect middleware assuming user must be logged in to create/view calls
router.route('/')
  .post(protect, createCall)
  .get(protect, getCalls);

router.route('/:id')
  .put(protect, updateCall)
  .delete(protect, deleteCall);

module.exports = router;
