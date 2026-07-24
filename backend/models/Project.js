const mongoose = require("mongoose");

const ProjectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please add a project name"],
      trim: true,
    },
    status: {
      type: String,
      enum: ["Active", "Completed", "On Hold", "Inactive"],
      default: "Active",
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
    },
    access: {
      type: String,
      enum: ["Public", "Private"],
      default: "Public",
    },
    sections: {
      type: [String],
      default: ["Recently assigned"],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Project", ProjectSchema);
