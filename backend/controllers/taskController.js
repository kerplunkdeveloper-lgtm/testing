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

const getISTDateStr = (date = new Date()) => {
  try {
    return new Date(date).toLocaleDateString("en-US", {
      timeZone: "Asia/Kolkata",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch (e) {
    return new Date(date).toDateString();
  }
};

const calculateSessionWorkingTime = (item, sessionEndTime = Date.now(), startHour = 9, endHour = 19, workingDays = [1, 2, 3, 4, 5, 6]) => {
  if (!item.actualStartTime) return 0;
  const start = new Date(item.actualStartTime).getTime();
  const end = new Date(sessionEndTime).getTime();
  if (isNaN(start) || isNaN(end) || end <= start) return 0;

  const rawBusinessMs = calculateBusinessMs(start, end, startHour, endHour, workingDays);

  let sessionPauseMs = 0;
  if (item.blockerHistory && Array.isArray(item.blockerHistory)) {
    item.blockerHistory.forEach((h) => {
      if (h.pausedAt) {
        const p = new Date(h.pausedAt).getTime();
        let r = h.resumedAt ? new Date(h.resumedAt).getTime() : end;
        if (r > end) r = end;
        const oStart = Math.max(p, start);
        const oEnd = Math.min(r, end);
        if (oEnd > oStart) {
          sessionPauseMs += (oEnd - oStart);
        }
      }
    });
  }
  if (item.isBlocked && item.blockerPausedAt) {
    const p = new Date(item.blockerPausedAt).getTime();
    const oStart = Math.max(p, start);
    if (end > oStart) {
      sessionPauseMs += (end - oStart);
    }
  }

  return Math.max(0, rawBusinessMs - sessionPauseMs);
};

const handleItemStatusTransition = (item, prevStatus, newStatus, userId, settings = {}) => {
  if (!newStatus || newStatus === prevStatus) return;

  const now = new Date();
  const nowMs = now.getTime();
  const todayStr = getISTDateStr(now);
  const currentDateStr = now.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const startHour = settings.startHour ?? 9;
  const endHour = settings.endHour ?? 19;
  const workingDays = settings.workingDays && settings.workingDays.length > 0 ? settings.workingDays : [1, 2, 3, 4, 5, 6];

  let history = item.statusHistory ? JSON.parse(JSON.stringify(item.statusHistory)) : [];

  // Helper to close the last open status history entry
  const closeOpenHistoryEntry = (statusToClose, closeEndTime, durationMs = 0) => {
    for (let i = history.length - 1; i >= 0; i--) {
      if (!history[i].endTime && (!statusToClose || history[i].status === statusToClose)) {
        history[i].endTime = closeEndTime;
        history[i].duration = Math.max(0, Math.round(durationMs));
        break;
      }
    }
  };

  // 1. Handle LEAVING the previous status
  if (prevStatus === "In Progress") {
    // Designer was actively working; freeze / accrue session working time
    const sessionWorkedMs = calculateSessionWorkingTime(item, nowMs, startHour, endHour, workingDays);
    item.totalTrackedTime = (item.totalTrackedTime || 0) + sessionWorkedMs;

    const sessionDateStr = item.actualStartTime
      ? new Date(item.actualStartTime).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })
      : currentDateStr;

    if (sessionDateStr === currentDateStr) {
      item.dailyTrackedTime = (item.dailyTrackedTime || 0) + sessionWorkedMs;
    }

    closeOpenHistoryEntry("In Progress", now, sessionWorkedMs);

    // If item was blocked while In Progress, record open blocker segment into blockerHistory
    if (item.isBlocked && item.blockerPausedAt) {
      const bStart = new Date(item.blockerPausedAt).getTime();
      if (nowMs > bStart) {
        if (!item.blockerHistory) item.blockerHistory = [];
        item.blockerHistory.push({
          pausedAt: item.blockerPausedAt,
          resumedAt: now,
        });
      }
    }
  } else if (prevStatus === "On Hold") {
    // Leaving On Hold: calculate business-hour On Hold duration
    const holdStart = item.holdStartedAt || item.pausedAt || (history.length > 0 ? history[history.length - 1].startTime : now);
    const onHoldBusinessMs = calculateBusinessMs(holdStart, now, startHour, endHour, workingDays);
    item.holdEndedAt = now;

    closeOpenHistoryEntry("On Hold", now, onHoldBusinessMs);
  } else if (prevStatus === "In Review") {
    const reviewStart = item.reviewStartedAt || nowMs;
    const reviewBusinessMs = calculateBusinessMs(reviewStart, nowMs, startHour, endHour, workingDays);
    item.approvalWaitingMs = (item.approvalWaitingMs || 0) + reviewBusinessMs;
    const newCycle = {
      startedAt: reviewStart,
      completedAt: nowMs,
      durationMs: reviewBusinessMs,
    };
    item.reviewCycles = [...(item.reviewCycles || []), newCycle];
    item.lastReviewStartedAt = reviewStart;
    item.reviewStartedAt = null;

    closeOpenHistoryEntry("In Review", now, reviewBusinessMs);
  } else if (prevStatus) {
    closeOpenHistoryEntry(prevStatus, now, 0);
  }

  // 2. Handle ENTERING the new status
  switch (newStatus) {
    case "Pending":
      item.actualStartTime = null; // Reset today's timer to start from 00:00:00 when later placed in progress
      item.actualEndTime = null;
      item.pausedAt = null;
      item.holdStartedAt = null;
      item.holdEndedAt = null;
      item.autoPaused = false;

      history.push({
        status: "Pending",
        startTime: now,
        endTime: null,
        duration: 0,
        date: todayStr,
        user: userId,
      });
      break;

    case "In Progress": {
      const currentDateStr = now.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
      const lastSessionDateStr = item.actualStartTime
        ? new Date(item.actualStartTime).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })
        : null;
      const hasHistoryToday = Array.isArray(item.statusHistory) && item.statusHistory.some((h) => {
        const d = h.date || (h.startTime ? new Date(h.startTime).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }) : null);
        return d === currentDateStr;
      });
      if (!hasHistoryToday && (!lastSessionDateStr || lastSessionDateStr !== currentDateStr)) {
        // New day & no session today → start fresh daily counter
        item.dailyTrackedTime = 0;
      }
      // If same day resume (e.g. On Hold -> In Progress), dailyTrackedTime continues accumulating — correct!

      item.actualStartTime = now;
      item.actualEndTime = null;
      item.completedAt = null;
      item.pausedAt = null;
      item.holdStartedAt = null;
      item.holdEndedAt = null;
      item.autoPaused = false;

      // If still blocked, realign blockerPausedAt to match new actualStartTime
      if (item.isBlocked) {
        item.blockerPausedAt = now;
      }

      history.push({
        status: "In Progress",
        startTime: now,
        endTime: null,
        duration: 0,
        date: todayStr,
        user: userId,
      });
      break;
    }

    case "On Hold":
      item.pausedAt = now;
      item.holdStartedAt = now;
      item.holdEndedAt = null;
      item.autoPaused = false;

      history.push({
        status: "On Hold",
        startTime: now,
        endTime: null,
        duration: 0,
        date: todayStr,
        user: userId,
      });
      break;

    case "In Review":
      item.reviewStartedAt = nowMs;
      item.lastReviewStartedAt = nowMs;
      if (!item.actualEndTime) {
        item.actualEndTime = nowMs;
      }
      item.pausedAt = now;

      history.push({
        status: "In Review",
        startTime: now,
        endTime: null,
        duration: 0,
        date: todayStr,
        user: userId,
      });
      break;

    case "Completed":
      item.completedAt = now;
      if (!item.actualEndTime) {
        item.actualEndTime = nowMs;
      }
      item.pausedAt = null;
      item.holdStartedAt = null;

      history.push({
        status: "Completed",
        startTime: now,
        endTime: now,
        duration: 0,
        date: todayStr,
        user: userId,
      });
      break;

    case "Rejected":
      item.completedAt = now;
      if (!item.actualEndTime) {
        item.actualEndTime = nowMs;
      }
      item.pausedAt = null;
      item.holdStartedAt = null;

      history.push({
        status: "Rejected",
        startTime: now,
        endTime: now,
        duration: 0,
        date: todayStr,
        user: userId,
      });
      break;

    case "Correction":
      item.pausedAt = now;
      // ✅ FIX Bug 3: Clear stale hold fields so future On Hold → leave doesn't
      // accidentally use an old holdStartedAt from a previous In Review cycle
      item.holdStartedAt = null;
      item.holdEndedAt = null;
      // Reset actualStartTime so next In Progress session starts a clean timer
      item.actualStartTime = null;

      history.push({
        status: "Correction",
        startTime: now,
        endTime: null,
        duration: 0,
        date: todayStr,
        user: userId,
      });
      break;
  }

  item.statusHistory = history;
};

