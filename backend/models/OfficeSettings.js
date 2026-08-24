const mongoose = require("mongoose");

const OfficeSettingsSchema = new mongoose.Schema({
  key: {
    type: String,
    default: "global",
    unique: true,
    immutable: true,
  },

  startHour: {
    type: Number,
    default: 9,
    min: 0,
    max: 23,
    required: true,
  },

  endHour: {
    type: Number,
    default: 19,
    min: 1,
    max: 24,
    required: true,
    validate: {
      validator(value) {
        return value > this.startHour;
      },
      message: "End hour must be greater than start hour.",
    },
  },

  workingDays: {
    type: [Number],
    default: [1, 2, 3, 4, 5, 6], // 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  },

  breakStartHour: {
    type: Number,
    default: 13,
    min: 0,
    max: 23,
  },

  breakEndHour: {
    type: Number,
    default: 14,
    min: 0,
    max: 23,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model("OfficeSettings", OfficeSettingsSchema);