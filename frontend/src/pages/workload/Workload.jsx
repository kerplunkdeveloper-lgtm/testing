import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import io from "socket.io-client";
import {
  format,
  isSameDay,
  parseISO,
  subDays,
  addDays,
} from "date-fns";
import {
  FiUsers,
  FiClock,
  FiCheckCircle,
  FiAlertCircle,
  FiPlay,
  FiPauseCircle,
  FiLayers,
  FiSearch,
  FiFilter,
  FiCalendar,
  FiChevronLeft,
  FiChevronRight,
  FiChevronDown,
  FiChevronUp,
  FiEye,
  FiActivity,
  FiBriefcase,
  FiZap,
  FiRefreshCw,
  FiX,
  FiPieChart,
} from "react-icons/fi";
import toast from "react-hot-toast";

import { getUsers } from "../../features/users/userSlice";
import { useGetTasksQuery } from "../../features/api/apiSlice";
import { useTheme } from "../../context/ThemeContext";
import ClientBadge from "../../components/common/ClientBadge";

/**
 * Priority Sort Order for Tasks in "Tasks Assigned to" section:
 * 1. In Progress
 * 2. On Hold
 * 3. In Review
 * 4. Completed
 * 5. Correction / Revision
 * 6. Pending / To Do
 */
const getTaskSortWeight = (status) => {
  if (!status) return 99;
  const s = status.toLowerCase().trim();
  if (s.includes("progress")) return 1;
  if (s.includes("hold") || s.includes("pause")) return 2;
  if (s.includes("review")) return 3;
  if (s.includes("completed")) return 4;
  if (s.includes("correction") || s.includes("revision")) return 5;
  if (s.includes("pending") || s.includes("todo") || s.includes("to do")) return 6;
  return 10;
};

/**
 * Dynamic Header Banner Gradient based on User Settings Accent Color
 */
const getHeaderBannerGradient = (accent) => {
  switch (accent) {
    case "emerald":
      return "bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-950 dark:from-[#064e3b] dark:via-[#047857] dark:to-[#0f172a] border-emerald-500/30";
    case "violet":
    case "mauve":
      return "bg-gradient-to-r from-purple-950 via-violet-900 to-indigo-950 dark:from-[#4c1d95] dark:via-[#5b21b6] dark:to-[#0f172a] border-purple-500/30";
    case "amber":
    case "gold":
      return "bg-gradient-to-r from-amber-950 via-orange-950 to-slate-950 dark:from-[#78350f] dark:via-[#92400e] dark:to-[#0f172a] border-amber-500/30";
    case "rose":
    case "red":
      return "bg-gradient-to-r from-rose-950 via-pink-950 to-slate-950 dark:from-[#881337] dark:via-[#9f1239] dark:to-[#0f172a] border-rose-500/30";
    case "cyan":
      return "bg-gradient-to-r from-cyan-950 via-teal-900 to-slate-950 dark:from-[#164e63] dark:via-[#0e7490] dark:to-[#0f172a] border-cyan-500/30";
    case "lime":
      return "bg-gradient-to-r from-lime-950 via-emerald-950 to-slate-950 dark:from-[#365314] dark:via-[#3f6212] dark:to-[#0f172a] border-lime-500/30";
    case "fuchsia":
      return "bg-gradient-to-r from-fuchsia-950 via-purple-950 to-slate-950 dark:from-[#701a75] dark:via-[#86198f] dark:to-[#0f172a] border-fuchsia-500/30";
    case "teal":
      return "bg-gradient-to-r from-teal-950 via-emerald-950 to-slate-950 dark:from-[#134e4a] dark:via-[#0f766e] dark:to-[#0f172a] border-teal-500/30";
    default: // indigo / default / ocean blue
      return "bg-gradient-to-r from-indigo-950 via-indigo-900 to-slate-950 dark:from-[#1e1b4b] dark:via-[#312e81] dark:to-[#0f172a] border-indigo-500/30";
  }
};

/**
 * Single source of truth calculation for task productivity on a specific date.
 */
