const mongoose = require("mongoose");

const SubtaskSchema = new mongoose.Schema({
  title: {
    type: String,
    default: "",
    trim: true,
  },
  status: {
    type: String,
    enum: ["Pending", "In Progress", "Completed", "On Hold", "In Review", "Rejected", "Correction"],
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
  feedbackMom: {
    type: String,
    default: "",
    trim: true,
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
  autoPaused: {
    type: Boolean,
    default: false,
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
  totalPausedMs: {
    type: Number,
    default: 0,
  },
  businessTotalPausedMs: {
    type: Number,
    default: 0,
  },
  reviewStartedAt: {
    type: Date,
    default: null,
  },
  lastReviewStartedAt: {
    type: Date,
    default: null,
  },
  completedAt: {
    type: Date,
    default: null,
  },
  approvalWaitingMs: {
    type: Number,
    default: 0,
  },
  reviewCycles: [
    {
      startedAt: Date,
      completedAt: Date,
      durationMs: Number,
    }
  ],


  totalTrackedTime: {
    type: Number,
    default: 0,
  },
  dailyTrackedTime: {
    type: Number,
    default: 0,
  },
  holdStartedAt: {
    type: Date,
    default: null,
  },
  holdEndedAt: {
    type: Date,
    default: null,
  },
  statusHistory: [
    {
      status: {
        type: String,
        enum: ["Pending", "In Progress", "Completed", "On Hold", "In Review", "Rejected", "Correction"],
        required: true,
      },
      startTime: {
        type: Date,
        required: true,
      },
      endTime: {
        type: Date,
        default: null,
      },
      duration: {
        type: Number,
        default: 0,
      },
      date: {
        type: String,
        default: "",
      },
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      comment: {
        type: String,
        default: "",
      },
    },
  ],
  correctionHistory: [
    {
      revision: {
        type: Number,
        default: 1,
      },
      reason: {
        type: String,
        default: "",
      },
      requestedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      requestedAt: {
        type: Date,
        default: Date.now,
      },
      resumedAt: {
        type: Date,
        default: null,
      },
      completedAt: {
        type: Date,
        default: null,
      },
    }
  ],
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
    feedbacks: [
      {
        type: {
          type: String,
          enum: ["Review", "Correction", "Rejected"],
          default: "Review",
        },
        text: String,
        addedAt: {
          type: Date,
          default: Date.now,
        },
        addedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      }
    ],
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
      enum: ["Pending", "In Progress", "Completed", "On Hold", "In Review", "Rejected", "Correction"],
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
    feedbackMom: {
      type: String,
      default: "",
      trim: true,
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
    autoPaused: {
      type: Boolean,
      default: false,
    },
    totalPausedMs: {
      type: Number,
      default: 0,
    },
    businessTotalPausedMs: {
      type: Number,
      default: 0,
    },
    reviewStartedAt: {
      type: Date,
      default: null,
    },
    lastReviewStartedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    approvalWaitingMs: {
      type: Number,
      default: 0,
    },
    reviewCycles: [
      {
        startedAt: Date,
        completedAt: Date,
        durationMs: Number,
      }
    ],

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
    totalTrackedTime: {
      type: Number,
      default: 0,
    },
    dailyTrackedTime: {
      type: Number,
      default: 0,
    },
    holdStartedAt: {
      type: Date,
      default: null,
    },
    holdEndedAt: {
      type: Date,
      default: null,
    },
    statusHistory: [
      {
        status: {
          type: String,
          enum: ["Pending", "In Progress", "Completed", "On Hold", "In Review", "Rejected", "Correction"],
          required: true,
        },
        startTime: {
          type: Date,
          required: true,
        },
        endTime: {
          type: Date,
          default: null,
        },
        duration: {
          type: Number,
          default: 0,
        },
        date: {
          type: String,
          default: "",
        },
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        comment: {
          type: String,
          default: "",
        },
      },
    ],
    correctionHistory: [
      {
        revision: {
          type: Number,
          default: 1,
        },
        reason: {
          type: String,
          default: "",
        },
        requestedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        requestedAt: {
          type: Date,
          default: Date.now,
        },
        resumedAt: {
          type: Date,
          default: null,
        },
        completedAt: {
          type: Date,
          default: null,
        },
      }
    ],
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

// Indexes to optimize task queries by project, assigned team member, status, and creator
TaskSchema.index({ project: 1 });
TaskSchema.index({ assignedTo: 1 });
TaskSchema.index({ status: 1 });
TaskSchema.index({ createdBy: 1 });
TaskSchema.index({ assignedTo: 1, status: 1 });
TaskSchema.index({ project: 1, status: 1 });

const isSameDay = (d1, d2) => {
  if (!d1 || !d2) return false;
  try {
    const s1 = d1 instanceof Date ? d1.toISOString().split("T")[0] : new Date(d1).toISOString().split("T")[0];
    const s2 = d2 instanceof Date ? d2.toISOString().split("T")[0] : new Date(d2).toISOString().split("T")[0];
    return s1 === s2 && s1 !== "1970-01-01";
  } catch (e) {
    return false;
  }
};

TaskSchema.pre("save", function () {
  if (isSameDay(this.startDate, this.dueDate)) {
    this.priority = "Top High";
  }
  if (this.subtasks && Array.isArray(this.subtasks)) {
    this.subtasks.forEach((sub) => {
      if (isSameDay(sub.startDate, sub.dueDate)) {
        sub.priority = "Top High";
      }
    });
  }
});

module.exports = mongoose.model("Task", TaskSchema);
