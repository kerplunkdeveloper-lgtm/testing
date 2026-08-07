const Task = require("../models/Task");
const Notification = require("../models/Notification");
const User = require("../models/User");
const Project = require("../models/Project");
const { calculateBusinessMs, checkWithinBusinessHours } = require("../utils/businessHours");




const hasActiveWork = async (userId, currentTaskId = null, currentSubtaskId = null) => {


  // Parent Task Check
  const activeTask = await Task.findOne({
    assignedTo: userId,
    status: { $in: ["In Progress", "In-Progress"] },
    ...(currentTaskId && { _id: { $ne: currentTaskId } }),
  }).select("_id").lean();


  if (activeTask) return true;

  // Subtask Check
  const activeSubtask = await Task.findOne({
    subtasks: {
      $elemMatch: {
        assignedTo: userId,
        status: { $in: ["In Progress", "In-Progress"] },
        ...(currentSubtaskId && { _id: { $ne: currentSubtaskId } }),
      },
    },
  }).select("_id").lean();

  return !!activeSubtask;
};

const calculateItemWorkingTime = (item) => {
  if (!item.actualStartTime) return 0;
  const start = new Date(item.actualStartTime).getTime();
  let end = Date.now();
  if (item.actualEndTime) {
    end = new Date(item.actualEndTime).getTime();
  } else if (item.pausedAt) {
    end = new Date(item.pausedAt).getTime();
  }

  let totalPauseMs = 0;
  if (item.blockerHistory && item.blockerHistory.length > 0) {
    item.blockerHistory.forEach((h) => {
      if (h.pausedAt) {
        const p = new Date(h.pausedAt).getTime();
        let r = h.resumedAt ? new Date(h.resumedAt).getTime() : Date.now();
        if (r > end) r = end;
        if (r >= p) {
          totalPauseMs += r - p;
        }
      }
    });
  }
  if (item.isBlocked && item.blockerPausedAt) {
    const p = new Date(item.blockerPausedAt).getTime();
    if (p < end) {
      totalPauseMs += end - p;
    }
  }

  const elapsed = end - start - (item.totalPausedMs || 0) - totalPauseMs;
  return Math.max(0, elapsed);
};













