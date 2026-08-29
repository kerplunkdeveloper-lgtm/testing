import React, {
  useMemo,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../../context/ThemeContext";
import {
  useGetTasksQuery,
  useUpdateTaskMutation,
} from "../../../features/api/apiSlice";
import { createPortal } from "react-dom";
import { io } from "socket.io-client";
import toast from "react-hot-toast";
import { getDesignerEodReports } from "../../../features/eodReports/designerEodReportSlice";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Filler,
} from "chart.js";
import { Doughnut, Line } from "react-chartjs-2";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Filler,
);

import {
  format,
  isToday,
  isPast,
  parseISO,
  differenceInDays,
  isYesterday,
  isTomorrow,
  isAfter,
  isBefore,
  startOfDay,
  endOfDay,
  subDays,
  isSameMonth,
  formatDistanceToNow,
  isSameDay,
  addDays,
} from "date-fns";
import { calculateBusinessMs } from "../../../utils/businessHours";
import axiosInstance from "../../../services/axiosInstance";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiClock,
  FiAlertCircle,
  FiActivity,
  FiFilter,
  FiChevronDown,
  FiCheckCircle,
  FiUsers,
  FiLayers,
  FiBriefcase,
  FiTrendingUp,
  FiXCircle,
  FiX,
  FiFileText,
  FiPlay,
  FiEye,
  FiPauseCircle,
  FiSearch,
  FiArrowRight,
  FiCalendar,
  FiChevronLeft,
  FiChevronRight,
  FiEdit3,
} from "react-icons/fi";

/**
 * Canonical logic to determine a task's assignment date in priority order:
 * 1. task.assignedDate
 * 2. task.assignedAt
 * 3. task.startDate
 * 4. task.createdAt
 */
export const getTaskAssignmentDate = (task) => {
  if (!task) return null;
  return (
    task.assignedDate ||
    task.assignedAt ||
    task.startDate ||
    task.createdAt ||
    null
  );
};

export const isStatusInProgress = (s) =>
  (s || "").trim().toUpperCase().replace(/[-_]/g, " ") === "IN PROGRESS";

/**
 * Single source of truth to calculate actual worked time for a task
 * belonging to a specific calendar date (selectedDate).
 */
export const calculateTaskProductivityForDate = (
  task,
  selectedDate = new Date(),
  officeHours = { startHour: 9, endHour: 19 },
) => {
  if (!task) return 0;

  const selDateObj = selectedDate
    ? typeof selectedDate === "string"
      ? parseISO(selectedDate)
      : new Date(selectedDate)
    : new Date();

  const startHour = officeHours?.startHour ?? 9;
  const endHour = officeHours?.endHour ?? 19;

  // Office-hours boundaries for selectedDate (local time) — used by both paths
  const dayWorkStart = new Date(
    selDateObj.getFullYear(),
    selDateObj.getMonth(),
    selDateObj.getDate(),
    startHour,
    0,
    0,
    0,
  ).getTime();

  const dayWorkEnd = new Date(
    selDateObj.getFullYear(),
    selDateObj.getMonth(),
    selDateObj.getDate(),
    endHour,
    0,
    0,
    0,
  ).getTime();

  // Guard: Never generate artificial productivity for a future date
  if (dayWorkStart > Date.now()) return 0;

  // Calculate subtasks productivity if any
  let subtasksDuration = 0;
  if (
    task.subtasks &&
    Array.isArray(task.subtasks) &&
    task.subtasks.length > 0
  ) {
    task.subtasks.forEach((sub) => {
      subtasksDuration += calculateTaskProductivityForDate(
        sub,
        selectedDate,
        officeHours,
      );
    });
  }

  // 0. PRIMARY PATH: Use statusHistory for accurate per-day tracking
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
      const isProductiveHold =
        h.status === "On Hold" &&
        (h.reason === "Client Call" || h.reason === "Meeting");
      if (!isStatusInProgress(h.status) && !isProductiveHold) return;

      let entryDate = h.date;
      if (entryDate && entryDate.includes(",")) {
        try {
          entryDate = new Date(entryDate).toLocaleDateString("en-CA", {
            timeZone: "Asia/Kolkata",
          });
        } catch (e) {}
      }
      if (!entryDate || entryDate.includes(",")) {
        entryDate = h.startTime
          ? new Date(h.startTime).toLocaleDateString("en-CA", {
              timeZone: "Asia/Kolkata",
            })
          : null;
      }
      if (entryDate !== selDateStr) return;

      if (h.duration > 0) {
        // ✅ Properly closed entry — use the recorded duration directly
        historyDuration += h.duration;
      } else if (h.endTime) {
        // Closed but duration field wasn't saved — derive from timestamps
        historyDuration += Math.max(
          0,
          new Date(h.endTime).getTime() - new Date(h.startTime).getTime(),
        );
      } else if (
        isSelectedToday &&
        (isStatusInProgress(task.status) ||
          (task.status === "On Hold" && isProductiveHold)) &&
        !task.autoPaused
      ) {
        // Open entry on TODAY, still running — handled by live section below, skip here
      } else {
        // ✅ FIX Bug 1: Open entry (endTime=null, duration=0) on a PAST date
        // or an autoPaused entry — cap contribution at that day's EOD / pausedAt
        const entryStartMs = new Date(h.startTime).getTime();
        const pauseTime = task.pausedAt || task.holdStartedAt;
        const capEnd = pauseTime
          ? Math.min(new Date(pauseTime).getTime(), dayWorkEnd)
          : dayWorkEnd;
        historyDuration += Math.max(
          0,
          Math.min(capEnd, dayWorkEnd) - Math.max(entryStartMs, dayWorkStart),
        );
      }
    });

    // ✅ FIX Bug 3: Live session guard — fallback to statusHistory open entry or updatedAt if actualStartTime is missing
    const currentIsProductiveHold =
      task.status === "On Hold" &&
      task.statusHistory &&
      task.statusHistory.length > 0 &&
      (task.statusHistory[task.statusHistory.length - 1].reason ===
        "Client Call" ||
        task.statusHistory[task.statusHistory.length - 1].reason === "Meeting");

    if (
      isSelectedToday &&
      (isStatusInProgress(task.status) || currentIsProductiveHold) &&
      !task.autoPaused
    ) {
      let liveSessionStart = 0;

      // 1. Try to find the open entry in status history (most accurate for current chunk)
      if (task.statusHistory && Array.isArray(task.statusHistory)) {
        const openEntry = [...task.statusHistory]
          .reverse()
          .find(
            (h) =>
              (isStatusInProgress(h.status) ||
                (h.status === "On Hold" &&
                  (h.reason === "Client Call" || h.reason === "Meeting"))) &&
              !h.endTime,
          );
        if (openEntry && openEntry.startTime) {
          liveSessionStart = new Date(openEntry.startTime).getTime();
        }
      }

      // 2. Fallback to actualStartTime or holdStartedAt
      if (isNaN(liveSessionStart) || liveSessionStart <= 0) {
        if (isStatusInProgress(task.status) && task.actualStartTime) {
          liveSessionStart = new Date(task.actualStartTime).getTime();
        } else if (currentIsProductiveHold && task.holdStartedAt) {
          liveSessionStart = new Date(task.holdStartedAt).getTime();
        }
      }
      
      // 3. Fallback to updatedAt
      if (isNaN(liveSessionStart) || liveSessionStart <= 0) {
        if (task.updatedAt) {
          liveSessionStart = new Date(task.updatedAt).getTime();
        }
      }

      const liveSessionDateStr =
        liveSessionStart > 0
          ? new Date(liveSessionStart).toLocaleDateString("en-CA", {
              timeZone: "Asia/Kolkata",
            })
          : null;

      // Only add live elapsed time if liveSessionStart is valid
      if (
        liveSessionStart > 0 &&
        (liveSessionDateStr === selDateStr || isSelectedToday)
      ) {
        const nowMs = Math.min(Date.now(), dayWorkEnd);
        // Ensure we only calculate time that occurred within today's working hours
        const effectiveLiveStart = Math.max(liveSessionStart, dayWorkStart);
        let liveWorked = Math.max(0, nowMs - effectiveLiveStart);
        
        if (task.blockerHistory && Array.isArray(task.blockerHistory)) {
          task.blockerHistory.forEach((b) => {
            if (b.pausedAt) {
              const p = new Date(b.pausedAt).getTime();
              const r = b.resumedAt ? new Date(b.resumedAt).getTime() : nowMs;
              const oStart = Math.max(p, effectiveLiveStart);
              const oEnd = Math.min(r, nowMs);
              if (oEnd > oStart) {
                liveWorked -= oEnd - oStart;
              }
            }
          });
        }
        if (task.isBlocked && task.blockerPausedAt) {
          const p = new Date(task.blockerPausedAt).getTime();
          const oStart = Math.max(p, effectiveLiveStart);
          if (nowMs > oStart) {
            liveWorked -= nowMs - oStart;
          }
        }
        return (
          Math.max(0, historyDuration + Math.max(0, liveWorked)) +
          subtasksDuration
        );
      }
    }

    if (
      historyDuration > 0 ||
      (task.statusHistory.length > 0 && !task.actualStartTime)
    ) {
      return historyDuration + subtasksDuration;
    }
  }

  if (!task.actualStartTime) {
    const selDateStr = selDateObj.toLocaleDateString("en-CA", {
      timeZone: "Asia/Kolkata",
    });
    const isSelectedToday = isSameDay(selDateObj, new Date());
    const baseTracked = isSelectedToday
      ? task.dailyTrackedTime || 0
      : task.totalTrackedTime || 0;
    return baseTracked + subtasksDuration;
  }

  // FALLBACK PATH: No usable statusHistory — estimate from actualStartTime
  const taskStart = new Date(task.actualStartTime).getTime();
  if (isNaN(taskStart)) return 0;

  // Guard 2: Task started after this day's office hours ended
  if (taskStart >= dayWorkEnd) return 0;

  // 2. Determine when task's working period stopped or paused for the Designer
  const statusUpper = (task.status || "").trim().toUpperCase();

  let taskEnd;

  if (
    statusUpper === "IN REVIEW" ||
    statusUpper === "IN_REVIEW" ||
    statusUpper === "IN-REVIEW"
  ) {
    // DESIGNER SIDE: "In Review" means Designer FINISHED work and submitted it.
    // Designer productivity MUST STOP when task moves from "In Progress" to "In Review".
    taskEnd = new Date(
      task.reviewStartedAt ||
        task.lastReviewStartedAt ||
        task.pausedAt ||
        task.actualEndTime ||
        task.updatedAt,
    ).getTime();
  } else if (statusUpper === "COMPLETED") {
    // SOCIAL MEDIA MANAGER SIDE: "Completed" means Manager approved work.
    // Moving "In Review" -> "Completed" is NOT additional Designer working time.
    // If the task was submitted to "In Review", Designer work stopped at review submission time.
    // ✅ FIX Bug 4: Use LAST review cycle (not [0]) — multi-correction tasks end at final review
    const reviewTime =
      task.reviewStartedAt ||
      task.lastReviewStartedAt ||
      (task.reviewCycles && task.reviewCycles.length > 0
        ? task.reviewCycles[task.reviewCycles.length - 1].startedAt
        : null);

    taskEnd = reviewTime
      ? new Date(reviewTime).getTime()
      : new Date(
          task.actualEndTime || task.completedAt || task.updatedAt,
        ).getTime();
  } else if (
    statusUpper === "ON HOLD" ||
    statusUpper === "ON_HOLD" ||
    statusUpper === "CORRECTION"
  ) {
    taskEnd = new Date(
      task.pausedAt || task.actualEndTime || task.updatedAt,
    ).getTime();
  } else if (statusUpper === "REJECTED") {
    taskEnd = new Date(
      task.actualEndTime || task.completedAt || task.pausedAt || task.updatedAt,
    ).getTime();
  } else if (statusUpper === "IN PROGRESS" || statusUpper === "IN_PROGRESS") {
    if (task.autoPaused) {
      taskEnd = new Date(task.pausedAt || Date.now()).getTime();
    } else {
      taskEnd = isSameDay(selDateObj, new Date()) ? Date.now() : dayWorkEnd;
    }
  } else {
    // Default fallback (e.g. Pending)
    if (task.actualEndTime) {
      taskEnd = new Date(task.actualEndTime).getTime();
    } else if (task.pausedAt) {
      taskEnd = new Date(task.pausedAt).getTime();
    } else {
      taskEnd = isSameDay(selDateObj, new Date()) ? Date.now() : dayWorkEnd;
    }
  }

  if (isNaN(taskEnd) || taskEnd <= taskStart) return 0;

  // Guard 3: If taskEnd is before selectedDate's office hours started
  if (taskEnd <= dayWorkStart) return 0;

  // 3. Intersect task working period [taskStart, taskEnd] with office hours window [dayWorkStart, dayWorkEnd]
  const effectiveStart = Math.max(taskStart, dayWorkStart);
  const effectiveEnd = Math.min(taskEnd, dayWorkEnd);

  const daySpan = Math.max(0, effectiveEnd - effectiveStart);
  if (daySpan <= 0) return 0;

  // 4. Calculate pause duration that falls inside the office-hours window
  const isPausedState =
    ((statusUpper === "IN PROGRESS" || statusUpper === "IN_PROGRESS") &&
      task.autoPaused) ||
    [
      "ON HOLD",
      "ON_HOLD",
      "REJECTED",
      "IN REVIEW",
      "IN_REVIEW",
      "IN-REVIEW",
      "CORRECTION",
    ].includes(statusUpper);

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
          : isPausedState && task.pausedAt
            ? new Date(task.pausedAt).getTime()
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

  // ✅ FIX Bug 5: Only use totalPausedMs when NO blockerHistory exists
  // Blockers happen on specific days — proportional distribution across all days is incorrect
  if (!hasHistoryPause) {
    const totalPaused = task.totalPausedMs || 0;
    if (totalPaused > 0) {
      const lifetimeSpan = Math.max(
        1,
        new Date(task.actualEndTime || Date.now()).getTime() - taskStart,
      );
      const ratio = daySpan / lifetimeSpan;
      dayPausedMs = Math.min(daySpan, totalPaused * ratio);
    }
  }

  return Math.max(0, daySpan - dayPausedMs) + subtasksDuration;
};

