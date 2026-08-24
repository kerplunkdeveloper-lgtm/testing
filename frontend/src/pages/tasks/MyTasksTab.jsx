import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import { BiFile } from "react-icons/bi";
import {
  FiCheck,
  FiClock,
  FiCheckSquare,
  FiAlertCircle,
  FiCalendar,
  FiBriefcase,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiChevronsLeft,
  FiChevronsRight,
  FiX,
  FiPlus,
  FiTrash2,
  FiFilter,
  FiList,
  FiGrid,
  FiColumns,
  FiTag,
  FiCopy,
  FiMessageSquare,
  FiEdit,
  FiEdit3,
  FiAlertTriangle,
  FiUser,
  FiSearch,
  FiDownload,
} from "react-icons/fi";
import {
  useUpdateTaskMutation,
  useDeleteTaskMutation,
} from "../../features/api/apiSlice";
import axiosInstance from "../../services/axiosInstance";
import toast from "react-hot-toast";
import ClientBadge from "../../components/common/ClientBadge";
import { getClientIconComponent } from "../../utils/clientHelpers";
import { calculateBusinessMs } from "../../utils/businessHours";
import CorrectionModal from "../../components/CorrectionModal";
import RejectionModal from "../../components/RejectionModal";
import StatusHistoryTable from "../../components/common/StatusHistoryTable";
import { calculateTaskProductivityForDate } from "../Dashboard/cards/GraphicDesignerDashboard";

const isSameDate = (d1, d2) => {
  if (!d1 || !d2) return false;
  try {
    const s1 =
      typeof d1 === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d1.trim())
        ? d1.trim()
        : new Date(d1).toISOString().split("T")[0];
    const s2 =
      typeof d2 === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d2.trim())
        ? d2.trim()
        : new Date(d2).toISOString().split("T")[0];
    return s1 === s2 && s1 !== "1970-01-01";
  } catch (e) {
    return false;
  }
};

const isStatusInProgress = (s) =>
  (s || "").trim().toUpperCase().replace(/[-_]/g, " ") === "IN PROGRESS";

const checkTaskProductivityAndDate = (
  task,
  dateFilter,
  officeHours = { startHour: 9, endHour: 19 },
) => {
  if (!dateFilter || dateFilter === "All") return true;
  if (!task) return false;

  const now = new Date();
  const getLocalDateStr = (d) => {
    if (!d) return null;
    const date = new Date(d);
    if (isNaN(date.getTime())) return null;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const todayStr = getLocalDateStr(now);

  if (dateFilter === "Today") {
    // 1. Logged productivity for Today (same as EodReports.jsx)
    const loggedMs = calculateTaskProductivityForDate(task, now, officeHours);
    if (loggedMs > 0) return true;

    // 2. Actively running In Progress today
    if (
      isStatusInProgress(task.status) &&
      !task.actualEndTime &&
      !task.autoPaused
    ) {
      return true;
    }

    // 3. Status History work session on Today
    if (Array.isArray(task.statusHistory) && task.statusHistory.length > 0) {
      const hasTodayWork = task.statusHistory.some((h) => {
        const entryDate =
          h.date || getLocalDateStr(h.startTime) || getLocalDateStr(h.endTime);
        return (
          entryDate === todayStr &&
          (h.duration > 0 || h.endTime || isStatusInProgress(h.status))
        );
      });
      if (hasTodayWork) return true;
    }

    // 4. Subtasks check for today
    if (Array.isArray(task.subtasks) && task.subtasks.length > 0) {
      const subHasTodayWork = task.subtasks.some((sub) => {
        const subMs = calculateTaskProductivityForDate(sub, now, officeHours);
        if (subMs > 0) return true;
        if (
          isStatusInProgress(sub.status) &&
          !sub.actualEndTime &&
          !sub.autoPaused
        )
          return true;
        return false;
      });
      if (subHasTodayWork) return true;
    }

    // 5. Task scheduled, due, created, or assigned on Today (crucial for Pending tasks)
    const taskStartStr = getLocalDateStr(task.startDate);
    const taskDueStr = getLocalDateStr(task.dueDate);
    const taskCreatedStr = getLocalDateStr(task.createdAt);
    const taskAssignedStr = getLocalDateStr(task.assignedDate);
    if (
      taskStartStr === todayStr ||
      taskDueStr === todayStr ||
      taskCreatedStr === todayStr ||
      taskAssignedStr === todayStr
    ) {
      return true;
    }

    // 6. Subtasks scheduled, due, or created on Today
    if (Array.isArray(task.subtasks) && task.subtasks.length > 0) {
      const subHasTodayDate = task.subtasks.some((sub) => {
        const subStart = getLocalDateStr(sub.startDate);
        const subDue = getLocalDateStr(sub.dueDate);
        const subCreated = getLocalDateStr(sub.createdAt);
        return (
          subStart === todayStr ||
          subDue === todayStr ||
          subCreated === todayStr
        );
      });
      if (subHasTodayDate) return true;
    }

    return false;
  }

  if (dateFilter === "Yesterday") {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getLocalDateStr(yesterday);

    const loggedMs = calculateTaskProductivityForDate(
      task,
      yesterday,
      officeHours,
    );
    if (loggedMs > 0) return true;

    if (Array.isArray(task.statusHistory) && task.statusHistory.length > 0) {
      const hasYesterdayWork = task.statusHistory.some((h) => {
        const entryDate =
          h.date || getLocalDateStr(h.startTime) || getLocalDateStr(h.endTime);
        return entryDate === yesterdayStr && (h.duration > 0 || h.endTime);
      });
      if (hasYesterdayWork) return true;
    }

    const taskStartStr = getLocalDateStr(task.startDate);
    const taskDueStr = getLocalDateStr(task.dueDate);
    const taskCreatedStr = getLocalDateStr(task.createdAt);
    const taskAssignedStr = getLocalDateStr(task.assignedDate);
    if (
      taskStartStr === yesterdayStr ||
      taskDueStr === yesterdayStr ||
      taskCreatedStr === yesterdayStr ||
      taskAssignedStr === yesterdayStr
    ) {
      return true;
    }

    if (Array.isArray(task.subtasks) && task.subtasks.length > 0) {
      const subHasYesterdayDate = task.subtasks.some((sub) => {
        const subStart = getLocalDateStr(sub.startDate);
        const subDue = getLocalDateStr(sub.dueDate);
        const subCreated = getLocalDateStr(sub.createdAt);
        return (
          subStart === yesterdayStr ||
          subDue === yesterdayStr ||
          subCreated === yesterdayStr
        );
      });
      if (subHasYesterdayDate) return true;
    }

    return false;
  }

  if (dateFilter === "This Week") {
    const dayOfWeek = now.getDay();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const isDateInWeek = (d) => {
      if (!d) return false;
      const date = new Date(d);
      return !isNaN(date.getTime()) && date >= startOfWeek && date <= endOfWeek;
    };

    if (
      isDateInWeek(task.startDate) ||
      isDateInWeek(task.dueDate) ||
      isDateInWeek(task.createdAt) ||
      isDateInWeek(task.assignedDate)
    ) {
      return true;
    }

    if (Array.isArray(task.subtasks) && task.subtasks.length > 0) {
      const subInWeek = task.subtasks.some(
        (sub) =>
          isDateInWeek(sub.startDate) ||
          isDateInWeek(sub.dueDate) ||
          isDateInWeek(sub.createdAt),
      );
      if (subInWeek) return true;
    }

    if (task.status === "In Progress" && !task.actualEndTime) return true;

    const currDay = new Date(startOfWeek);
    while (currDay <= endOfWeek && currDay <= now) {
      if (calculateTaskProductivityForDate(task, currDay, officeHours) > 0) {
        return true;
      }
      currDay.setDate(currDay.getDate() + 1);
    }

    return false;
  }

  if (dateFilter === "This Month") {
    const startOfMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      1,
      0,
      0,
      0,
      0,
    );
    const endOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );

    const isDateInMonth = (d) => {
      if (!d) return false;
      const date = new Date(d);
      return (
        !isNaN(date.getTime()) && date >= startOfMonth && date <= endOfMonth
      );
    };

    if (
      isDateInMonth(task.startDate) ||
      isDateInMonth(task.dueDate) ||
      isDateInMonth(task.createdAt) ||
      isDateInMonth(task.assignedDate)
    ) {
      return true;
    }

    if (Array.isArray(task.subtasks) && task.subtasks.length > 0) {
      const subInMonth = task.subtasks.some(
        (sub) =>
          isDateInMonth(sub.startDate) ||
          isDateInMonth(sub.dueDate) ||
          isDateInMonth(sub.createdAt),
      );
      if (subInMonth) return true;
    }

    if (task.status === "In Progress" && !task.actualEndTime) return true;

    const currDay = new Date(startOfMonth);
    while (currDay <= endOfMonth && currDay <= now) {
      if (calculateTaskProductivityForDate(task, currDay, officeHours) > 0) {
        return true;
      }
      currDay.setDate(currDay.getDate() + 1);
    }

    return false;
  }

  return true;
};

const TimeTracker = ({
  startTime,
  endTime,
  status,
  pausedAt,
  autoPaused,
  savedPausedMs = 0,
  isBlocked,
  blockerPausedAt,
  blockerHistory,
  totalTrackedTime = 0,
  fullWidth = false,
}) => {
  const [elapsed, setElapsed] = useState(0);
  const [blockedMs, setBlockedMs] = useState(0);

  useEffect(() => {
    if (!startTime) {
      setElapsed(0);
      setBlockedMs(0);
      return;
    }

    const statusUpper = (status || "").trim().toUpperCase().replace(/[-_]/g, " ");

    const calculateTime = () => {
      const start = new Date(startTime).getTime();
      let end;

      if (endTime) {
        end = new Date(endTime).getTime();
      } else if (statusUpper === "IN PROGRESS" && autoPaused) {
        end = pausedAt ? new Date(pausedAt).getTime() : Date.now();
      } else if (
        pausedAt &&
        ["ON HOLD", "REJECTED", "IN REVIEW", "CORRECTION"].includes(statusUpper)
      ) {
        end = new Date(pausedAt).getTime();
      } else {
        end = Date.now();
      }

      let sessionPauseMs = 0;
      let lifetimeBlockerMs = 0;
      if (blockerHistory && blockerHistory.length > 0) {
        blockerHistory.forEach((item) => {
          if (item.pausedAt) {
            const p = new Date(item.pausedAt).getTime();
            let r = item.resumedAt
              ? new Date(item.resumedAt).getTime()
              : Date.now();
            if (r > end) r = end;
            if (r >= p) {
              lifetimeBlockerMs += r - p;
              const oStart = Math.max(p, start);
              const oEnd = Math.min(r, end);
              if (oEnd > oStart) {
                sessionPauseMs += oEnd - oStart;
              }
            }
          }
        });
      }

      if (isBlocked && blockerPausedAt) {
        const pauseStart = new Date(blockerPausedAt).getTime();
        if (pauseStart < end) {
          lifetimeBlockerMs += end - pauseStart;
          const oStart = Math.max(pauseStart, start);
          if (end > oStart) {
            sessionPauseMs += end - oStart;
          }
        }
      }

      const totalElapsedMs =
        end - start - (savedPausedMs || 0) - sessionPauseMs;
      return {
        active: Math.max(0, Math.floor(totalElapsedMs / 1000)),
        blocked: Math.max(0, Math.floor(lifetimeBlockerMs / 1000)),
      };
    };

    const update = () => {
      const { active, blocked } = calculateTime();
      setElapsed(active);
      setBlockedMs(blocked);
    };

    update();

    if (statusUpper === "IN PROGRESS" && !autoPaused && !endTime) {
      const interval = setInterval(update, 1000);
      return () => clearInterval(interval);
    }
  }, [
    startTime,
    endTime,
    pausedAt,
    autoPaused,
    status,
    savedPausedMs,
    isBlocked,
    blockerPausedAt,
    blockerHistory,
  ]);

  const formatTime = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h > 0 ? `${h}h ` : ""}${m}m ${s}s`;
  };

  const lifetimeSecs = Math.floor((totalTrackedTime || 0) / 1000);

  if (!startTime && status !== "In Progress") {
    if (!status || status.toLowerCase() === "pending") {
      return (
        <span className="text-slate-400 dark:text-slate-500 font-semibold text-xs">
          {totalTrackedTime > 0 ? formatTime(lifetimeSecs) : "Not started"}
        </span>
      );
    }
    if (status === "On Hold") {
      const holdSecs = lifetimeSecs > 0 ? lifetimeSecs : elapsed;
      return (
        <span className="text-slate-400 dark:text-slate-500 font-semibold text-xs">
          {holdSecs > 0 ? formatTime(holdSecs) : "00:00:00"}
        </span>
      );
    }
    return (
      <span className="text-slate-400 dark:text-slate-500 font-semibold text-xs">
        {totalTrackedTime > 0 ? formatTime(lifetimeSecs) : "—"}
      </span>
    );
  }
  if (!startTime && status === "In Progress")
    return (
      <div className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[9px] font-bold tracking-wider bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-500/10 dark:text-[#3b82f6] dark:border-[#3b82f6]/30 shadow-sm">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-[#3b82f6] animate-pulse"></span>
        Starting...
      </div>
    );

  const activeSecs =
    status === "In Progress"
      ? lifetimeSecs + elapsed
      : lifetimeSecs > 0
        ? lifetimeSecs
        : elapsed;

  const activeStr = formatTime(activeSecs);
  const blockedStr = formatTime(blockedMs);
  const totalStr = formatTime(activeSecs + blockedMs);

  return (
    <div
      className={`flex flex-col gap-1 ${fullWidth ? "w-full" : "w-[120px]"} text-[9px] font-bold tracking-wide`}
    >
      <div className="flex justify-between items-center bg-blue-50 dark:bg-blue-500/10 border border-blue-200/50 dark:border-blue-500/20 px-1.5 py-0.5 rounded text-blue-600 dark:text-blue-400">
        <span>Active:</span>
        <span>{activeStr}</span>
      </div>
      {(blockedMs > 0 || isBlocked) && (
        <div className="flex justify-between items-center bg-red-50 dark:bg-red-500/10 border border-red-200/50 dark:border-red-500/20 px-1.5 py-0.5 rounded text-red-600 dark:text-red-400">
          <span>Blocked:</span>
          <span>{blockedStr}</span>
        </div>
      )}
      <div className="flex justify-between items-center bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-600/50 px-1.5 py-0.5 rounded text-slate-800 dark:text-slate-100 shadow-sm">
        <span>Total:</span>
        <span>{totalStr}</span>
      </div>
    </div>
  );
};

const SingleTimeDisplay = React.memo(
  ({
    mode = "active", // "active" or "blocker"
    startTime,
    endTime,
    status,
    pausedAt,
    autoPaused,
    savedPausedMs = 0,
    isBlocked,
    blockerPausedAt,
    blockerHistory,
    totalTrackedTime = 0,
  }) => {
    const [elapsed, setElapsed] = useState(0);
    const [blockedMs, setBlockedMs] = useState(0);

    useEffect(() => {
      if (!startTime) {
        setElapsed(0);
        setBlockedMs(0);
        return;
      }

      const calculateTime = () => {
        const start = new Date(startTime).getTime();
        let end;

        if (endTime) {
          end = new Date(endTime).getTime();
        } else if (status === "In Progress" && autoPaused) {
          end = pausedAt ? new Date(pausedAt).getTime() : Date.now();
        } else if (
          pausedAt &&
          ["On Hold", "Rejected", "In Review", "Correction"].includes(status)
        ) {
          end = new Date(pausedAt).getTime();
        } else {
          end = Date.now();
        }

        let sessionPauseMs = 0;
        let lifetimeBlockerMs = 0;
        if (blockerHistory && blockerHistory.length > 0) {
          blockerHistory.forEach((item) => {
            if (item.pausedAt) {
              const p = new Date(item.pausedAt).getTime();
              let r = item.resumedAt
                ? new Date(item.resumedAt).getTime()
                : Date.now();
              if (r > end) r = end;
              if (r >= p) {
                lifetimeBlockerMs += r - p;
                const oStart = Math.max(p, start);
                const oEnd = Math.min(r, end);
                if (oEnd > oStart) {
                  sessionPauseMs += oEnd - oStart;
                }
              }
            }
          });
        }

        if (isBlocked && blockerPausedAt) {
          const pauseStart = new Date(blockerPausedAt).getTime();
          if (pauseStart < end) {
            lifetimeBlockerMs += end - pauseStart;
            const oStart = Math.max(pauseStart, start);
            if (end > oStart) {
              sessionPauseMs += end - oStart;
            }
          }
        }

        const totalElapsedMs =
          end - start - (savedPausedMs || 0) - sessionPauseMs;
        return {
          active: Math.max(0, Math.floor(totalElapsedMs / 1000)),
          blocked: Math.max(0, Math.floor(lifetimeBlockerMs / 1000)),
        };
      };

      const update = () => {
        const { active, blocked } = calculateTime();
        setElapsed(active);
        setBlockedMs(blocked);
      };

      update();

      if (status === "In Progress" && !autoPaused && !endTime) {
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
      }
    }, [
      startTime,
      endTime,
      pausedAt,
      autoPaused,
      status,
      isBlocked,
      blockerPausedAt,
      blockerHistory,
      savedPausedMs,
    ]);

    const formatTime = (secs) => {
      const h = Math.floor(secs / 3600);
      const m = Math.floor((secs % 3600) / 60);
      const s = secs % 60;
      return `${h > 0 ? `${h}h ` : ""}${m}m ${s}s`;
    };

    const lifetimeSecs = Math.floor((totalTrackedTime || 0) / 1000);

    if (mode === "active") {
      if (!startTime && status !== "In Progress") {
        if (totalTrackedTime > 0) {
          return (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded border font-bold text-[10px] bg-slate-50 dark:bg-slate-500/5 border-slate-200 dark:border-slate-500/20 text-slate-700 dark:text-slate-300">
              {formatTime(lifetimeSecs)}
            </span>
          );
        }
        if (!status || status.toLowerCase() === "pending") {
          return (
            <span className="text-slate-400 dark:text-slate-500 font-semibold text-xs">
              Not started
            </span>
          );
        }
        return (
          <span className="text-slate-400 dark:text-slate-500 font-semibold text-xs">
            —
          </span>
        );
      }
      if (!startTime && status === "In Progress") {
        return (
          <span className="text-[10px] font-bold text-blue-500 animate-pulse">
            Starting...
          </span>
        );
      }

      const colorClasses =
        status === "In Progress"
          ? "bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-[#3b82f6]/30 text-blue-600 dark:text-[#3b82f6]"
          : status === "In Review"
            ? "bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/30 text-orange-600 dark:text-orange-400"
            : status === "On Hold"
              ? "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30 text-amber-600 dark:text-amber-400"
              : status === "Completed"
                ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200/50 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                : "bg-slate-50 dark:bg-slate-500/5 border-slate-200 dark:border-slate-500/20 text-slate-500 dark:text-slate-400";

      const totalActiveSecs =
        status === "In Progress"
          ? lifetimeSecs + elapsed
          : lifetimeSecs > 0
            ? lifetimeSecs
            : elapsed;

      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-1 rounded border font-bold text-[10px] ${colorClasses}`}
        >
          {formatTime(totalActiveSecs)}
        </span>
      );
    }

    if (!startTime && status !== "In Progress") {
      return (
        <span className="text-slate-400 dark:text-slate-500 font-semibold text-xs">
          —
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-50 dark:bg-red-500/10 border border-red-200/50 dark:border-red-500/20 text-red-600 dark:text-red-400 font-bold text-[10px]">
        {formatTime(blockedMs)}
      </span>
    );
  },
);