// @desc    Get all tasks
// @route   GET /api/tasks
// @access  Private
exports.getTasks = async (req, res) => {
  try {
    let query = {};
    if (req.user.role !== "admin" && req.user.role !== "operationmanager") {
      const Client = require("../models/Client");
      const assignedClients = await Client.find({ assignedTo: req.user._id }).select("_id").lean();
      const clientIds = assignedClients.map(c => c._id);

      // Projects of assigned clients
      const assignedProjects = await Project.find({ client: { $in: clientIds } }).select("_id").lean();
      let projectIds = assignedProjects.map(p => p._id);

      // Add projects in department
      if (req.user.department) {
        const usersInSameDept = await User.find({ department: req.user.department }).select("_id").lean();
        const userIds = usersInSameDept.map(u => u._id);
        const projectsInDept = await Project.find({ createdBy: { $in: userIds } }).select("_id").lean();
        const deptProjIds = projectsInDept.map(p => p._id.toString());
        
        // Merge projectIds avoiding duplicates
        const projectIdsSet = new Set([...projectIds.map(id => id.toString()), ...deptProjIds]);
        projectIds = Array.from(projectIdsSet);
      }

      query.$or = [
        { createdBy: req.user._id },
        { assignedTo: req.user._id },
        { "subtasks.assignedTo": req.user._id },
        { project: { $in: projectIds } }
      ];
    }
    const tasks = await Task.find(query)
      .populate({
        path: "project",
        select: "name client",
        populate: {
          path: "client",
          select: "companyName color icon"
        }
      })
      .populate({
        path: "assignedTo",
        select: "name email department profile",
        populate: { path: "profile", select: "profileImage" }
      })
      .populate({
        path: "createdBy",
        select: "name email department profile",
        populate: { path: "profile", select: "profileImage" }
      })
      .populate({
        path: "subtasks.assignedTo",
        select: "name email department profile",
        populate: { path: "profile", select: "profileImage" }
      })
      .populate({
        path: "comments.user",
        select: "name email profile",
        populate: { path: "profile", select: "profileImage" }
      })
      .populate({
        path: "attachments.uploadedBy",
        select: "name email profile",
        populate: { path: "profile", select: "profileImage" }
      })
      .populate({
        path: "feedbacks.addedBy",
        select: "name email department profile",
        populate: { path: "profile", select: "profileImage" }
      })
      .populate({
        path: "correctionHistory.requestedBy",
        select: "name email department profile",
        populate: { path: "profile", select: "profileImage" }
      })
      .populate({
        path: "rejectionHistory.rejectedBy",
        select: "name email department profile",
        populate: { path: "profile", select: "profileImage" }
      })
      .populate({
        path: "subtasks.correctionHistory.requestedBy",
        select: "name email department profile",
        populate: { path: "profile", select: "profileImage" }
      })
      .populate({
        path: "subtasks.rejectionHistory.rejectedBy",
        select: "name email department profile",
        populate: { path: "profile", select: "profileImage" }
      })
      .lean();

    res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Helper for comparing date only
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

// @desc    Create a new task
// @route   POST /api/tasks
// @access  Private/Admin/OperationManager
exports.createTask = async (req, res) => {
  try {
    req.body.createdBy = req.user._id;

    // Check business hours when creating task/subtask set to In Progress
    const isTaskInProgress = req.body.status === "In Progress";
    const hasSubtaskInProgress = req.body.subtasks && Array.isArray(req.body.subtasks) && req.body.subtasks.some(s => s.status === "In Progress");

    if (isTaskInProgress || hasSubtaskInProgress) {
      const isBizHours = await checkWithinBusinessHours();
      if (!isBizHours) {
        return res.status(400).json({
          success: false,
          isOfficeHoursEnded: true,
          workingTimeMs: 0,
          pausedAt: null,
          message: "Office working hours have ended. Work can only be set to In Progress during business hours."
        });
      }
    }

    if (isSameDay(req.body.startDate, req.body.dueDate)) {
      req.body.priority = "Top High";
    }
    if (req.body.subtasks && Array.isArray(req.body.subtasks)) {
      req.body.subtasks.forEach((sub) => {
        if (isSameDay(sub.startDate, sub.dueDate)) {
          sub.priority = "Top High";
        }
      });
    }

    const task = await Task.create(req.body);

    const populatedTask = await Task.findById(task._id)
      .populate({
        path: "project",
        select: "name client",
        populate: {
          path: "client",
          select: "companyName color icon"
        }
      })
      .populate({
        path: "assignedTo",
        select: "name email department profile",
        populate: { path: "profile", select: "profileImage" }
      })
      .populate({
        path: "createdBy",
        select: "name email department profile",
        populate: { path: "profile", select: "profileImage" }
      })
      .populate({
        path: "subtasks.assignedTo",
        select: "name email department profile",
        populate: { path: "profile", select: "profileImage" }
      })
      .populate({
        path: "comments.user",
        select: "name email profile",
        populate: { path: "profile", select: "profileImage" }
      })
      .populate({
        path: "attachments.uploadedBy",
        select: "name email profile",
        populate: { path: "profile", select: "profileImage" }
      })
      .populate({
        path: "feedbacks.addedBy",
        select: "name email department profile",
        populate: { path: "profile", select: "profileImage" }
      })
      .populate({
        path: "correctionHistory.requestedBy",
        select: "name email department profile",
        populate: { path: "profile", select: "profileImage" }
      })
      .populate({
        path: "rejectionHistory.rejectedBy",
        select: "name email department profile",
        populate: { path: "profile", select: "profileImage" }
      })
      .populate({
        path: "subtasks.correctionHistory.requestedBy",
        select: "name email department profile",
        populate: { path: "profile", select: "profileImage" }
      })
      .populate({
        path: "subtasks.rejectionHistory.rejectedBy",
        select: "name email department profile",
        populate: { path: "profile", select: "profileImage" }
      });

    // Real-time Notification
    if (task.assignedTo) {
      const notification = await Notification.create({
        recipient: task.assignedTo,
        sender: req.user._id,
        type: "task_assigned",
        message: `You have been assigned a new task: "${task.title}"`,
        task: task._id,
        project: task.project,
      });

      const io = req.app.get("io");
      if (io) {
        const populatedNotification = await Notification.findById(notification._id).populate({ path: "sender", select: "name profile", populate: { path: "profile", select: "profileImage" } });
        io.to(task.assignedTo.toString()).emit("notification", populatedNotification);
      }
    }

    res.status(201).json({
      success: true,
      data: populatedTask,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// @desc    Update a task (including status or adding subtasks)
// @route   PUT /api/tasks/:id
// @access  Private
exports.updateTask = async (req, res) => {
  try {
    const currentUserId = req.user._id ? req.user._id.toString() : req.user.id;
    
    // .........................................Prevent overriding read-only fields on update..........................................      
    delete req.body.createdBy;
    delete req.body.project;

    let task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    const previousStatus = task.status;
    const previousAssignee = task.assignedTo;
    const previousSubtasks = task.subtasks ? JSON.parse(JSON.stringify(task.subtasks)) : [];

    // Check business hours when setting task/subtask to In Progress
    let tryingToStartTask = false;
    let targetItem = null;

    if (req.body.status === "In Progress" && previousStatus !== "In Progress") {
      tryingToStartTask = true;
      targetItem = task;
    }

    if (req.body.subtasks && Array.isArray(req.body.subtasks)) {
      for (const sub of req.body.subtasks) {
        const prevSub = previousSubtasks.find(p => p._id?.toString() === sub._id?.toString());
        if (sub.status === "In Progress" && (!prevSub || prevSub.status !== "In Progress")) {
          tryingToStartTask = true;
          targetItem = prevSub || sub;
          break;
        }
      }
    }

    if (tryingToStartTask) {
      const isBizHours = await checkWithinBusinessHours();
      if (!isBizHours) {
        const workingTimeMs = targetItem ? calculateItemWorkingTime(targetItem) : 0;
        const OfficeSettings = require("../models/OfficeSettings");
        const settings = await OfficeSettings.findOne({ key: "global" }) || { endHour: 19 };
        
        let pausedAtTime = new Date();
        pausedAtTime.setHours(settings.endHour, 0, 0, 0);

        return res.status(400).json({
          success: false,
          isOfficeHoursEnded: true,
          workingTimeMs,
          pausedAt: pausedAtTime,
          message: "Office working hours have ended. Work can only be set to In Progress during business hours."
        });
      }
    }

    // Reset autoPaused when task is set to In Progress
    if (req.body.status === "In Progress") {
      req.body.autoPaused = false;
    }

   
// .........................................Time tracking logic for parent task...........................................
if (req.body.status && req.body.status !== previousStatus) {

   if (req.body.status === "In Progress") {
      if (task.assignedTo) {
        const hasActive = await hasActiveWork(
          task.assignedTo,
          task._id,
          null
        );

        if (hasActive) {
          return res.status(409).json({
            success: false,
            message: "You already have one active task or subtask.",
          });
        }
      }
   }

  // Handle leaving 'In Review' state
  const wasInReview = previousStatus === "In Review";
  const isNowInReview = req.body.status === "In Review";
  
  if (wasInReview && !isNowInReview) {
     const reviewStart = task.reviewStartedAt || Date.now();
     const durationMs = calculateBusinessMs(reviewStart, Date.now());
     req.body.approvalWaitingMs = (task.approvalWaitingMs || 0) + durationMs;
     
     const newCycle = {
       startedAt: reviewStart,
       completedAt: Date.now(),
       durationMs
     };
     req.body.reviewCycles = [...(task.reviewCycles || []), newCycle];
     req.body.lastReviewStartedAt = reviewStart;
     req.body.reviewStartedAt = null;
  }

  switch (req.body.status) {

    case "Pending":
      req.body.actualStartTime = null;
      req.body.actualEndTime = null;
      req.body.pausedAt = null;
      break;

    case "In Progress":
      if (!task.actualStartTime) {
        req.body.actualStartTime = Date.now();
      }
      req.body.actualEndTime = null;
      req.body.completedAt = null;

      if (task.pausedAt) {
        req.body.totalPausedMs =
          (task.totalPausedMs || 0) +
          (Date.now() - new Date(task.pausedAt).getTime());
        req.body.businessTotalPausedMs =
          (task.businessTotalPausedMs || 0) +
          calculateBusinessMs(task.pausedAt, Date.now());
      }

      if (previousStatus === "Correction") {
        const currentHist = task.correctionHistory ? JSON.parse(JSON.stringify(task.correctionHistory)) : [];
        if (currentHist.length > 0) {
          currentHist[currentHist.length - 1].resumedAt = new Date();
          req.body.correctionHistory = currentHist;
        }
      }

      req.body.pausedAt = null;
      break;

    case "Completed":
      if (task.pausedAt) {
        req.body.totalPausedMs =
          (task.totalPausedMs || 0) +
          (Date.now() - new Date(task.pausedAt).getTime());
        req.body.businessTotalPausedMs =
          (task.businessTotalPausedMs || 0) +
          calculateBusinessMs(task.pausedAt, Date.now());
      }
      if (!task.actualEndTime) {
        req.body.actualEndTime = Date.now();
      }
      req.body.completedAt = Date.now();
      req.body.pausedAt = null;
      break;

    case "On Hold":
      if (!task.actualStartTime) {
        return res.status(400).json({
          message: "Please start the task by setting its status to 'In Progress' first before placing it on hold.",
        });
      }
      if (!task.pausedAt) {
        req.body.pausedAt = Date.now();
      }
      break;

    case "Correction":
      const nextRev = (task.revisions || 0) + 1;
      req.body.revisions = nextRev;
      if (!task.pausedAt) {
        req.body.pausedAt = Date.now();
      }
      const corrReason = req.body.correctionReason || req.body.reason || "Corrections requested";
      const corrEntry = {
        revision: nextRev,
        reason: corrReason,
        requestedBy: req.user._id,
        requestedAt: new Date(),
      };
      req.body.correctionHistory = [...(task.correctionHistory || []), corrEntry];
      const corrFeedback = {
        type: "Correction",
        text: corrReason,
        addedBy: req.user._id,
        addedAt: new Date(),
      };
      req.body.feedbacks = [...(task.feedbacks || []), corrFeedback];
      break;

    case "Rejected":
      if (!task.actualEndTime) {
        req.body.actualEndTime = Date.now();
      }
      req.body.completedAt = Date.now();
      req.body.pausedAt = null;

      const rejReason = req.body.rejectionReason || req.body.reason || "Task rejected";
      const rejEntry = {
        reason: rejReason,
        rejectedBy: req.user._id,
        rejectedAt: new Date(),
      };
      if (req.body.rejectionHistory && Array.isArray(req.body.rejectionHistory)) {
        req.body.rejectionHistory = req.body.rejectionHistory.map((item) => ({
          ...item,
          rejectedBy: item.rejectedBy || req.user._id,
          rejectedAt: item.rejectedAt || new Date(),
        }));
      } else {
        req.body.rejectionHistory = [...(task.rejectionHistory || []), rejEntry];
      }
      const rejFeedback = {
        type: "Rejected",
        text: rejReason,
        addedBy: req.user._id,
        addedAt: new Date(),
      };
      req.body.feedbacks = [...(task.feedbacks || []), rejFeedback];
      break;

    case "In Review":
      if (!task.actualStartTime) {
        return res.status(400).json({
          message: "Please start the task by setting its status to 'In Progress' first before submitting it for review.",
        });
      }
      if (!task.pausedAt) {
        req.body.pausedAt = Date.now();
      }
      if (!task.reviewStartedAt || !wasInReview) {
        const nowMs = Date.now();
        req.body.reviewStartedAt = nowMs;
        req.body.lastReviewStartedAt = nowMs;
      }
      break;
  }
}
    // .........................................Time tracking logic for subtasks...........................................    
   // .........................................Time tracking logic for subtasks...........................................



for (const sub of req.body.subtasks || []) {

  const prevSub = previousSubtasks.find(
    (p) => p._id?.toString() === sub._id?.toString()
  );

  if (
    prevSub &&
    sub.status === "In Progress" &&
    prevSub.status !== "In Progress" &&
    sub.assignedTo
  ) {

    const hasActive = await hasActiveWork(
      sub.assignedTo,
      null,
      sub._id
    );

    if (hasActive) {
      return res.status(409).json({
        success: false,
        message: "You already have one active task or subtask.",
      });
    }
  }
}




if (req.body.subtasks) {
  req.body.subtasks = req.body.subtasks.map((sub) => {

    const prevSub = previousSubtasks.find(
      (p) => p._id && sub._id && p._id.toString() === sub._id.toString()
    );

    if (prevSub && sub.status && sub.status !== prevSub.status) {

      // Handle leaving 'In Review' state for subtask
      const wasSubInReview = prevSub.status === "In Review";
      const isSubNowInReview = sub.status === "In Review";
      
      if (wasSubInReview && !isSubNowInReview) {
         const reviewStart = prevSub.reviewStartedAt || Date.now();
         const durationMs = calculateBusinessMs(reviewStart, Date.now());
         sub.approvalWaitingMs = (prevSub.approvalWaitingMs || 0) + durationMs;
         
         const newCycle = {
           startedAt: reviewStart,
           completedAt: Date.now(),
           durationMs
         };
         sub.reviewCycles = [...(prevSub.reviewCycles || []), newCycle];
         sub.lastReviewStartedAt = reviewStart;
         sub.reviewStartedAt = null;
      }

      switch (sub.status) {

        case "Pending":
          sub.actualStartTime = null;
          sub.actualEndTime = null;
          sub.pausedAt = null;
          break;

        case "In Progress":
          if (!prevSub.actualStartTime && !sub.actualStartTime) {
            sub.actualStartTime = Date.now();
          }
          sub.actualEndTime = null;
          sub.completedAt = null;

          if (prevSub.pausedAt) {
            sub.totalPausedMs =
              (prevSub.totalPausedMs || 0) +
              (Date.now() - new Date(prevSub.pausedAt).getTime());
            sub.businessTotalPausedMs =
              (prevSub.businessTotalPausedMs || 0) +
              calculateBusinessMs(prevSub.pausedAt, Date.now());
          }

          if (prevSub.status === "Correction") {
            const currentSubHist = prevSub.correctionHistory ? JSON.parse(JSON.stringify(prevSub.correctionHistory)) : [];
            if (currentSubHist.length > 0) {
              currentSubHist[currentSubHist.length - 1].resumedAt = new Date();
              sub.correctionHistory = currentSubHist;
            }
          }

          sub.pausedAt = null;
          sub.autoPaused = false;
          break;

        case "Completed":
          if (prevSub.pausedAt) {
            sub.totalPausedMs =
              (prevSub.totalPausedMs || 0) +
              (Date.now() - new Date(prevSub.pausedAt).getTime());
            sub.businessTotalPausedMs =
              (prevSub.businessTotalPausedMs || 0) +
              calculateBusinessMs(prevSub.pausedAt, Date.now());
          }
          if (!prevSub.actualEndTime && !sub.actualEndTime) {
            sub.actualEndTime = Date.now();
          }
          sub.completedAt = Date.now();
          sub.pausedAt = null;
          break;

        case "On Hold":
          if (!prevSub.actualStartTime && !sub.actualStartTime) {
            return res.status(400).json({
              message: "Please start the subtask by setting its status to 'In Progress' first before placing it on hold.",
            });
          }
          if (!prevSub.pausedAt) {
            sub.pausedAt = Date.now();
          }
          break;

        case "Correction":
          const nextSubRev = (prevSub.revisions || 0) + 1;
          sub.revisions = nextSubRev;
          if (!prevSub.pausedAt) {
            sub.pausedAt = Date.now();
          }
          const subCorrReason = sub.correctionReason || sub.reason || "Corrections requested";
          sub.correctionHistory = [
            ...(prevSub.correctionHistory || []),
            {
              revision: nextSubRev,
              reason: subCorrReason,
              requestedBy: req.user._id,
              requestedAt: new Date(),
            }
          ];
          break;

        case "Rejected":
          if (!prevSub.actualEndTime && !sub.actualEndTime) {
            sub.actualEndTime = Date.now();
          }
          sub.completedAt = Date.now();
          sub.pausedAt = null;

          const subRejReason = sub.rejectionReason || sub.reason || "Subtask rejected";
          if (!sub.rejectionHistory) {
            sub.rejectionHistory = [
              ...(prevSub.rejectionHistory || []),
              {
                reason: subRejReason,
                rejectedBy: req.user._id,
                rejectedAt: new Date(),
              }
            ];
          }
          break;

        case "In Review":
          if (!prevSub.actualStartTime && !sub.actualStartTime) {
            return res.status(400).json({
              message: "Please start the subtask by setting its status to 'In Progress' first before submitting it for review.",
            });
          }
          if (!prevSub.pausedAt) {
            sub.pausedAt = Date.now();
          }
          if (!prevSub.reviewStartedAt || !wasSubInReview) {
            const nowMs = Date.now();
            sub.reviewStartedAt = nowMs;
            sub.lastReviewStartedAt = nowMs;
          }
          break;
      }
    }

    return sub;
  });
}

    const effectiveStart = req.body.startDate !== undefined ? req.body.startDate : task.startDate;
    const effectiveEnd = req.body.dueDate !== undefined ? req.body.dueDate : task.dueDate;
    if (effectiveStart && effectiveEnd && isSameDay(effectiveStart, effectiveEnd)) {
      req.body.priority = "Top High";
    }

    if (req.body.subtasks && Array.isArray(req.body.subtasks)) {
      req.body.subtasks = req.body.subtasks.map((sub) => {
        const prevSub = task.subtasks ? task.subtasks.find((s) => s._id && sub._id && s._id.toString() === sub._id.toString()) : null;
        const effSubStart = sub.startDate !== undefined ? sub.startDate : prevSub?.startDate;
        const effSubEnd = sub.dueDate !== undefined ? sub.dueDate : prevSub?.dueDate;
        if (effSubStart && effSubEnd && isSameDay(effSubStart, effSubEnd)) {
          return { ...sub, priority: "Top High" };
        }
        return sub;
      });
    }

    // Apply updates and run save() to trigger pre-save validation/hooks
    Object.assign(task, req.body);
    await task.save();

    task = await Task.findById(task._id)
      .populate({
        path: "project",
        select: "name client",
        populate: {
          path: "client",
          select: "companyName color icon"
        }
      })
      .populate({
        path: "assignedTo",
        select: "name email department profile",
        populate: { path: "profile", select: "profileImage" }
      })
      .populate({
        path: "createdBy",
        select: "name email department profile",
        populate: { path: "profile", select: "profileImage" }
      })
      .populate({
        path: "subtasks.assignedTo",
        select: "name email department profile",
        populate: { path: "profile", select: "profileImage" }
      })
      .populate({
        path: "comments.user",
        select: "name email profile",
        populate: { path: "profile", select: "profileImage" }
      })
      .populate({
        path: "attachments.uploadedBy",
        select: "name email profile",
        populate: { path: "profile", select: "profileImage" }
      })
      .populate({
        path: "feedbacks.addedBy",
        select: "name email department profile",
        populate: { path: "profile", select: "profileImage" }
      })
      .populate({
        path: "correctionHistory.requestedBy",
        select: "name email department profile",
        populate: { path: "profile", select: "profileImage" }
      })
      .populate({
        path: "rejectionHistory.rejectedBy",
        select: "name email department profile",
        populate: { path: "profile", select: "profileImage" }
      })
      .populate({
        path: "subtasks.correctionHistory.requestedBy",
        select: "name email department profile",
        populate: { path: "profile", select: "profileImage" }
      })
      .populate({
        path: "subtasks.rejectionHistory.rejectedBy",
        select: "name email department profile",
        populate: { path: "profile", select: "profileImage" }
      });

    // Check if task status has been updated (e.g. marked completed)
    if (req.body.status && req.body.status !== previousStatus) {
      const io = req.app.get("io");
      const isAssignee = (task.assignedTo?._id || task.assignedTo)?.toString() === currentUserId;

      if (isAssignee) {
        // A member updated their own task status. Notify all admins, operation managers, and the task creator!
        const managers = await User.find({ role: { $in: ["admin", "operationmanager"] } });
        const recipientIds = new Set(managers.map(m => m._id.toString()));
        
        const creatorId = task.createdBy?._id || task.createdBy;
        if (creatorId && creatorId.toString() !== currentUserId) {
          recipientIds.add(creatorId.toString());
        }

        // Notify creator is handled above. Only the creator (the particular SMM who created it) will be notified, along with admins and operation managers.

        for (const recipientId of recipientIds) {
          const notification = await Notification.create({
            recipient: recipientId,
            sender: req.user._id,
            type: "task_updated",
            message: `${req.user.department || 'Member'} - ${req.user.name} updated task "${task.title}" to: ${task.status}`,
            task: task._id,
            project: task.project?._id || task.project,
          });

          if (io) {
            const populatedNotification = await Notification.findById(notification._id).populate("sender", "name");
            io.to(recipientId).emit("notification", populatedNotification);
          }
        }
      } else {
        // An admin/manager or creator updated the task status. Notify assignee and creator!
        const recipientIds = new Set();
        
        const recipient = task.assignedTo?._id || task.assignedTo;
        if (recipient && recipient.toString() !== currentUserId) {
          recipientIds.add(recipient.toString());
        }

        const creatorId = task.createdBy?._id || task.createdBy;
        if (creatorId && creatorId.toString() !== currentUserId) {
          recipientIds.add(creatorId.toString());
        }

        for (const recipientId of recipientIds) {
          const notification = await Notification.create({
            recipient: recipientId,
            sender: req.user._id,
            type: "task_updated",
            message: `Task "${task.title}" status updated to: ${task.status}`,
            task: task._id,
            project: task.project?._id || task.project,
          });

          if (io) {
            const populatedNotification = await Notification.findById(notification._id).populate({ path: "sender", select: "name profile", populate: { path: "profile", select: "profileImage" } });
            io.to(recipientId).emit("notification", populatedNotification);
          }
        }
      }
    }

    // Check if task has been assigned to a different user
    if (req.body.assignedTo && req.body.assignedTo.toString() !== previousAssignee?.toString()) {
      const notification = await Notification.create({
        recipient: req.body.assignedTo,
        sender: req.user._id,
        type: "task_assigned",
        message: `You have been assigned the task: "${task.title}" , Assigned by : "${req.user.name}" `,
        task: task._id,
        project: task.project?._id || task.project,
      });

      const io = req.app.get("io");
      if (io) {
        const populatedNotification = await Notification.findById(notification._id).populate({ path: "sender", select: "name profile", populate: { path: "profile", select: "profileImage" } });
        io.to(req.body.assignedTo.toString()).emit("notification", populatedNotification);
      }
    }

    // Check subtask updates
    if (req.body.subtasks) {
      const io = req.app.get("io");
      for (const sub of (task.subtasks || [])) {
        // Find previous subtask state
        const prevSub = previousSubtasks.find(p => p._id && sub._id && p._id.toString() === sub._id.toString());
        
        if (!prevSub) {
          // New subtask added! If assigned, send notification
          const subAssignee = sub.assignedTo?._id || sub.assignedTo;
          if (subAssignee) {
            const notification = await Notification.create({
              recipient: subAssignee,
              sender: req.user._id,
              type: "task_assigned",
              message: `You have been assigned a new subtask: "${sub.title || 'Untitled'}" in task "${task.title}"`,
              task: task._id,
              project: task.project?._id || task.project,
            });

            if (io) {
              const populatedNotification = await Notification.findById(notification._id).populate({ path: "sender", select: "name profile", populate: { path: "profile", select: "profileImage" } });
              io.to(subAssignee.toString()).emit("notification", populatedNotification);
            }
          }
        } else {
          // Existing subtask. Check for assignee change
          const prevSubAssignee = prevSub.assignedTo?._id || prevSub.assignedTo;
          const currSubAssignee = sub.assignedTo?._id || sub.assignedTo;

          if (currSubAssignee && currSubAssignee.toString() !== prevSubAssignee?.toString()) {
            // Assigned to someone else
            const notification = await Notification.create({
              recipient: currSubAssignee,
              sender: req.user._id,
              type: "task_assigned",
              message: `You have been assigned the subtask: "${sub.title}" in task "${task.title}"`,
              task: task._id,
              project: task.project?._id || task.project,
            });

            if (io) {
              const populatedNotification = await Notification.findById(notification._id).populate({ path: "sender", select: "name profile", populate: { path: "profile", select: "profileImage" } });
              io.to(currSubAssignee.toString()).emit("notification", populatedNotification);
            }
          }

          // Check for status change
          if (sub.status && sub.status !== prevSub.status) {
            const isSubAssignee = currSubAssignee?.toString() === currentUserId || prevSubAssignee?.toString() === currentUserId;
            if (isSubAssignee) {
              // Member updated their own subtask status. Notify all admins, operation managers, and the task creator!
              const managers = await User.find({ role: { $in: ["admin", "operationmanager"] } });
              const recipientIds = new Set(managers.map(m => m._id.toString()));
              
              const creatorId = task.createdBy?._id || task.createdBy;
              if (creatorId && creatorId.toString() !== currentUserId) {
                recipientIds.add(creatorId.toString());
              }

              for (const recipientId of recipientIds) {
                const notification = await Notification.create({
                  recipient: recipientId,
                  sender: req.user._id,
                  type: "task_updated",
                  message: `Member ${req.user.name} updated subtask "${sub.title}" to: ${sub.status} (in task "${task.title}")`,
                  task: task._id,
                  project: task.project?._id || task.project,
                });

                if (io) {
                  const populatedNotification = await Notification.findById(notification._id).populate("sender", "name");
                  io.to(recipientId).emit("notification", populatedNotification);
                }
              }
            } else {
              // Admin/manager/creator updated the subtask status. Notify assignee and creator!
              const recipientIds = new Set();
              if (currSubAssignee && currSubAssignee.toString() !== currentUserId) {
                recipientIds.add(currSubAssignee.toString());
              }
              const creatorId = task.createdBy?._id || task.createdBy;
              if (creatorId && creatorId.toString() !== currentUserId) {
                recipientIds.add(creatorId.toString());
              }

              for (const recipientId of recipientIds) {
                const notification = await Notification.create({
                  recipient: recipientId,
                  sender: req.user._id,
                  type: "task_updated",
                  message: `Subtask "${sub.title}" status updated to: ${sub.status} (in task "${task.title}")`,
                  task: task._id,
                  project: task.project?._id || task.project,
                });

                if (io) {
                  const populatedNotification = await Notification.findById(notification._id).populate("sender", "name");
                  io.to(recipientId).emit("notification", populatedNotification);
                }
              }
            }
          }
        }
      }
    }

    const io = req.app.get("io");
    if (io) {
      io.emit("task_updated", { taskId: task._id });
    }

    res.status(200).json({
      success: true,
      data: task,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// @desc    Delete a task
// @route   DELETE /api/tasks/:id
// @access  Private/Admin/OperationManager
exports.deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    await task.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
