const mongoose = require("mongoose");

const SubtaskSchema = new mongoose.Schema({
  title: {
    type: String,
    default: "",
    trim: true,
  },
  status: {
    type: String,
    enum: ["Pending", "In Progress", "Completed", "On Hold", "IN-REVIEW", "In Review", "IN-Review", "Rejected"],
    default: "Pending",
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  startDate: {
    type: Date,
  },
  dueDate: {
    type: Date,
  },
  priority: {
    type: String,
    enum: ["Low", "Medium", "High", "Top High"],
    default: "Medium",
  },
  contentType: {
    type: String,
    default: "",
  },
  contentCopy: {
    type: String,
    default: "",
  },
  actualStartTime: {
    type: Date,
  },
  actualEndTime: {
    type: Date,
  },

  pausedAt: {
    type: Date,
    default: null,
  },
  revisions: {
    type: Number,
    default: 0,
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Client",
  },
  totalPausedMs: {
  type: Number,
  default: 0,
},


  rejectionHistory: [
    {
      reason: String,
      rejectedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      rejectedAt: {
        type: Date,
        default: Date.now,
      },
    }
  ],
});

const TaskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      default: "",
      trim: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    startDate: {
      type: Date,
    },
    dueDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["Pending", "In Progress", "Completed", "On Hold", "IN-REVIEW", "In Review", "IN-Review", "Rejected"],
      default: "Pending",
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Top High"],
      default: "Medium",
    },
    section: {
      type: String,
      default: "Recently assigned",
    },
    contentType: {
      type: String,
      default: "",
    },
    contentCopy: {
      type: String,
      default: "",
    },
    actualStartTime: {
      type: Date,
    },
    actualEndTime: {
      type: Date,
    },

    pausedAt: {
      type: Date,
      default: null,
    },
    totalPausedMs: {
  type: Number,
  default: 0,
},

    isBlocked: {
      type: Boolean,
      default: false,
    },
    blockerReason: {
      type: String,
      default: "",
    },
    blockerType: {
      type: String,
      default: "",
    },
    blockerDescription: {
      type: String,
      default: "",
    },
    blockerExpectedTime: {
      type: String,
      default: "",
    },
    blockerPriority: {
      type: String,
      default: "",
    },
    blockerPausedAt: {
      type: Date,
    },
    blockerResumedAt: {
      type: Date,
    },
    blockerHistory: [
      {
        blockerType: String,
        blockerDescription: String,
        blockerExpectedTime: String,
        blockerPriority: String,
        pausedAt: Date,
        resumedAt: Date,
        totalPauseMinutes: Number,
      }
    ],
    revisions: {
      type: Number,
      default: 0,
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
    },
    rejectionHistory: [
      {
        reason: String,
        rejectedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        rejectedAt: {
          type: Date,
          default: Date.now,
        },
      }
    ],
    comments: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        text: {
          type: String,
          required: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
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
        uploadedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    subtasks: [SubtaskSchema],
  },
  {
    timestamps: true,
  }
);

// Indexes to optimize task queries by project and by assigned team member
TaskSchema.index({ project: 1 });
TaskSchema.index({ assignedTo: 1 });

module.exports = mongoose.model("Task", TaskSchema);