const formatBusinessDuration = (ms) => {
  if (!ms) return "0m 0s";
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
};

const ApprovalTimeDisplay = React.memo(
  ({
    reviewStartedAt,
    completedAt,
    approvalWaitingMs,
    status,
    lastReviewStartedAt,
    reviewCycles,
  }) => {
    const [liveElapsed, setLiveElapsed] = useState(0);

    useEffect(() => {
      if (!reviewStartedAt || status !== "In Review") {
        setLiveElapsed(0);
        return;
      }
      const updateTime = () => {
        const elapsed = calculateBusinessMs(reviewStartedAt, Date.now());
        setLiveElapsed(elapsed);
      };
      updateTime();
      const interval = setInterval(updateTime, 1000);
      return () => clearInterval(interval);
    }, [reviewStartedAt, status]);

    const effectiveReviewStart =
      reviewStartedAt ||
      lastReviewStartedAt ||
      (reviewCycles && reviewCycles.length > 0
        ? reviewCycles[reviewCycles.length - 1]?.startedAt
        : null);

    if (!effectiveReviewStart && !approvalWaitingMs) {
      return (
        <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>
      );
    }

    const formatDateTime = (dateStr) => {
      if (!dateStr) return { date: "—", time: "", relative: "" };
      const d = new Date(dateStr);
      const date = d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
      });
      const time = d.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
      const diffMs = Date.now() - d;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);
      let relative = "just now";
      if (diffDays > 0) relative = `${diffDays}d ago`;
      else if (diffHours > 0) relative = `${diffHours}h ago`;
      else if (diffMins > 0) relative = `${diffMins}m ago`;
      return { date, time, relative };
    };

    const totalWaitMs = (approvalWaitingMs || 0) + liveElapsed;
    const isInReview = status === "In Review";
    const revInfo = effectiveReviewStart
      ? formatDateTime(effectiveReviewStart)
      : null;
    const doneInfo = completedAt ? formatDateTime(completedAt) : null;

    return (
      <div className="inline-flex flex-col gap-1.5 text-[10px]">
        {/* Horizontal 2-col table: Review Start | Completed */}
        {(revInfo || doneInfo) && (
          <div className="flex items-stretch rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/40 shadow-sm">
            {/* Rev Start column */}
            {revInfo && (
              <div className="flex-1 flex flex-col px-2.5 py-2 border-r border-slate-200 dark:border-slate-700/60">
                <span className="text-[8px] font-black uppercase tracking-widest text-blue-500 dark:text-blue-400 leading-none mb-1">
                  Rev Start
                </span>
                <span className="font-bold text-slate-700 dark:text-slate-100 text-[10px] leading-tight whitespace-nowrap">
                  {revInfo.date}
                </span>
                <span className="text-[9.5px] font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                  {revInfo.time}
                </span>
                <span className="text-[9px] text-blue-400 dark:text-blue-500 font-medium mt-0.5">
                  {revInfo.relative}
                </span>
              </div>
            )}

            {/* Completed column */}
            {doneInfo && (
              <div className="flex-1 flex flex-col px-2.5 py-2">
                <span className="text-[8px] font-black uppercase tracking-widest text-emerald-500 dark:text-emerald-400 leading-none mb-1">
                  Completed
                </span>
                <span className="font-bold text-slate-700 dark:text-slate-100 text-[10px] leading-tight whitespace-nowrap">
                  {doneInfo.date}
                </span>
                <span className="text-[9.5px] font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                  {doneInfo.time}
                </span>
                <span className="text-[9px] text-emerald-400 dark:text-emerald-500 font-medium mt-0.5">
                  {doneInfo.relative}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Duration badge */}
        {totalWaitMs > 0 && (
          <div
            className={`self-start flex items-center gap-1.5 px-2.5 py-1 rounded-full font-black text-[10px] tracking-wide ${
              isInReview
                ? "bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-500/25 shadow-sm"
                : "bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400 border border-violet-200 dark:border-violet-500/25 shadow-sm"
            }`}
          >
            {isInReview ? (
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse shrink-0" />
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
            )}
            {isInReview ? "Waiting " : "Took "}
            <span className="font-black">
              {formatBusinessDuration(totalWaitMs)}
            </span>
          </div>
        )}
      </div>
    );
  },
);

// Lightweight badge — shows only the approval duration (no date cards)
const ApprovalDurationBadge = ({
  approvalWaitingMs,
  reviewStartedAt,
  status,
}) => {
  const [liveElapsed, setLiveElapsed] = useState(0);
  const isInReview = status === "In Review";

  useEffect(() => {
    if (!reviewStartedAt || !isInReview) {
      setLiveElapsed(0);
      return;
    }
    const tick = () =>
      setLiveElapsed(calculateBusinessMs(reviewStartedAt, Date.now()));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [reviewStartedAt, status]);

  const totalMs = (approvalWaitingMs || 0) + liveElapsed;
  if (!totalMs)
    return (
      <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>
    );

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-black text-[10px] tracking-wide ${
        isInReview
          ? "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/25"
          : "bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400 border border-violet-200 dark:border-violet-500/25"
      }`}
    >
      {isInReview ? (
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
      ) : (
        <span className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
      )}
      {isInReview ? "Waiting " : "Took "}
      {formatBusinessDuration(totalMs)}
    </div>
  );
};

const CreatedTime = ({ time }) => {
  const [formatted, setFormatted] = useState("");

  useEffect(() => {
    if (!time) {
      setFormatted("—");
      return;
    }

    const date = new Date(time);
    if (isNaN(date.getTime())) {
      setFormatted("—");
      return;
    }

    const day = date.getDate();
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    setFormatted(`${day} ${month} ${year} ${hours}:${minutes} ${ampm}`);
  }, [time]);

  return <span>{formatted}</span>;
};

const ResizableHeader = ({
  id,
  label,
  colWidths,
  handleMouseDown,
  defaultClassName,
}) => {
  return (
    <th
      className={`${defaultClassName} relative group`}
      style={{
        width: colWidths[id] !== undefined ? `${colWidths[id]}px` : undefined,
        minWidth:
          colWidths[id] !== undefined ? `${colWidths[id]}px` : undefined,
        maxWidth:
          colWidths[id] !== undefined ? `${colWidths[id]}px` : undefined,
      }}
    >
      {label}
      <div
        onMouseDown={(e) => handleMouseDown(e, id)}
        className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-indigo-500/50 active:bg-indigo-500 z-10 transition-colors opacity-0 group-hover:opacity-100"
      />
    </th>
  );
};

const MomFeedbackInput = ({ task, onSave }) => {
  const [value, setValue] = useState(task?.feedbackMom || "");

  useEffect(() => {
    setValue(task?.feedbackMom || "");
  }, [task?.feedbackMom]);

  const handleBlur = () => {
    const trimmed = value.trim();
    if (trimmed !== (task?.feedbackMom || "").trim()) {
      onSave(task._id, { feedbackMom: trimmed });
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.target.blur();
    }
  };

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder="Enter MOM feedback..."
      className="w-full bg-white dark:bg-[#11131e] border border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 focus:border-blue-500 dark:focus:border-blue-500 rounded-lg px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30 transition-all shadow-2xs"
      title="Click to edit MOM feedback"
      onClick={(e) => e.stopPropagation()}
    />
  );
};

const DEFAULT_OFFICE_HOURS = { startHour: 9, endHour: 19 };

const formatMsToHMS = (ms) => {
  if (!ms || ms <= 0) return "0s";
  const totalSecs = Math.floor(ms / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  if (h > 0)
    return `${h}h ${m.toString().padStart(2, "0")}m ${s.toString().padStart(2, "0")}s`;
  if (m > 0) return `${m}m ${s.toString().padStart(2, "0")}s`;
  return `${s}s`;
};

const getTaskYesterdayAndTodayStats = (
  task,
  officeHours = DEFAULT_OFFICE_HOURS,
  nowTick = Date.now(),
) => {
  const now = new Date(nowTick);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - 1,
  );

  const todayWorkMs = calculateTaskProductivityForDate(
    task,
    today,
    officeHours,
  );
  const yesterdayWorkMs = calculateTaskProductivityForDate(
    task,
    yesterday,
    officeHours,
  );

  let todayBlockerMs = 0;
  let yesterdayBlockerMs = 0;

  const todayStr = today.toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });
  const yesterdayStr = yesterday.toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });

  const isPausedState = [
    "On Hold",
    "Completed",
    "In Review",
    "Rejected",
  ].includes(task.status);
  const taskPauseEnd =
    task.pausedAt ||
    task.holdStartedAt ||
    task.completedAt ||
    task.actualEndTime;

  if (Array.isArray(task.blockerHistory)) {
    task.blockerHistory.forEach((b) => {
      if (!b.pausedAt) return;
      const pDate = new Date(b.pausedAt).toLocaleDateString("en-CA", {
        timeZone: "Asia/Kolkata",
      });
      const pMs = new Date(b.pausedAt).getTime();
      let rMs = b.resumedAt ? new Date(b.resumedAt).getTime() : nowTick;
      if (isPausedState && taskPauseEnd && !b.resumedAt) {
        rMs = Math.min(rMs, new Date(taskPauseEnd).getTime());
      }
      const duration = Math.max(0, rMs - pMs);

      if (pDate === todayStr) {
        todayBlockerMs += duration;
      } else if (pDate === yesterdayStr) {
        yesterdayBlockerMs += duration;
      }
    });
  }

  if (task.isBlocked && task.blockerPausedAt) {
    const pDate = new Date(task.blockerPausedAt).toLocaleDateString("en-CA", {
      timeZone: "Asia/Kolkata",
    });
    let endMs = nowTick;
    if (isPausedState && taskPauseEnd) {
      endMs = new Date(taskPauseEnd).getTime();
    }
    const duration = Math.max(
      0,
      endMs - new Date(task.blockerPausedAt).getTime(),
    );
    if (pDate === todayStr) {
      todayBlockerMs += duration;
    } else if (pDate === yesterdayStr) {
      yesterdayBlockerMs += duration;
    }
  }

  return {
    todayWorkMs,
    yesterdayWorkMs,
    todayBlockerMs,
    yesterdayBlockerMs,
  };
};

const WorkTimeCell = React.memo(
  ({ task, officeHours = DEFAULT_OFFICE_HOURS }) => {
    const [nowTick, setNowTick] = useState(Date.now());
    const statusUpper = (task?.status || "").trim().toUpperCase().replace(/[-_]/g, " ");
    const isActive =
      statusUpper === "IN PROGRESS" && !task?.autoPaused && !task?.isBlocked;

    useEffect(() => {
      if (!isActive) return;
      const interval = setInterval(() => {
        setNowTick(Date.now());
      }, 1000);
      return () => clearInterval(interval);
    }, [isActive]);

    const { todayWorkMs } = React.useMemo(
      () => getTaskYesterdayAndTodayStats(task, officeHours, nowTick),
      [task, officeHours, nowTick],
    );

    return (
      <div className="bg-slate-50/90 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 rounded-xl p-2 text-[11px] space-y-1.5 min-w-[135px]">
        <div className="flex justify-between items-center">
          <span className="font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1">
            Today
            {isActive && (
              <span className="px-1.5 py-0.2 text-[8px] font-black bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 rounded-full animate-pulse">
                • Live
              </span>
            )}
          </span>
          <span
            className={`font-black ${todayWorkMs > 0 || isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-600 dark:text-slate-400"}`}
          >
            {formatMsToHMS(todayWorkMs)}
          </span>
        </div>
      </div>
    );
  },
);

const BlockerTimeCell = React.memo(
  ({ task, officeHours = DEFAULT_OFFICE_HOURS }) => {
    const [nowTick, setNowTick] = useState(Date.now());
    const statusUpper = (task?.status || "").trim().toUpperCase().replace(/[-_]/g, " ");
    const isBlockerActive = task?.isBlocked && statusUpper === "IN PROGRESS";

    useEffect(() => {
      if (!isBlockerActive) return;
      const interval = setInterval(() => {
        setNowTick(Date.now());
      }, 1000);
      return () => clearInterval(interval);
    }, [isBlockerActive]);

    const { todayBlockerMs } = React.useMemo(
      () => getTaskYesterdayAndTodayStats(task, officeHours, nowTick),
      [task, officeHours, nowTick],
    );

    return (
      <div className="bg-slate-50/90 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 rounded-xl p-2 text-[11px] space-y-1.5 min-w-[135px]">
        <div className="flex justify-between items-center">
          <span className="font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1">
            Today
            {isBlockerActive && (
              <span className="px-1.5 py-0.2 text-[8px] font-black bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 rounded-full animate-pulse">
                • Live
              </span>
            )}
          </span>
          <span
            className={`font-black ${todayBlockerMs > 0 || isBlockerActive ? "text-red-600 dark:text-red-400" : "text-slate-600 dark:text-slate-400"}`}
          >
            {formatMsToHMS(todayBlockerMs)}
          </span>
        </div>
      </div>
    );
  },
);

const TodayTrackerCell = React.memo(
  ({ task, officeHours = DEFAULT_OFFICE_HOURS }) => {
    const [nowTick, setNowTick] = useState(Date.now());
    const statusUpper = (task?.status || "").trim().toUpperCase().replace(/[-_]/g, " ");
    const isActive =
      statusUpper === "IN PROGRESS" && !task?.autoPaused && !task?.isBlocked;
    const isBlockerActive = task?.isBlocked && statusUpper === "IN PROGRESS";

    useEffect(() => {
      if (!isActive && !isBlockerActive) return;
      const interval = setInterval(() => {
        setNowTick(Date.now());
      }, 1000);
      return () => clearInterval(interval);
    }, [isActive, isBlockerActive]);

    const { todayWorkMs, todayBlockerMs } = React.useMemo(
      () => getTaskYesterdayAndTodayStats(task, officeHours, nowTick),
      [task, officeHours, nowTick],
    );

    const activeToday = todayWorkMs;
    const blockedToday = todayBlockerMs;

    if (task.status === "Completed") {
      return (
        <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl p-2 text-[11px] text-center min-w-[135px]">
          <span className="text-emerald-700 dark:text-emerald-300 font-extrabold block text-[10px]">
            Total Today
          </span>
          <span className="text-emerald-600 dark:text-emerald-400 font-extrabold text-[12px]">
            {formatMsToHMS(activeToday)}
          </span>
        </div>
      );
    }

    if (
      !task.actualStartTime &&
      activeToday === 0 &&
      (!task.status || task.status === "Pending")
    ) {
      return (
        <div className="text-center text-slate-400 dark:text-slate-400 font-bold text-[11px]">
          Not started
        </div>
      );
    }

    if (activeToday === 0 && blockedToday === 0) {
      return (
        <div className="text-center text-slate-400 dark:text-slate-400 font-bold text-[11px]">
          --
        </div>
      );
    }

    return (
      <div className="bg-slate-50/90 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 rounded-xl p-2 text-[10px] space-y-1 min-w-[135px]">
        <div className="flex justify-between items-center text-blue-600 dark:text-blue-400 font-extrabold">
          <span>Active</span>
          <span>{formatMsToHMS(activeToday)}</span>
        </div>
        {blockedToday > 0 && (
          <div className="flex justify-between items-center text-red-600 dark:text-red-400 font-extrabold">
            <span>Blocked</span>
            <span>{formatMsToHMS(blockedToday)}</span>
          </div>
        )}
        <div className="flex justify-between items-center pt-1 border-t border-slate-200 dark:border-white/10 font-extrabold text-slate-800 dark:text-slate-200">
          <span className="text-slate-700 dark:text-slate-300 font-extrabold">
            Total Today
          </span>
          <span className="text-slate-900 dark:text-slate-200 font-black">
            {formatMsToHMS(activeToday + blockedToday)}
          </span>
        </div>
      </div>
    );
  },
);

const SaasTableSummaryBar = React.memo(
  ({ tasks, officeHours = DEFAULT_OFFICE_HOURS }) => {
    const [nowTick, setNowTick] = useState(Date.now());

    const hasRunningTask = React.useMemo(() => {
      const checkTask = (t) => {
        if (t.status === "In Progress" && !t.autoPaused) return true;
        if (Array.isArray(t.subtasks)) return t.subtasks.some(checkTask);
        return false;
      };
      return (tasks || []).some(checkTask);
    }, [tasks]);

    const hasBlockedTask = React.useMemo(() => {
      const checkTask = (t) => {
        if (t.isBlocked) return true;
        if (Array.isArray(t.subtasks)) return t.subtasks.some(checkTask);
        return false;
      };
      return (tasks || []).some(checkTask);
    }, [tasks]);

    useEffect(() => {
      if (!hasRunningTask && !hasBlockedTask) return;
      const interval = setInterval(() => {
        setNowTick(Date.now());
      }, 1000);
      return () => clearInterval(interval);
    }, [hasRunningTask, hasBlockedTask]);

    const counts = React.useMemo(() => {
      const total = tasks.length;
      let inProgress = 0;
      let onHold = 0;
      let inReview = 0;
      let completed = 0;
      let inProgressTodayWork = 0;
      let totalTodayWork = 0;
      let totalTodayBlocker = 0;

      tasks.forEach((t) => {
        const s = (t.status || "").toLowerCase();
        const isInProgress = s.includes("progress");

        if (isInProgress) inProgress++;
        else if (s.includes("hold")) onHold++;
        else if (s.includes("review")) inReview++;
        else if (s === "completed" || s.includes("done")) completed++;

        const stats = getTaskYesterdayAndTodayStats(t, officeHours);
        if (isInProgress) {
          inProgressTodayWork += stats.todayWorkMs;
        }
        totalTodayWork += stats.todayWorkMs;
        totalTodayBlocker += stats.todayBlockerMs;
      });

      return {
        total,
        inProgress,
        onHold,
        inReview,
        completed,
        inProgressTodayWork,
        totalTodayWork,
        totalTodayBlocker,
        totalTimeTracker: totalTodayWork + totalTodayBlocker,
      };
    }, [tasks, officeHours, nowTick]);

    return (
      <div className="mt-4 sidebar-bg  rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
        {/* Left side: Status counters */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 font-black text-slate-800 dark:text-slate-900 pr-4">
            <BiFile size={18} className="text-blue-600 dark:text-blue-400" />
            <span>Total Tasks</span>
            <span className="text-sm font-extrabold text-blue-600 dark:text-blue-400 ml-1">
              {counts.total}
            </span>
          </div>
          <div className="flex items-center gap-1.5 font-extrabold text-slate-600 dark:text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span>In Progress:</span>
            <span className="text-slate-900 dark:text-white font-black">
              {counts.inProgress}
            </span>
          </div>
          <div className="flex items-center gap-1.5 font-extrabold text-slate-600 dark:text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>On Hold:</span>
            <span className="text-slate-900 dark:text-white font-black">
              {counts.onHold}
            </span>
          </div>
          <div className="flex items-center gap-1.5 font-extrabold text-slate-600 dark:text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
            <span>In Review:</span>
            <span className="text-slate-900 dark:text-white font-black">
              {counts.inReview}
            </span>
          </div>
          <div className="flex items-center gap-1.5 font-extrabold text-slate-600 dark:text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>Completed:</span>
            <span className="text-slate-900 dark:text-white font-black">
              {counts.completed}
            </span>
          </div>
        </div>

        {/* Right side: Today totals */}
        <div className="flex items-center gap-6 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 pt-3 md:pt-0 md:pl-6 w-full md:w-auto justify-between md:justify-end flex-wrap">
          <div>
            <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
              Today's Work (All Tasks)
              {hasRunningTask && (
                <span
                  className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"
                  title="Live Running"
                />
              )}
            </div>
            <div className="text-base font-black text-blue-600 dark:text-blue-400">
              {formatMsToHMS(counts.totalTodayWork)}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
              Today's Blocker (All Tasks)
              {hasBlockedTask && (
                <span
                  className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"
                  title="Blocker Active"
                />
              )}
            </div>
            <div className="text-base font-black text-red-600 dark:text-red-400">
              {formatMsToHMS(counts.totalTodayBlocker)}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
              Total Time Tracker (All Tasks)
            </div>
            <div className="text-base font-black text-indigo-600 dark:text-indigo-400">
              {formatMsToHMS(counts.totalTimeTracker)}
            </div>
          </div>
        </div>
      </div>
    );
  },
);

const COLUMN_OPTIONS = [
  { key: "id", label: "ID" },
  { key: "priority", label: "Priority" },
  { key: "taskName", label: "Task Name" },
  { key: "client", label: "Client" },
  { key: "contentType", label: "Content-type" },
  { key: "status", label: "Status" },
  { key: "feedbackMom", label: "Feedback MOM" },
  { key: "blocker", label: "Blocker" },
  { key: "activeTime", label: "Work Time" },
  { key: "blockerTime", label: "Blocker Time" },
  { key: "timeTracker", label: "Today Tracker" },
  { key: "revision", label: "Revision" },
  { key: "startDate", label: "Start Date" },
  { key: "endDate", label: "Due Date" },
  { key: "assignedBy", label: "Assigned By" },
  { key: "approvalTime", label: "Approval Info" },
  { key: "contentCopy", label: "Content Copy" },
  { key: "createdTime", label: "Created Time" },
];

const MyTasksTab = ({
  tasks,
  projects,
  currentUserId,
  user,
  setSelectedTaskId,
  loading,
  dateFilter: dateFilterProp,
  setDateFilter: setDateFilterProp,
}) => {
  const authUsers = useSelector((state) => state.auth?.users);
  const users = authUsers || [];
  const officeHours = React.useMemo(() => ({ startHour: 9, endHour: 19 }), []);

  const [updateTaskTrigger] = useUpdateTaskMutation();
  const [deleteTask] = useDeleteTaskMutation();
  const [selectedTasks, setSelectedTasks] = useState([]);

  const [searchParams] = useSearchParams();
  const statusParam = searchParams.get("status");

  const [priorityFilter, setPriorityFilter] = useState("All");
  const [projectFilter, setProjectFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState(() => {
    return statusParam || "All";
  });

  useEffect(() => {
    if (statusParam) {
      setStatusFilter(statusParam);
    }
  }, [statusParam]);

  const [clientFilter, setClientFilter] = useState("All");
  const [assignerFilter, setAssignerFilter] = useState("All");

  const [localDateFilter, setLocalDateFilter] = useState(() => {
    try {
      const saved = localStorage.getItem("task_date_filter");
      return saved || "All";
    } catch {
      return "All";
    }
  });

  const dateFilter =
    dateFilterProp !== undefined ? dateFilterProp : localDateFilter;

  const setDateFilter = (val) => {
    const nextVal = typeof val === "function" ? val(dateFilter) : val;
    if (setDateFilterProp) {
      setDateFilterProp(nextVal);
    } else {
      setLocalDateFilter(nextVal);
    }
    try {
      localStorage.setItem("task_date_filter", nextVal);
    } catch (e) {
      console.error("Failed to save date filter:", e);
    }
  };

  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const dateDropdownRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  const [hiddenColumns, setHiddenColumns] = useState(() => {
    try {
      const saved = localStorage.getItem("mytasks_hidden_columns");
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      id: false,
      priority: false,
      taskName: false,
      client: false,
      contentType: false,
      status: false,
      feedbackMom: false,
      blocker: false,
      activeTime: false,
      blockerTime: false,
      timeTracker: false,
      revision: false,
      startDate: false,
      endDate: false,
      assignedBy: false,
      approvalTime: false,
      contentCopy: false,
      createdTime: false,
    };
  });
  const [isColsOpen, setIsColsOpen] = useState(false);
  const colsDropdownRef = useRef(null);

  useEffect(() => {
    try {
      localStorage.setItem(
        "mytasks_hidden_columns",
        JSON.stringify(hiddenColumns),
      );
    } catch (e) {}
  }, [hiddenColumns]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        colsDropdownRef.current &&
        !colsDropdownRef.current.contains(event.target)
      ) {
        setIsColsOpen(false);
      }
    };
    if (isColsOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isColsOpen]);

  const visibleColCount =
    Object.values(hiddenColumns).filter((v) => !v).length || 1;

  const [openDropdown, setOpenDropdown] = useState(null);
  const filterRef = useRef(null);

  const [colWidths, setColWidths] = useState({});
  const resizingRef = useRef(null);

  const handleMouseDown = (e, colId) => {
    e.preventDefault();
    const thElement = e.target.parentElement;
    resizingRef.current = {
      colId,
      startX: e.clientX,
      startWidth: thElement.offsetWidth,
    };

    const handleMouseMove = (eMove) => {
      if (!resizingRef.current) return;
      const { colId, startX, startWidth } = resizingRef.current;
      const newWidth = Math.max(50, startWidth + (eMove.clientX - startX));
      setColWidths((prev) => ({ ...prev, [colId]: newWidth }));
    };

    const handleMouseUp = () => {
      resizingRef.current = null;
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const [viewType, setViewType] = useState("list");
  const [expandedTasks, setExpandedTasks] = useState({});
  const [collapsedSections, setCollapsedSections] = useState({});
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [selectedTaskId, setSelectedTaskIdState] = useState(null);

  const handleSelectTaskForDrawer = (id) => {
    setSelectedTaskIdState(id);
    if (setSelectedTaskId) {
      setSelectedTaskId(id);
    }
  };

  // Blocker Modal states
  const [blockerModalTask, setBlockerModalTask] = useState(null);
  const [blockerType, setBlockerType] = useState("Client Call");
  const [blockerDescription, setBlockerDescription] = useState("");
  const [blockerExpectedTime, setBlockerExpectedTime] = useState("15 mins");
  const [blockerPriority, setBlockerPriority] = useState("Normal");

  // Review Confirmation Modal State
  const [reviewModalData, setReviewModalData] = useState(null);

  const handleConfirmReviewSubmit = async () => {
    if (!reviewModalData) return;
    const { taskId, fields, newStatus, isDirectStatus } = reviewModalData;
    setReviewModalData(null);
    try {
      if (isDirectStatus) {
        await updateTaskTrigger({
          id: taskId,
          taskData: { status: newStatus },
        }).unwrap();
      } else {
        await updateTaskTrigger({
          id: taskId,
          taskData: fields,
        }).unwrap();
      }
      toast.success("Task submitted for review successfully!");
    } catch (err) {
      console.error(err);
      toast.error(err?.data?.message || "Failed to submit task for review.");
    }
  };

  // Feedback states
  const [feedbackText, setFeedbackText] = useState("");
  const [editingFeedbackId, setEditingFeedbackId] = useState(null);
  const [editingFeedbackText, setEditingFeedbackText] = useState("");

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setOpenDropdown(null);
      }
      if (
        dateDropdownRef.current &&
        !dateDropdownRef.current.contains(event.target)
      ) {
        setShowDateDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    priorityFilter,
    projectFilter,
    statusFilter,
    clientFilter,
    assignerFilter,
    dateFilter,
    searchTerm,
  ]);

  const projectsMap = React.useMemo(() => {
    const map = new Map();
    (projects || []).forEach((p) => {
      if (p && p._id) map.set(String(p._id), p);
    });
    return map;
  }, [projects]);

  // Filter tasks based on "My Tasks" (assigned to current user)
  const activeTasksList = React.useMemo(() => {
    return tasks.filter((task) => {
      const taskUserId = task.assignedTo?._id || task.assignedTo;
      return taskUserId === currentUserId;
    });
  }, [tasks, currentUserId]);

  const filteredTasksWithoutStatus = React.useMemo(() => {
    return activeTasksList.filter((task) => {
      const matchesPriority =
        priorityFilter === "All" || task.priority === priorityFilter;

      const taskProjectId = task.project?._id || task.project;
      const matchesProject =
        projectFilter === "All" || taskProjectId === projectFilter;

      const projectObj = taskProjectId
        ? projectsMap.get(String(taskProjectId))
        : null;
      const clientObj = task.project?.client?.companyName
        ? task.project.client
        : projectObj?.client || task.project?.client;
      const clientId = clientObj?._id || clientObj?.id;
      const matchesClient = clientFilter === "All" || clientId === clientFilter;

      const matchesAssigner =
        assignerFilter === "All" ||
        (() => {
          const assigner = task.assignedBy || task.createdBy;
          const uId =
            assigner?._id ||
            assigner?.id ||
            (typeof assigner === "string" ? assigner : null);
          return uId === assignerFilter;
        })();

      const projectName = projectObj?.name || task.project?.name || "";
      const clientName = clientObj?.companyName || "";
      const matchesSearch =
        task.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        clientName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesDate = checkTaskProductivityAndDate(task, dateFilter);

      return (
        matchesPriority &&
        matchesProject &&
        matchesClient &&
        matchesAssigner &&
        matchesSearch &&
        matchesDate
      );
    });
  }, [
    activeTasksList,
    priorityFilter,
    projectFilter,
    clientFilter,
    dateFilter,
    searchTerm,
    projects,
  ]);

  const counts = React.useMemo(() => {
    const res = {
      All: filteredTasksWithoutStatus.length,
      Pending: 0,
      "In Progress": 0,
      Completed: 0,
      "On Hold": 0,
    };
    filteredTasksWithoutStatus.forEach((t) => {
      const status = t.status || "Pending";
      if (res[status] !== undefined) {
        res[status]++;
      }
    });
    return res;
  }, [filteredTasksWithoutStatus]);

  const filteredTasks = React.useMemo(() => {
    const list = filteredTasksWithoutStatus.filter((task) => {
      if (statusFilter === "All") return true;
      if (statusFilter === "Overdue") {
        return (
          task.dueDate &&
          new Date(task.dueDate) < new Date() &&
          task.status !== "Completed"
        );
      }
      if (statusFilter === "Due Today") {
        return (
          task.dueDate &&
          isSameDate(task.dueDate, new Date()) &&
          task.status !== "Completed"
        );
      }
      if (
        statusFilter === "Active Tasks" ||
        statusFilter === "Pending,In Progress,In Review,Correction,On Hold" ||
        statusFilter === "Pending,In Progress,In Review,On Hold" ||
        statusFilter === "Pending,In Progress,In Review"
      ) {
        const s = (task.status || "Pending").toUpperCase();
        return s !== "COMPLETED" && s !== "REJECTED";
      }
      return task.status === statusFilter;
    });
    const getPriorityRank = (task) => {
      const p = isSameDate(task.startDate, task.dueDate)
        ? "Top High"
        : task.priority || "Medium";
      switch (p) {
        case "Top High":
          return 1;
        case "High":
          return 2;
        case "Medium":
          return 3;
        case "Low":
          return 4;
        default:
          return 3;
      }
    };

    const getStatusSortPriority = (task) => {
      const s = (task.status || "Pending").toUpperCase();
      if (s === "IN PROGRESS" || s === "IN_PROGRESS" || s === "INPROGRESS") {
        return 1;
      }
      if (s === "ON HOLD" || s === "ON_HOLD" || s === "ON-HOLD") {
        return 2;
      }
      if (s === "IN REVIEW" || s === "IN_REVIEW" || s === "IN-REVIEW") {
        return 3;
      }
      if (s === "PENDING") {
        return 4;
      }
      if (s === "CORRECTION") {
        return 5;
      }
      if (s === "COMPLETED") {
        return 6;
      }
      if (s === "REJECTED") {
        return 7;
      }
      return 4;
    };

    return [...list].sort((a, b) => {
      const sRankA = getStatusSortPriority(a);
      const sRankB = getStatusSortPriority(b);
      if (sRankA !== sRankB) {
        return sRankA - sRankB; // 1: In Progress, 2: On Hold, 3: In Review, 4: Pending, 5: Correction, 6: Completed, 7: Rejected
      }
      const pRankA = getPriorityRank(a);
      const pRankB = getPriorityRank(b);
      if (pRankA !== pRankB) {
        return pRankA - pRankB; // Top High (1) comes first
      }
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });
  }, [filteredTasksWithoutStatus, statusFilter]);

  const totalItems = filteredTasks.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const paginatedTasks = React.useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredTasks.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredTasks, currentPage, itemsPerPage]);

  const sortedTasks = paginatedTasks;
  const selectedTask = tasks.find((t) => t._id === selectedTaskId);

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 4) {
        pages.push(1, 2, 3, 4, 5, "...", totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(
          1,
          "...",
          totalPages - 4,
          totalPages - 3,
          totalPages - 2,
          totalPages - 1,
          totalPages,
        );
      } else {
        pages.push(
          1,
          "...",
          currentPage - 1,
          currentPage,
          currentPage + 1,
          "...",
          totalPages,
        );
      }
    }
    return pages;
  };

  const showStartInProgressWarning = (action = "review") => {
    const actionMsg =
      action === "hold"
        ? "before placing it on hold."
        : "before submitting it for review.";

    toast.custom(
      (t) => (
        <div
          className={`${
            t.visible ? "animate-enter" : "animate-leave"
          } max-w-md w-full pointer-events-auto flex flex-col gap-4 p-5 rounded-2xl shadow-2xl border
          bg-white dark:bg-[#0f172a]
          border-amber-500/40 dark:border-amber-500/40
          backdrop-blur-xl z-[99999]`}
        >
          <div className="flex items-start gap-3.5">
            <div className="shrink-0 w-11 h-11 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-inner">
              <FiClock size={22} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 leading-snug">
                Action Required: Start Task First
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed font-medium">
                Please start the task by setting its status to{" "}
                <strong className="text-amber-600 dark:text-amber-400 font-bold">
                  "In Progress"
                </strong>{" "}
                {actionMsg}
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => toast.dismiss(t.id)}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-600 text-white transition-all shadow-md active:scale-95 cursor-pointer"
            >
              Understood
            </button>
          </div>
        </div>
      ),
      { duration: 6000 },
    );
  };

  const [correctionModalData, setCorrectionModalData] = useState(null);
  const [rejectionModalData, setRejectionModalData] = useState(null);

  const handleTaskFieldChange = async (taskId, fields) => {
    const sanitizedFields = { ...fields };

    if (sanitizedFields.status === "Correction") {
      const currentTaskObj = tasks?.find((t) => t._id === taskId);
      setCorrectionModalData({ taskId, taskObj: currentTaskObj });
      return;
    }

    if (sanitizedFields.status === "Rejected") {
      const currentTaskObj = tasks?.find((t) => t._id === taskId);
      setRejectionModalData({ taskId, taskObj: currentTaskObj });
      return;
    }

    if (sanitizedFields.status && sanitizedFields.status === "In Review") {
      const currentTaskObj = tasks?.find((t) => t._id === taskId);
      if (
        currentTaskObj &&
        !currentTaskObj.actualStartTime &&
        !currentTaskObj.totalTrackedTime
      ) {
        showStartInProgressWarning("review");
        return;
      }
      if (currentTaskObj && currentTaskObj.status !== sanitizedFields.status) {
        setReviewModalData({
          taskId,
          fields: sanitizedFields,
          isDirectStatus: false,
        });
        return;
      }
    }

    if (sanitizedFields.status === "On Hold") {
      const currentTaskObj = tasks?.find((t) => t._id === taskId);
      if (
        currentTaskObj &&
        !currentTaskObj.actualStartTime &&
        !currentTaskObj.totalTrackedTime &&
        currentTaskObj.contentType !== "MOM"
      ) {
        showStartInProgressWarning("hold");
        return;
      }
    }

    if (sanitizedFields.startDate === "") sanitizedFields.startDate = null;

    if (sanitizedFields.dueDate === "") sanitizedFields.dueDate = null;

    const currentTaskForPriority = tasks?.find((t) => t._id === taskId);
    const effectiveStart =
      sanitizedFields.startDate !== undefined
        ? sanitizedFields.startDate
        : currentTaskForPriority?.startDate;
    const effectiveEnd =
      sanitizedFields.dueDate !== undefined
        ? sanitizedFields.dueDate
        : currentTaskForPriority?.dueDate;

    if (
      effectiveStart &&
      effectiveEnd &&
      isSameDate(effectiveStart, effectiveEnd)
    ) {
      sanitizedFields.priority = "Top High";
    }

    try {
      await updateTaskTrigger({
        id: taskId,
        taskData: sanitizedFields,
      }).unwrap();
    } catch (err) {
      if (
        err?.data?.isOfficeHoursEnded ||
        err?.error?.data?.isOfficeHoursEnded
      ) {
        const errorData = err?.data || err?.error?.data;
        window.dispatchEvent(
          new CustomEvent("show-office-hours-ended-popup", {
            detail: {
              workingTimeMs: errorData.workingTimeMs,
              pausedAtHour: errorData.pausedAt,
            },
          }),
        );
        return;
      }
      if (err?.status === 409 || err?.originalStatus === 409) {
        toast.custom(
          (t) => (
            <div
              className={`${
                t.visible ? "animate-enter" : "animate-leave"
              } max-w-sm w-full pointer-events-auto flex flex-col gap-3 p-4 rounded-2xl shadow-2xl border
          bg-white dark:bg-[#0f172a]
          border-[var(--accent-color)]/30 dark:border-[var(--accent-color-dark)]/30
          backdrop-blur-xl z-[99999]`}
            >
              {/* Header */}
              <div className="flex items-start gap-3">
                <div
                  className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center shadow-sm"
                  style={{ background: "var(--accent-light-bg-subtle)" }}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--accent-color)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-[12px] font-black tracking-wide"
                    style={{ color: "var(--accent-color)" }}
                  >
                    Active Task Already Running
                  </p>
                  <p className="mt-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400 leading-snug">
                    {err.data?.message ||
                      "You already have one active task or subtask."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => toast.dismiss(t.id)}
                  className="shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                >
                  <FiX size={13} />
                </button>
              </div>
              {/* Divider */}
              <div className="h-px bg-slate-100 dark:bg-slate-800" />
              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toast.dismiss(t.id)}
                  className="flex-1 py-1.5 px-3 rounded-lg text-[11px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    toast.dismiss(t.id);
                    updateTaskTrigger({
                      id: taskId,
                      taskData: { ...sanitizedFields, forceSwitch: true },
                    });
                  }}
                  className="flex-1 py-1.5 px-3 rounded-lg text-[11px] font-black text-white transition-all cursor-pointer shadow-sm"
                  style={{
                    background:
                      "linear-gradient(135deg, var(--accent-color), var(--accent-color-dark))",
                  }}
                >
                  Switch Task
                </button>
              </div>
            </div>
          ),
          { duration: 6000, position: "bottom-right" },
        );
      } else {
        toast.error("Failed to update task");
      }

      throw err;
    }
  };

  const handleOpenBlockerModal = (task) => {
    setBlockerModalTask(task);
    setBlockerType("Client Call");
    setBlockerDescription("");
    setBlockerExpectedTime("15 mins");
    setBlockerPriority("Normal");
  };

  // .....................................................handlesubmitBlocker function ...........................................
  const handleSubmitBlocker = async () => {
    if (!blockerModalTask) return;
    if (!blockerDescription.trim()) {
      toast.error("Please enter a blocker description");
      return;
    }

    const fields = {
      isBlocked: true,
      blockerType,
      blockerDescription: blockerDescription.trim(),
      blockerExpectedTime,
      blockerPriority,
      blockerPausedAt: new Date().toISOString(),
    };

    try {
      await handleTaskFieldChange(blockerModalTask._id, fields);
      setSelectedTaskId(null);
      setBlockerModalTask(null);
      toast.success("Task paused - Blocker added");
    } catch (err) {
      console.error(err);
    }
  };

  const handleResumeTask = async (task) => {
    const pausedAt = task.blockerPausedAt || new Date().toISOString();
    const resumedAt = new Date().toISOString();
    const totalPauseMinutes = Math.max(
      1,
      Math.round(
        (new Date(resumedAt).getTime() - new Date(pausedAt).getTime()) / 60000,
      ),
    );

    const newHistoryItem = {
      blockerType: task.blockerType || "Unknown",
      blockerDescription:
        task.blockerDescription || task.blockerReason || "No details",
      blockerExpectedTime: task.blockerExpectedTime || "Unknown",
      blockerPriority: task.blockerPriority || "Normal",
      pausedAt: pausedAt,
      resumedAt: resumedAt,
      totalPauseMinutes: totalPauseMinutes,
    };

    const updatedHistory = [...(task.blockerHistory || []), newHistoryItem];

    const fields = {
      isBlocked: false,
      blockerResumedAt: resumedAt,
      blockerHistory: updatedHistory,
      status: "In Progress",
    };

    try {
      await handleTaskFieldChange(task._id, fields);
      toast.success("Task resumed successfully!");
    } catch (err) {
      console.error(err);
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    if (newStatus === "Correction") {
      const currentTaskObj = tasks?.find((t) => t._id === taskId);
      setCorrectionModalData({ taskId, taskObj: currentTaskObj });
      return;
    }

    if (newStatus === "Rejected") {
      const currentTaskObj = tasks?.find((t) => t._id === taskId);
      setRejectionModalData({ taskId, taskObj: currentTaskObj });
      return;
    }

    if (newStatus && newStatus === "In Review") {
      const currentTaskObj = tasks?.find((t) => t._id === taskId);
      if (
        currentTaskObj &&
        !currentTaskObj.actualStartTime &&
        !currentTaskObj.totalTrackedTime
      ) {
        showStartInProgressWarning("review");
        return;
      }
      if (currentTaskObj && currentTaskObj.status !== newStatus) {
        setReviewModalData({ taskId, newStatus, isDirectStatus: true });
        return;
      }
    }

    if (newStatus === "On Hold") {
      const currentTaskObj = tasks?.find((t) => t._id === taskId);
      if (
        currentTaskObj &&
        !currentTaskObj.actualStartTime &&
        !currentTaskObj.totalTrackedTime &&
        currentTaskObj.contentType !== "MOM"
      ) {
        showStartInProgressWarning("hold");
        return;
      }
    }
    try {
      await updateTaskTrigger({
        id: taskId,
        taskData: { status: newStatus },
      }).unwrap();
    } catch (err) {
      if (
        err?.data?.isOfficeHoursEnded ||
        err?.error?.data?.isOfficeHoursEnded
      ) {
        const errorData = err?.data || err?.error?.data;
        window.dispatchEvent(
          new CustomEvent("show-office-hours-ended-popup", {
            detail: {
              workingTimeMs: errorData?.workingTimeMs || 0,
              pausedAtHour: errorData?.pausedAt,
            },
          }),
        );
        return;
      }

      if (
        err?.status === 409 ||
        err?.originalStatus === 409 ||
        err?.data?.status === 409
      ) {
        toast.custom(
          (t) => (
            <div
              className={`${
                t.visible ? "animate-enter" : "animate-leave"
              } max-w-sm w-full pointer-events-auto flex flex-col gap-3 p-4 rounded-2xl shadow-2xl border
            bg-white dark:bg-[#0f172a]
            border-[var(--accent-color)]/30 dark:border-[var(--accent-color-dark)]/30
            backdrop-blur-xl z-[99999]`}
            >
              <div className="flex items-start gap-3">
                <div
                  className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center shadow-sm"
                  style={{ background: "var(--accent-light-bg-subtle)" }}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--accent-color)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-[12px] font-black tracking-wide"
                    style={{ color: "var(--accent-color)" }}
                  >
                    Active Task Already Running
                  </p>
                  <p className="mt-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400 leading-snug">
                    {err.data?.message ||
                      "You already have one active task or subtask."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => toast.dismiss(t.id)}
                  className="shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                >
                  <FiX size={13} />
                </button>
              </div>
              <div className="h-px bg-slate-100 dark:bg-slate-800" />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toast.dismiss(t.id)}
                  className="flex-1 py-1.5 px-3 rounded-lg text-[11px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          ),
          { duration: 6000, position: "bottom-right" },
        );
        return;
      }

      toast.error(
        err?.data?.message ||
          err?.error?.data?.message ||
          "Failed to update task",
      );
    }
  };

  const handleDragStart = (e, taskId) => {
    e.dataTransfer.setData("taskId", taskId);
    e.dataTransfer.effectAllowed = "move";
    setDraggedTaskId(taskId);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, newStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");
    if (taskId) {
      const task = tasks.find((t) => t._id === taskId);
      if (task && task.status !== newStatus) {
        handleStatusChange(taskId, newStatus);
      }
    }
    setDraggedTaskId(null);
  };

  const toggleTaskExpanded = (taskId) => {
    setExpandedTasks((prev) => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const handleBulkDelete = async () => {
    if (selectedTasks.length === 0) return;
    if (
      window.confirm(
        `Are you sure you want to delete ${selectedTasks.length} selected task(s)?`,
      )
    ) {
      try {
        await Promise.all(selectedTasks.map((id) => deleteTask(id).unwrap()));
        setSelectedTasks([]);
        toast.success("Tasks deleted successfully!");
      } catch (err) {
        toast.error("Failed to delete some tasks");
      }
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedTasks(sortedTasks.map((t) => t._id));
    } else {
      setSelectedTasks([]);
    }
  };

  const handleSelectTask = (taskId) => {
    setSelectedTasks((prev) =>
      prev.includes(taskId)
        ? prev.filter((id) => id !== taskId)
        : [...prev, taskId],
    );
  };

  const getStatusStyle = (status, isBlocked) => {
    if (isBlocked) {
      return {
        bg: "!bg-orange-50 !text-orange-700 !border-orange-200/80 dark:!bg-orange-500/10 dark:!text-orange-400 dark:!border-orange-500/20 rounded-full font-bold",
        dot: "bg-orange-500",
        icon: FiAlertCircle,
      };
    }
    switch (status) {
      case "Completed":
        return {
          bg: "!bg-emerald-50 !text-emerald-700 !border-emerald-200/80 dark:!bg-emerald-500/10 dark:!text-emerald-400 dark:!border-emerald-500/20 rounded-full font-bold",
          dot: "bg-emerald-500",
          icon: FiCheckSquare,
        };
      case "In Progress":
        return {
          bg: "!bg-blue-50 !text-blue-700 !border-blue-200/80 dark:!bg-blue-500/10 dark:!text-blue-400 dark:!border-blue-500/20 rounded-full font-bold",
          dot: "bg-blue-500",
          icon: FiClock,
        };
      case "On Hold":
        return {
          bg: "!bg-amber-50 !text-amber-700 !border-amber-200/80 dark:!bg-amber-500/10 dark:!text-amber-400 dark:!border-amber-500/20 rounded-full font-bold",
          dot: "bg-amber-500",
          icon: FiAlertCircle,
        };
      case "In Review":
        return {
          bg: "!bg-orange-50 !text-orange-700 !border-orange-200/80 dark:!bg-orange-500/10 dark:!text-orange-400 dark:!border-orange-500/20 rounded-full font-bold",
          dot: "bg-orange-500",
          icon: FiClock,
        };
      case "Correction":
        return {
          bg: "!bg-orange-50 !text-orange-700 !border-orange-200/80 dark:!bg-orange-500/10 dark:!text-orange-400 dark:!border-orange-500/20 rounded-full font-bold",
          dot: "bg-orange-500",
          icon: FiAlertCircle,
        };
      case "Rejected":
        return {
          bg: "!bg-rose-50 !text-rose-700 !border-rose-200/80 dark:!bg-rose-500/10 dark:!text-rose-400 dark:!border-rose-500/20 rounded-full font-bold",
          dot: "bg-rose-500",
          icon: FiAlertCircle,
        };
      default:
        return {
          bg: "!bg-slate-50 !text-slate-700 !border-slate-200/80 dark:!bg-slate-500/10 dark:!text-slate-300 dark:!border-slate-500/20 rounded-full font-bold",
          dot: "bg-slate-400",
          icon: FiClock,
        };
    }
  };

  const getPriorityStyle = (priority) => {
    switch (priority) {
      case "Top High":
        return "badge-priority-top-high";
      case "High":
        return "badge-priority-high";
      case "Medium":
        return "badge-priority-medium";
      case "Low":
        return "badge-priority-low";
      default:
        return "badge-priority-medium";
    }
  };

  const getTaskDisplayId = (task) => {
    if (!task || !task._id) return "";
    const projId = task.project?._id || task.project;
    const projectObj = projId ? projectsMap.get(String(projId)) : null;
    const projChar = (projectObj?.name || task.project?.name || "P")
      .charAt(0)
      .toUpperCase();
    const client = projectObj?.client || task.project?.client;
    const clientName = client?.companyName || "";
    const clientChars = clientName
      ? clientName.substring(0, 2).toUpperCase().padEnd(2, "X")
      : "XX";

    const projectTasks = tasks.filter(
      (t) => (t.project?._id || t.project) === projId,
    );
    const sortedByCreation = [...projectTasks].sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (timeA !== timeB) return timeA - timeB;
      return (a._id || "").localeCompare(b._id || "");
    });
    const idx = sortedByCreation.findIndex((t) => t._id === task._id);
    const num = idx !== -1 ? idx + 1 : 1;
    return `${projChar}${clientChars}T${num}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "No Date";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "No Date";
    const day = date.getDate();
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const month = months[date.getMonth()];
    return `${day} ${month}`;
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "—";
    const day = date.getDate();
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${day} ${month} ${year} ${hours}:${minutes} ${ampm}`;
  };

  const uniqueProjects = React.useMemo(() => {
    const mapObj = {};
    activeTasksList.forEach((t) => {
      if (t.project) {
        const pId = t.project._id || t.project;
        const projObj = pId ? projectsMap.get(String(pId)) : null;
        const pName = projObj?.name || t.project.name || "Internal";
        mapObj[pId] = pName;
      }
    });
    return Object.entries(mapObj).map(([id, name]) => ({ id, name }));
  }, [activeTasksList, projectsMap]);

  const uniqueClients = React.useMemo(() => {
    const clientsMap = {};
    activeTasksList.forEach((t) => {
      const projId = t.project?._id || t.project;
      const projectObj = projId ? projectsMap.get(String(projId)) : null;
      const client = t.project?.client?.companyName
        ? t.project.client
        : projectObj?.client || t.project?.client;
      if (client) {
        const cId =
          (typeof client === "object" ? client._id || client.id : client) ||
          client.companyName;
        if (cId) {
          clientsMap[cId] = {
            id: cId,
            name:
              typeof client === "object" && client.companyName
                ? client.companyName
                : client.name || String(client),
            color:
              typeof client === "object" && client.color
                ? client.color
                : "#3b82f6",
            icon:
              typeof client === "object" && client.icon
                ? client.icon
                : "FaRegBuilding",
          };
        }
      }
    });
    return Object.values(clientsMap);
  }, [activeTasksList, projects]);

  const uniqueAssigners = React.useMemo(() => {
    const assignersMap = {};
    activeTasksList.forEach((t) => {
      const assigner = t.assignedBy || t.createdBy;
      if (assigner) {
        const uId =
          assigner._id ||
          assigner.id ||
          (typeof assigner === "string" ? assigner : null);
        const uName =
          assigner.name ||
          (typeof assigner === "object" ? assigner.name : "Unknown");
        if (uId && uName) {
          assignersMap[uId] = uName;
        }
      }
    });
    return Object.entries(assignersMap).map(([id, name]) => ({ id, name }));
  }, [activeTasksList]);

  const handleExportExcel = () => {
    const tasksToExport =
      sortedTasks && sortedTasks.length > 0 ? sortedTasks : activeTasksList;
    if (!tasksToExport || tasksToExport.length === 0) {
      toast.error("No tasks data available to export");
      return;
    }

    const headers = [
      "ID",
      "Priority",
      "Task Name",
      "Content Copy",
      "Client",
      "Content-type",
      "Status",
      "Blocker",
      "Inprogress time taken",
      "Blocker time",
      "Time tracker",
      "Revision",
      "Start Date",
      "DUE DATE",
      "Assigned By",
      "Approval Info",
      "Created Time",
    ];

    const formatSecs = (secs) => {
      if (!secs || secs <= 0) return "0m 0s";
      const h = Math.floor(secs / 3600);
      const m = Math.floor((secs % 3600) / 60);
      const s = secs % 60;
      return `${h > 0 ? `${h}h ` : ""}${m}m ${s}s`;
    };

    const computeTaskTimes = (task) => {
      const baseTracked = task.totalTrackedTime || 0;
      if (!task.actualStartTime) {
        const baseSecs = Math.floor(baseTracked / 1000);
        return {
          activeStr: baseTracked > 0 ? formatSecs(baseSecs) : "Not started",
          blockerStr: "0m 0s",
          totalStr: baseTracked > 0 ? formatSecs(baseSecs) : "0m 0s",
        };
      }
      const start = new Date(task.actualStartTime).getTime();
      let end;
      if (task.actualEndTime) {
        end = new Date(task.actualEndTime).getTime();
      } else if (
        task.pausedAt &&
        ["On Hold", "Rejected", "In Review", "Correction"].includes(task.status)
      ) {
        end = new Date(task.pausedAt).getTime();
      } else {
        end = Date.now();
      }

      let sessionPauseMs = 0;
      let lifetimeBlockerMs = 0;
      if (task.blockerHistory && task.blockerHistory.length > 0) {
        task.blockerHistory.forEach((item) => {
          if (item.pausedAt) {
            const p = new Date(item.pausedAt).getTime();
            let r = item.resumedAt
              ? new Date(item.resumedAt).getTime()
              : Date.now();
            if (r > end) r = end;
            if (r >= p) {
              lifetimeBlockerMs += r - p;
              const oStart = Math.max(p, start);
              const oEnd = Math.min(r, end);
              if (oEnd > oStart) {
                sessionPauseMs += oEnd - oStart;
              }
            }
          }
        });
      }

      if (task.isBlocked && task.blockerPausedAt) {
        const pauseStart = new Date(task.blockerPausedAt).getTime();
        if (pauseStart < end) {
          lifetimeBlockerMs += end - pauseStart;
          const oStart = Math.max(pauseStart, start);
          if (end > oStart) {
            sessionPauseMs += end - oStart;
          }
        }
      }

      const sessionElapsedMs = Math.max(
        0,
        end - start - (task.totalPausedMs || 0) - sessionPauseMs,
      );
      const totalElapsedMs = baseTracked + sessionElapsedMs;
      const activeSecs = Math.max(0, Math.floor(totalElapsedMs / 1000));
      const blockedSecs = Math.max(0, Math.floor(lifetimeBlockerMs / 1000));

      return {
        activeStr: formatSecs(activeSecs),
        blockerStr: formatSecs(blockedSecs),
        totalStr: formatSecs(activeSecs + blockedSecs),
      };
    };

    const computeApprovalStr = (task) => {
      const effectiveReviewStart =
        task.reviewStartedAt ||
        task.lastReviewStartedAt ||
        (task.reviewCycles && task.reviewCycles.length > 0
          ? task.reviewCycles[task.reviewCycles.length - 1]?.startedAt
          : null);

      if (!effectiveReviewStart && !task.approvalWaitingMs) return "—";

      let durationMs = task.approvalWaitingMs || 0;
      if (task.status === "In Review" && effectiveReviewStart) {
        durationMs += Math.max(
          0,
          Date.now() - new Date(effectiveReviewStart).getTime(),
        );
      }
      if (!durationMs || durationMs <= 0) return "—";
      const totalSecs = Math.floor(durationMs / 1000);
      return formatSecs(totalSecs);
    };

    const rows = tasksToExport.map((task) => {
      const displayId = getTaskDisplayId
        ? getTaskDisplayId(task)
        : task._id || "";
      const projId = task.project?._id || task.project;
      const projectObj = (projects || []).find((p) => p._id === projId);
      const clientRaw = task.project?.client?.companyName
        ? task.project.client
        : projectObj?.client || task.project?.client;
      const clientName = clientRaw?.companyName || "No Client";

      const createdBy = task.createdBy?.name || "Unknown";
      const startDate = task.startDate ? formatDate(task.startDate) : "—";
      const dueDate = task.dueDate ? formatDate(task.dueDate) : "—";
      const createdTime = task.createdAt
        ? new Date(task.createdAt).toLocaleString()
        : "—";
      const blockerStr = task.isBlocked ? task.blockerReason || "Blocked" : "—";
      const contentCopy = task.contentCopy || task.copy || "—";
      const revisionCount = task.reviewCycles?.length || 0;

      const {
        activeStr,
        blockerStr: blockerTimeStr,
        totalStr,
      } = computeTaskTimes(task);
      const approvalStr = computeApprovalStr(task);

      return [
        displayId,
        task.priority || "Medium",
        task.title || "",
        contentCopy,
        clientName,
        task.contentType || "NONE",
        task.status || "Pending",
        blockerStr,
        activeStr,
        blockerTimeStr,
        totalStr,
        revisionCount,
        startDate,
        dueDate,
        createdBy,
        approvalStr,
        createdTime,
      ];
    });

    const csvContent =
      "\uFEFF" +
      [headers, ...rows]
        .map((e) =>
          e.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(","),
        )
        .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const todayStr = new Date().toISOString().split("T")[0];
    link.setAttribute("download", `My_Tasks_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("My Tasks data exported to Excel!");
  };

  return (
    <>
      {/* UNIFIED HEADER & CONTROLS */}
      <div className="flex px-4 xl:px-6 py-2.5 items-center justify-between gap-3 bg-white dark:bg-[#11131e] relative z-30 border-b border-slate-100 dark:border-slate-800/60 flex-wrap xl:flex-nowrap">
        {/* Left: Search Bar */}
        <div className="relative w-40 sm:w-90 shrink-0">
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-1.5 text-[11px] font-semibold rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 outline-none focus:border-blue-500 text-slate-800 dark:text-slate-200 shadow-2xs transition-all"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <FiX size={11} />
            </button>
          )}
        </div>

        {/* Right: Individual Filter Dropdowns & Export Button */}
        <div className="flex items-center justify-end gap-1.5 shrink-0 flex-wrap sm:flex-nowrap">
          {/* Date Filter Dropdown */}
          <div className="relative shrink-0" ref={dateDropdownRef}>
            <button
              type="button"
              onClick={() => setShowDateDropdown((prev) => !prev)}
              className={`py-1.5 px-2.5 flex items-center justify-center gap-1 rounded-xl border text-[11px] font-extrabold transition-all shadow-2xs cursor-pointer ${
                dateFilter !== "All"
                  ? "bg-emerald-50/80 border-emerald-300 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-500/40 dark:text-emerald-300 font-black"
                  : "bg-white dark:bg-[#151725] border-slate-200/90 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-emerald-500/50"
              }`}
            >
              <FiFilter className="text-emerald-500 text-[11px]" />
              <span>{dateFilter === "All" ? "Filter Date" : dateFilter}</span>
              <FiChevronDown
                size={11}
                className={`text-slate-400 transition-transform duration-200 ${
                  showDateDropdown ? "rotate-180" : ""
                }`}
              />
            </button>

            <AnimatePresence>
              {showDateDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-44 bg-white dark:bg-[#151725] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl p-1.5 z-[70] flex flex-col gap-0.5"
                >
                  {[
                    { label: "All Dates", value: "All" },
                    { label: "Today", value: "Today" },
                    { label: "Yesterday", value: "Yesterday" },
                    { label: "This Week", value: "This Week" },
                    { label: "This Month", value: "This Month" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setDateFilter(option.value);
                        setShowDateDropdown(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                        dateFilter === option.value
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
                      }`}
                    >
                      <span>{option.label}</span>
                      {dateFilter === option.value && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      )}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Offcanvas Filter Drawer Button */}
          <button
            type="button"
            onClick={() => setFilterPanelOpen(true)}
            className={`py-1.5 px-2.5 flex items-center justify-center gap-1.5 rounded-xl border text-[11px] font-extrabold transition-all shadow-2xs cursor-pointer ${
              priorityFilter !== "All" ||
              projectFilter !== "All" ||
              statusFilter !== "All" ||
              clientFilter !== "All" ||
              dateFilter !== "All" ||
              assignerFilter !== "All"
                ? "bg-blue-50/80 border-blue-300 text-blue-800 dark:bg-blue-950/40 dark:border-blue-500/40 dark:text-blue-300 font-black"
                : "bg-white dark:bg-[#151725] border-slate-200/90 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-blue-500/50"
            }`}
            title="Open full offcanvas filter panel"
          >
            <FiFilter className="text-blue-500 text-[11px]" />
            <span>Filter</span>
            {(priorityFilter !== "All" ||
              projectFilter !== "All" ||
              statusFilter !== "All" ||
              clientFilter !== "All" ||
              dateFilter !== "All" ||
              assignerFilter !== "All") && (
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            )}
          </button>

          {/* Export Excel Button */}
          <button
            type="button"
            onClick={handleExportExcel}
            className="py-1.5 px-2.5 flex items-center justify-center gap-1 rounded-xl border border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300 text-[11px] font-black cursor-pointer transition-all shadow-2xs hover:bg-emerald-100 dark:hover:bg-emerald-900/40 shrink-0"
            title="Export table data to Excel"
          >
            <FiDownload
              size={12}
              className="text-emerald-600 dark:text-emerald-400"
            />
            <span>Export Excel</span>
          </button>

          {/* Hide Column Dropdown Button */}
          <div className="relative" ref={colsDropdownRef}>
            <button
              type="button"
              onClick={() => setIsColsOpen(!isColsOpen)}
              className="py-1.5 px-2.5 flex items-center justify-center gap-1.5 rounded-xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#151725] text-slate-700 dark:text-slate-200 text-[11px] font-black cursor-pointer transition-all shadow-2xs hover:border-blue-500/50 hover:bg-slate-50 dark:hover:bg-slate-800 shrink-0"
              title="Show or hide table columns"
            >
              <FiColumns className="text-blue-500 text-[11px]" />
              <span>Hide Column</span>
              {Object.values(hiddenColumns).filter(Boolean).length > 0 && (
                <span className="text-[10px] font-black bg-blue-500 text-white rounded-full w-4 h-4 flex items-center justify-center ml-0.5">
                  {Object.values(hiddenColumns).filter(Boolean).length}
                </span>
              )}
            </button>

            <AnimatePresence>
              {isColsOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#151725] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl p-2.5 z-50 space-y-1.5 backdrop-blur-md"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-1.5 px-1">
                    <span className="text-[12px] font-bold text-slate-800 dark:text-white tracking-wider">
                      Toggle Columns
                    </span>
                    {Object.values(hiddenColumns).some(Boolean) && (
                      <button
                        type="button"
                        onClick={() =>
                          setHiddenColumns({
                            id: false,
                            priority: false,
                            taskName: false,
                            client: false,
                            contentType: false,
                            status: false,
                            blocker: false,
                            activeTime: false,
                            blockerTime: false,
                            timeTracker: false,
                            revision: false,
                            startDate: false,
                            endDate: false,
                            assignedBy: false,
                            approvalTime: false,
                            contentCopy: false,
                            createdTime: false,
                          })
                        }
                        className="text-[11px] font-bold text-blue-500 hover:text-blue-600 transition-colors cursor-pointer"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                  <div className="flex flex-col gap-0.5 max-h-64 overflow-y-auto custom-scrollbar">
                    {COLUMN_OPTIONS.map((col) => (
                      <label
                        key={col.key}
                        className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer text-[12px] font-bold text-slate-700 dark:text-slate-300 select-none transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={!hiddenColumns[col.key]}
                          onChange={() =>
                            setHiddenColumns((prev) => ({
                              ...prev,
                              [col.key]: !prev[col.key],
                            }))
                          }
                          className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-white/10 dark:bg-black/20 cursor-pointer"
                        />
                        <span className="truncate">{col.label}</span>
                      </label>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* OFFCANVAS FILTER PANEL */}
      <AnimatePresence>
        {filterPanelOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setFilterPanelOpen(false)}
              className="fixed inset-0 z-40 bg-transparent"
            />
            {/* Offcanvas Panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{
                type: "tween",
                ease: "easeOut",
                duration: 0.28,
              }}
              className="fixed top-0 right-0 h-full w-[320px] z-50 bg-white dark:bg-[#0b0f1a] border-l border-slate-200 dark:border-white/5 shadow-2xl flex flex-col"
            >
              {/* Panel Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-500/10 dark:bg-[#3b82f6]/10 flex items-center justify-center">
                    <FiFilter
                      size={13}
                      className="text-blue-600 dark:text-[#3b82f6]"
                    />
                  </div>
                  <span className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">
                    Filters
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {(priorityFilter !== "All" ||
                    projectFilter !== "All" ||
                    statusFilter !== "All" ||
                    clientFilter !== "All" ||
                    dateFilter !== "All") && (
                    <button
                      onClick={() => {
                        setPriorityFilter("All");
                        setProjectFilter("All");
                        setStatusFilter("All");
                        setClientFilter("All");
                        setDateFilter("All");
                      }}
                      className="text-[10px] font-bold text-rose-500 bg-rose-50 dark:bg-rose-500/10 px-2.5 py-1 rounded-lg hover:bg-rose-100 transition-colors cursor-pointer"
                    >
                      Clear All
                    </button>
                  )}
                  <button
                    onClick={() => setFilterPanelOpen(false)}
                    className="w-7 h-7 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  >
                    <FiX size={16} />
                  </button>
                </div>
              </div>

              {/* Panel Body */}
              <div className="flex-1 overflow-y-auto sidebar-scrollbar p-5 space-y-6">
                {/* Status */}
                <div className="space-y-2.5">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
                    Status
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      {
                        name: "All",
                        label: "All Statuses",
                        color: "bg-slate-400",
                      },
                      {
                        name: "Active Tasks",
                        label: "⚡ Active Tasks",
                        color: "bg-indigo-500",
                      },
                      {
                        name: "Pending",
                        label: "Pending",
                        color: "bg-slate-400",
                      },
                      {
                        name: "In Progress",
                        label: "In Progress",
                        color: "bg-amber-500",
                      },
                      {
                        name: "In Review",
                        label: "In Review",
                        color: "bg-sky-500",
                      },
                      {
                        name: "Correction",
                        label: "Correction",
                        color: "bg-orange-500",
                      },
                      {
                        name: "Completed",
                        label: "Completed",
                        color: "bg-emerald-500",
                      },
                      {
                        name: "On Hold",
                        label: "On Hold",
                        color: "bg-rose-500",
                      },
                      {
                        name: "Rejected",
                        label: "Rejected",
                        color: "bg-red-500",
                      },
                      ...(statusFilter === "Overdue"
                        ? [
                            {
                              name: "Overdue",
                              label: "Overdue",
                              color: "bg-rose-600 animate-pulse",
                            },
                          ]
                        : statusFilter === "Due Today"
                          ? [
                              {
                                name: "Due Today",
                                label: "Due Today",
                                color: "bg-amber-600 animate-pulse",
                              },
                            ]
                          : []),
                    ].map((st) => (
                      <button
                        key={st.name}
                        onClick={() => setStatusFilter(st.name)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-xl transition-all border cursor-pointer ${
                          statusFilter === st.name
                            ? "bg-blue-600 border-blue-600 text-white dark:bg-[#3b82f6] dark:border-[#3b82f6] dark:text-black shadow-md"
                            : "bg-slate-50 border-slate-200 dark:bg-white/[0.03] dark:border-white/5 text-slate-600 dark:text-slate-400 hover:border-blue-400 dark:hover:border-[#3b82f6]/40"
                        }`}
                      >
                        {st.name !== "All" && (
                          <span
                            className={`w-2.5 h-2.5 rounded-full ${st.color} shrink-0`}
                          />
                        )}
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Divider */}
                <div className="h-px bg-slate-100 dark:bg-white/5" />

                {/* Priority */}
                <div className="space-y-2.5">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
                    Priority
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      {
                        name: "All",
                        label: "All Priorities",
                        color: "bg-slate-400",
                      },
                      { name: "Low", label: "Low", color: "bg-slate-400" },
                      {
                        name: "Medium",
                        label: "Medium",
                        color: "bg-amber-500",
                      },
                      { name: "High", label: "High", color: "bg-rose-505" },
                      {
                        name: "Top High",
                        label: "Top High",
                        color: "bg-purple-600",
                      },
                    ].map((p) => (
                      <button
                        key={p.name}
                        onClick={() => setPriorityFilter(p.name)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-xl transition-all border cursor-pointer ${
                          priorityFilter === p.name
                            ? "bg-blue-600 border-blue-600 text-white dark:bg-[#3b82f6] dark:border-[#3b82f6] dark:text-black shadow-md"
                            : "bg-slate-50 border-slate-200 dark:bg-white/[0.03] dark:border-white/5 text-slate-600 dark:text-slate-400 hover:border-blue-400 dark:hover:border-[#3b82f6]/40"
                        }`}
                      >
                        {p.name !== "All" && (
                          <span
                            className={`w-2 h-2 rounded-full ${p.color} shrink-0`}
                          />
                        )}
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Divider */}
                <div className="h-px bg-slate-100 dark:bg-white/5" />

                {/* Client */}
                <div className="space-y-2.5">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
                    Client
                  </label>
                  <div className="flex flex-col gap-1.5">
                    <button
                      onClick={() => setClientFilter("All")}
                      className={`w-full text-left px-3 py-2 text-[11px] font-bold rounded-xl transition-all border cursor-pointer ${
                        clientFilter === "All"
                          ? "bg-blue-600 border-blue-600 text-white dark:bg-[#3b82f6] dark:border-[#3b82f6] dark:text-black"
                          : "bg-slate-50 border-slate-200 dark:bg-white/[0.03] dark:border-white/5 text-slate-600 dark:text-slate-400 hover:border-blue-400"
                      }`}
                    >
                      All Clients
                    </button>
                    {uniqueClients.map((c, index) => {
                      const ClientIcon = getClientIconComponent(c.icon);
                      const isSelected = clientFilter === c.id;
                      return (
                        <button
                          key={c.id || c.name || `client-${index}`}
                          onClick={() => setClientFilter(c.id)}
                          className={`w-full flex items-center gap-2 text-left px-3 py-2 text-[11px] font-bold rounded-xl transition-all border cursor-pointer ${
                            isSelected
                              ? "text-white dark:text-black font-extrabold"
                              : "text-slate-600 dark:text-slate-400 hover:border-blue-400 dark:hover:border-[#3b82f6]/40"
                          }`}
                          style={{
                            backgroundColor: isSelected
                              ? c.color
                              : "transparent",
                            borderColor: isSelected
                              ? c.color
                              : "rgba(148, 163, 184, 0.1)",
                          }}
                        >
                          <span
                            className="w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-extrabold shrink-0"
                            style={{
                              backgroundColor: isSelected
                                ? "rgba(255, 255, 255, 0.2)"
                                : `${c.color}15`,
                              color: isSelected ? "#ffffff" : c.color,
                            }}
                          >
                            <ClientIcon size={10} />
                          </span>
                          <span className="truncate">{c.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Divider */}
                <div className="h-px bg-slate-100 dark:bg-white/5" />

                {/* Project */}
                <div className="space-y-2.5">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
                    Project
                  </label>
                  <div className="flex flex-col gap-1.5">
                    <button
                      onClick={() => setProjectFilter("All")}
                      className={`w-full text-left px-3 py-2 text-[11px] font-bold rounded-xl transition-all border cursor-pointer ${
                        projectFilter === "All"
                          ? "bg-blue-600 border-blue-600 text-white dark:bg-[#3b82f6] dark:border-[#3b82f6] dark:text-black"
                          : "bg-slate-50 border-slate-200 dark:bg-white/[0.03] dark:border-white/5 text-slate-600 dark:text-slate-400 hover:border-blue-400"
                      }`}
                    >
                      All Projects
                    </button>
                    {uniqueProjects.map((p, index) => (
                      <button
                        key={p.id || p.name || `project-${index}`}
                        onClick={() => setProjectFilter(p.id)}
                        className={`w-full flex items-center gap-2 text-left px-3 py-2 text-[11px] font-bold rounded-xl transition-all border cursor-pointer ${
                          projectFilter === p.id
                            ? "bg-blue-600 border-blue-600 text-white dark:bg-[#3b82f6] dark:border-[#3b82f6] dark:text-black"
                            : "bg-slate-50 border-slate-200 dark:bg-white/[0.03] dark:border-white/5 text-slate-600 dark:text-slate-400 hover:border-blue-400"
                        }`}
                      >
                        <span className="w-5 h-5 rounded-lg bg-blue-500/20 text-blue-600 dark:bg-[#3b82f6]/20 dark:text-[#3b82f6] flex items-center justify-center text-[8px] font-extrabold shrink-0">
                          {p.name.charAt(0).toUpperCase()}
                        </span>
                        <span className="truncate">{p.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Panel Footer */}
              <div className="p-4 border-t border-slate-100 dark:border-white/5">
                <button
                  onClick={() => setFilterPanelOpen(false)}
                  className="w-full py-2.5 rounded-xl bg-blue-600 dark:bg-[#3b82f6] text-white dark:text-black text-xs font-black uppercase tracking-wider hover:bg-blue-700 dark:hover:bg-[#3b82f6]/90 transition-colors cursor-pointer"
                >
                  Apply & Close
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* TASK LIST CONTAINER */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-500 border-t-transparent"></div>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-[#11131e] rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.2)]">
          <FiCheckSquare
            size={36}
            className="mx-auto text-slate-300 dark:text-slate-600"
          />
          <h3 className="mt-4 text-sm font-black text-slate-800 dark:text-slate-200 tracking-wider">
            No Tasks Found
          </h3>
          <p className="text-slate-400 text-[11px] font-semibold mt-1">
            You have no tasks assigned matching this criteria.
          </p>
        </div>
      ) : viewType === "kanban" ? (
        <div className="flex gap-6 overflow-x-auto pb-8 pt-2 scrollbar-thin px-2">
          {[
            "Pending",
            "In Progress",
            "In Review",
            "On Hold",
            "Completed",
            "Rejected",
          ].map((colStatus) => {
            const colTasks = filteredTasks.filter(
              (t) => t.status === colStatus,
            );
            const style = getStatusStyle(colStatus);

            return (
              <div
                key={colStatus}
                className={`flex-shrink-0 w-[300px] sm:w-[340px] flex flex-col rounded-3xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/80 p-4 transition-colors duration-300 ${draggedTaskId ? "border-dashed border-blue-300 dark:border-blue-500/50 bg-blue-50/30 dark:bg-blue-900/10" : ""}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, colStatus)}
              >
                <div className="mb-5 flex items-center justify-between">
                  <h3 className="text-sm font-black tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2.5">
                    <span
                      className={`w-2.5 h-2.5 rounded-full shadow-sm ${style.dot}`}
                    ></span>
                    {colStatus}
                  </h3>
                  <span className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-black px-2.5 py-1 rounded-full shadow-sm">
                    {colTasks.length}
                  </span>
                </div>

                <div className="flex flex-col gap-3 h-full min-h-[200px]">
                  {colTasks.length === 0 ? (
                    <div className="bg-white/50 dark:bg-[#11131e]/30 border-2 border-slate-200/50 dark:border-slate-800/40 border-dashed rounded-2xl h-32 flex flex-col items-center justify-center text-center px-4 transition-colors">
                      <span className="text-[11px] font-bold text-slate-400 tracking-wider">
                        Drop tasks here
                      </span>
                    </div>
                  ) : (
                    colTasks.map((task, idx) => {
                      const isCompleted = task.status === "Completed";
                      const isRejected = task.status === "Rejected";
                      const isInReview = task.status === "In Review";
                      return (
                        <div
                          key={task._id || `task-board-${idx}`}
                          draggable={!isRejected}
                          onDragStart={(e) =>
                            !isRejected && handleDragStart(e, task._id)
                          }
                          onDragEnd={() => setDraggedTaskId(null)}
                          onClick={() => handleSelectTaskForDrawer(task._id)}
                          className={`shadow-sm rounded-2xl p-5 border transition-all flex flex-col gap-3 ${
                            isRejected
                              ? "!bg-[#fde8e8] text-rose-950 dark:!bg-[#2c1214] dark:text-rose-200 opacity-80 pointer-events-none !border-rose-300 dark:!border-rose-800/60"
                              : draggedTaskId === task._id
                                ? "opacity-50 scale-95 border-blue-500 bg-white dark:bg-[#11131e]"
                                : "bg-white dark:bg-[#11131e] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] border-slate-200 dark:border-slate-800 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-500/60 cursor-grab active:cursor-grabbing group"
                          }`}
                        >
                          <div className="flex justify-between items-start flex-wrap gap-1.5">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`px-2.5 py-1 rounded-lg text-[9px] font-black tracking-wider uppercase ${getPriorityStyle(task.priority || "Medium")}`}
                              >
                                {task.priority || "Medium"}
                              </span>
                              {task.isBlocked && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300 border border-rose-200/50 dark:border-rose-500/40 font-extrabold text-[8.5px] whitespace-nowrap tracking-wider uppercase animate-pulse">
                                  <FiAlertCircle size={9} /> Blocked
                                </span>
                              )}
                            </div>
                            {task.dueDate && (
                              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300 border border-rose-200/50 dark:border-rose-500/40 font-extrabold text-[9px] whitespace-nowrap tracking-wider">
                                <FiCalendar size={10} />
                                {new Date(task.dueDate).toLocaleDateString(
                                  undefined,
                                  {
                                    month: "short",
                                    day: "numeric",
                                  },
                                )}
                              </span>
                            )}
                          </div>
                          <h4
                            className={`text-sm font-bold text-slate-800 dark:text-slate-100 leading-snug flex flex-col gap-1.5 ${isCompleted ? "line-through decoration-green-600 dark:decoration-green-500 decoration-2 text-slate-405" : ""}`}
                          >
                            <span>{task.title}</span>
                            {task.isBlocked && task.blockerReason && (
                              <span className="text-[10px] text-rose-600 dark:text-rose-450 italic font-semibold normal-case bg-rose-505 dark:bg-rose-500/10 px-2 py-1 rounded-lg border border-rose-100 dark:border-rose-950/40">
                                Blocker: {task.blockerReason}
                              </span>
                            )}
                          </h4>
                          <div className="flex items-center justify-between pt-4 mt-1 border-t border-slate-100 dark:border-slate-800/80 flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1.5 text-[9px] font-black tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 px-2.5 py-1 rounded-lg border border-blue-100 dark:border-blue-900/40">
                                <FiBriefcase size={10} />
                                {(() => {
                                  const projId =
                                    task.project?._id || task.project;
                                  const projectObj = projId
                                    ? projectsMap.get(String(projId))
                                    : null;
                                  return (
                                    projectObj?.name ||
                                    task.project?.name ||
                                    "Internal"
                                  );
                                })()}
                              </span>
                              {(() => {
                                const projId =
                                  task.project?._id || task.project;
                                const projectObj = projId
                                  ? projectsMap.get(String(projId))
                                  : null;
                                const client = task.project?.client?.companyName
                                  ? task.project.client
                                  : projectObj?.client || task.project?.client;
                                if (client?.companyName) {
                                  return (
                                    <ClientBadge client={client} size="sm" />
                                  );
                                }
                                return null;
                              })()}
                            </div>
                            {task.subtasks?.length > 0 && (
                              <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 flex items-center gap-1 bg-slate-50 dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                                <FiCheckSquare
                                  size={11}
                                  className={
                                    task.subtasks.filter(
                                      (s) => s.status === "Completed",
                                    ).length === task.subtasks.length
                                      ? "text-emerald-500"
                                      : ""
                                  }
                                />
                                {
                                  task.subtasks.filter(
                                    (s) => s.status === "Completed",
                                  ).length
                                }
                                /{task.subtasks.length}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white dark:bg-[#0f111a] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.2)] overflow-hidden border border-slate-200 dark:border-slate-800/80 transition-all">
            <div className="overflow-x-auto max-h-[calc(100vh-220px)] w-full scrollbar-thin">
              <table className="w-full min-w-full text-left table-auto">
                <thead>
                  <tr className="sticky top-0 z-20  text-center bg-slate-50 dark:bg-[#11131e] text-slate-500 dark:text-slate-400 text-[10.5px] sm:text-[12px] font-medium border-b border-slate-200 dark:border-slate-200 shadow-sm">
                    {!hiddenColumns.id && (
                      <ResizableHeader
                        id="id"
                        label="ID"
                        colWidths={colWidths}
                        handleMouseDown={handleMouseDown}
                        defaultClassName="px-3 py-2 border border-slate-200/70 dark:border-transparent w-16"
                      />
                    )}
                    {!hiddenColumns.priority && (
                      <ResizableHeader
                        id="priority"
                        label="Priority"
                        colWidths={colWidths}
                        handleMouseDown={handleMouseDown}
                        defaultClassName="px-3 py-2 border border-slate-200/70 dark:border-transparent w-20"
                      />
                    )}
                    {!hiddenColumns.taskName && (
                      <ResizableHeader
                        id="taskName"
                        label="Task Name"
                        colWidths={colWidths}
                        handleMouseDown={handleMouseDown}
                        defaultClassName="px-3 py-2 border border-slate-200/70 dark:border-transparent min-w-[180px] whitespace-nowrap"
                      />
                    )}
                    {!hiddenColumns.client && (
                      <ResizableHeader
                        id="client"
                        label="Client"
                        colWidths={colWidths}
                        handleMouseDown={handleMouseDown}
                        defaultClassName="px-3 py-2 border border-slate-200/70 dark:border-transparent w-24"
                      />
                    )}
                    {!hiddenColumns.contentType && (
                      <ResizableHeader
                        id="contentType"
                        label="Content-type"
                        colWidths={colWidths}
                        handleMouseDown={handleMouseDown}
                        defaultClassName="px-3 py-2 border border-slate-200/70 dark:border-transparent w-32 whitespace-nowrap"
                      />
                    )}
                    {!hiddenColumns.status && (
                      <ResizableHeader
                        id="status"
                        label="Status"
                        colWidths={colWidths}
                        handleMouseDown={handleMouseDown}
                        defaultClassName="px-3 py-2 border border-slate-200/70 dark:border-transparent w-48 min-w-[180px]"
                      />
                    )}
                    {!hiddenColumns.blocker && (
                      <ResizableHeader
                        id="blocker"
                        label="Blocker"
                        colWidths={colWidths}
                        handleMouseDown={handleMouseDown}
                        defaultClassName="px-3 py-2 border border-slate-200/70 dark:border-transparent w-32 min-w-[125px]"
                      />
                    )}
                    {!hiddenColumns.activeTime && (
                      <ResizableHeader
                        id="activeTime"
                        label="Inprogress time taken"
                        colWidths={colWidths}
                        handleMouseDown={handleMouseDown}
                        defaultClassName="px-3 py-2 border border-slate-200/70 dark:border-transparent w-36 whitespace-nowrap"
                      />
                    )}
                    {!hiddenColumns.blockerTime && (
                      <ResizableHeader
                        id="blockerTime"
                        label="Blocker time"
                        colWidths={colWidths}
                        handleMouseDown={handleMouseDown}
                        defaultClassName="px-3 py-2 border border-slate-200/70 dark:border-transparent w-32 whitespace-nowrap"
                      />
                    )}
                    {!hiddenColumns.timeTracker && (
                      <ResizableHeader
                        id="timeTracker"
                        label="Time tracker"
                        colWidths={colWidths}
                        handleMouseDown={handleMouseDown}
                        defaultClassName="px-3 py-2 border border-slate-200/70 dark:border-transparent w-32 whitespace-nowrap"
                      />
                    )}
                    {!hiddenColumns.revision && (
                      <ResizableHeader
                        id="revision"
                        label="Revision"
                        colWidths={colWidths}
                        handleMouseDown={handleMouseDown}
                        defaultClassName="px-3 py-2 border border-slate-200/70 dark:border-transparent w-28"
                      />
                    )}
                    {!hiddenColumns.startDate && (
                      <ResizableHeader
                        id="startDate"
                        label="Start Date"
                        colWidths={colWidths}
                        handleMouseDown={handleMouseDown}
                        defaultClassName="px-3 py-2 border border-slate-200/70 dark:border-transparent w-32"
                      />
                    )}
                    {!hiddenColumns.endDate && (
                      <ResizableHeader
                        id="endDate"
                        label="DUE DATE"
                        colWidths={colWidths}
                        handleMouseDown={handleMouseDown}
                        defaultClassName="px-3 py-2 border border-slate-200/70 dark:border-transparent w-32"
                      />
                    )}
                    {!hiddenColumns.assignedBy && (
                      <ResizableHeader
                        id="assignedBy"
                        label="Assigned By"
                        colWidths={colWidths}
                        handleMouseDown={handleMouseDown}
                        defaultClassName="px-3 py-2 border border-slate-200/70 dark:border-transparent min-w-[180px] w-52 whitespace-nowrap"
                      />
                    )}
                    {!hiddenColumns.approvalTime && (
                      <ResizableHeader
                        id="approvalTime"
                        label="Approval Info"
                        colWidths={colWidths}
                        handleMouseDown={handleMouseDown}
                        defaultClassName="px-3 py-2 border border-slate-200/70 dark:border-transparent w-36 whitespace-nowrap"
                      />
                    )}
                    {!hiddenColumns.contentCopy && (
                      <ResizableHeader
                        id="contentCopy"
                        label="Content Copy"
                        colWidths={colWidths}
                        handleMouseDown={handleMouseDown}
                        defaultClassName="px-3 py-2 border border-slate-200/70 dark:border-transparent min-w-[150px] max-w-[290px] w-auto whitespace-nowrap"
                      />
                    )}
                    {!hiddenColumns.createdTime && (
                      <ResizableHeader
                        id="createdTime"
                        label="Created Time"
                        colWidths={colWidths}
                        handleMouseDown={handleMouseDown}
                        defaultClassName="px-3 py-2 border border-slate-200/70 dark:border-transparent min-w-[200px] w-56"
                      />
                    )}
                    {!hiddenColumns.feedbackMom && (
                      <ResizableHeader
                        id="feedbackMom"
                        label="Feedback MOM"
                        colWidths={colWidths}
                        handleMouseDown={handleMouseDown}
                        defaultClassName="px-3 py-2 border border-slate-200/70 dark:border-transparent min-w-[170px] max-w-[280px]"
                      />
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {sortedTasks.length === 0 ? (
                    <tr>
                      <td
                        colSpan={visibleColCount}
                        className="px-6 py-8 text-center text-slate-450 dark:text-slate-500 font-bold bg-slate-50/5 dark:bg-slate-900/5 text-xs"
                      >
                        No tasks found.
                      </td>
                    </tr>
                  ) : (
                    sortedTasks.map((task, idx) => {
                      const isCompleted = task.status === "Completed";
                      const isRejected = task.status === "Rejected";
                      const isInReview = task.status === "In Review";
                      const isInProgress = task.status === "In Progress";
                      const statusStyle = getStatusStyle(
                        task.status,
                        task.isBlocked,
                      );
                      const isExpanded = !!expandedTasks[task._id];

                      return (
                        <React.Fragment key={task._id || `task-row-${idx}`}>
                          <tr
                            className={`transition-colors group ${
                              isRejected
                                ? "!bg-[#fde8e8] text-rose-950 dark:!bg-[#2c1214] dark:text-rose-200 opacity-80 pointer-events-none"
                                : task.priority === "Top High"
                                  ? "row-priority-top-high text-slate-700 dark:text-slate-200 hover:bg-slate-50/40 dark:hover:bg-[#1a1d2d] cursor-pointer"
                                  : "text-slate-700 dark:text-slate-200 hover:bg-slate-50/40 dark:hover:bg-[#1a1d2d] cursor-pointer"
                            }`}
                            onClick={() => handleSelectTaskForDrawer(task._id)}
                          >
                            {/* ID */}
                            {!hiddenColumns.id && (
                              <td className="px-3 py-2 border border-slate-200/70 dark:border-transparent font-bold text-[11px] text-slate-500 dark:text-slate-400 text-center">
                                {getTaskDisplayId(task)}
                              </td>
                            )}

                            {/* Priority Badge */}
                            {!hiddenColumns.priority && (
                              <td className="px-3 py-2 border border-slate-200/70 dark:border-transparent text-center">
                                <span
                                  className={`inline-block text-center w-30 py-3 text-[11px] sm:text-[13px] rounded-[10px] font-bold whitespace-nowrap ${
                                    isSameDate(task.startDate, task.dueDate)
                                      ? "badge-priority-top-high"
                                      : getPriorityStyle(
                                          task.priority || "Medium",
                                        )
                                  }`}
                                >
                                  {isSameDate(task.startDate, task.dueDate)
                                    ? "Top High"
                                    : task.priority || "Medium"}
                                </span>
                              </td>
                            )}

                            {/* Title & Subtasks Dropdown */}
                            {!hiddenColumns.taskName && (
                              <td className="px-3 py-2 font-bold border border-slate-200/70 dark:border-transparent text-left">
                                <div className="flex items-center gap-3">
                                  <span
                                    className={`text-xs sm:text-[11px] ${isCompleted ? "line-through decoration-green-600 dark:decoration-green-500 decoration-2 text-slate-400 dark:text-slate-555" : "text-slate-700 dark:text-white"}`}
                                  >
                                    <span className="flex items-center gap-1 text-[12.5px] sm:text-[12px] whitespace-nowrap">
                                      <BiFile /> {task.title}
                                    </span>
                                  </span>
                                  {task.isBlocked && (
                                    <span
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 dark:bg-rose-955 dark:text-rose-400 border border-rose-200 dark:border-rose-800 text-[11px] sm:text-[10px] font-black tracking-wider uppercase animate-pulse shrink-0"
                                      title={task.blockerReason || "Blocked"}
                                    >
                                      <FiAlertCircle size={10} /> Blocked
                                    </span>
                                  )}
                                  {task.subtasks?.length > 0 && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleTaskExpanded(task._id);
                                      }}
                                      className="text-slate-405 hover:text-blue-600 flex items-center gap-0.5 text-xs sm:text-[10px] font-extrabold shrink-0"
                                    >
                                      {isExpanded ? (
                                        <FiChevronDown size={14} />
                                      ) : (
                                        <FiChevronRight size={14} />
                                      )}
                                      <span>
                                        Subtasks ({task.subtasks.length})
                                      </span>
                                    </button>
                                  )}
                                </div>
                              </td>
                            )}

                            {/* Client Name */}
                            {!hiddenColumns.client && (
                              <td className="px-3 py-2 border border-slate-200/70 dark:border-transparent text-center">
                                {(() => {
                                  const projId =
                                    task.project?._id || task.project;
                                  const projectObj = projId
                                    ? projectsMap.get(String(projId))
                                    : null;
                                  const client = task.project?.client
                                    ?.companyName
                                    ? task.project.client
                                    : projectObj?.client ||
                                      task.project?.client;
                                  if (client) {
                                    return (
                                      <ClientBadge client={client} size="sm" />
                                    );
                                  }
                                  return (
                                    <span className="text-slate-400 italic text-xs sm:text-[10px]">
                                      No Client
                                    </span>
                                  );
                                })()}
                              </td>
                            )}

                            {/* Content-type */}
                            {!hiddenColumns.contentType && (
                              <td className="px-3 py-2 border border-slate-200/70 dark:border-transparent whitespace-nowrap text-center">
                                <span
                                  className={`px-2 py-0.5 rounded-md text-xs sm:text-[10px] font-bold tracking-wider uppercase border whitespace-nowrap ${(() => {
                                    const t = (
                                      task.contentType || ""
                                    ).toUpperCase();
                                    switch (t) {
                                      case "VIDEO":
                                      case "WEBSITE":
                                        return "badge-type-video";
                                      case "IMAGE":
                                      case "SEO":
                                        return "badge-type-image";
                                      case "CAROUSEL":
                                      case "VIDEO SHOOT":
                                        return "badge-type-carousel";
                                      case "REEL":
                                        return "badge-type-reel";
                                      case "POST":
                                        return "badge-type-post";
                                      case "STORY":
                                        return "badge-type-story";
                                      default:
                                        return "badge-type-none";
                                    }
                                  })()}`}
                                >
                                  {task.contentType || "None"}
                                </span>
                              </td>
                            )}

                            {/* Status Select Column Field */}
                            {!hiddenColumns.status && (
                              <td
                                className="px-3 py-2 border border-slate-200/70 dark:border-transparent w-48 min-w-[180px] text-center"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {task.isBlocked ? (
                                  <div className="px-3 py-1.5 text-[11px] font-bold rounded-full border border-orange-200/80 dark:border-orange-500/20 text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center gap-1.5 shadow-2xs">
                                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                                    Paused - Blocked
                                  </div>
                                ) : task.status === "Completed" ? (
                                  <div className="px-3 py-1.5 text-[11px] font-bold rounded-full border border-emerald-200/80 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center gap-1.5 shadow-2xs">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    Completed
                                  </div>
                                ) : task.status === "In Review" ? (
                                  <div className="px-3 py-1.5 text-[11px] font-bold rounded-full border border-amber-200/80 dark:border-amber-500/20 text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center gap-1.5 shadow-2xs">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                    In Review
                                  </div>
                                ) : task.status === "Correction" ? (
                                  <div className="flex flex-col gap-1 items-center">
                                    <div className="px-3 py-1 text-[11px] font-bold rounded-full border border-orange-200/80 dark:border-orange-500/20 text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center gap-1.5 shadow-2xs">
                                      <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                                      Corrections Required
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleStatusChange(
                                          task._id,
                                          "In Progress",
                                        )
                                      }
                                      className="px-2.5 py-0.5 text-[9px] font-extrabold bg-orange-500 hover:bg-orange-600 text-white rounded-full shadow-2xs transition-all cursor-pointer"
                                    >
                                      Resume Work
                                    </button>
                                  </div>
                                ) : task.status === "Rejected" ? (
                                  <div className="px-3 py-1.5 text-[11px] font-bold rounded-full border border-rose-200/80 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center gap-1.5 shadow-2xs">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                    Rejected
                                  </div>
                                ) : (
                                  <div className="relative w-full group">
                                    <select
                                      value={task.status}
                                      onChange={(e) =>
                                        handleStatusChange(
                                          task._id,
                                          e.target.value,
                                        )
                                      }
                                      className={`appearance-none pl-2.5 pr-6 py-0.5 text-[11px] sm:text-[9.5px] font-bold rounded-full border-2 cursor-pointer w-full text-left transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/30 shadow-sm hover:shadow ${statusStyle.bg}`}
                                    >
                                      {task.contentType === "MOM" ? (
                                        <>
                                          <option
                                            value="Pending"
                                            className="bg-white dark:bg-gray-500 text-slate-700 dark:text-white"
                                          >
                                            Pending
                                          </option>

                                          <option
                                            value="Completed"
                                            className="bg-white dark:bg-[#11131e] text-slate-700 dark:text-slate-200"
                                          >
                                            Completed
                                          </option>
                                        </>
                                      ) : (
                                        <>
                                          <option
                                            value="Pending"
                                            className="bg-white dark:bg-gray-500 text-slate-700 dark:text-white"
                                          >
                                            Pending
                                          </option>
                                          <option
                                            value="In Progress"
                                            className="bg-white dark:bg-blue-500 text-slate-700 dark:text-white"
                                          >
                                            In Progress
                                          </option>
                                          <option
                                            value="In Review"
                                            className="bg-white dark:bg-[#11131e] text-slate-700 dark:text-slate-200"
                                          >
                                            In Review
                                          </option>
                                          {task.status === "Completed" && (
                                            <option
                                              value="Completed"
                                              className="bg-white dark:bg-[#11131e] text-slate-700 dark:text-slate-200"
                                            >
                                              Completed
                                            </option>
                                          )}
                                          <option
                                            value="On Hold"
                                            className="bg-white dark:bg-[#11131e] text-slate-700 dark:text-slate-200"
                                          >
                                            On Hold
                                          </option>
                                          {task.status === "Rejected" && (
                                            <option
                                              value="Rejected"
                                              className="bg-white dark:bg-[#11131e] text-slate-700 dark:text-slate-200"
                                            >
                                              Rejected
                                            </option>
                                          )}
                                        </>
                                      )}
                                    </select>
                                    <div className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-505 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">
                                      <FiChevronDown
                                        size={9}
                                        strokeWidth={2.5}
                                      />
                                    </div>
                                  </div>
                                )}
                              </td>
                            )}

                            {/* Blocker Column */}
                            {!hiddenColumns.blocker && (
                              <td
                                className="px-3 py-2 border border-slate-200/70 dark:border-transparent w-32 min-w-[125px] hover:relative hover:z-50 text-center"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="flex flex-col gap-1.5 w-full">
                                  {task.isBlocked ? (
                                    <div className="space-y-1.5 p-2 bg-rose-500/5 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-955 rounded-2xl">
                                      <div className="flex justify-between items-center gap-1.5">
                                        <span
                                          className="px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-955 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30 text-rose-700 dark:text-rose-455 text-[10px] sm:text-[8.5px] font-black uppercase tracking-wider truncate max-w-[100px]"
                                          title={task.blockerType}
                                        >
                                          {task.blockerType}
                                        </span>
                                        <span
                                          className={`px-1.5 py-0.5 rounded-md text-[9px] sm:text-[8px] font-black uppercase ${task.blockerPriority === "Urgent" ? "bg-red-500/20 text-red-650 dark:text-red-400 border border-red-500/30" : "bg-slate-100 dark:bg-slate-800 text-slate-505 dark:text-slate-400 border border-transparent"}`}
                                        >
                                          {task.blockerPriority}
                                        </span>
                                      </div>
                                      <p
                                        className="text-xs sm:text-[10px] text-slate-600 dark:text-slate-400 font-medium italic line-clamp-2 leading-tight"
                                        title={task.blockerDescription}
                                      >
                                        "{task.blockerDescription}"
                                      </p>
                                      <div className="flex justify-between items-center text-[10px] sm:text-[8.5px] font-bold text-slate-450 dark:text-slate-500">
                                        <span>
                                          ⏳ Exp: {task.blockerExpectedTime}
                                        </span>
                                        <span>
                                          Paused:{" "}
                                          {formatDate(task.blockerPausedAt)}
                                        </span>
                                      </div>
                                      <button
                                        onClick={() => handleResumeTask(task)}
                                        className="w-full mt-1 flex items-center justify-center gap-1 px-2.5 py-1 rounded-xl text-[10px] sm:text-[9px] font-black tracking-wider uppercase bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm shadow-emerald-500/10 hover:shadow transition-all cursor-pointer"
                                      >
                                        ✅ Resume Work
                                      </button>
                                    </div>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() =>
                                          handleOpenBlockerModal(task)
                                        }
                                        className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-xl text-[9.5px] sm:text-[8px] font-black tracking-wider uppercase bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-600/50 text-slate-700 dark:text-slate-200 hover:border-rose-505 hover:text-rose-505 transition-all w-full text-center cursor-pointer shadow-sm whitespace-nowrap"
                                      >
                                        <FiPlus size={10} /> Add Blocker
                                      </button>
                                      {task.blockerHistory &&
                                        task.blockerHistory.length > 0 && (
                                          <div className="relative group/history mt-1 text-center">
                                            <span className="inline-flex items-center gap-1 text-xs sm:text-[9px] font-extrabold text-slate-400 dark:text-slate-550 hover:text-rose-500 cursor-pointer transition-colors">
                                              ⏱️ Pause History (
                                              {task.blockerHistory.length})
                                            </span>
                                            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover/history:block z-50 w-64 bg-white dark:bg-[#0f111a] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-3 text-left space-y-2 pointer-events-none transition-all">
                                              <div className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b border-slate-105 dark:border-slate-800/80 pb-1 flex justify-between">
                                                <span>Pause Log</span>
                                                <span>
                                                  Total Pauses:{" "}
                                                  {task.blockerHistory.length}
                                                </span>
                                              </div>
                                              <div className="max-h-40 overflow-y-auto space-y-2 scrollbar-thin pr-1">
                                                {task.blockerHistory.map(
                                                  (hist, idx) => (
                                                    <div
                                                      key={idx}
                                                      className="text-[10px] space-y-0.5 border-b border-slate-50 dark:border-slate-900/55 pb-1.5 last:border-0 last:pb-0"
                                                    >
                                                      <div className="flex justify-between font-black text-slate-700 dark:text-slate-350">
                                                        <span className="text-rose-600 dark:text-rose-400">
                                                          {hist.blockerType}
                                                        </span>
                                                        <span className="text-slate-505">
                                                          {
                                                            hist.totalPauseMinutes
                                                          }{" "}
                                                          mins
                                                        </span>
                                                      </div>
                                                      {hist.blockerDescription && (
                                                        <p className="text-slate-505 dark:text-slate-455 italic line-clamp-2">
                                                          "
                                                          {
                                                            hist.blockerDescription
                                                          }
                                                          "
                                                        </p>
                                                      )}
                                                      <div className="text-[8px] text-slate-400 dark:text-slate-500 flex justify-between">
                                                        <span>
                                                          In:{" "}
                                                          {formatDateTime(
                                                            hist.pausedAt,
                                                          )}
                                                        </span>
                                                        <span>
                                                          Out:{" "}
                                                          {formatDateTime(
                                                            hist.resumedAt,
                                                          )}
                                                        </span>
                                                      </div>
                                                    </div>
                                                  ),
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                    </>
                                  )}
                                </div>
                              </td>
                            )}

                            {/* Work Time Column */}
                            {!hiddenColumns.activeTime && (
                              <td
                                className="px-3 py-2 border border-slate-200/70 dark:border-transparent min-w-[140px] text-center"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <WorkTimeCell task={task} />
                              </td>
                            )}

                            {/* Blocker Time Column */}
                            {!hiddenColumns.blockerTime && (
                              <td
                                className="px-3 py-2 border border-slate-200/70 dark:border-transparent min-w-[140px] text-center"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <BlockerTimeCell task={task} />
                              </td>
                            )}

                            {/* Today Tracker Column */}
                            {!hiddenColumns.timeTracker && (
                              <td
                                className="px-3 py-2 border border-slate-200/70 dark:border-transparent min-w-[140px] text-center"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <TodayTrackerCell task={task} />
                              </td>
                            )}

                            {/* Revision Column */}
                            {!hiddenColumns.revision && (
                              <td
                                className="px-3 py-2 border border-slate-200/70 dark:border-transparent w-28 text-center"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="flex justify-center items-center gap-1.5">
                                  <span className="font-extrabold text-[11px] text-slate-805 dark:text-yellow-50 text-center">
                                    {task.revisions || 0}
                                  </span>
                                  {(task.revisions || 0) > 3 && (
                                    <span
                                      className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.7)] animate-pulse"
                                      title="More than 3 revisions"
                                    />
                                  )}
                                </div>
                              </td>
                            )}

                            {/* Start Date */}
                            {!hiddenColumns.startDate && (
                              <td className="px-3 py-2 border border-slate-200/70 dark:border-transparent w-32 text-center">
                                <span
                                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-[10px] font-bold whitespace-nowrap ${task.startDate ? "bg-blue-200 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300 border border-blue-200/50 dark:border-blue-500/20" : "text-slate-450 dark:text-slate-505 border border-dashed border-slate-200 dark:border-[#1e293b]/40"}`}
                                >
                                  <FiCalendar size={11} />
                                  {formatDate(task.startDate)}
                                </span>
                              </td>
                            )}

                            {/* DUE DATE */}
                            {!hiddenColumns.endDate && (
                              <td className="px-3 py-2 border border-slate-200/70 dark:border-transparent w-32 text-center">
                                <span
                                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-[10px] font-bold whitespace-nowrap ${task.dueDate ? "bg-rose-200 text-rose-700 dark:bg-rose-500/10 dark:text-rose-350 border border-rose-200/50 dark:border-rose-500/20" : "text-slate-450 dark:text-slate-550 border border-dashed border-slate-200 dark:border-[#1e293b]/40"}`}
                                >
                                  <FiCalendar size={11} />
                                  {formatDate(task.dueDate)}
                                </span>
                              </td>
                            )}

                            {/* Assigned By */}
                            {!hiddenColumns.assignedBy && (
                              <td className="px-3 py-2 border border-slate-200/70 dark:border-transparent min-w-[180px] w-52 text-left">
                                <div className="flex items-center gap-2">
                                  <div className="relative shrink-0">
                                    {(() => {
                                      const assignerUser =
                                        task.assignedBy || task.createdBy;
                                      const avatarUrl =
                                        (typeof assignerUser?.profile
                                          ?.profileImage === "object"
                                          ? assignerUser?.profile?.profileImage
                                              ?.url
                                          : assignerUser?.profile
                                              ?.profileImage) ||
                                        (typeof assignerUser?.profileImage ===
                                        "object"
                                          ? assignerUser?.profileImage?.url
                                          : assignerUser?.profileImage) ||
                                        assignerUser?.profilePic ||
                                        assignerUser?.avatar ||
                                        assignerUser?.profile?.profilePic ||
                                        assignerUser?.profile?.avatar;

                                      if (avatarUrl) {
                                        return (
                                          <img
                                            src={avatarUrl}
                                            alt={
                                              assignerUser?.name || "Assigner"
                                            }
                                            className="w-8 h-8 rounded-full object-cover border border-slate-200/80 dark:border-white/10 shadow-sm"
                                          />
                                        );
                                      }

                                      // Fallback colored gradient avatar with initials
                                      const initials = (
                                        assignerUser?.name || "I"
                                      )
                                        .split(" ")
                                        .map((n) => n[0])
                                        .join("")
                                        .substring(0, 2)
                                        .toUpperCase();

                                      const AVATAR_COLORS = [
                                        "from-violet-500 to-indigo-600",
                                        "from-cyan-500 to-blue-600",
                                        "from-emerald-500 to-teal-600",
                                        "from-orange-500 to-amber-600",
                                        "from-pink-500 to-rose-600",
                                      ];
                                      const colorClass =
                                        AVATAR_COLORS[
                                          ((
                                            assignerUser?.name || "I"
                                          ).charCodeAt(0) || 0) %
                                            AVATAR_COLORS.length
                                        ];

                                      return (
                                        <div
                                          className={`w-8 h-8 rounded-full bg-gradient-to-br ${colorClass} flex items-center justify-center text-white font-black text-[9px] border border-white/10 shadow-sm`}
                                        >
                                          {initials}
                                        </div>
                                      );
                                    })()}
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="font-extrabold text-[11px] text-slate-800 dark:text-slate-200">
                                      {task.assignedBy?.name ||
                                        task.createdBy?.name ||
                                        "Internal"}
                                    </span>
                                    <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                                      {(task.assignedBy || task.createdBy)
                                        ?.department || "Management"}
                                    </span>
                                  </div>
                                </div>
                              </td>
                            )}

                            {/* Approval Info — duration only */}
                            {!hiddenColumns.approvalTime && (
                              <td
                                className="px-3 py-2 border border-slate-200/70 dark:border-transparent text-center"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <ApprovalDurationBadge
                                  approvalWaitingMs={task.approvalWaitingMs}
                                  reviewStartedAt={task.reviewStartedAt}
                                  status={task.status}
                                />
                              </td>
                            )}

                            {/* Content Copy */}
                            {!hiddenColumns.contentCopy && (
                              <td
                                className="px-3 py-2 border border-slate-200/70 dark:border-transparent"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="flex items-center gap-2 group/copy text-xs sm:text-[11px] text-slate-700 dark:text-slate-300 font-medium whitespace-pre-wrap break-words w-full max-w-[250px]">
                                  {task.contentCopy ? (
                                    <>
                                      <span>{task.contentCopy}</span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          navigator.clipboard.writeText(
                                            task.contentCopy,
                                          );
                                          toast.success(
                                            "Content copied to clipboard!",
                                          );
                                        }}
                                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-blue-500 transition-all cursor-pointer shrink-0"
                                        title="Copy to clipboard"
                                      >
                                        <FiCopy size={12} />
                                      </button>
                                    </>
                                  ) : (
                                    <span className="text-slate-400 italic font-normal">
                                      —
                                    </span>
                                  )}
                                </div>
                              </td>
                            )}

                            {/* Created Time */}
                            {!hiddenColumns.createdTime && (
                              <td className="px-3 py-2 border border-slate-200/70 dark:border-transparent text-center font-bold text-slate-500 dark:text-slate-400 text-xs sm:text-[11.5px]">
                                <CreatedTime time={task.createdAt} />
                              </td>
                            )}

                            {/* Feedback MOM Column */}
                            {!hiddenColumns.feedbackMom && (
                              <td
                                className="px-3 py-2 border border-slate-200/70 dark:border-transparent min-w-[170px] max-w-[280px]"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {task.contentType === "MOM" ? (
                                  <MomFeedbackInput
                                    task={task}
                                    onSave={(id, fields) =>
                                      handleTaskFieldChange(id, fields)
                                    }
                                  />
                                ) : (
                                  <span className="text-slate-300 dark:text-slate-600 font-semibold text-xs flex justify-center">
                                    —
                                  </span>
                                )}
                              </td>
                            )}
                          </tr>

                          {/* Expanded Subtasks Row */}
                          {isExpanded &&
                            task.subtasks &&
                            task.subtasks.length > 0 && (
                              <tr>
                                <td
                                  colSpan={visibleColCount}
                                  className="bg-slate-50/[0.15] dark:bg-[#121522]/30 px-6 py-4"
                                >
                                  <div className="space-y-2 border-l-2 border-blue-500/60 dark:border-blue-500/40 pl-6">
                                    <h5 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">
                                      Subtasks Checklist
                                    </h5>
                                    <div className="flex flex-col gap-2">
                                      {task.subtasks.map((sub, idx) => {
                                        const subCompleted =
                                          sub.status === "Completed";
                                        return (
                                          <div
                                            key={
                                              sub._id ||
                                              sub.title ||
                                              `sub-${idx}`
                                            }
                                            className="flex items-center justify-between bg-white dark:bg-[#141624] border border-slate-205/60 dark:border-white/5 p-3 rounded-2xl shadow-2xs group/sub"
                                          >
                                            <div className="flex items-center gap-3">
                                              <button
                                                onClick={() =>
                                                  handleToggleSubtask(task, sub)
                                                }
                                                className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all cursor-pointer ${subCompleted ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300 dark:border-white/10 hover:border-blue-500"}`}
                                              >
                                                {subCompleted && (
                                                  <FiCheck
                                                    size={12}
                                                    strokeWidth={3}
                                                  />
                                                )}
                                              </button>
                                              <span
                                                className={`text-xs font-bold text-slate-700 dark:text-slate-200 ${subCompleted ? "line-through decoration-green-600 dark:decoration-green-500 decoration-2 text-slate-400 dark:text-slate-500" : ""}`}
                                              >
                                                {sub.title}
                                              </span>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Enhanced Pagination Controls */}
            {totalItems > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-3.5 sidebar-bg  text-xs font-bold">
                {/* Left: Items per page selector & Total Items info */}
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                    <span className="text-[11px] font-semibold">
                      Rows per page:
                    </span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="px-2.5 py-1 rounded-xl bg-white dark:bg-[#181a29] border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 text-xs font-bold outline-none focus:border-blue-500 shadow-2xs cursor-pointer transition-all hover:border-blue-400"
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                  </div>
                  <span className="text-slate-500 dark:text-slate-400 text-[11.5px]">
                    Showing{" "}
                    <span className="text-slate-800 dark:text-slate-100 font-extrabold">
                      {totalItems > 0
                        ? (currentPage - 1) * itemsPerPage + 1
                        : 0}
                    </span>{" "}
                    to{" "}
                    <span className="text-slate-800 dark:text-slate-100 font-extrabold">
                      {Math.min(currentPage * itemsPerPage, totalItems)}
                    </span>{" "}
                    of{" "}
                    <span className="text-blue-600 dark:text-blue-400 font-extrabold">
                      {totalItems}
                    </span>{" "}
                    tasks
                  </span>
                </div>

                {/* Right: Page navigation buttons */}
                {totalPages > 1 && (
                  <div className="flex items-center gap-1.5">
                    {/* First Page Button */}
                    <button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(1)}
                      title="First Page"
                      className="w-8 h-8 rounded-xl hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 flex items-center justify-center disabled:opacity-30 disabled:hover:bg-transparent text-slate-600 dark:text-slate-300 cursor-pointer transition-all"
                    >
                      <FiChevronsLeft size={16} />
                    </button>

                    {/* Previous Page Button */}
                    <button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      title="Previous Page"
                      className="w-8 h-8 rounded-xl hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 flex items-center justify-center disabled:opacity-30 disabled:hover:bg-transparent text-slate-600 dark:text-slate-300 cursor-pointer transition-all"
                    >
                      <FiChevronLeft size={16} />
                    </button>

                    {/* Page Numbers */}
                    {getPageNumbers().map((page, idx) =>
                      page === "..." ? (
                        <span
                          key={`ellipsis-${idx}`}
                          className="px-1 text-slate-400 select-none font-bold"
                        >
                          ...
                        </span>
                      ) : (
                        <button
                          key={`page-${page}`}
                          onClick={() => setCurrentPage(page)}
                          className={`w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer transition-all ${
                            currentPage === page
                              ? "bg-blue-600 dark:bg-[#3b82f6] text-white dark:text-black shadow-sm font-black"
                              : "hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 font-bold"
                          }`}
                        >
                          {page}
                        </button>
                      ),
                    )}

                    {/* Next Page Button */}
                    <button
                      disabled={currentPage === totalPages}
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      title="Next Page"
                      className="w-8 h-8 rounded-xl hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 flex items-center justify-center disabled:opacity-30 disabled:hover:bg-transparent text-slate-600 dark:text-slate-300 cursor-pointer transition-all"
                    >
                      <FiChevronRight size={16} />
                    </button>

                    {/* Last Page Button */}
                    <button
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(totalPages)}
                      title="Last Page"
                      className="w-8 h-8 rounded-xl hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 flex items-center justify-center disabled:opacity-30 disabled:hover:bg-transparent text-slate-600 dark:text-slate-300 cursor-pointer transition-all"
                    >
                      <FiChevronsRight size={16} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBMIT FOR REVIEW CONFIRMATION MODAL */}
      <AnimatePresence>
        {reviewModalData && (
          <div
            key="review-modal-wrapper"
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4 backdrop-blur-md"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-md bg-white dark:bg-[#11131f] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 text-left"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                  <FiCheckSquare size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100">
                    Submit Task for Review?
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed font-medium">
                    Are you sure you want to submit this task for review? Once
                    submitted, the task status will update to{" "}
                    <strong className="text-indigo-600 dark:text-indigo-400 font-bold">
                      "In Review"
                    </strong>{" "}
                    and your manager will be notified.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setReviewModalData(null)}
                  className="px-4.5 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReviewSubmit}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 transition-all shadow-md shadow-indigo-500/20 cursor-pointer active:scale-95 flex items-center gap-2"
                >
                  <FiCheckSquare size={14} />
                  Submit for Review
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* BLOCKER ADD MODAL */}
      <AnimatePresence>
        {blockerModalTask && (
          <div
            key="blocker-modal-wrapper"
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setBlockerModalTask(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md bg-white dark:bg-[#11131f] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 z-10 text-left"
            >
              <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400">
                    <FiAlertCircle size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-800 dark:text-white">
                      Pause Task & Add Blocker
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                      Task: {blockerModalTask.title}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setBlockerModalTask(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  <FiX size={18} />
                </button>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                      Blocker Category
                    </label>
                    <select
                      value={blockerType}
                      onChange={(e) => setBlockerType(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 outline-none focus:border-rose-500 text-slate-800 dark:text-slate-200 cursor-pointer"
                    >
                      <option value="Client Call">Client Call</option>
                      <option value="Client Feedback Waiting">
                        Client Feedback Waiting
                      </option>
                      <option value="Server/Technical Issue">
                        Server/Technical Issue
                      </option>
                      <option value="Asset/Content Pending">
                        Asset/Content Pending
                      </option>
                      <option value="Internal Query">Internal Query</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                      Priority Level
                    </label>
                    <select
                      value={blockerPriority}
                      onChange={(e) => setBlockerPriority(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 outline-none focus:border-rose-500 text-slate-800 dark:text-slate-200 cursor-pointer"
                    >
                      <option value="Normal">Normal</option>
                      <option value="Urgent">Urgent Block</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                    Expected Pause Duration
                  </label>
                  <select
                    value={blockerExpectedTime}
                    onChange={(e) => setBlockerExpectedTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 outline-none focus:border-rose-500 text-slate-800 dark:text-slate-200 cursor-pointer"
                  >
                    <option value="15 mins">15 mins</option>
                    <option value="30 mins">30 mins</option>
                    <option value="1 hour">1 hour</option>
                    <option value="2-4 hours">2-4 hours</option>
                    <option value="Full Day">Full Day</option>
                    <option value="Indefinite">Indefinite</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                    Detailed Reason / Note
                  </label>
                  <textarea
                    value={blockerDescription}
                    onChange={(e) => setBlockerDescription(e.target.value)}
                    placeholder="Provide specific details about why the task is blocked..."
                    rows={3}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 outline-none focus:border-rose-500 text-slate-800 dark:text-slate-200 placeholder-slate-400"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setBlockerModalTask(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitBlocker}
                  className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-black uppercase tracking-wider shadow-md shadow-rose-500/20 transition-all cursor-pointer"
                >
                  Pause Task
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CORRECTION MODAL */}
      <CorrectionModal
        isOpen={!!correctionModalData}
        onClose={() => setCorrectionModalData(null)}
        onSubmit={async (reason) => {
          if (!correctionModalData) return;
          try {
            await updateTaskTrigger({
              id: correctionModalData.taskId,
              taskData: { status: "Correction", correctionReason: reason },
            }).unwrap();
            toast.success("Task sent for Correction");
          } catch (err) {
            toast.error("Failed to send task for correction");
          }
          setCorrectionModalData(null);
        }}
        task={correctionModalData?.taskObj}
      />

      {/* REJECTION MODAL */}
      <RejectionModal
        isOpen={!!rejectionModalData}
        onClose={() => setRejectionModalData(null)}
        onSubmit={async (reason) => {
          if (!rejectionModalData) return;
          try {
            await updateTaskTrigger({
              id: rejectionModalData.taskId,
              taskData: { status: "Rejected", rejectionReason: reason },
            }).unwrap();
            toast.success("Task marked as Rejected");
          } catch (err) {
            toast.error("Failed to reject task");
          }
          setRejectionModalData(null);
        }}
        task={rejectionModalData?.taskObj}
      />

      {/* OFF-CANVAS WORKSPACE PREVIEW DRAWER */}
      <AnimatePresence>
        {selectedTask && (
          <div
            key={`mytask-drawer-${selectedTask._id}`}
            className="fixed inset-0 z-50 flex justify-end"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTaskIdState(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
            />

            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", ease: "easeOut", duration: 0.3 }}
              className="relative w-full max-w-2xl bg-white dark:bg-[#0f111a] h-full shadow-[0_0_50px_rgba(0,0,0,0.1)] dark:shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col z-10 border-l border-slate-100 dark:border-slate-800"
            >
              {/* Drawer Header */}
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-[#0c121e]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-sm shrink-0">
                    <FiCheckSquare size={18} />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-slate-800 dark:text-white tracking-wider">
                      Task Workspace
                    </h2>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold tracking-wider mt-0.5">
                      Preview & Modify Details
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedTaskIdState(null)}
                  className="w-8 h-8 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <FiX size={18} />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Read-Only Task Details */}
                <div className="bg-slate-50 dark:bg-[#111827] rounded-3xl p-5 border border-slate-100 dark:border-slate-800/80 space-y-4 shadow-sm relative overflow-hidden">
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-700 relative z-10">
                    <div className="px-2.5 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-black tracking-wider uppercase">
                      {getTaskDisplayId(selectedTask)}
                    </div>
                    <h3 className="text-sm font-black text-slate-800 dark:text-white">
                      {selectedTask.title}
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-xs relative z-10">
                    <div className="space-y-1">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
                        Priority
                      </span>
                      <span
                        className={`inline-block px-2 py-0.5 rounded border text-[10px] font-bold ${getPriorityStyle(selectedTask.priority || "Medium")}`}
                      >
                        {selectedTask.priority || "Medium"}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
                        Client
                      </span>
                      <div className="font-bold text-slate-700 dark:text-white mt-1">
                        {(() => {
                          const projId =
                            selectedTask.project?._id || selectedTask.project;
                          const projectObj = projId
                            ? projectsMap.get(String(projId))
                            : null;
                          const client =
                            projectObj?.client || selectedTask.project?.client;
                          if (client) {
                            return <ClientBadge client={client} size="sm" />;
                          }
                          return (
                            <span className="text-slate-400 italic font-normal">
                              —
                            </span>
                          );
                        })()}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
                        Project
                      </span>
                      <span className="font-bold text-slate-700 dark:text-white truncate block mt-1.5">
                        {selectedTask.project?.name || "Internal task"}
                      </span>
                    </div>

                    <div className="space-y-1 col-span-2 sm:col-span-1">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
                        Assigned By
                      </span>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="relative shrink-0">
                          {(() => {
                            const assignerUser =
                              selectedTask.assignedBy || selectedTask.createdBy;
                            const avatarUrl =
                              (typeof assignerUser?.profile?.profileImage ===
                              "object"
                                ? assignerUser?.profile?.profileImage?.url
                                : assignerUser?.profile?.profileImage) ||
                              (typeof assignerUser?.profileImage === "object"
                                ? assignerUser?.profileImage?.url
                                : assignerUser?.profileImage) ||
                              assignerUser?.profilePic ||
                              assignerUser?.avatar ||
                              assignerUser?.profile?.profilePic ||
                              assignerUser?.profile?.avatar;

                            if (avatarUrl) {
                              return (
                                <img
                                  src={avatarUrl}
                                  alt={assignerUser?.name || "Assigner"}
                                  className="w-8 h-8 rounded-full object-cover border border-slate-200/85 dark:border-white/10 shadow-sm"
                                />
                              );
                            }

                            // Fallback initials
                            const initials = (assignerUser?.name || "I")
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .substring(0, 2)
                              .toUpperCase();

                            const AVATAR_COLORS = [
                              "from-violet-500 to-indigo-600",
                              "from-cyan-500 to-blue-600",
                              "from-emerald-500 to-teal-600",
                              "from-orange-500 to-amber-600",
                              "from-pink-500 to-rose-600",
                            ];
                            const colorClass =
                              AVATAR_COLORS[
                                ((assignerUser?.name || "I").charCodeAt(0) ||
                                  0) % AVATAR_COLORS.length
                              ];

                            return (
                              <div
                                className={`w-8 h-8 rounded-full bg-gradient-to-br ${colorClass} flex items-center justify-center text-white font-black text-[10px] border border-white/10 shadow-sm`}
                              >
                                {initials}
                              </div>
                            );
                          })()}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-extrabold text-[11px] text-slate-800 dark:text-slate-200">
                            {selectedTask.assignedBy?.name ||
                              selectedTask.createdBy?.name ||
                              "Internal"}
                          </span>
                          <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400">
                            {(selectedTask.assignedBy || selectedTask.createdBy)
                              ?.department || "Management"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
                        Timeline & Revisions
                      </span>
                      <span className="font-bold text-slate-700 dark:text-white text-[10px]">
                        {selectedTask.startDate
                          ? formatDate(selectedTask.startDate)
                          : "N/A"}{" "}
                        →{" "}
                        {selectedTask.dueDate
                          ? formatDate(selectedTask.dueDate)
                          : "N/A"}
                        <span className="text-slate-300 dark:text-slate-600 mx-1">
                          |
                        </span>
                        <span className="text-rose-500 font-black">
                          {selectedTask.revisions || 0} Rev
                        </span>
                      </span>
                    </div>

                    {selectedTask.contentType === "MOM" && (
                      <div className="space-y-1 col-span-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
                          Feedback MOM
                        </span>
                        <MomFeedbackInput
                          task={selectedTask}
                          onSave={(id, fields) =>
                            handleTaskFieldChange(id, fields)
                          }
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Status & Time Tracking History */}
                <StatusHistoryTable task={selectedTask} />

                {/* Correction History Display */}
                {selectedTask.correctionHistory &&
                  selectedTask.correctionHistory.length > 0 && (
                    <div className="bg-amber-50/60 dark:bg-amber-500/[0.03] border border-amber-200/80 dark:border-amber-500/20 rounded-2xl p-4 space-y-3">
                      <h3 className="text-xs font-bold text-amber-800 dark:text-amber-400 flex items-center gap-2">
                        <FiEdit3 size={14} /> Correction History (
                        {selectedTask.correctionHistory.length})
                      </h3>
                      <div className="flex flex-col gap-2.5 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
                        {selectedTask.correctionHistory
                          .slice()
                          .reverse()
                          .map((item, idx) => {
                            const userObj = users?.find(
                              (u) =>
                                u._id ===
                                (item.requestedBy?._id || item.requestedBy),
                            );
                            const userName =
                              item.requestedBy?.name ||
                              userObj?.name ||
                              "Unknown User";
                            return (
                              <div
                                key={idx}
                                className="bg-white dark:bg-[#111111] border border-amber-200/60 dark:border-amber-500/20 rounded-xl p-3 shadow-xs"
                              >
                                <p className="text-xs text-slate-700 dark:text-slate-200 whitespace-pre-wrap font-medium">
                                  "{item.reason}"
                                </p>
                                <div className="flex items-center justify-between mt-2 text-[10px] text-slate-400 dark:text-slate-500 font-bold">
                                  <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                                    <FiUser size={10} />
                                    {userName}
                                  </span>
                                  <span>
                                    {new Date(item.requestedAt).toLocaleString(
                                      undefined,
                                      {
                                        month: "short",
                                        day: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      },
                                    )}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}

                {/* Rejection History Display */}
                {selectedTask.rejectionHistory &&
                  selectedTask.rejectionHistory.length > 0 && (
                    <div className="bg-rose-50/60 dark:bg-rose-500/[0.03] border border-rose-200/80 dark:border-rose-500/20 rounded-2xl p-4 space-y-3">
                      <h3 className="text-xs font-bold text-rose-800 dark:text-rose-400 flex items-center gap-2">
                        <FiAlertTriangle size={14} /> Rejection History (
                        {selectedTask.rejectionHistory.length})
                      </h3>
                      <div className="flex flex-col gap-2.5 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
                        {selectedTask.rejectionHistory
                          .slice()
                          .reverse()
                          .map((item, idx) => {
                            const userObj = users?.find(
                              (u) =>
                                u._id ===
                                (item.rejectedBy?._id || item.rejectedBy),
                            );
                            const userName =
                              item.rejectedBy?.name ||
                              userObj?.name ||
                              "Unknown User";
                            return (
                              <div
                                key={idx}
                                className="bg-white dark:bg-[#111111] border border-rose-200/60 dark:border-rose-500/20 rounded-xl p-3 shadow-xs"
                              >
                                <p className="text-xs text-slate-700 dark:text-slate-200 whitespace-pre-wrap font-medium">
                                  "{item.reason}"
                                </p>
                                <div className="flex items-center justify-between mt-2 text-[10px] text-slate-400 dark:text-slate-500 font-bold">
                                  <span className="flex items-center gap-1.5 text-rose-700 dark:text-rose-400">
                                    <FiUser size={10} />
                                    {userName}
                                  </span>
                                  <span>
                                    {new Date(item.rejectedAt).toLocaleString(
                                      undefined,
                                      {
                                        month: "short",
                                        day: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      },
                                    )}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}

                {/* Approval Info Section */}
                {(selectedTask.reviewStartedAt ||
                  selectedTask.approvalWaitingMs) && (
                  <div className="bg-slate-50 dark:bg-[#111827] rounded-3xl p-5 border border-slate-100 dark:border-slate-800/80 space-y-3 shadow-sm">
                    <div className="flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-700">
                      <div className="w-7 h-7 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 flex items-center justify-center shrink-0">
                        <span className="text-blue-500 dark:text-blue-400 text-xs">
                          ⏱
                        </span>
                      </div>
                      <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                        Approval Info
                      </span>
                    </div>
                    <ApprovalTimeDisplay
                      reviewStartedAt={selectedTask.reviewStartedAt}
                      completedAt={selectedTask.completedAt}
                      approvalWaitingMs={selectedTask.approvalWaitingMs}
                      status={selectedTask.status}
                      lastReviewStartedAt={selectedTask.lastReviewStartedAt}
                      reviewCycles={selectedTask.reviewCycles}
                    />
                  </div>
                )}

                {/* Blocker & Pause Control */}
                <div className="p-4 bg-rose-500/5 dark:bg-[#111827] border border-rose-200/50 dark:border-rose-900/30 rounded-3xl space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-rose-600 dark:text-rose-400 tracking-wider flex items-center gap-1.5 uppercase">
                      <FiAlertCircle size={14} /> Blocker & Pause Control
                    </label>
                    {selectedTask.isBlocked && (
                      <span className="px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30 text-[9px] font-black uppercase tracking-wider animate-pulse">
                        Paused - Blocked
                      </span>
                    )}
                  </div>

                  {selectedTask.isBlocked && (
                    <div className="space-y-3 text-xs">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
                            Blocker Type
                          </span>
                          <div className="px-2.5 py-1.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 text-rose-700 dark:text-rose-400 font-extrabold rounded-xl">
                            {selectedTask.blockerType || "Client Call"}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
                            Priority
                          </span>
                          <div
                            className={`px-2.5 py-1.5 border font-extrabold rounded-xl ${selectedTask.blockerPriority === "Urgent" ? "bg-red-500/10 dark:bg-red-950/30 border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400" : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"}`}
                          >
                            {selectedTask.blockerPriority || "Normal"}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
                          Blocker Description
                        </span>
                        <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-650 dark:text-slate-300 italic font-medium leading-relaxed">
                          "
                          {selectedTask.blockerDescription ||
                            selectedTask.blockerReason ||
                            "No description provided"}
                          "
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-[10px]">
                        <div>
                          <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-0.5">
                            Expected Time
                          </span>
                          <span className="font-bold text-slate-750 dark:text-slate-300">
                            ⏳ {selectedTask.blockerExpectedTime || "15 mins"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-0.5">
                            Paused Since
                          </span>
                          <span className="font-bold text-slate-750 dark:text-slate-300">
                            📅 {formatDateTime(selectedTask.blockerPausedAt)}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleResumeTask(selectedTask)}
                        className="w-full mt-2 flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/10 hover:shadow-lg transition-all cursor-pointer"
                      >
                        ✅ Resume Work
                      </button>
                    </div>
                  )}

                  {/* Historical Pauses */}
                  {selectedTask.blockerHistory &&
                    selectedTask.blockerHistory.length > 0 && (
                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
                        <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
                          Pause History ({selectedTask.blockerHistory.length})
                        </span>
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-1 scrollbar-thin">
                          {selectedTask.blockerHistory.map((hist, idx) => (
                            <div
                              key={idx}
                              className="p-2.5 bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800/50 rounded-xl space-y-1"
                            >
                              <div className="flex justify-between items-center text-[10px] font-black">
                                <span className="text-rose-600 dark:text-rose-400 uppercase">
                                  {hist.blockerType}
                                </span>
                                <span className="text-slate-500 dark:text-slate-400">
                                  {hist.totalPauseMinutes} mins
                                </span>
                              </div>
                              {hist.blockerDescription && (
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 italic">
                                  "{hist.blockerDescription}"
                                </p>
                              )}
                              <div className="text-[8px] text-slate-400 dark:text-slate-500 flex justify-between">
                                <span>In: {formatDateTime(hist.pausedAt)}</span>
                                <span>
                                  Out: {formatDateTime(hist.resumedAt)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default MyTasksTab;
