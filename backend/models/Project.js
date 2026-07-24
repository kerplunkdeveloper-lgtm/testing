const mongoose = require("mongoose");

const ProjectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please add a project name"],
      trim: true,
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },
    status: {
      type: String,
      enum: ["Active", "Completed", "On Hold", "Inactive"],
      default: "Active",
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

// Index to optimize project queries by client
ProjectSchema.index({ client: 1 });

module.exports = mongoose.model("Project", ProjectSchema);
