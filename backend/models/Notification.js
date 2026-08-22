const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: ['task_assigned', 'task_updated', 'project_assigned', 'client_assigned', 'general', 'message_received', 'mention_received', 'reaction_received', 'report_submitted', 'client_call_created'],
    default: 'general',
  },
  message: {
    type: String,
    required: true,
  },
  task: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
  },
  messageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
  },
  chatRoomId: {
    type: String,
  },
  chatRoomType: {
    type: String,
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Optimize queries for finding user notifications, sorting by date, and checking unread counts
NotificationSchema.index({ recipient: 1, isRead: 1 });
NotificationSchema.index({ createdAt: -1 });

NotificationSchema.pre('save', async function () {
  if (this.recipient) {
    const User = mongoose.model('User');
    const user = await User.findById(this.recipient).select('employmentStatus accountStatus');
    if (user && (user.employmentStatus === 'relieved' || user.accountStatus === 'inactive')) {
      const err = new Error('Recipient is relieved/inactive. Notification suppressed.');
      err.name = 'NotificationSuppressed';
      throw err;
    }
  }
});

module.exports = mongoose.model('Notification', NotificationSchema);
