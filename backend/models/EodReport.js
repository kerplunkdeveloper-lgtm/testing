const mongoose = require("mongoose");

const eodReportSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    date: {
      type: Date,
      default: Date.now,
      required: true,
    },

    clientName: {
      type: String,
      required: [true, "Client Name is required"],
    },

    projectsWorkedOn: {
      type: String,
      required: [true, "Projects Worked On (task name) is required"],
    },

    pendingTasks: {
      type: String,
      default: "", // Optional
    },

    reasonForPending: {
      type: String,
      default: "", // Optional
    },

    timeSpentToday: {
      type: String,
      required: [true, "Time spent today is required"],
    },

    challengesFaced: {
      type: String,
      default: "", // Optional
    },

    tomorrowPlan: {
      type: String,
      required: [true, "Tomorrow plan is required"],
    },

    supportNeeded: {
      type: String,
      default: "", // Optional
    },

    overallStatus: {
      type: String,
      required: [true, "Overall Status is required"],
      enum: ["On Track", "Delayed", "Blocked", "Completed"],
      default: "On Track",
    },

    attachments: [
      {
        url: {
          type: String,
          required: true,
        },
        filename: {
          type: String,
          required: true,
        },
        fileType: String,
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("EodReport", eodReportSchema);
