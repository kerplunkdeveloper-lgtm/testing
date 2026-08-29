import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  useGetTasksQuery,
  useGetProjectsQuery,
  useUpdateTaskMutation,
} from "../../features/api/apiSlice";
import { getUsers } from "../../features/users/userSlice";
import { format, parseISO } from "date-fns";
import toast from "react-hot-toast";
import { calculateTaskProductivityForDate } from "../Dashboard/cards/GraphicDesignerDashboard";
import axiosInstance from "../../services/axiosInstance";
import {
  getDesignerEodReports,
  createDesignerEodReport,
  updateDesignerEodReport,
} from "../../features/eodReports/designerEodReportSlice";
import {
  FiCalendar,
  FiClock,
  FiLink,
  FiUser,
  FiAlertCircle,
  FiTool,
  FiPhone,
  FiCheckCircle,
  FiX,
  FiEdit2,
  FiFileText,
  FiSearch,
  FiFilter,
  FiCheck,
  FiLayers,
} from "react-icons/fi";

// Helper: get priority badge colors based on priority value
const getPriorityStyle = (priority) => {
  const p = priority?.toLowerCase() || "";
  if (p.includes("top high"))
    return "bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/30";
  if (p.includes("high"))
    return "bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/30";
  if (p.includes("medium"))
    return "bg-blue-55/60 text-blue-600 border border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/30";
  if (p.includes("low"))
    return "bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/30";
  return "bg-slate-50 text-slate-500 border border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800";
};

// Helper: get unique, high-contrast style for each task code
const getTaskCodeStyle = (code) => {
  if (!code) return { bg: "", text: "" };
  let hash = 0;
  for (let i = 0; i < code.length; i++) {
    hash = code.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    {
      bg: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800/60",
    },
    {
      bg: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/60",
    },
    {
      bg: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60",
    },
    {
      bg: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60",
    },
    {
      bg: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/60",
    },
    {
      bg: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800/60",
    },
    {
      bg: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800/60",
    },
    {
      bg: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200 dark:bg-fuchsia-950/60 dark:text-fuchsia-300 dark:border-fuchsia-800/60",
    },
  ];
  const idx = Math.abs(hash) % colors.length;
  return colors[idx];
};

const safeFormatDate = (dateStr, formatPattern = "MMM dd, yyyy") => {
  if (!dateStr) return "";
  const date = new Date(dateStr + "T12:00:00");
  if (isNaN(date.getTime())) {
    return dateStr;
  }
  try {
    return format(date, formatPattern);
  } catch (e) {
    return dateStr;
  }
};

const safeFormatDateTime = (timeStr, formatPattern = "MMM dd, yyyy h:mm a") => {
  if (!timeStr) return "";
  const date = new Date(timeStr);
  if (isNaN(date.getTime())) {
    return "";
  }
  try {
    return format(date, formatPattern);
  } catch (e) {
    return "";
  }
};

