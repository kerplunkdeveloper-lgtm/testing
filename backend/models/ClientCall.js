const mongoose = require('mongoose');

const clientCallSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      default: Date.now,
      required: true,
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      required: true,
    },
    discussionPoints: {
      type: String,
    },
    startTime: {
      type: String, // HH:MM format
      required: true,
    },
    endTime: {
      type: String, // HH:MM format
      required: true,
    },
    duration: {
      type: String, // E.g., "1 hr 30 mins"
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('ClientCall', clientCallSchema);