const calculateItemWorkingTime = (item) => {
  if (!item.actualStartTime) return item.totalTrackedTime || 0;
  const start = new Date(item.actualStartTime).getTime();
  let end = Date.now();
  if (item.actualEndTime) {
    end = new Date(item.actualEndTime).getTime();
  } else if (item.status === "In Progress" && item.autoPaused) {
    end = item.pausedAt ? new Date(item.pausedAt).getTime() : Date.now();
  } else if (item.pausedAt && item.status !== "In Progress") {
    end = new Date(item.pausedAt).getTime();
  } else if (item.status === "Pending") {
    end = item.updatedAt ? new Date(item.updatedAt).getTime() : start;
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
  return (item.totalTrackedTime || 0) + Math.max(0, elapsed);
};













// @desc    Get all tasks
// @route   GET /api/tasks
// @access  Private

// ✅ FIX Bug: Debounce — run auto-pause check at most once every 55 seconds
// Prevents repeated DB writes on every API call when multiple users are active
let _lastSchedulerRunAt = 0;
const SCHEDULER_DEBOUNCE_MS = 55 * 1000; // 55 seconds

exports.getTasks = async (req, res) => {
  try {
    const now = Date.now();
    if (now - _lastSchedulerRunAt >= SCHEDULER_DEBOUNCE_MS) {
      _lastSchedulerRunAt = now;
      const { checkAndAutoPauseTasks } = require("../utils/officeHoursScheduler");
      const io = req.app ? req.app.get("io") : null;
      checkAndAutoPauseTasks(io).catch(err =>
        console.error("[Scheduler] checkAndAutoPauseTasks error:", err)
      );
    }

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
      .populate({
        path: "statusHistory.user",
        select: "name email department profile",
        populate: { path: "profile", select: "profileImage" }
      })
      .populate({
        path: "subtasks.statusHistory.user",
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

// Helper for comparing date only — uses IST timezone to avoid UTC midnight offset bug
const isSameDay = (d1, d2) => {
  if (!d1 || !d2) return false;
  try {
    const opts = { timeZone: "Asia/Kolkata" };
    const s1 = new Date(d1).toLocaleDateString("en-CA", opts);
    const s2 = new Date(d2).toLocaleDateString("en-CA", opts);
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

    // Validate that assignee is an active employee
    if (req.body.assignedTo) {
      const assignee = await User.findById(req.body.assignedTo);
      if (assignee && (assignee.employmentStatus === 'relieved' || assignee.accountStatus === 'inactive')) {
        return res.status(400).json({
          success: false,
          message: 'Cannot assign tasks to a relieved/inactive employee.',
        });
      }
    }
    if (req.body.subtasks && Array.isArray(req.body.subtasks)) {
      for (const sub of req.body.subtasks) {
        if (sub.assignedTo) {
          const subAssignee = await User.findById(sub.assignedTo);
          if (subAssignee && (subAssignee.employmentStatus === 'relieved' || subAssignee.accountStatus === 'inactive')) {
            return res.status(400).json({
              success: false,
              message: 'Cannot assign subtasks to a relieved/inactive employee.',
            });
          }
        }
      }
    }

    const initialStatus = req.body.status || "Pending";
    const now = new Date();
    const todayStr = getISTDateStr(now);
    if (!req.body.statusHistory || req.body.statusHistory.length === 0) {
      req.body.statusHistory = [
        {
          status: initialStatus,
          startTime: now,
          endTime: null,
          duration: 0,
          date: todayStr,
          user: req.user._id,
        }
      ];
    }
    if (initialStatus === "In Progress" && !req.body.actualStartTime) {
      req.body.actualStartTime = now;
    }

    if (req.body.subtasks && Array.isArray(req.body.subtasks)) {
      req.body.subtasks = req.body.subtasks.map(sub => {
        const subStatus = sub.status || "Pending";
        if (!sub.statusHistory || sub.statusHistory.length === 0) {
          sub.statusHistory = [
            {
              status: subStatus,
              startTime: now,
              endTime: null,
              duration: 0,
              date: todayStr,
              user: sub.assignedTo || req.user._id,
            }
          ];
        }
        if (subStatus === "In Progress" && !sub.actualStartTime) {
          sub.actualStartTime = now;
        }
        return sub;
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
      })
      .populate({
        path: "statusHistory.user",
        select: "name email department profile",
        populate: { path: "profile", select: "profileImage" }
      })
      .populate({
        path: "subtasks.statusHistory.user",
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

    // Validate that new assignee is an active employee
    if (req.body.assignedTo) {
      const assignee = await User.findById(req.body.assignedTo);
      if (assignee && (assignee.employmentStatus === 'relieved' || assignee.accountStatus === 'inactive')) {
        return res.status(400).json({
          success: false,
          message: 'Cannot assign tasks to a relieved/inactive employee.',
        });
      }
    }
    if (req.body.subtasks && Array.isArray(req.body.subtasks)) {
      for (const sub of req.body.subtasks) {
        if (sub.assignedTo) {
          const subAssignee = await User.findById(sub.assignedTo);
          if (subAssignee && (subAssignee.employmentStatus === 'relieved' || subAssignee.accountStatus === 'inactive')) {
            return res.status(400).json({
              success: false,
              message: 'Cannot assign subtasks to a relieved/inactive employee.',
            });
          }
        }
      }
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
        
        const dateStr = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
        const hourStr = String(settings.endHour || 19).padStart(2, "0");
        const pausedAtTime = new Date(`${dateStr}T${hourStr}:00:00+05:30`);

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
    const OfficeSettings = require("../models/OfficeSettings");
    const officeSettings = (await OfficeSettings.findOne({ key: "global" })) || {
      startHour: 9,
      endHour: 19,
      workingDays: [1, 2, 3, 4, 5, 6],
    };

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

      if (req.body.status === "On Hold") {
        const isMOMTask = task.contentType === "MOM" || req.body.contentType === "MOM";
        if (!task.actualStartTime && !task.totalTrackedTime && !isMOMTask) {
          return res.status(400).json({
            message: "Please start the task by setting its status to 'In Progress' first before placing it on hold.",
          });
        }
      }

      if (req.body.status === "In Review") {
        if (!task.actualStartTime && !task.totalTrackedTime) {
          return res.status(400).json({
            message: "Please start the task by setting its status to 'In Progress' first before submitting it for review.",
          });
        }
      }

      if (req.body.status === "Correction") {
        const nextRev = (task.revisions || 0) + 1;
        req.body.revisions = nextRev;
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
      }

      if (req.body.status === "Rejected") {
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
      }

      handleItemStatusTransition(task, previousStatus, req.body.status, req.user._id, officeSettings);

      req.body.statusHistory = task.statusHistory;
      req.body.totalTrackedTime = task.totalTrackedTime;
      req.body.dailyTrackedTime = task.dailyTrackedTime;
      req.body.actualStartTime = task.actualStartTime;
      req.body.actualEndTime = task.actualEndTime;
      req.body.holdStartedAt = task.holdStartedAt;
      req.body.holdEndedAt = task.holdEndedAt;
      req.body.pausedAt = task.pausedAt;
      req.body.autoPaused = task.autoPaused;
      req.body.reviewStartedAt = task.reviewStartedAt;
      req.body.lastReviewStartedAt = task.lastReviewStartedAt;
      req.body.approvalWaitingMs = task.approvalWaitingMs;
      req.body.reviewCycles = task.reviewCycles;
      req.body.completedAt = task.completedAt;
    }

    // .........................................Time tracking logic for subtasks...........................................
    if (req.body.subtasks && Array.isArray(req.body.subtasks)) {
      for (const sub of req.body.subtasks) {
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

      req.body.subtasks = req.body.subtasks.map((sub) => {
        const prevSub = previousSubtasks.find(
          (p) => p._id && sub._id && p._id.toString() === sub._id.toString()
        );

        if (prevSub && sub.status && sub.status !== prevSub.status) {
          const isSubMOM = (sub && sub.contentType === "MOM") || (prevSub && prevSub.contentType === "MOM") || task.contentType === "MOM";
          // ✅ FIX Bug 2: Enforce On Hold validation for subtasks (same rule as parent task)
          if (sub.status === "On Hold" && !prevSub.actualStartTime && !prevSub.totalTrackedTime && !isSubMOM) {
            throw Object.assign(
              new Error("Please start the subtask by setting its status to 'In Progress' first before placing it on hold."),
              { statusCode: 400, isValidationError: true }
            );
          }

          if (sub.status === "Correction") {
            const nextSubRev = (prevSub.revisions || 0) + 1;
            sub.revisions = nextSubRev;
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
          }

          if (sub.status === "Rejected") {
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
          }

          handleItemStatusTransition(prevSub, prevSub.status, sub.status, req.user._id, officeSettings);

          sub.statusHistory = prevSub.statusHistory;
          sub.totalTrackedTime = prevSub.totalTrackedTime;
          sub.dailyTrackedTime = prevSub.dailyTrackedTime;
          sub.actualStartTime = prevSub.actualStartTime;
          sub.actualEndTime = prevSub.actualEndTime;
          sub.holdStartedAt = prevSub.holdStartedAt;
          sub.holdEndedAt = prevSub.holdEndedAt;
          sub.pausedAt = prevSub.pausedAt;
          sub.autoPaused = prevSub.autoPaused;
          sub.reviewStartedAt = prevSub.reviewStartedAt;
          sub.lastReviewStartedAt = prevSub.lastReviewStartedAt;
          sub.approvalWaitingMs = prevSub.approvalWaitingMs;
          sub.reviewCycles = prevSub.reviewCycles;
          sub.completedAt = prevSub.completedAt;
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
      })
      .populate({
        path: "statusHistory.user",
        select: "name email department profile",
        populate: { path: "profile", select: "profileImage" }
      })
      .populate({
        path: "subtasks.statusHistory.user",
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
    // ✅ Validation errors (e.g. subtask On Hold before starting) → 400
    // Unexpected server errors → 500
    const statusCode = err.isValidationError ? 400 : (err.statusCode || 400);
    res.status(statusCode).json({ success: false, message: err.message });
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
