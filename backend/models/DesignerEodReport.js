const mongoose = require("mongoose");

const designerEodReportSchema = new mongoose.Schema(
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

    // New nested tasks layout
    tasks: [
      {
        taskId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Task",
        },
        title: String,
        project: String,
        priority: String,
        contentType: String,
        client: String,
        revisions: {
          type: Number,
          default: 0,
        },
        loggedTime: String,
        statusAtEod: {
          type: String,
          enum: ["Pending", "In Progress", "Completed", "On Hold", "IN-REVIEW", "In Review", "IN-Review", "Rejected"],
          default: "Pending",
        },
        outputLink: String,
        reason: String, // Reason for Pending / Rejection
        nextAction: String,
        feedback: String,
        reviewedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        createdAt: {
          type: Date,
        },
      },
    ],

    // New day summary fields
    daySummary: {
      toolsIssues: { type: String, default: "" },
      clientCalls: { type: String, default: "" },
      anythingElseOps: { type: String, default: "" },
    },

    isDraft: {
      type: Boolean,
      default: true,
    },

    // Retaining old fields for backward compatibility to avoid validator failures
    clientName: {
      type: String,
      default: "",
    },
    projectsWorkedOn: {
      type: String,
      default: "",
    },
    designCount: {
      type: String,
      default: "",
    },
    filesSubmitted: {
      type: String,
      default: "",
    },
    pendingTasks: {
      type: String,
      default: "",
    },
    reasonForPending: {
      type: String,
      default: "",
    },
    timeSpentToday: {
      type: String,
      default: "",
    },
    challengesFaced: {
      type: String,
      default: "",
    },
    tomorrowPlan: {
      type: String,
      default: "",
    },
    supportNeeded: {
      type: String,
      default: "",
    },
    overallStatus: {
      type: String,
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

module.exports = mongoose.model("DesignerEodReport", designerEodReportSchema);

