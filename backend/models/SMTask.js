const mongoose = require("mongoose");

const SubtaskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  completed: {
    type: Boolean,
    default: false,
  },
});

const SMTaskSchema = new mongoose.Schema(
  {
    taskId: {
      type: String,
      unique: true,
      trim: true,
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },
    category: {
      type: String,
      enum: [
        "Publishing",
        "Community Mgmt",
        "Review & Approval",
        "Content Planning",
        "Coordination",
        "Reporting",
        "Shoot Management",
        "Documentation",
        "Performance Support",
      ],
      default: "Publishing",
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    subType: {
      type: String,
      default: "Post",
    },
    platform: {
      type: [String],
      enum: ["Instagram", "Facebook", "LinkedIn", "YouTube", "X", "TikTok", "Google My Business", "Google Business"],
      default: ["Instagram"],
    },
    dueDate: {
      type: Date,
      required: true,
    },
    dueTime: {
      type: String,
      default: "06:00 PM",
    },
    priority: {
      type: String,
      enum: ["High", "Medium", "Low"],
      default: "Medium",
    },
    status: {
      type: String,
      enum: ["To Do", "In Progress", "Waiting", "Scheduled", "Completed", "Blocked"],
      default: "To Do",
    },
    blocker: {
      type: String,
      default: "-",
    },
    assignee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    notes: {
      type: String,
      default: "",
    },
    subtasks: [SubtaskSchema],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("SMTask", SMTaskSchema);
