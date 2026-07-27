const express = require('express');
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  markAllChatAsRead,
  deleteNotification,
} = require('../controllers/notificationController');

const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/', getNotifications);
router.put('/read-all', markAllAsRead);
router.put('/read-all-chat', markAllChatAsRead);
router.put('/:id/read', markAsRead);
router.delete('/:id', deleteNotification);

module.exports = router;
