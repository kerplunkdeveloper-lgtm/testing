const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name'],
  },

  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
  },

  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: 6,
    select: false,
  },

  role: {
    type: String,
    enum: ['admin', 'operationmanager', 'team'],
    default: 'team',
  },

  taskSections: {
    type: [String],
    default: ["Recently assigned", "Do today", "Do next week", "Do later"],
  },

  department: {
    type: String,
  },

  location: {
    type: String,
    default: "",
    trim: true,
  },

  salary: {
    type: Number,
    default: function() {
      if (this.role === 'admin') return 0;
      if (this.role === 'operationmanager') return 35000;
      return 22000;
    },
  },

  overheadPercent: {
    type: Number,
    default: function() {
      if (this.role === 'admin') return 0;
      return 15;
    },
  },

  capacity: {
    type: Number,
    default: function() {
      if (this.role === 'admin') return 20;
      if (this.role === 'operationmanager') return 12;
      return 8;
    },
  },

  profile: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Profile',
  },

  permissions: {
    type: Object,
    default: {},
  },

  accentColor: {
    type: String,
    default: 'emerald',
  },

  themePreference: {
    type: String,
    default: 'light',
  },

  soundEnabled: {
    type: Boolean,
    default: true,
  },

  fontFamily: {
    type: String,
    default: 'inter',
  },

  sidebarLayout: {
    type: String,
    default: 'vertical',
  },

  lastSeen: {
    type: Date,
    default: Date.now,
  },

  employmentStatus: {
    type: String,
    enum: ['active', 'relieved'],
    default: 'active',
  },

  accountStatus: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
  },

  relievedAt: {
    type: Date,
    default: null,
  },

  relievedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },

  relievedReason: {
    type: String,
    default: '',
    trim: true,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Encrypt password
userSchema.pre('save', async function () {

  if (!this.isModified('password')) {
    return;
  }

  const salt = await bcrypt.genSalt(10);

  this.password = await bcrypt.hash(this.password, salt);
});

// Generate JWT
userSchema.methods.getSignedJwtToken = function () {
  return jwt.sign(
    { id: this._id, role: this.role },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRE,
    }
  );
};

// Match Password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);