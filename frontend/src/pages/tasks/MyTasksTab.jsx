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
  FiActivity,
  FiPauseCircle,
  FiRefreshCw,
  FiPieChart,
  FiFlag,
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
import { HoldTaskModal } from "../../components/HoldTaskModal";
import { BlockTaskModal } from "../../components/BlockTaskModal";
import StatusHistoryTable from "../../components/common/StatusHistoryTable";
import { calculateTaskProductivityForDate } from "../Dashboard/cards/GraphicDesignerDashboard";

const isSameDate = (d1, d2) => {
  if (!d1 || !d2) return false;
  try {
    const s1 =
      typeof d1 === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d1.trim())
        ? d1.trim()
        : new Date(d1).toLocaleDateString("en-CA");
    const s2 =
      typeof d2 === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d2.trim())
        ? d2.trim()
        : new Date(d2).toLocaleDateString("en-CA");
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

  const createdDateStr = getLocalDateStr(task.createdAt);
  if (!createdDateStr) return false;

  const createdDate = new Date(task.createdAt);
  const todayStr = getLocalDateStr(now);

  if (dateFilter === "Today") {
    return createdDateStr === todayStr;
  }

  if (dateFilter === "Yesterday") {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return createdDateStr === getLocalDateStr(yesterday);
  }

  if (dateFilter === "This Week") {
    const dayOfWeek = now.getDay();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    return createdDate >= startOfWeek && createdDate <= endOfWeek;
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

    return createdDate >= startOfMonth && createdDate <= endOfMonth;
  }

  if (dateFilter && dateFilter !== "All") {
    const targetDate = new Date(dateFilter);
    if (!isNaN(targetDate.getTime())) {
      return createdDateStr === getLocalDateStr(targetDate);
    }
  }

  return false;
};

const TimeTracker = ({
  startTime,
  endTime,
  status,
  pausedAt,
  autoPaused,
  savedPausedMs = 0,
  totalTrackedTime = 0,
  fullWidth = false,
}) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startTime) {
      setElapsed(0);
      return;
    }

    const statusUpper = (status || "")
      .trim()
      .toUpperCase()
      .replace(/[-_]/g, " ");

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

      const totalElapsedMs = end - start - (savedPausedMs || 0);
      return {
        active: Math.max(0, Math.floor(totalElapsedMs / 1000)),
      };
    };

    const update = () => {
      const { active } = calculateTime();
      setElapsed(active);
    };

    update();

    if (statusUpper === "IN PROGRESS" && !autoPaused && !endTime) {
      const interval = setInterval(update, 1000);
      return () => clearInterval(interval);
    }
  }, [startTime, endTime, pausedAt, autoPaused, status, savedPausedMs]);

  const formatTime = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h > 0 ? `${h}h ` : ""}${m}m ${s}s`;
  };

  const lifetimeSecs = Math.floor((totalTrackedTime || 0) / 1000);

  if (!startTime && status !== "In Progress") {
    if (!status || status.toLowerCase() === "not started") {
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

  return (
    <div
      className={`flex flex-col gap-1 ${fullWidth ? "w-full" : "w-[120px]"} text-[9px] font-bold tracking-wide`}
    >
      <div className="flex justify-between items-center bg-blue-50 dark:bg-blue-500/10 border border-blue-200/50 dark:border-blue-500/20 px-1.5 py-0.5 rounded text-blue-600 dark:text-blue-400">
        <span>Active:</span>
        <span>{activeStr}</span>
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
    totalTrackedTime = 0,
  }) => {
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
      if (!startTime) {
        setElapsed(0);
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

        const totalElapsedMs = end - start - (savedPausedMs || 0);
        return {
          active: Math.max(0, Math.floor(totalElapsedMs / 1000)),
        };
      };

      const update = () => {
        const { active } = calculateTime();
        setElapsed(active);
      };

      update();

      if (status === "In Progress" && !autoPaused && !endTime) {
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
      }
    }, [startTime, endTime, pausedAt, autoPaused, status, savedPausedMs]);

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
        if (!status || status.toLowerCase() === "not started") {
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

    return null;
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
        {(revInfo || doneInfo) && (
          <div className="flex items-stretch rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/40 shadow-sm">
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

const WorkTimeCell = React.memo(
  ({ task, officeHours = DEFAULT_OFFICE_HOURS, dateFilter = "Today" }) => {
    const [nowTick, setNowTick] = useState(Date.now());
    const statusUpper = (task?.status || "")
      .trim()
      .toUpperCase()
      .replace(/[-_]/g, " ");
    const isActive = statusUpper === "IN PROGRESS" && !task?.autoPaused;

    useEffect(() => {
      if (!isActive) return;
      const interval = setInterval(() => {
        setNowTick(Date.now());
      }, 1000);
      return () => clearInterval(interval);
    }, [isActive]);

    const { workMs: totalWorkMs } = React.useMemo(
      () => getTaskStatsForDateFilter(task, "All", officeHours, nowTick),
      [task, officeHours, nowTick],
    );

    const { workMs: todayWorkMs } = React.useMemo(
      () => getTaskStatsForDateFilter(task, "Today", officeHours, nowTick),
      [task, officeHours, nowTick],
    );

    const previousWorkMs = Math.max(0, totalWorkMs - todayWorkMs);

    return (
      <div className="flex flex-col items-center justify-center gap-1.5 w-full py-1">
        <div className="flex flex-col items-center">
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border-2 transition-all duration-300 ${isActive ? "border-violet-500 bg-violet-50 dark:bg-violet-500/10 shadow-[0_0_12px_rgba(139,92,246,0.6)] animate-[pulse_1.5s_ease-in-out_infinite]" : todayWorkMs > 0 ? "border-transparent bg-violet-50/50 dark:bg-violet-500/5" : "border-transparent bg-slate-50 dark:bg-slate-800/30"}`}
          >
            {isActive && (
              <span className="w-1.5 h-1.5 rounded-full bg-violet-500 shadow-[0_0_6px_rgba(139,92,246,1)]"></span>
            )}
            <span
              className={`font-black text-[12px] ${todayWorkMs > 0 || isActive ? "text-violet-600 dark:text-violet-400" : "text-slate-400"}`}
            >
              {formatMsToHMS(todayWorkMs)}
            </span>
          </div>
        </div>

        {previousWorkMs > 0 && (
          <div
            className="flex items-center gap-1 px-1.5 py-[2px] rounded bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/50 shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
            title="Previous tracked time"
          >
            <FiClock size={8} className="text-slate-400" />
            <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 tracking-wide">
              {formatMsToHMS(previousWorkMs)}
            </span>
          </div>
        )}
      </div>
    );
  },
);

