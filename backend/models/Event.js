const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a title'],
  },
  description: String,
  date: {
    type: Date,
    required: [true, 'Please add a date'],
  },
  type: {
    type: String,
    enum: ['Post', 'Reel', 'Story', 'Ad', 'Report', 'Birthday Celebration'],
    default: 'Post',
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
  },
  color: {
    type: String,
    default: '#3b82f6',
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

module.exports = mongoose.model('Event', eventSchema);