const calculateTaskProductivityForDate = (
  task,
  selectedDate = new Date(),
  officeHours = { startHour: 9, endHour: 19 }
) => {
  if (!task) return 0;

  const selDateObj = selectedDate
    ? typeof selectedDate === "string"
      ? parseISO(selectedDate)
      : new Date(selectedDate)
    : new Date();

  const startHour = officeHours?.startHour ?? 9;
  const endHour = officeHours?.endHour ?? 19;

  const dayWorkStart = new Date(
    selDateObj.getFullYear(),
    selDateObj.getMonth(),
    selDateObj.getDate(),
    startHour,
    0,
    0,
    0
  ).getTime();

  const dayWorkEnd = new Date(
    selDateObj.getFullYear(),
    selDateObj.getMonth(),
    selDateObj.getDate(),
    endHour,
    0,
    0,
    0
  ).getTime();

  if (dayWorkStart > Date.now()) return 0;

  let subtasksDuration = 0;
  if (task.subtasks && Array.isArray(task.subtasks) && task.subtasks.length > 0) {
    task.subtasks.forEach((sub) => {
      subtasksDuration += calculateTaskProductivityForDate(
        sub,
        selectedDate,
        officeHours
      );
    });
  }

  if (
    task.statusHistory &&
    Array.isArray(task.statusHistory) &&
    task.statusHistory.length > 0
  ) {
    const selDateStr = selDateObj.toLocaleDateString("en-CA", {
      timeZone: "Asia/Kolkata",
    });
    const isSelectedToday = isSameDay(selDateObj, new Date());
    let historyDuration = 0;

    task.statusHistory.forEach((h) => {
      if (h.status !== "In Progress") return;

      let entryDate = h.date;
      if (!entryDate && h.startTime) {
        entryDate = new Date(h.startTime).toLocaleDateString("en-CA", {
          timeZone: "Asia/Kolkata",
        });
      }
      if (entryDate !== selDateStr) return;

      if (h.duration > 0) {
        historyDuration += h.duration;
      } else if (h.endTime) {
        historyDuration += Math.max(
          0,
          new Date(h.endTime).getTime() - new Date(h.startTime).getTime()
        );
      } else if (
        isSelectedToday &&
        task.status === "In Progress" &&
        !task.autoPaused
      ) {
        // Open entry on today — handled by live section below
      } else {
        const entryStartMs = new Date(h.startTime).getTime();
        const capEnd =
          task.autoPaused && task.pausedAt
            ? Math.min(new Date(task.pausedAt).getTime(), dayWorkEnd)
            : dayWorkEnd;
        historyDuration += Math.max(
          0,
          Math.min(capEnd, dayWorkEnd) - Math.max(entryStartMs, dayWorkStart)
        );
      }
    });

    if (isSelectedToday && task.status === "In Progress" && !task.autoPaused) {
      const liveSessionStart = task.actualStartTime
        ? new Date(task.actualStartTime).getTime()
        : 0;
      const liveSessionDateStr = task.actualStartTime
        ? new Date(task.actualStartTime).toLocaleDateString("en-CA", {
            timeZone: "Asia/Kolkata",
          })
        : null;

      if (liveSessionStart > 0 && liveSessionDateStr === selDateStr) {
        const nowMs = Date.now();
        let liveWorked = Math.max(0, nowMs - liveSessionStart);
        if (task.blockerHistory && Array.isArray(task.blockerHistory)) {
          task.blockerHistory.forEach((b) => {
            if (b.pausedAt) {
              const p = new Date(b.pausedAt).getTime();
              const r = b.resumedAt ? new Date(b.resumedAt).getTime() : nowMs;
              const oStart = Math.max(p, liveSessionStart);
              const oEnd = Math.min(r, nowMs);
              if (oEnd > oStart) {
                liveWorked -= (oEnd - oStart);
              }
            }
          });
        }
        if (task.isBlocked && task.blockerPausedAt) {
          const p = new Date(task.blockerPausedAt).getTime();
          const oStart = Math.max(p, liveSessionStart);
          if (nowMs > oStart) {
            liveWorked -= (nowMs - oStart);
          }
        }
        return Math.max(0, historyDuration + Math.max(0, liveWorked)) + subtasksDuration;
      }
    }

    if (
      historyDuration > 0 ||
      (task.statusHistory.length > 0 && !task.actualStartTime)
    ) {
      return historyDuration + subtasksDuration;
    }
  }

  if (!task.actualStartTime) return subtasksDuration;

  const taskStart = new Date(task.actualStartTime).getTime();
  if (isNaN(taskStart) || taskStart >= dayWorkEnd) return 0;

  const statusUpper = (task.status || "").trim().toUpperCase();
  let taskEnd;

  if (
    statusUpper === "IN REVIEW" ||
    statusUpper === "IN_REVIEW" ||
    statusUpper === "IN-REVIEW"
  ) {
    taskEnd = new Date(
      task.reviewStartedAt ||
        task.lastReviewStartedAt ||
        task.pausedAt ||
        task.actualEndTime ||
        task.updatedAt
    ).getTime();
  } else if (statusUpper === "COMPLETED") {
    const reviewTime =
      task.reviewStartedAt ||
      task.lastReviewStartedAt ||
      (task.reviewCycles && task.reviewCycles.length > 0
        ? task.reviewCycles[task.reviewCycles.length - 1].startedAt
        : null);

    taskEnd = reviewTime
      ? new Date(reviewTime).getTime()
      : new Date(
          task.actualEndTime || task.completedAt || task.updatedAt
        ).getTime();
  } else if (
    statusUpper === "ON HOLD" ||
    statusUpper === "ON_HOLD" ||
    statusUpper === "CORRECTION"
  ) {
    taskEnd = new Date(
      task.pausedAt || task.actualEndTime || task.updatedAt
    ).getTime();
  } else if (statusUpper === "REJECTED") {
    taskEnd = new Date(
      task.actualEndTime || task.completedAt || task.pausedAt || task.updatedAt
    ).getTime();
  } else if (statusUpper === "IN PROGRESS" || statusUpper === "IN_PROGRESS") {
    if (task.autoPaused) {
      taskEnd = new Date(task.pausedAt || Date.now()).getTime();
    } else {
      taskEnd = isSameDay(selDateObj, new Date()) ? Date.now() : dayWorkEnd;
    }
  } else {
    if (task.actualEndTime) {
      taskEnd = new Date(task.actualEndTime).getTime();
    } else if (task.pausedAt) {
      taskEnd = new Date(task.pausedAt).getTime();
    } else {
      taskEnd = isSameDay(selDateObj, new Date()) ? Date.now() : dayWorkEnd;
    }
  }

  if (isNaN(taskEnd) || taskEnd <= taskStart || taskEnd <= dayWorkStart) return 0;

  const effectiveStart = Math.max(taskStart, dayWorkStart);
  const effectiveEnd = Math.min(taskEnd, dayWorkEnd);
  const daySpan = Math.max(0, effectiveEnd - effectiveStart);
  if (daySpan <= 0) return 0;

  let dayPausedMs = 0;
  let hasHistoryPause = false;
  if (
    task.blockerHistory &&
    Array.isArray(task.blockerHistory) &&
    task.blockerHistory.length > 0
  ) {
    task.blockerHistory.forEach((b) => {
      if (b.pausedAt) {
        const pStart = new Date(b.pausedAt).getTime();
        const pEnd = b.resumedAt
          ? new Date(b.resumedAt).getTime()
          : isSameDay(selDateObj, new Date())
          ? Date.now()
          : dayWorkEnd;
        if (!isNaN(pStart) && !isNaN(pEnd) && pEnd > pStart) {
          const overlapStart = Math.max(pStart, dayWorkStart);
          const overlapEnd = Math.min(pEnd, dayWorkEnd);
          if (overlapEnd > overlapStart) {
            dayPausedMs += overlapEnd - overlapStart;
            hasHistoryPause = true;
          }
        }
      }
    });
  }

  if (!hasHistoryPause) {
    const totalPaused = task.totalPausedMs || 0;
    if (totalPaused > 0) {
      const lifetimeSpan = Math.max(
        1,
        new Date(task.actualEndTime || Date.now()).getTime() - taskStart
      );
      const ratio = daySpan / lifetimeSpan;
      dayPausedMs = Math.min(daySpan, totalPaused * ratio);
    }
  }

  return Math.max(0, daySpan - dayPausedMs) + subtasksDuration;
};

