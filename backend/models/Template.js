const mongoose = require("mongoose");

const templateSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    type: {
      type: String,
      enum: [
        "Onboarding",
        "Service Process",
        "Checklist",
        "Campaign",
      ],
      required: true,
    },

    description: {
      type: String,
      required: true,
    },

    services: [
      {
        type: String,
        enum: ["SMM", "SEO", "Ads", "Video"],
      },
    ],

    totalTasks: {
      type: Number,
      default: 0,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "Template",
  templateSchema
);