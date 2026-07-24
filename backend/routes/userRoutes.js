const express = require('express');

const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
} = require('../controllers/userController');

const { protect, authorize } = require('../middleware/auth');

const router = express.Router();


// READ - All roles
router.get(
  '/',
  protect,
  authorize('admin', 'operationmanager', 'team'),
  getUsers
);

router.get(
  '/:id',
  protect,
  authorize('admin', 'operationmanager', 'team'),
  getUser
);


// CREATE - Admin only
router.post(
  '/',
  protect,
  authorize('admin'),
  createUser
);


// UPDATE CURRENT USER PREFERENCES
router.put(
  '/me',
  protect,
  updateUser
);

// UPDATE - Admin only
router.put(
  '/:id',
  protect,
  authorize('admin'),
  updateUser
);


// DELETE - Admin only
router.delete(
  '/:id',
  protect,
  authorize('admin'),
  deleteUser
);

module.exports = router;