const formatMsToDuration = (ms) => {
  if (!ms || ms <= 0) return "0s";
  const totalSecs = Math.floor(ms / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
};

const formatElapsed = (
  startTime,
  endTime,
  pausedAt,
  totalPausedMs = 0,
  status = "",
  autoPaused = false,
) => {
  if (!startTime) return "";
  const start = new Date(startTime).getTime();
  const end = endTime
    ? new Date(endTime).getTime()
    : status === "In Progress" && autoPaused
      ? pausedAt
        ? new Date(pausedAt).getTime()
        : Date.now()
      : pausedAt && status !== "In Progress"
        ? new Date(pausedAt).getTime()
        : Date.now();

  const paused = totalPausedMs || 0;

  const elapsed = Math.max(0, Math.floor((end - start - paused) / 1000));
  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = elapsed % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
};

const getTaskInprogressTime = (task, selDateObj, officeHours) => {
  if (!task) return "0s";
  const loggedMs = calculateTaskProductivityForDate(
    task,
    selDateObj,
    officeHours,
  );
  if (loggedMs > 0) {
    return formatMsToDuration(loggedMs);
  }
  return "0s";
};

const LiveTimeTracker = ({
  task,
  allTasks,
  isSubmitted,
  selectedDate,
  officeHours,
}) => {
  const selDateObj = React.useMemo(() => {
    if (!selectedDate) return new Date();
    return typeof selectedDate === "string"
      ? parseISO(selectedDate)
      : selectedDate;
  }, [selectedDate]);

  const originalTask = React.useMemo(() => {
    return allTasks.find((t) => t._id === (task.taskId || task.id));
  }, [allTasks, task]);

  const calculateCurrentMs = React.useCallback(() => {
    const target = originalTask || task;
    if (!target) return 0;
    const activeMs = calculateTaskProductivityForDate(
      target,
      selDateObj,
      officeHours,
    );

    let blockerMs = 0;
    const selDateStr = selDateObj.toLocaleDateString("en-CA", {
      timeZone: "Asia/Kolkata",
    });
    if (Array.isArray(target.blockerHistory)) {
      target.blockerHistory.forEach((b) => {
        if (!b.pausedAt) return;
        const pDate = new Date(b.pausedAt).toLocaleDateString("en-CA", {
          timeZone: "Asia/Kolkata",
        });
        const pMs = new Date(b.pausedAt).getTime();
        const rMs = b.resumedAt ? new Date(b.resumedAt).getTime() : Date.now();
        if (pDate === selDateStr) {
          blockerMs += Math.max(0, rMs - pMs);
        }
      });
    }
    if (target.isBlocked && target.blockerPausedAt) {
      const pDate = new Date(target.blockerPausedAt).toLocaleDateString(
        "en-CA",
        { timeZone: "Asia/Kolkata" },
      );
      if (pDate === selDateStr) {
        blockerMs += Math.max(
          0,
          Date.now() - new Date(target.blockerPausedAt).getTime(),
        );
      }
    }

    return activeMs + blockerMs;
  }, [originalTask, task, selDateObj, officeHours]);

  const [elapsedStr, setElapsedStr] = React.useState(() => {
    const ms = calculateCurrentMs();
    return ms > 0 ? formatMsToDuration(ms) : task.time || "0s";
  });

  React.useEffect(() => {
    if (isSubmitted) {
      setElapsedStr(task.time || "0s");
      return;
    }

    const updateDisplay = () => {
      const ms = calculateCurrentMs();
      setElapsedStr(ms > 0 ? formatMsToDuration(ms) : task.time || "0s");
    };

    updateDisplay();

    const target = originalTask || task;
    const isRunning =
      target &&
      target.status === "In Progress" &&
      !target.actualEndTime &&
      !target.autoPaused;

    if (isRunning) {
      const interval = setInterval(updateDisplay, 1000);
      return () => clearInterval(interval);
    }
  }, [
    allTasks,
    task,
    isSubmitted,
    selectedDate,
    originalTask,
    calculateCurrentMs,
  ]);

  return <span className="whitespace-nowrap">{elapsedStr}</span>;
};

// Helper: map task board status to EOD status enum
const mapTaskStatusToEodStatus = (status) => {
  return status || "Not Started";
};

// Helper: Priority sorting order (In Progress = 1, On Hold = 2, In Review = 3, Pending = 4, Completed = 5)
const getStatusPriority = (status) => {
  const s = (status || "Not Started").toUpperCase();
  if (s.includes("PROGRESS")) return 1;
  if (s.includes("HOLD")) return 2;
  if (s.includes("REVIEW")) return 3;
  if (s.includes("PENDING")) return 4;
  if (s.includes("REJECTED")) return 5;
  if (s.includes("COMPLETED")) return 6;
  return 7;
};

const getCardBgStyle = (status) => {
  const s = (status || "Not Started").toUpperCase();
  switch (s) {
    case "COMPLETED":
      return "bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/50 shadow-xs hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-800";
    case "IN PROGRESS":
    case "IN_PROGRESS":
      return "bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/50 shadow-xs hover:shadow-md hover:border-blue-300 dark:hover:border-blue-800";
    case "IN-REVIEW":
    case "IN REVIEW":
    case "IN_REVIEW":
      return "bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 shadow-xs hover:shadow-md hover:border-amber-300 dark:hover:border-amber-800";
    case "ON HOLD":
    case "ON_HOLD":
      return "bg-orange-50/70 dark:bg-orange-950/30 border border-orange-200/80 dark:border-orange-900/50 shadow-xs";
    case "REJECTED":
      return "bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/50 shadow-xs";
    default: // Pending
      return "bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/80 shadow-xs hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700";
  }
};

const getStatusBadgeStyle = (status) => {
  const s = (status || "Not Started").toUpperCase();
  switch (s) {
    case "COMPLETED":
      return "bg-emerald-50 text-emerald-700 border-emerald-200/50 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30";
    case "IN PROGRESS":
    case "IN_PROGRESS":
      return "bg-blue-50 text-blue-600 border-blue-200/50 dark:bg-blue-950/25 dark:text-blue-400 dark:border-blue-900/30";
    case "IN-REVIEW":
    case "IN REVIEW":
    case "IN_REVIEW":
      return "bg-amber-50 text-amber-700 border-amber-200/50 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30";
    case "ON HOLD":
    case "ON_HOLD":
      return "bg-amber-50 text-amber-600 border-amber-200/50 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30";
    case "REJECTED":
      return "bg-rose-50 text-rose-600 border-rose-200/50 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30";
    default: // Pending
      return "bg-slate-50 text-slate-600 border border-slate-200/60 dark:bg-slate-900/10 dark:text-slate-400 dark:border-slate-800/60";
  }
};

const getStatusTextColor = (status) => {
  const s = (status || "Not Started").toUpperCase();
  switch (s) {
    case "COMPLETED":
      return "text-emerald-700 dark:text-emerald-400";
    case "IN PROGRESS":
    case "IN_PROGRESS":
      return "text-blue-700 dark:text-blue-400";
    case "IN-REVIEW":
    case "IN REVIEW":
    case "IN_REVIEW":
      return "text-amber-700 dark:text-amber-400";
    case "ON HOLD":
    case "ON_HOLD":
      return "text-amber-700 dark:text-amber-400";
    case "REJECTED":
      return "text-rose-700 dark:text-rose-400";
    default: // Pending
      return "text-slate-600 dark:text-slate-400";
  }
};

const calculateTotalLoggedTime = (
  tasks,
  allTasks = [],
  selectedDate,
  officeHours,
) => {
  const selDateObj = selectedDate ? parseISO(selectedDate) : new Date();
  const selDateStr = selDateObj.toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });
  let totalMs = 0;

  (tasks || []).forEach((t) => {
    const originalTask = (allTasks || []).find(
      (at) => at._id === (t.taskId?._id || t.taskId || t.id || t._id),
    );
    const target = originalTask || t;

    const msToday = calculateTaskProductivityForDate(
      target,
      selDateObj,
      officeHours,
    );

    let blockerMs = 0;
    if (target && Array.isArray(target.blockerHistory)) {
      target.blockerHistory.forEach((b) => {
        if (!b.pausedAt) return;
        const pDate = new Date(b.pausedAt).toLocaleDateString("en-CA", {
          timeZone: "Asia/Kolkata",
        });
        const pMs = new Date(b.pausedAt).getTime();
        const rMs = b.resumedAt ? new Date(b.resumedAt).getTime() : Date.now();
        if (pDate === selDateStr) {
          blockerMs += Math.max(0, rMs - pMs);
        }
      });
    }
    if (target && target.isBlocked && target.blockerPausedAt) {
      const pDate = new Date(target.blockerPausedAt).toLocaleDateString(
        "en-CA",
        { timeZone: "Asia/Kolkata" },
      );
      if (pDate === selDateStr) {
        blockerMs += Math.max(
          0,
          Date.now() - new Date(target.blockerPausedAt).getTime(),
        );
      }
    }

    const taskTotalToday = msToday + blockerMs;

    if (taskTotalToday > 0) {
      totalMs += taskTotalToday;
    } else {
      const timeStr = t.time || "";
      const hoursMatch = timeStr.match(/(\d+)\s*h/i);
      const minsMatch = timeStr.match(/(\d+)\s*m/i);
      const secsMatch = timeStr.match(/(\d+)\s*s/i);

      let mins = 0;
      if (hoursMatch) mins += parseInt(hoursMatch[1], 10) * 60;
      if (minsMatch) mins += parseInt(minsMatch[1], 10);
      if (secsMatch && !hoursMatch && !minsMatch) {
        const secs = parseInt(secsMatch[1], 10);
        if (secs > 0) mins += Math.ceil(secs / 60);
      }
      totalMs += mins * 60 * 1000;
    }
  });

  if (totalMs <= 0) return "0m";

  const totalMinutes = Math.floor(totalMs / (1000 * 60));
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;

  if (h > 0) {
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${m}m`;
};

const calculateProductivityPercentage = (
  tasks,
  allTasks = [],
  selectedDate,
  officeHours,
) => {
  const selDateObj = selectedDate ? parseISO(selectedDate) : new Date();
  const selDateStr = selDateObj.toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });
  let totalMs = 0;

  (tasks || []).forEach((t) => {
    const originalTask = (allTasks || []).find(
      (at) => at._id === (t.taskId?._id || t.taskId || t.id || t._id),
    );
    const target = originalTask || t;

    const msToday = calculateTaskProductivityForDate(
      target,
      selDateObj,
      officeHours,
    );

    let blockerMs = 0;
    if (target && Array.isArray(target.blockerHistory)) {
      target.blockerHistory.forEach((b) => {
        if (!b.pausedAt) return;
        const pDate = new Date(b.pausedAt).toLocaleDateString("en-CA", {
          timeZone: "Asia/Kolkata",
        });
        const pMs = new Date(b.pausedAt).getTime();
        const rMs = b.resumedAt ? new Date(b.resumedAt).getTime() : Date.now();
        if (pDate === selDateStr) {
          blockerMs += Math.max(0, rMs - pMs);
        }
      });
    }
    if (target && target.isBlocked && target.blockerPausedAt) {
      const pDate = new Date(target.blockerPausedAt).toLocaleDateString(
        "en-CA",
        { timeZone: "Asia/Kolkata" },
      );
      if (pDate === selDateStr) {
        blockerMs += Math.max(
          0,
          Date.now() - new Date(target.blockerPausedAt).getTime(),
        );
      }
    }

    const taskTotalToday = msToday + blockerMs;

    if (taskTotalToday > 0) {
      totalMs += taskTotalToday;
    } else {
      const timeStr = t.time || "";
      const hoursMatch = timeStr.match(/(\d+)\s*h/i);
      const minsMatch = timeStr.match(/(\d+)\s*m/i);
      const secsMatch = timeStr.match(/(\d+)\s*s/i);

      let mins = 0;
      if (hoursMatch) mins += parseInt(hoursMatch[1], 10) * 60;
      if (minsMatch) mins += parseInt(minsMatch[1], 10);
      if (secsMatch && !hoursMatch && !minsMatch) {
        const secs = parseInt(secsMatch[1], 10);
        if (secs > 0) mins += Math.ceil(secs / 60);
      }
      totalMs += mins * 60 * 1000;
    }
  });

  const totalOfficeMs =
    (officeHours.endHour - officeHours.startHour) * 3600 * 1000;

  if (totalOfficeMs <= 0) return 0;
  
  return Math.min(100, Math.round((totalMs / totalOfficeMs) * 100));
};

const EodReports = () => {
  const dispatch = useDispatch();
  const [updateTaskTrigger] = useUpdateTaskMutation();
  const { user } = useSelector((state) => state.auth);
  const { users } = useSelector((state) => state.users);
  const { designerEodReports, loading: reportLoading } = useSelector(
    (state) => state.designerEodReports,
  );

  const {
    data: allTasks = [],
    isLoading: tasksLoading,
    refetch: refetchTasks,
  } = useGetTasksQuery();
  const { data: projects = [], isLoading: projectsLoading } =
    useGetProjectsQuery();

  // State fields
  const [tasksState, setTasksState] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [daySummary, setDaySummary] = useState({
    toolsIssues: "None",
    clientCalls: "",
    anythingElseOps: "",
  });
  const [tomorrowPlan, setTomorrowPlan] = useState("None");
  const [overallStatus, setOverallStatus] = useState("On Track");
  const [reportId, setReportId] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [officeHours, setOfficeHours] = useState({ startHour: 9, endHour: 19 });

  const getLocalDateString = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const [selectedDate, setSelectedDate] = useState(getLocalDateString());

  // Fetch office hours configuration
  useEffect(() => {
    const fetchOfficeHours = async () => {
      try {
        const res = await axiosInstance.get("/settings/office-hours");
        const settings = res.data?.data || res.data;
        if (settings) {
          setOfficeHours({
            startHour: settings.startHour ?? 9,
            endHour: settings.endHour ?? 19,
            workingDays: settings.workingDays || [1, 2, 3, 4, 5, 6],
          });
        }
      } catch (err) {
        console.error("Error fetching office hours in EOD reports:", err);
      }
    };
    fetchOfficeHours();
  }, []);

  // Fetch users and designer EOD report
  useEffect(() => {
    dispatch(getUsers());
  }, [dispatch]);

  useEffect(() => {
    if (selectedDate) {
      dispatch(getDesignerEodReports({ date: selectedDate }));
    }
  }, [dispatch, selectedDate]);

  // Filter tasks assigned to me that belong to the selected date.
  // Rule: a task appears in EOD ONLY if actual work/productivity happened on that date,
  // OR if it is actively In Progress right now (today only).
  // completedAt / actualEndTime alone is NOT sufficient — a task completed on a date
  // with zero productivity on that date must NOT appear in EOD for that date.
  const myTasks = React.useMemo(() => {
    const selDateObj = selectedDate ? parseISO(selectedDate) : new Date();

    const getLocalDateStr = (date) => {
      if (!date) return null;
      const d = new Date(date);
      if (isNaN(d.getTime())) return null;
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    return allTasks.filter((task) => {
      const assigneeId = task.assignedTo?._id || task.assignedTo;
      const isAssignedToMe = assigneeId === (user?._id || user?.id);
      if (!isAssignedToMe) return false;

      // 1. Check logged productivity for selectedDate
      const loggedMsToday = calculateTaskProductivityForDate(
        task,
        selDateObj,
        officeHours,
      );
      if (loggedMsToday > 0) return true;

      // 2. Check if actively running right now (for today only)
      const todayStr = getLocalDateStr(new Date());
      const isSelectedToday = selectedDate === todayStr;
      const isActivelyRunningNow =
        isSelectedToday &&
        task.status === "In Progress" &&
        !task.actualEndTime &&
        !task.autoPaused;

      if (isActivelyRunningNow) return true;

      // 3. For tasks in "Completed" status:
      // If completed with 0 productivity on selectedDate, NEVER show in EOD for this date
      if (task.status === "Completed") {
        if (loggedMsToday <= 0) return false;
      }

      // 4. For tasks in "In Review" status:
      const isInReview = [
        "In Review",
        "In-Review",
        "IN_REVIEW",
      ].includes(task.status);

      if (isInReview) {
        const reviewDate = getLocalDateStr(
          task.reviewStartedAt ||
            task.lastReviewStartedAt ||
            task.updatedAt,
        );

        if (reviewDate && reviewDate < selectedDate && loggedMsToday <= 0) {
          return false;
        }
      }

      // 5. Date matching for new / pending / active tasks for selectedDate
      if (getLocalDateStr(task.startDate) === selectedDate) return true;
      if (getLocalDateStr(task.dueDate) === selectedDate) return true;
      if (getLocalDateStr(task.createdAt) === selectedDate) return true;
      if (getLocalDateStr(task.actualStartTime) === selectedDate) return true;
      if (
        (task.reviewStartedAt || task.lastReviewStartedAt) &&
        getLocalDateStr(task.reviewStartedAt || task.lastReviewStartedAt) ===
          selectedDate
      ) {
        return true;
      }

      return false;
    });
  }, [allTasks, user, selectedDate, officeHours]);

  // Generate task display ID (e.g. WBLT1)
  const getTaskDisplayId = (task) => {
    if (!task || !task._id) return "";

    const projId = task.project?._id || task.project;
    const projectObj = projects.find((p) => p._id === projId);

    const projChar = (projectObj?.name || task.project?.name || "P")
      .charAt(0)
      .toUpperCase();

    const client = projectObj?.client || task.project?.client;
    const clientName = client?.companyName || "";
    const clientChars = clientName
      ? clientName.substring(0, 2).toUpperCase().padEnd(2, "X")
      : "XX";

    const projectTasks = allTasks.filter(
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

  // Find report for the selected date
  const todayReport = React.useMemo(() => {
    return designerEodReports?.find((report) => {
      const reportDate = new Date(report.date).toISOString().split("T")[0];
      return reportDate === selectedDate;
    });
  }, [designerEodReports, selectedDate]);

  // Populate form state when EOD Report or tasks load
  useEffect(() => {
    const selDateObj = selectedDate ? parseISO(selectedDate) : new Date();

    if (todayReport) {
      setReportId(todayReport._id);
      setIsSubmitted(!todayReport.isDraft);
      setDaySummary({
        toolsIssues: todayReport.daySummary?.toolsIssues || "None",
        clientCalls: todayReport.daySummary?.clientCalls || "",
        anythingElseOps: todayReport.daySummary?.anythingElseOps || "",
      });
      setTomorrowPlan(todayReport.tomorrowPlan || "None");
      setOverallStatus(todayReport.overallStatus || "On Track");

      if (todayReport.tasks && todayReport.tasks.length > 0) {
        const myTaskIdsSet = new Set(
          myTasks.map((mt) => (mt._id || mt.id).toString()),
        );

        const savedTasks = todayReport.tasks
          .filter((t) => {
            if (!todayReport.isDraft) return true; // Keep exact history for submitted reports
            const tId = (t.taskId?._id || t.taskId || t._id)?.toString();
            return myTaskIdsSet.has(tId);
          })
          .map((t) => {
            const correspondingTask = myTasks.find(
              (mt) => mt._id === (t.taskId?._id || t.taskId),
            );
            const actualStatus = t.statusAtEod
              ? t.statusAtEod
              : correspondingTask
                ? mapTaskStatusToEodStatus(correspondingTask.status)
                : "Not Started";
            const taskCode = correspondingTask
              ? getTaskDisplayId(correspondingTask)
              : "";

            const creator = correspondingTask?.createdBy || t.reviewedBy;
            const creatorName =
              creator && typeof creator === "object"
                ? creator.name
                : users.find(
                    (u) =>
                      u._id ===
                      (typeof creator === "string" ? creator : creator?._id),
                  )?.name || "Admin";
            const creatorId =
              !todayReport.isDraft && t.reviewedBy
                ? typeof t.reviewedBy === "object"
                  ? t.reviewedBy._id
                  : t.reviewedBy
                : creator && typeof creator === "object"
                  ? creator._id
                  : creator || "";
            const calculatedTimeStr = correspondingTask
              ? getTaskInprogressTime(
                  correspondingTask,
                  selDateObj,
                  officeHours,
                )
              : "0s";

            return {
              id: t.taskId || t._id,
              taskId: t.taskId?._id || t.taskId || t._id,
              title: t.title,
              project: t.project,
              priority: t.priority,
              contentType: t.contentType || "",
              client: t.client,
              revision: correspondingTask
                ? correspondingTask.revisions || 0
                : t.revisions || 0,
              time: !todayReport.isDraft
                ? t.loggedTime || t.time || calculatedTimeStr
                : calculatedTimeStr !== "0s"
                  ? calculatedTimeStr
                  : t.loggedTime || calculatedTimeStr,
              statusAtEod: actualStatus,
              outputLink: t.outputLink || "",
              reason: t.reason || "",
              nextAction: t.nextAction || "",
              reviewedBy: creatorId,
              assignedByName: creatorName,
              code: taskCode,
              createdAt: correspondingTask?.createdAt || t.createdAt,
            };
          });

        // Merge any tasks from myTasks that were not in the saved report tasks
        const savedTaskIds = new Set(
          savedTasks.map((t) =>
            (t.taskId?._id || t.taskId || t.id || t._id).toString(),
          ),
        );
        const newUnsavedTasks = myTasks.filter(
          (mt) => !savedTaskIds.has(mt._id.toString()),
        );

        const unsavedMapped = newUnsavedTasks.map((t) => {
          const clientName = t.project?.client?.companyName || "Internal";
          const projectName = t.project?.name || "Internal";
          const elapsedStr = getTaskInprogressTime(t, selDateObj, officeHours);
          const taskCode = getTaskDisplayId(t);

          const creator = t.createdBy;
          const creatorName =
            creator && typeof creator === "object"
              ? creator.name
              : users.find(
                  (u) =>
                    u._id ===
                    (typeof creator === "string" ? creator : creator?._id),
                )?.name || "Admin";
          const creatorId =
            creator && typeof creator === "object"
              ? creator._id
              : creator || "";

          return {
            id: t._id,
            taskId: t._id,
            title: t.title,
            project: projectName,
            priority: t.priority,
            contentType: t.contentType || "",
            client: clientName,
            revision: t.revisions || 0,
            time: elapsedStr,
            statusAtEod: mapTaskStatusToEodStatus(t.status),
            outputLink: "",
            reason: "",
            nextAction: "",
            reviewedBy: creatorId,
            assignedByName: creatorName,
            code: taskCode,
            createdAt: t.createdAt,
          };
        });

        setTasksState([...savedTasks, ...unsavedMapped]);
      } else if (myTasks.length > 0) {
        setTasksState(
          myTasks.map((t) => {
            const clientName = t.project?.client?.companyName || "Internal";
            const projectName = t.project?.name || "Internal";
            const elapsedStr = getTaskInprogressTime(
              t,
              selDateObj,
              officeHours,
            );
            const taskCode = getTaskDisplayId(t);

            const creator = t.createdBy;
            const creatorName =
              creator && typeof creator === "object"
                ? creator.name
                : users.find(
                    (u) =>
                      u._id ===
                      (typeof creator === "string" ? creator : creator?._id),
                  )?.name || "Admin";
            const creatorId =
              creator && typeof creator === "object"
                ? creator._id
                : creator || "";

            return {
              id: t._id,
              taskId: t._id,
              title: t.title,
              project: projectName,
              priority: t.priority,
              contentType: t.contentType || "",
              client: clientName,
              revision: t.revisions || 0,
              time: elapsedStr,
              statusAtEod: mapTaskStatusToEodStatus(t.status),
              outputLink: "",
              reason: "",
              nextAction: "",
              reviewedBy: creatorId,
              assignedByName: creatorName,
              code: taskCode,
              createdAt: t.createdAt,
            };
          }),
        );
      } else {
        setTasksState([]);
      }
    } else if (myTasks.length > 0) {
      setTasksState(
        myTasks.map((t) => {
          const clientName = t.project?.client?.companyName || "Internal";
          const projectName = t.project?.name || "Internal";
          const elapsedStr = getTaskInprogressTime(t, selDateObj, officeHours);
          const taskCode = getTaskDisplayId(t);

          const creator = t.createdBy;
          const creatorName =
            creator && typeof creator === "object"
              ? creator.name
              : users.find(
                  (u) =>
                    u._id ===
                    (typeof creator === "string" ? creator : creator?._id),
                )?.name || "Admin";
          const creatorId =
            creator && typeof creator === "object"
              ? creator._id
              : creator || "";

          return {
            id: t._id,
            taskId: t._id,
            title: t.title,
            project: projectName,
            priority: t.priority,
            contentType: t.contentType || "",
            client: clientName,
            revision: t.revisions || 0,
            time: elapsedStr,
            statusAtEod: mapTaskStatusToEodStatus(t.status),
            outputLink: "",
            reason: "",
            nextAction: "",
            reviewedBy: creatorId,
            assignedByName: creatorName,
            code: taskCode,
            createdAt: t.createdAt,
          };
        }),
      );
      setDaySummary({
        toolsIssues: "None",
        clientCalls: "",
        anythingElseOps: "",
      });
      setTomorrowPlan("None");
      setOverallStatus("None");
      setReportId(null);
      setIsSubmitted(false);
    } else {
      // Reset form state for a fresh date with no tasks and no report
      setTasksState([]);
      setDaySummary({
        toolsIssues: "None",
        clientCalls: "",
        anythingElseOps: "",
      });
      setTomorrowPlan("None");
      setOverallStatus("None");
      setReportId(null);
      setIsSubmitted(false);
    }
  }, [todayReport, myTasks, projects, users, officeHours]);

  // Sync task status, code, and elapsed time dynamically from allTasks/myTasks
  useEffect(() => {
    if (myTasks.length > 0 && tasksState.length > 0 && projects.length > 0) {
      const selDateObj = selectedDate ? parseISO(selectedDate) : new Date();

      setTasksState((prev) =>
        prev.map((t) => {
          const correspondingTask = myTasks.find((mt) => mt._id === t.taskId);
          if (correspondingTask) {
            const mappedStatus = mapTaskStatusToEodStatus(
              correspondingTask.status,
            );
            const calculatedTimeStr = getTaskInprogressTime(
              correspondingTask,
              selDateObj,
              officeHours,
            );
            const taskCode = getTaskDisplayId(correspondingTask);

            const creator = correspondingTask.createdBy;
            const creatorName =
              creator && typeof creator === "object"
                ? creator.name
                : users.find(
                    (u) =>
                      u._id ===
                      (typeof creator === "string" ? creator : creator?._id),
                  )?.name || "Admin";
            const creatorId =
              creator && typeof creator === "object"
                ? creator._id
                : creator || "";

            const taskRevision = correspondingTask.revisions || 0;

            const targetStatus = t.statusAtEod || mappedStatus;
            const targetTime =
              isSubmitted && t.time
                ? t.time
                : calculatedTimeStr !== "0s"
                  ? calculatedTimeStr
                  : t.time || calculatedTimeStr;
            const targetReviewedBy =
              isSubmitted && t.reviewedBy ? t.reviewedBy : creatorId;

            if (
              t.statusAtEod !== targetStatus ||
              t.time !== targetTime ||
              t.code !== taskCode ||
              t.reviewedBy !== targetReviewedBy ||
              t.assignedByName !== creatorName ||
              t.revision !== taskRevision
            ) {
              return {
                ...t,
                statusAtEod: targetStatus,
                time: targetTime,
                code: taskCode,
                reviewedBy: targetReviewedBy,
                assignedByName: creatorName,
                revision: taskRevision,
              };
            }
          }
          return t;
        }),
      );
    }
  }, [myTasks, projects, users, selectedDate, isSubmitted, officeHours]);

  // Automatically calculate overallStatus from tasksState
  useEffect(() => {
    if (tasksState.length > 0) {
      const hasPending = tasksState.some(
        (t) => !["Completed", "In Review"].includes(t.statusAtEod),
      );
      const allCompletedOrInReview = tasksState.every((t) =>
        ["Completed", "In Review"].includes(t.statusAtEod),
      );

      if (hasPending) {
        setOverallStatus("Delayed");
      } else if (allCompletedOrInReview) {
        setOverallStatus("Completed");
      } else {
        setOverallStatus("On Track");
      }
    } else {
      if (todayReport && todayReport.overallStatus) {
        setOverallStatus(todayReport.overallStatus);
      } else {
        setOverallStatus("None");
      }
    }
  }, [tasksState, todayReport]);

  const updateTask = (taskId, field, value) => {
    setTasksState((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, [field]: value } : t)),
    );
  };

  const handleSave = async (isDraftSubmit) => {
    // Validation on Submission (Not Draft)
    if (!isDraftSubmit) {
      if (!overallStatus || overallStatus.trim() === "") {
        toast.error("Overall Status cannot be empty.");
        return;
      }

      if (
        !tomorrowPlan ||
        tomorrowPlan === "None" ||
        tomorrowPlan.trim() === ""
      ) {
        toast.error("Tomorrow Plan cannot be 'None' or empty.");
        return;
      }
    }

    const payload = {
      date: selectedDate,
      isDraft: isDraftSubmit,
      tasks: tasksState.map((t) => ({
        taskId: t.taskId,
        title: t.title,
        project: t.project,
        priority: t.priority,
        contentType: t.contentType,
        client: t.client,
        revisions: t.revision,
        loggedTime: t.time,
        statusAtEod: t.statusAtEod,
        outputLink: t.outputLink,
        reason: t.reason,
        nextAction: t.nextAction,
        reviewedBy: t.reviewedBy || undefined,
        createdAt: t.createdAt,
      })),
      daySummary,
      tomorrowPlan,
      overallStatus,
    };

    try {
      if (reportId) {
        await dispatch(
          updateDesignerEodReport({ id: reportId, data: payload }),
        ).unwrap();
        toast.success(
          isDraftSubmit
            ? "Draft updated successfully!"
            : "EOD Report submitted successfully!",
        );
      } else {
        await dispatch(createDesignerEodReport(payload)).unwrap();
        toast.success(
          isDraftSubmit
            ? "Draft saved successfully!"
            : "EOD Report submitted successfully!",
        );
      }
      dispatch(getDesignerEodReports({ date: selectedDate }));
      refetchTasks();
    } catch (err) {
      console.error("Failed to save report:", err);
      toast.error(err.message || "Failed to save EOD Report");
    }
  };

  // Helper to format date string
  const getLocalDateStr = (date) => {
    if (!date) return null;
    const d = new Date(date);
    if (isNaN(d.getTime())) return null;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const totalTasks = tasksState.length;
  const completedCount = tasksState.filter(
    (t) => t.statusAtEod === "Completed",
  ).length;
  const rejectedCount = tasksState.filter(
    (t) => t.statusAtEod === "Rejected",
  ).length;
  const inProgressCount = tasksState.filter(
    (t) => t.statusAtEod === "In Progress",
  ).length;
  const onHoldCount = tasksState.filter(
    (t) => t.statusAtEod === "On Hold",
  ).length;
  const inReviewCount = tasksState.filter(
    (t) => t.statusAtEod === "In Review",
  ).length;
  const revisionCount = tasksState.filter((t) =>
    ["Revision", "Revision Not Started"].includes(t.statusAtEod),
  ).length;
  const pendingCount = Math.max(
    0,
    totalTasks -
      completedCount -
      rejectedCount -
      inProgressCount -
      onHoldCount -
      inReviewCount -
      revisionCount,
  );

  const dynamicPlans = tasksState.map((task) => {
    const actionWord =
      task.statusAtEod === "Completed" ? "Complete" : "Continue";
    const clientPart = task.client ? `${task.client} ` : "";
    const titlePart = task.title || "";
    return `${actionWord} ${clientPart}${titlePart}`;
  });

  const completedTasks = React.useMemo(
    () => tasksState.filter((t) => t.statusAtEod === "Completed"),
    [tasksState],
  );

  const todayProductivityTasks = React.useMemo(
    () =>
      tasksState
        .filter((t) => t.statusAtEod !== "Completed")
        .sort(
          (a, b) =>
            getStatusPriority(a.statusAtEod) - getStatusPriority(b.statusAtEod),
        ),
    [tasksState],
  );

  const filteredTasks = React.useMemo(() => {
    const selDateObj = selectedDate ? parseISO(selectedDate) : new Date();
    let list = tasksState.filter((t) => {
      if (t.statusAtEod === "Completed") {
        const correspondingTask = (allTasks || []).find(
          (at) => at._id === (t.taskId?._id || t.taskId || t.id || t._id),
        );
        const target = correspondingTask || t;
        const loggedMs = calculateTaskProductivityForDate(
          target,
          selDateObj,
          officeHours,
        );
        const timeStr = t.time || "";
        const isZeroTime =
          loggedMs <= 0 &&
          (!timeStr || timeStr === "0s" || timeStr === "0m" || timeStr === "0");
        if (isZeroTime) return false;
      }
      return true;
    });

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (t) =>
          (t.title && t.title.toLowerCase().includes(q)) ||
          (t.code && t.code.toLowerCase().includes(q)) ||
          (t.client && t.client.toLowerCase().includes(q)) ||
          (t.project && t.project.toLowerCase().includes(q)) ||
          (t.assignedByName && t.assignedByName.toLowerCase().includes(q)) ||
          (t.statusAtEod && t.statusAtEod.toLowerCase().includes(q)) ||
          (t.priority && t.priority.toLowerCase().includes(q)),
      );
    }

    return list.sort(
      (a, b) =>
        getStatusPriority(a.statusAtEod) - getStatusPriority(b.statusAtEod),
    );
  }, [tasksState, searchTerm, allTasks, selectedDate, officeHours]);

  if (tasksLoading || reportLoading || projectsLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <div className="w-8 h-8 border-3 border-slate-200 border-t-emerald-500 rounded-full animate-spin"></div>
        <p className="text-sm font-semibold text-slate-500">
          Loading your EOD task data...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-7xl mx-auto">
      {/* Header Card */}
      <div className=" relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="text-left">
            <h1 className="text-md font-bold theme-text-primary text-left">
              {selectedDate === getLocalDateString()
                ? "Today's Tasks"
                : `Tasks for ${safeFormatDate(selectedDate)}`}{" "}
              — {user?.name || "Member"}
            </h1>
            <p className="theme-text-secondary text-xs font-semibold mt-1 text-left">
              {selectedDate === getLocalDateString()
                ? "Review and submit EOD reports for tasks due today."
                : `Review and submit EOD reports for tasks due on ${safeFormatDate(selectedDate)}.`}
            </p>
          </div>

          <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border theme-border px-4 py-2 rounded-xl text-slate-700 dark:text-slate-300 self-start lg:self-auto shadow-xs">
            <FiCalendar className="shrink-0 text-indigo-500" size={15} />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-xs font-bold outline-none cursor-pointer [&::-webkit-calendar-picker-indicator]:dark:invert"
            />
          </div>
        </div>
      </div>

      {/* Task Table Section */}
      {tasksState.length === 0 ? (
        <div className="mt-8 theme-bg-card  rounded-2xl p-12 text-center flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-400 border theme-border">
            <FiCheckCircle size={22} />
          </div>
          <h3 className="font-bold theme-text-primary mt-4 text-sm">
            {selectedDate === getLocalDateString()
              ? "Today no task due"
              : "No tasks due for this date"}
          </h3>
          <p className="text-xs theme-text-secondary mt-1 max-w-xs">
            {selectedDate === getLocalDateString()
              ? "You don't have any tasks due today. Go to Tasks board to check your schedule."
              : `You didn't have any tasks due on ${safeFormatDate(selectedDate)}.`}
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {/* Controls Bar: Task Count & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 relative z-10">
            <div className="flex items-center gap-2 px-1">
              <h2 className="text-xs font-bold theme-text-primary uppercase tracking-wider">
                All Tasks
              </h2>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                {filteredTasks.length}
              </span>
            </div>

            {/* Search Box */}
            <div className="relative min-w-[240px]">
             
              <input
                type="text"
                placeholder="Search tasks, codes, clients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 rounded-xl pl-8 pr-8 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all font-medium"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                  <FiX size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-xl shadow-lg shadow-slate-200/30 dark:shadow-none rounded-3xl  overflow-hidden relative z-10 mt-2">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[1100px]">
                <thead>
                  <tr className="bg-slate-100/50 dark:bg-slate-800/30  text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest select-none backdrop-blur-md">
                    <th className="px-4 py-3 text-center w-24"># / Code</th>
                    <th className="px-4 py-3 min-w-[260px]">Task Name & Client</th>
                    <th className="px-4 py-3 min-w-[130px]">Assigned By</th>
                    <th className="px-4 py-3 min-w-[120px]">Priority / Rev</th>
                    <th className="px-4 py-3 min-w-[130px]">Productivity Time</th>
                    <th className="px-4 py-3 min-w-[120px]">Status</th>
                    <th className="px-4 py-3 min-w-[210px]">Reason for Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 dark:divide-slate-800/80 text-xs">
                  {filteredTasks.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <FiSearch className="text-slate-400" size={24} />
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            No matching tasks found
                          </p>
                          <p className="text-[11px] text-slate-400">
                            Try adjusting your search query or tab filter
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredTasks.map((task, idx) => {
                      const assignerUser = users.find(
                        (u) => u._id === task.reviewedBy,
                      );
                      const assignerName =
                        assignerUser?.name || task.assignedByName || "Admin";

                      const isCompleted = task.statusAtEod === "Completed";
                      const isInProgress = [
                        "In Progress",
                        "IN PROGRESS",
                        "IN_PROGRESS",
                      ].includes(task.statusAtEod);
                      const isInReview = [
                        "In Review",
                        "In-Review",
                        "IN_REVIEW",
                      ].includes(task.statusAtEod);

                      return (
                        <tr
                          key={task.id || task.taskId || idx}
                          className={`transition-all duration-300 ${
                            isCompleted
                              ? "bg-emerald-50/20 dark:bg-emerald-950/10 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/25"
                              : isInProgress
                                ? "bg-blue-50/20 dark:bg-blue-950/15 hover:bg-blue-50/40 dark:hover:bg-blue-950/30"
                                : isInReview
                                  ? "bg-amber-50/20 dark:bg-amber-950/10 hover:bg-amber-50/40 dark:hover:bg-amber-950/25"
                                  : "bg-transparent hover:bg-slate-50/80 dark:hover:bg-slate-800/30"
                          } group`}
                        >
                          {/* 1. Code */}
                          <td className="px-4 py-3 whitespace-nowrap align-middle">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 w-4 text-center">
                                {idx + 1}
                              </span>
                              {task.code ? (
                                <span
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-black border tracking-wider select-none shrink-0 ${getTaskCodeStyle(task.code).bg}`}
                                >
                                  [{task.code}]
                                </span>
                              ) : (
                                <span className="text-slate-400 text-xs">—</span>
                              )}
                            </div>
                          </td>

                          {/* 2. Task Name & Client */}
                          <td className="px-4 py-3 align-middle">
                            <div className="flex flex-col gap-1 max-w-[320px]">
                              <div
                                className="flex items-center gap-1.5 min-w-0"
                                title={task.title}
                              >
                                <FiFileText
                                  className="text-slate-500 dark:text-slate-300 shrink-0"
                                  size={13}
                                />
                                <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                  {task.title}
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5">
                                {task.client && (
                                  <span className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-black border border-slate-300 dark:border-slate-600 text-[9.5px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider">
                                    {task.client}
                                  </span>
                                )}
                                {task.contentType && (
                                  <span className="bg-purple-100/80 text-purple-700 border border-purple-200/60 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900/50 text-[9.5px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider">
                                    {task.contentType}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* 3. Assigned By */}
                          <td className="px-4 py-3 whitespace-nowrap align-middle">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-semibold text-slate-900 dark:text-white">
                                {assignerName}
                              </span>
                            </div>
                          </td>

                          {/* 4. Priority & Revision */}
                          <td className="px-4 py-3 whitespace-nowrap align-middle">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`${getPriorityStyle(
                                  task.priority,
                                )} text-[9.5px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider`}
                              >
                                {task.priority || "Normal"}
                              </span>
                              <span className="text-[9.5px] font-bold text-slate-700 dark:text-black bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 px-1.5 py-0.5 rounded">
                                Rev. {task.revision || 0}
                              </span>
                            </div>
                          </td>

                          {/* 5. Time Logged */}
                          <td className="px-4 py-3 whitespace-nowrap align-middle">
                            {task.time ? (
                              <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100/80 text-blue-700 border border-blue-200/60 rounded-md text-[10px] font-black dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/50">
                                <FiClock
                                  size={10}
                                  className={`shrink-0 text-blue-500 ${isInProgress ? "animate-pulse" : ""}`}
                                />
                                <LiveTimeTracker
                                  task={task}
                                  allTasks={allTasks}
                                  isSubmitted={isSubmitted}
                                  selectedDate={selectedDate}
                                  officeHours={officeHours}
                                />
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400">0s</span>
                            )}
                          </td>

                          {/* 6. Status */}
                          <td className="px-4 py-3 whitespace-nowrap align-middle">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10.5px] font-black tracking-wide ${getStatusBadgeStyle(
                                task.statusAtEod,
                              )}`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isCompleted
                                    ? "bg-emerald-500"
                                    : isInProgress
                                      ? "bg-blue-500 animate-pulse"
                                      : isInReview
                                        ? "bg-amber-500"
                                        : "bg-slate-400"
                                }`}
                              />
                              {task.statusAtEod || "Not Started"}
                            </span>
                          </td>

                          {/* 7. Reason for Status */}
                          <td className="px-4 py-3 align-middle">
                            {isCompleted ? (
                              <div className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                                <FiCheckCircle size={13} className="shrink-0" />
                                <span>Completed</span>
                              </div>
                            ) : isInReview ? (
                              <div className="inline-flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/50 text-amber-800 dark:text-amber-300 rounded-lg px-2.5 py-1 text-xs font-bold shadow-2xs">
                                <span>😁</span>
                                <span>Thank you!</span>
                              </div>
                            ) : (
                              <input
                                type="text"
                                placeholder={`Why ${task.statusAtEod?.toLowerCase() || "pending"}?`}
                                className="w-full bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all font-semibold"
                                value={task.reason || ""}
                                onChange={(e) =>
                                  updateTask(task.id, "reason", e.target.value)
                                }
                                disabled={isSubmitted}
                              />
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================
                      DAY SUMMARY
      ========================================= */}
      {(tasksState.length > 0 || todayReport) && (
        <div className="mt-8 text-left relative z-10 overflow-hidden">
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl -mr-32 -mb-32 pointer-events-none" />
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-3 relative z-10">
            <div>
              <h2 className="text-md md:text-xl font-bold">
                EOD REPORT
              </h2>
            </div>
            <span className="text-[10px] font-bold text-slate-400 ">
              Submitted once, covers all tasks
            </span>
          </div>{" "}
          {/* eod summary cards  */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 mt-4 mb-5">
            {/* 1. In Review Card */}
            <div className="bg-white dark:bg-[#0f172a]/90 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm hover:shadow-xl hover:shadow-amber-500/10 hover:border-amber-500/30 dark:hover:border-amber-500/30 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-900/40 dark:to-amber-900/10 rounded-full -mr-6 -mt-6 blur-2xl group-hover:scale-150 transition-all duration-500" />
              <div className="flex items-center justify-between relative z-10">
                <span className="text-3xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
                  {inReviewCount}
                </span>
                <div className="p-2.5 bg-amber-50 dark:bg-amber-500/10 rounded-xl group-hover:bg-amber-100 dark:group-hover:bg-amber-500/20 transition-colors duration-300">
                  <FiClock className="text-amber-600 dark:text-amber-400 text-xl" />
                </div>
              </div>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-3 block relative z-10">
                In Review
              </span>
            </div>

            {/* 2. In Progress Card */}
            <div className="bg-white dark:bg-[#0f172a]/90 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm hover:shadow-xl hover:shadow-blue-500/10 hover:border-blue-500/30 dark:hover:border-blue-500/30 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/40 dark:to-blue-900/10 rounded-full -mr-6 -mt-6 blur-2xl group-hover:scale-150 transition-all duration-500" />
              <div className="flex items-center justify-between relative z-10">
                <span className="text-3xl font-bold tracking-tight text-blue-600 dark:text-blue-400">
                  {inProgressCount}
                </span>
                <div className="p-2.5 bg-blue-50 dark:bg-blue-500/10 rounded-xl group-hover:bg-blue-100 dark:group-hover:bg-blue-500/20 transition-colors duration-300">
                  <FiTool className="text-blue-600 dark:text-blue-400 text-xl" />
                </div>
              </div>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-3 block relative z-10">
                In Progress
              </span>
            </div>

            {/* 3. Pending Card */}
            <div className="bg-white dark:bg-[#0f172a]/90 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 hover:border-indigo-500/30 dark:hover:border-indigo-500/30 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-indigo-100 to-indigo-50 dark:from-indigo-900/40 dark:to-indigo-900/10 rounded-full -mr-6 -mt-6 blur-2xl group-hover:scale-150 transition-all duration-500" />
              <div className="flex items-center justify-between relative z-10">
                <span className="text-3xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400">
                  {pendingCount}
                </span>
                <div className="p-2.5 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl group-hover:bg-indigo-100 dark:group-hover:bg-indigo-500/20 transition-colors duration-300">
                  <FiCalendar className="text-indigo-600 dark:text-indigo-400 text-xl" />
                </div>
              </div>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-3 block relative z-10">
                Pending
              </span>
            </div>

            {/* 6. Total Logged Card */}
            <div className="bg-white dark:bg-[#0f172a]/90 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm hover:shadow-xl hover:shadow-purple-500/10 hover:border-purple-500/30 dark:hover:border-purple-500/30 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-purple-100 to-purple-50 dark:from-purple-900/40 dark:to-purple-900/10 rounded-full -mr-6 -mt-6 blur-2xl group-hover:scale-150 transition-all duration-500" />
              <div className="flex items-center justify-between relative z-10">
                <span className="text-2xl font-bold tracking-tight text-purple-600 dark:text-purple-400">
                  {calculateTotalLoggedTime(
                    tasksState,
                    allTasks,
                    selectedDate,
                    officeHours,
                  )}
                </span>
                <div className="p-2.5 bg-purple-50 dark:bg-purple-500/10 rounded-xl group-hover:bg-purple-100 dark:group-hover:bg-purple-500/20 transition-colors duration-300 shrink-0 ml-1">
                  <FiClock className="text-purple-600 dark:text-purple-400 text-xl" />
                </div>
              </div>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-3 block relative z-10">
                Total Time Taken
              </span>
            </div>

            {/* 7. Productivity % Card */}
            <div className="bg-white dark:bg-[#0f172a]/90 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm hover:shadow-xl hover:shadow-emerald-500/10 hover:border-emerald-500/30 dark:hover:border-emerald-500/30 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-900/40 dark:to-emerald-900/10 rounded-full -mr-6 -mt-6 blur-2xl group-hover:scale-150 transition-all duration-500" />
              <div className="flex items-center justify-between relative z-10">
                <span className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                  {calculateProductivityPercentage(
                    tasksState,
                    allTasks,
                    selectedDate,
                    officeHours,
                  )}%
                </span>
                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl group-hover:bg-emerald-100 dark:group-hover:bg-emerald-500/20 transition-colors duration-300">
                  <FiCheckCircle className="text-emerald-600 dark:text-emerald-400 text-xl" />
                </div>
              </div>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-3 block relative z-10">
                Productivity
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
            <div>
              <label className="text-[10px] font-bold theme-text-secondary uppercase tracking-wider block">
                Issues faced
              </label>
              <div className="relative mt-2">
                <select
                  className="w-full bg-white/70 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 rounded-xl py-2.5 px-4 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all font-semibold backdrop-blur-sm"
                  value={
                    daySummary.toolsIssues === "None"
                      ? "None"
                      : [
                            "Client content received late",
                            "Software / tool issue",
                            "Power / internet issue",
                          ].includes(daySummary.toolsIssues)
                        ? daySummary.toolsIssues
                        : "Other"
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "Other") {
                      setDaySummary({ ...daySummary, toolsIssues: "" });
                    } else {
                      setDaySummary({ ...daySummary, toolsIssues: val });
                    }
                  }}
                  disabled={isSubmitted}
                >
                  <option value="None">None</option>
                  <option value="Client content received late">
                    Client content received late
                  </option>
                  <option value="Software / tool issue">
                    Software / tool issue
                  </option>
                  <option value="Power / internet issue">
                    Power / internet issue
                  </option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {daySummary.toolsIssues !== "None" &&
                ![
                  "Client content received late",
                  "Software / tool issue",
                  "Power / internet issue",
                ].includes(daySummary.toolsIssues) && (
                  <div className="relative mt-2">
                    <input
                      type="text"
                      placeholder="Specify other issue..."
                      className="w-full bg-white/70 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 rounded-xl py-2.5 pl-4 pr-10 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all font-semibold backdrop-blur-sm"
                      value={daySummary.toolsIssues}
                      onChange={(e) =>
                        setDaySummary({
                          ...daySummary,
                          toolsIssues: e.target.value,
                        })
                      }
                      disabled={isSubmitted}
                    />
                    {!isSubmitted && (
                      <button
                        type="button"
                        onClick={() =>
                          setDaySummary({ ...daySummary, toolsIssues: "None" })
                        }
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500 transition-colors"
                      >
                        <FiX size={14} />
                      </button>
                    )}
                  </div>
                )}
            </div>

            {/* Overall Status */}
            <div>
              <label className="text-[10px] font-bold theme-text-secondary uppercase tracking-wider block">
                Overall Status
              </label>
              <div className="relative mt-2">
                <div
                  className={`w-full border rounded-xl px-4 py-2.5 text-xs font-bold select-none flex items-center justify-between transition-all duration-300 ${
                    overallStatus === "Completed"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200/50 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30"
                      : overallStatus === "On Track"
                        ? "bg-blue-50 text-blue-700 border-blue-200/50 dark:bg-blue-950/25 dark:text-blue-400 dark:border-blue-900/30"
                        : overallStatus === "Delayed"
                          ? "bg-rose-50 text-rose-700 border-rose-200/50 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30"
                          : "bg-slate-50 text-slate-655 border border-slate-200/60 dark:bg-slate-900/10 dark:text-slate-400 dark:border-slate-800/60"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        overallStatus === "Completed"
                          ? "bg-emerald-500"
                          : overallStatus === "On Track"
                            ? "bg-blue-500"
                            : overallStatus === "Delayed"
                              ? "bg-rose-500"
                              : "bg-slate-400"
                      }`}
                    />
                    <span>{overallStatus}</span>
                  </div>
                  <span className="text-[9px] uppercase tracking-widest text-slate-400 dark:text-slate-500 font-extrabold">
                    Auto
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
            <div>
              <label className="text-[10px] font-bold theme-text-secondary uppercase tracking-wider block relative z-10">
                Anything Else Ops Should Know
              </label>
              <textarea
                rows={4}
                placeholder="Operational difficulties, approvals pending etc..."
                className="w-full mt-2 bg-white/70 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all resize-none font-semibold backdrop-blur-sm relative z-10"
                value={daySummary.anythingElseOps}
                onChange={(e) =>
                  setDaySummary({
                    ...daySummary,
                    anythingElseOps: e.target.value,
                  })
                }
                disabled={isSubmitted}
              />
            </div>

            <div>
              <label className="text-[10px] font-bold theme-text-secondary uppercase tracking-wider block relative z-10">
                Tomorrow Plan <span className="text-rose-500">*</span>
              </label>
              <select
                className="w-full mt-2 bg-white/70 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 rounded-xl py-2.5 px-4 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all font-semibold backdrop-blur-sm relative z-10"
                value={
                  tomorrowPlan === "None"
                    ? "None"
                    : dynamicPlans.includes(tomorrowPlan)
                      ? tomorrowPlan
                      : "Other"
                }
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "Other") {
                    setTomorrowPlan("");
                  } else if (val === "None") {
                    setTomorrowPlan("None");
                  } else {
                    setTomorrowPlan(val);
                  }
                }}
                disabled={isSubmitted}
              >
                <option value="None">None</option>
                {dynamicPlans.map((plan, idx) => (
                  <option key={idx} value={plan}>
                    {plan}
                  </option>
                ))}
                <option value="Other">Other</option>
              </select>

              {tomorrowPlan !== "None" &&
                (!tomorrowPlan || !dynamicPlans.includes(tomorrowPlan)) && (
                  <div className="relative mt-2 z-10">
                    <textarea
                      rows={3}
                      placeholder="What tasks do you plan to work on tomorrow?"
                      className="w-full bg-white/70 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3 pr-10 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all resize-none font-semibold backdrop-blur-sm"
                      value={tomorrowPlan}
                      onChange={(e) => setTomorrowPlan(e.target.value)}
                      disabled={isSubmitted}
                    />
                    {!isSubmitted && (
                      <button
                        type="button"
                        onClick={() => setTomorrowPlan("None")}
                        className="absolute right-3 top-3 text-slate-400 hover:text-rose-500 transition-colors"
                      >
                        <FiX size={14} />
                      </button>
                    )}
                  </div>
                )}
            </div>
          </div>
          {/* Footer actions */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-5 mt-8 border-t border-slate-200/60 dark:border-slate-800/60 pt-6 relative z-10">
            <p className="text-xs font-semibold theme-text-secondary">
              {completedCount + pendingCount + rejectedCount} of {totalTasks}{" "}
              tasks logged
            </p>

            {!isSubmitted ? (
              <div className="flex gap-4 w-full md:w-auto">
                <button
                  onClick={() => handleSave(true)}
                  className="flex-1 md:flex-none px-6 py-2.5 rounded-xl border theme-border theme-text-primary font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Save Draft
                </button>
                <button
                  onClick={() => handleSave(false)}
                  className="flex-1 md:flex-none px-8 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition shadow-lg shadow-emerald-600/10 cursor-pointer"
                >
                  Submit EOD Report
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-4 py-2.5 rounded-xl text-xs font-bold w-full sm:w-auto justify-center">
                  <FiCheckCircle />
                  Report Submitted for{" "}
                  {selectedDate === getLocalDateString()
                    ? "Today"
                    : safeFormatDate(selectedDate)}
                </div>
                <button
                  onClick={() => setIsSubmitted(false)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-xs hover:bg-blue-500/20 transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <FiEdit2 size={12} />
                  Re-edit Report
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EodReports;
