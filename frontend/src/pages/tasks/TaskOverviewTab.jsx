import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useSearchParams } from "react-router-dom";
import { BiFile } from "react-icons/bi";
import {
  FiCalendar,
  FiFilter,
  FiChevronDown,
  FiChevronLeft,
  FiColumns,
  FiCheckSquare,
  FiX,
  FiTag,
  FiCheck,
  FiBriefcase,
  FiSearch,
  FiTrash2,
  FiAlertCircle,
  FiEye,
  FiClock,
  FiDownload,
  FiUser,
  FiLock,
  FiPlus,
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { useSelector } from "react-redux";
import {
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
} from "../../features/api/apiSlice";
import ClientBadge, {
  getClientBranding,
} from "../../components/common/ClientBadge";
import { calculateBusinessMs } from "../../utils/businessHours";
import toast from "react-hot-toast";
import CorrectionModal from "../../components/CorrectionModal";
import RejectionModal from "../../components/RejectionModal";
import { HoldTaskModal } from "../../components/HoldTaskModal";
import { BlockTaskModal } from "../../components/BlockTaskModal";
import SearchableDropdown from "../../components/common/SearchableDropdown";
import {
  calculateTaskProductivityForDate,
  getTaskAssignmentDate,
} from "../Dashboard/cards/GraphicDesignerDashboard";
import {
  getTodayProductivityMs,
  getTotalTrackedMs,
  formatHMS,
  formatShortDuration,
} from "../../utils/taskTimerUtils";

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
    const assignmentDate = getTaskAssignmentDate(task);
    if (assignmentDate && getLocalDateStr(assignmentDate) === todayStr) {
      return true;
    }
    if (Array.isArray(task.subtasks) && task.subtasks.length > 0) {
      return task.subtasks.some((sub) => {
        const subAssignDate = getTaskAssignmentDate(sub);
        return subAssignDate && getLocalDateStr(subAssignDate) === todayStr;
      });
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

    const currDay = new Date(startOfWeek);
    while (currDay <= endOfWeek && currDay <= now) {
      if (calculateTaskProductivityForDate(task, currDay, officeHours) > 0) {
        return true;
      }
      currDay.setDate(currDay.getDate() + 1);
    }

    if (task.status === "In Progress" && !task.actualEndTime) return true;

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

const getStatusWithEmoji = (status) => {
  const s = (status || "").toLowerCase();
  if (s === "pending" || s === "to do") return "Not Started";
  if (s.includes("progress")) return "In Progress";
  if (s.includes("review")) return "In Review";
  if (s.includes("correction")) return "Correction";
  if (s === "completed" || s.includes("approve") || s === "done")
    return "Completed";
  if (s.includes("hold")) return "On Hold";
  if (s.includes("reject")) return "Rejected";
  return status || "Not Started";
};

const SimpleTimeTracker = ({
  task,
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
  mode = "active",
}) => {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (status === "In Progress" && !autoPaused && !endTime) {
      const interval = setInterval(() => setNow(Date.now()), 1000);
      return () => clearInterval(interval);
    }
  }, [status, autoPaused, endTime]);

  const taskObj = task || {
    status,
    actualStartTime: startTime,
    actualEndTime: endTime,
    pausedAt,
    autoPaused,
    totalPausedMs: savedPausedMs,
    isBlocked,
    totalTrackedTime,
  };

  if (mode === "blocker") {
    return null;
  }

  const totalMs = getTotalTrackedMs(taskObj, now);

  if (status === "Not Started" || (!startTime && totalMs === 0)) {
    return (
      <span className="text-slate-455 dark:text-slate-500 font-semibold text-[11px]">
        Not started
      </span>
    );
  }

  const colorClasses =
    status === "In Progress"
      ? "bg-blue-50/80 text-blue-700 border-blue-200 dark:bg-blue-955/30 dark:text-blue-400 dark:border-blue-900/30"
      : status === "In Review"
        ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-550/10 dark:text-amber-400 dark:border-amber-550/30"
        : status === "On Hold"
          ? "bg-violet-50 text-violet-600 border-violet-200 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/30"
          : status === "Completed"
            ? "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
            : "bg-slate-50 text-slate-400 border-slate-200 dark:bg-slate-500/5 dark:text-slate-400 dark:border-slate-500/20";

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-xl text-[11px] font-black border shadow-2xs ${colorClasses}`}
    >
      {formatShortDuration(totalMs)}
    </span>
  );
};

const TimeTrackerBox = ({
  task,
  startTime,
  endTime,
  status,
  pausedAt,
  autoPaused,
  savedPausedMs = 0,
  isBlocked,
  totalTrackedTime = 0,
}) => {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (status === "In Progress" && !autoPaused && !endTime) {
      const interval = setInterval(() => setNow(Date.now()), 1000);
      return () => clearInterval(interval);
    }
  }, [status, autoPaused, endTime]);

  const taskObj = task || {
    status,
    actualStartTime: startTime,
    actualEndTime: endTime,
    pausedAt,
    autoPaused,
    totalPausedMs: savedPausedMs,
    isBlocked,
    totalTrackedTime,
  };

  const totalMs = getTotalTrackedMs(taskObj, now);

  if (status === "Not Started" || (!startTime && totalMs === 0)) {
    return (
      <span className="text-slate-455 dark:text-slate-500 font-semibold text-[11px]">
        Not started
      </span>
    );
  }

  return (
    <div className="flex flex-col w-[125px] text-[11px] font-extrabold tracking-wide mx-auto">
      <div className="flex justify-between items-center bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-600/50 px-2 py-1 rounded-lg text-slate-800 dark:text-slate-100 shadow-2xs">
        <span>Total:</span>
        <span>{formatShortDuration(totalMs)}</span>
      </div>
    </div>
  );
};

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
    const [showPopup, setShowPopup] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0 });
    const buttonRef = useRef(null);
    const popupRef = useRef(null);

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

    // Click outside close
    useEffect(() => {
      if (!showPopup) return;
      const handleClickOutside = (e) => {
        if (
          popupRef.current &&
          !popupRef.current.contains(e.target) &&
          buttonRef.current &&
          !buttonRef.current.contains(e.target)
        ) {
          setShowPopup(false);
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }, [showPopup]);

    const effectiveReviewStart =
      reviewStartedAt ||
      lastReviewStartedAt ||
      (reviewCycles && reviewCycles.length > 0
        ? reviewCycles[reviewCycles.length - 1]?.startedAt
        : null);

    if (!effectiveReviewStart && !approvalWaitingMs) {
      return (
        <span className="text-slate-350 dark:text-slate-655 text-[11px]">
          —
        </span>
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

    const handleToggle = (e) => {
      e.stopPropagation();
      if (!showPopup && buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        // Position above the button, aligned to its right edge
        setCoords({
          top: rect.top + window.scrollY - 175,
          left: rect.right + window.scrollX - 224,
        });
      }
      setShowPopup(!showPopup);
    };

    return (
      <div className="relative inline-flex items-center gap-1 justify-center">
        {/* Duration badge */}
        {totalWaitMs > 0 && (
          <div
            className={`px-2 py-0.5 rounded-full font-black text-[11px] tracking-wide border shadow-xs ${
              isInReview
                ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/25"
                : "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20"
            }`}
          >
            {isInReview && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0 mr-1 inline-block" />
            )}
            {isInReview ? "Waiting " : "Took "}
            <span className="font-black">
              {formatBusinessDuration(totalWaitMs)}
            </span>
          </div>
        )}

        {/* View Details Eye Icon */}
        {(revInfo || doneInfo) && (
          <button
            ref={buttonRef}
            type="button"
            onClick={handleToggle}
            className="p-0.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-blue-500 dark:text-slate-500 dark:hover:text-[#3b82f6] transition-colors cursor-pointer"
            title="View approval details"
          >
            <FiEye size={13} />
          </button>
        )}
        {/* Details Popup rendered via Portal */}
        {showPopup &&
          createPortal(
            <AnimatePresence>
              <motion.div
                ref={popupRef}
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.15 }}
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: "absolute",
                  top: coords.top,
                  left: coords.left,
                }}
                className="z-[9999] w-56 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl flex flex-col gap-2 text-left"
              >
                <div className="flex justify-between items-center pb-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Timeline Details
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowPopup(false)}
                    className="text-slate-400 hover:text-slate-600 dark:text-[#555] dark:hover:text-slate-350 cursor-pointer"
                  >
                    <FiX size={10} />
                  </button>
                </div>

                {revInfo && (
                  <div className="flex flex-col gap-0.5 bg-blue-50/40 dark:bg-blue-950/20 p-2 rounded-lg border border-blue-100/50 dark:border-blue-900/30">
                    <span className="text-[8px] font-black text-blue-500 dark:text-blue-450 uppercase tracking-widest">
                      Review Start
                    </span>
                    <span className="font-bold text-slate-700 dark:text-slate-200 text-[10px]">
                      {revInfo.date} · {revInfo.time}
                    </span>
                    <span className="text-[9px] text-blue-455 dark:text-blue-500 font-medium">
                      {revInfo.relative}
                    </span>
                  </div>
                )}

                {doneInfo && (
                  <div className="flex flex-col gap-0.5 bg-emerald-50/40 dark:bg-emerald-950/20 p-2 rounded-lg border border-emerald-100/50 dark:border-emerald-900/30">
                    <span className="text-[8px] font-black text-emerald-500 dark:text-emerald-450 uppercase tracking-widest">
                      Completed
                    </span>
                    <span className="font-bold text-slate-700 dark:text-slate-200 text-[10px]">
                      {doneInfo.date} · {doneInfo.time}
                    </span>
                    <span className="text-[9px] text-emerald-400 dark:text-emerald-500 font-medium">
                      {doneInfo.relative}
                    </span>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>,
            document.body,
          )}
      </div>
    );
  },
);

const renderUserAvatarSmall = (u, sizeClass = "w-6 h-6 text-[8px]") => {
  if (!u) return null;
  const avatarUrl =
    (typeof u.profile?.profileImage === "object"
      ? u.profile?.profileImage?.url
      : u.profile?.profileImage) ||
    (typeof u.profileImage === "object"
      ? u.profileImage?.url
      : u.profileImage) ||
    u.profilePic ||
    u.avatar ||
    u.profile?.profilePic ||
    u.profile?.avatar;

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={u.name || "User"}
        className={`${sizeClass} rounded-full object-cover border border-slate-200/80 dark:border-white/10 shadow-2xs shrink-0`}
      />
    );
  }

  const initials = (u.name || "U")
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
    AVATAR_COLORS[((u.name || "U").charCodeAt(0) || 0) % AVATAR_COLORS.length];

  return (
    <div
      className={`${sizeClass} rounded-full bg-gradient-to-br ${colorClass} flex items-center justify-center text-white font-black border border-white/10 shadow-2xs shrink-0`}
    >
      {initials}
    </div>
  );
};

const getUserColorClass = (userName) => {
  if (!userName || userName === "Unknown" || userName === "Unassigned")
    return "text-slate-500 dark:text-slate-400";
  const colors = [
    "text-indigo-650 dark:text-indigo-400 hover:text-indigo-850 dark:hover:text-indigo-300",
    "text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300",
    "text-sky-600 dark:text-sky-400 hover:text-sky-850 dark:hover:text-sky-300",
    "text-violet-600 dark:text-violet-400 hover:text-violet-850 dark:hover:text-violet-300",
    "text-rose-600 dark:text-rose-400 hover:text-rose-850 dark:hover:text-rose-300",
    "text-amber-600 dark:text-amber-400 hover:text-amber-850 dark:hover:text-amber-300",
    "text-fuchsia-600 dark:text-fuchsia-400 hover:text-fuchsia-850 dark:hover:text-fuchsia-300",
    "text-cyan-600 dark:text-cyan-400 hover:text-cyan-850 dark:hover:text-cyan-300",
  ];
  let hash = 0;
  for (let i = 0; i < userName.length; i++) {
    hash = userName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

const getDeptBadgeStyle = (dept) => {
  const d = dept?.toLowerCase() || "";
  if (d.includes("graphic") || d.includes("design")) {
    return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/20 dark:text-purple-300 dark:border-purple-900/30";
  }
  if (d.includes("video") || d.includes("editor")) {
    return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-300 dark:border-blue-900/30";
  }
  if (
    d.includes("social") ||
    d.includes("media") ||
    d.includes("manager") ||
    d.includes("executive")
  ) {
    return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-300 dark:border-emerald-900/30";
  }
  if (d.includes("content") || d.includes("writer")) {
    return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-300 dark:border-amber-900/30";
  }
  if (d.includes("admin") || d.includes("operation")) {
    return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-300 dark:border-rose-900/30";
  }
  return "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800";
};

const shortenDept = (dept) => {
  if (!dept) return "";
  const d = dept.toLowerCase().trim();
  if (d.includes("graphic") && d.includes("design")) return "GD";
  if (d.includes("graphic")) return "GD";
  if (d.includes("video") && d.includes("editor")) return "VE";
  if (d.includes("video")) return "VE";
  if (d.includes("social") && d.includes("media") && d.includes("manager"))
    return "SM";
  if (d.includes("social") && d.includes("media") && d.includes("executive"))
    return "SME";
  if (d.includes("social") && d.includes("media")) return "SM";
  if (d.includes("content") && d.includes("writer")) return "CW";
  if (d.includes("content")) return "Content";
  if (d.includes("operation") && d.includes("manager")) return "OM";
  if (d.includes("operation")) return "Ops";
  if (d.includes("admin")) return "Admin";
  if (dept.length <= 4) return dept.toUpperCase();
  return dept
    .split(" ")
    .map((w) => w[0])
    .join("")
    .substring(0, 3)
    .toUpperCase();
};

const AssigneeCell = ({ task, users, handleTaskFieldChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const isMOM = task.contentType === "MOM";

  const assignedUser =
    (typeof task.assignedTo === "object" && task.assignedTo) ||
    users?.find((u) => (u._id || u.id) === task.assignedTo) ||
    (isMOM
      ? (typeof task.createdBy === "object" && task.createdBy) ||
        users?.find((u) => (u._id || u.id) === task.createdBy)
      : null);

  if (isMOM) {
    const displayUser =
      assignedUser ||
      (typeof task.createdBy === "object" ? task.createdBy : null);
    return (
      <div
        className="relative inline-block"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-white dark:bg-[#181a29] border border-slate-200/90 dark:border-white/10 rounded-full px-2.5 py-1 inline-flex items-center gap-2 shadow-2xs select-none">
          {renderUserAvatarSmall(displayUser, "w-6 h-6 text-[8px]")}
          <div className="flex flex-col text-left leading-none min-w-0 pr-1">
            <span className="font-extrabold text-[11px] text-slate-800 dark:text-slate-100 truncate">
              {displayUser?.name || "Assigned"}
            </span>
            <span className="text-[9px] font-bold text-sky-600 dark:text-sky-400 truncate mt-0.5">
              {displayUser?.department || "Team Member"}
            </span>
          </div>
        </div>
      </div>
    );
  }

  const filteredUsers = React.useMemo(() => {
    if (!users) return [];
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter(
      (u) =>
        u.name?.toLowerCase().includes(q) ||
        u.department?.toLowerCase().includes(q),
    );
  }, [users, search]);

  return (
    <div
      className="relative inline-block"
      ref={dropdownRef}
      onClick={(e) => e.stopPropagation()}
    >
      {assignedUser && assignedUser.name ? (
        <div
          onClick={() => setIsOpen((prev) => !prev)}
          className="bg-white dark:bg-[#181a29] border border-slate-200/90 dark:border-white/10 rounded-full px-2.5 py-1 inline-flex items-center gap-2 shadow-2xs cursor-pointer hover:border-blue-400 dark:hover:border-blue-500/60 transition-all select-none group"
        >
          {renderUserAvatarSmall(assignedUser, "w-6 h-6 text-[8px]")}
          <div className="flex flex-col text-left leading-none min-w-0 pr-1">
            <span className="font-extrabold text-[11px] text-slate-800 dark:text-slate-100 truncate">
              {assignedUser.name}
            </span>
            <span className="text-[9px] font-bold text-sky-600 dark:text-sky-400 truncate mt-0.5">
              {assignedUser.department || "Team Member"}
            </span>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="bg-slate-50 dark:bg-white/5 border border-dashed border-slate-300 dark:border-white/20 hover:border-blue-400 dark:hover:border-blue-400/50 rounded-full px-3 py-1 inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all shadow-2xs cursor-pointer select-none"
        >
          <FiUser size={12} />
          <span>Unassigned</span>
          <FiChevronDown size={10} className="ml-0.5 opacity-60" />
        </button>
      )}

      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-60 bg-white dark:bg-[#151725] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl z-[80] overflow-hidden p-1.5 flex flex-col gap-1 backdrop-blur-md">
          <div className="px-1 py-1 border-b border-slate-100 dark:border-white/5">
            <input
              type="text"
              placeholder="Search assignee..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="w-full px-2 py-1 text-[11px] font-semibold rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 outline-none focus:border-blue-500 text-slate-800 dark:text-slate-200"
              autoFocus
            />
          </div>
          <div className="max-h-52 overflow-y-auto custom-scrollbar flex flex-col gap-0.5">
            <button
              type="button"
              onClick={() => {
                handleTaskFieldChange(task._id, { assignedTo: null });
                setIsOpen(false);
              }}
              className="w-full text-left px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-all flex items-center justify-between"
            >
              <span>Unassigned</span>
              {!assignedUser && (
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              )}
            </button>
            {filteredUsers.map((u) => {
              const uid = u._id || u.id;
              const isSelected =
                (assignedUser?._id || assignedUser?.id) === uid;
              return (
                <button
                  key={uid}
                  type="button"
                  onClick={() => {
                    handleTaskFieldChange(task._id, { assignedTo: uid });
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-2 py-1.5 rounded-xl transition-all flex items-center gap-2 ${
                    isSelected
                      ? "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400"
                      : "hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-slate-200"
                  }`}
                >
                  {renderUserAvatarSmall(u, "w-6 h-6 text-[8px]")}
                  <div className="flex flex-col min-w-0 text-left leading-none">
                    <span className="text-[11px] font-extrabold truncate leading-tight">
                      {u.name}
                    </span>
                    <span className="text-[9px] font-bold text-sky-600 dark:text-sky-400 truncate mt-0.5 leading-tight">
                      {u.department || "Team Member"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const StatusBadgeSelect = ({ status, isBlocked, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const getStatusBadgeConfig = (st, blocked) => {
    if (blocked) {
      return {
        label: "BLOCKED",
        bg: "bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300",
        chevron: "text-orange-800 dark:text-orange-300",
      };
    }
    const s = (st || "Not Started").toUpperCase();
    if (s === "NOT STARTED" || s === "PENDING" || s === "TO DO" || s === "TODO") {
      return {
        label: "NOT STARTED",
        class: "badge-status-not-started",
        bg: "bg-slate-200/90 text-slate-800 dark:bg-slate-700/80 dark:text-slate-100",
        chevron: "text-slate-800 dark:text-slate-200",
      };
    }
    if (s.includes("PROGRESS")) {
      return {
        label: "IN PROGRESS",
        bg: "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300",
        chevron: "text-blue-700 dark:text-blue-300",
      };
    }
    if (s.includes("REVIEW")) {
      return {
        label: "IN REVIEW",
        bg: "bg-[#fef08a] text-[#854d0e] dark:bg-yellow-950/60 dark:text-yellow-300",
        chevron: "text-[#854d0e] dark:text-yellow-300",
      };
    }
    if (s.includes("CORRECTION")) {
      return {
        label: "CORRECTION",
        bg: "bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300",
        chevron: "text-orange-700 dark:text-orange-300",
      };
    }
    if (s.includes("HOLD")) {
      return {
        label: "ON HOLD",
        bg: "bg-[#f3e8ff] text-[#7e22ce] dark:bg-purple-950/60 dark:text-purple-300",
        chevron: "text-[#7e22ce] dark:text-purple-300",
      };
    }
    if (
      s.includes("COMPLETED") ||
      s.includes("DONE") ||
      s.includes("APPROVE")
    ) {
      return {
        label: "COMPLETED",
        bg: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
        chevron: "text-emerald-700 dark:text-emerald-300",
      };
    }
    if (s.includes("REJECT")) {
      return {
        label: "REJECTED",
        bg: "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300",
        chevron: "text-rose-700 dark:text-rose-300",
      };
    }
    return {
      label: s,
      bg: "bg-slate-200/90 text-slate-800 dark:bg-slate-700/80 dark:text-slate-100",
      chevron: "text-slate-800 dark:text-slate-200",
    };
  };

  const cfg = getStatusBadgeConfig(status, isBlocked);

  const options = [
    { value: "Not Started", label: "NOT STARTED" },
    { value: "In Progress", label: "IN PROGRESS" },
    { value: "In Review", label: "IN REVIEW" },
    { value: "Correction", label: "CORRECTION" },
    { value: "On Hold", label: "ON HOLD" },
    { value: "Completed", label: "COMPLETED" },
    { value: "Rejected", label: "REJECTED" },
  ];

  return (
    <div
      className="relative inline-block"
      ref={dropdownRef}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`px-3 py-1.5 rounded-[10px] text-[11px] font-black tracking-wider flex items-center justify-between gap-2 shadow-2xs cursor-pointer select-none transition-all hover:opacity-90 min-w-[115px] ${cfg.bg}`}
      >
        <span className="truncate">{cfg.label}</span>
        <FiChevronDown
          size={14}
          className={`shrink-0 stroke-[2.5] ${cfg.chevron}`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-[#151725] border border-slate-200 dark:border-white/10 rounded-xl shadow-xl z-[80] overflow-hidden p-1 flex flex-col gap-0.5 backdrop-blur-md">
          {options.map((opt) => {
            const optCfg = getStatusBadgeConfig(opt.value, false);
            const isSelected =
              (status || "").toLowerCase() === opt.value.toLowerCase();
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold tracking-wider transition-all flex items-center justify-between ${
                  isSelected
                    ? `${optCfg.bg} shadow-2xs`
                    : "hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-200"
                }`}
              >
                <span>{opt.label}</span>
                {isSelected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

const TaskOverviewTab = ({
  tasks,
  projects,
  currentUserId,
  user,
  dateFilter,
  setDateFilter,
  showDateDropdown,
  setShowDateDropdown,
  dateDropdownRef,
  onFilteredCountChange,
}) => {
  const [createTaskTrigger, { isLoading: isCreatingTask }] =
    useCreateTaskMutation();
  const [updateTaskTrigger] = useUpdateTaskMutation();
  const [deleteTask] = useDeleteTaskMutation();
  const [taskToDelete, setTaskToDelete] = useState(null);

  // Inline task creation state
  const [isAddingNewTask, setIsAddingNewTask] = useState(() => {
    return sessionStorage.getItem("draft_isAddingNewTask") === "true";
  });

  const [portalReady, setPortalReady] = useState(false);
  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    sessionStorage.setItem("draft_isAddingNewTask", isAddingNewTask);
  }, [isAddingNewTask]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskProject, setNewTaskProject] = useState("");
  const [newTaskContentCopy, setNewTaskContentCopy] = useState("");
  const [newTaskContentType, setNewTaskContentType] = useState("");
  const [newTaskAssignee, setNewTaskAssignee] = useState("");
  const [newTaskStartDate, setNewTaskStartDate] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState("Medium");
  const newTaskTitleRef = useRef(null);

  const handleDeleteTask = async () => {
    if (taskToDelete) {
      try {
        await deleteTask(taskToDelete).unwrap();
        setTaskToDelete(null);
      } catch (err) {
        console.error("Failed to delete task:", err);
      }
    }
  };
  const { clients } = useSelector((state) => state.clients);
  const { users } = useSelector((state) => state.users || {});
  const currentUser = useSelector((state) => state.auth?.user) || user;

  const selectedNewProjectObj = React.useMemo(() => {
    if (!newTaskProject) return null;
    return (projects || []).find((p) => p._id === newTaskProject);
  }, [projects, newTaskProject]);

  const selectedNewProjectClient = React.useMemo(() => {
    if (!selectedNewProjectObj) return null;
    const clientRaw = selectedNewProjectObj.client;
    const clientId = clientRaw?._id || clientRaw;
    return (
      (clients || []).find((c) => c._id === clientId) ||
      (typeof clientRaw === "object" ? clientRaw : null)
    );
  }, [clients, selectedNewProjectObj]);

  const handleCancelNewTask = () => {
    setIsAddingNewTask(false);
    setNewTaskTitle("");
    if (newTaskTitleRef.current) {
      newTaskTitleRef.current.value = "";
    }
    setNewTaskProject("");
    setNewTaskContentCopy("");
    setNewTaskContentType("");
    setNewTaskAssignee("");
    setNewTaskStartDate("");
    setNewTaskDueDate("");
    setNewTaskPriority("Medium");
  };

  const handleSaveNewTask = async () => {
    const titleVal =
      newTaskTitleRef.current?.value?.trim() || newTaskTitle.trim();
    if (!titleVal) {
      toast.error("Please enter a task title");
      return;
    }
    if (!newTaskProject) {
      toast.error("Please select a project");
      return;
    }
    if (!newTaskContentType) {
      toast.error("Please select a content type");
      return;
    }
    if (!newTaskStartDate) {
      toast.error("Please select a start date");
      return;
    }
    if (!newTaskDueDate) {
      toast.error("Please select an end date");
      return;
    }
    const effectiveAssignee =
      newTaskContentType === "MOM"
        ? newTaskAssignee || currentUser?._id || currentUser?.id
        : newTaskAssignee;

    if (!effectiveAssignee) {
      toast.error("Please select an assignee");
      return;
    }

    const effectiveStart = newTaskStartDate;
    const effectiveEnd = newTaskDueDate;
    let finalPriority = newTaskPriority;
    if (
      effectiveStart &&
      effectiveEnd &&
      isSameDate(effectiveStart, effectiveEnd)
    ) {
      finalPriority = "Top High";
    }

    try {
      await createTaskTrigger({
        title: titleVal,
        project: newTaskProject,
        contentCopy: newTaskContentCopy.trim(),
        contentType: newTaskContentType,
        assignedTo: effectiveAssignee || null,
        startDate: effectiveStart,
        dueDate: effectiveEnd,
        priority: finalPriority,
        status: "Not Started",
      }).unwrap();

      toast.success("Task created successfully!");
      handleCancelNewTask();
    } catch (err) {
      console.error("Failed to create task:", err);
      toast.error(err?.data?.message || "Failed to create task");
    }
  };
  const userRole = (
    currentUser?.role?.name ||
    currentUser?.role ||
    ""
  ).toLowerCase();
  const isAdminOrManager =
    userRole === "admin" ||
    userRole === "manager" ||
    userRole.includes("admin") ||
    userRole.includes("manager");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 30;

  const [overviewClientFilter, setOverviewClientFilter] = useState("All");
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const clientDropdownRef = useRef(null);

  const [overviewCreatedByFilter, setOverviewCreatedByFilter] = useState("All");
  const [showCreatedByDropdown, setShowCreatedByDropdown] = useState(false);
  const [createdBySearchQuery, setCreatedBySearchQuery] = useState("");
  const createdByDropdownRef = useRef(null);

  const [overviewAssigneeFilter, setOverviewAssigneeFilter] = useState("All");
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [assigneeSearchQuery, setAssigneeSearchQuery] = useState("");
  const assigneeDropdownRef = useRef(null);

  const uniqueCreators = React.useMemo(() => {
    const map = new Map();
    (tasks || []).forEach((t) => {
      const u = t.createdBy;
      if (u && (u._id || u.id)) {
        const id = u._id || u.id;
        if (!map.has(id)) {
          map.set(id, u);
        }
      }
    });
    return Array.from(map.values()).sort((a, b) =>
      (a.name || "").localeCompare(b.name || ""),
    );
  }, [tasks]);

  const uniqueAssignees = React.useMemo(() => {
    const map = new Map();
    (tasks || []).forEach((t) => {
      const u = t.assignedTo;
      if (u && (u._id || u.id)) {
        const id = u._id || u.id;
        if (!map.has(id)) {
          map.set(id, u);
        }
      }
    });
    return Array.from(map.values()).sort((a, b) =>
      (a.name || "").localeCompare(b.name || ""),
    );
  }, [tasks]);

  const uniqueDepartments = React.useMemo(() => {
    const set = new Set();
    (users || []).forEach((u) => {
      if (u.department && u.department.trim()) {
        set.add(u.department.trim());
      }
    });
    (tasks || []).forEach((t) => {
      if (t.assignedTo?.department) set.add(t.assignedTo.department.trim());
      if (t.createdBy?.department) set.add(t.createdBy.department.trim());
    });
    return Array.from(set).sort();
  }, [users, tasks]);

  const [overviewContentTypeFilter, setOverviewContentTypeFilter] =
    useState("All");
  const [showContentTypeDropdown, setShowContentTypeDropdown] = useState(false);
  const [contentTypeSearchQuery, setContentTypeSearchQuery] = useState("");
  const contentTypeDropdownRef = useRef(null);

  const uniqueContentTypes = React.useMemo(() => {
    const set = new Set();
    (tasks || []).forEach((t) => {
      if (t.contentType && t.contentType.trim()) {
        set.add(t.contentType.trim());
      }
    });
    return Array.from(set).sort();
  }, [tasks]);

  // Internal selected task state for workspace preview drawer
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const selectedTask = tasks.find((t) => t._id === selectedTaskId);

  const getTaskDisplayId = (task) => {
    if (!task || !task._id) return "";
    const projId = task.project?._id || task.project;
    const projectObj = projId ? projectsMap.get(String(projId)) : null;
    const projChar = (projectObj?.name || task.project?.name || "P")
      .charAt(0)
      .toUpperCase();
    const client = task.project?.client?.companyName
      ? task.project.client
      : projectObj?.client || task.project?.client;
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

  const [reviewModalData, setReviewModalData] = useState(null);

  const handleConfirmReviewSubmit = async () => {
    if (!reviewModalData) return;
    const { taskId, fields } = reviewModalData;
    setReviewModalData(null);
    try {
      await updateTaskTrigger({
        id: taskId,
        taskData: fields,
      }).unwrap();
      toast.success("Task submitted for review successfully!");
    } catch (err) {
      console.error(err);
      toast.error(err?.data?.message || "Failed to submit task for review.");
    }
  };

  const [correctionModalData, setCorrectionModalData] = useState(null);
  const [rejectionModalData, setRejectionModalData] = useState(null);
  const [holdTaskModalData, setHoldTaskModalData] = useState(null);
  const [blockTaskModalData, setBlockTaskModalData] = useState(null);

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

    if (sanitizedFields.status === "In Review") {
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
        setReviewModalData({ taskId, fields: sanitizedFields });
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
      setHoldTaskModalData({ taskId, taskObj: currentTaskObj });
      return;
    }

    if (sanitizedFields.status === "Blocked") {
      const currentTaskObj = tasks?.find((t) => t._id === taskId);
      setBlockTaskModalData({ taskId, taskObj: currentTaskObj });
      return;
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
      if (err?.status === 409) {
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

      toast.error("Failed to update task");
    }
  };

  const getDrawerStatusStyle = (status) => {
    switch (status) {
      case "Completed":
        return {
          bg: "!bg-emerald-50 !text-emerald-700 !border-emerald-200 dark:!bg-emerald-500/20 dark:!text-emerald-300 dark:!border-emerald-500/40",
        };
      case "In Progress":
        return {
          bg: "!bg-blue-50 !text-blue-700 !border-blue-200 dark:!bg-blue-500/20 dark:!text-blue-300 dark:!border-blue-500/40",
        };
      case "On Hold":
        return {
          bg: "!bg-amber-50 !text-amber-700 !border-amber-200 dark:!bg-amber-500/20 dark:!text-amber-300 dark:!border-amber-500/40",
        };
      case "In Review":
        return {
          bg: "!bg-sky-50 !text-sky-700 !border-sky-200 dark:!bg-sky-500/20 dark:!text-sky-350 dark:!border-sky-500/40",
        };
      case "Correction":
        return {
          bg: "!bg-orange-50 !text-orange-700 !border-orange-200 dark:!bg-orange-500/20 dark:!text-orange-350 dark:!border-orange-500/40",
        };
      case "Rejected":
        return {
          bg: "!bg-rose-50 !text-rose-700 !border-rose-200 dark:!bg-rose-500/20 dark:!text-rose-350 dark:!border-rose-500/40",
        };
      default:
        return {
          bg: "!bg-slate-50 !text-slate-600 !border-slate-200 dark:!bg-slate-500/20 dark:!text-slate-300 dark:!border-slate-500/40",
        };
    }
  };
  const navigate = useNavigate();
  const [projectSearch, setProjectSearch] = useState("");

  const [hiddenColumns, setHiddenColumns] = useState({
    taskName: false,
    projectName: false,
    clientName: false,
    contentCopy: false,
    contentType: false,
    createdBy: false,
    assignee: false,
    startDate: false,
    dueDate: false,
    priority: false,
    status: false,
    totalHours: false,

    timeTracker: false,
    approvalInfo: false,
    action: false,
  });
  const [isColsOpen, setIsColsOpen] = useState(false);
  const colsDropdownRef = useRef(null);

  const [searchParams] = useSearchParams();
  const statusParam = searchParams.get("status");
  const departmentParam =
    searchParams.get("department") || searchParams.get("dept");

  const normalizeStatus = (s) => {
    if (!s) return "All";
    const lower = s.toLowerCase();
    if (
      lower === "in-review" ||
      lower === "inreview" ||
      lower === "in review"
    ) {
      return "In Review";
    }
    return s;
  };

  const [overviewStatusFilter, setOverviewStatusFilter] = useState(() => {
    return normalizeStatus(statusParam);
  });

  const [overviewDepartmentFilter, setOverviewDepartmentFilter] = useState(
    () => {
      return departmentParam || "All";
    },
  );
  const [showDepartmentDropdown, setShowDepartmentDropdown] = useState(false);
  const [departmentSearchQuery, setDepartmentSearchQuery] = useState("");
  const departmentDropdownRef = useRef(null);

  useEffect(() => {
    if (statusParam) {
      setOverviewStatusFilter(normalizeStatus(statusParam));
    }
  }, [statusParam]);

  useEffect(() => {
    if (departmentParam) {
      setOverviewDepartmentFilter(departmentParam);
    }
  }, [departmentParam]);

  const [overviewPriorityFilter, setOverviewPriorityFilter] = useState("All");
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const statusDropdownRef = useRef(null);
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);
  const priorityDropdownRef = useRef(null);
  const [overviewStartDateFilter, setOverviewStartDateFilter] = useState("");
  const [overviewEndDateFilter, setOverviewEndDateFilter] = useState("");
  const [showOverviewFilter, setShowOverviewFilter] = useState(false);
  const overviewFilterRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        colsDropdownRef.current &&
        !colsDropdownRef.current.contains(event.target)
      ) {
        setIsColsOpen(false);
      }
      if (
        overviewFilterRef.current &&
        !overviewFilterRef.current.contains(event.target)
      ) {
        setShowOverviewFilter(false);
      }
      if (
        clientDropdownRef.current &&
        !clientDropdownRef.current.contains(event.target)
      ) {
        setShowClientDropdown(false);
      }
      if (
        createdByDropdownRef.current &&
        !createdByDropdownRef.current.contains(event.target)
      ) {
        setShowCreatedByDropdown(false);
      }
      if (
        assigneeDropdownRef.current &&
        !assigneeDropdownRef.current.contains(event.target)
      ) {
        setShowAssigneeDropdown(false);
      }
      if (
        departmentDropdownRef.current &&
        !departmentDropdownRef.current.contains(event.target)
      ) {
        setShowDepartmentDropdown(false);
      }
      if (
        statusDropdownRef.current &&
        !statusDropdownRef.current.contains(event.target)
      ) {
        setShowStatusDropdown(false);
      }
      if (
        priorityDropdownRef.current &&
        !priorityDropdownRef.current.contains(event.target)
      ) {
        setShowPriorityDropdown(false);
      }
      if (
        contentTypeDropdownRef.current &&
        !contentTypeDropdownRef.current.contains(event.target)
      ) {
        setShowContentTypeDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    projectSearch,
    overviewPriorityFilter,
    overviewStatusFilter,
    overviewDepartmentFilter,
    overviewStartDateFilter,
    overviewEndDateFilter,
    dateFilter,
    overviewClientFilter,
    overviewCreatedByFilter,
    overviewAssigneeFilter,
    overviewContentTypeFilter,
  ]);

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

  const getStatusStyle = (status, isBlocked) => {
    if (isBlocked) {
      return {
        dot: "bg-orange-500 dark:bg-orange-400",
        text: "text-orange-700 dark:text-orange-450",
        bg: "bg-orange-50/65 dark:bg-orange-950/20",
        border: "border-orange-100 dark:border-orange-950",
      };
    }
    switch (status) {
      case "Not Started":
      case "To Do":
        return {
          dot: "bg-slate-400 dark:bg-slate-500",
          text: "text-slate-600 dark:text-slate-400",
          bg: "bg-slate-50/60 dark:bg-slate-950/10",
          border: "border-slate-100 dark:border-slate-950",
        };
      case "In Progress":
        return {
          dot: "bg-blue-500 dark:bg-blue-400",
          text: "text-blue-700 dark:text-blue-400",
          bg: "bg-blue-50/60 dark:bg-blue-950/20",
          border: "border-blue-100 dark:border-blue-950",
        };
      case "On Hold":
        return {
          dot: "bg-amber-500 dark:bg-amber-400",
          text: "text-amber-700 dark:text-amber-400",
          bg: "bg-amber-50/60 dark:bg-amber-950/20",
          border: "border-amber-100 dark:border-amber-950",
        };
      case "In Review":
        return {
          dot: "bg-yellow-500 dark:bg-yellow-400",
          text: "text-yellow-800 dark:text-yellow-300 font-black",
          bg: "bg-yellow-100/90 dark:bg-yellow-950/40",
          border: "border-yellow-300 dark:border-yellow-800",
        };
      case "Correction":
        return {
          dot: "bg-orange-500 dark:bg-orange-400",
          text: "text-orange-800 dark:text-orange-300 font-black",
          bg: "bg-orange-100/90 dark:bg-orange-950/40",
          border: "border-orange-300 dark:border-orange-800",
        };
      case "Rejected":
        return {
          dot: "bg-rose-500 dark:bg-rose-400",
          text: "text-rose-950 dark:text-rose-200 font-black",
          bg: "bg-rose-100/90 dark:bg-rose-950/60",
          border: "border-rose-300 dark:border-rose-800",
        };
      case "Completed":
      case "Done":
        return {
          dot: "bg-emerald-500 dark:bg-emerald-400",
          text: "text-emerald-700 dark:text-emerald-400",
          bg: "bg-emerald-50/60 dark:bg-emerald-950/20",
          border: "border-emerald-100 dark:border-emerald-950",
        };
      default:
        return {
          dot: "bg-purple-500 dark:bg-purple-400",
          text: "text-purple-700 dark:text-purple-400",
          bg: "bg-purple-50/60 dark:bg-purple-950/20",
          border: "border-purple-100 dark:border-purple-950",
        };
    }
  };

  const projectsMap = React.useMemo(() => {
    const map = new Map();
    (projects || []).forEach((p) => {
      if (p && p._id) map.set(String(p._id), p);
    });
    return map;
  }, [projects]);

  const filteredOverviewTasks = React.useMemo(() => {
    return tasks
      .filter((task) => {
        const isAdminOrManager =
          user?.role === "admin" || user?.role === "operationmanager";
        const creatorId = task.createdBy?._id || task.createdBy;

        const projId = task.project?._id || task.project;
        const projectObj = projId ? projectsMap.get(String(projId)) : null;

        if (!isAdminOrManager) {
          const isCreator = creatorId === currentUserId;
          const assigneeId = task.assignedTo?._id || task.assignedTo;
          const isAssignee = assigneeId === currentUserId;
          const isPublicProject = projectObj?.access === "Public";

          if (!isCreator && !isAssignee && !isPublicProject) {
            return false;
          }
        }
        const clientObj = task.project?.client?.companyName
          ? task.project.client
          : projectObj?.client || task.project?.client;

        if (overviewClientFilter !== "All") {
          const cId =
            clientObj?._id ||
            (typeof clientRaw === "string" ? clientRaw : null);
          if (cId !== overviewClientFilter) {
            return false;
          }
        }

        if (
          overviewPriorityFilter !== "All" &&
          task.priority !== overviewPriorityFilter
        ) {
          return false;
        }

        if (overviewStatusFilter === "Overdue") {
          const isOverdue =
            task.dueDate &&
            new Date(task.dueDate) < new Date() &&
            task.status !== "Completed";
          if (!isOverdue) return false;
        } else if (overviewStatusFilter === "Due Today") {
          const isDueToday =
            task.dueDate &&
            isSameDate(task.dueDate, new Date()) &&
            task.status !== "Completed";
          if (!isDueToday) return false;
        } else if (overviewStatusFilter === "Active Tasks") {
          const statusUpper = (task.status || "Not Started").toUpperCase();
          const isCompleted = statusUpper === "COMPLETED";
          const isRejected = statusUpper === "REJECTED";
          if (isCompleted || isRejected) return false;
        } else if (
          overviewStatusFilter?.toLowerCase() === "in review" ||
          overviewStatusFilter?.toLowerCase() === "in-review" ||
          overviewStatusFilter?.toLowerCase() === "inreview"
        ) {
          const s = (task.status || "").toLowerCase();
          if (s !== "in review" && s !== "in-review" && !s.includes("review")) {
            return false;
          }
        } else if (
          overviewStatusFilter !== "All" &&
          (task.status || "").toLowerCase() !==
            overviewStatusFilter?.toLowerCase()
        ) {
          return false;
        }

        if (
          overviewCreatedByFilter !== "All" &&
          (task.createdBy?._id || task.createdBy) !== overviewCreatedByFilter
        ) {
          return false;
        }

        if (
          overviewAssigneeFilter !== "All" &&
          (task.assignedTo?._id || task.assignedTo) !== overviewAssigneeFilter
        ) {
          return false;
        }

        if (
          overviewContentTypeFilter !== "All" &&
          task.contentType !== overviewContentTypeFilter
        ) {
          return false;
        }

        if (overviewDepartmentFilter && overviewDepartmentFilter !== "All") {
          const targetDeptLower = overviewDepartmentFilter.toLowerCase();

          const assigneeId =
            typeof task.assignedTo === "object"
              ? task.assignedTo?._id
              : task.assignedTo;
          const assignedUserObj =
            typeof task.assignedTo === "object"
              ? task.assignedTo
              : users?.find((u) => (u._id || u.id) === assigneeId);

          const creatorId =
            typeof task.createdBy === "object"
              ? task.createdBy?._id
              : task.createdBy;
          const creatorUserObj =
            typeof task.createdBy === "object"
              ? task.createdBy
              : users?.find((u) => (u._id || u.id) === creatorId);

          const taskDept =
            assignedUserObj?.department || creatorUserObj?.department || "";
          const taskDeptLower = taskDept.toLowerCase();

          let matchesDept = false;
          if (targetDeptLower.includes("graphic")) {
            matchesDept =
              taskDeptLower.includes("graphic") ||
              taskDeptLower.includes("design");
          } else if (
            targetDeptLower.includes("video") ||
            targetDeptLower.includes("videographer")
          ) {
            matchesDept =
              taskDeptLower.includes("video") || taskDeptLower.includes("edit");
          } else if (targetDeptLower.includes("web")) {
            matchesDept =
              taskDeptLower.includes("web") || taskDeptLower.includes("dev");
          } else if (targetDeptLower.includes("seo")) {
            matchesDept = taskDeptLower.includes("seo");
          } else if (targetDeptLower.includes("social")) {
            matchesDept =
              taskDeptLower.includes("social") || taskDeptLower.includes("smm");
          } else if (targetDeptLower.includes("performance")) {
            matchesDept =
              taskDeptLower.includes("performance") ||
              taskDeptLower.includes("marketer");
          } else {
            matchesDept =
              taskDeptLower.includes(targetDeptLower) ||
              targetDeptLower.includes(taskDeptLower);
          }

          if (!matchesDept) return false;
        }

        if (overviewStartDateFilter) {
          if (!task.startDate) return false;
          const tStart = new Date(task.startDate).setHours(0, 0, 0, 0);
          const fStart = new Date(overviewStartDateFilter).setHours(0, 0, 0, 0);
          if (tStart < fStart) return false;
        }

        if (overviewEndDateFilter) {
          if (!task.dueDate) return false;
          const tDue = new Date(task.dueDate).setHours(23, 59, 59, 999);
          const fDue = new Date(overviewEndDateFilter).setHours(
            23,
            59,
            59,
            999,
          );
          if (tDue > fDue) return false;
        }

        if (!checkTaskProductivityAndDate(task, dateFilter)) {
          return false;
        }

        if (!projectSearch.trim()) return true;
        const q = projectSearch.toLowerCase();
        const title = task.title || "";
        const contentCopy = task.contentCopy || "";
        const contentType = task.contentType || "";
        return (
          title.toLowerCase().includes(q) ||
          contentCopy.toLowerCase().includes(q) ||
          contentType.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        // 1. Primary sort: Most recent date first (createdAt)
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;

        if (timeA !== timeB) {
          return timeB - timeA;
        }

        // 2. Secondary sort: Status Order (Not Started -> In Progress -> On Hold -> In Review -> Correction -> Rejected -> Completed)
        const getStatusSortRank = (task) => {
          const s = (task.status || "Not Started").toUpperCase();
          if (s === "NOT STARTED" || s === "PENDING" || s === "TO DO" || s === "TODO") {
            return 1;
          }
          if (
            s === "IN PROGRESS" ||
            s === "IN_PROGRESS" ||
            s === "INPROGRESS"
          ) {
            return 2;
          }
          if (s === "ON HOLD" || s === "ON_HOLD" || s === "ON-HOLD") {
            return 3;
          }
          if (s === "IN REVIEW" || s === "IN_REVIEW" || s === "IN-REVIEW") {
            return 4;
          }
          if (s === "CORRECTION") {
            return 5;
          }
          if (s === "REJECTED") {
            return 6;
          }
          if (s === "COMPLETED" || s === "DONE") {
            return 7;
          }
          return 8;
        };

        const sRankA = getStatusSortRank(a);
        const sRankB = getStatusSortRank(b);
        if (sRankA !== sRankB) {
          return sRankA - sRankB;
        }

        // 2. Secondary sort: Priority (Top High -> High -> Medium -> Low)
        const priorityRank = {
          "Top High": 1,
          "top high": 1,
          High: 2,
          high: 2,
          Medium: 3,
          medium: 3,
          Low: 4,
          low: 4,
        };
        const pRankA = priorityRank[a.priority] || 5;
        const pRankB = priorityRank[b.priority] || 5;
        if (pRankA !== pRankB) {
          return pRankA - pRankB;
        }

        // 3. Tertiary sort: Most recent date first
        const dateA = new Date(
          a.createdAt || a.startDate || a.dueDate || 0,
        ).getTime();
        const dateB = new Date(
          b.createdAt || b.startDate || b.dueDate || 0,
        ).getTime();
        return dateB - dateA;
      });
  }, [
    tasks,
    currentUserId,
    projectSearch,
    projects,
    overviewPriorityFilter,
    overviewStatusFilter,
    overviewDepartmentFilter,
    overviewStartDateFilter,
    overviewEndDateFilter,
    dateFilter,
    overviewClientFilter,
    overviewCreatedByFilter,
    overviewAssigneeFilter,
    overviewContentTypeFilter,
  ]);

  const totalPages = Math.ceil(filteredOverviewTasks.length / itemsPerPage);

  useEffect(() => {
    if (onFilteredCountChange) {
      onFilteredCountChange(filteredOverviewTasks.length);
    }
    return () => {
      if (onFilteredCountChange) {
        onFilteredCountChange(null);
      }
    };
  }, [filteredOverviewTasks.length, onFilteredCountChange]);

  const handleExportExcel = () => {
    if (!filteredOverviewTasks || filteredOverviewTasks.length === 0) {
      toast.error("No tasks data available to export");
      return;
    }

    const headers = [
      "Task Name",
      "Project Name",
      "Client Name",
      "Content Copy",
      "Content Type",
      "Created By",
      "Assignee",
      "Start Date",
      "End Date",
      "Priority",
      "Status",
      "Total Inprogress",

      "Total Time Tracker",
      "Approval Info",
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

      const activeSecs = Math.floor((end - start + baseTracked) / 1000);

      return {
        totalStr: formatSecs(activeSecs),
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

    const rows = filteredOverviewTasks.map((task) => {
      const projId = task.project?._id || task.project;
      const projectObj = (projects || []).find((p) => p._id === projId);
      const projectName =
        projectObj?.name || task.project?.name || "No Project";
      const clientRaw = task.project?.client?.companyName
        ? task.project.client
        : projectObj?.client || task.project?.client;
      const clientId = clientRaw?._id || clientRaw;
      const clientObj =
        (clients || []).find((c) => c._id === clientId) ||
        (typeof clientRaw === "object" ? clientRaw : null);
      const clientName = clientObj?.companyName || "No Client";

      const createdBy = task.createdBy?.name
        ? `${task.createdBy.name} (${task.createdBy.department || "Creator"})`
        : "Unknown";
      const assignee = task.assignedTo?.name
        ? `${task.assignedTo.name} (${task.assignedTo.department || "Team Member"})`
        : "Unassigned";

      const startDate = task.startDate ? formatDate(task.startDate) : "—";
      const endDate = task.dueDate ? formatDate(task.dueDate) : "—";

      const { totalStr } = computeTaskTimes(task);
      const approvalStr = computeApprovalStr(task);

      return [
        task.title || "",
        projectName,
        clientName,
        task.contentCopy || task.content_copy || "",
        task.contentType || task.content_type || "",
        createdBy,
        assignee,
        startDate,
        endDate,
        task.priority || "Medium",
        task.status || "Not Started",
        totalStr,
        approvalStr,
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
    link.setAttribute("download", `Tasks_Overview_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Task Overview data exported to Excel!");
  };

  return (
    <>
      <div className="bg-white dark:bg-[#11131e] overflow-hidden flex flex-col h-[calc(100vh-160px)]">
        {/* Top Control Toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 pb-2.5 pt-1.5 px-3 mb-1 border-b border-slate-200/80 dark:border-white/10 relative z-30 shrink-0 bg-slate-50/70 dark:bg-[#151725]/70 backdrop-blur-md rounded-2xl">
          {/* Active Filter Badges - Horizontal pill strip */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {/* Client Badge */}
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-extrabold bg-blue-50/90 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/40 shadow-2xs">
              <span className="text-[9px] text-blue-500 font-bold uppercase">
                Client:
              </span>
              {overviewClientFilter === "All" ? (
                <span>All</span>
              ) : (
                <ClientBadge
                  client={clients?.find((c) => c._id === overviewClientFilter)}
                  size="sm"
                  className="!text-[9px] !px-1.5 !py-0 border-none !bg-transparent"
                />
              )}
            </div>

            {/* Status Badge */}
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-extrabold bg-amber-50/90 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/40 shadow-2xs">
              <span className="text-[9px] text-amber-500 font-bold uppercase">
                Status:
              </span>
              <span>{overviewStatusFilter}</span>
            </div>

            {/* Dept Badge */}
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-extrabold bg-indigo-50/90 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/40 shadow-2xs">
              <span className="text-[9px] text-indigo-500 font-bold uppercase">
                Dept:
              </span>
              <span>{overviewDepartmentFilter}</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 flex-wrap w-full lg:w-auto ml-auto">
            <div className="relative" ref={clientDropdownRef}>
              <div className="rounded-full bg-gradient-to-bl from-transparent via-blue-200 to-blue-500 p-[1px] shadow-sm">
                <button
                  type="button"
                  onClick={() => setShowClientDropdown((prev) => !prev)}
                  className={`relative flex items-center justify-between gap-1.5 px-3 py-1 min-w-[95px] h-7 rounded-full text-[11px] font-bold transition-all cursor-pointer z-10 outline-none border-none tracking-tight ${
                    overviewClientFilter !== "All"
                      ? "bg-blue-50/90 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300"
                      : "bg-white text-slate-800 dark:bg-[#151725] dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900"
                  }`}
                >
                  <span className="truncate max-w-[85px]">
                    {overviewClientFilter === "All"
                      ? "All Clients"
                      : clients?.find((c) => c._id === overviewClientFilter)
                          ?.companyName || "Client"}
                  </span>
                  <FiChevronDown
                    size={12}
                    className={`text-slate-400 shrink-0 transition-transform duration-200 ${
                      showClientDropdown ? "rotate-180" : ""
                    }`}
                  />
                </button>
              </div>

              <AnimatePresence>
                {showClientDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-64 max-h-[320px] flex flex-col bg-white dark:bg-[#151725] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl z-[70] overflow-hidden"
                  >
                    <div className="p-2 border-b border-slate-100 dark:border-white/10 shrink-0">
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Search clients..."
                          value={clientSearchQuery}
                          onChange={(e) => setClientSearchQuery(e.target.value)}
                          className="w-full pl-7 pr-2.5 py-1 text-[12px] font-semibold rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 outline-none focus:border-blue-500 text-slate-800 dark:text-slate-200"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-1 flex flex-col gap-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setOverviewClientFilter("All");
                          setShowClientDropdown(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-xl text-[12px] font-bold transition-all shrink-0 ${
                          overviewClientFilter === "All"
                            ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400"
                            : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5"
                        }`}
                      >
                        All Clients
                      </button>
                      {clients
                        ?.filter((c) =>
                          c.companyName
                            ?.toLowerCase()
                            .includes(clientSearchQuery.toLowerCase()),
                        )
                        .map((client) => (
                          <button
                            key={client._id}
                            type="button"
                            onClick={() => {
                              setOverviewClientFilter(client._id);
                              setShowClientDropdown(false);
                            }}
                            className={`w-full text-left px-2 py-1 rounded-xl transition-all shrink-0 flex items-center ${
                              overviewClientFilter === client._id
                                ? "bg-blue-50 dark:bg-blue-500/10"
                                : "hover:bg-slate-50 dark:hover:bg-white/5"
                            }`}
                          >
                            <ClientBadge
                              client={client}
                              size="sm"
                              className="w-full justify-start !text-[10px]"
                            />
                          </button>
                        ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Created By Filter */}
            <div className="relative" ref={createdByDropdownRef}>
              <div className="rounded-full bg-gradient-to-bl from-transparent via-purple-200 to-purple-500 p-[1px] shadow-sm">
                <button
                  type="button"
                  onClick={() => setShowCreatedByDropdown((prev) => !prev)}
                  className={`relative flex items-center justify-between gap-1.5 px-3 py-1 min-w-[100px] h-7 rounded-full text-[11px] font-bold transition-all cursor-pointer z-10 outline-none border-none tracking-tight ${
                    overviewCreatedByFilter !== "All"
                      ? "bg-purple-50/90 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300"
                      : "bg-white text-slate-800 dark:bg-[#151725] dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    {overviewCreatedByFilter !== "All" &&
                      renderUserAvatarSmall(
                        uniqueCreators.find(
                          (u) => (u._id || u.id) === overviewCreatedByFilter,
                        ),
                      )}
                    <span className="truncate max-w-[70px]">
                      {overviewCreatedByFilter === "All"
                        ? "Created By"
                        : uniqueCreators.find(
                            (u) => (u._id || u.id) === overviewCreatedByFilter,
                          )?.name || "Creator"}
                    </span>
                  </div>
                  <FiChevronDown
                    size={12}
                    className={`text-slate-400 shrink-0 transition-transform duration-200 ${
                      showCreatedByDropdown ? "rotate-180" : ""
                    }`}
                  />
                </button>
              </div>

              <AnimatePresence>
                {showCreatedByDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-64 max-h-[320px] flex flex-col bg-white dark:bg-[#151725] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl z-[70] overflow-hidden"
                  >
                    <div className="p-2 border-b border-slate-100 dark:border-white/10 shrink-0">
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Search creator..."
                          value={createdBySearchQuery}
                          onChange={(e) =>
                            setCreatedBySearchQuery(e.target.value)
                          }
                          className="w-full pl-7 pr-2.5 py-1 text-[12px] font-semibold rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 outline-none focus:border-blue-500 text-slate-800 dark:text-slate-200"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-1 flex flex-col gap-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setOverviewCreatedByFilter("All");
                          setShowCreatedByDropdown(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-xl text-[12px] font-bold transition-all shrink-0 ${
                          overviewCreatedByFilter === "All"
                            ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400"
                            : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5"
                        }`}
                      >
                        All Creators
                      </button>
                      {uniqueCreators
                        ?.filter((u) =>
                          u.name
                            ?.toLowerCase()
                            .includes(createdBySearchQuery.toLowerCase()),
                        )
                        .map((u) => {
                          const uid = u._id || u.id;
                          return (
                            <button
                              key={uid}
                              type="button"
                              onClick={() => {
                                setOverviewCreatedByFilter(uid);
                                setShowCreatedByDropdown(false);
                              }}
                              className={`w-full text-left px-2.5 py-1.5 rounded-xl transition-all shrink-0 flex items-center gap-1.5 ${
                                overviewCreatedByFilter === uid
                                  ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 font-extrabold"
                                  : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5"
                              }`}
                            >
                              {renderUserAvatarSmall(u)}
                              <span className="truncate text-[12px]">
                                {u.name}
                              </span>
                            </button>
                          );
                        })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Assignee Filter */}
            <div className="relative" ref={assigneeDropdownRef}>
              <div className="rounded-full bg-gradient-to-bl from-transparent via-rose-200 to-rose-500 p-[1px] shadow-sm">
                <button
                  type="button"
                  onClick={() => setShowAssigneeDropdown((prev) => !prev)}
                  className={`relative flex items-center justify-between gap-1.5 px-3 py-1 min-w-[95px] h-7 rounded-full text-[11px] font-bold transition-all cursor-pointer z-10 outline-none border-none tracking-tight ${
                    overviewAssigneeFilter !== "All"
                      ? "bg-rose-50/90 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300"
                      : "bg-white text-slate-800 dark:bg-[#151725] dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    {overviewAssigneeFilter !== "All" &&
                      renderUserAvatarSmall(
                        uniqueAssignees.find(
                          (u) => (u._id || u.id) === overviewAssigneeFilter,
                        ),
                      )}
                    <span className="truncate max-w-[70px]">
                      {overviewAssigneeFilter === "All"
                        ? "Assignee"
                        : uniqueAssignees.find(
                            (u) => (u._id || u.id) === overviewAssigneeFilter,
                          )?.name || "Assignee"}
                    </span>
                  </div>
                  <FiChevronDown
                    size={12}
                    className={`text-slate-400 shrink-0 transition-transform duration-200 ${
                      showAssigneeDropdown ? "rotate-180" : ""
                    }`}
                  />
                </button>
              </div>

              <AnimatePresence>
                {showAssigneeDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-64 max-h-[320px] flex flex-col bg-white dark:bg-[#151725] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl z-[70] overflow-hidden"
                  >
                    <div className="p-2 border-b border-slate-100 dark:border-white/10 shrink-0">
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Search assignee..."
                          value={assigneeSearchQuery}
                          onChange={(e) =>
                            setAssigneeSearchQuery(e.target.value)
                          }
                          className="w-full pl-7 pr-2.5 py-1 text-[12px] font-semibold rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 outline-none focus:border-blue-500 text-slate-800 dark:text-slate-200"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-1 flex flex-col gap-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setOverviewAssigneeFilter("All");
                          setShowAssigneeDropdown(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-xl text-[12px] font-bold transition-all shrink-0 ${
                          overviewAssigneeFilter === "All"
                            ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400"
                            : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5"
                        }`}
                      >
                        All Assignees
                      </button>
                      {uniqueAssignees
                        ?.filter((u) =>
                          u.name
                            ?.toLowerCase()
                            .includes(assigneeSearchQuery.toLowerCase()),
                        )
                        .map((u) => {
                          const uid = u._id || u.id;
                          return (
                            <button
                              key={uid}
                              type="button"
                              onClick={() => {
                                setOverviewAssigneeFilter(uid);
                                setShowAssigneeDropdown(false);
                              }}
                              className={`w-full text-left px-2.5 py-1.5 rounded-xl transition-all shrink-0 flex items-center gap-1.5 ${
                                overviewAssigneeFilter === uid
                                  ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 font-extrabold"
                                  : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5"
                              }`}
                            >
                              {renderUserAvatarSmall(u)}
                              <span className="truncate text-[12px]">
                                {u.name}
                              </span>
                            </button>
                          );
                        })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Department Filter */}
            <div className="relative" ref={departmentDropdownRef}>
              <div className="rounded-full bg-gradient-to-bl from-transparent via-emerald-200 to-emerald-500 p-[1px] shadow-sm">
                <button
                  type="button"
                  onClick={() => setShowDepartmentDropdown((prev) => !prev)}
                  className={`relative flex items-center justify-between gap-1.5 px-3 py-1 min-w-[95px] h-7 rounded-full text-[11px] font-bold transition-all cursor-pointer z-10 outline-none border-none tracking-tight ${
                    overviewDepartmentFilter !== "All"
                      ? "bg-emerald-50/90 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300"
                      : "bg-white text-slate-800 dark:bg-[#151725] dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900"
                  }`}
                >
                  <span className="truncate max-w-[75px]">
                    {overviewDepartmentFilter === "All"
                      ? "Department"
                      : overviewDepartmentFilter}
                  </span>
                  <FiChevronDown
                    size={12}
                    className={`text-slate-400 shrink-0 transition-transform duration-200 ${
                      showDepartmentDropdown ? "rotate-180" : ""
                    }`}
                  />
                </button>
              </div>

              <AnimatePresence>
                {showDepartmentDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-64 max-h-[320px] flex flex-col bg-white dark:bg-[#151725] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl z-[70] overflow-hidden"
                  >
                    <div className="p-2 border-b border-slate-100 dark:border-white/10 shrink-0">
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Search department..."
                          value={departmentSearchQuery}
                          onChange={(e) =>
                            setDepartmentSearchQuery(e.target.value)
                          }
                          className="w-full pl-7 pr-2.5 py-1 text-[12px] font-semibold rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 outline-none focus:border-blue-500 text-slate-800 dark:text-slate-200"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-1 flex flex-col gap-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setOverviewDepartmentFilter("All");
                          setShowDepartmentDropdown(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-xl text-[12px] font-bold transition-all shrink-0 ${
                          overviewDepartmentFilter === "All"
                            ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400"
                            : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5"
                        }`}
                      >
                        All Departments
                      </button>
                      {uniqueDepartments
                        ?.filter((dept) =>
                          dept
                            .toLowerCase()
                            .includes(departmentSearchQuery.toLowerCase()),
                        )
                        .map((dept) => (
                          <button
                            key={dept}
                            type="button"
                            onClick={() => {
                              setOverviewDepartmentFilter(dept);
                              setShowDepartmentDropdown(false);
                            }}
                            className={`w-full text-left px-2.5 py-1.5 rounded-xl transition-all shrink-0 flex items-center gap-1.5 text-[12px] ${
                              overviewDepartmentFilter === dept
                                ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 font-extrabold"
                                : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5"
                            }`}
                          >
                            <span className="truncate">{dept}</span>
                          </button>
                        ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Content Type Filter */}
            <div className="relative" ref={contentTypeDropdownRef}>
              <div className="rounded-full bg-gradient-to-bl from-transparent via-fuchsia-200 to-fuchsia-500 p-[1px] shadow-sm">
                <button
                  type="button"
                  onClick={() => setShowContentTypeDropdown((prev) => !prev)}
                  className={`relative flex items-center justify-between gap-1.5 px-3 py-1 min-w-[95px] h-7 rounded-full text-[11px] font-bold transition-all cursor-pointer z-10 outline-none border-none tracking-tight ${
                    overviewContentTypeFilter !== "All"
                      ? "bg-fuchsia-50/90 text-fuchsia-800 dark:bg-fuchsia-950/80 dark:text-fuchsia-300"
                      : "bg-white text-slate-800 dark:bg-[#151725] dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900"
                  }`}
                >
                  <span className="truncate max-w-[75px]">
                    {overviewContentTypeFilter === "All"
                      ? "Content Type"
                      : overviewContentTypeFilter}
                  </span>
                  <FiChevronDown
                    size={12}
                    className={`text-slate-400 shrink-0 transition-transform duration-200 ${
                      showContentTypeDropdown ? "rotate-180" : ""
                    }`}
                  />
                </button>
              </div>

              <AnimatePresence>
                {showContentTypeDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-64 max-h-[320px] flex flex-col bg-white dark:bg-[#151725] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl z-[70] overflow-hidden"
                  >
                    <div className="p-2 border-b border-slate-100 dark:border-white/10 shrink-0">
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Search content type..."
                          value={contentTypeSearchQuery}
                          onChange={(e) =>
                            setContentTypeSearchQuery(e.target.value)
                          }
                          className="w-full pl-7 pr-2.5 py-1 text-[12px] font-semibold rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 outline-none focus:border-blue-500 text-slate-800 dark:text-slate-200"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-1 flex flex-col gap-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setOverviewContentTypeFilter("All");
                          setShowContentTypeDropdown(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-xl text-[12px] font-bold transition-all shrink-0 ${
                          overviewContentTypeFilter === "All"
                            ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400"
                            : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5"
                        }`}
                      >
                        All Content Types
                      </button>
                      {uniqueContentTypes
                        ?.filter((type) =>
                          type
                            .toLowerCase()
                            .includes(contentTypeSearchQuery.toLowerCase()),
                        )
                        .map((type) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => {
                              setOverviewContentTypeFilter(type);
                              setShowContentTypeDropdown(false);
                            }}
                            className={`w-full text-left px-2.5 py-1.5 rounded-xl transition-all shrink-0 flex items-center gap-1.5 text-[12px] ${
                              overviewContentTypeFilter === type
                                ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 font-extrabold"
                                : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5"
                            }`}
                          >
                            <span className="truncate">{type}</span>
                          </button>
                        ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Status Filter */}
            <div className="relative" ref={statusDropdownRef}>
              <div className="rounded-full bg-gradient-to-bl from-transparent via-cyan-200 to-cyan-500 p-[1px] shadow-sm">
                <button
                  type="button"
                  onClick={() => setShowStatusDropdown((prev) => !prev)}
                  className={`relative flex items-center justify-between gap-1.5 px-3 py-1 min-w-[90px] h-7 rounded-full text-[11px] font-bold transition-all cursor-pointer z-10 outline-none border-none tracking-tight ${
                    overviewStatusFilter !== "All"
                      ? "bg-cyan-50/90 text-cyan-800 dark:bg-cyan-950/80 dark:text-cyan-300"
                      : "bg-white text-slate-800 dark:bg-[#151725] dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900"
                  }`}
                >
                  <span className="truncate max-w-[70px]">
                    {overviewStatusFilter === "All"
                      ? "Status"
                      : overviewStatusFilter}
                  </span>
                  <FiChevronDown
                    size={12}
                    className={`text-slate-400 shrink-0 transition-transform duration-200 ${
                      showStatusDropdown ? "rotate-180" : ""
                    }`}
                  />
                </button>
              </div>

              <AnimatePresence>
                {showStatusDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-44 bg-white dark:bg-[#151725] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl p-1 z-[70] flex flex-col gap-0.5"
                  >
                    {[
                      "All",
                      "Active Tasks",
                      "Not Started",
                      "In Progress",
                      "In Review",
                      "Correction",
                      "On Hold",
                      "Completed",
                      "Rejected",
                      ...(overviewStatusFilter === "Overdue"
                        ? ["Overdue"]
                        : overviewStatusFilter === "Due Today"
                          ? ["Due Today"]
                          : []),
                    ].map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => {
                          setOverviewStatusFilter(st);
                          setShowStatusDropdown(false);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-1 rounded-xl text-[12px] font-bold transition-all text-left cursor-pointer ${
                          overviewStatusFilter === st
                            ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 font-extrabold"
                            : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
                        }`}
                      >
                        <span>{st === "All" ? "All Statuses" : st}</span>
                        {overviewStatusFilter === st && (
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        )}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Priority Filter */}
            <div className="relative" ref={priorityDropdownRef}>
              <div className="rounded-full bg-gradient-to-bl from-transparent via-amber-200 to-amber-500 p-[1px] shadow-sm">
                <button
                  type="button"
                  onClick={() => setShowPriorityDropdown((prev) => !prev)}
                  className={`relative flex items-center justify-between gap-1.5 px-3 py-1 min-w-[90px] h-7 rounded-full text-[11px] font-bold transition-all cursor-pointer z-10 outline-none border-none tracking-tight ${
                    overviewPriorityFilter !== "All"
                      ? "bg-amber-50/90 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300"
                      : "bg-white text-slate-800 dark:bg-[#151725] dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900"
                  }`}
                >
                  <span className="truncate max-w-[70px]">
                    {overviewPriorityFilter === "All"
                      ? "Priority"
                      : overviewPriorityFilter}
                  </span>
                  <FiChevronDown
                    size={12}
                    className={`text-slate-400 shrink-0 transition-transform duration-200 ${
                      showPriorityDropdown ? "rotate-180" : ""
                    }`}
                  />
                </button>
              </div>

              <AnimatePresence>
                {showPriorityDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-44 bg-white dark:bg-[#151725] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl p-1 z-[70] flex flex-col gap-0.5"
                  >
                    {["All", "Top High", "High", "Medium", "Low"].map((pr) => (
                      <button
                        key={pr}
                        type="button"
                        onClick={() => {
                          setOverviewPriorityFilter(pr);
                          setShowPriorityDropdown(false);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-1 rounded-xl text-[12px] font-medium transition-all text-left cursor-pointer ${
                          overviewPriorityFilter === pr
                            ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 font-medium"
                            : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
                        }`}
                      >
                        <span>{pr === "All" ? "All Priorities" : pr}</span>
                        {overviewPriorityFilter === pr && (
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        )}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Date Filter */}
            <div className="relative" ref={dateDropdownRef}>
              <div className="rounded-full bg-gradient-to-bl from-transparent via-teal-200 to-teal-500 p-[1px] shadow-sm">
                <button
                  type="button"
                  onClick={() => setShowDateDropdown((prev) => !prev)}
                  className={`relative flex items-center justify-between gap-1.5 px-3 py-1 min-w-[90px] h-7 rounded-full text-[11px] font-bold transition-all cursor-pointer z-10 outline-none border-none tracking-tight ${
                    dateFilter !== "All"
                      ? "bg-teal-50/90 text-teal-800 dark:bg-teal-950/80 dark:text-teal-300"
                      : "bg-white text-slate-800 dark:bg-[#151725] dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <FiFilter
                      size={11}
                      className="text-[#10b981] stroke-[2.5]"
                    />
                    <span className="truncate max-w-[50px]">
                      {dateFilter === "All" ? "Date" : dateFilter}
                    </span>
                  </div>
                  <FiChevronDown
                    size={12}
                    className={`text-slate-400 shrink-0 transition-transform duration-200 ${
                      showDateDropdown ? "rotate-180" : ""
                    }`}
                  />
                </button>
              </div>

              <AnimatePresence>
                {showDateDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-44 bg-white dark:bg-[#151725] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl p-1 z-[70] flex flex-col gap-0.5"
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
                        className={`w-full flex items-center justify-between px-2.5 py-1 rounded-xl text-[12px] font-bold transition-all text-left cursor-pointer ${
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

            <button
              type="button"
              onClick={() => {
                setIsAddingNewTask(true);
                setNewTaskProject("");
              }}
              className="flex items-center justify-center gap-1.5 px-3 py-1 h-7 rounded-full theme-bg-accent  text-white text-[11px] font-bold cursor-pointer transition-all shadow-md hover:shadow-blue-500/20 active:scale-95 shrink-0"
              title="Create a new task"
            >
              <FiPlus size={13} className="stroke-[3]" />
              <span>Add Task</span>
            </button>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {portalReady && document.getElementById("task-actions-portal")
              ? createPortal(
                  <>
                    <button
                      type="button"
                      onClick={handleExportExcel}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-emerald-400/60 bg-emerald-50 text-emerald-700 text-[12px] font-bold cursor-pointer transition-all hover:bg-emerald-100 shrink-0"
                      title="Export table data to Excel"
                    >
                      <FiDownload size={14} className="text-emerald-600" />
                      <span>Export Excel</span>
                    </button>

                    <div className="relative" ref={colsDropdownRef}>
                      <button
                        type="button"
                        onClick={() => setIsColsOpen(!isColsOpen)}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-slate-200 bg-white text-slate-800 text-[12px] font-bold cursor-pointer transition-all shadow-sm hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        <FiColumns className="text-blue-500" size={14} />
                        <span>Hide Column</span>
                        {Object.values(hiddenColumns).filter(Boolean).length >
                          0 && (
                          <span className="text-[10px] font-black bg-blue-500 text-white rounded-full w-4 h-4 flex items-center justify-center ml-0.5">
                            {
                              Object.values(hiddenColumns).filter(Boolean)
                                .length
                            }
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
                            className="absolute right-0 mt-2 w-52 bg-white dark:bg-[#151725] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl p-2 z-50 space-y-1 backdrop-blur-md"
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
                                      taskName: false,
                                      projectName: false,
                                      clientName: false,
                                      contentCopy: false,
                                      contentType: false,
                                      createdBy: false,
                                      assignee: false,
                                      startDate: false,
                                      dueDate: false,
                                      priority: false,
                                      status: false,
                                      totalHours: false,

                                      timeTracker: false,
                                      approvalInfo: false,
                                      action: false,
                                    })
                                  }
                                  className="text-[11px] font-bold text-blue-500 hover:text-blue-600 transition-colors"
                                >
                                  Reset
                                </button>
                              )}
                            </div>
                            <div className="flex flex-col gap-0.5 max-h-60 overflow-y-auto custom-scrollbar">
                              {[
                                { key: "taskName", label: "Task Name" },
                                { key: "projectName", label: "Project Name" },
                                { key: "clientName", label: "Client Name" },
                                { key: "contentCopy", label: "Content Copy" },
                                { key: "contentType", label: "Content Type" },
                                { key: "createdBy", label: "Created By" },
                                { key: "assignee", label: "Assignee" },
                                { key: "startDate", label: "Start Date" },
                                { key: "dueDate", label: "End Date" },
                                { key: "priority", label: "Priority" },
                                { key: "status", label: "Status" },
                                {
                                  key: "totalHours",
                                  label: "Total Inprogress",
                                },
                                { key: "timeTracker", label: "Time Tracker" },
                                { key: "approvalInfo", label: "Approve Info" },
                                { key: "action", label: "Action" },
                              ].map((col) => (
                                <label
                                  key={col.key}
                                  className="flex items-center gap-1.5 px-1.5 py-0.5 rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer text-[12px] font-bold text-slate-700 dark:text-slate-355 select-none"
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
                                    className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-white/10 dark:bg-black/20"
                                  />
                                  <span>{col.label}</span>
                                </label>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </>,
                  document.getElementById("task-actions-portal"),
                )
              : null}
          </div>
        </div>

        <div className="overflow-x-auto overflow-y-auto custom-scrollbar flex-1 relative bg-white dark:bg-[#11131e]">
          <table className="w-full text-left border-collapse min-w-max">
            <thead className="sticky top-0 z-20 bg-slate-50 dark:bg-[#161826] shadow-sm">
              <tr className="border-b border-slate-300 dark:border-white/15 text-[11px] font-black text-slate-600 dark:text-slate-350 uppercase tracking-wider">
                {!hiddenColumns.taskName && (
                  <th className="py-2 px-3 border-r border-b border-slate-300 dark:border-white/15 text-left whitespace-nowrap">
                    TASK NAME
                  </th>
                )}
                {!hiddenColumns.projectName && (
                  <th className="py-2 px-3 border-r border-b border-slate-300 dark:border-white/15 text-left whitespace-nowrap">
                    PROJECT NAME
                  </th>
                )}
                {!hiddenColumns.clientName && (
                  <th className="py-2 px-3 border-r border-b border-slate-300 dark:border-white/15 text-left whitespace-nowrap">
                    CLIENT NAME
                  </th>
                )}
                {!hiddenColumns.contentCopy && (
                  <th className="py-2 px-3 border-r border-b border-slate-300 dark:border-white/15 text-left whitespace-nowrap">
                    CONTENT COPY
                  </th>
                )}
                {!hiddenColumns.contentType && (
                  <th className="py-2 px-3 border-r border-b border-slate-300 dark:border-white/15 text-left whitespace-nowrap">
                    CONTENT TYPE
                  </th>
                )}
                {!hiddenColumns.createdBy && (
                  <th className="py-2 px-3 border-r border-b border-slate-300 dark:border-white/15 text-left whitespace-nowrap">
                    CREATED BY
                  </th>
                )}
                {!hiddenColumns.startDate && (
                  <th className="py-2 px-2 border-r border-b border-slate-300 dark:border-white/15 text-center whitespace-nowrap">
                    START DATE
                  </th>
                )}
                {!hiddenColumns.dueDate && (
                  <th className="py-2 px-2 border-r border-b border-slate-300 dark:border-white/15 text-center whitespace-nowrap">
                    END DATE
                  </th>
                )}
                {!hiddenColumns.assignee && (
                  <th className="py-2 px-3 border-r border-b border-slate-300 dark:border-white/15 text-left whitespace-nowrap">
                    ASSIGNEE
                  </th>
                )}
                {!hiddenColumns.priority && (
                  <th className="py-2 px-2 border-r border-b border-slate-300 dark:border-white/15 text-center whitespace-nowrap">
                    PRIORITY
                  </th>
                )}
                {!hiddenColumns.status && (
                  <th className="py-2 px-2 border-r border-b border-slate-300 dark:border-white/15 text-center whitespace-nowrap">
                    STATUS
                  </th>
                )}
                {!hiddenColumns.totalHours && (
                  <th className="py-2 px-2 border-r border-b border-slate-300 dark:border-white/15 text-center whitespace-nowrap">
                    TOTAL INPROGRESS
                  </th>
                )}
                {!hiddenColumns.timeTracker && (
                  <th className="py-2 px-2 border-r border-b border-slate-300 dark:border-white/15 text-center whitespace-nowrap">
                    TIMETRACKER
                  </th>
                )}
                {!hiddenColumns.approvalInfo && (
                  <th className="py-2 px-2 border-r border-b border-slate-300 dark:border-white/15 text-center whitespace-nowrap">
                    APPROVE INFO
                  </th>
                )}
                {!hiddenColumns.action && (
                  <th className="py-2 px-3 border-b border-slate-300 dark:border-white/15 text-right whitespace-nowrap">
                    ACTION
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/10 text-[12px] font-semibold">
              {isAddingNewTask && (
                <tr className="transition-colors border-b border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100 hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                  {!hiddenColumns.taskName && (
                    <td className="py-1.5 px-3 border-r border-b border-slate-200 dark:border-white/10 font-extrabold text-left whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <BiFile className="text-slate-400 shrink-0" size={16} />
                        <input
                          ref={newTaskTitleRef}
                          type="text"
                          placeholder="Enter task title..."
                          defaultValue={newTaskTitle}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveNewTask();
                            if (e.key === "Escape") handleCancelNewTask();
                          }}
                          className="bg-transparent hover:bg-slate-100/70 dark:hover:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-800 focus:ring-1 focus:ring-blue-500/50 rounded px-1.5 py-0.5 outline-none text-[12px] font-extrabold text-slate-800 dark:text-slate-100 w-full transition-all truncate"
                          autoFocus
                        />
                      </div>
                    </td>
                  )}
                  {!hiddenColumns.projectName && (
                    <td className="py-2 px-3 border-r border-b border-slate-200 dark:border-white/10 text-left whitespace-nowrap min-w-[200px]">
                      <SearchableDropdown
                        value={newTaskProject}
                        onChange={(val) => setNewTaskProject(val)}
                        placeholder="Select Project"
                        options={(projects || []).map((p) => {
                          const clientRaw = p.client;
                          const clientId = clientRaw?._id || clientRaw;
                          const clientObj =
                            (clients || []).find((c) => c._id === clientId) ||
                            (typeof clientRaw === "object" ? clientRaw : null);
                          const clientName =
                            clientObj?.companyName || clientObj?.name || "";
                          return {
                            value: p._id,
                            label: `${p.name} ${clientName ? `(${clientName})` : ""}`,
                          };
                        })}
                      />
                    </td>
                  )}
                  {!hiddenColumns.clientName && (
                    <td className="py-2 px-3 border-r border-b border-slate-200 dark:border-white/10 text-left whitespace-nowrap">
                      {selectedNewProjectClient &&
                      selectedNewProjectClient.companyName ? (
                        <ClientBadge
                          client={selectedNewProjectClient}
                          size="sm"
                          className="!text-[11px] !px-2 !py-0.5"
                        />
                      ) : (
                        <span className="text-slate-400 text-[11px] font-semibold">
                          —
                        </span>
                      )}
                    </td>
                  )}
                  {!hiddenColumns.contentCopy && (
                    <td className="py-2 px-3 border-r border-b border-slate-200 dark:border-white/10 text-left whitespace-nowrap">
                      <input
                        type="text"
                        placeholder="Content copy..."
                        value={newTaskContentCopy}
                        onChange={(e) => setNewTaskContentCopy(e.target.value)}
                        className="bg-transparent hover:bg-slate-100/70 dark:hover:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-800 focus:ring-1 focus:ring-blue-500/50 rounded px-1.5 py-0.5 outline-none text-[11px] font-semibold text-slate-700 dark:text-slate-200 min-w-[130px] w-full transition-all truncate"
                      />
                    </td>
                  )}
                  {!hiddenColumns.contentType && (
                    <td className="py-2 px-3 border-r border-b border-slate-200 dark:border-white/10">
                      <select
                        value={newTaskContentType}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "__ADD_CUSTOM__") {
                            const customVal = prompt(
                              "Enter custom content type:",
                            );
                            if (customVal && customVal.trim() !== "") {
                              setNewTaskContentType(customVal.trim());
                              if (customVal.trim() === "MOM") {
                                setNewTaskAssignee(
                                  currentUser?._id || currentUser?.id || "",
                                );
                              }
                            }
                          } else {
                            setNewTaskContentType(val);
                            if (val === "MOM") {
                              setNewTaskAssignee(
                                currentUser?._id || currentUser?.id || "",
                              );
                            }
                          }
                        }}
                        className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2 py-1 rounded-lg text-[11px] font-bold text-slate-700 dark:text-slate-200 outline-none w-full"
                      >
                        <option value="">NONE</option>
                        <option value="VIDEO">VIDEO</option>
                        <option value="IMAGE">IMAGE</option>
                        <option value="CAROUSEL">CAROUSEL</option>
                        <option value="REEL">REEL</option>
                        <option value="POST">POST</option>
                        <option value="STORY">STORY</option>
                        <option value="Website">Website</option>
                        <option value="SEO">SEO</option>
                        <option value="Video shoot">Video shoot</option>
                        <option value="MOM">🤝 MOM</option>
                        {newTaskContentType &&
                          ![
                            "",
                            "VIDEO",
                            "IMAGE",
                            "CAROUSEL",
                            "REEL",
                            "POST",
                            "STORY",
                            "Website",
                            "SEO",
                            "Video shoot",
                            "MOM",
                          ].includes(newTaskContentType) && (
                            <option value={newTaskContentType}>
                              {newTaskContentType}
                            </option>
                          )}
                        {currentUser?.role === "admin" && (
                          <option value="__ADD_CUSTOM__">➕ Custom...</option>
                        )}
                      </select>
                    </td>
                  )}
                  {!hiddenColumns.createdBy && (
                    <td className="py-2 px-3 border-r border-b border-slate-200 dark:border-white/10 text-left whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {renderUserAvatarSmall(
                          currentUser,
                          "w-6 h-6 text-[8px]",
                        )}
                        <span className="font-bold text-[10px] text-slate-700 dark:text-slate-800">
                          {currentUser?.name || "You"}
                        </span>
                      </div>
                    </td>
                  )}
                  {!hiddenColumns.startDate && (
                    <td className="py-2 px-2 border-r border-b border-slate-200 dark:border-white/10 text-center whitespace-nowrap">
                      <input
                        type="date"
                        value={newTaskStartDate}
                        onChange={(e) => setNewTaskStartDate(e.target.value)}
                        className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-1.5 py-0.5 text-[10px] font-bold text-slate-700 dark:text-slate-200 outline-none"
                      />
                    </td>
                  )}
                  {!hiddenColumns.dueDate && (
                    <td className="py-2 px-2 border-r border-b border-slate-200 dark:border-white/10 text-center whitespace-nowrap">
                      <input
                        type="date"
                        value={newTaskDueDate}
                        min={newTaskStartDate || ""}
                        onChange={(e) => setNewTaskDueDate(e.target.value)}
                        className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-1.5 py-0.5 text-[10px] font-bold text-slate-700 dark:text-slate-200 outline-none"
                      />
                    </td>
                  )}
                  {!hiddenColumns.assignee && (
                    <td className="py-2 px-3 border-r border-b border-slate-200 dark:border-white/10 text-left whitespace-nowrap min-w-[200px]">
                      {newTaskContentType === "MOM" && currentUser?.role !== "admin" && currentUser?.role !== "operation manager" ? (
                        <div className="bg-white dark:bg-[#181a29] border border-slate-200/90 dark:border-white/10 rounded-full px-2.5 py-1 inline-flex items-center gap-2 shadow-2xs select-none">
                          {renderUserAvatarSmall(
                            currentUser,
                            "w-6 h-6 text-[8px]",
                          )}
                          <div className="flex flex-col text-left leading-none min-w-0 pr-1">
                            <span className="font-extrabold text-[11px] text-slate-800 dark:text-white truncate">
                              {currentUser?.name || "You"}
                            </span>
                            <span className="text-[9px] font-bold text-sky-600 dark:text-sky-400 truncate mt-0.5">
                              {currentUser?.department || "Team Member"}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <SearchableDropdown
                          value={newTaskAssignee}
                          onChange={(val) => setNewTaskAssignee(val)}
                          placeholder="Select Assignee"
                          groupBy={true}
                          options={[
                            { value: "", label: "Unassigned", group: "General" },
                            ...(users || []).map((u) => ({
                              value: u._id || u.id,
                              label: u.name,
                              group: u.department || "Other",
                            }))
                          ]}
                        />
                      )}
                    </td>
                  )}
                  {!hiddenColumns.priority && (
                    <td className="py-2 px-2 border-r border-b border-slate-200 dark:border-white/10 text-center whitespace-nowrap">
                      <select
                        value={
                          isSameDate(newTaskStartDate, newTaskDueDate)
                            ? "Top High"
                            : newTaskPriority
                        }
                        onChange={(e) => setNewTaskPriority(e.target.value)}
                        className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2 py-0.5 rounded-full text-[11px] font-bold text-slate-700 dark:text-slate-200 outline-none"
                      >
                        <option value="Top High">Top High</option>
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                      </select>
                    </td>
                  )}
                  {!hiddenColumns.status && (
                    <td className="py-2 px-2 border-r border-b border-slate-200 dark:border-white/10 text-center whitespace-nowrap">
                      <span className="badge-span badge-status-not-started text-[11px]">
                        Not Started
                      </span>
                    </td>
                  )}
                  {!hiddenColumns.totalHours && (
                    <td className="py-2 px-2 border-r border-b border-slate-200 dark:border-white/10 text-center text-slate-400 text-[11px]">
                      —
                    </td>
                  )}
                  {!hiddenColumns.timeTracker && (
                    <td className="py-2 px-2 border-r border-b border-slate-200 dark:border-white/10 text-center text-slate-400 text-[11px]">
                      —
                    </td>
                  )}
                  {!hiddenColumns.approvalInfo && (
                    <td className="py-2 px-2 border-r border-b border-slate-200 dark:border-white/10 text-center text-slate-400 text-[11px]">
                      —
                    </td>
                  )}
                  {!hiddenColumns.action && (
                    <td className="py-2 px-2.5 border-b border-slate-200 dark:border-white/10 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={handleSaveNewTask}
                          disabled={isCreatingTask}
                          className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all cursor-pointer disabled:opacity-50"
                          title="Save Task"
                        >
                          <FiCheck size={16} className="stroke-[3]" />
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelNewTask}
                          className="p-1 rounded-lg border border-slate-200 dark:border-white/10 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                          title="Cancel"
                        >
                          <FiX size={14} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              )}

              {filteredOverviewTasks.length === 0 ? (
                <tr>
                  <td
                    colSpan={
                      Object.values(hiddenColumns).filter(
                        (isHidden) => !isHidden,
                      ).length
                    }
                    className="py-6 text-center text-slate-400 font-bold text-[10px]"
                  >
                    No tasks found.
                  </td>
                </tr>
              ) : (
                filteredOverviewTasks
                  .slice(
                    (currentPage - 1) * itemsPerPage,
                    currentPage * itemsPerPage,
                  )
                  .map((task, idx) => {
                    const isCompleted = task.status === "Completed";
                    const isRejected = task.status === "Rejected";
                    const isInReview = task.status === "In Review";
                    const isInProgress = task.status === "In Progress";

                    const projId = task.project?._id || task.project;
                    const projectObj = projId
                      ? projectsMap.get(String(projId))
                      : null;
                    const clientRaw = task.project?.client?.companyName
                      ? task.project.client
                      : projectObj?.client || task.project?.client;
                    const clientId = clientRaw?._id || clientRaw;
                    const clientObj =
                      (clients || []).find((c) => c._id === clientId) ||
                      (typeof clientRaw === "object" ? clientRaw : null);
                    const clientName = clientObj?.companyName || "No Client";
                    const clientBranding = getClientBranding(clientObj);
                    const sStyle = getStatusStyle(
                      task.status || "Not Started",
                      task.isBlocked,
                    );
                    const pStyle = getPriorityStyle(task.priority || "Medium");

                    return (
                      <tr
                        key={task._id || `task-ov-${idx}`}
                        className={`transition-colors border-b border-slate-200 dark:border-white/10 ${
                          isRejected
                            ? "!bg-[#fde8e8] text-rose-950 dark:!bg-[#2c1214] dark:text-rose-200 opacity-80 pointer-events-none"
                            : "text-slate-800 dark:text-slate-100 hover:bg-slate-50/50 dark:hover:bg-white/[0.02] cursor-pointer"
                        }`}
                        onClick={() => setSelectedTaskId(task._id)}
                      >
                        {!hiddenColumns.taskName && (
                          <td
                            className="py-1.5 px-3 border-r border-b border-slate-200 dark:border-white/10 text-left whitespace-nowrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center gap-2">
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTaskFieldChange(task._id, {
                                    status: isCompleted
                                      ? "Not Started"
                                      : "Completed",
                                  });
                                }}
                                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center cursor-pointer shrink-0 transition-all duration-300 ${
                                  isCompleted
                                    ? "bg-emerald-500 border-emerald-500 shadow-md shadow-emerald-500/40 scale-110"
                                    : "bg-white border-slate-300 hover:border-emerald-400 dark:bg-slate-800 dark:border-slate-500 hover:shadow-sm"
                                }`}
                                title={
                                  isCompleted
                                    ? "Mark as Not Started"
                                    : "Mark as Completed"
                                }
                              >
                                {isCompleted && (
                                  <FiCheck className="text-white w-3.5 h-3.5 stroke-[3]" />
                                )}
                              </div>
                              <BiFile
                                className="text-slate-400 shrink-0"
                                size={16}
                              />
                              <span
                                contentEditable
                                suppressContentEditableWarning
                                onBlur={(e) => {
                                  const val = e.target.innerText.trim();
                                  if (val && val !== task.title) {
                                    handleTaskFieldChange(task._id, {
                                      title: val,
                                    });
                                  } else {
                                    e.target.innerText =
                                      task.title || "Untitled Task";
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    e.target.blur();
                                  }
                                }}
                                className={`outline-none text-[12px] font-extrabold text-slate-800 dark:text-slate-900 min-w-[50px] max-w-[300px] truncate block ${
                                  isCompleted
                                    ? "line-through decoration-[#10b981] decoration-1 text-slate-400 dark:text-slate-500"
                                    : ""
                                }`}
                                title="Click to edit task name"
                              >
                                {task.title || "Untitled Task"}
                              </span>
                            </div>
                          </td>
                        )}

                        {!hiddenColumns.projectName && (
                          <td
                            className="py-1.5 px-3 border-r border-b border-slate-200 dark:border-white/10 text-left whitespace-nowrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-extrabold transition-all"
                              style={{
                                backgroundColor: `${clientBranding.color}18`,
                                color: clientBranding.color,
                              }}
                            >
                              <span>{projectObj?.name || "No Project"}</span>
                            </div>
                          </td>
                        )}

                        {!hiddenColumns.clientName && (
                          <td className="py-2 px-3 border-r border-b border-slate-200 dark:border-white/10 text-left whitespace-nowrap">
                            {clientObj && clientObj.companyName ? (
                              <ClientBadge
                                client={clientObj}
                                size="sm"
                                className="!text-[11px] !px-2 !py-0.5"
                              />
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-pink-50 text-pink-600 border border-pink-100 dark:bg-pink-950/30 dark:text-pink-400 dark:border-pink-900/30">
                                {clientName}
                              </span>
                            )}
                          </td>
                        )}
                        {!hiddenColumns.contentCopy && (
                          <td
                            className="py-1.5 px-3 border-r border-b border-slate-200 dark:border-white/10 text-left whitespace-nowrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span
                              contentEditable
                              suppressContentEditableWarning
                              onBlur={(e) => {
                                let val = e.target.innerText.trim();
                                if (val === "Add content copy...") val = "";

                                if (
                                  val !==
                                  (task.contentCopy || task.content_copy || "")
                                ) {
                                  handleTaskFieldChange(task._id, {
                                    contentCopy: val,
                                  });
                                } else {
                                  e.target.innerText =
                                    task.contentCopy ||
                                    task.content_copy ||
                                    "Add content copy...";
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  e.target.blur();
                                }
                              }}
                              onFocus={(e) => {
                                if (
                                  e.target.innerText.trim() ===
                                  "Add content copy..."
                                ) {
                                  e.target.innerText = "";
                                }
                              }}
                              className={`outline-none text-[11px] font-semibold min-w-[130px] max-w-[200px] truncate block hover:bg-slate-100/50 dark:hover:bg-slate-800/30 px-1 py-0.5 rounded transition-colors ${
                                !(task.contentCopy || task.content_copy)
                                  ? "text-slate-400 dark:text-slate-500"
                                  : "text-slate-700 dark:text-slate-200"
                              }`}
                              title="Click to edit content copy"
                            >
                              {task.contentCopy ||
                                task.content_copy ||
                                "Add content copy..."}
                            </span>
                          </td>
                        )}

                        {!hiddenColumns.contentType && (
                          <td
                            className="py-1.5 px-3 border-r border-b border-slate-200 dark:border-white/10"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div>
                              <select
                                value={task.contentType || ""}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val === "__ADD_CUSTOM__") {
                                    const customVal = prompt(
                                      "Enter custom content type:",
                                    );
                                    if (customVal && customVal.trim() !== "") {
                                      const creatorId =
                                        task.createdBy?._id ||
                                        task.createdBy?.id ||
                                        (typeof task.createdBy === "string"
                                          ? task.createdBy
                                          : null) ||
                                        currentUser?._id ||
                                        currentUser?.id;
                                      const updates = {
                                        contentType: customVal.trim(),
                                      };
                                      if (
                                        customVal.trim() === "MOM" &&
                                        creatorId
                                      ) {
                                        updates.assignedTo = creatorId;
                                      }
                                      handleTaskFieldChange(task._id, updates);
                                    }
                                  } else {
                                    const creatorId =
                                      task.createdBy?._id ||
                                      task.createdBy?.id ||
                                      (typeof task.createdBy === "string"
                                        ? task.createdBy
                                        : null) ||
                                      currentUser?._id ||
                                      currentUser?.id;
                                    const updates = { contentType: val };
                                    if (val === "MOM" && creatorId) {
                                      updates.assignedTo = creatorId;
                                    }
                                    handleTaskFieldChange(task._id, updates);
                                  }
                                }}
                                className={`badge-select !text-[12px] ${
                                  task.contentType === "VIDEO"
                                    ? "badge-type-video"
                                    : task.contentType === "IMAGE"
                                      ? "badge-type-image"
                                      : task.contentType === "CAROUSEL"
                                        ? "badge-type-carousel"
                                        : task.contentType === "REEL"
                                          ? "badge-type-reel"
                                          : task.contentType === "POST"
                                            ? "badge-type-post"
                                            : task.contentType === "STORY"
                                              ? "badge-type-story"
                                              : task.contentType === "Website"
                                                ? "badge-type-video"
                                                : task.contentType === "SEO"
                                                  ? "badge-type-image"
                                                  : task.contentType ===
                                                      "Video shoot"
                                                    ? "badge-type-carousel"
                                                    : task.contentType === "MOM"
                                                      ? "badge-type-post"
                                                      : "badge-type-none"
                                }`}
                              >
                                <option value="">NONE</option>
                                <option value="VIDEO">VIDEO</option>
                                <option value="IMAGE">IMAGE</option>
                                <option value="CAROUSEL">CAROUSEL</option>
                                <option value="REEL">REEL</option>
                                <option value="POST">POST</option>
                                <option value="STORY">STORY</option>
                                <option value="Website">Website</option>
                                <option value="SEO">SEO</option>
                                <option value="Video shoot">Video shoot</option>
                                <option value="MOM">🤝 MOM</option>
                                {task.contentType &&
                                  ![
                                    "VIDEO",
                                    "IMAGE",
                                    "CAROUSEL",
                                    "REEL",
                                    "POST",
                                    "STORY",
                                    "Website",
                                    "SEO",
                                    "Video shoot",
                                    "MOM",
                                  ].includes(task.contentType) && (
                                    <option value={task.contentType}>
                                      {task.contentType}
                                    </option>
                                  )}
                                {currentUser?.role === "admin" && (
                                  <option value="__ADD_CUSTOM__">
                                    ➕ Custom...
                                  </option>
                                )}
                              </select>
                            </div>
                          </td>
                        )}

                        {!hiddenColumns.createdBy && (
                          <td className="py-1.5 px-3 border-r border-b border-slate-200 dark:border-white/10 text-left whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              {renderUserAvatarSmall(
                                task.createdBy,
                                "w-6 h-6 text-[8px]",
                              )}
                              <div className="flex flex-col justify-center min-w-0">
                                <span
                                  className={`font-bold text-[10px] truncate transition-colors leading-tight ${getUserColorClass(task.createdBy?.name || "Unknown")}`}
                                >
                                  {task.createdBy?.name || "Unknown"}
                                </span>
                              </div>
                            </div>
                          </td>
                        )}
                        {!hiddenColumns.startDate && (
                          <td
                            className="py-1.5 px-2 border-r border-b border-slate-200 dark:border-white/10 text-center whitespace-nowrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div
                              className={`relative h-6 flex items-center justify-center transition-all ${
                                task.startDate
                                  ? "cursor-not-allowed"
                                  : "cursor-pointer"
                              }`}
                              onClick={(e) => {
                                if (!task.startDate) {
                                  const input =
                                    e.currentTarget.querySelector(
                                      'input[type="date"]',
                                    );
                                  if (
                                    input &&
                                    typeof input.showPicker === "function"
                                  ) {
                                    input.showPicker();
                                  }
                                }
                              }}
                            >
                              {task.startDate ? (
                                <div
                                  className="flex items-center flex-nowrap gap-1 px-1.5 py-0.5 rounded-md border border-blue-300 dark:border-blue-800/85 text-blue-855 dark:text-blue-300 text-[9.5px] font-bold bg-blue-100 dark:bg-blue-900 transition-all shadow-2xs opacity-90 cursor-not-allowed select-none"
                                  title="🔒 Start Date — Locked"
                                >
                                  <FiLock
                                    size={9.5}
                                    className="text-amber-600 dark:text-amber-400 shrink-0"
                                  />
                                  <span className="whitespace-nowrap">
                                    {new Date(
                                      task.startDate,
                                    ).toLocaleDateString(undefined, {
                                      month: "short",
                                      day: "numeric",
                                    })}
                                  </span>
                                  <span className="ml-0.5 text-[8px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest shrink-0">
                                    🔒
                                  </span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md border border-dashed border-blue-600 dark:border-blue-800/80 text-white dark:text-blue-400/90 bg-blue-400 dark:bg-blue-400 transition-all text-[8px] font-bold">
                                  <FiCalendar size={9.5} />
                                  <span>+ Start Date</span>
                                </div>
                              )}
                              {!task.startDate && (
                                <input
                                  type="date"
                                  value=""
                                  onChange={(e) =>
                                    handleTaskFieldChange(task._id, {
                                      startDate: e.target.value || null,
                                    })
                                  }
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                              )}
                            </div>
                          </td>
                        )}
                        {!hiddenColumns.dueDate && (
                          <td
                            className="py-1.5 px-2 border-r border-b border-slate-200 dark:border-white/10 text-center whitespace-nowrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div
                              className={`relative h-6 flex items-center justify-center transition-all ${
                                task.dueDate
                                  ? "cursor-not-allowed"
                                  : "cursor-pointer"
                              }`}
                              onClick={(e) => {
                                if (!task.dueDate) {
                                  const input =
                                    e.currentTarget.querySelector(
                                      'input[type="date"]',
                                    );
                                  if (
                                    input &&
                                    typeof input.showPicker === "function"
                                  ) {
                                    input.showPicker();
                                  }
                                }
                              }}
                            >
                              {task.dueDate ? (
                                <div
                                  className="flex items-center flex-nowrap gap-1 px-1.5 py-0.5 rounded-md border border-rose-300 dark:border-rose-700/80 text-rose-855 dark:text-rose-100 text-[9.5px] font-bold bg-rose-100 dark:bg-rose-800 transition-all shadow-2xs opacity-90 cursor-not-allowed select-none"
                                  title="🔒 End Date — Locked"
                                >
                                  <FiLock
                                    size={9.5}
                                    className="text-amber-600 dark:text-amber-400 shrink-0"
                                  />
                                  <span className="whitespace-nowrap">
                                    {new Date(task.dueDate).toLocaleDateString(
                                      undefined,
                                      {
                                        month: "short",
                                        day: "numeric",
                                      },
                                    )}
                                  </span>
                                  <span className="ml-0.5 text-[8px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest shrink-0">
                                    🔒
                                  </span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md border border-dashed border-rose-300 dark:border-rose-800/80 text-rose-605 dark:text-rose-400/90 hover:border-rose-400 hover:text-rose-750 dark:hover:text-rose-300 dark:hover:border-rose-600/85 bg-rose-50/50 dark:bg-rose-955/20 hover:bg-rose-100 dark:hover:bg-rose-955/50 transition-all text-[8px] font-bold">
                                  <FiCalendar size={9.5} />
                                  <span>+ End Date</span>
                                </div>
                              )}
                              {!task.dueDate && (
                                <input
                                  type="date"
                                  value=""
                                  min={
                                    task.startDate
                                      ? new Date(task.startDate)
                                          .toISOString()
                                          .split("T")[0]
                                      : ""
                                  }
                                  onChange={(e) =>
                                    handleTaskFieldChange(task._id, {
                                      dueDate: e.target.value || null,
                                    })
                                  }
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                              )}
                            </div>
                          </td>
                        )}
                        {!hiddenColumns.assignee && (
                          <td
                            className="py-1.5 px-3 border-r border-b border-slate-200 dark:border-white/10 text-left whitespace-nowrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <AssigneeCell
                              task={task}
                              users={users}
                              handleTaskFieldChange={handleTaskFieldChange}
                            />
                          </td>
                        )}
                        {!hiddenColumns.priority && (
                          <td
                            className="py-1.5 px-2 border-r border-b border-slate-200 dark:border-white/10 text-center whitespace-nowrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <select
                              value={
                                isSameDate(task.startDate, task.dueDate)
                                  ? "Top High"
                                  : task.priority || "Medium"
                              }
                              onChange={(e) =>
                                handleTaskFieldChange(task._id, {
                                  priority: e.target.value,
                                })
                              }
                              className={`appearance-none cursor-pointer border rounded-full px-2.5 py-0.5 text-[11px] font-bold outline-none shadow-2xs ${
                                isSameDate(task.startDate, task.dueDate)
                                  ? "badge-priority-top-high"
                                  : pStyle
                              }`}
                            >
                              <option
                                value="Top High"
                                className="bg-white dark:bg-slate-900 text-rose-600"
                              >
                                Top High
                              </option>
                              <option
                                value="High"
                                className="bg-white dark:bg-slate-900 text-amber-600"
                              >
                                High
                              </option>
                              <option
                                value="Medium"
                                className="bg-white dark:bg-slate-900 text-blue-600"
                              >
                                Medium
                              </option>
                              <option
                                value="Low"
                                className="bg-white dark:bg-slate-900 text-slate-600"
                              >
                                Low
                              </option>
                            </select>
                          </td>
                        )}
                        {!hiddenColumns.status && (
                          <td
                            className="py-1.5 px-2 border-r border-b border-slate-200 dark:border-white/10 text-center whitespace-nowrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div>
                              {task.status !== "Completed" &&
                              task.status !== "Rejected" ? (
                                <select
                                  value={task.status || "Not Started"}
                                  onChange={(e) =>
                                    handleTaskFieldChange(task._id, {
                                      status: e.target.value,
                                    })
                                  }
                                  className={`badge-select ${
                                    task.status === "Completed"
                                      ? "badge-status-completed"
                                      : task.status === "In Progress"
                                        ? "badge-status-in-progress"
                                        : task.status === "In Review" ||
                                            task.status === "IN-REVIEW"
                                          ? "badge-status-in-review"
                                          : task.status === "Correction"
                                            ? "badge-status-correction"
                                            : task.status === "On Hold"
                                              ? "badge-status-on-hold"
                                              : task.status === "Blocked"
                                                ? "badge-status-blocked bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700/50"
                                                : task.status === "Rejected"
                                                  ? "badge-status-rejected"
                                                  : "badge-status-not-started"
                                  }`}
                                >
                                  {task.contentType === "MOM" ? (
                                    <>
                                      <option value="Not Started">Not Started</option>
                                      {["In Progress", "On Hold", "Blocked", "In Review", "Correction"].includes(task.status) && (
                                        <option value={task.status}>{task.status}</option>
                                      )}
                                      <option value="Completed">Completed</option>
                                    </>
                                  ) : (
                                    <>
                                      <option value="Not Started">Not Started</option>
                                      {["In Progress", "On Hold", "Blocked", "In Review"].includes(task.status) && (
                                        <option value={task.status}>{task.status}</option>
                                      )}
                                      <option value="Correction">Correction</option>
                                      <option value="Completed">Completed</option>
                                      <option value="Rejected">Rejected</option>
                                    </>
                                  )}
                                </select>
                              ) : (
                                <span
                                  className={`badge-span ${
                                    task.status === "Completed"
                                      ? "badge-status-completed"
                                      : task.status === "In Progress"
                                        ? "badge-status-in-progress"
                                        : task.status === "In Review"
                                          ? "badge-status-in-review"
                                          : task.status === "On Hold"
                                            ? "badge-status-on-hold"
                                            : task.status === "Blocked"
                                              ? "badge-status-blocked bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700/50"
                                              : task.status === "Rejected"
                                                ? "badge-status-rejected"
                                                : "badge-status-not-started"
                                  }`}
                                >
                                  {getStatusWithEmoji(task.status)}
                                </span>
                              )}
                            </div>
                          </td>
                        )}
                        {!hiddenColumns.totalHours && (
                          <td className="py-2 px-2 border-r border-b border-slate-200 dark:border-white/10 text-center whitespace-nowrap">
                            <SimpleTimeTracker
                              mode="active"
                              startTime={task.actualStartTime}
                              endTime={task.actualEndTime}
                              pausedAt={task.pausedAt}
                              savedPausedMs={task.totalPausedMs}
                              status={task.status}
                              totalTrackedTime={task.totalTrackedTime}
                            />
                          </td>
                        )}
                        {!hiddenColumns.timeTracker && (
                          <td className="py-2 px-2 border-r border-b border-slate-200 dark:border-white/10 text-center whitespace-nowrap">
                            <TimeTrackerBox
                              startTime={task.actualStartTime}
                              endTime={task.actualEndTime}
                              pausedAt={task.pausedAt}
                              savedPausedMs={task.totalPausedMs}
                              status={task.status}
                              isBlocked={task.isBlocked}
                              blockerPausedAt={task.blockerPausedAt}
                              blockerHistory={task.blockerHistory}
                              totalTrackedTime={task.totalTrackedTime}
                            />
                          </td>
                        )}
                        {!hiddenColumns.approvalInfo && (
                          <td className="py-2 px-2 border-r border-b border-slate-200 dark:border-white/10 text-center whitespace-nowrap">
                            <ApprovalTimeDisplay
                              reviewStartedAt={task.reviewStartedAt}
                              completedAt={task.completedAt}
                              approvalWaitingMs={task.approvalWaitingMs}
                              status={task.status}
                              lastReviewStartedAt={task.lastReviewStartedAt}
                              reviewCycles={task.reviewCycles}
                            />
                          </td>
                        )}
                        {!hiddenColumns.action && (
                          <td
                            className="py-2 px-2.5 border-b border-slate-200 dark:border-white/10 text-right"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  const userRole =
                                    user?.role === "admin"
                                      ? "admin"
                                      : user?.role === "operationmanager"
                                        ? "operationmanager"
                                        : "team";
                                  navigate(
                                    `/${userRole}/projects?id=${projId}&taskId=${task._id}`,
                                  );
                                }}
                                className="px-2 py-1 rounded-lg border border-slate-200 dark:border-white/10 text-[11px] font-extrabold text-slate-800 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-[#3b82f6] hover:border-blue-200 transition-all cursor-pointer shadow-2xs"
                              >
                                View Task
                              </button>
                              <button
                                type="button"
                                onClick={() => setTaskToDelete(task._id)}
                                className="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-slate-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500 hover:border-red-200 transition-all cursor-pointer shadow-2xs"
                                title="Delete Task"
                              >
                                <FiTrash2 size={12} />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#161826] shrink-0 mt-auto">
            <div className="text-[12px] font-semibold text-slate-500 dark:text-slate-400">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
              {Math.min(
                currentPage * itemsPerPage,
                filteredOverviewTasks.length,
              )}{" "}
              of {filteredOverviewTasks.length} tasks
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/10 text-[12px] font-bold text-slate-700 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-white/5 transition-colors shadow-2xs cursor-pointer"
              >
                Previous
              </button>

              {(() => {
                const pageNumbers = [];
                const maxVisiblePages = 5;

                if (totalPages <= maxVisiblePages) {
                  for (let i = 1; i <= totalPages; i++) {
                    pageNumbers.push(i);
                  }
                } else {
                  pageNumbers.push(1);

                  if (currentPage > 3) {
                    pageNumbers.push("...");
                  }

                  const start = Math.max(2, currentPage - 1);
                  const end = Math.min(totalPages - 1, currentPage + 1);

                  for (let i = start; i <= end; i++) {
                    pageNumbers.push(i);
                  }

                  if (currentPage < totalPages - 2) {
                    pageNumbers.push("...");
                  }

                  pageNumbers.push(totalPages);
                }

                return pageNumbers.map((page, index) => {
                  if (page === "...") {
                    return (
                      <span
                        key={`ellipsis-${index}`}
                        className="px-2 py-0.5 text-[12px] text-slate-400 dark:text-slate-650 font-bold select-none"
                      >
                        ...
                      </span>
                    );
                  }
                  return (
                    <button
                      key={page}
                      type="button"
                      onClick={() => setCurrentPage(page)}
                      className={`px-2.5 py-1 text-[12px] rounded-lg border transition-all cursor-pointer font-bold ${
                        currentPage === page
                          ? "bg-blue-600 text-white border-blue-600 dark:bg-[#3b82f6] dark:border-[#3b82f6] dark:text-black shadow-sm"
                          : "border-slate-200 dark:border-white/10 hover:bg-white dark:hover:bg-white/5 text-slate-600 dark:text-slate-300"
                      }`}
                    >
                      {page}
                    </button>
                  );
                });
              })()}

              <button
                type="button"
                onClick={() =>
                  setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                }
                disabled={currentPage === totalPages}
                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/10 text-[12px] font-bold text-slate-700 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-white/5 transition-colors shadow-2xs cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedTask && (
          <div
            key={`drawer-${selectedTask._id}`}
            className="fixed inset-0 z-50 flex justify-end"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTaskId(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
            />

            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", ease: "easeOut", duration: 0.3 }}
              className="relative w-full max-w-2xl bg-white dark:bg-[#0f111a] h-full shadow-[0_0_50px_rgba(0,0,0,0.1)] dark:shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col z-10 border-l border-slate-100 dark:border-slate-800"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-[#0c121e]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-sm shrink-0">
                    <FiCheckSquare size={18} />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-slate-800 dark:text-white tracking-wider">
                      Task Workspace
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-bold tracking-wider mt-0.5">
                      Preview Details
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedTaskId(null)}
                  className="w-8 h-8 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <FiX size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="bg-slate-50 dark:bg-[#111827] rounded-3xl p-5 border border-slate-100 dark:border-slate-800/80 space-y-4 shadow-sm relative overflow-hidden">
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-700 relative z-10">
                    <div className="px-3 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-black tracking-wider uppercase">
                      {getTaskDisplayId(selectedTask)}
                    </div>
                    <h3 className="text-base font-black text-slate-800 dark:text-white">
                      {selectedTask.title}
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-xs relative z-10">
                    <div className="space-y-1">
                      <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider block">
                        Priority
                      </span>
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded border text-[12px] font-bold ${getPriorityStyle(selectedTask.priority || "Medium")}`}
                      >
                        {selectedTask.priority || "Medium"}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider block">
                        Status Field
                      </span>
                      {selectedTask.status === "Completed" ? (
                        <div className="px-2.5 py-1 text-[12px] font-black rounded-full border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 flex items-center gap-1.5 shadow-sm uppercase tracking-wider w-fit">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Completed
                        </div>
                      ) : selectedTask.status === "Rejected" ? (
                        <div className="px-2.5 py-1 text-[12px] font-black rounded-full border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 flex items-center gap-1.5 shadow-sm uppercase tracking-wider w-fit">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                          Rejected
                        </div>
                      ) : (
                        <select
                          value={selectedTask.status || "Not Started"}
                          onChange={(e) =>
                            handleTaskFieldChange(selectedTask._id, {
                              status: e.target.value,
                            })
                          }
                          className={`badge-select border rounded px-2.5 py-1 text-[12px] font-bold ${
                            selectedTask.status === "Completed"
                              ? "badge-status-completed"
                              : selectedTask.status === "In Progress"
                                ? "badge-status-in-progress"
                                : selectedTask.status === "In Review"
                                  ? "badge-status-in-review"
                                  : selectedTask.status === "On Hold"
                                    ? "badge-status-on-hold"
                                    : selectedTask.status === "Correction"
                                      ? "badge-status-correction"
                                      : selectedTask.status === "Rejected"
                                        ? "badge-status-rejected"
                                        : "badge-status-not-started"
                          }`}
                        >
                          {selectedTask.contentType === "MOM" ? (
                            <>
                              <option value="Not Started">Not Started</option>
                              {["In Progress", "On Hold", "In Review", "Correction"].includes(selectedTask.status) && (
                                <option value={selectedTask.status}>{selectedTask.status}</option>
                              )}
                              <option value="Completed">Completed</option>
                            </>
                          ) : (
                            <>
                              <option value="Not Started">Not Started</option>
                              {["In Progress", "On Hold", "In Review"].includes(selectedTask.status) && (
                                <option value={selectedTask.status}>{selectedTask.status}</option>
                              )}
                              <option value="Correction">Correction</option>
                              <option value="Completed">Completed</option>
                              <option value="Rejected">Rejected</option>
                            </>
                          )}
                        </select>
                      )}
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider block">
                        Client
                      </span>
                      <div className="font-bold text-slate-700 dark:text-white mt-1 text-[12px]">
                        {(() => {
                          const projId =
                            selectedTask.project?._id || selectedTask.project;
                          const projectObj = projects.find(
                            (p) => p._id === projId,
                          );
                          const clientRaw = selectedTask.project?.client
                            ?.companyName
                            ? selectedTask.project.client
                            : projectObj?.client ||
                              selectedTask.project?.client;
                          const clientId = clientRaw?._id || clientRaw;
                          const clientObj =
                            clients?.find((c) => c._id === clientId) ||
                            (typeof clientRaw === "object" ? clientRaw : null);

                          if (clientObj && clientObj.companyName) {
                            return (
                              <ClientBadge
                                client={clientObj}
                                size="sm"
                                className="!text-[11px]"
                              />
                            );
                          }
                          return (
                            <span className="text-slate-400 italic font-normal text-[12px]">
                              {clientObj?.companyName || "—"}
                            </span>
                          );
                        })()}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider block">
                        Project
                      </span>
                      <span className="font-bold text-slate-700 dark:text-white truncate block mt-1.5 text-[12px]">
                        {selectedTask.project?.name || "Internal task"}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider block">
                        Assigned By
                      </span>
                      <span className="font-bold text-slate-700 dark:text-white text-[12px]">
                        {selectedTask.createdBy?.name || "Unknown"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {/* SUBMIT FOR REVIEW CONFIRMATION MODAL */}
        {reviewModalData && (
          <div
            key="review-confirmation-modal"
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md"
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

        {taskToDelete && (
          <div
            key="delete-task-modal-wrapper"
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-[#161826] rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-slate-100 dark:border-white/10"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center mb-4">
                  <FiAlertCircle
                    className="text-red-600 dark:text-red-500"
                    size={24}
                  />
                </div>
                <h3 className="text-lg font-black text-slate-800 dark:text-white mb-2">
                  Delete Task
                </h3>
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-6">
                  Are you sure you want to delete this task? This action cannot
                  be undone.
                </p>
                <div className="flex w-full gap-3">
                  <button
                    onClick={() => setTaskToDelete(null)}
                    className="flex-1 py-2 rounded-xl font-bold text-sm bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    No, Cancel
                  </button>
                  <button
                    onClick={handleDeleteTask}
                    className="flex-1 py-2 rounded-xl font-bold text-sm bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/30 transition-colors cursor-pointer"
                  >
                    Yes, Delete
                  </button>
                </div>
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

      {/* HOLD TASK MODAL */}
      <HoldTaskModal
        isOpen={!!holdTaskModalData}
        onClose={() => setHoldTaskModalData(null)}
        onSubmit={async (data) => {
          if (!holdTaskModalData) return;
          try {
            await updateTaskTrigger({
              id: holdTaskModalData.taskId,
              taskData: {
                status: "On Hold",
                holdReason: data.reason,
                holdComment: data.comment,
                relatedTaskId: data.relatedTaskId || null
              },
            }).unwrap();

            if (data.reason === "Another Task" && data.relatedTaskId) {
              await updateTaskTrigger({
                id: data.relatedTaskId,
                taskData: { status: "In Progress", forceSwitch: true },
              }).unwrap();
              toast.success("Task placed On Hold & Related Task started");
            } else {
              toast.success("Task placed On Hold");
            }
          } catch (err) {
            toast.error("Failed to put task On Hold");
          }
          setHoldTaskModalData(null);
        }}
        task={holdTaskModalData?.taskObj}
        tasks={tasks.filter(
          (t) =>
            t._id !== holdTaskModalData?.taskId &&
            !["Completed", "In Progress", "In Review"].includes(t.status)
        )}
      />

      {/* BLOCK TASK MODAL */}
      <BlockTaskModal
        isOpen={!!blockTaskModalData}
        onClose={() => setBlockTaskModalData(null)}
        onSubmit={async (data) => {
          if (!blockTaskModalData) return;
          try {
            await updateTaskTrigger({
              id: blockTaskModalData.taskId,
              taskData: {
                status: "Blocked",
                blockerType: data.blockerType,
                blockedBy: data.blockedBy,
                blockedReason: data.reason,
                blockedComment: data.comment,
              },
            }).unwrap();
            toast.success("Task is now Blocked");
          } catch (err) {
            toast.error("Failed to block task");
          }
          setBlockTaskModalData(null);
        }}
        task={blockTaskModalData?.taskObj}
      />
    </>
  );
};

export default TaskOverviewTab;