const OnHoldTimeCell = React.memo(
  ({ task, officeHours = DEFAULT_OFFICE_HOURS, dateFilter = "Today" }) => {
    const [nowTick, setNowTick] = useState(Date.now());
    const isHold = task?.status === "On Hold";

    let isUnproductiveActive = isHold;
    if (isHold && task.statusHistory && Array.isArray(task.statusHistory)) {
      const openEntry = [...task.statusHistory]
        .reverse()
        .find((h) => h.status === "On Hold" && !h.endTime);
      if (
        openEntry &&
        (openEntry.reason === "Client Call" ||
          openEntry.reason === "Meeting" ||
          openEntry.reason === "Another Task")
      ) {
        isUnproductiveActive = false;
      }
    }

    useEffect(() => {
      if (!isUnproductiveActive) return;
      const interval = setInterval(() => {
        setNowTick(Date.now());
      }, 1000);
      return () => clearInterval(interval);
    }, [isUnproductiveActive]);

    const { onHoldMs: totalOnHoldMs } = React.useMemo(
      () => getTaskStatsForDateFilter(task, "All", officeHours, nowTick),
      [task, officeHours, nowTick],
    );

    const { onHoldMs: todayOnHoldMs } = React.useMemo(
      () => getTaskStatsForDateFilter(task, "Today", officeHours, nowTick),
      [task, officeHours, nowTick],
    );

    const previousOnHoldMs = Math.max(0, totalOnHoldMs - todayOnHoldMs);

    if (totalOnHoldMs === 0 && !isUnproductiveActive) {
      return (
        <div className="text-slate-400 text-center font-bold text-[11px]">
          0m
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center gap-1.5 w-full py-1">
        <div className="flex flex-col items-center">
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border-2 transition-all duration-300 ${isUnproductiveActive ? "border-amber-500 bg-amber-50 dark:bg-amber-500/10 shadow-[0_0_12px_rgba(245,158,11,0.6)] animate-[pulse_1.5s_ease-in-out_infinite]" : todayOnHoldMs > 0 ? "border-transparent bg-amber-50/50 dark:bg-amber-500/5" : "border-transparent bg-slate-50 dark:bg-slate-800/30"}`}
          >
            {isUnproductiveActive && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,1)]"></span>
            )}
            <span
              className={`font-black text-[12px] ${todayOnHoldMs > 0 || isUnproductiveActive ? "text-amber-600 dark:text-amber-400" : "text-slate-400"}`}
            >
              {formatMsToHMS(todayOnHoldMs)}
            </span>
          </div>
        </div>

        {previousOnHoldMs > 0 && (
          <div
            className="flex items-center gap-1 px-1.5 py-[2px] rounded bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/50 shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
            title="Previous tracked time"
          >
            <FiClock size={8} className="text-slate-400" />
            <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 tracking-wide">
              {formatMsToHMS(previousOnHoldMs)}
            </span>
          </div>
        )}
      </div>
    );
  },
);

const BlockedTimeCell = React.memo(
  ({ task, officeHours = DEFAULT_OFFICE_HOURS, dateFilter = "Today" }) => {
    const [nowTick, setNowTick] = useState(Date.now());

    let isBlockedActive = task?.status === "Blocked";
    if (
      task?.status === "On Hold" &&
      task.statusHistory &&
      Array.isArray(task.statusHistory)
    ) {
      const openEntry = [...task.statusHistory]
        .reverse()
        .find((h) => h.status === "On Hold" && !h.endTime);
      if (
        openEntry &&
        (openEntry.reason === "Client Call" || openEntry.reason === "Meeting")
      ) {
        isBlockedActive = true;
      }
    }

    useEffect(() => {
      if (!isBlockedActive) return;
      const interval = setInterval(() => {
        setNowTick(Date.now());
      }, 1000);
      return () => clearInterval(interval);
    }, [isBlockedActive]);

    const { blockedMs } = React.useMemo(
      () => getTaskStatsForDateFilter(task, dateFilter, officeHours, nowTick),
      [task, dateFilter, officeHours, nowTick],
    );

    if (blockedMs === 0 && !isBlockedActive) {
      return (
        <div className="text-slate-400 text-center font-bold text-[11px]">
          0m
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center text-[11px]">
        <div className="flex items-center gap-1.5">
          {isBlockedActive && (
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>
          )}
          <span
            className={`font-black text-[12px] ${blockedMs > 0 || isBlockedActive ? "text-red-500 dark:text-red-400" : "text-slate-400"}`}
          >
            {formatMsToHMS(blockedMs)}
          </span>
        </div>
      </div>
    );
  },
);

const CorrectionTimeCell = React.memo(
  ({ task, officeHours = DEFAULT_OFFICE_HOURS, dateFilter = "Today" }) => {
    const [nowTick, setNowTick] = useState(Date.now());
    const isCorrection = task?.status === "Correction";

    useEffect(() => {
      if (!isCorrection) return;
      const interval = setInterval(() => {
        setNowTick(Date.now());
      }, 1000);
      return () => clearInterval(interval);
    }, [isCorrection]);

    const { correctionMs } = React.useMemo(
      () => getTaskStatsForDateFilter(task, dateFilter, officeHours, nowTick),
      [task, dateFilter, officeHours, nowTick],
    );

    if (correctionMs === 0 && !isCorrection) {
      return (
        <div className="text-slate-400 text-center font-bold text-[11px]">
          0m
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center text-[11px]">
        <span
          className={`font-black ${correctionMs > 0 || isCorrection ? "text-blue-500 dark:text-blue-400" : "text-slate-400"}`}
        >
          {formatMsToHMS(correctionMs)}
        </span>
        {isCorrection && (
          <span className="text-[9px] font-bold text-blue-500 animate-pulse">
            Active
          </span>
        )}
      </div>
    );
  },
);

const TodayTrackerCell = React.memo(
  ({ task, officeHours = DEFAULT_OFFICE_HOURS, dateFilter = "Today" }) => {
    const [nowTick, setNowTick] = useState(Date.now());
    const statusUpper = (task?.status || "")
      .trim()
      .toUpperCase()
      .replace(/[-_]/g, " ");
    const isActive = statusUpper === "IN PROGRESS" && !task?.autoPaused;

    useEffect(() => {
      if (!isActive) return;
      const interval = setInterval(() => {
        setNowTick(Date.now());
      }, 1000);
      return () => clearInterval(interval);
    }, [isActive]);

    const { workMs, onHoldMs, correctionMs } = React.useMemo(
      () => getTaskStatsForDateFilter(task, dateFilter, officeHours, nowTick),
      [task, dateFilter, officeHours, nowTick],
    );

    const totalMs = workMs + onHoldMs + correctionMs;
    const totalSec = Math.floor(totalMs / 1000);
    const totalShiftSec = 8 * 3600;
    const percentage = Math.min(
      100,
      Math.round((totalSec / totalShiftSec) * 100),
    );

    return (
      <div className="flex items-center justify-center min-w-[120px] gap-3">
        <div className="flex flex-col items-start">
          <div className="flex items-center gap-1.5 font-black text-slate-800 dark:text-slate-200 text-[11px]">
            <FiClock size={11} className="text-slate-400" />
            {formatMsToHMS(totalMs)}
          </div>
        </div>
      </div>
    );
  },
);

const getTaskStatsForDateFilter = (task, dateFilter, officeHours, nowTick) => {
  let workMs = 0;
  let onHoldMs = 0;
  let blockedMs = 0;
  let correctionMs = 0;

  const now = new Date(nowTick);

  if (dateFilter === "All") {
    workMs = task.totalTrackedTime || 0;

    // Check if task is actively productive (In Progress or Productive Hold)
    const currentIsProductiveHold =
      task.status === "On Hold" &&
      task.statusHistory &&
      task.statusHistory.length > 0 &&
      (task.statusHistory[task.statusHistory.length - 1].reason ===
        "Client Call" ||
        task.statusHistory[task.statusHistory.length - 1].reason === "Meeting");

    let liveStart = 0;

    // 1. Try to find the open entry in status history
    if (task.statusHistory && Array.isArray(task.statusHistory)) {
      const openEntry = [...task.statusHistory]
        .reverse()
        .find(
          (h) =>
            (h.status === "In Progress" ||
              (h.status === "On Hold" &&
                (h.reason === "Client Call" || h.reason === "Meeting"))) &&
            !h.endTime,
        );
      if (openEntry && openEntry.startTime) {
        liveStart = new Date(openEntry.startTime).getTime();
      }
    }

    // 2. Fallback
    if (!liveStart || liveStart <= 0) {
      if (task.status === "In Progress" && task.actualStartTime) {
        liveStart = new Date(task.actualStartTime).getTime();
      } else if (currentIsProductiveHold && task.holdStartedAt) {
        liveStart = new Date(task.holdStartedAt).getTime();
      }
    }

    if (liveStart > 0 && !task.autoPaused) {
      workMs += Math.max(0, nowTick - liveStart);
    }
  } else {
    let start, end;
    if (dateFilter === "Today") {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      end = start;
    } else if (dateFilter === "Yesterday") {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      end = start;
    } else if (dateFilter === "This Week") {
      const dayOfWeek = now.getDay();
      start = new Date(now);
      start.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setDate(end.getDate() + 6);
    } else if (dateFilter === "This Month") {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (dateFilter && dateFilter !== "All") {
      const parsed = new Date(dateFilter);
      if (!isNaN(parsed.getTime())) {
        start = new Date(
          parsed.getFullYear(),
          parsed.getMonth(),
          parsed.getDate(),
        );
        end = start;
      }
    }

    if (start && end) {
      let curr = new Date(start);
      while (curr <= end && curr <= now) {
        workMs += calculateTaskProductivityForDate(task, curr, officeHours);
        curr.setDate(curr.getDate() + 1);
      }
    }
  }

  const isDateInFilter = (dateInput) => {
    if (dateFilter === "All") return true;
    const dStr = new Date(dateInput).toLocaleDateString("en-CA", {
      timeZone: "Asia/Kolkata",
    });
    if (dateFilter === "Today") {
      return (
        dStr === now.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })
      );
    }
    if (dateFilter === "Yesterday") {
      const y = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      return (
        dStr === y.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })
      );
    }
    const d = new Date(dateInput);
    if (dateFilter === "This Week") {
      const dayOfWeek = now.getDay();
      const start = new Date(now);
      start.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      return d >= start && d <= end;
    }
    if (dateFilter === "This Month") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const end = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      );
      return d >= start && d <= end;
    }

    if (dateFilter && dateFilter !== "All") {
      const parsed = new Date(dateFilter);
      if (!isNaN(parsed.getTime())) {
        const filterStr = parsed.toLocaleDateString("en-CA", {
          timeZone: "Asia/Kolkata",
        });
        return dStr === filterStr;
      }
    }
    return false;
  };

  if (Array.isArray(task.statusHistory)) {
    task.statusHistory.forEach((h, idx) => {
      if (h.status === "On Hold") {
        if (isDateInFilter(h.startTime || h.date)) {
          if (h.reason === "Client Call" || h.reason === "Meeting") {
            blockedMs += h.duration || 0;
          } else if (h.reason !== "Another Task") {
            onHoldMs += h.duration || 0;
          }
        }
      } else if (h.status === "Blocked") {
        if (isDateInFilter(h.startTime || h.date)) {
          blockedMs += h.duration || 0;
        }
      } else if (h.status === "Correction") {
        const startMs = new Date(h.startTime || h.date).getTime();
        const isCurrent =
          idx === task.statusHistory.length - 1 && task.status === "Correction";
        const duration = isCurrent
          ? Math.max(0, nowTick - startMs)
          : h.duration || 0;
        if (isDateInFilter(h.startTime || h.date)) {
          correctionMs += duration;
        }
      }
    });
  }

  if (task.status === "On Hold" && task.holdStartedAt) {
    const duration = Math.max(
      0,
      nowTick - new Date(task.holdStartedAt).getTime(),
    );
    if (isDateInFilter(task.holdStartedAt)) {
      const holdEntry = [...(task.statusHistory || [])]
        .reverse()
        .find((h) => h.status === "On Hold");
      const reason = holdEntry?.reason;
      if (reason === "Client Call" || reason === "Meeting") {
        blockedMs += duration;
      } else if (reason !== "Another Task") {
        onHoldMs += duration;
      }
    }
  }

  if (task.status === "Blocked" && task.blockedStartedAt) {
    const duration = Math.max(
      0,
      nowTick - new Date(task.blockedStartedAt).getTime(),
    );
    if (isDateInFilter(task.blockedStartedAt)) {
      blockedMs += duration;
    }
  }

  return { workMs, onHoldMs, blockedMs, correctionMs };
};

const PriorityBadge = ({ priority, isTopHigh }) => {
  const p = isTopHigh ? "Top High" : priority || "Medium";
  let bgClass, textClass;
  switch (p) {
    case "Top High":
      bgClass = "bg-red-50 dark:bg-red-500/10";
      textClass = "text-red-500";
      break;
    case "High":
      bgClass = "bg-orange-50 dark:bg-orange-500/10";
      textClass = "text-orange-500";
      break;
    case "Low":
      bgClass = "bg-green-50 dark:bg-green-500/10";
      textClass = "text-green-500";
      break;
    case "Medium":
    default:
      bgClass = "bg-yellow-50 dark:bg-yellow-500/10";
      textClass = "text-yellow-600 dark:text-yellow-500";
      break;
  }
  return (
    <div
      className={`flex items-center justify-center gap-1.5 px-3.5 py-3 rounded-full text-[11px] font-bold w-max mx-auto border ${bgClass.replace("bg-", "border-").replace("dark:bg-", "dark:border-")} ${bgClass} ${textClass} ${p === "Top High" ? "animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]" : ""}`}
    >
      {p !== "Top High" && <FiFlag size={12} />}
      {p}
    </div>
  );
};

const COLUMN_OPTIONS = [
  { key: "id", label: "ID" },
  { key: "priority", label: "Priority" },
  { key: "taskName", label: "Task Name" },
  { key: "client", label: "Client" },
  { key: "contentType", label: "Content-type" },
  { key: "status", label: "Status" },
  { key: "holdReason", label: "Hold Reason" },
  { key: "feedbackMom", label: "Feedback MOM" },
  { key: "activeTime", label: "Productivity" },
  { key: "onHoldTime", label: "Unproductivity" },
  { key: "timeTracker", label: "Total time spent for this task " },
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
      activeTime: false,
      onHoldTime: false,
      blockedTime: false,
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
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [selectedTaskId, setSelectedTaskIdState] = useState(null);

  const handleSelectTaskForDrawer = (id) => {
    setSelectedTaskIdState(id);
    if (setSelectedTaskId) {
      setSelectedTaskId(id);
    }
  };

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
        statusFilter ===
          "Not Started,In Progress,In Review,Correction,On Hold" ||
        statusFilter === "Not Started,In Progress,In Review,On Hold" ||
        statusFilter === "Not Started,In Progress,In Review"
      ) {
        const s = (task.status || "Not Started").toUpperCase();
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
      const s = (task.status || "Not Started").toUpperCase();
      if (s === "IN PROGRESS" || s === "IN_PROGRESS" || s === "INPROGRESS") {
        return 1;
      }
      if (s === "ON HOLD" || s === "ON_HOLD" || s === "ON-HOLD") {
        return 2;
      }
      if (s === "IN REVIEW" || s === "IN_REVIEW" || s === "IN-REVIEW") {
        return 3;
      }
      if (s === "NOT STARTED") {
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
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;

      if (timeA !== timeB) {
        return timeB - timeA;
      }

      const sRankA = getStatusSortPriority(a);
      const sRankB = getStatusSortPriority(b);
      if (sRankA !== sRankB) {
        return sRankA - sRankB;
      }

      const pRankA = getPriorityRank(a);
      const pRankB = getPriorityRank(b);
      return pRankA - pRankB;
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
  const [holdModalData, setHoldModalData] = useState(null);
  const [blockModalData, setBlockModalData] = useState(null);

  const handleTaskFieldChange = async (taskId, fields) => {
    const sanitizedFields = { ...fields };

    if (sanitizedFields.status === "Correction") {
      const currentTaskObj = tasks?.find((t) => t._id === taskId);
      setCorrectionModalData({ taskId, taskObj: currentTaskObj });
      return;
    }

    if (sanitizedFields.status === "Blocked") {
      const currentTaskObj = tasks?.find((t) => t._id === taskId);
      setBlockModalData({ taskId, taskObj: currentTaskObj });
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
      setHoldModalData({ taskId, taskObj: currentTaskObj });
      return;
    }

    if (newStatus === "Blocked") {
      const currentTaskObj = tasks?.find((t) => t._id === taskId);
      setBlockModalData({ taskId, taskObj: currentTaskObj });
      return;
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

  const getStatusStyle = (status) => {
    switch (status) {
      case "Completed":
        return {
          bg: "bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:bg-emerald-500/20 dark:border-emerald-500/50 dark:text-emerald-400 rounded-full font-bold",
          dot: "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]",
          icon: FiCheckSquare,
        };
      case "In Progress":
        return {
          bg: "bg-violet-500/10 border border-violet-500/30 text-violet-600 dark:bg-violet-500/20 dark:border-violet-500/50 dark:text-violet-400 rounded-full font-bold",
          dot: "bg-violet-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]",
          icon: FiClock,
        };
      case "On Hold":
        return {
          bg: "bg-orange-500/10 border border-orange-500/30 text-orange-600 dark:bg-orange-500/20 dark:border-orange-500/50 dark:text-orange-400 rounded-full font-bold",
          dot: "bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]",
          icon: FiAlertCircle,
        };
      case "In Review":
        return {
          bg: "bg-yellow-500/10 border border-yellow-500/30 text-yellow-600 dark:bg-yellow-500/20 dark:border-yellow-500/50 dark:text-yellow-400 rounded-full font-bold",
          dot: "bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.8)]",
          icon: FiClock,
        };
      case "Correction":
        return {
          bg: "bg-indigo-500/10 border border-indigo-500/30 text-indigo-600 dark:bg-indigo-500/20 dark:border-indigo-500/50 dark:text-indigo-400 rounded-full font-bold",
          dot: "bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]",
          icon: FiAlertCircle,
        };
      case "Rejected":
        return {
          bg: "bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:bg-rose-500/20 dark:border-rose-500/50 dark:text-rose-400 rounded-full font-bold",
          dot: "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]",
          icon: FiAlertCircle,
        };
      default: // Not Started
        return {
          bg: "bg-slate-500/10 border border-slate-500/30 text-slate-600 dark:bg-slate-500/20 dark:border-slate-500/50 dark:text-slate-400 rounded-full font-bold",
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
      "Productivity",
      "Unproductivity",
      "Total time spent for this task ",
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

      const sessionElapsedMs = Math.max(
        0,
        end - start - (task.totalPausedMs || 0),
      );
      const totalElapsedMs = baseTracked + sessionElapsedMs;
      const activeSecs = Math.max(0, Math.floor(totalElapsedMs / 1000));

      return {
        activeStr: formatSecs(activeSecs),
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
      const contentCopy = task.contentCopy || task.copy || "—";
      const revisionCount = task.reviewCycles?.length || 0;

      const { activeStr, totalStr } = computeTaskTimes(task);
      const approvalStr = computeApprovalStr(task);

      return [
        displayId,
        task.priority || "Medium",
        task.title || "",
        contentCopy,
        clientName,
        task.contentType || "NONE",
        task.status || "Not Started",
        activeStr,
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
      <div className="px-4 xl:px-6 pt-3 pb-3 flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
          {/* SEARCH INPUT */}
          <div className="relative w-full sm:w-auto flex-1 max-w-sm">
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-[12px] font-semibold bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/30 rounded-xl text-emerald-900 dark:text-emerald-100 placeholder-emerald-600/50 dark:placeholder-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* DATE FILTER */}
            <div className="relative" ref={dateDropdownRef}>
              <button
                type="button"
                onClick={() => setShowDateDropdown((prev) => !prev)}
                className={`flex items-center justify-between gap-1.5 px-3.5 py-1.5 rounded-full border text-[12px] font-bold transition-all shadow-sm cursor-pointer ${
                  dateFilter !== "All"
                    ? "bg-white border-blue-200 text-blue-600 dark:bg-blue-900/20 dark:border-blue-700/50 dark:text-blue-400"
                    : "bg-white border-slate-200 text-slate-700 dark:bg-[#151923] dark:border-slate-700/60 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <FiFilter className="text-blue-500" size={13} />
                  <span>
                    {dateFilter === "All" ? "Filter Date" : dateFilter}
                  </span>
                </div>
                <FiChevronDown
                  className={`text-slate-400 transition-transform duration-200 ${
                    showDateDropdown ? "rotate-180" : ""
                  }`}
                  size={13}
                />
              </button>

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
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-[12px] font-bold transition-all text-left cursor-pointer ${
                          dateFilter === option.value
                            ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                            : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
                        }`}
                      >
                        <span>{option.label}</span>
                        {dateFilter === option.value && (
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        )}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* FILTER BUTTON */}
            <button
              type="button"
              onClick={() => setFilterPanelOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-slate-200 bg-white text-slate-800 text-[12px] font-bold cursor-pointer transition-all shadow-sm hover:bg-slate-50 dark:bg-[#151923] dark:border-slate-700/60 dark:text-slate-200"
            >
              <FiFilter className="text-teal-500" size={13} />
              <span>Filter</span>
            </button>

            {/* EXPORT EXCEL BUTTON */}
            <button
              type="button"
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-emerald-400/60 bg-emerald-50 text-emerald-700 text-[12px] font-bold cursor-pointer transition-all hover:bg-emerald-100 shadow-sm shrink-0"
            >
              <FiDownload size={13} className="text-emerald-600" />
              <span>Export Excel</span>
            </button>

            {/* HIDE COLUMN BUTTON */}
            <div className="relative" ref={colsDropdownRef}>
              <button
                type="button"
                onClick={() => setIsColsOpen(!isColsOpen)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-slate-200 bg-white text-slate-800 text-[12px] font-bold cursor-pointer transition-all shadow-sm hover:bg-slate-50 dark:bg-[#151923] dark:border-slate-700/60 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <FiColumns className="text-indigo-500" size={13} />
                <span>Hide Column</span>
                {Object.values(hiddenColumns).filter(Boolean).length > 0 && (
                  <span className="text-[10px] font-black bg-indigo-500 text-white rounded-full w-4 h-4 flex items-center justify-center ml-0.5">
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
                    className="absolute right-0 mt-2 w-52 bg-white dark:bg-[#151725] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl p-2 z-[70] space-y-1 backdrop-blur-md"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-1.5 px-1 mb-1">
                      <span className="text-[12px] font-bold text-slate-800 dark:text-white tracking-wider">
                        Toggle Columns
                      </span>
                      {Object.values(hiddenColumns).some(Boolean) && (
                        <button
                          type="button"
                          onClick={() => setHiddenColumns({})}
                          className="text-[10px] text-blue-500 hover:text-blue-600 font-bold cursor-pointer"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                    <div className="max-h-[300px] overflow-y-auto custom-scrollbar pt-1 pr-1">
                      {[
                        { key: "id", label: "ID" },
                        { key: "priority", label: "Priority" },
                        { key: "taskName", label: "Task Name" },
                        { key: "client", label: "Client" },
                        { key: "contentType", label: "Content-type" },
                        { key: "status", label: "Status" },
                        { key: "activeTime", label: "Productivity" },
                        { key: "onHoldTime", label: "Unproductivity" },
                        { key: "holdReason", label: "Hold Reason" },
                        { key: "blockedTime", label: "Blocked" },
                        { key: "feedbackMom", label: "Feedback MOM" },
                        { key: "timeTracker", label: "Total time spent for this task " },
                        { key: "revision", label: "Revision" },
                        { key: "startDate", label: "Start Date" },
                        { key: "endDate", label: "Due Date" },
                        { key: "assignedBy", label: "Assigned By" },
                        { key: "approvalTime", label: "Approval Info" },
                        { key: "contentCopy", label: "Content Copy" },
                        { key: "createdTime", label: "Created Time" },
                      ].map((col) => (
                        <label
                          key={col.key}
                          className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={!hiddenColumns[col.key]}
                            onChange={(e) =>
                              setHiddenColumns((prev) => ({
                                ...prev,
                                [col.key]: !e.target.checked,
                              }))
                            }
                            className="w-3.5 h-3.5 rounded-md border-slate-300 text-blue-500 focus:ring-blue-500 cursor-pointer"
                          />
                          <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                            {col.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
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
                        name: "Not Started",
                        label: "Not Started",
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
            "Not Started",
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
          <div className="bg-white dark:bg-[#0f111a] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.2)] overflow-hidden  transition-all">
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
                        defaultClassName="px-3 py-2  w-16"
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
                    {!hiddenColumns.activeTime && (
                      <ResizableHeader
                        id="activeTime"
                        label="Productivity"
                        colWidths={colWidths}
                        handleMouseDown={handleMouseDown}
                        defaultClassName="px-3 py-2 border border-slate-200/70 dark:border-transparent w-36 whitespace-nowrap"
                      />
                    )}
                    {!hiddenColumns.onHoldTime && (
                      <ResizableHeader
                        id="onHoldTime"
                        label="Unproductivity"
                        colWidths={colWidths}
                        handleMouseDown={handleMouseDown}
                        defaultClassName="px-3 py-2 border border-slate-200/70 dark:border-transparent w-36 whitespace-nowrap"
                      />
                    )}
                    {!hiddenColumns.holdReason && (
                      <ResizableHeader
                        id="holdReason"
                        label="Hold Reason"
                        colWidths={colWidths}
                        handleMouseDown={handleMouseDown}
                        defaultClassName="px-3 py-2 border border-slate-200/70 dark:border-transparent min-w-[150px]"
                      />
                    )}
                    {!hiddenColumns.blockedTime && (
                      <ResizableHeader
                        id="blockedTime"
                        label="Blocked"
                        colWidths={colWidths}
                        handleMouseDown={handleMouseDown}
                        defaultClassName="px-3 py-2 border border-slate-200/70 dark:border-transparent w-36 whitespace-nowrap"
                      />
                    )}
                    {!hiddenColumns.timeTracker && (
                      <ResizableHeader
                        id="timeTracker"
                        label="Total time spent for this task "
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
                        defaultClassName="px-3 py-2 border border-slate-200/70 dark:border-transparent w-52 whitespace-nowrap"
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
                      const statusStyle = getStatusStyle(task.status);
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
                            {!hiddenColumns.id && (
                              <td className="px-3 py-2 border border-slate-200/70 dark:border-transparent font-bold text-[11px] text-slate-500 dark:text-slate-400 text-center">
                                {getTaskDisplayId(task)}
                              </td>
                            )}

                            {!hiddenColumns.priority && (
                              <td className="px-3 py-2 border border-slate-200/70 dark:border-transparent text-center">
                                <PriorityBadge
                                  priority={task.priority}
                                  isTopHigh={isSameDate(
                                    task.startDate,
                                    task.dueDate,
                                  )}
                                />
                              </td>
                            )}

                            {!hiddenColumns.taskName && (
                              <td className="px-3 py-2 font-bold border border-slate-200/70 dark:border-transparent text-left">
                                <div className="flex flex-col gap-0.5">
                                  <div
                                    className={`flex items-center gap-2 ${isCompleted ? "line-through text-slate-400" : "text-slate-800 dark:text-white"}`}
                                  >
                                    <BiFile
                                      size={25}
                                      className="text-slate-400 shrink-0"
                                    />
                                    <span
                                      className="text-sm font-black truncate max-w-[260px]"
                                      title={task.title}
                                    >
                                      {task.title}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2 ml-6 mt-1">
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
                                </div>
                              </td>
                            )}

                            {!hiddenColumns.client && (
                              <td className="px-3 py-4.5 border border-slate-200/70 dark:border-transparent text-center">
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
                                      <ClientBadge client={client} size="lg" />
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

                            {!hiddenColumns.contentType && (
                              <td className="px-3 py-2 border border-slate-200/70 dark:border-transparent whitespace-nowrap text-center">
                                <span
                                  className={`px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase bg-pink-50 text-pink-600 dark:bg-pink-500/10 dark:text-pink-400 whitespace-nowrap`}
                                >
                                  {task.contentType || "None"}
                                </span>
                              </td>
                            )}

                            {!hiddenColumns.status && (
                              <td
                                className="px-3 py-2 border border-slate-200/70 dark:border-transparent w-48 min-w-[180px] text-center"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {task.status === "Completed" ? (
                                  <div
                                    className={`px-3 py-3 text-[13px] flex items-center justify-center gap-1.5 shadow-2xs ${statusStyle.bg}`}
                                  >
                                    <span
                                      className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`}
                                    />
                                    Completed
                                  </div>
                                ) : task.status === "In Review" ? (
                                  <div
                                    className={`px-3 py-3 text-[13px] flex items-center justify-center gap-1.5 shadow-2xs ${statusStyle.bg}`}
                                  >
                                    <span
                                      className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`}
                                    />
                                    In Review
                                  </div>
                                ) : task.status === "Correction" ? (
                                  <div className="flex flex-col gap-1 items-center">
                                    <div
                                      className={`px-3 py-3 text-[13px] flex items-center justify-center gap-1.5 shadow-2xs ${statusStyle.bg}`}
                                    >
                                      <span
                                        className={`w-1.5 h-1.5 rounded-full animate-pulse ${statusStyle.dot}`}
                                      />
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
                                  <div
                                    className={`px-3 py-3 text-[13px] flex items-center justify-center gap-1.5 shadow-2xs ${statusStyle.bg}`}
                                  >
                                    <span
                                      className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`}
                                    />
                                    Rejected
                                  </div>
                                ) : (
                                  <div className="relative w-full group">
                                    <div
                                      className={`px-3 py-3 text-[13px] flex items-center justify-center gap-1.5 shadow-sm transition-all group-hover:shadow ${statusStyle.bg}`}
                                    >
                                      <span
                                        className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`}
                                      />
                                      <span className="pr-3 whitespace-nowrap">
                                        {task.status}
                                      </span>
                                      <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">
                                        <FiChevronDown
                                          size={10}
                                          strokeWidth={2.5}
                                        />
                                      </div>
                                    </div>
                                    <select
                                      value={task.status}
                                      onChange={(e) =>
                                        handleStatusChange(
                                          task._id,
                                          e.target.value,
                                        )
                                      }
                                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    >
                                      <option
                                        value="Not Started"
                                        className="bg-white dark:bg-gray-800 text-slate-700 dark:text-white"
                                      >
                                        Not Started
                                      </option>
                                      <option
                                        value="In Progress"
                                        className="bg-white dark:bg-gray-800 text-slate-700 dark:text-white"
                                      >
                                        In Progress
                                      </option>
                                      <option
                                        value="In Review"
                                        className="bg-white dark:bg-gray-800 text-slate-700 dark:text-white"
                                      >
                                        In Review
                                      </option>
                                      <option
                                        value="On Hold"
                                        className="bg-white dark:bg-gray-800 text-slate-700 dark:text-white"
                                      >
                                        On Hold
                                      </option>
                                    </select>
                                  </div>
                                )}
                              </td>
                            )}

                            {!hiddenColumns.activeTime && (
                              <td
                                className="px-3 py-2 border border-slate-200/70 dark:border-transparent min-w-[140px] text-center"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <WorkTimeCell
                                  task={task}
                                  dateFilter={dateFilter}
                                  officeHours={officeHours}
                                />
                              </td>
                            )}

                            {!hiddenColumns.onHoldTime && (
                              <td
                                className="px-3 py-2 border border-slate-200/70 dark:border-transparent min-w-[140px] text-center"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <OnHoldTimeCell
                                  task={task}
                                  dateFilter={dateFilter}
                                  officeHours={officeHours}
                                />
                              </td>
                            )}

                            {!hiddenColumns.holdReason && (
                              <td
                                className="px-3 py-2 border border-slate-200/70 dark:border-transparent min-w-[150px] text-center"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {(() => {
                                  if (task.status !== "On Hold") {
                                    return (
                                      <span className="text-slate-300 dark:text-slate-600 font-semibold text-xs">
                                        —
                                      </span>
                                    );
                                  }
                                  const holdEntry = [
                                    ...(task.statusHistory || []),
                                  ]
                                    .reverse()
                                    .find((h) => h.status === "On Hold");
                                  const reason = holdEntry?.reason;
                                  if (!reason) {
                                    return (
                                      <span className="text-slate-400 italic text-[10px]">
                                        No Reason
                                      </span>
                                    );
                                  }
                                  return (
                                    <span
                                      className="inline-block px-2.5 py-1 bg-amber-50 border border-amber-200/60 dark:border-amber-500/20 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-md text-[10.5px] font-bold shadow-sm truncate max-w-[130px]"
                                      title={reason}
                                    >
                                      {reason}
                                    </span>
                                  );
                                })()}
                              </td>
                            )}

                            {!hiddenColumns.blockedTime && (
                              <td
                                className="px-3 py-2 border border-slate-200/70 dark:border-transparent min-w-[140px] text-center"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <BlockedTimeCell
                                  task={task}
                                  dateFilter={dateFilter}
                                  officeHours={officeHours}
                                />
                              </td>
                            )}

                            {!hiddenColumns.timeTracker && (
                              <td
                                className="px-3 py-2 border border-slate-200/70 dark:border-transparent min-w-[140px] text-center"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <TodayTrackerCell
                                  task={task}
                                  dateFilter={dateFilter}
                                  officeHours={officeHours}
                                />
                              </td>
                            )}

                            {!hiddenColumns.revision && (
                              <td
                                className="px-3 py-2 border border-slate-200/70 dark:border-transparent w-28 text-center"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="flex justify-center items-center gap-1.5">
                                  <span className="font-extrabold text-[11px] text-slate-805 dark:text-yellow-50 text-center">
                                    {task.revisions || 0}
                                  </span>
                                </div>
                              </td>
                            )}

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

                            {!hiddenColumns.assignedBy && (
                              <td className="px-3 py-2 border border-slate-200/70 dark:border-transparent min-w-[180px] w-52 text-left">
                                <div className="flex items-center gap-2">
                                  {(() => {
                                    const assignerId =
                                      typeof task.assignedBy === "object"
                                        ? task.assignedBy?._id
                                        : task.assignedBy;
                                    const assignerUser =
                                      users.find((u) => u._id === assignerId) ||
                                      (typeof task.assignedBy === "object"
                                        ? task.assignedBy
                                        : null) ||
                                      task.createdBy;
                                    const profilePic =
                                      assignerUser?.profilePic ||
                                      assignerUser?.profile?.profilePic;
                                    const name =
                                      task.assignedBy?.name ||
                                      task.createdBy?.name ||
                                      "Internal";

                                    return (
                                      <>
                                        {profilePic ? (
                                          <img
                                            src={profilePic}
                                            alt={name}
                                            className="w-6 h-6 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0 shadow-sm"
                                          />
                                        ) : (
                                          <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-500 shrink-0 shadow-sm">
                                            {name.charAt(0).toUpperCase()}
                                          </div>
                                        )}
                                        <div className="flex flex-col">
                                          <span className="font-extrabold text-[11px] text-slate-800 dark:text-slate-200">
                                            {name}
                                          </span>
                                        </div>
                                      </>
                                    );
                                  })()}
                                </div>
                              </td>
                            )}

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

                            {!hiddenColumns.createdTime && (
                              <td className="px-3 py-2 border border-slate-200/70 dark:border-transparent text-center font-bold text-slate-500 dark:text-slate-400 text-xs sm:text-[11.5px]">
                                <CreatedTime time={task.createdAt} />
                              </td>
                            )}

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

                {totalPages > 1 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(1)}
                      title="First Page"
                      className="w-8 h-8 rounded-xl hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 flex items-center justify-center disabled:opacity-30 disabled:hover:bg-transparent text-slate-600 dark:text-slate-300 cursor-pointer transition-all"
                    >
                      <FiChevronsLeft size={16} />
                    </button>

                    <button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      title="Previous Page"
                      className="w-8 h-8 rounded-xl hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 flex items-center justify-center disabled:opacity-30 disabled:hover:bg-transparent text-slate-600 dark:text-slate-300 cursor-pointer transition-all"
                    >
                      <FiChevronLeft size={16} />
                    </button>

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
                  <h3 className="text-base font-extrabold text-slate-800 dark:text-white">
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
                  className="px-4.5 py-2.5 rounded-xl text-xs font-bold  text-slate-600 dark:text-white dark:hover:text-black transition-colors cursor-pointer"
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

      {/* HOLD MODAL */}
      <HoldTaskModal
        isOpen={!!holdModalData}
        onClose={() => setHoldModalData(null)}
        onSubmit={async (data) => {
          if (!holdModalData) return;
          try {
            await updateTaskTrigger({
              id: holdModalData.taskId,
              taskData: { ...data, relatedTaskId: data.relatedTaskId || null },
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
            toast.error(err?.data?.message || "Failed to place task on hold");
          } finally {
            setHoldModalData(null);
          }
        }}
        tasks={tasks.filter(
          (t) =>
            t._id !== holdModalData?.taskId &&
            !["Completed", "In Progress", "In Review"].includes(t.status),
        )}
      />

      {/* BLOCK MODAL */}
      <BlockTaskModal
        isOpen={!!blockModalData}
        onClose={() => setBlockModalData(null)}
        onSubmit={async (data) => {
          if (!blockModalData) return;
          try {
            await updateTaskTrigger({
              id: blockModalData.taskId,
              taskData: { ...data },
            }).unwrap();
            toast.success("Task marked as Blocked");
          } catch (err) {
            toast.error("Failed to mark task as blocked");
          }
          setBlockModalData(null);
        }}
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
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default MyTasksTab;
