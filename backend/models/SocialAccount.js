const mongoose = require("mongoose");

const platformCredentialSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      trim: true,
      default: "",
    },
    password: {
      type: String,
      trim: true,
      default: "",
    },
    email: {
      type: String,
      trim: true,
      default: "",
    },
    phoneNumber: {
      type: String,
      trim: true,
      default: "",
    },
    profileUrl: {
      type: String,
      trim: true,
      default: "",
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: false }
);

const customPlatformSchema = new mongoose.Schema(
  {
    platformName: {
      type: String,
      required: true,
      trim: true,
    },
    username: {
      type: String,
      trim: true,
      default: "",
    },
    password: {
      type: String,
      trim: true,
      default: "",
    },
    email: {
      type: String,
      trim: true,
      default: "",
    },
    phoneNumber: {
      type: String,
      trim: true,
      default: "",
    },
    profileUrl: {
      type: String,
      trim: true,
      default: "",
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: true }
);

const socialAccountSchema = new mongoose.Schema(
  {
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      default: null,
    },
    clientName: {
      type: String,
      required: [true, "Client name is required"],
      trim: true,
    },
    registeredEmail: {
      type: String,
      trim: true,
      default: "",
    },
    registeredPhone: {
      type: String,
      trim: true,
      default: "",
    },
    instagram: {
      type: platformCredentialSchema,
      default: () => ({}),
    },
    facebook: {
      type: platformCredentialSchema,
      default: () => ({}),
    },
    googleMyBusiness: {
      type: platformCredentialSchema,
      default: () => ({}),
    },
    tiktok: {
      type: platformCredentialSchema,
      default: () => ({}),
    },
    otherPlatforms: {
      type: [customPlatformSchema],
      default: [],
    },
    twoFactorNotes: {
      type: String,
      trim: true,
      default: "",
    },
    generalNotes: {
      type: String,
      trim: true,
      default: "",
    },
    spoc: {
      type: String,
      trim: true,
      default: "",
    },
    designation: {
      type: String,
      trim: true,
      default: "",
    },
    accountManager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("SocialAccount", socialAccountSchema);
