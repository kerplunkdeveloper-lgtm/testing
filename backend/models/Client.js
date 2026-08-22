const mongoose = require("mongoose");

const clientSchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      required: true,
      trim: true,
    },

    industry: {
      type: String,
      required: true,
      trim: true,
    },

    onboardingDate: {
      type: Date,
      default: Date.now,
    },

    phoneNumber: {
      type: String,
      required: true,
      trim: true,
    },

    spoc: {
      type: String,
      trim: true,
    },

    designation: {
      type: String,
      trim: true,
    },

    budget: {
      type: Number,
      required: true,
      default: 0,
    },

    gst: {
      type: Number,
      default: 18,
    },

    totalBudget: {
      type: Number,
      default: 0,
    },

    service: {
      type: [String],
      enum: [
        "Digital Marketing",
        "Website",
        "SEO",
        "Additional work",
        "Video Production",
        "Others",
      ],
      required: true,
    },

    // DIGITAL MARKETING
    reels: {
      type: Number,
      default: 0,
    },

    posts: {
      type: Number,
      default: 0,
    },

    story: {
      type: Number,
      default: 0,
    },

    needDslr: {
      type: String,
      enum: ["Need DSLR", "No DSLR", ""],
      default: "",
    },

    // WEBSITE
    pages: {
      type: Number,
      default: 0,
    },

    // SEO
    onpage: {
      type: Boolean,
      default: false,
    },

    offpage: {
      type: Boolean,
      default: false,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    assignedTo: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    }],

    color: {
      type: String,
      default: "#3b82f6",
    },

    icon: {
      type: String,
      default: "FaRegBuilding",
    },
    
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "Client",
  clientSchema
);