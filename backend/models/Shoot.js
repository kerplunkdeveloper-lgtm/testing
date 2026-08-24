const mongoose = require('mongoose');

const shootSchema = new mongoose.Schema({
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true,
  },
  shootTitle: {
    type: String,
    required: true,
    trim: true,
  },
  shootType: {
    type: String,
    required: true,
    enum: [
      'Food Shoot',
      'Product Shoot',
      'Fashion Shoot',
      'Event Shoot',
      'Video Shoot',
      'Photo Shoot',
      'Other'
    ],
  },
  description: {
    type: String,
    trim: true,
  },
  schedule: {
    shootDate: {
      type: Date,
      required: true,
    },
    startTime: {
      type: String,
      required: true,
    },
    endTime: {
      type: String,
      required: true,
    },
  },
  location: {
    type: String,
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  shootTeam: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  purpose: {
    type: String,
  },
  contentUse: {
    type: String,
  },
  weather: {
    type: String,
  },
  transport: {
    type: String,
  },
  estimatedBudget: {
    type: Number,
  },
  clientContact: {
    name: String,
    phone: String,
  },
  shootSchedule: [{
    time: String,
    task: String,
  }],
  checklist: [{
    task: String,
    isCompleted: {
      type: Boolean,
      default: false
    }
  }],
  notes: {
    type: String,
  },
  specialInstructions: {
    type: String,
  },
  attachedFiles: [{
    fileName: String,
    fileUrl: String,
    fileType: String,
    fileSize: String,
  }],
  status: {
    type: String,
    default: 'Planned',
    enum: [
      'Planned',
      'Confirmed',
      'In Progress',
      'Completed',
      'Pending Approval',
      'At Risk',
      'Cancelled'
    ],
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

// Create indexes to optimize calendar queries
shootSchema.index({ 'schedule.shootDate': 1 });
shootSchema.index({ status: 1 });
shootSchema.index({ shootType: 1 });
shootSchema.index({ client: 1 });

module.exports = mongoose.model('Shoot', shootSchema);
