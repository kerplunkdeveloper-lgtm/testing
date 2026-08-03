const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema({
  taskName: {
    type: String,
    trim: true,
    default: "",
  },
  startDate: {
    type: Date,
  },
  endDate: {
    type: Date,
  },
  completed: {
    type: Boolean,
    default: false,
  },
  completedAt: {
    type: Date,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Goal', goalSchema);
