const express = require('express');

const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  relieveUser,
  reactivateUser,
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
  authorize('admin', 'operationmanager'),
  createUser
);


// UPDATE CURRENT USER PREFERENCES
router.put(
  '/me',
  protect,
  updateUser
);

// RELIEVE USER - Admin only
router.put(
  '/:id/relieve',
  protect,
  authorize('admin', 'operationmanager'),
  relieveUser
);

// REACTIVATE USER - Admin only
router.put(
  '/:id/reactivate',
  protect,
  authorize('admin', 'operationmanager'),
  reactivateUser
);

// UPDATE - Admin only
router.put(
  '/:id',
  protect,
  authorize('admin', 'operationmanager'),
  updateUser
);


// DELETE - Admin only
router.delete(
  '/:id',
  protect,
  authorize('admin', 'operationmanager'),
  deleteUser
);

module.exports = router;