const LiveProductivityCell = React.memo(
  ({
    tasks = [],
    initialLoggedMs = 0,
    selectedDate = new Date(),
    officeHours = { startHour: 9, endHour: 19 },
  }) => {
    const isSelectedDateToday = useMemo(() => {
      return isSameDay(selectedDate || new Date(), new Date());
    }, [selectedDate]);

    const hasInProgress = useMemo(() => {
      return tasks.some(
        (t) => t.status === "In Progress" && !t.actualEndTime && !t.autoPaused,
      );
    }, [tasks]);

    const hasInReview = useMemo(() => {
      return tasks.some((t) => {
        const s = (t.status || "").toLowerCase();
        return (s === "in review" || s === "in-review") && !t.actualEndTime;
      });
    }, [tasks]);

    const calculateTotalLogged = useCallback(() => {
      let total = 0;
      const selDateObj = selectedDate ? new Date(selectedDate) : new Date();
      const selDateStr = selDateObj.toLocaleDateString("en-CA", {
        timeZone: "Asia/Kolkata",
      });

      tasks.forEach((t) => {
        let taskTotal = calculateTaskProductivityForDate(
          t,
          selectedDate,
          officeHours,
        );

        let blockerMs = 0;
        if (t && Array.isArray(t.blockerHistory)) {
          t.blockerHistory.forEach((b) => {
            if (!b.pausedAt) return;
            const pDate = new Date(b.pausedAt).toLocaleDateString("en-CA", {
              timeZone: "Asia/Kolkata",
            });
            const pMs = new Date(b.pausedAt).getTime();
            const rMs = b.resumedAt
              ? new Date(b.resumedAt).getTime()
              : Date.now();
            if (pDate === selDateStr) {
              blockerMs += Math.max(0, rMs - pMs);
            }
          });
        }
        if (t && t.isBlocked && t.blockerPausedAt) {
          const pDate = new Date(t.blockerPausedAt).toLocaleDateString(
            "en-CA",
            { timeZone: "Asia/Kolkata" },
          );
          if (pDate === selDateStr) {
            blockerMs += Math.max(
              0,
              Date.now() - new Date(t.blockerPausedAt).getTime(),
            );
          }
        }

        total += taskTotal + blockerMs;
      });
      return total;
    }, [tasks, selectedDate, officeHours]);

    const [liveMs, setLiveMs] = useState(() => calculateTotalLogged());

    useEffect(() => {
      setLiveMs(calculateTotalLogged());
      if (isSelectedDateToday && hasInProgress) {
        const interval = setInterval(() => {
          setLiveMs(calculateTotalLogged());
        }, 1000);
        return () => clearInterval(interval);
      }
    }, [
      tasks,
      selectedDate,
      isSelectedDateToday,
      hasInProgress,
      calculateTotalLogged,
    ]);

    const formatLoggedDuration = (ms, includeSeconds = false) => {
      if (!ms || ms <= 0) return includeSeconds ? "0m 0s" : "0m";
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

    if (isSelectedDateToday && hasInProgress) {
      return (
        <div className="flex items-center justify-center gap-1 whitespace-nowrap">
          <span
            className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0"
            title="Running"
          />
          <span className="text-emerald-700 dark:text-emerald-300 font-black text-[12px] whitespace-nowrap">
            {formatLoggedDuration(liveMs, true)}
          </span>
        </div>
      );
    }

    if (!liveMs || liveMs <= 0) {
      return (
        <span className="text-slate-400 dark:text-slate-500 font-semibold text-[10.5px] italic whitespace-nowrap">
          Not started
        </span>
      );
    }

    return (
      <span className="text-slate-700 dark:text-slate-300 font-black text-[12px] whitespace-nowrap">
        {formatLoggedDuration(liveMs)}
      </span>
    );
  },
);

const LiveTotalProductivityCell = React.memo(
  ({
    teamPerformance = [],
    selectedDate = new Date(),
    officeHours = { startHour: 9, endHour: 19 },
  }) => {
    const isSelectedDateToday = useMemo(() => {
      return isSameDay(selectedDate || new Date(), new Date());
    }, [selectedDate]);

    // Check if any designer has an active task running
    const hasAnyInProgress = useMemo(() => {
      return teamPerformance.some((tp) =>
        (tp.tasks || []).some(
          (t) =>
            t.status === "In Progress" && !t.actualEndTime && !t.autoPaused,
        ),
      );
    }, [teamPerformance]);

    const calculateGrandTotal = useCallback(() => {
      let grandTotal = 0;
      teamPerformance.forEach((tp) => {
        (tp.tasks || []).forEach((t) => {
          grandTotal += calculateTaskProductivityForDate(
            t,
            selectedDate,
            officeHours,
          );
        });
      });
      return grandTotal;
    }, [teamPerformance, selectedDate, officeHours]);

    const [liveMs, setLiveMs] = useState(() => calculateGrandTotal());

    useEffect(() => {
      setLiveMs(calculateGrandTotal());
      if (isSelectedDateToday && hasAnyInProgress) {
        const interval = setInterval(() => {
          setLiveMs(calculateGrandTotal());
        }, 1000);
        return () => clearInterval(interval);
      }
    }, [
      teamPerformance,
      selectedDate,
      isSelectedDateToday,
      hasAnyInProgress,
      calculateGrandTotal,
    ]);

    const formatGrandTotal = (ms) => {
      if (!ms || ms <= 0) return "0m";
      const totalSecs = Math.floor(ms / 1000);
      const h = Math.floor(totalSecs / 3600);
      const m = Math.floor((totalSecs % 3600) / 60);
      const mStr = String(m).padStart(2, "0");
      return h > 0 ? `${h}h ${mStr}m` : `${m}m`;
    };

    return (
      <span className="text-[12px] font-black text-white whitespace-nowrap">
        {formatGrandTotal(liveMs)}
      </span>
    );
  },
);

const StatusCellValue = React.memo(
  ({
    todayVal = 0,
    carryVal = 0,
    activeTextClass = "",
    inactiveTextClass = "text-slate-400 dark:text-slate-600",
    badgeClass = "",
    showRunningIndicator = false,
  }) => {
    const hasToday = todayVal > 0;
    const hasCarry = carryVal > 0;

    return (
      <div className="flex items-center justify-center gap-1.5 py-0.5 min-h-[24px] group">
        {/* Main value (Today's count) */}
        <div className="flex items-center justify-center gap-0.5">
          <span
            className={`text-[13.5px] font-black tracking-tight transition-all duration-200 group-hover:scale-105 ${
              hasToday ? activeTextClass : inactiveTextClass
            }`}
          >
            {todayVal}
          </span>
          {showRunningIndicator && hasToday && (
            <span className="relative flex h-1.5 w-1.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-500"></span>
            </span>
          )}
        </div>

        {/* Carry Forward Badge */}
        {hasCarry ? (
          <span
            className={`inline-flex items-center px-1.5 py-0.3 rounded-full text-[9px] font-black tracking-wider uppercase border shadow-3xs transition-all duration-300 hover:scale-105 hover:-translate-y-0.5 shrink-0 ${badgeClass}`}
            title={`${carryVal} Carry Forward`}
          >
            {carryVal} CF
          </span>
        ) : (
          <span className="text-[10px] font-bold text-slate-300 dark:text-slate-700 opacity-40 select-none w-3 text-center">
            -
          </span>
        )}
      </div>
    );
  },
);

const ApprovalTimelineCell = React.memo(({ task }) => {
  const [showPopup, setShowPopup] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [now, setNow] = useState(Date.now());
  const buttonRef = useRef(null);
  const popupRef = useRef(null);

  const effectiveReviewStart =
    task?.reviewStartedAt ||
    task?.lastReviewStartedAt ||
    (task?.reviewCycles && task.reviewCycles.length > 0
      ? task.reviewCycles[task.reviewCycles.length - 1]?.startedAt
      : null);

  const statusLower = (task?.status || "").toLowerCase();
  const isCompleted = !!(task?.completedAt || task?.approvedAt);
  const isInReview =
    (statusLower.includes("review") || statusLower.includes("revision")) &&
    !isCompleted;

  // Live timer interval for tasks currently in review/waiting
  useEffect(() => {
    if (isInReview && effectiveReviewStart) {
      const interval = setInterval(() => {
        setNow(Date.now());
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isInReview, effectiveReviewStart]);

  let totalWaitMs = task?.approvalWaitingMs || 0;
  if (effectiveReviewStart) {
    if (isCompleted) {
      totalWaitMs =
        totalWaitMs ||
        calculateBusinessMs(
          effectiveReviewStart,
          task.completedAt || task.approvedAt,
        );
    } else {
      totalWaitMs =
        totalWaitMs + calculateBusinessMs(effectiveReviewStart, new Date(now));
    }
  }

  if (!effectiveReviewStart && !isCompleted && totalWaitMs <= 0) {
    return (
      <span className="text-slate-400 dark:text-slate-600 font-bold">—</span>
    );
  }

  const formatApprovalDate = (dateStr) => {
    if (!dateStr) return null;
    try {
      const d = parseISO(dateStr);
      return {
        dateFormatted: `${format(d, "dd MMM")} · ${format(d, "hh:mm a")}`,
        relative: formatDistanceToNow(d) + " ago",
      };
    } catch (e) {
      return null;
    }
  };

  const revInfo = formatApprovalDate(effectiveReviewStart);
  const doneInfo = formatApprovalDate(task?.completedAt || task?.approvedAt);

  let tookText = "";
  if (totalWaitMs > 0) {
    const totalSecs = Math.floor(totalWaitMs / 1000);
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    tookText = h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`;
  }

  const handleToggle = (e) => {
    e.stopPropagation();
    if (!showPopup && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const popoverWidth = 270;
      const popoverHeight = revInfo && doneInfo ? 230 : 160;

      let top = rect.top - popoverHeight - 8;
      if (top < 10) {
        top = rect.bottom + 8;
      }
      let left = rect.right - popoverWidth;
      if (left < 10) left = 10;
      if (left + popoverWidth > window.innerWidth - 10) {
        left = window.innerWidth - popoverWidth - 10;
      }
      setCoords({ top, left });
    }
    setShowPopup(!showPopup);
  };

  return (
    <div className="relative inline-flex items-center gap-1.5 justify-center">
      {/* Badge Button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10.5px] font-black tracking-wide border shadow-sm transition-all hover:scale-[1.03] cursor-pointer ${
          isInReview
            ? "bg-[#fefce8] text-[#b45309] border-[#fde68a] dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/40"
            : "bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900/40"
        }`}
      >
        <span
          className={`w-2 h-2 rounded-full shrink-0 ${
            isInReview
              ? "bg-[#f59e0b] animate-pulse"
              : "bg-purple-500 dark:bg-purple-400"
          }`}
        />
        <span>
          {isInReview
            ? tookText
              ? `Waiting ${tookText}`
              : "Waiting"
            : tookText
              ? `Took ${tookText}`
              : "Timeline"}
        </span>
        <FiEye
          size={13}
          className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 ml-0.5 shrink-0 transition-colors"
        />
      </button>

      {/* Details Popup rendered via Portal matching Reference Image */}
      {showPopup &&
        createPortal(
          <div className="fixed inset-0 z-[99999] pointer-events-none">
            {/* Click outside backdrop */}
            <div
              className="fixed inset-0 pointer-events-auto bg-black/10 dark:bg-black/40"
              onClick={() => setShowPopup(false)}
            />

            <motion.div
              ref={popupRef}
              initial={{ opacity: 0, scale: 0.95, y: 4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 4 }}
              transition={{ duration: 0.15 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                position: "fixed",
                top: coords.top,
                left: coords.left,
              }}
              className="pointer-events-auto w-[270px] bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-left"
            >
              {/* Header */}
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-[#0f172a]">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  TIMELINE DETAILS
                </span>
                <button
                  type="button"
                  onClick={() => setShowPopup(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <FiX size={13} />
                </button>
              </div>

              {/* Body */}
              <div className="p-3.5 flex flex-col gap-3 bg-white dark:bg-[#0f172a]">
                {/* Review Start Card */}
                {revInfo && (
                  <div className="flex flex-col gap-0.5 bg-slate-50/80 dark:bg-slate-900/60 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
                    <span className="text-[10px] font-black text-[#8b5cf6] dark:text-[#a78bfa] uppercase tracking-widest">
                      REVIEW START
                    </span>
                    <span className="font-extrabold text-slate-800 dark:text-white text-[13px] mt-1 leading-snug">
                      {revInfo.dateFormatted}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                      {revInfo.relative}
                    </span>
                  </div>
                )}

                {/* Completed Card */}
                {doneInfo && (
                  <div className="flex flex-col gap-0.5 bg-emerald-50/50 dark:bg-emerald-950/20 p-3.5 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 shadow-sm">
                    <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                      COMPLETED
                    </span>
                    <span className="font-extrabold text-slate-800 dark:text-white text-[13px] mt-1 leading-snug">
                      {doneInfo.dateFormatted}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                      {doneInfo.relative}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          </div>,
          document.body,
        )}
    </div>
  );
});

const getPriorityStyle = (priority) => {
  const p = priority?.toLowerCase() || "";
  if (p.includes("top high"))
    return "bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/30";
  if (p.includes("high"))
    return "bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/30";
  if (p.includes("medium"))
    return "bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/30";
  if (p.includes("low"))
    return "bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/30";
  return "bg-slate-50 text-slate-500 border border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800";
};

const getDaysRemaining = (dueDateStr, referenceDate = new Date()) => {
  if (!dueDateStr) return null;
  const dueDate = new Date(dueDateStr);
  dueDate.setHours(0, 0, 0, 0);
  const refDate = new Date(referenceDate);
  refDate.setHours(0, 0, 0, 0);
  const diffTime = dueDate.getTime() - refDate.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const splitTasksByDateCategory = (columnTasks, colName, selectedDate) => {
  const isCompletedCol = colName.toLowerCase() === "completed";

  const selStart = startOfDay(selectedDate || new Date());
  const selEnd = endOfDay(selectedDate || new Date());

  const previousTasks = [];
  const todayTasks = [];
  const upcomingTasks = [];

  const parseVal = (v) => {
    if (!v) return null;
    if (v instanceof Date) return v;
    if (typeof v === "string") {
      const p = parseISO(v);
      if (!isNaN(p.getTime())) return p;
    }
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  };

  columnTasks.forEach((t) => {
    let taskDate = null;
    if (isCompletedCol) {
      taskDate =
        parseVal(t.completedAt) ||
        parseVal(t.updatedAt) ||
        parseVal(t.dueDate) ||
        parseVal(t.createdAt);
    } else {
      taskDate =
        parseVal(t.dueDate) || parseVal(t.startDate) || parseVal(t.createdAt);
    }

    if (!taskDate || isNaN(taskDate.getTime())) {
      todayTasks.push(t);
      return;
    }

    if (isSameDay(taskDate, selectedDate || new Date())) {
      todayTasks.push(t);
    } else if (isBefore(taskDate, selStart)) {
      previousTasks.push(t);
    } else if (isAfter(taskDate, selEnd)) {
      upcomingTasks.push(t);
    } else {
      todayTasks.push(t);
    }
  });

  upcomingTasks.sort((a, b) => {
    const dA = a.dueDate ? new Date(a.dueDate) : new Date(0);
    const dB = b.dueDate ? new Date(b.dueDate) : new Date(0);
    return dA - dB;
  });

  return { previousTasks, todayTasks, upcomingTasks };
};

const getSectionConfig = (colName, type) => {
  const colLower = colName.toLowerCase();

  let prevTitle = `Prev ${colName}`;
  let todayTitle = `Today ${colName}`;
  let upcomingTitle = `Upcoming ${colName}`;

  if (colLower === "overall overdue") {
    prevTitle = "Prev Overdue";
    todayTitle = "Due Today";
    upcomingTitle = "Upcoming Due";
  } else if (colLower === "in progress") {
    prevTitle = "Prev In Progress";
    todayTitle = "Today In Progress";
    upcomingTitle = "Upcoming In Progress";
  } else if (colLower === "on hold") {
    prevTitle = "Prev On Hold";
    todayTitle = "Today On Hold";
    upcomingTitle = "Upcoming On Hold";
  } else if (colLower === "in review") {
    prevTitle = "Prev In Review";
    todayTitle = "Today In Review";
    upcomingTitle = "Upcoming In Review";
  } else if (colLower === "completed") {
    prevTitle = "Prev Completed";
    todayTitle = "Today Completed";
    upcomingTitle = "Upcoming Completed";
  } else if (colLower === "pending") {
    prevTitle = "Prev Not Started";
    todayTitle = "Today Not Started";
    upcomingTitle = "Upcoming Not Started";
  }

  if (type === "prev") {
    return {
      title: prevTitle,
      badgeContainer:
        "bg-rose-100/60 dark:bg-rose-950/30 border-rose-200/40 dark:border-rose-900/40",
      titleColor: "text-rose-600 dark:text-rose-400",
      countBadge:
        "text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-900/60",
      emptyText: `No previous ${colName.toLowerCase()} tasks`,
    };
  }
  if (type === "today") {
    return {
      title: todayTitle,
      badgeContainer:
        "bg-amber-100/60 dark:bg-amber-950/30 border-amber-200/40 dark:border-amber-900/40",
      titleColor: "text-amber-600 dark:text-amber-400",
      countBadge:
        "text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/60",
      emptyText: `No ${colName.toLowerCase()} tasks today`,
    };
  }
  return {
    title: upcomingTitle,
    badgeContainer:
      "bg-blue-100/60 dark:bg-blue-950/30 border-blue-200/40 dark:border-blue-900/40",
    titleColor: "text-blue-600 dark:text-blue-400",
    countBadge:
      "text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/60",
    emptyText: `No upcoming ${colName.toLowerCase()} tasks`,
  };
};

const GraphicDesignerDashboard = ({ targetDept = "Graphic Designer" }) => {
  const dispatch = useDispatch();
  const { theme } = useTheme();
  const performanceTableRef = useRef(null);
  const boardScrollRef = useRef(null);
  const navigate = useNavigate();

  const scrollBoard = (direction) => {
    if (boardScrollRef.current) {
      const scrollAmount = direction === "left" ? -320 : 320;
      boardScrollRef.current.scrollBy({
        left: scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const handleMetricClick = (status) => {
    let mappedFilter = "Today";
    if (isToday(selectedDate)) mappedFilter = "Today";
    else if (isYesterday(selectedDate)) mappedFilter = "Yesterday";
    else mappedFilter = format(selectedDate, "yyyy-MM-dd");

    localStorage.setItem("task_date_filter", mappedFilter);
    if (targetDept) {
      localStorage.setItem("task_department_filter", targetDept);
    }
    const deptQuery = targetDept
      ? `&department=${encodeURIComponent(targetDept)}`
      : "";
    navigate(
      `/${user?.role || "team"}/tasks?status=${encodeURIComponent(status)}${deptQuery}`,
    );
  };
  const isDarkMode =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  const { user } = useSelector((state) => state.auth);
  const { users } = useSelector((state) => state.users);
  const { projects } = useSelector((state) => state.projects);
  const { clients } = useSelector((state) => state.clients);
  const designerEodState = useSelector((state) => state.designerEodReports);
  const designerEodReports = designerEodState?.designerEodReports || [];
  const {
    data: allTasks = [],
    isLoading,
    refetch: refetchTasks,
  } = useGetTasksQuery();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDropdown, setShowDropdown] = useState(false);
  const [approvalModal, setApprovalModal] = useState({
    open: false,
    designerName: "",
    tasks: [],
  });
  const [viewTasksModal, setViewTasksModal] = useState({
    open: false,
    designerId: null,
    designerName: "",
  });

  const [onlineUserIds, setOnlineUserIds] = useState([]);

  useEffect(() => {
    try {
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

      const userId = user?._id || user?.id;
      if (userId) {
        socket.emit("join", userId);
      }

      socket.on("online_users_list", (usersList) => {
        if (Array.isArray(usersList)) {
          setOnlineUserIds(usersList);
        }
      });

      socket.on("task_updated", () => {
        refetchTasks();
      });

      return () => {
        socket.disconnect();
      };
    } catch (err) {}
  }, [user]);

  const [officeHours, setOfficeHours] = useState({ startHour: 9, endHour: 19 });
  useEffect(() => {
    const fetchOfficeHours = async () => {
      try {
        const { data } = await axiosInstance.get("/settings/office-hours");
        if (data?.success) {
          setOfficeHours({
            startHour: data.data.startHour,
            endHour: data.data.endHour,
          });
        }
      } catch (err) {}
    };
    fetchOfficeHours();
  }, []);
  const [taskTab, setTaskTab] = useState("all");
  const [taskSearch, setTaskSearch] = useState("");
  const [modalGroupTab, setModalGroupTab] = useState("assignedToday");
  const [bottleneckClient, setBottleneckClient] = useState("All Clients");
  const [bottleneckCreator, setBottleneckCreator] = useState("All Creators");
  const [bottleneckAssignee, setBottleneckAssignee] = useState("All Assignees");
  const [bottleneckStatus, setBottleneckStatus] = useState("All Statuses");
  const [updateTask] = useUpdateTaskMutation();

  // Live Task Board filter state
  const [boardFilter, setBoardFilter] = useState({
    search: "",
    assignee: "All",
    priority: "All",
    client: "All",
  });
  const [showBoardFilter, setShowBoardFilter] = useState(false);

  useEffect(() => {
    const params = {};
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
    const day = String(selectedDate.getDate()).padStart(2, "0");
    params.date = `${year}-${month}-${day}`;
    dispatch(getDesignerEodReports(params));
  }, [dispatch, selectedDate]);

  // 1. Filter Department Members dynamically based on targetDept
  const designers = useMemo(() => {
    const deptLower = targetDept.toLowerCase();
    const baseDesigners =
      users?.filter((u) => {
        const uDept = u.department?.toLowerCase() || "";
        if (deptLower.includes("graphic")) {
          return uDept.includes("graphic") || uDept.includes("design");
        }
        if (
          deptLower.includes("videographer") ||
          deptLower.includes("video") ||
          deptLower.includes("cinema") ||
          deptLower.includes("cinematog")
        ) {
          return (
            uDept.includes("video") ||
            uDept.includes("edit") ||
            uDept.includes("cinema") ||
            uDept.includes("cinematog")
          );
        }
        if (deptLower.includes("mobile")) {
          return (
            uDept.includes("mobile") ||
            uDept.includes("flutter") ||
            uDept.includes("react native") ||
            uDept.includes("android") ||
            uDept.includes("ios") ||
            uDept.includes("app")
          );
        }
        if (deptLower.includes("web")) {
          return uDept.includes("web");
        }
        return uDept.includes(deptLower);
      }) || [];

    // If logged-in user is a Social Media Manager, filter designers to only those
    // who are assigned tasks created by this Social Media Manager
    const isSocialMediaManager =
      user?.department?.toLowerCase() === "social media manager";
    if (isSocialMediaManager) {
      const currentUserId = user?._id || user?.id;
      const assignedDesignerIds = new Set();

      allTasks.forEach((task) => {
        const creatorId =
          task.createdBy && typeof task.createdBy === "object"
            ? task.createdBy._id
            : task.createdBy;
        if (creatorId === currentUserId && task.assignedTo) {
          // Filter by selectedDate so we only show designers who have tasks in the current view
          let includeTask = false;
          const taskCreatedDate = task.createdAt
            ? parseISO(task.createdAt)
            : null;
          const taskDueDate = task.dueDate ? parseISO(task.dueDate) : null;
          const taskStartDate = task.startDate
            ? parseISO(task.startDate)
            : null;
          const startCheckDate =
            taskStartDate || taskDueDate || taskCreatedDate;

          const statusLower = task.status?.toLowerCase() || "";
          const isCompleted =
            statusLower === "completed" || statusLower.includes("approve");
          const isRejected =
            statusLower.includes("reject") || statusLower.includes("cancel");

          if (isCompleted) {
            const completedDate = task.completedAt
              ? parseISO(task.completedAt)
              : task.updatedAt
                ? parseISO(task.updatedAt)
                : null;
            includeTask = completedDate
              ? isSameDay(completedDate, selectedDate)
              : false;
          } else if (isRejected) {
            const rejectedDate = task.rejectedAt
              ? parseISO(task.rejectedAt)
              : task.updatedAt
                ? parseISO(task.updatedAt)
                : null;
            includeTask = rejectedDate
              ? isSameDay(rejectedDate, selectedDate)
              : false;
          } else {
            if (startCheckDate) {
              includeTask =
                isSameDay(startCheckDate, selectedDate) ||
                isBefore(startCheckDate, selectedDate);
            }
          }

          if (includeTask) {
            const assigneeId =
              typeof task.assignedTo === "object"
                ? task.assignedTo._id
                : task.assignedTo;
            assignedDesignerIds.add(assigneeId);
          }
        }
      });

      return baseDesigners.filter((d) => assignedDesignerIds.has(d._id));
    }

    return baseDesigners;
  }, [users, allTasks, user, targetDept, selectedDate]);

  const designerIds = useMemo(() => designers.map((d) => d._id), [designers]);

  // 2. Filter Tasks assigned to Graphic Designers + Date Filter
  const designerTasks = useMemo(() => {
    return allTasks.filter((task) => {
      // Check Assignee
      if (!task.assignedTo) return false;
      const assigneeId =
        typeof task.assignedTo === "object"
          ? task.assignedTo._id
          : task.assignedTo;
      if (!designerIds.includes(assigneeId)) return false;

      // Check Creator if logged-in user is a Social Media Manager
      const isSocialMediaManager =
        user?.department?.toLowerCase() === "social media manager";
      if (isSocialMediaManager) {
        const creatorId =
          task.createdBy && typeof task.createdBy === "object"
            ? task.createdBy._id
            : task.createdBy;
        const currentUserId = user?._id || user?.id;
        if (creatorId !== currentUserId) return false;
      }

      // Check Date
      const taskCreatedDate = task.createdAt ? parseISO(task.createdAt) : null;
      const taskDueDate = task.dueDate ? parseISO(task.dueDate) : null;
      const taskStartDate = task.startDate ? parseISO(task.startDate) : null;

      const statusLower = task.status?.toLowerCase() || "";
      const isCompleted =
        statusLower === "completed" || statusLower.includes("approve");
      const isRejected =
        statusLower.includes("reject") || statusLower.includes("cancel");

      // 1. Completed tasks: ONLY show them on the day they were actually completed
      if (isCompleted) {
        const completedDate = task.completedAt
          ? parseISO(task.completedAt)
          : task.updatedAt
            ? parseISO(task.updatedAt)
            : null;
        return completedDate ? isSameDay(completedDate, selectedDate) : false;
      }

      // 2. Rejected tasks: ONLY show them on the day they were rejected (no carryforward)
      if (isRejected) {
        const rejectedDate = task.rejectedAt
          ? parseISO(task.rejectedAt)
          : task.updatedAt
            ? parseISO(task.updatedAt)
            : null;
        return rejectedDate ? isSameDay(rejectedDate, selectedDate) : false;
      }

      // 3. Unfinished active tasks: show if selectedDate is on or after its start date (or created date if no start date)
      const startCheckDate = taskStartDate || taskCreatedDate;
      if (startCheckDate) {
        const isStarted =
          isSameDay(startCheckDate, selectedDate) ||
          isBefore(startCheckDate, selectedDate);
        if (isStarted) {
          return true;
        }
      }

      return false;
    });
  }, [allTasks, designerIds, selectedDate, user]);

  // 3. Compute Metrics
  // todayAssignedTasks: only tasks whose assignment date (startDate || createdAt) falls on selectedDate.
  // This is used for Metric Cards and Performance Table status counts.
  // Productivity continues to use all designerTasks (actual work done on selectedDate).
  const todayAssignedDesignerTasks = useMemo(() => {
    return designerTasks.filter((task) => {
      const assignmentDate = task.startDate || task.createdAt;
      if (!assignmentDate) return false;
      return isSameDay(new Date(assignmentDate), selectedDate);
    });
  }, [designerTasks, selectedDate]);

  const metrics = useMemo(() => {
    let completed = 0;
    let pending = 0;
    let inProgress = 0;
    let onHold = 0;
    let inReview = 0;
    let overdue = 0;
    let dueToday = 0;
    let rejected = 0;
    let corrections = 0;
    let totalRevisions = 0;

    // Metric card counts reflect TODAY ASSIGNED TASKS ONLY.
    todayAssignedDesignerTasks.forEach((task) => {
      const status = task.status?.toLowerCase() || "";
      if (status === "completed" || status.includes("approve")) completed++;
      else if (status.includes("reject")) rejected++;
      else if (status.includes("correction")) corrections++;
      else if (status.includes("hold")) onHold++;
      else if (status.includes("progress")) inProgress++;
      else if (status.includes("review") || status.includes("revision"))
        inReview++;
      else if (status === "pending") pending++;
      else pending++; // default fallback

      totalRevisions += task.revisions || 0;

      if (
        task.dueDate &&
        status !== "completed" &&
        !status.includes("approve")
      ) {
        const days = getDaysRemaining(task.dueDate, selectedDate);
        if (days !== null && days < 0) {
          overdue++;
        } else if (days !== null && days === 0) {
          dueToday++;
        }
      }
    });

    return {
      designersWorking: designers.length,
      // tasksAssigned = today's assigned batch only
      tasksAssigned: todayAssignedDesignerTasks.length,
      completed,
      pending,
      inProgress,
      onHold,
      inReview,
      corrections,
      overdue,
      dueToday,
      rejected,
      totalRevisions,
    };
  }, [todayAssignedDesignerTasks, designers.length, selectedDate]);

  const interruptions = useMemo(() => {
    let totalBlockers = 0;
    const counts = {
      "Client Calls": 0,
      "Urgent Tasks": 0,
      Revisions: 0,
      Meetings: 0,
      Other: 0,
    };

    const processBlocker = (type) => {
      totalBlockers++;
      if (!type) {
        counts["Other"]++;
        return;
      }
      const t = type.toLowerCase();
      if (t.includes("call") || t.includes("client")) counts["Client Calls"]++;
      else if (t.includes("urgent")) counts["Urgent Tasks"]++;
      else if (t.includes("revision")) counts["Revisions"]++;
      else if (t.includes("meeting")) counts["Meetings"]++;
      else counts["Other"]++;
    };

    const selDateObj = selectedDate || new Date();
    const dayStart = startOfDay(selDateObj).getTime();
    const nextDayStart = startOfDay(addDays(selDateObj, 1)).getTime();

    designerTasks.forEach((task) => {
      if (task.blockerHistory && Array.isArray(task.blockerHistory)) {
        task.blockerHistory.forEach((b) => {
          if (!b.pausedAt) return;
          const pStart = new Date(b.pausedAt).getTime();
          if (isNaN(pStart)) return;
          let pEnd = b.resumedAt
            ? new Date(b.resumedAt).getTime()
            : b.totalPauseMinutes
              ? pStart + b.totalPauseMinutes * 60 * 1000
              : task.pausedAt
                ? new Date(task.pausedAt).getTime()
                : isSameDay(selDateObj, new Date())
                  ? Date.now()
                  : nextDayStart;
          if (isNaN(pEnd) || pEnd <= pStart) return;
          const overlapStart = Math.max(pStart, dayStart);
          const overlapEnd = Math.min(pEnd, nextDayStart);
          if (overlapEnd > overlapStart) {
            processBlocker(b.blockerType);
          }
        });
      }
      if (task.isBlocked && task.blockerPausedAt) {
        const pStart = new Date(task.blockerPausedAt).getTime();
        if (!isNaN(pStart)) {
          const pEnd = isSameDay(selDateObj, new Date())
            ? Date.now()
            : nextDayStart;
          const overlapStart = Math.max(pStart, dayStart);
          const overlapEnd = Math.min(pEnd, nextDayStart);
          if (overlapEnd > overlapStart) {
            const alreadyHandled =
              task.blockerHistory &&
              task.blockerHistory.some((h) => {
                if (!h.pausedAt) return false;
                return Math.abs(new Date(h.pausedAt).getTime() - pStart) < 1000;
              });
            if (!alreadyHandled) {
              processBlocker(task.blockerType);
            }
          }
        }
      }
    });

    return { total: totalBlockers, counts };
  }, [designerTasks, selectedDate]);

  // 4. Board Data
  const boardColumns = [
    "Overall Overdue",
    "Not Started",
    "In Progress",
    "On Hold",
    "IN REVIEW",
    "Completed",
  ];
  const getColumnForTask = (task) => {
    const status = task.status || "Not Started";

    if (boardColumns.includes(status)) return status;
    if (status.toLowerCase().includes("progress")) return "In Progress";
    if (status.toLowerCase().includes("hold")) return "On Hold";
    if (status.toLowerCase().includes("review")) return "IN REVIEW";
    if (status.toLowerCase().includes("revision")) return "IN REVIEW";
    if (status.toLowerCase().includes("reject")) return "Rejected";
    if (status.toLowerCase().includes("approve")) return "Completed";
    if (status.toLowerCase() === "completed") return "Completed";
    if (status.toLowerCase() === "assigned") return "Not Started";
    return "Not Started";
  };

  // Apply board-level filters to designerTasks
  const boardFilteredTasks = useMemo(() => {
    return designerTasks.filter((task) => {
      // Search filter
      if (boardFilter.search.trim()) {
        const q = boardFilter.search.toLowerCase();
        const titleMatch = task.title?.toLowerCase().includes(q);
        const projId =
          typeof task.project === "object" ? task.project?._id : task.project;
        const proj = projects?.find((p) => p._id === projId);
        const projMatch = proj?.name?.toLowerCase().includes(q);
        if (!titleMatch && !projMatch) return false;
      }
      // Assignee filter
      if (boardFilter.assignee !== "All") {
        const aId =
          typeof task.assignedTo === "object"
            ? task.assignedTo?._id
            : task.assignedTo;
        if (aId !== boardFilter.assignee) return false;
      }
      // Priority filter
      if (boardFilter.priority !== "All") {
        if ((task.priority || "Medium") !== boardFilter.priority) return false;
      }
      // Client filter
      if (boardFilter.client !== "All") {
        let cId =
          typeof task.client === "object" ? task.client?._id : task.client;
        if (!cId && task.project) {
          const projId =
            typeof task.project === "object" ? task.project?._id : task.project;
          const proj = projects?.find((p) => p._id === projId);
          cId =
            typeof proj?.client === "object" ? proj?.client?._id : proj?.client;
        }
        if (cId !== boardFilter.client) return false;
      }
      return true;
    });
  }, [designerTasks, boardFilter, projects]);

  const tasksByColumn = useMemo(() => {
    const cols = {};
    boardColumns.forEach((c) => (cols[c] = []));
    boardFilteredTasks.forEach((task) => {
      const col = getColumnForTask(task);
      if (cols[col]) cols[col].push(task);

      // Mirror incomplete tasks that have a due date in the Overall Overdue column
      const isCompletedOrRejected =
        task.status?.toLowerCase() === "completed" ||
        task.status?.toLowerCase().includes("approve") ||
        task.status?.toLowerCase().includes("reject") ||
        task.status?.toLowerCase().includes("cancel");
      if (!isCompletedOrRejected && task.dueDate) {
        const daysRemaining = getDaysRemaining(task.dueDate, selectedDate);
        if (daysRemaining !== null) {
          cols["Overall Overdue"].push(task);
        }
      }
    });
    return cols;
  }, [boardFilteredTasks, selectedDate]);

  // 5. Team Performance
  const teamPerformance = useMemo(() => {
    return designers.map((designer) => {
      // All tasks for this designer that are visible on selectedDate
      // (used for Productivity, Blockers, Approval time)
      const myTasks = designerTasks.filter((t) => {
        if (!t.assignedTo) return false;
        const aId =
          typeof t.assignedTo === "object" ? t.assignedTo._id : t.assignedTo;
        if (aId !== designer._id) return false;
        const s = (t.status || "").toLowerCase();
        if (s.includes("reject") || s.includes("cancel")) return false;
        return true;
      });

      // TODAY ASSIGNED TASKS ONLY — tasks whose assignment date
      // (assignedDate || assignedAt || startDate || createdAt)
      // falls on selectedDate. Used for status counts in the Performance Table.
      const todayAssignedTasks = myTasks.filter((task) => {
        const assignmentDate = getTaskAssignmentDate(task);
        if (!assignmentDate) return false;
        return isSameDay(new Date(assignmentDate), selectedDate);
      });

      // --- Status counts: based on TODAY ASSIGNED BATCH only ---
      let comp = 0;
      let pend = 0;
      let prog = 0;
      let hold = 0;
      let rev = 0;
      let over = 0;
      let totalRevisions = 0;

      todayAssignedTasks.forEach((t) => {
        const s = t.status?.toLowerCase() || "";
        const isCompleted = s === "completed" || s.includes("approve");
        const isRejected = s.includes("reject") || s.includes("cancel");

        if (isCompleted) comp++;
        else if (s.includes("hold")) hold++;
        else if (s.includes("progress")) prog++;
        else if (s.includes("review") || s.includes("revision")) rev++;
        else if (s === "pending") pend++;
        else if (!isRejected) pend++; // default fallback

        if (
          t.dueDate &&
          isBefore(startOfDay(parseISO(t.dueDate)), startOfDay(selectedDate)) &&
          !isCompleted &&
          !isRejected
        )
          over++;

        totalRevisions += t.revisions || 0;
      });

      // CARRY FORWARD TASKS ONLY — tasks whose assignment date
      // (assignedDate || assignedAt || startDate || createdAt)
      // is before selectedDate. Used for status counts in the Performance Table.
      const carryForwardTasks = myTasks.filter((task) => {
        const assignmentDate = getTaskAssignmentDate(task);
        if (!assignmentDate) return false;
        return isBefore(
          startOfDay(new Date(assignmentDate)),
          startOfDay(selectedDate),
        );
      });

      // --- Status counts: based on CARRY FORWARD BATCH only ---
      let carryComp = 0;
      let carryPend = 0;
      let carryProg = 0;
      let carryHold = 0;
      let carryRev = 0;

      carryForwardTasks.forEach((t) => {
        const s = t.status?.toLowerCase() || "";
        const isCompleted = s === "completed" || s.includes("approve");
        const isRejected = s.includes("reject") || s.includes("cancel");

        if (isCompleted) carryComp++;
        else if (s.includes("hold")) carryHold++;
        else if (s.includes("progress")) carryProg++;
        else if (s.includes("review") || s.includes("revision")) carryRev++;
        else if (s === "pending") carryPend++;
        else if (!isRejected) carryPend++; // default fallback
      });

      // --- Productivity & Blockers: based on ALL myTasks worked on selectedDate ---
      let totalLoggedMs = 0;
      let totalBusinessLoggedMs = 0;
      let totalOffworkingLoggedMs = 0;
      let inProgressLoggedMs = 0;
      let totalBlockerMs = 0;
      let totalOnHoldMs = 0;
      let totalApprovalMs = 0;
      let approvalCount = 0;
      const blockerTypesSet = new Set();
      const holdReasonsSet = new Set();

      myTasks.forEach((t) => {
        let taskBlockerMs = 0;
        const selDateObj = selectedDate || new Date();
        const dayStart = startOfDay(selDateObj).getTime();
        const nextDayStart = startOfDay(addDays(selDateObj, 1)).getTime();

        if (Array.isArray(t.statusHistory)) {
          t.statusHistory.forEach((h) => {
            if (h.status === "Blocked") {
              const hDate = new Date(h.startTime || h.date).toLocaleDateString(
                "en-CA",
                {
                  timeZone: "Asia/Kolkata",
                },
              );
              if (
                hDate ===
                selDateObj.toLocaleDateString("en-CA", {
                  timeZone: "Asia/Kolkata",
                })
              ) {
                taskBlockerMs += h.duration || 0;
                if (h.blockerType) {
                  blockerTypesSet.add(h.blockerType);
                }
              }
            }
          });
        }

        if (t.status === "Blocked" && t.blockedStartedAt) {
          const hDate = new Date(t.blockedStartedAt).toLocaleDateString(
            "en-CA",
            {
              timeZone: "Asia/Kolkata",
            },
          );
          if (
            hDate ===
            selDateObj.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })
          ) {
            const endMs = isSameDay(selDateObj, new Date())
              ? Date.now()
              : startOfDay(addDays(selDateObj, 1)).getTime();
            taskBlockerMs += Math.max(
              0,
              endMs - new Date(t.blockedStartedAt).getTime(),
            );
          }
        }

        totalBlockerMs += taskBlockerMs;

        let taskOnHoldMs = 0;
        const selDateStr = selDateObj.toLocaleDateString("en-CA", {
          timeZone: "Asia/Kolkata",
        });

        if (Array.isArray(t.statusHistory)) {
          t.statusHistory.forEach((h) => {
            if (h.status === "On Hold") {
              const hDate = new Date(h.startTime || h.date).toLocaleDateString(
                "en-CA",
                {
                  timeZone: "Asia/Kolkata",
                },
              );
              if (hDate === selDateStr) {
                if (h.reason === "Client Call" || h.reason === "Meeting") {
                  taskBlockerMs += h.duration || 0;
                  if (h.reason) blockerTypesSet.add(h.reason);
                } else if (h.reason !== "Another Task") {
                  taskOnHoldMs += h.duration || 0;
                  if (h.reason) holdReasonsSet.add(h.reason);
                }
              }
            }
          });
        }

        if (t.status === "On Hold" && t.holdStartedAt) {
          const hDate = new Date(t.holdStartedAt).toLocaleDateString("en-CA", {
            timeZone: "Asia/Kolkata",
          });
          if (hDate === selDateStr) {
            const endMs = isSameDay(selDateObj, new Date())
              ? Date.now()
              : startOfDay(addDays(selDateObj, 1)).getTime();
            const duration = Math.max(0, endMs - new Date(t.holdStartedAt).getTime());
            
            const liveHoldEntry = [...(t.statusHistory || [])].reverse().find(x => x.status === "On Hold");
            
            if (liveHoldEntry && (liveHoldEntry.reason === "Client Call" || liveHoldEntry.reason === "Meeting")) {
              taskBlockerMs += duration;
              blockerTypesSet.add(liveHoldEntry.reason);
            } else if (!liveHoldEntry || liveHoldEntry.reason !== "Another Task") {
              taskOnHoldMs += duration;
              if (liveHoldEntry && liveHoldEntry.reason) {
                holdReasonsSet.add(liveHoldEntry.reason);
              }
            }
          }
        }

        totalOnHoldMs += taskOnHoldMs;

        const taskLoggedMs = calculateTaskProductivityForDate(
          t,
          selectedDate,
          officeHours,
        );
        const taskTotalLoggedWithBlockers = taskLoggedMs + taskBlockerMs;

        if (taskTotalLoggedWithBlockers > 0) {
          totalLoggedMs += taskTotalLoggedWithBlockers;
          totalBusinessLoggedMs += taskTotalLoggedWithBlockers;
          inProgressLoggedMs += taskTotalLoggedWithBlockers;
        }
      });

      // Compute approval time using actual review and completion fields (all tasks)
      myTasks.forEach((t) => {
        const totalWaitMs =
          t.approvalWaitingMs ||
          (t.reviewStartedAt && t.completedAt
            ? calculateBusinessMs(t.reviewStartedAt, t.completedAt)
            : 0);
        if (totalWaitMs > 0) {
          totalApprovalMs += totalWaitMs;
          approvalCount++;
        }
      });

      const avgRevisions =
        todayAssignedTasks.length > 0
          ? totalRevisions / todayAssignedTasks.length
          : 0;
      const totalHours = totalLoggedMs / (1000 * 60 * 60);
      const inProgressHours = inProgressLoggedMs / (1000 * 60 * 60);
      const avgApprovalMs =
        approvalCount > 0 ? totalApprovalMs / approvalCount : 0;

      const getLocalDateString = (date = new Date()) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      };

      // Filter reports for this designer
      const designerReports =
        designerEodReports?.filter((report) => {
          const rUserId =
            typeof report.user === "object" ? report.user?._id : report.user;
          return rUserId === designer._id;
        }) || [];

      // Find the one that matches the selectedDate
      const targetDateStr = getLocalDateString(selectedDate);
      const designerReport = designerReports.find((report) => {
        const reportDate = new Date(report.date).toISOString().split("T")[0];
        return reportDate === targetDateStr;
      });

      let lastSubmittedStr = "Not submitted";
      if (designerReport) {
        if (designerReport.isDraft) {
          lastSubmittedStr = "Draft";
        } else {
          const reportUpdatedAt = new Date(designerReport.updatedAt);
          if (isSameDay(reportUpdatedAt, selectedDate)) {
            lastSubmittedStr = format(reportUpdatedAt, "h:mm a");
          } else {
            lastSubmittedStr = format(reportUpdatedAt, "MMM dd, h:mm a");
          }
        }
      }

      return {
        id: designer._id,
        name: designer.name,
        profileImage:
          (typeof designer.profile?.profileImage === "object"
            ? designer.profile?.profileImage?.url
            : designer.profile?.profileImage) ||
          (typeof designer.profileImage === "object"
            ? designer.profileImage?.url
            : designer.profileImage) ||
          designer.profilePic ||
          designer.avatar ||
          designer.profile?.profilePic ||
          designer.profile?.avatar,
        // assigned = today's assigned batch count only
        assigned: todayAssignedTasks.length,
        completed: comp,
        pending: pend,
        inProgress: prog,
        onHold: hold,
        inReview: rev,
        carryForward: {
          assigned: carryForwardTasks.length,
          completed: carryComp,
          pending: carryPend,
          inProgress: carryProg,
          onHold: carryHold,
          inReview: carryRev,
        },
        // inReviewTasks: filtered from todayAssignedTasks (assignment-based)
        inReviewTasks: todayAssignedTasks.filter((t) => {
          const s = t.status?.toLowerCase() || "";
          return s.includes("review") || s.includes("revision");
        }),
        overdue: over,
        totalRevisions,
        avgRevisions,
        totalHours,
        totalLoggedMs,
        inProgressHours,
        inProgressLoggedMs,
        totalBusinessLoggedMs,
        totalOffworkingLoggedMs,
        avgApprovalMs,
        blockers:
          blockerTypesSet.size > 0
            ? Array.from(blockerTypesSet).join(", ")
            : "none",
        holdReasons:
          holdReasonsSet.size > 0
            ? Array.from(holdReasonsSet).join(", ")
            : "none",
        blockerTimeMs: totalBlockerMs,
        onHoldTimeMs: totalOnHoldMs,
        lastSubmitted: lastSubmittedStr,
        // tasksWorkedOn: count of tasks that had productivity > 0 on selectedDate (all tasks, not just today-assigned)
        tasksWorkedOn: myTasks.filter(
          (t) =>
            calculateTaskProductivityForDate(t, selectedDate, officeHours) > 0,
        ).length,
        // tasks passed to LiveProductivityCell = all myTasks (productivity includes historical tasks worked today)
        tasks: myTasks,
      };
    });
  }, [designers, designerTasks, designerEodReports, selectedDate, officeHours]);

  const avgEfficiency = useMemo(() => {
    const totalLoggedAll = teamPerformance.reduce(
      (s, tp) => s + tp.totalLoggedMs,
      0,
    );
    const totalOfficeMs =
      (officeHours.endHour - officeHours.startHour) * 3600 * 1000;
    return totalOfficeMs > 0 && teamPerformance.length > 0
      ? Math.min(
          100,
          Math.round(
            (totalLoggedAll / (totalOfficeMs * teamPerformance.length)) * 100,
          ),
        )
      : 0;
  }, [teamPerformance, officeHours]);

  // 5.5. Productivity Trend for the last 7 days ending on selectedDate
  const productivityTrendData = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      days.push(subDays(selectedDate, i));
    }

    return {
      labels: days.map(day => format(day, "d MMM")),
      datasets: designers.map((designer) => {
        const data = days.map((day) => {
          let totalMs = 0;
          const designerTasksFromAll = allTasks.filter((t) => {
            if (!t.assignedTo) return false;
            const aId = typeof t.assignedTo === "object" ? t.assignedTo._id : t.assignedTo;
            if (aId !== designer._id) return false;
            const s = (t.status || "").toLowerCase();
            if (s.includes("reject") || s.includes("cancel")) return false;
            return true;
          });

          designerTasksFromAll.forEach((t) => {
            totalMs += calculateTaskProductivityForDate(t, day, officeHours);
          });

          const totalHours = totalMs / (1000 * 60 * 60);
          const mins = Math.round((totalMs / (1000 * 60)) % 60);
          const hrs = Math.floor(totalMs / (1000 * 60 * 60));
          
          return {
            hours: totalHours,
            formatted: `${hrs}h ${String(mins).padStart(2, "0")}m`,
          };
        });

        return {
          designer,
          data,
        };
      }),
    };
  }, [selectedDate, designers, allTasks, officeHours]);

  // 6. Client Progress
  const clientProgress = useMemo(() => {
    const cp = {};
    designerTasks.forEach((task) => {
      let clientId = task.client;
      if (typeof clientId === "object" && clientId?._id)
        clientId = clientId._id;
      if (!clientId && task.project) {
        const projId =
          typeof task.project === "object" ? task.project._id : task.project;
        const proj = projects?.find((p) => p._id === projId);
        clientId = proj?.client?._id || proj?.client;
      }
      if (!clientId) return;

      if (!cp[clientId]) {
        cp[clientId] = {
          id: clientId,
          pending: 0,
          completed: 0,
          dueToday: 0,
          delayed: 0,
          revision: 0,
        };
      }

      const s = task.status?.toLowerCase() || "";
      const isRejected = s.includes("reject") || s.includes("cancel");
      if (s === "completed" || s.includes("approve")) cp[clientId].completed++;
      else if (!isRejected) {
        cp[clientId].pending++;
        if (s.includes("revision")) cp[clientId].revision++;
        if (task.dueDate) {
          const dueISO = parseISO(task.dueDate);
          if (isSameDay(dueISO, selectedDate)) cp[clientId].dueToday++;
          if (isBefore(startOfDay(dueISO), startOfDay(selectedDate)))
            cp[clientId].delayed++;
        }
      }
    });

    return Object.values(cp).map((c) => {
      const cl = clients?.find((cl) => cl._id === c.id);
      return { ...c, name: cl?.name || cl?.companyName || "Unknown Client" };
    });
  }, [designerTasks, projects, clients, selectedDate]);

  // 7. Delayed Projects/Tasks (Raw active bottlenecks)
  const rawBottleneckTasks = useMemo(() => {
    return designerTasks
      .filter((t) => {
        const s = t.status?.toLowerCase() || "";
        const isActive =
          s !== "completed" &&
          !s.includes("approve") &&
          !s.includes("reject") &&
          !s.includes("cancel");
        return isActive;
      })
      .map((t) => {
        const s = t.status?.toLowerCase() || "";
        let diff = t.dueDate
          ? differenceInDays(
              startOfDay(selectedDate),
              startOfDay(parseISO(t.dueDate)),
            )
          : 0;
        let delayText = "";
        if (s.includes("hold")) {
          delayText = "On Hold";
        } else if (diff === 0) {
          delayText = "Due Today";
        } else if (diff < 0) {
          delayText =
            Math.abs(diff) +
            (Math.abs(diff) === 1 ? " day" : " days") +
            " left";
        } else {
          delayText = diff + (diff === 1 ? " day" : " days") + " delayed";
        }

        let projName = "No Project";
        if (t.project) {
          const pId = typeof t.project === "object" ? t.project._id : t.project;
          const p = projects?.find((x) => x._id === pId);
          projName = p?.name || "Unknown";
        }

        let clientId = t.client;
        if (typeof clientId === "object" && clientId?._id)
          clientId = clientId._id;
        if (!clientId && t.project) {
          const pId = typeof t.project === "object" ? t.project._id : t.project;
          const p = projects?.find((x) => x._id === pId);
          clientId = p?.client?._id || p?.client;
        }
        const cl = clients?.find((c) => c._id === clientId);
        const clientName = cl?.name || cl?.companyName || "No Client";

        const creatorObj =
          t.createdBy && typeof t.createdBy === "object"
            ? t.createdBy
            : users?.find((u) => u._id === t.createdBy);
        const creatorName = creatorObj?.name || "Unknown";
        const creatorImage =
          (typeof creatorObj?.profile?.profileImage === "object"
            ? creatorObj?.profile?.profileImage?.url
            : creatorObj?.profile?.profileImage) ||
          (typeof creatorObj?.profileImage === "object"
            ? creatorObj?.profileImage?.url
            : creatorObj?.profileImage) ||
          creatorObj?.profilePic ||
          creatorObj?.avatar ||
          creatorObj?.profile?.profilePic ||
          creatorObj?.profile?.avatar ||
          null;

        const assigneeObj = t.assignedTo
          ? typeof t.assignedTo === "object"
            ? t.assignedTo
            : designers.find((d) => d._id === t.assignedTo) ||
              users?.find((u) => u._id === t.assignedTo)
          : null;
        const assigneeName = assigneeObj?.name || "Unassigned";
        const assigneeImage =
          (typeof assigneeObj?.profile?.profileImage === "object"
            ? assigneeObj?.profile?.profileImage?.url
            : assigneeObj?.profile?.profileImage) ||
          (typeof assigneeObj?.profileImage === "object"
            ? assigneeObj?.profileImage?.url
            : assigneeObj?.profileImage) ||
          assigneeObj?.profilePic ||
          assigneeObj?.avatar ||
          assigneeObj?.profile?.profilePic ||
          assigneeObj?.profile?.avatar ||
          null;

        return {
          ...t,
          projName,
          clientName,
          creatorName,
          creatorImage,
          assigneeName,
          assigneeImage,
          daysDelayed: delayText,
        };
      });
  }, [designerTasks, projects, clients, users, designers]);

  const bottleneckClients = useMemo(() => {
    return [
      "All Clients",
      ...new Set(rawBottleneckTasks.map((t) => t.clientName)),
    ];
  }, [rawBottleneckTasks]);

  const bottleneckCreators = useMemo(() => {
    return [
      "All Creators",
      ...new Set(rawBottleneckTasks.map((t) => t.creatorName)),
    ];
  }, [rawBottleneckTasks]);

  const bottleneckAssignees = useMemo(() => {
    return [
      "All Assignees",
      ...new Set(rawBottleneckTasks.map((t) => t.assigneeName)),
    ];
  }, [rawBottleneckTasks]);

  const bottleneckStatuses = useMemo(() => {
    return [
      "All Statuses",
      ...new Set(rawBottleneckTasks.map((t) => t.status)),
    ].filter(Boolean);
  }, [rawBottleneckTasks]);

  const delayedTasks = useMemo(() => {
    return rawBottleneckTasks.filter((t) => {
      if (
        bottleneckClient !== "All Clients" &&
        t.clientName !== bottleneckClient
      )
        return false;
      if (
        bottleneckCreator !== "All Creators" &&
        t.creatorName !== bottleneckCreator
      )
        return false;
      if (
        bottleneckAssignee !== "All Assignees" &&
        t.assigneeName !== bottleneckAssignee
      )
        return false;
      if (bottleneckStatus !== "All Statuses" && t.status !== bottleneckStatus)
        return false;
      return true;
    });
  }, [
    rawBottleneckTasks,
    bottleneckClient,
    bottleneckCreator,
    bottleneckAssignee,
    bottleneckStatus,
  ]);

  const activeDesigner = useMemo(() => {
    return viewTasksModal.open
      ? teamPerformance.find((p) => p.id === viewTasksModal.designerId)
      : null;
  }, [viewTasksModal.open, viewTasksModal.designerId, teamPerformance]);

  const designerTasksList = useMemo(() => {
    return activeDesigner?.tasks || [];
  }, [activeDesigner]);

  const getTaskCategory = (status = "") => {
    const s = status.toLowerCase();
    if (s === "assigned") return "assigned";
    if (s === "pending") return "pending";
    if (s.includes("progress")) return "inprogress";
    if (s.includes("hold")) return "onhold";
    if (s.includes("review") || s.includes("revision")) return "inreview";
    if (s === "completed" || s.includes("approve")) return "completed";
    return "pending";
  };

  const groupedModalTasks = useMemo(() => {
    const assignedToday = [];
    const carriedForward = [];

    designerTasksList.forEach((task) => {
      const assignmentDate = task.startDate || task.createdAt;
      const isAssignedToday =
        assignmentDate && isSameDay(new Date(assignmentDate), selectedDate);
      if (isAssignedToday) {
        assignedToday.push(task);
      } else {
        carriedForward.push(task);
      }
    });

    return { assignedToday, carriedForward };
  }, [designerTasksList, selectedDate]);

  const activeModalTasksList = useMemo(() => {
    return designerTasksList;
  }, [designerTasksList]);

  const filteredModalTasks = useMemo(() => {
    const filtered = activeModalTasksList.filter((task) => {
      if (taskTab !== "all") {
        const cat = getTaskCategory(task.status);
        if (cat !== taskTab) return false;
      }
      if (taskSearch.trim()) {
        const q = taskSearch.toLowerCase();
        const titleMatch = task.title?.toLowerCase().includes(q);

        let projName = "";
        if (task.project) {
          const pId =
            typeof task.project === "object" ? task.project._id : task.project;
          const p = projects?.find((x) => x._id === pId);
          projName = p?.name || "";
        }
        const projectMatch = projName.toLowerCase().includes(q);

        return titleMatch || projectMatch;
      }
      return true;
    });

    const orderMap = {
      pending: 1,
      assigned: 1,
      inprogress: 2,
      onhold: 3,
      inreview: 4,
      completed: 5,
    };

    return [...filtered].sort((a, b) => {
      const catA = getTaskCategory(a.status);
      const catB = getTaskCategory(b.status);
      const orderA = orderMap[catA] || 99;
      const orderB = orderMap[catB] || 99;
      return orderA - orderB;
    });
  }, [activeModalTasksList, taskTab, taskSearch, projects]);

  const modalTabCounts = useMemo(() => {
    const counts = {
      all: 0,
      assigned: 0,
      pending: 0,
      inprogress: 0,
      onhold: 0,
      inreview: 0,
      completed: 0,
    };
    activeModalTasksList.forEach((task) => {
      counts.all++;
      const cat = getTaskCategory(task.status);
      if (counts[cat] !== undefined) {
        counts[cat]++;
      }
    });
    return counts;
  }, [activeModalTasksList]);

  if (isLoading) {
    return (
      <div className="animate-pulse h-96 bg-slate-100 dark:bg-slate-800/50 rounded-2xl w-full flex items-center justify-center text-slate-400 font-mono text-sm tracking-widest uppercase shadow-inner border border-slate-200 dark:border-slate-800">
        Initializing {targetDept} Board...
      </div>
    );
  }

  const getInitials = (name) => {
    if (!name) return "";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };
  const getDeadlineBadgeText = (dueDateStr, status) => {
    if (!dueDateStr) return "";
    const days = getDaysRemaining(dueDateStr, selectedDate);
    const isCompleted =
      status?.toLowerCase() === "completed" ||
      status?.toLowerCase().includes("approve");
    if (isCompleted) return "Completed";

    if (days < 0) {
      const absDays = Math.abs(days);
      return `${absDays} ${absDays === 1 ? "day" : "days"} overdue`;
    } else if (days === 0) {
      return "Due Today";
    } else if (days === 1) {
      return "Due Tomorrow";
    } else {
      return `${days} days to go`;
    }
  };

  const renderTaskCard = (task) => {
    let clientName = "No Client";
    if (task.client) {
      const cId =
        typeof task.client === "object" ? task.client._id : task.client;
      const c = clients?.find((x) => x._id === cId);
      clientName =
        c?.companyName ||
        c?.name ||
        (typeof task.client === "object"
          ? task.client.companyName || task.client.name
          : "Unknown Client");
    } else if (task.project) {
      const pId =
        typeof task.project === "object" ? task.project._id : task.project;
      const p = projects?.find((x) => x._id === pId);
      if (p) {
        const cId = typeof p.client === "object" ? p.client?._id : p.client;
        const c = clients?.find((x) => x._id === cId);
        clientName =
          c?.companyName ||
          c?.name ||
          (typeof p.client === "object"
            ? p.client.companyName || p.client.name
            : "Unknown Client");
      }
    }

    const aId = task.assignedTo
      ? typeof task.assignedTo === "object"
        ? task.assignedTo._id
        : task.assignedTo
      : null;
    const assignedUser = aId
      ? designers.find((d) => d._id === aId) ||
        (task.assignedTo && typeof task.assignedTo === "object"
          ? task.assignedTo
          : null)
      : null;
    const assignedByName = task.createdBy
      ? typeof task.createdBy === "object"
        ? task.createdBy.name
        : null
      : null;

    const profileImg =
      assignedUser?.profile?.profileImage?.url ||
      assignedUser?.profileImage?.url ||
      null;
    const initials = (assignedUser?.name || "")
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
    const creatorInitials = (assignedByName || "")
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        whileHover={{ y: -2 }}
        key={task._id}
        className="bg-white dark:bg-slate-800/90 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 hover:border-indigo-500 dark:hover:border-indigo-400 transition-all duration-200 shadow-xs hover:shadow-md relative group backdrop-blur-sm flex flex-col gap-1.5"
      >
        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-indigo-500 via-purple-500 to-pink-500 rounded-l-xl opacity-80 group-hover:opacity-100 transition-opacity" />
        {/* Title row: icon + name */}
        <div className="flex items-start gap-1.5 pl-1 min-w-0">
          <FiFileText
            size={12}
            className="text-indigo-500 dark:text-indigo-400 shrink-0 mt-[2px]"
          />
          <p
            className="text-[11.5px] font-bold text-slate-800 dark:text-white leading-tight break-words"
            title={task.title}
          >
            {task.title}
          </p>
        </div>
        {/* Completion Date Badge — shown prominently for completed tasks */}
        {(() => {
          const isCompleted =
            task.status?.toLowerCase() === "completed" ||
            task.status?.toLowerCase().includes("approve");
          const completedDate = task.completedAt
            ? new Date(task.completedAt)
            : task.updatedAt
              ? new Date(task.updatedAt)
              : null;
          if (isCompleted && completedDate && !isNaN(completedDate.getTime())) {
            const completedStr = format(completedDate, "MMM dd, h:mm a");
            const isToday_ = isSameDay(completedDate, new Date());
            return (
              <div className="pl-1.5">
                <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-lg bg-emerald-500 dark:bg-emerald-600 text-white border border-emerald-600/30 dark:border-emerald-500/40 shadow-sm w-full justify-center">
                  <FiCheckCircle size={10} className="shrink-0" />
                  <span>Completed: {completedStr}</span>
                  {isToday_ && (
                    <span className="ml-0.5 w-1.5 h-1.5 rounded-full bg-white animate-pulse shrink-0" />
                  )}
                </span>
              </div>
            );
          }
          return null;
        })()}
        {/* Due Date & Deadline Badge — shown for non-completed tasks */}
        {(() => {
          const isCompleted =
            task.status?.toLowerCase() === "completed" ||
            task.status?.toLowerCase().includes("approve");
          if (isCompleted) return null;
          return task.dueDate ? (
            <div className="pl-1.5 flex items-center justify-between gap-1">
              <span
                className={`shrink-0 flex items-center gap-1.5 text-[9.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${(() => {
                  const days = getDaysRemaining(task.dueDate, selectedDate);
                  if (days < 0)
                    return "text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/15 border border-rose-200/60 dark:border-rose-500/20";
                  if (days === 0)
                    return "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/15 border border-amber-200/60 dark:border-amber-500/20";
                  if (days === 1)
                    return "text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/15 border border-blue-200/60 dark:border-blue-500/20";
                  return "text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700";
                })()}`}
              >
                <FiClock size={10} />
                <span>{format(parseISO(task.dueDate), "MMM dd")}</span>
                <span className="opacity-40 font-normal">|</span>
                <span className="truncate max-w-[90px]">
                  {getDeadlineBadgeText(task.dueDate, task.status)}
                </span>
              </span>
            </div>
          ) : null;
        })()}
        {/* Project and Priority Info */}
        <div className="flex items-center justify-between gap-1.5 pl-1.5">
          <span
            className="text-[9.5px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/40 px-2 py-0.5 rounded-md truncate max-w-[140px]"
            title={clientName}
          >
            {clientName}
          </span>
          {task.priority && (
            <span
              className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider shrink-0 ${getPriorityStyle(task.priority)}`}
            >
              {task.priority}
            </span>
          )}
        </div>
        {/* Assigned User */}
        {(assignedUser || assignedByName) && (
          <div className="pl-1.5 pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-2">
            {/* Assigned To — left */}
            {assignedUser ? (
              <div
                className="flex items-center gap-1.5 min-w-0"
                title={`Assigned to: ${assignedUser.name}`}
              >
                {profileImg ? (
                  <img
                    src={profileImg}
                    alt={assignedUser.name}
                    className="w-5 h-5 rounded-full object-cover ring-1 ring-indigo-400/40 shrink-0"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-[9px] font-bold ring-1 ring-indigo-400/30 shrink-0">
                    {initials}
                  </div>
                )}
                <span className="text-[10px] font-medium text-slate-700 dark:text-slate-300 truncate">
                  {assignedUser.name}
                </span>
              </div>
            ) : (
              <div />
            )}
            {/* Assigned By — right */}
            {assignedByName && (
              <div
                className="flex items-center gap-1.5 shrink-0"
                title={`Assigned by: ${assignedByName}`}
              >
                <div className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center text-[8.5px] font-bold ring-1 ring-amber-400/30 shrink-0">
                  {creatorInitials || "SM"}
                </div>
                <span className="text-[9.5px] font-medium text-slate-500 dark:text-slate-400 truncate max-w-[70px]">
                  {assignedByName}
                </span>
              </div>
            )}
          </div>
        )}
      </motion.div>
    );
  };

  const getRelativeDateLabel = (date) => {
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    if (isTomorrow(date)) return "Tomorrow";
    return format(date, "EEEE");
  };

  // Chart configs and data mapping
  const totalAssignedTasksCount = metrics.tasksAssigned || 0;
  const getPercentageString = (count) => {
    if (totalAssignedTasksCount === 0) return "0%";
    return `${Math.round((count / totalAssignedTasksCount) * 100)}%`;
  };

  const doughnutData = {
    labels: [
      "Not Started",
      "In Progress",
      "In Review",
      "Completed",
      "On Hold",
      "Rejected",
    ],
    datasets: [
      {
        data: [
          metrics.pending,
          metrics.inProgress,
          metrics.inReview,
          metrics.completed,
          metrics.onHold,
          metrics.rejected,
        ],
        backgroundColor: [
          "#f97316", // Pending (Orange)
          "#3b82f6", // In Progress (Blue)
          "#a855f7", // In Review (Purple)
          "#10b981", // Completed (Green)
          "#eab308", // On Hold (Yellow)
          "#ef4444", // Rejected (Red)
        ],
        borderWidth: 2,
        borderColor: isDarkMode ? "#1e293b" : "#ffffff",
        hoverOffset: 4,
      },
    ],
  };

  const doughnutOptions = {
    cutout: "75%",
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: true,
        callbacks: {
          label: (context) => {
            const label = context.label || "";
            const value = context.raw || 0;
            const percentage = getPercentageString(value);
            return ` ${label}: ${value} (${percentage})`;
          },
        },
      },
    },
    maintainAspectRatio: false,
    responsive: true,
    animation: {
      animateRotate: true,
      animateScale: true,
      duration: 1000,
      easing: "easeOutQuart",
    },
  };

  const chartLineColors = [
    "#a855f7", "#3b82f6", "#10b981", "#f97316", "#eab308", 
    "#ef4444", "#06b6d4", "#f43f5e", "#6366f1", "#8b5cf6",
  ];

  const lineChartData = {
    labels: productivityTrendData.labels,
    datasets: productivityTrendData.datasets.map((ds, i) => {
      const color = chartLineColors[i % chartLineColors.length];
      return {
        label: ds.designer.name,
        data: ds.data.map(d => d.hours),
        borderColor: color,
        borderWidth: 2,
        pointBackgroundColor: color,
        pointBorderColor: "#ffffff",
        pointBorderWidth: 1.5,
        pointRadius: 3,
        pointHoverRadius: 5,
        tension: 0.35,
        fill: false,
      };
    }),
  };

  const lineChartOptions = {
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
        labels: {
          boxWidth: 8,
          usePointStyle: true,
          font: { size: 9 },
          color: isDarkMode ? "#cbd5e1" : "#475569"
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const dsIndex = context.datasetIndex;
            const index = context.dataIndex;
            const ds = productivityTrendData.datasets[dsIndex];
            const formatted = ds.data[index].formatted;
            return ` ${ds.designer.name}: ${formatted}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            size: 8.5,
            weight: "600",
          },
          color: isDarkMode ? "#94a3b8" : "#64748b",
        },
      },
      y: {
        min: 0,
        suggestedMax: 8,
        ticks: {
          callback: (value) => `${value}h`,
          font: {
            size: 8.5,
            weight: "600",
          },
          color: isDarkMode ? "#94a3b8" : "#64748b",
          stepSize: 2,
        },
        grid: {
          color: isDarkMode
            ? "rgba(255, 255, 255, 0.05)"
            : "rgba(0, 0, 0, 0.04)",
        },
      },
    },
    maintainAspectRatio: false,
    responsive: true,
    animation: {
      duration: 1000,
      easing: "easeOutQuart",
    },
  };

  const statusLegendItems = [
    {
      label: "Not Started",
      count: metrics.pending,
      percent: getPercentageString(metrics.pending),
      color: "#f97316",
    },
    {
      label: "In Progress",
      count: metrics.inProgress,
      percent: getPercentageString(metrics.inProgress),
      color: "#3b82f6",
    },
    {
      label: "In Review",
      count: metrics.inReview,
      percent: getPercentageString(metrics.inReview),
      color: "#a855f7",
    },
    {
      label: "Completed",
      count: metrics.completed,
      percent: getPercentageString(metrics.completed),
      color: "#10b981",
    },
    {
      label: "On Hold",
      count: metrics.onHold,
      percent: getPercentageString(metrics.onHold),
      color: "#eab308",
    },
    {
      label: "Rejected",
      count: metrics.rejected,
      percent: getPercentageString(metrics.rejected),
      color: "#ef4444",
    },
  ];

  return (
    <div className="bg-white dark:bg-[#0b1120] py-4 md:py-4 px-0 md:px-0 space-y-8 font-sans overflow-visible transition-colors duration-75 relative">
      {/* Header & Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-20">
        <div className="space-y-1 ">
          <h2 className="text-sm lg:text-xl font-black tracking-tight text-slate-800 dark:text-white flex items-center justify-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-500/20 rounded-xl">
              <FiActivity className="text-emerald-600 dark:text-emerald-400 text-xl" />
            </div>
            {targetDept} Board
          </h2>
        </div>

        {/* Date Filter & Navigator Group */}
        <div className="flex items-center gap-2">
          {/* Label indicating Today/Yesterday/Tomorrow */}
          <span className="text-[11px] font-extrabold text-slate-650 dark:text-slate-300 sidebar-bg  px-3.5 py-2.5 rounded-xl shadow-sm tracking-wide">
            {getRelativeDateLabel(selectedDate)}
          </span>

          {/* Date Picker Button */}
          <label className="relative flex items-center gap-2 px-3.5 py-2.5 sidebar-bg rounded-xl text-slate-700 dark:text-slate-200 shadow-sm cursor-pointer transition-all font-bold text-xs">
            <FiCalendar
              className="text-emerald-500 dark:text-emerald-400 shrink-0"
              size={14}
            />
            <span className="min-w-[80px] text-center">
              {format(selectedDate, "MMM dd, yyyy")}
            </span>
            <FiChevronDown className="text-slate-400" size={13} />
            <input
              type="date"
              value={format(selectedDate, "yyyy-MM-dd")}
              onChange={(e) => {
                if (e.target.value) {
                  const [y, m, d] = e.target.value.split("-").map(Number);
                  setSelectedDate(new Date(y, m - 1, d));
                }
              }}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </label>

          {/* Prev / Next buttons */}
          <div className="flex items-center  rounded-xl overflow-hidden sidebar-bg shadow-sm">
            <button
              onClick={() => setSelectedDate((prev) => subDays(prev, 1))}
              className="px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-600 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
              title="Previous Day"
            >
              <FiChevronLeft size={14} />
            </button>
            <button
              onClick={() => setSelectedDate((prev) => addDays(prev, 1))}
              className="px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              title="Next Day"
            >
              <FiChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
      {/* Premium Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-9 gap-3 lg:gap-2 relative z-10">
        {[
          {
            label:
              user?.role === "admin" || user?.role === "operationmanager"
                ? targetDept.toLowerCase().endsWith("s")
                  ? `Total ${targetDept}`
                  : `Total ${targetDept}s`
                : `Assigned ${targetDept}`,
            value: metrics.designersWorking,
            icon: FiUsers,
            glow: "hover:shadow-[0_4px_20px_rgba(59,130,246,0.15)]",
            bg: "bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-800 dark:to-blue-900 border border-blue-200/50 dark:border-blue-900/30",
            labelColor: "text-white dark:text-white",
            valueColor: "text-slate-100 dark:text-white",
            iconBg:
              "bg-blue-100 dark:bg-blue-950 border border-blue-200 dark:border-blue-500",
            iconColor: "text-blue-600 dark:text-blue-400",
            onClick: () => {
              performanceTableRef.current?.scrollIntoView({
                behavior: "smooth",
              });
            },
          },
          {
            label: "Assigned",
            value: metrics.tasksAssigned,
            icon: FiLayers,
            glow: "hover:shadow-[0_4px_20px_rgba(99,102,241,0.15)]",
            bg: "bg-gradient-to-br from-violet-400 to-violet-500 dark:from-red-950 dark:to-indigo-900 border border-indigo-200/50 dark:border-indigo-900/30",
            labelColor: "text-white dark:text-white",
            valueColor: "text-slate-100 dark:text-white",
            iconBg:
              "bg-indigo-100 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-500/20",
            iconColor: "text-indigo-600 dark:text-indigo-400",
            onClick: () => handleMetricClick("All"),
          },
          {
            label: "Not Started",
            value: metrics.pending,
            icon: FiClock,
            glow: "hover:shadow-[0_4px_20px_rgba(245,158,11,0.15)]",
            bg: "bg-slate-300 dark:bg-slate-300 border border-amber-200/50 dark:border-amber-900/30",
            labelColor: "text-white dark:text-white",
            valueColor: "text-slate-100 dark:text-white",
            iconBg:
              "bg-white dark:bg-amber-950/60 border border-amber-200 dark:border-amber-500/20",
            iconColor: "text-black dark:text-amber-400",
            onClick: () => handleMetricClick("Not Started"),
          },
          {
            label: "In Progress",
            value: metrics.inProgress,
            icon: FiPlay,
            glow: "hover:shadow-[0_4px_20px_rgba(14,165,233,0.15)]",
            bg: "bg-gradient-to-br from-sky-400 to-sky-600 dark:from-sky-850 dark:to-sky-950 border border-sky-200/50 dark:border-sky-900/30",
            labelColor: "text-white dark:text-white",
            valueColor: "text-slate-100 dark:text-white",
            iconBg:
              "bg-sky-100 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-500/20",
            iconColor: "text-sky-600 dark:text-sky-400",
            onClick: () => handleMetricClick("In Progress"),
          },
          {
            label: "On Hold",
            value: metrics.onHold,
            icon: FiPauseCircle,
            glow: "hover:shadow-[0_4px_20px_rgba(217,70,239,0.15)]",
            bg: "bg-gradient-to-br from-fuchsia-500 to-fuchsia-600 dark:from-fuchsia-800 dark:to-fuchsia-900 border border-fuchsia-200/50 dark:border-fuchsia-900/30",
            labelColor: "text-white dark:text-white",
            valueColor: "text-slate-100 dark:text-white",
            iconBg:
              "bg-fuchsia-100 dark:bg-fuchsia-950/60 border border-fuchsia-200 dark:border-fuchsia-500/20",
            iconColor: "text-fuchsia-600 dark:text-fuchsia-400",
            onClick: () => handleMetricClick("On Hold"),
          },
          {
            label: "In Review",
            value: metrics.inReview,
            icon: FiEye,
            glow: "hover:shadow-[0_4px_20px_rgba(99,102,241,0.15)]",
            bg: "bg-yellow-400 dark:from-indigo-850 dark:to-indigo-950 border border-indigo-200/50 dark:border-indigo-900/30",
            labelColor: "text-white dark:text-white",
            valueColor: "text-slate-100 dark:text-white",
            iconBg:
              "bg-indigo-100 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-500/20",
            iconColor: "text-indigo-600 dark:text-indigo-400",
            onClick: () => handleMetricClick("In Review"),
          },

          {
            label: "Completed",
            value: metrics.completed,
            icon: FiCheckCircle,
            glow: "hover:shadow-[0_4px_20px_rgba(16,185,129,0.15)]",
            bg: "bg-gradient-to-br from-emerald-400 to-emerald-500 dark:from-emerald-700 dark:to-emerald-800 border border-emerald-200/50 dark:border-emerald-900/30",
            labelColor: "text-white dark:text-white",
            valueColor: "text-slate-100 dark:text-white",
            iconBg:
              "bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-500/20",
            iconColor: "text-emerald-600 dark:text-emerald-400",
            onClick: () => handleMetricClick("Completed"),
          },

          {
            label: "Due Tasks",
            value: metrics.dueToday,
            icon: FiCalendar,
            glow: "hover:shadow-[0_4px_20px_rgba(245,158,11,0.15)]",
            bg: "bg-gradient-to-br from-amber-500 to-orange-500 dark:from-amber-700 dark:to-orange-800 border border-amber-200/50 dark:border-amber-900/30",
            labelColor: "text-white dark:text-white",
            valueColor: "text-slate-100 dark:text-white",
            iconBg:
              "bg-amber-100 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-500/20",
            iconColor: "text-amber-600 dark:text-amber-400",
            onClick: () => handleMetricClick("Due Today"),
          },
          {
            label: "Team Efficiency",
            value: `${avgEfficiency}%`,
            icon: FiTrendingUp,
            glow: "hover:shadow-[0_4px_20px_rgba(139,92,246,0.15)]",
            bg: "bg-gradient-to-br from-indigo-500 to-purple-600 dark:from-indigo-950 dark:to-purple-900 border border-indigo-200/50 dark:border-indigo-900/30",
            labelColor: "text-white dark:text-white",
            valueColor: "text-slate-100 dark:text-white",
            iconBg:
              "bg-indigo-100 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-500/20",
            iconColor: "text-indigo-600 dark:text-indigo-400",
            onClick: () => {
              performanceTableRef.current?.scrollIntoView({
                behavior: "smooth",
              });
            },
          },
        ].map((m, i) => {
          const IconComponent = m.icon;
          return (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              key={i}
              onClick={m.onClick}
              className={`flex flex-col text-left p-3 rounded-2xl ${m.bg} ${m.glow} relative overflow-hidden group hover:scale-[1.03] transition-all duration-300 backdrop-blur-md shadow-sm ${m.onClick ? "cursor-pointer" : ""}`}
            >
              {/* Decorative light reflection overlay */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-white/10 to-transparent rounded-full -mr-6 -mt-6 blur-md pointer-events-none" />

              <div className="flex items-center justify-between mb-3 relative z-10">
                <span
                  className={`text-3xl font-black ${m.valueColor} tracking-tight`}
                >
                  {m.value}
                </span>
                <div
                  className={`p-2 rounded-xl ${m.iconBg} group-hover:scale-110 transition-transform duration-300`}
                >
                  <IconComponent size={10} className={m.iconColor} />
                </div>
              </div>

              <span
                className={`text-[10px] font-black tracking-widest uppercase mt-1 leading-tight relative z-10 ${m.labelColor}`}
              >
                {m.label}
              </span>
            </motion.div>
          );
        })}
      </div>

      {/* Live Task Board */}
      <div className="relative z-10 space-y-3">
        {/* Header & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-bold text-slate-800 dark:text-white tracking-wide flex items-center gap-2">
              <FiLayers
                className="text-indigo-500 dark:text-indigo-400"
                size={18}
              />
              Live Task Board
            </h3>
            <span className="flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-500/20 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              LIVE SYNC
            </span>
            {/* Active filter count badge */}
            {(() => {
              const activeCount = [
                boardFilter.search.trim() !== "",
                boardFilter.assignee !== "All",
                boardFilter.priority !== "All",
                boardFilter.client !== "All",
              ].filter(Boolean).length;
              return activeCount > 0 ? (
                <span className="flex items-center gap-1 text-[10px] font-black bg-indigo-500 text-white px-2.5 py-0.5 rounded-full shadow-sm">
                  <FiFilter size={9} />
                  {activeCount} filter{activeCount > 1 ? "s" : ""} active
                </span>
              ) : null;
            })()}
          </div>

          {/* Filter toggle + Column Scroll Controls */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={() => setShowBoardFilter((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl  text-xs font-bold transition-all cursor-pointer ${
                showBoardFilter
                  ? "bg-indigo-500 text-white border-indigo-600 shadow-md"
                  : "sidebar-bg text-slate-600 dark:text-slate-300  hover:text-indigo-600"
              }`}
              title="Toggle Board Filters"
            >
              <FiFilter size={13} />
              Filter
            </button>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 sidebar-bg px-2.5 py-1 rounded-lg ">
              {boardColumns.length} Columns
            </span>
          </div>
        </div>

        {/* Board Filter Panel */}
        {showBoardFilter && (
          <div className="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-4 shadow-md">
            <div className="flex flex-wrap gap-3 items-end">
              {/* Search */}
              <div className="flex-1 min-w-[160px]">
                <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5">
                  Search Task
                </label>
                <div className="relative">
                  <FiSearch
                    size={12}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    value={boardFilter.search}
                    onChange={(e) =>
                      setBoardFilter((f) => ({ ...f, search: e.target.value }))
                    }
                    placeholder="Search by task or project..."
                    className="w-full pl-7 pr-3 py-1.5 text-xs font-medium bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600/60 rounded-lg text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/50 focus:border-indigo-400 transition-all"
                  />
                </div>
              </div>

              {/* Assignee */}
              <div className="min-w-[140px]">
                <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5">
                  Assignee
                </label>
                <select
                  value={boardFilter.assignee}
                  onChange={(e) =>
                    setBoardFilter((f) => ({ ...f, assignee: e.target.value }))
                  }
                  className="w-full px-2.5 py-1.5 text-xs font-medium bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600/60 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400/50 cursor-pointer"
                >
                  <option value="All">All Designers</option>
                  {designers.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Priority */}
              <div className="min-w-[120px]">
                <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5">
                  Priority
                </label>
                <select
                  value={boardFilter.priority}
                  onChange={(e) =>
                    setBoardFilter((f) => ({ ...f, priority: e.target.value }))
                  }
                  className="w-full px-2.5 py-1.5 text-xs font-medium bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600/60 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400/50 cursor-pointer"
                >
                  <option value="All">All Priorities</option>
                  <option value="Top High">🔴 Top High</option>
                  <option value="High">🟠 High</option>
                  <option value="Medium">🔵 Medium</option>
                  <option value="Low">🟢 Low</option>
                </select>
              </div>

              {/* Client */}
              <div className="min-w-[140px]">
                <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5">
                  Client
                </label>
                <select
                  value={boardFilter.client}
                  onChange={(e) =>
                    setBoardFilter((f) => ({ ...f, client: e.target.value }))
                  }
                  className="w-full px-2.5 py-1.5 text-xs font-medium bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600/60 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400/50 cursor-pointer"
                >
                  <option value="All">All Clients</option>
                  {clients?.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.companyName || c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Clear All */}
              {(boardFilter.search ||
                boardFilter.assignee !== "All" ||
                boardFilter.priority !== "All" ||
                boardFilter.client !== "All") && (
                <button
                  onClick={() =>
                    setBoardFilter({
                      search: "",
                      assignee: "All",
                      priority: "All",
                      client: "All",
                    })
                  }
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-all cursor-pointer self-end"
                >
                  <FiX size={11} />
                  Clear All
                </button>
              )}

              {/* Task count indicator */}
              <div className="self-end ml-auto">
                <span className="text-[10px] font-black text-slate-500 dark:text-slate-400">
                  Showing{" "}
                  <span className="text-indigo-600 dark:text-indigo-400">
                    {boardFilteredTasks.length}
                  </span>{" "}
                  / {designerTasks.length} tasks
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Kanban Columns (Scrollable on Mobile, Stretched on Desktop) */}
        <div className="flex flex-nowrap overflow-x-auto gap-4 pb-4 pt-1 px-0.5 custom-scrollbar w-full min-h-[400px]">
          {boardColumns.map((col, i) => {
            let colBg = "bg-slate-50 dark:bg-slate-800/80";
            let boardBg = "bg-slate-50/60 dark:bg-[#0f172a]";
            let colBorder = "border-slate-200 dark:border-slate-700/80";
            let textCol = "text-slate-800 dark:text-white";
            let countBg = "bg-slate-200 dark:bg-slate-700";
            let countText = "text-slate-700 dark:text-slate-300";

            const lowerCol = col.toLowerCase();
            const isOverdueCol = lowerCol === "overall overdue";

            if (isOverdueCol) {
              colBg = "bg-red-500 dark:bg-red-650";
              boardBg = "bg-red-50/15 dark:bg-[#0f172a]";
              textCol = "text-white dark:text-white";
              colBorder = "border-red-200 dark:border-red-800/50";
              countBg = "bg-red-100 dark:bg-red-900/40";
              countText = "text-red-800 dark:text-red-300";
            } else if (lowerCol === "pending") {
              colBg = "bg-black dark:bg-white";
              boardBg = "bg-slate-50/50 dark:bg-[#0f172a]";
              textCol = "text-white dark:text-black";
              colBorder = "border-slate-300 dark:border-slate-600";
              countBg = "bg-slate-200 dark:bg-slate-700";
              countText = "text-slate-800 dark:text-slate-100";
            } else if (lowerCol === "in progress") {
              colBg = "bg-blue-500 dark:bg-blue-600";
              boardBg = "bg-blue-50/30 dark:bg-[#0f172a]";
              textCol = "text-white dark:text-white";
              colBorder = "border-blue-200 dark:border-blue-800/50";
              countBg = "bg-blue-100 dark:bg-blue-800/50";
              countText = "text-blue-800 dark:text-blue-300";
            } else if (lowerCol === "on hold") {
              colBg = "bg-fuchsia-600 dark:bg-fuchsia-600";
              boardBg = "bg-fuchsia-50/20 dark:bg-[#0f172a]";
              textCol = "text-white dark:text-white";
              colBorder = "border-fuchsia-200 dark:border-fuchsia-800/50";
              countBg = "bg-fuchsia-100 dark:bg-fuchsia-800/50";
              countText = "text-fuchsia-800 dark:text-fuchsia-300";
            } else if (lowerCol === "in review") {
              colBg = "bg-amber-400 dark:bg-amber-400";
              boardBg = "bg-indigo-50/30 dark:bg-[#0f172a]";
              textCol = "text-slate-900 dark:text-white";
              colBorder = "border-indigo-200 dark:border-indigo-800/50";
              countBg = "bg-amber-100 dark:bg-indigo-800/50";
              countText = "text-amber-900 dark:text-indigo-300";
            } else if (lowerCol === "completed") {
              colBg = "bg-emerald-500 dark:bg-emerald-600";
              boardBg = "bg-emerald-50/30 dark:bg-[#0f172a]";
              textCol = "text-white dark:text-white";
              colBorder = "border-emerald-200 dark:border-emerald-800/50";
              countBg = "bg-emerald-100 dark:bg-emerald-800/50";
              countText = "text-emerald-800 dark:text-emerald-300";
            } else if (lowerCol === "rejected") {
              colBg = "bg-rose-500 dark:bg-rose-600";
              boardBg = "bg-rose-50/30 dark:bg-[#0f172a]";
              textCol = "text-white dark:text-white";
              colBorder = "border-rose-200 dark:border-rose-800/50";
              countBg = "bg-rose-100 dark:bg-rose-800/50";
              countText = "text-rose-800 dark:text-rose-300";
            }

            const columnTasks = tasksByColumn[col] || [];
            const { previousTasks, todayTasks, upcomingTasks } =
              splitTasksByDateCategory(columnTasks, col, selectedDate);

            const prevConfig = getSectionConfig(col, "prev");
            const todayConfig = getSectionConfig(col, "today");
            const upcomingConfig = getSectionConfig(col, "upcoming");

            const isCompletedCol = lowerCol === "completed";

            if (!isCompletedCol) {
              return (
                <div
                  key={i}
                  className={`flex-1 min-w-[250px] shrink-0 ${boardBg} backdrop-blur-md rounded-2xl border ${colBorder} flex flex-col max-h-[600px] shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden`}
                >
                  <div
                    className={`p-3 px-3.5 border-b flex flex-col gap-1.5 rounded-t-2xl backdrop-blur-md ${colBg} ${colBorder}`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-black tracking-wider uppercase truncate max-w-[70%] ${textCol}`}
                        title={col}
                      >
                        {col}
                      </span>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${countBg} ${countText}`}
                      >
                        {columnTasks.length}
                      </span>
                    </div>

                    {/* Header breakdown pills */}
                    <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
                      <span
                        className="text-[8.5px] font-black px-1.5 py-0.5 rounded bg-black/15 dark:bg-white/15 text-white dark:text-slate-100 border border-white/20 whitespace-nowrap"
                        title={prevConfig.title}
                      >
                        Prev: {previousTasks.length}
                      </span>
                      <span
                        className="text-[8.5px] font-black px-1.5 py-0.5 rounded bg-black/15 dark:bg-white/15 text-white dark:text-slate-100 border border-white/20 whitespace-nowrap"
                        title={todayConfig.title}
                      >
                        Today: {todayTasks.length}
                      </span>
                      <span
                        className="text-[8.5px] font-black px-1.5 py-0.5 rounded bg-black/15 dark:bg-white/15 text-white dark:text-slate-100 border border-white/20 whitespace-nowrap"
                        title={upcomingConfig.title}
                      >
                        Upcoming: {upcomingTasks.length}
                      </span>
                    </div>
                  </div>

                  <div className="p-2.5 overflow-y-auto space-y-3 flex-1 custom-scrollbar">
                    <div className="space-y-3">
                      {/* Previous Section */}
                      <div className="space-y-1.5">
                        <div
                          className={`flex items-center justify-between px-2 py-1 rounded-lg border ${prevConfig.badgeContainer}`}
                        >
                          <span
                            className={`text-[9px] font-black uppercase tracking-wider truncate ${prevConfig.titleColor}`}
                          >
                            {prevConfig.title}
                          </span>
                          <span
                            className={`text-[9px] font-black px-1.5 py-0.5 rounded-md shrink-0 ${prevConfig.countBadge}`}
                          >
                            {previousTasks.length}
                          </span>
                        </div>
                        <div className="space-y-2">
                          <AnimatePresence>
                            {previousTasks.length > 0 ? (
                              previousTasks.map((task) => renderTaskCard(task))
                            ) : (
                              <p className="text-[10px] text-slate-400 dark:text-slate-500 italic text-center py-1.5">
                                {prevConfig.emptyText}
                              </p>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>

                      {/* Today Section */}
                      <div className="space-y-1.5">
                        <div
                          className={`flex items-center justify-between px-2 py-1 rounded-lg border ${todayConfig.badgeContainer}`}
                        >
                          <span
                            className={`text-[9px] font-black uppercase tracking-wider truncate ${todayConfig.titleColor}`}
                          >
                            {todayConfig.title}
                          </span>
                          <span
                            className={`text-[9px] font-black px-1.5 py-0.5 rounded-md shrink-0 ${todayConfig.countBadge}`}
                          >
                            {todayTasks.length}
                          </span>
                        </div>
                        <div className="space-y-2">
                          <AnimatePresence>
                            {todayTasks.length > 0 ? (
                              todayTasks.map((task) => renderTaskCard(task))
                            ) : (
                              <p className="text-[10px] text-slate-400 dark:text-slate-500 italic text-center py-1.5">
                                {todayConfig.emptyText}
                              </p>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>

                      {/* Upcoming Section */}
                      <div className="space-y-1.5">
                        <div
                          className={`flex items-center justify-between px-2 py-1 rounded-lg border ${upcomingConfig.badgeContainer}`}
                        >
                          <span
                            className={`text-[9px] font-black uppercase tracking-wider truncate ${upcomingConfig.titleColor}`}
                          >
                            {upcomingConfig.title}
                          </span>
                          <span
                            className={`text-[9px] font-black px-1.5 py-0.5 rounded-md shrink-0 ${upcomingConfig.countBadge}`}
                          >
                            {upcomingTasks.length}
                          </span>
                        </div>
                        <div className="space-y-2">
                          <AnimatePresence>
                            {upcomingTasks.length > 0 ? (
                              upcomingTasks.map((task) => renderTaskCard(task))
                            ) : (
                              <p className="text-[10px] text-slate-400 dark:text-slate-500 italic text-center py-1.5">
                                {upcomingConfig.emptyText}
                              </p>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={i}
                className={`flex-1 min-w-[250px] shrink-0 ${boardBg} backdrop-blur-md rounded-2xl border ${colBorder} flex flex-col max-h-[600px] shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden`}
              >
                <div
                  className={`p-3 px-3.5 border-b flex items-center justify-between rounded-t-2xl backdrop-blur-md ${colBg} ${colBorder}`}
                >
                  <span
                    className={`text-xs font-black tracking-wider uppercase truncate max-w-[75%] ${textCol}`}
                    title={col}
                  >
                    {col}
                  </span>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${countBg} ${countText}`}
                  >
                    {todayTasks.length}
                  </span>
                </div>

                <div className="p-2.5 overflow-y-auto space-y-2 flex-1 custom-scrollbar">
                  <AnimatePresence>
                    {todayTasks.length > 0 ? (
                      todayTasks.map((task) => renderTaskCard(task))
                    ) : (
                      <div className="py-8 text-center space-y-1">
                        <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 italic">
                          {todayConfig.emptyText}
                        </p>
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="relative z-10 scroll-mt-6" ref={performanceTableRef}>
        {/* Merged Layout: Team Performance & Today's Productivity (Full Width Single Table) */}
        <div className="sidebar-bg rounded-2xl overflow-hidden shadow-sm dark:shadow-2xl flex flex-col w-full">
          {/* Header */}
          <div className="px-4 py-3 min-h-[58px] border-b border-slate-200 dark:border-slate-800  flex flex-wrap items-center justify-between gap-2.5">
            <div className="min-w-0">
              <h3 className="text-sm font-black text-slate-800 dark:text-white tracking-wide uppercase truncate">
                <span className="text-xl bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
                  {targetDept}
                </span>{" "}
                - Team Performance & Today's Productivity
              </h3>
              <span className="text-[10.5px] font-bold text-slate-400 dark:text-slate-500 tracking-wide truncate block">
                Today's Assigned, Carry Forward & Actual Work Tracker
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg  text-[12px] font-extrabold text-slate-700 dark:text-slate-300">
                <span className="px-1.5 py-0.3 rounded  sidebar-bg text-slate-800 dark:text-slate-200 text-[12px] font-black uppercase">
                  CF
                </span>
                <span>Carry Forward</span>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/40 dark:border-emerald-800/40 text-[12px] font-extrabold text-emerald-600 dark:text-emerald-400">
                <span>Office:</span>
                <span>
                  {(() => {
                    const s = officeHours.startHour;
                    const e = officeHours.endHour;
                    const fmt = (h) => {
                      const ampm = h >= 12 ? "PM" : "AM";
                      const val = h % 12 === 0 ? 12 : h % 12;
                      return `${val} ${ampm}`;
                    };
                    return `${fmt(s)}–${fmt(e)}`;
                  })()}
                </span>
              </div>
             
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg sidebar-bg border border-slate-200/60 dark:border-slate-800 text-[9px] font-extrabold text-slate-700 dark:text-slate-300">
                <FiCalendar
                  className="text-indigo-500 dark:text-indigo-400 shrink-0"
                  size={14}
                />
                <span className="text-[12px]">
                  {format(selectedDate, "MMM dd")}
                </span>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse table-auto border border-slate-250 dark:border-slate-700/80">
              <thead>
                <tr className="h-[40px] bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                  <th className="h-[40px] py-1.5 px-2.5 align-middle border-b border-slate-250 dark:border-slate-700/80 text-[11px] font-black tracking-wider text-slate-700 dark:text-slate-200 uppercase whitespace-nowrap min-w-[125px]">
                    Designer
                  </th>
                  <th className="h-[40px] py-1.5 px-2 align-middle border-b border-slate-250 dark:border-slate-700/80 text-[11px] font-black tracking-wider uppercase bg-slate-200/80 dark:bg-slate-700/60 text-slate-800 dark:text-slate-100 whitespace-nowrap text-center">
                    Assigned
                  </th>
                  <th className="h-[40px] py-1.5 px-2 align-middle border-b border-slate-250 dark:border-slate-700/80 text-[11px] font-black tracking-wider uppercase bg-red-100/80 dark:bg-red-950/60 text-red-700 dark:text-red-300 whitespace-nowrap text-center">
                    Not Started
                  </th>
                  <th className="h-[40px] py-1.5 px-2 align-middle border-b border-slate-250 dark:border-slate-700/80 text-[11px] font-black tracking-wider uppercase bg-violet-100/80 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 whitespace-nowrap text-center">
                    In-progress
                  </th>
                  <th className="h-[40px] py-1.5 px-2 align-middle border-b border-slate-250 dark:border-slate-700/80 text-[11px] font-black tracking-wider uppercase bg-fuchsia-100/80 dark:bg-fuchsia-950/60 text-fuchsia-700 dark:text-fuchsia-300 whitespace-nowrap text-center">
                   On-Hold
                  </th>
                  <th className="h-[40px] py-1.5 px-2 align-middle border-b border-slate-250 dark:border-slate-700/80 text-[11px] font-black tracking-wider uppercase bg-amber-100/80 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 whitespace-nowrap text-center">
                    IN-Review
                  </th>
                  <th className="h-[40px] py-1.5 px-2 align-middle border-b border-slate-250 dark:border-slate-700/80 text-[11px] font-black tracking-wider uppercase bg-emerald-100/80 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 whitespace-nowrap text-center">
                    Done
                  </th>

                  <th className="h-[40px] py-1.5 px-2 align-middle border-b border-slate-250 dark:border-slate-700/80 text-[11px] font-black tracking-wider uppercase text-slate-700 dark:text-slate-200 whitespace-nowrap text-center">
                    Rev
                  </th>


                  <th className="h-[40px] py-1.5 px-2 align-middle border-b border-slate-250 dark:border-slate-700/80 text-[11px] font-black tracking-wider uppercase text-slate-700 dark:text-slate-200 whitespace-nowrap text-center">
                    Unproductive Hours
                  </th>
                  <th className="h-[40px] py-1.5 px-2 align-middle border-b border-slate-250 dark:border-slate-700/80 text-[11px] font-black tracking-wider uppercase text-slate-700 dark:text-slate-200 whitespace-nowrap text-center">
                    Productive Hours
                  </th>
                  <th className="h-[40px] py-1.5 px-2 align-middle border-b border-slate-250 dark:border-slate-700/80 text-[11px] font-black tracking-wider uppercase text-slate-700 dark:text-slate-200 whitespace-nowrap text-center">
                    Efficieny
                  </th>

                  <th className="h-[40px] py-1.5 px-2 align-middle border-b border-slate-250 dark:border-slate-700/80 text-[11px] font-black tracking-wider uppercase text-rose-700 dark:text-rose-300 bg-rose-100/80 dark:bg-rose-950/60 whitespace-nowrap text-center">
                    Dly
                  </th>
                  <th className="h-[40px] py-1.5 px-2 align-middle border-b border-slate-250 dark:border-slate-700/80 text-[11px] font-black tracking-wider text-slate-700 dark:text-slate-200 uppercase whitespace-nowrap text-center">
                    Submitted
                  </th>
                  <th className="h-[40px] py-1.5 px-2 align-middle border-b border-slate-250 dark:border-slate-700/80 text-[11px] font-black tracking-wider text-slate-700 dark:text-slate-200 uppercase whitespace-nowrap text-center">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {teamPerformance.map((tp, idx) => {
                  const isOnline =
                    onlineUserIds.includes(tp.id) ||
                    tp.isOnline ||
                    tp.isUserOnline ||
                    tp.status === "online" ||
                    tp.userStatus === "online";

                  const avatarColors = [
                    "bg-blue-500",
                    "bg-violet-500",
                    "bg-rose-500",
                    "bg-emerald-500",
                    "bg-amber-500",
                    "bg-cyan-500",
                    "bg-pink-500",
                    "bg-indigo-500",
                  ];
                  const avatarBg = avatarColors[idx % avatarColors.length];

                  const totalOfficeMs =
                    (officeHours.endHour - officeHours.startHour) * 3600 * 1000;
                  const efficiency =
                    totalOfficeMs > 0
                      ? Math.min(
                          100,
                          Math.round((tp.totalLoggedMs / totalOfficeMs) * 100),
                        )
                      : 0;

                  const efficiencyColor =
                    efficiency >= 80
                      ? "bg-emerald-100 text-emerald-755 dark:bg-emerald-950/40 dark:text-emerald-400"
                      : efficiency >= 50
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400"
                        : "bg-slate-100 text-slate-500 dark:bg-slate-800/50 dark:text-slate-400";

                  const revVal =
                    tp.totalRevisions !== undefined
                      ? tp.totalRevisions
                      : Math.round(tp.avgRevisions || 0);

                  const delayCount = (tp.tasks || []).filter((t) => {
                    const s = (t.status || "").toLowerCase();
                    if (
                      s === "completed" ||
                      s.includes("approve") ||
                      s.includes("reject") ||
                      s.includes("cancel")
                    )
                      return false;
                    if (!t.dueDate) return false;
                    return isBefore(
                      startOfDay(parseISO(t.dueDate)),
                      startOfDay(selectedDate),
                    );
                  }).length;

                  return (
                    <tr
                      key={tp.id}
                      className="h-[42px] hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      {/* Designer */}
                      <td className="py-2 px-2 border-b border-slate-250 dark:border-slate-700/80">
                        <div className="flex items-center gap-2">
                          <div className="relative shrink-0">
                            {tp.profileImage ? (
                              <img
                                src={tp.profileImage}
                                alt={tp.name}
                                className="w-6.5 h-6.5 rounded-full object-cover border border-white dark:border-slate-700 shadow-2xs"
                              />
                            ) : (
                              <div
                                className={`w-6.5 h-6.5 rounded-full ${avatarBg} text-white text-[9.5px] font-black flex items-center justify-center shrink-0 shadow-2xs`}
                              >
                                {getInitials(tp.name)}
                              </div>
                            )}
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white dark:border-slate-900 ${isOnline ? "bg-emerald-500 animate-pulse" : "bg-slate-300 dark:bg-slate-500"}`}
                              title={isOnline ? "Online" : "Offline"}
                            />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-[11.5px] font-black text-slate-800 dark:text-white truncate max-w-[110px] leading-tight">
                              {tp.name}
                            </span>
                            <span
                              className={`text-[8.5px] font-bold leading-none mt-0.5 ${isOnline ? "text-emerald-500" : "text-slate-400 dark:text-slate-400"}`}
                            >
                              {isOnline ? "Online" : "Offline"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Today Assigned */}
                      <td className="py-2 px-2 border-b border-slate-250 dark:border-slate-700/80 text-center">
                        <StatusCellValue
                          todayVal={tp.assigned}
                          carryVal={tp.carryForward?.assigned || 0}
                          activeTextClass="text-slate-800 dark:text-slate-200"
                          badgeClass="bg-white dark:bg-slate-955 text-slate-650 dark:text-slate-350 border-slate-200 dark:border-slate-800/60 shadow-3xs"
                        />
                      </td>

                      {/* Pending */}
                      <td className="py-2 px-2 border-b border-slate-250 dark:border-slate-700/80 text-center bg-slate-200 dark:bg-slate-100">
                        <StatusCellValue
                          todayVal={tp.pending}
                          carryVal={tp.carryForward?.pending || 0}
                          activeTextClass="text-red-600 dark:text-red-400"
                          badgeClass="bg-white dark:bg-slate-955 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/60 shadow-3xs"
                        />
                      </td>

                      {/* In Progress */}
                      <td className="py-2 px-2 border-b border-slate-250 dark:border-slate-700/80 text-center bg-violet-200 dark:bg-violet-400">
                        <StatusCellValue
                          todayVal={tp.inProgress}
                          carryVal={tp.carryForward?.inProgress || 0}
                          activeTextClass="text-violet-600 dark:text-violet-400"
                          badgeClass="bg-white dark:bg-slate-955 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-900/60 shadow-3xs"
                          showRunningIndicator={true}
                        />
                      </td>

                      {/* On Hold */}
                      <td className="py-2 px-2 border-b border-slate-250 dark:border-slate-700/80 text-center bg-orange-200 dark:bg-orange-400">
                        <StatusCellValue
                          todayVal={tp.onHold}
                          carryVal={tp.carryForward?.onHold || 0}
                          activeTextClass="text-orange-600 dark:text-orange-400"
                          badgeClass="bg-white dark:bg-slate-955 text-orange-600 dark:text-orange-400 border-orange-200/50 dark:border-orange-900/60 shadow-3xs"
                        />
                      </td>

                      {/* In Review */}
                      <td className="py-2 px-2 border-b border-slate-250 dark:border-slate-700/80 text-center bg-amber-200 dark:bg-amber-400">
                        <StatusCellValue
                          todayVal={tp.inReview}
                          carryVal={tp.carryForward?.inReview || 0}
                          activeTextClass="text-amber-600 dark:text-amber-400"
                          badgeClass="bg-white dark:bg-slate-955 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/60 shadow-3xs"
                        />
                      </td>

                      {/* Completed */}
                      <td className="py-2 px-2 border-b border-slate-250 dark:border-slate-700/80 text-center bg-emerald-200 dark:bg-emerald-400">
                        <StatusCellValue
                          todayVal={tp.completed}
                          carryVal={tp.carryForward?.completed || 0}
                          activeTextClass="text-emerald-600 dark:text-emerald-400"
                          badgeClass="bg-white dark:bg-slate-955 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/60 shadow-3xs"
                        />
                      </td>

                      {/* Revisions */}
                      <td className="py-2 px-2 border-b border-slate-250 dark:border-slate-700/80 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-black border ${
                            revVal === 0
                              ? "bg-slate-50 text-slate-400 border-slate-200 dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-700"
                              : revVal <= 1
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/40"
                                : revVal <= 3
                                  ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-955/30 dark:text-amber-400 dark:border-amber-800/40"
                                  : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-955/30 dark:text-rose-400 dark:border-rose-800/40"
                          }`}
                        >
                          {revVal} rev
                        </span>
                      </td>



                      {/* Unproductive Time */}
                      <td className="py-2 px-2 border-b border-slate-250 dark:border-slate-700/80 text-center whitespace-nowrap">
                        {tp.onHoldTimeMs > 0 ? (
                          <span className="text-orange-600 dark:text-orange-400 font-black text-[11.5px]">
                            {(() => {
                              const totalMinutes = Math.floor(
                                tp.onHoldTimeMs / (1000 * 60),
                              );
                              const h = Math.floor(totalMinutes / 60);
                              const m = totalMinutes % 60;
                              return h > 0 ? `${h}h ${m}m` : `${m}m`;
                            })()}
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 font-bold text-[11.5px]">
                            0m
                          </span>
                        )}
                      </td>

                      {/* Productive Time — live when In Progress */}
                      <td className="py-2 px-2 border-b border-slate-250 dark:border-slate-700/80 text-center whitespace-nowrap">
                        <LiveProductivityCell
                          tasks={tp.tasks}
                          initialLoggedMs={tp.totalLoggedMs}
                          selectedDate={selectedDate}
                          officeHours={officeHours}
                        />
                      </td>

                      {/* Efficiency */}
                      <td className="py-2 px-2 border-b border-slate-250 dark:border-slate-700/80 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-black border-0 ${efficiencyColor}`}
                        >
                          {efficiency}%
                        </span>
                      </td>

                      {/* Delays */}
                      <td className="py-2 px-1.5 border-b border-slate-250 dark:border-slate-700/80 text-center whitespace-nowrap">
                        {delayCount === 0 ? (
                          <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">
                            0
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-xs text-[9.5px] font-black bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40 shadow-3xs whitespace-nowrap">
                            {delayCount} Dly
                          </span>
                        )}
                      </td>

                      {/* Last Submitted */}
                      <td className="py-2 px-2 border-b border-slate-250 dark:border-slate-700/80 text-center">
                        {tp.lastSubmitted === "Not submitted" ? (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                            Nil
                          </span>
                        ) : tp.lastSubmitted === "Draft" ? (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-black text-amber-500 dark:text-amber-400 animate-pulse">
                            Draft
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-black text-emerald-600 dark:text-emerald-400">
                            {tp.lastSubmitted}
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-2 px-2 border-b border-slate-250 dark:border-slate-700/80 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setViewTasksModal({
                              open: true,
                              designerId: tp.id,
                              designerName: tp.name,
                            });
                            setTaskTab("all");
                            setTaskSearch("");
                          }}
                          className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-805/40 transition-all cursor-pointer flex items-center justify-center mx-auto shadow-2xs"
                          title="View Performance Tasks"
                        >
                          <FiEye size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Total row */}
              {teamPerformance.length > 0 &&
                (() => {
                  const totalTasksWorkedOn = teamPerformance.reduce(
                    (s, tp) => s + tp.tasksWorkedOn,
                    0,
                  );
                  const totalLoggedAll = teamPerformance.reduce(
                    (s, tp) => s + tp.totalLoggedMs,
                    0,
                  );
                  const totalOfficeMs =
                    (officeHours.endHour - officeHours.startHour) * 3600 * 1000;
                  const totalPossibleMs =
                    teamPerformance.length * totalOfficeMs;
                  const avgEfficiency =
                    totalPossibleMs > 0
                      ? Math.min(
                          100,
                          Math.round((totalLoggedAll / totalPossibleMs) * 100),
                        )
                      : 0;

                  const totalRevisionsSum = teamPerformance.reduce((s, tp) => {
                    const revVal =
                      tp.totalRevisions !== undefined
                        ? tp.totalRevisions
                        : Math.round(tp.avgRevisions || 0);
                    return s + revVal;
                  }, 0);

                  const totalBlockerTimeMs = teamPerformance.reduce(
                    (s, tp) => s + tp.blockerTimeMs,
                    0,
                  );
                  const totalBlockerSecs = Math.floor(
                    totalBlockerTimeMs / 1000,
                  );
                  const tbh = Math.floor(totalBlockerSecs / 3600);
                  const tbm = Math.floor((totalBlockerSecs % 3600) / 60);
                  const blockerFmt = tbh > 0 ? `${tbh}h ${tbm}m` : `${tbm}m`;

                  const totalDelaysSum = teamPerformance.reduce((s, tp) => {
                    const dCount = (tp.tasks || []).filter((t) => {
                      const st = (t.status || "").toLowerCase();
                      if (
                        st === "completed" ||
                        st.includes("approve") ||
                        st.includes("reject") ||
                        st.includes("cancel")
                      )
                        return false;
                      if (!t.dueDate) return false;
                      return isBefore(
                        startOfDay(parseISO(t.dueDate)),
                        startOfDay(selectedDate),
                      );
                    }).length;
                    return s + dCount;
                  }, 0);

                  const submittedCount = teamPerformance.filter(
                    (tp) =>
                      tp.lastSubmitted &&
                      tp.lastSubmitted !== "Not submitted" &&
                      tp.lastSubmitted !== "Draft",
                  ).length;
                  const totalUsers = teamPerformance.length;

                  return (
                    <tfoot>
                      <tr className="h-[42px]">
                        {/* Designer / Total */}
                        <td className="h-[42px]  bg-blue-600 py-2 px-2.5 align-middle text-[11.5px] font-black uppercase tracking-wider text-center border-r border-white/20 text-white">
                          Total
                        </td>

                        {/* Assigned */}
                        <td className="h-[42px] bg-blue-600 py-2 px-2 align-middle text-center border-r border-white/20 text-white">
                          <StatusCellValue
                            todayVal={teamPerformance.reduce(
                              (s, tp) => s + tp.assigned,
                              0,
                            )}
                            carryVal={teamPerformance.reduce(
                              (s, tp) => s + (tp.carryForward?.assigned || 0),
                              0,
                            )}
                            activeTextClass="text-white font-black text-[14px]"
                            inactiveTextClass="text-white font-black text-[14px]"
                            badgeClass="bg-white/20 text-white border border-white/40 font-bold text-[9px]"
                          />
                        </td>

                        {/* Pend */}
                        <td className="h-[42px] bg-blue-600 py-2 px-2 align-middle text-center border-r border-white/20 text-white">
                          <StatusCellValue
                            todayVal={teamPerformance.reduce(
                              (s, tp) => s + tp.pending,
                              0,
                            )}
                            carryVal={teamPerformance.reduce(
                              (s, tp) => s + (tp.carryForward?.pending || 0),
                              0,
                            )}
                            activeTextClass="text-white font-black text-[14px]"
                            inactiveTextClass="text-white font-black text-[14px]"
                            badgeClass="bg-white/20 text-white border border-white/40 font-bold text-[9px]"
                          />
                        </td>

                        {/* Prog */}
                        <td className="h-[42px] bg-blue-600 py-2 px-2 align-middle text-center border-r border-white/20 text-white">
                          <StatusCellValue
                            todayVal={teamPerformance.reduce(
                              (s, tp) => s + tp.inProgress,
                              0,
                            )}
                            carryVal={teamPerformance.reduce(
                              (s, tp) => s + (tp.carryForward?.inProgress || 0),
                              0,
                            )}
                            activeTextClass="text-white font-black text-[14px]"
                            inactiveTextClass="text-white font-black text-[14px]"
                            badgeClass="bg-white/20 text-white border border-white/40 font-bold text-[9px]"
                          />
                        </td>

                        {/* Hold */}
                        <td className="h-[42px] bg-blue-600 py-2 px-2 align-middle text-center border-r border-white/20 text-white">
                          <StatusCellValue
                            todayVal={teamPerformance.reduce(
                              (s, tp) => s + tp.onHold,
                              0,
                            )}
                            carryVal={teamPerformance.reduce(
                              (s, tp) => s + (tp.carryForward?.onHold || 0),
                              0,
                            )}
                            activeTextClass="text-white font-black text-[14px]"
                            inactiveTextClass="text-white font-black text-[14px]"
                            badgeClass="bg-white/20 text-white border border-white/40 font-bold text-[9px]"
                          />
                        </td>

                        {/* Review */}
                        <td className="h-[42px] bg-blue-600 py-2 px-2 align-middle text-center border-r border-white/20 text-white">
                          <StatusCellValue
                            todayVal={teamPerformance.reduce(
                              (s, tp) => s + tp.inReview,
                              0,
                            )}
                            carryVal={teamPerformance.reduce(
                              (s, tp) => s + (tp.carryForward?.inReview || 0),
                              0,
                            )}
                            activeTextClass="text-white font-black text-[14px]"
                            inactiveTextClass="text-white font-black text-[14px]"
                            badgeClass="bg-white/20 text-white border border-white/40 font-bold text-[9px]"
                          />
                        </td>

                        {/* Done */}
                        <td className="h-[42px] bg-blue-600 py-2 px-2 align-middle text-center border-r border-white/20 text-white">
                          <StatusCellValue
                            todayVal={teamPerformance.reduce(
                              (s, tp) => s + tp.completed,
                              0,
                            )}
                            carryVal={teamPerformance.reduce(
                              (s, tp) => s + (tp.carryForward?.completed || 0),
                              0,
                            )}
                            activeTextClass="text-white font-black text-[14px]"
                            inactiveTextClass="text-white font-black text-[14px]"
                            badgeClass="bg-white/20 text-white border border-white/40 font-bold text-[9px]"
                          />
                        </td>

                        {/* Revisions */}
                        <td className="h-[42px] bg-blue-600 py-2 px-2 align-middle text-center border-r border-white/20 text-white">
                          <span className="text-[11.5px] font-black text-white">
                            {totalRevisionsSum} rev
                          </span>
                        </td>



                        {/* Unproductive Time */}
                        <td className="h-[42px] bg-blue-600 py-2 px-2 align-middle text-center border-r border-white/20 text-white whitespace-nowrap">
                          {(() => {
                            const totalMs = teamPerformance.reduce(
                              (acc, tp) => acc + (tp.onHoldTimeMs || 0),
                              0,
                            );
                            if (totalMs === 0) {
                              return (
                                <span className="text-[12px] font-black text-white/70">
                                  0m
                                </span>
                              );
                            }
                            const totalMinutes = Math.floor(
                              totalMs / (1000 * 60),
                            );
                            const h = Math.floor(totalMinutes / 60);
                            const m = totalMinutes % 60;
                            return (
                              <span className="text-[12px] font-black">
                                {h > 0 ? `${h}h ${m}m` : `${m}m`}
                              </span>
                            );
                          })()}
                        </td>

                        {/* Productive Time */}
                        <td className="h-[42px] bg-blue-600 py-2 px-2 align-middle text-center border-r border-white/20 text-white whitespace-nowrap">
                          <LiveTotalProductivityCell
                            teamPerformance={teamPerformance}
                            selectedDate={selectedDate}
                            officeHours={officeHours}
                          />
                        </td>

                        {/* Efficiency */}
                        <td className="h-[42px] bg-blue-600 py-2 px-2 align-middle text-center border-r border-white/20 text-white">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-black shadow-2xs bg-white/20 text-white">
                            {avgEfficiency}%
                          </span>
                        </td>

                        {/* Delays Total */}
                        <td className="h-[42px] bg-blue-600 py-2 px-1.5 align-middle text-center border-r border-white/20 text-white whitespace-nowrap">
                          <span className="text-[11px] font-black text-white whitespace-nowrap">
                            {totalDelaysSum > 0
                              ? `${totalDelaysSum} Dly`
                              : "0 Dly"}
                          </span>
                        </td>

                        {/* Submitted */}
                        <td className="h-[42px] bg-blue-600 py-2 px-2 align-middle text-center border-r border-white/20 text-white whitespace-nowrap">
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-black bg-white/20 text-white shadow-2xs whitespace-nowrap"
                            title={`${submittedCount} out of ${totalUsers} users submitted report`}
                          >
                            {submittedCount}/{totalUsers}
                          </span>
                        </td>

                        {/* Action */}
                        <td className="h-[42px] bg-blue-600 py-2 px-2 align-middle text-center text-white" />
                      </tr>
                    </tfoot>
                  );
                })()}
            </table>
          </div>
        </div>
      </div>

      {/* Charts Section: Task Status Distribution + Productivity Trend */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* LEFT: Today's Task Status Distribution */}
        <div className="sidebar-bg backdrop-blur-xl rounded-2xl overflow-hidden shadow-sm dark:shadow-2xl flex flex-col p-4">
          <div className="pb-3 mb-2 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-black text-slate-800 dark:text-white tracking-wide uppercase">
                Today's Task Status Distribution
              </h3>
              <span className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 tracking-wide">
                Based on Today Assigned
              </span>
            </div>
          </div>
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-4 items-center min-h-[180px]">
            {/* Chart Area (7/12 width) */}
            <div className="sm:col-span-7 relative flex items-center justify-center h-[170px]">
              <Doughnut data={doughnutData} options={doughnutOptions} />
              <div className="absolute flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[22px] font-black text-slate-800 dark:text-white leading-none">
                  {metrics.tasksAssigned}
                </span>
                <span className="text-[8.5px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-0.5">
                  Total
                </span>
              </div>
            </div>
            {/* Custom Legend Area (5/12 width) */}
            <div className="sm:col-span-5 space-y-1.5 px-1">
              {statusLegendItems.map((item, index) => {
                const total = metrics.tasksAssigned || 0;
                const opacityStyle =
                  total > 0 && item.count === 0 ? "opacity-40" : "";
                return (
                  <div
                    key={index}
                    className={`flex items-center justify-between text-[10.5px] font-semibold text-slate-600 dark:text-slate-350 transition-opacity duration-200 ${opacityStyle}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="truncate max-w-[85px] text-slate-700 dark:text-slate-350 font-bold">
                        {item.label}
                      </span>
                    </div>
                    <span className="font-extrabold text-slate-800 dark:text-slate-100 whitespace-nowrap ml-2">
                      {item.count}{" "}
                      <span className="text-[9.5px] text-slate-400 dark:text-slate-550 font-semibold">
                        ({item.percent})
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT: Productivity Trend (This Week) */}
        <div className="sidebar-bg backdrop-blur-xl rounded-2xl overflow-hidden shadow-sm dark:shadow-2xl flex flex-col p-4">
          <div className="pb-3 mb-2 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-black text-slate-800 dark:text-white tracking-wide uppercase">
                Productivity Trend
              </h3>
              <span className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 tracking-wide">
                This Week
              </span>
            </div>
          </div>
          <div className="flex-1 min-h-[170px] relative mt-1">
            <Line data={lineChartData} options={lineChartOptions} />
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5">
            <FiAlertCircle
              size={10}
              className="text-indigo-400 dark:text-indigo-500 shrink-0"
            />
            <span className="text-[9px] font-medium text-slate-500 dark:text-slate-400">
              Productivity is calculated based on actual time worked within
              office hours.
            </span>
          </div>
        </div>
      </div>

      {/* Delayed Projects & Bottlenecks */}
      {(() => {
        const getChartColors = (count) => {
          const baseColors = [
            "rgba(244, 63, 94, 0.8)",
            "rgba(139, 92, 246, 0.8)",
            "rgba(245, 158, 11, 0.8)",
            "rgba(16, 185, 129, 0.8)",
            "rgba(59, 130, 246, 0.8)",
            "rgba(217, 70, 239, 0.8)",
            "rgba(14, 165, 233, 0.8)",
          ];
          return Array.from(
            { length: count },
            (_, i) => baseColors[i % baseColors.length]
          );
        };

        const assigneeCounts = {};
        const statusCounts = {};

        delayedTasks.forEach((t) => {
          const a = t.assigneeName || "Unassigned";
          const s = t.status || "Unknown";
          assigneeCounts[a] = (assigneeCounts[a] || 0) + 1;
          statusCounts[s] = (statusCounts[s] || 0) + 1;
        });

        const assigneeLabels = Object.keys(assigneeCounts);
        const statusLabels = Object.keys(statusCounts);

        const bottleneckAssigneeData = {
          labels: assigneeLabels,
          datasets: [
            {
              data: Object.values(assigneeCounts),
              backgroundColor: getChartColors(assigneeLabels.length).reverse(),
              borderWidth: 0,
              hoverOffset: 6,
            },
          ],
        };

        const bottleneckStatusData = {
          labels: statusLabels,
          datasets: [
            {
              data: Object.values(statusCounts),
              backgroundColor: getChartColors(statusLabels.length),
              borderWidth: 0,
              hoverOffset: 6,
            },
          ],
        };

        const bOptions = {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "right",
              labels: {
                color: isDarkMode ? "#cbd5e1" : "#475569",
                font: { size: 10, weight: "bold" },
                boxWidth: 10,
                padding: 10,
              },
            },
            tooltip: {
              backgroundColor: isDarkMode
                ? "rgba(15, 23, 42, 0.9)"
                : "rgba(255, 255, 255, 0.95)",
              titleColor: isDarkMode ? "#f8fafc" : "#0f172a",
              bodyColor: isDarkMode ? "#cbd5e1" : "#475569",
              borderColor: isDarkMode
                ? "rgba(51, 65, 85, 0.5)"
                : "rgba(226, 232, 240, 0.8)",
              borderWidth: 1,
              padding: 8,
              boxPadding: 4,
              usePointStyle: true,
            },
          },
          cutout: "65%",
        };

        return (
          <div className="sidebar-bg backdrop-blur-md rounded-2xl  overflow-hidden shadow-sm dark:shadow-xl relative z-10">
        <div className="p-5 border-b border-slate-200 dark:border-slate-700/80 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-50 dark:bg-transparent">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-100 dark:bg-rose-500/20 rounded-lg text-rose-600 dark:text-rose-400">
              <FiAlertCircle className="text-lg" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white tracking-widest">
              Delayed Projects & Bottlenecks
            </h3>
          </div>

          {/* Filters Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 w-full lg:w-auto">
            {/* Client Filter */}
            <select
              value={bottleneckClient}
              onChange={(e) => setBottleneckClient(e.target.value)}
              className="px-2.5 py-1.5 text-[10px] font-bold bg-white dark:bg-[#0b1120] border border-slate-200 dark:border-slate-700/80 rounded-lg text-slate-700 dark:text-slate-250 focus:outline-none focus:border-rose-500 transition-all shadow-sm"
            >
              {bottleneckClients.map((client) => (
                <option key={client} value={client}>
                  {client}
                </option>
              ))}
            </select>

            {/* Creator Filter */}
            <select
              value={bottleneckCreator}
              onChange={(e) => setBottleneckCreator(e.target.value)}
              className="px-2.5 py-1.5 text-[10px] font-bold bg-white dark:bg-[#0b1120] border border-slate-200 dark:border-slate-700/80 rounded-lg text-slate-700 dark:text-slate-250 focus:outline-none focus:border-rose-500 transition-all shadow-sm"
            >
              {bottleneckCreators.map((creator) => (
                <option key={creator} value={creator}>
                  {creator}
                </option>
              ))}
            </select>

            {/* Assignee Filter */}
            <select
              value={bottleneckAssignee}
              onChange={(e) => setBottleneckAssignee(e.target.value)}
              className="px-2.5 py-1.5 text-[10px] font-bold bg-white dark:bg-[#0b1120] border border-slate-200 dark:border-slate-700/80 rounded-lg text-slate-700 dark:text-slate-250 focus:outline-none focus:border-rose-500 transition-all shadow-sm"
            >
              {bottleneckAssignees.map((assignee) => (
                <option key={assignee} value={assignee}>
                  {assignee}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={bottleneckStatus}
              onChange={(e) => setBottleneckStatus(e.target.value)}
              className="px-2.5 py-1.5 text-[10px] font-bold bg-white dark:bg-[#0b1120] border border-slate-200 dark:border-slate-700/80 rounded-lg text-slate-700 dark:text-slate-250 focus:outline-none focus:border-rose-500 transition-all shadow-sm"
            >
              {bottleneckStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>

        {delayedTasks.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5 border-b border-slate-100 dark:border-slate-800/80 bg-white/50 dark:bg-slate-900/30">
            <div className="bg-white dark:bg-slate-900/50 rounded-xl p-4 border border-slate-100 dark:border-slate-800 shadow-sm">
              <h4 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3 text-center">
                By Assignee
              </h4>
              <div className="h-[160px] relative">
                <Doughnut data={bottleneckAssigneeData} options={bOptions} />
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900/50 rounded-xl p-4 border border-slate-100 dark:border-slate-800 shadow-sm">
              <h4 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3 text-center">
                By Status
              </h4>
              <div className="h-[160px] relative">
                <Doughnut data={bottleneckStatusData} options={bOptions} />
              </div>
            </div>
          </div>
        )}

        <div className="p-5 space-y-4 max-h-[420px] overflow-y-auto custom-scrollbar">
          {delayedTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-emerald-500 dark:text-emerald-400">
              <FiCheckCircle className="text-4xl mb-3 opacity-50" />
              <p className="text-sm font-black tracking-widest uppercase">
                Zero Bottlenecks!
              </p>
            </div>
          ) : (
            delayedTasks.map((task) => {
              let projName = "No Project";
              if (task.project) {
                const pId =
                  typeof task.project === "object"
                    ? task.project._id
                    : task.project;
                const p = projects?.find((x) => x._id === pId);
                projName = p?.name || "Unknown";
              }

              const s = task.status?.toLowerCase() || "";
              let cardStyle = "border-rose-500 bg-rose-50 dark:bg-rose-500/10";
              let badgeStyle =
                "bg-rose-100 text-rose-700 border-rose-205 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/30";
              let timeBadgeStyle =
                "text-rose-600 dark:text-rose-300 bg-white dark:bg-rose-500/20 border border-rose-200 dark:border-rose-500/30";

              if (s.includes("hold")) {
                cardStyle =
                  "border-fuchsia-500 bg-fuchsia-50/50 dark:bg-fuchsia-500/10";
                badgeStyle =
                  "bg-fuchsia-100 text-fuchsia-700 border border-fuchsia-200 dark:bg-fuchsia-950/40 dark:text-fuchsia-400 dark:border-fuchsia-900/30";
                timeBadgeStyle =
                  "text-fuchsia-600 dark:text-fuchsia-300 bg-white dark:bg-fuchsia-500/20 border border-fuchsia-200 dark:border-fuchsia-500/30";
              } else if (s.includes("progress")) {
                cardStyle = "border-blue-500 bg-blue-50/50 dark:bg-blue-500/10";
                badgeStyle =
                  "bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/30";
                timeBadgeStyle =
                  "text-blue-600 dark:text-blue-300 bg-white dark:bg-blue-500/20 border border-blue-200 dark:border-blue-500/30";
              } else if (s.includes("review") || s.includes("revision")) {
                cardStyle =
                  "border-yellow-500 bg-yellow-50/50 dark:bg-yellow-500/10";
                badgeStyle =
                  "bg-yellow-100 text-yellow-800 border border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-450 dark:border-yellow-900/30";
                timeBadgeStyle =
                  "text-yellow-600 dark:text-yellow-450 bg-white dark:bg-yellow-500/20 border border-yellow-250 dark:border-yellow-500/30";
              } else if (s.includes("pending") || s.includes("assigned")) {
                cardStyle =
                  "border-orange-500 bg-orange-50/50 dark:bg-orange-500/10";
                badgeStyle =
                  "bg-orange-100 text-orange-700 border border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-900/30";
                timeBadgeStyle =
                  "text-orange-655 dark:text-orange-400 bg-white dark:bg-orange-500/20 border border-orange-200 dark:border-orange-500/30";
              }

              // Hash function to get unique soft badge style per client
              const getClientBadgeStyle = (name) => {
                const hash = name
                  .split("")
                  .reduce((acc, char) => acc + char.charCodeAt(0), 0);
                const colors = [
                  "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/30",
                  "bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-900/30",
                  "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/30",
                  "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/30",
                  "bg-violet-50 text-violet-600 border-violet-200 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-900/30",
                  "bg-pink-50 text-pink-600 border-pink-200 dark:bg-pink-950/30 dark:text-pink-400 dark:border-pink-900/30",
                  "bg-cyan-50 text-cyan-600 border-cyan-200 dark:bg-cyan-950/30 dark:text-cyan-400 dark:border-cyan-900/30",
                ];
                return colors[hash % colors.length];
              };

              const clientBadgeColor = getClientBadgeStyle(task.clientName);

              return (
                <div
                  key={task._id}
                  className={`flex flex-col md:flex-row md:items-center md:justify-between p-3.5 rounded-xl border-l-4 ${cardStyle} shadow-sm dark:shadow-none transition-all hover:scale-[1.01] hover:shadow-md gap-4`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <span
                        className={`px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider rounded-md border ${clientBadgeColor}`}
                      >
                        {task.clientName}
                      </span>
                      <span className="text-[10px] text-slate-300 dark:text-slate-700">
                        •
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                        {projName}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">
                      {task.title}
                    </h4>

                    <div className="flex items-center gap-6 mt-3 flex-wrap">
                      {/* Creator */}
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-extrabold">
                          Creator:
                        </span>
                        <div className="flex items-center gap-1.5">
                          {task.creatorImage ? (
                            <img
                              src={task.creatorImage}
                              alt={task.creatorName}
                              className="w-5 h-5 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700 shrink-0"
                            />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center text-[8px] font-black ring-1 ring-slate-300 shrink-0">
                              {getInitials(task.creatorName)}
                            </div>
                          )}
                          <span className="text-[11px] font-bold text-slate-750 dark:text-slate-300">
                            {task.creatorName}
                          </span>
                        </div>
                      </div>

                      {/* Assignee */}
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-extrabold">
                          Assignee:
                        </span>
                        <div className="flex items-center gap-1.5">
                          {task.assigneeImage ? (
                            <img
                              src={task.assigneeImage}
                              alt={task.assigneeName}
                              className="w-5 h-5 rounded-full object-cover ring-1 ring-indigo-400/40 shrink-0"
                            />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-[8px] font-black ring-1 ring-indigo-400/30 shrink-0">
                              {getInitials(task.assigneeName)}
                            </div>
                          )}
                          <span className="text-[11px] font-bold text-slate-755 dark:text-slate-300">
                            {task.assigneeName}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    <span
                      className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded border ${badgeStyle}`}
                    >
                      {task.status}
                    </span>
                    <div
                      className={`text-[10px] font-black px-2.5 py-1 rounded-lg border shadow-sm ${timeBadgeStyle}`}
                    >
                      {task.daysDelayed}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
          </div>
        );
      })()}
      {viewTasksModal.open &&
        createPortal(
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-2 sm:p-4 md:p-6">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-slate-900/70 backdrop-blur-md transition-opacity"
              onClick={() => {
                setViewTasksModal({
                  open: false,
                  designerId: null,
                  designerName: "",
                });
                setModalGroupTab("assignedToday");
              }}
            />
            {/* Modal Content Window */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative z-10 bg-white/95 dark:bg-[#0f172a]/95 backdrop-blur-2xl rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xl w-full max-w-6xl h-[92vh] sm:h-[88vh] overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="p-3.5 sm:p-5 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 flex flex-col lg:flex-row lg:items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-3">
                  {activeDesigner?.profileImage ? (
                    <img
                      src={activeDesigner.profileImage}
                      alt={activeDesigner.name}
                      className="w-10 h-10 rounded-full object-cover border-2 border-indigo-500/30 shadow-sm shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white text-xs font-black shrink-0 shadow-sm">
                      {getInitials(activeDesigner?.name)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-black text-slate-850 dark:text-white tracking-wide truncate">
                      {activeDesigner?.name}'s Performance Details
                    </h3>
                    <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-200/60 dark:bg-slate-800 text-slate-700 dark:text-black font-extrabold text-[9.5px] border border-slate-300/50 dark:border-slate-700">
                        Today: {format(new Date(), "dd MMM yyyy")}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-red-500 text-white dark:text-white font-extrabold text-[9.5px] border border-red-500/20">
                        Assigned Today: {activeDesigner?.assigned || 0}
                      </span>
                      {(activeDesigner?.overdue || 0) > 0 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-600 dark:text-rose-400 font-extrabold text-[9.5px] border border-rose-500/30 animate-pulse">
                          Overdue: {activeDesigner?.overdue}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center flex-wrap sm:flex-nowrap gap-2 sm:gap-3">
                  {/* Search Input */}
                  <div className="relative flex-1 sm:w-48 min-w-[130px]">
                    <input
                      type="text"
                      value={taskSearch}
                      onChange={(e) => setTaskSearch(e.target.value)}
                      placeholder="Search task or client..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all shadow-inner"
                    />
                    {taskSearch && (
                      <button
                        type="button"
                        onClick={() => setTaskSearch("")}
                        className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                      >
                        <FiX size={12} />
                      </button>
                    )}
                  </div>

                  {/* Status Filter Dropdown */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <select
                      value={taskTab}
                      onChange={(e) => setTaskTab(e.target.value)}
                      className="px-2.5 py-1.5 text-xs font-extrabold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-xl text-slate-750 dark:text-white focus:outline-none focus:border-indigo-500 transition-all shadow-sm cursor-pointer"
                    >
                      <option value="all">All Tasks</option>
                      <option value="pending">Not Started</option>
                      <option value="inprogress">In Progress</option>
                      <option value="onhold">On Hold</option>
                      <option value="inreview">In Review</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setViewTasksModal({
                        open: false,
                        designerId: null,
                        designerName: "",
                      });
                      setModalGroupTab("assignedToday");
                    }}
                    className="p-1.5 rounded-xl hover:bg-slate-200/80 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-all cursor-pointer shrink-0"
                    title="Close"
                  >
                    <FiX size={18} />
                  </button>
                </div>
              </div>

              {/* Modal Body Container */}
              <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-slate-50/20 dark:bg-slate-900/10">


                {/* Main Task List Container */}
                <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-[#0f172a] p-3 sm:p-5 overflow-hidden">
                  <div
                    className="flex-1 overflow-y-auto min-h-0 custom-scrollbar pr-0 sm:pr-1"
                    style={{ WebkitOverflowScrolling: "touch" }}
                  >
                    {filteredModalTasks.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-500 bg-slate-50/50 dark:bg-slate-900/20 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                        <FiLayers
                          size={40}
                          className="mb-3 opacity-30 text-indigo-500"
                        />
                        <p className="text-sm font-black uppercase tracking-widest text-slate-600 dark:text-slate-400">
                          No tasks found
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-bold">
                          Try changing your filter tab or search keyword
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* DESKTOP TABLE VIEW (hidden on small mobile screens) */}
                        <div className="hidden md:block border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-x-auto shadow-2xs bg-white dark:bg-slate-900/30 custom-scrollbar">
                          <table className="w-full text-left border-collapse min-w-[950px]">
                            <thead>
                              <tr className="bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-200/80 dark:border-slate-800">
                                <th className="py-3 px-4 text-[11px] font-black tracking-widest text-slate-500 dark:text-slate-400 uppercase">
                                  Task Title
                                </th>
                                <th className="py-3 px-4 text-[11px] font-black tracking-widest text-slate-500 dark:text-slate-400 uppercase">
                                  Client
                                </th>
                                <th className="py-3 px-4 text-[11px] font-black tracking-widest text-slate-500 dark:text-slate-400 uppercase">
                                  Created By
                                </th>
                                <th className="py-3 px-4 text-[11px] font-black tracking-widest text-slate-500 dark:text-slate-400 uppercase">
                                  Priority
                                </th>
                                <th className="py-3 px-4 text-[11px] font-black tracking-widest text-slate-500 dark:text-slate-400 uppercase">
                                  {taskTab === "assigned"
                                    ? "Assigned Date"
                                    : taskTab === "pending"
                                      ? "Pending Since"
                                      : taskTab === "inprogress"
                                        ? "Started At"
                                        : taskTab === "onhold"
                                          ? "Paused At"
                                          : taskTab === "inreview"
                                            ? "Submitted At"
                                            : taskTab === "completed"
                                              ? "Completed At"
                                              : "Due Date"}
                                </th>
                                <th className="py-3 px-4 text-[11px] font-black tracking-widest text-slate-500 dark:text-slate-400 uppercase">
                                  Status
                                </th>
                                <th className="py-3 px-4 text-[11px] font-black tracking-widest text-slate-500 dark:text-slate-400 uppercase text-center">
                                  Approval Timeline
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                              {filteredModalTasks.map((task) => {
                                let clientName = "No Client";
                                if (task.client) {
                                  const cId =
                                    typeof task.client === "object"
                                      ? task.client._id
                                      : task.client;
                                  const c = clients?.find((x) => x._id === cId);
                                  clientName =
                                    c?.companyName ||
                                    c?.name ||
                                    (typeof task.client === "object"
                                      ? task.client.companyName ||
                                        task.client.name
                                      : "Unknown Client");
                                } else if (task.project) {
                                  const pId =
                                    typeof task.project === "object"
                                      ? task.project._id
                                      : task.project;
                                  const p = projects?.find(
                                    (x) => x._id === pId,
                                  );
                                  if (p) {
                                    const cId =
                                      typeof p.client === "object"
                                        ? p.client?._id
                                        : p.client;
                                    const c = clients?.find(
                                      (x) => x._id === cId,
                                    );
                                    clientName =
                                      c?.companyName ||
                                      c?.name ||
                                      (typeof p.client === "object"
                                        ? p.client?.companyName ||
                                          p.client?.name
                                        : "Unknown Client");
                                  }
                                }

                                const getStatusBadgeStyle = (status = "") => {
                                  const s = status.toLowerCase();
                                  if (
                                    s === "completed" ||
                                    s.includes("approve")
                                  ) {
                                    return "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/30 font-black";
                                  }
                                  if (s.includes("hold")) {
                                    return "bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200 dark:bg-fuchsia-950/40 dark:text-fuchsia-400 dark:border-fuchsia-900/30 font-black";
                                  }
                                  if (s.includes("progress")) {
                                    return "bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-950/40 dark:text-violet-400 dark:border-violet-900/30 font-black";
                                  }
                                  if (
                                    s.includes("review") ||
                                    s.includes("revision")
                                  ) {
                                    return "bg-amber-50 text-amber-800 border border-amber-250 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/30 font-black";
                                  }
                                  if (s === "assigned") {
                                    return "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/30 font-black";
                                  }
                                  return "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/30 font-black";
                                };

                                const creatorObj =
                                  task.createdBy &&
                                  typeof task.createdBy === "object"
                                    ? task.createdBy
                                    : users?.find(
                                        (u) => u._id === task.createdBy,
                                      );
                                const creatorName =
                                  creatorObj?.name || "Unknown";
                                const creatorImage =
                                  (typeof creatorObj?.profile?.profileImage ===
                                  "object"
                                    ? creatorObj?.profile?.profileImage?.url
                                    : creatorObj?.profile?.profileImage) ||
                                  (typeof creatorObj?.profileImage === "object"
                                    ? creatorObj?.profileImage?.url
                                    : creatorObj?.profileImage) ||
                                  creatorObj?.profilePic ||
                                  creatorObj?.avatar ||
                                  null;

                                let targetDate = task.dueDate || task.createdAt;
                                if (taskTab === "assigned")
                                  targetDate = task.createdAt;
                                else if (taskTab === "pending")
                                  targetDate = task.createdAt;
                                else if (taskTab === "inprogress")
                                  targetDate =
                                    task.actualStartTime || task.updatedAt;
                                else if (taskTab === "onhold")
                                  targetDate = task.pausedAt || task.updatedAt;
                                else if (taskTab === "inreview")
                                  targetDate =
                                    task.actualEndTime || task.updatedAt;
                                else if (taskTab === "completed")
                                  targetDate =
                                    task.approvedAt ||
                                    task.completedAt ||
                                    task.actualEndTime ||
                                    task.updatedAt;

                                return (
                                  <tr
                                    key={task._id}
                                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors border-b border-slate-100 dark:border-slate-800/80 last:border-b-0"
                                  >
                                    <td className="py-3 px-4 text-xs font-extrabold text-slate-850 dark:text-slate-100 max-w-xs break-words">
                                      <span className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                                        {task.title}
                                      </span>
                                      <div className="mt-1.5">
                                        {(() => {
                                          const assignmentDate = task.startDate || task.createdAt;
                                          const isAssignedToday = assignmentDate && isSameDay(new Date(assignmentDate), selectedDate);
                                          return (
                                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${isAssignedToday ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                                              {isAssignedToday ? 'Today Assigned' : 'Carried Forward'}
                                            </span>
                                          );
                                        })()}
                                      </div>
                                    </td>
                                    <td className="py-3 px-4">
                                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border text-[10px] font-extrabold bg-slate-100/70 text-slate-700 border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700 shadow-2xs">
                                        <FiBriefcase
                                          size={10}
                                          className="text-slate-400 shrink-0"
                                        />
                                        {clientName}
                                      </span>
                                    </td>
                                    <td className="py-3 px-4">
                                      <div className="flex items-center gap-2">
                                        {creatorImage ? (
                                          <img
                                            src={creatorImage}
                                            alt={creatorName}
                                            className="w-5 h-5 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700 shrink-0"
                                          />
                                        ) : (
                                          <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[8px] font-black shrink-0">
                                            {getInitials(creatorName)}
                                          </div>
                                        )}
                                        <span className="text-[11px] font-bold text-slate-750 dark:text-slate-300">
                                          {creatorName}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="py-3 px-4">
                                      {task.priority && (
                                        <span
                                          className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${getPriorityStyle(
                                            task.priority,
                                          )}`}
                                        >
                                          {task.priority}
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-3 px-4 text-xs font-semibold text-slate-600 dark:text-slate-350">
                                      <td className="py-3 px-4 text-xs font-semibold text-slate-600 dark:text-slate-350">
                                        {targetDate ? (
                                          <div className="flex flex-col gap-0.5">
                                            <span className="flex items-center gap-1 text-[11px]">
                                              <FiClock
                                                size={11}
                                                className="text-slate-400 shrink-0"
                                              />
                                              {(() => {
                                                try {
                                                  const isDueDateCol =
                                                    !taskTab ||
                                                    taskTab === "all" ||
                                                    targetDate === task.dueDate;
                                                  const d = parseISO(targetDate);
                                                  if (
                                                    isDueDateCol &&
                                                    (String(targetDate).includes(
                                                      "00:00:00",
                                                    ) ||
                                                      !String(targetDate).includes(
                                                        "T",
                                                      ))
                                                  ) {
                                                    d.setHours(17, 30, 0, 0);
                                                  }
                                                  return format(
                                                    d,
                                                    "MMM dd, h:mm a",
                                                  );
                                                } catch (e) {
                                                  return "—";
                                                }
                                              })()}
                                            </span>
                                            {task.dueDate && (!taskTab || taskTab === "all" || targetDate === task.dueDate) && (() => {
                                              const text = getDeadlineBadgeText(task.dueDate, task.status);
                                              if (!text) return null;
                                              const isDelayed = text.includes("overdue");
                                              const isDueToday = text === "Due Today";
                                              const isCompleted = text === "Completed";
                                              const colorClass = isCompleted
                                                ? "text-emerald-500 dark:text-emerald-400"
                                                : isDelayed
                                                ? "text-rose-500 dark:text-rose-400"
                                                : isDueToday
                                                ? "text-amber-500 dark:text-amber-400"
                                                : "text-slate-500 dark:text-slate-400";
                                              return (
                                                <span className={`text-[9px] font-bold ${colorClass}`}>
                                                  {text}
                                                </span>
                                              );
                                            })()}
                                          </div>
                                        ) : (
                                          "—"
                                        )}
                                      </td>
                                    </td>
                                    <td className="py-3 px-4">
                                      <span
                                        className={`px-2.5 py-0.5 rounded-lg text-[10px] uppercase tracking-wider ${getStatusBadgeStyle(
                                          task.status,
                                        )}`}
                                      >
                                        {task.status || "Not Started"}
                                      </span>
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                      <ApprovalTimelineCell task={task} />
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* MOBILE CARD VIEW (Optimized for small touch screens) */}
                        <div className="block md:hidden space-y-3">
                          {filteredModalTasks.map((task) => {
                            let clientName = "No Client";
                            if (task.client) {
                              const cId =
                                typeof task.client === "object"
                                  ? task.client._id
                                  : task.client;
                              const c = clients?.find((x) => x._id === cId);
                              clientName =
                                c?.companyName || c?.name || "Unknown Client";
                            }

                            const creatorObj =
                              task.createdBy &&
                              typeof task.createdBy === "object"
                                ? task.createdBy
                                : users?.find((u) => u._id === task.createdBy);
                            const creatorName = creatorObj?.name || "Unknown";

                            const getStatusBadgeStyle = (status = "") => {
                              const s = status.toLowerCase();
                              if (s === "completed" || s.includes("approve")) {
                                return "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/30 font-black";
                              }
                              if (s.includes("hold")) {
                                return "bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200 dark:bg-fuchsia-950/40 dark:text-fuchsia-400 dark:border-fuchsia-900/30 font-black";
                              }
                              if (s.includes("progress")) {
                                return "bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-950/40 dark:text-violet-400 dark:border-violet-900/30 font-black";
                              }
                              if (
                                s.includes("review") ||
                                s.includes("revision")
                              ) {
                                return "bg-amber-50 text-amber-800 border border-amber-250 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/30 font-black";
                              }
                              return "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/30 font-black";
                            };

                            let targetDate = task.dueDate || task.createdAt;

                            return (
                              <div
                                key={task._id}
                                className="p-3.5 bg-slate-50/80 dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col gap-2.5"
                              >
                                {/* Title & Priority */}
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex flex-col gap-1.5">
                                    <h4 className="text-xs font-black text-slate-850 dark:text-white leading-snug">
                                      {task.title}
                                    </h4>
                                    {(() => {
                                      const assignmentDate = task.startDate || task.createdAt;
                                      const isAssignedToday = assignmentDate && isSameDay(new Date(assignmentDate), selectedDate);
                                      return (
                                        <span className={`w-fit px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${isAssignedToday ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                                          {isAssignedToday ? 'Today Assigned' : 'Carried Forward'}
                                        </span>
                                      );
                                    })()}
                                  </div>
                                  {task.priority && (
                                    <span
                                      className={`px-2 py-0.5 rounded-md text-[8.5px] font-black uppercase shrink-0 ${getPriorityStyle(
                                        task.priority,
                                      )}`}
                                    >
                                      {task.priority}
                                    </span>
                                  )}
                                </div>

                                {/* Client & Creator Row */}
                                <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                                  <span className="inline-flex items-center gap-1 font-bold text-slate-700 dark:text-slate-300">
                                    <FiBriefcase size={10} />
                                    {clientName}
                                  </span>
                                  <span className="font-semibold">
                                    By: {creatorName}
                                  </span>
                                </div>

                                {/* Status & Date Row */}
                                <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 dark:border-slate-800">
                                  <span
                                    className={`px-2 py-0.5 rounded-md text-[9.5px] uppercase ${getStatusBadgeStyle(
                                      task.status,
                                    )}`}
                                  >
                                    {task.status || "Not Started"}
                                  </span>

                                  {targetDate && (
                                    <div className="flex flex-col items-end gap-0.5">
                                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                        <FiClock size={10} />
                                        {(() => {
                                          try {
                                            const isDueDateCol =
                                              !taskTab ||
                                              taskTab === "all" ||
                                              targetDate === task.dueDate;
                                            const d = parseISO(targetDate);
                                            if (
                                              isDueDateCol &&
                                              (String(targetDate).includes(
                                                "00:00:00",
                                              ) ||
                                                !String(targetDate).includes("T"))
                                            ) {
                                              d.setHours(17, 30, 0, 0);
                                            }
                                            return format(d, "MMM dd, h:mm a");
                                          } catch (e) {
                                            return "—";
                                          }
                                        })()}
                                      </span>
                                      {task.dueDate && (!taskTab || taskTab === "all" || targetDate === task.dueDate) && (() => {
                                        const text = getDeadlineBadgeText(task.dueDate, task.status);
                                        if (!text) return null;
                                        const isDelayed = text.includes("overdue");
                                        const isDueToday = text === "Due Today";
                                        const isCompleted = text === "Completed";
                                        const colorClass = isCompleted
                                          ? "text-emerald-500 dark:text-emerald-400"
                                          : isDelayed
                                          ? "text-rose-500 dark:text-rose-400"
                                          : isDueToday
                                          ? "text-amber-500 dark:text-amber-400"
                                          : "text-slate-500 dark:text-slate-400";
                                        return (
                                          <span className={`text-[9px] font-bold ${colorClass}`}>
                                            {text}
                                          </span>
                                        );
                                      })()}
                                    </div>
                                  )}
                                </div>

                                {/* Approval Timeline */}
                                <div className="flex items-center justify-between pt-1">
                                  <span className="text-[10px] font-black uppercase text-slate-400">
                                    Timeline:
                                  </span>
                                  <ApprovalTimelineCell task={task} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-4 sm:px-6 py-3.5 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 flex items-center justify-between shrink-0">
                <span className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400">
                  Showing {filteredModalTasks.length}{" "}
                  {filteredModalTasks.length === 1 ? "task" : "tasks"}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setViewTasksModal({
                      open: false,
                      designerId: null,
                      designerName: "",
                    })
                  }
                  className="px-4 py-2 rounded-xl bg-slate-200/80 dark:bg-black text-xs font-black text-slate-750 dark:text-white transition-all cursor-pointer shadow-2xs"
                >
                  Close View
                </button>
              </div>
            </motion.div>
          </div>,
          document.body,
        )}
      {/* APPROVAL TIMELINE DETAILS OFFCANVAS (SLIDE-OVER FROM RIGHT) */}
      <AnimatePresence>
        {approvalModal.open &&
          createPortal(
            <div className="fixed inset-0 z-[1050] overflow-hidden">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() =>
                  setApprovalModal({ open: false, designerName: "", tasks: [] })
                }
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
              />

              <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10 z-[1050]">
                <motion.div
                  initial={{ x: "100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "100%" }}
                  transition={{ type: "spring", damping: 25, stiffness: 200 }}
                  className="w-screen max-w-5xl bg-white dark:bg-[#0f111a] border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden"
                >
                  {/* Header */}
                  <div className="p-4 sm:p-5 px-5 sm:px-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/80 dark:bg-[#0c121e] shrink-0">
                    <div className="flex items-center gap-2.5 sm:gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          setApprovalModal({
                            open: false,
                            designerName: "",
                            tasks: [],
                          })
                        }
                        className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0 shadow-2xs"
                        title="Close panel"
                      >
                        <FiArrowRight size={18} />
                      </button>
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-450 shadow-2xs shrink-0">
                        <FiClock size={18} />
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-sm sm:text-base font-black text-slate-850 dark:text-white tracking-wider truncate">
                          Approval Info
                        </h2>
                        <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-bold tracking-wide truncate">
                          Timestamps for{" "}
                          <span className="text-indigo-600 dark:text-indigo-400">
                            {approvalModal.designerName}
                          </span>
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setApprovalModal({
                          open: false,
                          designerName: "",
                          tasks: [],
                        })
                      }
                      className="w-8 h-8 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer shrink-0"
                    >
                      <FiXCircle size={20} />
                    </button>
                  </div>

                  {/* Body */}
                  <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-4 custom-scrollbar">
                    {approvalModal.tasks.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                        <FiAlertCircle size={36} className="opacity-40 mb-2" />
                        <span className="text-xs font-black uppercase tracking-wider">
                          No approval tasks found
                        </span>
                      </div>
                    ) : (
                      <>
                        {/* Desktop View */}
                        <div className="hidden md:block overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs bg-white dark:bg-slate-900/40 custom-scrollbar">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-50/90 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black tracking-widest text-slate-500 dark:text-slate-400 uppercase">
                                <th className="py-3 px-4 border-r border-slate-200 dark:border-slate-800">
                                  Task Name
                                </th>
                                <th className="py-3 px-4 border-r border-slate-200 dark:border-slate-800">
                                  Client Name
                                </th>
                                <th className="py-3 px-4 border-r border-slate-200 dark:border-slate-800">
                                  Created By
                                </th>
                                <th className="py-3 px-4 border-r border-slate-200 dark:border-slate-800">
                                  Assignee
                                </th>
                                <th className="py-3 px-4 border-r border-slate-200 dark:border-slate-800">
                                  Start & End Date
                                </th>
                                <th className="py-3 px-4 text-center">
                                  Approval Info
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                              {approvalModal.tasks.map((task) => {
                                const clientObj =
                                  task.project?.client || task.client;
                                let clientName = "No Client";
                                if (clientObj) {
                                  const cId =
                                    typeof clientObj === "object"
                                      ? clientObj._id
                                      : clientObj;
                                  const c = clients?.find((x) => x._id === cId);
                                  clientName =
                                    c?.companyName ||
                                    c?.name ||
                                    (typeof clientObj === "object"
                                      ? clientObj.companyName || clientObj.name
                                      : "Unknown Client");
                                }

                                const creatorObj =
                                  task.createdBy &&
                                  typeof task.createdBy === "object"
                                    ? task.createdBy
                                    : users?.find(
                                        (u) => u._id === task.createdBy,
                                      );
                                const creatorName =
                                  creatorObj?.name || "Unknown";

                                const assigneeObj =
                                  task.assignedTo &&
                                  typeof task.assignedTo === "object"
                                    ? task.assignedTo
                                    : designers.find(
                                        (d) => d._id === task.assignedTo,
                                      ) ||
                                      users?.find(
                                        (u) => u._id === task.assignedTo,
                                      );
                                const assigneeName =
                                  assigneeObj?.name || "Unassigned";

                                return (
                                  <tr
                                    key={task._id}
                                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                                  >
                                    <td className="py-3 px-4 border-r border-slate-200 dark:border-slate-800 font-extrabold text-slate-850 dark:text-white">
                                      {task.title}
                                    </td>
                                    <td className="py-3 px-4 border-r border-slate-200 dark:border-slate-800 font-bold text-slate-650 dark:text-slate-350">
                                      {clientName}
                                    </td>
                                    <td className="py-3 px-4 border-r border-slate-200 dark:border-slate-800 font-semibold text-slate-600 dark:text-slate-350">
                                      {creatorName}
                                    </td>
                                    <td className="py-3 px-4 border-r border-slate-200 dark:border-slate-800 font-semibold text-slate-600 dark:text-slate-350">
                                      {assigneeName}
                                    </td>
                                    <td className="py-3 px-4 border-r border-slate-200 dark:border-slate-800 font-semibold text-slate-500 dark:text-slate-400">
                                      {task.startDate
                                        ? format(
                                            parseISO(task.startDate),
                                            "dd MMM yyyy",
                                          )
                                        : "—"}
                                      <span className="mx-1.5 text-slate-300 dark:text-slate-700">
                                        to
                                      </span>
                                      {task.dueDate
                                        ? format(
                                            parseISO(task.dueDate),
                                            "dd MMM yyyy",
                                          )
                                        : "—"}
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                      <ApprovalTimelineCell task={task} />
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* Mobile Card Stack */}
                        <div className="block md:hidden space-y-3">
                          {approvalModal.tasks.map((task) => {
                            const clientObj =
                              task.project?.client || task.client;
                            let clientName = "No Client";
                            if (clientObj) {
                              const cId =
                                typeof clientObj === "object"
                                  ? clientObj._id
                                  : clientObj;
                              const c = clients?.find((x) => x._id === cId);
                              clientName =
                                c?.companyName || c?.name || "Unknown Client";
                            }

                            return (
                              <div
                                key={task._id}
                                className="p-3.5 bg-slate-50/80 dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col gap-2 shadow-2xs"
                              >
                                <h4 className="text-xs font-black text-slate-850 dark:text-white">
                                  {task.title}
                                </h4>
                                <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold">
                                  <span>Client: {clientName}</span>
                                </div>
                                <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-800">
                                  <span className="text-[10px] font-black uppercase text-slate-400">
                                    Approval Details:
                                  </span>
                                  <ApprovalTimelineCell task={task} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/50 flex justify-end shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        setApprovalModal({
                          open: false,
                          designerName: "",
                          tasks: [],
                        })
                      }
                      className="px-4 py-2 rounded-xl bg-slate-200/80 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-750 text-xs font-black text-slate-750 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer shadow-2xs"
                    >
                      Close
                    </button>
                  </div>
                </motion.div>
              </div>
            </div>,
            document.body,
          )}
      </AnimatePresence>
    </div>
  );
};

export default GraphicDesignerDashboard;
