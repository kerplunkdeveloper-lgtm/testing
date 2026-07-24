const express = require('express');
const {
  register,
  login,
  logout,
  impersonateUser,
} = require('../controllers/authController');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.post('/impersonate', protect, authorize('admin'), impersonateUser);

module.exports = router;