// Formatter helper for duration in hours and minutes (no starting 0 clutter)
const formatMsToHoursMinutes = (ms) => {
  if (!ms || ms <= 0) return "0m";
  const totalSecs = Math.floor(ms / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
};

// Live Worked Today cell for individual tasks
const TaskWorkedTodayCell = React.memo(({ task, selectedDate, ticker }) => {
  const workedMs = calculateTaskProductivityForDate(task, selectedDate);
  const isToday = isSameDay(selectedDate, new Date());
  const isRunning =
    isToday &&
    (task.status === "In Progress" || task.status === "IN_PROGRESS") &&
    !task.autoPaused;

  const formatTaskDuration = (ms, includeSeconds = false) => {
    if (!ms || ms <= 0) return null;
    const totalSecs = Math.floor(ms / 1000);
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    const mStr = String(m).padStart(2, "0");
    const sStr = String(s).padStart(2, "0");

    if (includeSeconds) {
      return h > 0 ? `${h}h ${mStr}m ${sStr}s` : `${m}m ${sStr}s`;
    }
    return h > 0 ? `${h}h ${mStr}m` : `${m}m`;
  };

  if (isRunning) {
    return (
      <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
          {formatTaskDuration(workedMs, true) || "Running..."}
        </span>
      </div>
    );
  }

  if (!workedMs || workedMs <= 0) {
    return (
      <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 italic">
        Not started
      </span>
    );
  }

  return (
    <span className="text-xs font-black text-slate-800 dark:text-slate-200">
      {formatTaskDuration(workedMs)}
    </span>
  );
});

const Workload = () => {
  const dispatch = useDispatch();

  // Access user theme settings accent color
  const { accentColor } = useTheme();

  // Load auth user
  const { user: currentUser } = useSelector((state) => state.auth);

  // Load users from Redux store
  const { users = [], loading: usersLoading } = useSelector((state) => state.users);

  // Load tasks via RTK Query
  const {
    data: tasksData = [],
    isLoading: tasksLoading,
    refetch: refetchTasks,
  } = useGetTasksQuery(undefined, {
    pollingInterval: 15000,
  });

  // Real-time Online / Offline state tracking via Socket.IO
  const [onlineUserIds, setOnlineUserIds] = useState([]);

  useEffect(() => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL;
    const socketUrl = baseUrl
      ? baseUrl
      : typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:5001";

    const socket = io(socketUrl, {
      transports: ["polling", "websocket"],
      withCredentials: true,
    });

    const userId = currentUser?._id || currentUser?.id;
    if (userId) {
      socket.emit("join", userId);
    }

    socket.on("online_users_list", (usersList) => {
      setOnlineUserIds(Array.isArray(usersList) ? usersList.map((id) => id.toString()) : []);
    });

    socket.on("user:presence", ({ userId: targetUserId, status }) => {
      if (!targetUserId) return;
      const idStr = targetUserId.toString();
      setOnlineUserIds((prev) => {
        if (status === "online") {
          return prev.includes(idStr) ? prev : [...prev, idStr];
        } else {
          return prev.filter((id) => id !== idStr);
        }
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [currentUser]);

  // State
  const [selectedRole, setSelectedRole] = useState("Graphic Designer"); // Default Graphic Designer user
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState("");
  const [availabilityFilter, setAvailabilityFilter] = useState("all");
  const [expandedUserIds, setExpandedUserIds] = useState([]);
  const [selectedTaskModal, setSelectedTaskModal] = useState(null);
  const [ticker, setTicker] = useState(0);

  // Fetch users on mount if empty
  useEffect(() => {
    dispatch(getUsers());
  }, [dispatch]);

  // Live timer tick for running tasks
  useEffect(() => {
    const isToday = isSameDay(selectedDate, new Date());
    if (isToday) {
      const interval = setInterval(() => {
        setTicker((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [selectedDate]);

  // Extract unique departments from users list + include standard presets
  const availableRoles = useMemo(() => {
    const rolesSet = new Set(["Graphic Designer", "All", "Web Developer", "Performance Marketer", "SEO Specialist"]);
    users.forEach((u) => {
      if (u.department && u.department.trim()) {
        rolesSet.add(u.department.trim());
      }
    });
    return Array.from(rolesSet);
  }, [users]);

  // Filter users based on selected role, search term, and employment status
  const filteredUsers = useMemo(() => {
    let list = (users || []).filter((u) => u.employmentStatus !== "relieved");

    // Filter by Role / Department (First Graphic designer user)
    if (selectedRole !== "All") {
      const targetRoleLower = selectedRole.toLowerCase();
      list = list.filter((u) => {
        const deptLower = (u.department || "").toLowerCase();
        const roleLower = (u.role || "").toLowerCase();
        if (targetRoleLower.includes("graphic")) {
          return (
            deptLower.includes("graphic") ||
            deptLower.includes("design") ||
            roleLower.includes("designer")
          );
        }
        return deptLower.includes(targetRoleLower) || roleLower.includes(targetRoleLower);
      });
    }

    // Filter by Search Term
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter(
        (u) =>
          u.name?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          u.department?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [users, selectedRole, searchTerm]);

  // Helper to check if a task is assigned to a user
  const isTaskAssignedToUser = (task, userId) => {
    if (!task) return false;
    if (typeof task.assignedTo === "string") {
      return task.assignedTo === userId;
    }
    if (task.assignedTo && task.assignedTo._id) {
      return task.assignedTo._id.toString() === userId.toString();
    }
    return false;
  };

  // Compute detailed workload data for each user
  const userWorkloads = useMemo(() => {
    return filteredUsers.map((u) => {
      const userIdStr = u._id?.toString();

      // Real-time Online / Offline status
      const isOnline = onlineUserIds.includes(userIdStr);

      // Find all tasks assigned to this user
      const assignedTasks = (tasksData || []).filter((t) =>
        isTaskAssignedToUser(t, userIdStr)
      );

      // Categorize tasks
      const activeTasks = assignedTasks.filter(
        (t) => t.status === "In Progress" && !t.autoPaused
      );

      const inReviewTasks = assignedTasks.filter(
        (t) =>
          t.status === "In Review" ||
          t.status === "Correction" ||
          t.status === "Revision"
      );

      const pendingTasks = assignedTasks.filter(
        (t) => t.status === "Pending" || t.status === "To Do"
      );

      const onHoldTasks = assignedTasks.filter(
        (t) => t.status === "On Hold" || (t.status === "In Progress" && t.autoPaused)
      );

      const completedTasks = assignedTasks.filter((t) => t.status === "Completed");

      // Calculate total productivity time logged for selected date
      let workedMs = 0;
      assignedTasks.forEach((t) => {
        workedMs += calculateTaskProductivityForDate(t, selectedDate);
      });

      // Capacity Target (Default 8 Hours per day = 28,800,000 ms)
      const capacityHours = u.capacity || 8;
      const capacityMs = capacityHours * 3600 * 1000;
      const utilizationPercent = Math.min(
        150,
        Math.round((workedMs / capacityMs) * 100)
      );

      // Determine Work Activity Status Badge
      let availability = {
        label: isOnline ? "Online (Available)" : "Offline",
        status: isOnline ? "online" : "offline",
        badgeClass: isOnline
          ? "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800/60"
          : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-[#1e293b]/70 dark:text-slate-400 dark:border-slate-700/60",
        dotClass: isOnline ? "bg-sky-500" : "bg-slate-400 dark:bg-slate-500",
      };

      if (activeTasks.length > 0) {
        availability = {
          label: "Busy (Working)",
          status: "busy",
          badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60",
          dotClass: "bg-emerald-500 animate-ping",
        };
      } else if (onHoldTasks.length > 0) {
        availability = {
          label: "On Break / Paused",
          status: "paused",
          badgeClass: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/60",
          dotClass: "bg-amber-500",
        };
      }

      return {
        user: u,
        isOnline,
        assignedTasks,
        activeTasks,
        inReviewTasks,
        pendingTasks,
        onHoldTasks,
        completedTasks,
        workedMs,
        capacityHours,
        utilizationPercent,
        availability,
      };
    });
  }, [filteredUsers, tasksData, selectedDate, onlineUserIds, ticker]);

  // Apply availability filter if selected
  const finalWorkloads = useMemo(() => {
    if (availabilityFilter === "all") return userWorkloads;
    if (availabilityFilter === "online") {
      return userWorkloads.filter((w) => w.isOnline);
    }
    if (availabilityFilter === "offline") {
      return userWorkloads.filter((w) => !w.isOnline);
    }
    return userWorkloads.filter(
      (w) => w.availability.status === availabilityFilter
    );
  }, [userWorkloads, availabilityFilter]);

  // Overall Summary Metrics across current filtered users
  const summaryMetrics = useMemo(() => {
    const totalMembers = finalWorkloads.length;
    let onlineCount = 0;
    let totalActive = 0;
    let totalPending = 0;
    let totalInReview = 0;
    let grandWorkedMs = 0;

    finalWorkloads.forEach((w) => {
      if (w.isOnline) onlineCount++;
      totalActive += w.activeTasks.length;
      totalPending += w.pendingTasks.length;
      totalInReview += w.inReviewTasks.length;
      grandWorkedMs += w.workedMs;
    });

    const avgUtilization =
      totalMembers > 0
        ? Math.round(
            finalWorkloads.reduce((acc, curr) => acc + curr.utilizationPercent, 0) /
              totalMembers
          )
        : 0;

    return {
      totalMembers,
      onlineCount,
      totalActive,
      totalPending,
      totalInReview,
      grandWorkedMs,
      avgUtilization,
    };
  }, [finalWorkloads]);

  const toggleExpandUser = (userId) => {
    setExpandedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleDateChange = (days) => {
    setSelectedDate((prev) => (days > 0 ? addDays(prev, days) : subDays(prev, Math.abs(days))));
  };

  const getPriorityBadgeClass = (priority) => {
    const p = (priority || "").toLowerCase();
    if (p.includes("top") || p.includes("urgent"))
      return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800/60";
    if (p.includes("high"))
      return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/60";
    if (p.includes("medium"))
      return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800/60";
    return "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700/60";
  };

  const getStatusBadgeClass = (status) => {
    const s = (status || "").toLowerCase();
    if (s.includes("progress"))
      return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60";
    if (s.includes("review"))
      return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800/60";
    if (s.includes("hold") || s.includes("pause"))
      return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/60";
    if (s.includes("completed"))
      return "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800/60";
    return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700/60";
  };

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-[#070b14] p-4 sm:p-6 lg:p-8 space-y-8 font-inter text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Header Banner dynamically matching Theme Settings Accent Color */}
      <div className={`relative overflow-hidden rounded-2xl p-6 sm:p-8 shadow-xl border text-white transition-all duration-300 ${getHeaderBannerGradient(accentColor)}`}>
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 rounded-full bg-white/5 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-extrabold bg-white/15 dark:bg-white/10 text-white dark:text-slate-100 border border-white/25 dark:border-white/20 backdrop-blur-md shadow-xs">
              <FiZap className="text-amber-300 animate-pulse" />
              <span>Real-time Team Workload & Online Presence</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white dark:text-slate-100">
              Team Workload & Capacity Management
            </h1>
            <p className="text-slate-100/90 dark:text-slate-300 text-sm max-w-2xl font-medium leading-relaxed">
              Track real-time online/offline status, active tasks, pending workloads, and daily productivity hours for team members.
            </p>
          </div>

          {/* Date Selector Navigation */}
          <div className="flex items-center gap-2 bg-black/30 dark:bg-black/50 p-1.5 rounded-xl border border-white/20 dark:border-slate-700/80 backdrop-blur-md self-start md:self-auto shadow-inner">
            <button
              onClick={() => handleDateChange(-1)}
              className="p-2 rounded-lg hover:bg-white/15 text-white dark:text-slate-200 transition-colors cursor-pointer"
              title="Previous Day"
            >
              <FiChevronLeft size={18} />
            </button>
            <div className="flex items-center gap-2 px-3 py-1">
              <FiCalendar className="text-amber-300 dark:text-amber-400" size={16} />
              <span className="text-sm font-black text-white dark:text-slate-100 whitespace-nowrap">
                {isSameDay(selectedDate, new Date())
                  ? "Today, " + format(selectedDate, "MMM dd")
                  : format(selectedDate, "EEE, MMM dd, yyyy")}
              </span>
            </div>
            <button
              onClick={() => handleDateChange(1)}
              className="p-2 rounded-lg hover:bg-white/15 text-white dark:text-slate-200 transition-colors cursor-pointer"
              title="Next Day"
            >
              <FiChevronRight size={18} />
            </button>
            {!isSameDay(selectedDate, new Date()) && (
              <button
                onClick={() => setSelectedDate(new Date())}
                className="px-2.5 py-1 text-xs font-extrabold bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors ml-1 backdrop-blur-md border border-white/30"
              >
                Today
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Metric 1: Total & Online Members */}
        <div className="bg-white dark:bg-[#0f172a]/90 rounded-xl p-4 border border-slate-200/80 dark:border-slate-800/90 shadow-xs hover:border-indigo-500/30 transition-all space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Members</span>
            <FiUsers className="text-indigo-500 dark:text-indigo-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-800 dark:text-slate-100">
              {summaryMetrics.totalMembers}
            </span>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              ({summaryMetrics.onlineCount} Online)
            </span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
            {selectedRole} Role
          </div>
        </div>

        {/* Metric 2: Active Tasks */}
        <div className="bg-white dark:bg-[#0f172a]/90 rounded-xl p-4 border border-slate-200/80 dark:border-slate-800/90 shadow-xs hover:border-emerald-500/30 transition-all space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Active Tasks</span>
            <FiPlay className="text-emerald-500 dark:text-emerald-400 animate-pulse" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {summaryMetrics.totalActive}
          </div>
          <div className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80">
            Currently In Progress
          </div>
        </div>

        {/* Metric 3: Pending Tasks */}
        <div className="bg-white dark:bg-[#0f172a]/90 rounded-xl p-4 border border-slate-200/80 dark:border-slate-800/90 shadow-xs hover:border-amber-500/30 transition-all space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Pending Tasks</span>
            <FiClock className="text-amber-500 dark:text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
            {summaryMetrics.totalPending}
          </div>
          <div className="text-[11px] text-amber-600/80 dark:text-amber-400/80">
            Queued for completion
          </div>
        </div>

        {/* Metric 4: In Review */}
        <div className="bg-white dark:bg-[#0f172a]/90 rounded-xl p-4 border border-slate-200/80 dark:border-slate-800/90 shadow-xs hover:border-purple-500/30 transition-all space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>In Review</span>
            <FiLayers className="text-purple-500 dark:text-purple-400" />
          </div>
          <div className="text-2xl font-black text-purple-600 dark:text-purple-400">
            {summaryMetrics.totalInReview}
          </div>
          <div className="text-[11px] text-purple-600/80 dark:text-purple-400/80">
            Awaiting manager review
          </div>
        </div>

        {/* Metric 5: Total Logged Time */}
        <div className="bg-white dark:bg-[#0f172a]/90 rounded-xl p-4 border border-slate-200/80 dark:border-slate-800/90 shadow-xs hover:border-sky-500/30 transition-all space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Logged Time</span>
            <FiActivity className="text-sky-500 dark:text-sky-400" />
          </div>
          <div className="text-2xl font-black text-slate-800 dark:text-slate-100">
            {formatMsToHoursMinutes(summaryMetrics.grandWorkedMs)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Total product hours
          </div>
        </div>

        {/* Metric 6: Avg Utilization */}
        <div className="bg-white dark:bg-[#0f172a]/90 rounded-xl p-4 border border-slate-200/80 dark:border-slate-800/90 shadow-xs hover:border-indigo-500/30 transition-all space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Avg Utilization</span>
            <FiPieChart className="text-indigo-500 dark:text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
            {summaryMetrics.avgUtilization}%
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Target 8h daily capacity
          </div>
        </div>
      </div>

      {/* Controls & Filter Bar */}
      <div className="bg-white dark:bg-[#0f172a]/95 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/90 shadow-xs space-y-4">
        {/* Role Filter Pills */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full no-scrollbar">
            {availableRoles.map((role) => (
              <button
                key={role}
                onClick={() => setSelectedRole(role)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap border shrink-0 ${
                  selectedRole === role
                    ? "bg-indigo-600 text-white border-indigo-600 dark:bg-indigo-600 dark:border-indigo-500 shadow-md shadow-indigo-500/20"
                    : "bg-slate-50 dark:bg-[#1e293b]/70 text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-slate-700/70 hover:bg-slate-100 dark:hover:bg-[#334155]"
                }`}
              >
                {role === "Graphic Designer" ? "🎨 Graphic Designer" : role}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => refetchTasks()}
              className="p-2 rounded-lg bg-slate-100 dark:bg-[#1e293b] text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#334155] transition-colors border border-slate-200/60 dark:border-slate-700/60"
              title="Refresh Tasks"
            >
              <FiRefreshCw size={15} />
            </button>
          </div>
        </div>

        {/* Search & Availability Filter Controls */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
          <div className="relative w-full sm:w-80">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={15} />
            <input
              type="text"
              placeholder="Search team member by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/80 dark:bg-[#1e293b]/60 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <FiX size={14} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto w-full sm:w-auto">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-bold whitespace-nowrap">
              Status Filter:
            </span>
            <select
              value={availabilityFilter}
              onChange={(e) => setAvailabilityFilter(e.target.value)}
              className="px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-[#1e293b] text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="online">🟢 Real-Time Online Only</option>
              <option value="offline">⚪ Real-Time Offline Only</option>
              <option value="busy">⚡ Busy (In Progress)</option>
              <option value="paused">⏸️ On Break / Paused</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Workload List / Grid */}
      {usersLoading || tasksLoading ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-4">
          <div className="w-10 h-10 border-4 border-indigo-600 dark:border-indigo-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold text-slate-400 dark:text-slate-500 tracking-wider uppercase animate-pulse">
            Loading team workload data...
          </span>
        </div>
      ) : finalWorkloads.length === 0 ? (
        <div className="bg-white dark:bg-[#0f172a]/90 rounded-2xl p-12 text-center border border-slate-200/80 dark:border-slate-800/90 space-y-4">
          <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mx-auto border border-indigo-100 dark:border-indigo-900/50">
            <FiUsers size={32} />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
              No Team Members Found
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              There are no team members matching the selected role "{selectedRole}" or filter criteria.
            </p>
          </div>
          <button
            onClick={() => {
              setSelectedRole("All");
              setSearchTerm("");
              setAvailabilityFilter("all");
            }}
            className="px-4 py-2 text-xs font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
          >
            Clear Filters & View All Members
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {finalWorkloads.map((workload) => {
            const {
              user: member,
              isOnline,
              assignedTasks,
              activeTasks,
              inReviewTasks,
              pendingTasks,
              onHoldTasks,
              completedTasks,
              workedMs,
              capacityHours,
              utilizationPercent,
              availability,
            } = workload;

            const isExpanded = expandedUserIds.includes(member._id);

            // Sort assigned tasks according to requested priority:
            // 1. In Progress
            // 2. On Hold
            // 3. In Review
            // 4. Completed
            // 5. Correction / Revision
            // 6. Pending
            const sortedAssignedTasks = [...assignedTasks].sort(
              (a, b) => getTaskSortWeight(a.status) - getTaskSortWeight(b.status)
            );

            // Progress bar color based on utilization %
            let barColor = "bg-emerald-500";
            if (utilizationPercent > 100) barColor = "bg-rose-500";
            else if (utilizationPercent > 80) barColor = "bg-amber-500";
            else if (utilizationPercent < 30) barColor = "bg-indigo-500";

            return (
              <div
                key={member._id}
                className="bg-white dark:bg-[#0f172a]/95 rounded-2xl border border-slate-200/80 dark:border-slate-800/90 shadow-xs hover:shadow-lg dark:hover:border-indigo-500/40 transition-all duration-200 overflow-hidden"
              >
                {/* User Card Main Row */}
                <div className="p-5 sm:p-6 space-y-4">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* User Profile Info */}
                    <div className="flex items-center gap-4">
                      <div className="relative shrink-0">
                        {member.profile?.profileImage?.url ? (
                          <img
                            src={member.profile.profileImage.url}
                            alt={member.name}
                            className="w-12 h-12 rounded-xl object-cover border-2 border-white dark:border-slate-800 shadow-xs"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-extrabold text-base flex items-center justify-center border-2 border-white dark:border-slate-800 shadow-xs uppercase">
                            {member.name ? member.name.substring(0, 2) : "TM"}
                          </div>
                        )}
                        {/* Real-time Online / Offline Indicator Dot */}
                        <span
                          className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 ${
                            isOnline
                              ? "bg-emerald-500 shadow-xs animate-pulse"
                              : "bg-slate-400 dark:bg-slate-600"
                          }`}
                          title={isOnline ? "Online Now" : "Offline"}
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                            {member.name}
                          </h3>

                          {/* Real-Time Online / Offline Badge */}
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border ${
                              isOnline
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60"
                                : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-[#1e293b]/70 dark:text-slate-400 dark:border-slate-700/60"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isOnline ? "bg-emerald-500 animate-ping" : "bg-slate-400 dark:bg-slate-500"
                              }`}
                            />
                            {isOnline ? "Online" : "Offline"}
                          </span>

                          {/* Work Activity Badge */}
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${availability.badgeClass}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${availability.dotClass}`} />
                            {availability.label}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                          <span className="font-medium">{member.email}</span>
                          <span>•</span>
                          <span className="font-bold text-indigo-600 dark:text-indigo-400">
                            {member.department || "Graphic Designer"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Productivity & Capacity Gauges */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 lg:w-96">
                      <div className="flex-1 space-y-1.5 bg-slate-50/80 dark:bg-[#1e293b]/50 p-3 rounded-xl border border-slate-200/70 dark:border-slate-800">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-600 dark:text-slate-400">
                            Productivity Hours
                          </span>
                          <span className="font-black text-slate-900 dark:text-white">
                            {formatMsToHoursMinutes(workedMs)} / {capacityHours}h target
                          </span>
                        </div>

                        {/* Capacity Progress Bar */}
                        <div className="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                            style={{ width: `${utilizationPercent}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500 dark:text-slate-400">
                            Utilization Rate
                          </span>
                          <span
                            className={`font-black ${
                              utilizationPercent > 100
                                ? "text-rose-600 dark:text-rose-400"
                                : "text-emerald-600 dark:text-emerald-400"
                            }`}
                          >
                            {utilizationPercent}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Task Counters Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
                    <div className="bg-emerald-50/70 dark:bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-200/70 dark:border-emerald-900/50 flex items-center justify-between">
                      <div>
                        <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                          Active
                        </div>
                        <div className="text-lg font-black text-emerald-800 dark:text-emerald-300">
                          {activeTasks.length}
                        </div>
                      </div>
                      <FiPlay className="text-emerald-500 dark:text-emerald-400 animate-pulse" size={18} />
                    </div>

                    <div className="bg-purple-50/70 dark:bg-purple-950/40 p-2.5 rounded-xl border border-purple-200/70 dark:border-purple-900/50 flex items-center justify-between">
                      <div>
                        <div className="text-[11px] font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider">
                          In Review
                        </div>
                        <div className="text-lg font-black text-purple-800 dark:text-purple-300">
                          {inReviewTasks.length}
                        </div>
                      </div>
                      <FiLayers className="text-purple-500 dark:text-purple-400" size={18} />
                    </div>

                    <div className="bg-amber-50/70 dark:bg-amber-950/40 p-2.5 rounded-xl border border-amber-200/70 dark:border-amber-900/50 flex items-center justify-between">
                      <div>
                        <div className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                          Pending
                        </div>
                        <div className="text-lg font-black text-amber-800 dark:text-amber-300">
                          {pendingTasks.length}
                        </div>
                      </div>
                      <FiClock className="text-amber-500 dark:text-amber-400" size={18} />
                    </div>

                    <div className="bg-slate-100/80 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between">
                      <div>
                        <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                          On Hold
                        </div>
                        <div className="text-lg font-black text-slate-800 dark:text-slate-200">
                          {onHoldTasks.length}
                        </div>
                      </div>
                      <FiPauseCircle className="text-slate-500 dark:text-slate-400" size={18} />
                    </div>

                    <div className="bg-sky-50/70 dark:bg-sky-950/40 p-2.5 rounded-xl border border-sky-200/70 dark:border-sky-900/50 flex items-center justify-between col-span-2 sm:col-span-1">
                      <div>
                        <div className="text-[11px] font-bold text-sky-700 dark:text-sky-400 uppercase tracking-wider">
                          Completed
                        </div>
                        <div className="text-lg font-black text-sky-800 dark:text-sky-300">
                          {completedTasks.length}
                        </div>
                      </div>
                      <FiCheckCircle className="text-sky-500 dark:text-sky-400" size={18} />
                    </div>
                  </div>

                  {/* Expand / Collapse Accordion Toggle */}
                  <div className="flex items-center justify-between pt-2">
                    <button
                      onClick={() => toggleExpandUser(member._id)}
                      className="inline-flex items-center gap-2 text-xs font-extrabold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors"
                    >
                      <span>
                        {isExpanded
                          ? "Hide Assigned Tasks"
                          : `View Assigned Tasks (${assignedTasks.length})`}
                      </span>
                      {isExpanded ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
                    </button>

                    <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                      Total Tasks: {assignedTasks.length}
                    </span>
                  </div>
                </div>

                {/* Detailed Tasks Table / List when Expanded */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-t border-slate-200/80 dark:border-slate-800/90 bg-slate-50/80 dark:bg-[#0a0f1d] p-4 sm:p-6"
                    >
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                        Tasks Assigned to {member.name}
                      </h4>

                      {sortedAssignedTasks.length === 0 ? (
                        <div className="py-6 text-center text-xs text-slate-400 dark:text-slate-500 italic">
                          No tasks currently assigned to this user.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {sortedAssignedTasks.map((task) => (
                            <div
                              key={task._id}
                              className="bg-white dark:bg-[#111827] rounded-xl p-3.5 border border-slate-200/80 dark:border-slate-800/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-indigo-300 dark:hover:border-indigo-500/40 transition-all shadow-xs"
                            >
                              <div className="space-y-1 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h5 className="text-xs font-extrabold text-slate-900 dark:text-slate-100">
                                    {task.title}
                                  </h5>
                                  {task.client && (
                                    <ClientBadge client={task.client} size="sm" />
                                  )}
                                </div>

                                <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap">
                                  {task.dueDate && (
                                    <span className="flex items-center gap-1">
                                      <FiCalendar size={12} />
                                      Due: {format(parseISO(task.dueDate), "MMM dd")}
                                    </span>
                                  )}
                                  {task.contentType && (
                                    <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold">
                                      {task.contentType}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-3 self-end sm:self-center">
                                {/* Logged time for task (Live timer when running, no starting 0 clutter) */}
                                <div className="text-right">
                                  <div className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                                    Worked Today
                                  </div>
                                  <TaskWorkedTodayCell
                                    task={task}
                                    selectedDate={selectedDate}
                                    ticker={ticker}
                                  />
                                </div>

                                {/* Priority Badge */}
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border ${getPriorityBadgeClass(
                                    task.priority
                                  )}`}
                                >
                                  {task.priority || "Medium"}
                                </span>

                                {/* Status Badge */}
                                <span
                                  className={`px-2.5 py-1 rounded-full text-xs font-extrabold border ${getStatusBadgeClass(
                                    task.status
                                  )}`}
                                >
                                  {task.status}
                                </span>

                                {/* Action button */}
                                <button
                                  onClick={() => setSelectedTaskModal(task)}
                                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors"
                                  title="View Task Details"
                                >
                                  <FiEye size={15} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

      {/* Task Preview Modal */}
      <AnimatePresence>
        {selectedTaskModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#0f172a] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <FiBriefcase className="text-indigo-500 dark:text-indigo-400" size={18} />
                  <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                    Task Details
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedTaskModal(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <FiX size={18} />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    Task Title
                  </label>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                    {selectedTaskModal.title}
                  </p>
                </div>

                {selectedTaskModal.client && (
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
                      Client
                    </label>
                    <ClientBadge client={selectedTaskModal.client} size="md" />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Status
                    </label>
                    <div className="mt-1">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusBadgeClass(
                          selectedTaskModal.status
                        )}`}
                      >
                        {selectedTaskModal.status}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Priority
                    </label>
                    <div className="mt-1">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-bold uppercase border ${getPriorityBadgeClass(
                          selectedTaskModal.priority
                        )}`}
                      >
                        {selectedTaskModal.priority || "Medium"}
                      </span>
                    </div>
                  </div>
                </div>

                {selectedTaskModal.description && (
                  <div className="pt-2">
                    <label className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Description
                    </label>
                    <p className="text-slate-700 dark:text-slate-200 mt-1 bg-slate-50 dark:bg-[#1e293b]/70 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/70 whitespace-pre-wrap leading-relaxed">
                      {selectedTaskModal.description}
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button
                  onClick={() => setSelectedTaskModal(null)}
                  className="px-4 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Workload;