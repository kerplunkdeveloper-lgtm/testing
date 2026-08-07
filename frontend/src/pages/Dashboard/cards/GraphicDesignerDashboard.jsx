import React, {
  useMemo,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";

const LiveProductivityCell = React.memo(
  ({ tasks = [], initialLoggedMs = 0 }) => {
    const [liveMs, setLiveMs] = useState(initialLoggedMs);

    const hasInProgress = useMemo(() => {
      return tasks.some((t) => t.status === "In Progress" && !t.actualEndTime);
    }, [tasks]);

    const hasInReview = useMemo(() => {
      return tasks.some((t) => {
        const s = (t.status || "").toLowerCase();
        return (s === "in review" || s === "in-review") && !t.actualEndTime;
      });
    }, [tasks]);

    const calculateTotalLogged = useCallback(() => {
      let total = 0;
      tasks.forEach((t) => {
        if (t.actualStartTime) {
          const start = new Date(t.actualStartTime).getTime();
          const end = t.actualEndTime
            ? new Date(t.actualEndTime).getTime()
            : t.pausedAt
              ? new Date(t.pausedAt).getTime()
              : Date.now();
          const paused = t.totalPausedMs || 0;
          total += Math.max(0, end - start - paused);
        }
      });
      return total;
    }, [tasks]);

    useEffect(() => {
      setLiveMs(calculateTotalLogged());
      if (hasInProgress || hasInReview) {
        const interval = setInterval(() => {
          setLiveMs(calculateTotalLogged());
        }, 1000);
        return () => clearInterval(interval);
      }
    }, [tasks, hasInProgress, hasInReview, calculateTotalLogged]);

    if (!liveMs || liveMs <= 0) {
      return (
        <span className="text-slate-400 dark:text-slate-500 font-bold">—</span>
      );
    }

    const formatLoggedDuration = (ms) => {
      if (!ms || ms <= 0) return "0m";
      const totalSecs = Math.floor(ms / 1000);
      const h = Math.floor(totalSecs / 3600);
      const m = Math.floor((totalSecs % 3600) / 60);
      const s = totalSecs % 60;
      if (h > 0) return `${h}h ${m}m ${s}s`;
      return `${m}m ${s}s`;
    };

    let badgeStyle =
      "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300";
    let pulseDot = null;

    if (hasInProgress) {
      badgeStyle =
        "bg-blue-50/90 text-blue-700 border-blue-300 dark:bg-blue-900/40 dark:border-blue-700/60 dark:text-blue-400 shadow-sm";
      pulseDot = (
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shrink-0 mr-1.5 inline-block" />
      );
    } else if (hasInReview) {
      badgeStyle =
        "bg-yellow-400/90 text-yellow-950 border-yellow-500 dark:bg-yellow-500/30 dark:border-yellow-600/60 dark:text-yellow-300 shadow-sm font-black";
      pulseDot = (
        <span className="w-1.5 h-1.5 rounded-full bg-yellow-600 dark:bg-yellow-400 animate-pulse shrink-0 mr-1.5 inline-block" />
      );
    }

    return (
      <div
        className={`inline-flex items-center justify-center px-2 py-1 rounded-full border font-bold text-[10px] tracking-wide ${badgeStyle}`}
      >
        {pulseDot}
        {formatLoggedDuration(liveMs)}
      </div>
    );
  },
);
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../../context/ThemeContext";
import {
  useGetTasksQuery,
  useUpdateTaskMutation,
} from "../../../features/api/apiSlice";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import { getDesignerEodReports } from "../../../features/eodReports/designerEodReportSlice";
import {
  format,
  isToday,
  isPast,
  parseISO,
  differenceInDays,
  isYesterday,
  isTomorrow,
  isAfter,
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

const getDaysRemaining = (dueDateStr) => {
  if (!dueDateStr) return null;
  const dueDate = new Date(dueDateStr);
  dueDate.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffTime = dueDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const GraphicDesignerDashboard = ({ targetDept = "Graphic Designer" }) => {
  const dispatch = useDispatch();
  const { theme } = useTheme();
  const performanceTableRef = useRef(null);
  const navigate = useNavigate();

  const handleMetricClick = (status) => {
    let mappedFilter = "Today";
    if (isToday(selectedDate)) mappedFilter = "Today";
    else if (isYesterday(selectedDate)) mappedFilter = "Yesterday";
    else mappedFilter = format(selectedDate, "yyyy-MM-dd");

    localStorage.setItem("task_date_filter", mappedFilter);
    navigate(`/${user?.role || "team"}/tasks?status=${status}`);
  };
  const isDarkMode =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  const { user } = useSelector((state) => state.auth);
  const { users } = useSelector((state) => state.users);
  const { projects } = useSelector((state) => state.projects);
  const { clients } = useSelector((state) => state.clients);
  const { designerEodReports = [] } = useSelector(
    (state) => state.designerEodReports || {},
  );
  const { data: allTasks = [], isLoading } = useGetTasksQuery();

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
  const [bottleneckClient, setBottleneckClient] = useState("All Clients");
  const [bottleneckCreator, setBottleneckCreator] = useState("All Creators");
  const [bottleneckAssignee, setBottleneckAssignee] = useState("All Assignees");
  const [bottleneckStatus, setBottleneckStatus] = useState("All Statuses");
  const [updateTask] = useUpdateTaskMutation();

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
        if (deptLower.includes("videographer") || deptLower.includes("video")) {
          return uDept.includes("video") || uDept.includes("edit");
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
          let includeTask = true;
          const taskCreatedDate = task.createdAt
            ? parseISO(task.createdAt)
            : null;
          const taskDueDate = task.dueDate ? parseISO(task.dueDate) : null;
          const dateToCheck = taskDueDate || taskCreatedDate;

          if (!dateToCheck) {
            includeTask = false;
          } else {
            includeTask = isSameDay(dateToCheck, selectedDate);
          }

          // Also include tasks that are active (not completed) so they don't disappear if they were due yesterday
          const status = task.status?.toLowerCase() || "";
          const isActive =
            status !== "completed" && !status.includes("approve");

          if (includeTask || isActive) {
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

      const isCompleted =
        task.status?.toLowerCase() === "completed" ||
        task.status?.toLowerCase().includes("approve");

      // 1. If it's not completed, show it if the selectedDate is on or after its start date (or created date if no start date)
      if (!isCompleted) {
        const startCheckDate = taskStartDate || taskCreatedDate;
        if (startCheckDate) {
          const isStarted =
            isSameDay(startCheckDate, selectedDate) || isPast(startCheckDate);
          if (isStarted) {
            return true;
          }
        }
      }

      // 2. Completed tasks: ONLY show them on the day they were actually completed
      if (isCompleted) {
        const completedDate = task.completedAt
          ? parseISO(task.completedAt)
          : task.updatedAt
            ? parseISO(task.updatedAt)
            : null;
        return completedDate ? isSameDay(completedDate, selectedDate) : false;
      }

      return false;
    });
  }, [allTasks, designerIds, selectedDate, user]);

  // 3. Compute Metrics
  const metrics = useMemo(() => {
    let completed = 0;
    let pending = 0;
    let inProgress = 0;
    let onHold = 0;
    let inReview = 0;
    let overdue = 0;
    let rejected = 0;
    let corrections = 0;
    let totalRevisions = 0;

    designerTasks.forEach((task) => {
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
        isPast(parseISO(task.dueDate)) &&
        status !== "completed"
      ) {
        overdue++;
      }
    });

    return {
      designersWorking: designers.length,
      tasksAssigned: designerTasks.length,
      completed,
      pending,
      inProgress,
      onHold,
      inReview,
      corrections,
      overdue,
      rejected,
      totalRevisions,
    };
  }, [designerTasks, designers.length]);

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

    designerTasks.forEach((task) => {
      if (task.blockerHistory && Array.isArray(task.blockerHistory)) {
        task.blockerHistory.forEach((b) => processBlocker(b.blockerType));
      }
      if (task.isBlocked) {
        processBlocker(task.blockerType);
      }
    });

    return { total: totalBlockers, counts };
  }, [designerTasks]);

  // 4. Board Data
  const boardColumns = [
    "Overall Overdue",
    "Pending",
    "In Progress",
    "On Hold",
    "IN REVIEW",
    "Completed",
  ];
  const getColumnForTask = (task) => {
    const status = task.status || "Pending";

    if (boardColumns.includes(status)) return status;
    if (status.toLowerCase().includes("progress")) return "In Progress";
    if (status.toLowerCase().includes("hold")) return "On Hold";
    if (status.toLowerCase().includes("review")) return "IN REVIEW";
    if (status.toLowerCase().includes("revision")) return "IN REVIEW";
    if (status.toLowerCase().includes("reject")) return "Rejected";
    if (status.toLowerCase().includes("approve")) return "Completed";
    if (status.toLowerCase() === "completed") return "Completed";
    if (status.toLowerCase() === "assigned") return "Pending";
    return "Pending";
  };

  const tasksByColumn = useMemo(() => {
    const cols = {};
    boardColumns.forEach((c) => (cols[c] = []));
    designerTasks.forEach((task) => {
      const col = getColumnForTask(task);
      if (cols[col]) cols[col].push(task);

      // Mirror incomplete tasks that are due today, tomorrow, or in the past in the Overall Overdue column
      const isCompleted =
        task.status?.toLowerCase() === "completed" ||
        task.status?.toLowerCase().includes("approve");
      if (!isCompleted && task.dueDate) {
        const daysRemaining = getDaysRemaining(task.dueDate);
        if (daysRemaining !== null && daysRemaining <= 1) {
          cols["Overall Overdue"].push(task);
        }
      }
    });
    return cols;
  }, [designerTasks]);

  // 5. Team Performance
  const teamPerformance = useMemo(() => {
    return designers.map((designer) => {
      const myTasks = designerTasks.filter((t) => {
        if (!t.assignedTo) return false;
        const aId =
          typeof t.assignedTo === "object" ? t.assignedTo._id : t.assignedTo;
        return aId === designer._id;
      });

      let comp = 0;
      let pend = 0;
      let prog = 0;
      let hold = 0;
      let rev = 0;
      let over = 0;
      let totalRevisions = 0;
      let totalLoggedMs = 0;
      let totalBusinessLoggedMs = 0;
      let totalOffworkingLoggedMs = 0;
      let inProgressLoggedMs = 0;
      let totalBlockerMs = 0;
      let totalApprovalMs = 0;
      let approvalCount = 0;
      const blockerTypesSet = new Set();

      myTasks.forEach((t) => {
        const s = t.status?.toLowerCase() || "";
        const isCompleted = s === "completed" || s.includes("approve");

        if (isCompleted) comp++;
        else if (s.includes("hold")) hold++;
        else if (s.includes("progress")) prog++;
        else if (s.includes("review") || s.includes("revision")) rev++;
        else if (s === "pending") pend++;
        else pend++; // default fallback

        if (t.dueDate && isPast(parseISO(t.dueDate)) && !isCompleted) over++;

        totalRevisions += t.revisions || 0;

        if (t.actualStartTime) {
          const start = new Date(t.actualStartTime).getTime();
          // For completed tasks: use actualEndTime
          // For paused tasks (In Review / On Hold): use pausedAt (timer was frozen there)
          // For active tasks: use now
          const end = t.actualEndTime
            ? new Date(t.actualEndTime).getTime()
            : t.pausedAt
              ? new Date(t.pausedAt).getTime()
              : Date.now();
          const paused = t.totalPausedMs || 0;
          const taskLoggedMs = Math.max(0, end - start - paused);
          totalLoggedMs += taskLoggedMs;

          const bizMs = calculateBusinessMs(
            start,
            end,
            officeHours.startHour,
            officeHours.endHour,
          );
          const totalElapsed = end - start;
          const ratio = totalElapsed > 0 ? bizMs / totalElapsed : 0;
          const bizLogged = taskLoggedMs * ratio;
          const offLogged = taskLoggedMs - bizLogged;

          totalBusinessLoggedMs += bizLogged;
          totalOffworkingLoggedMs += offLogged;

          // Include ALL tasks that have been started — the formula already
          // subtracts review/hold time via totalPausedMs, so this is pure
          // "in-progress" worked time regardless of current status.
          inProgressLoggedMs += taskLoggedMs;
        }

        // Collect blockers and compute blocker time
        if (t.blockerHistory && Array.isArray(t.blockerHistory)) {
          t.blockerHistory.forEach((item) => {
            if (item.blockerType) {
              blockerTypesSet.add(item.blockerType);
            }
            if (item.pausedAt && item.resumedAt) {
              const p = new Date(item.pausedAt).getTime();
              const r = new Date(item.resumedAt).getTime();
              if (r >= p) {
                totalBlockerMs += r - p;
              }
            } else if (item.totalPauseMinutes) {
              totalBlockerMs += item.totalPauseMinutes * 60 * 1000;
            }
          });
        }

        if (t.isBlocked) {
          if (t.blockerType) {
            blockerTypesSet.add(t.blockerType);
          }
          if (t.blockerPausedAt) {
            const pauseStart = new Date(t.blockerPausedAt).getTime();
            const currentPause = Date.now() - pauseStart;
            if (currentPause > 0) {
              totalBlockerMs += currentPause;
            }
          }
        }
      });

      // Compute approval time using actual review and completion fields
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
        myTasks.length > 0 ? totalRevisions / myTasks.length : 0;
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
          if (isToday(reportUpdatedAt)) {
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
        assigned: myTasks.length,
        completed: comp,
        pending: pend,
        inProgress: prog,
        onHold: hold,
        inReview: rev,
        inReviewTasks: myTasks.filter((t) => {
          const s = t.status?.toLowerCase() || "";
          return s.includes("review") || s.includes("revision");
        }),
        overdue: over,
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
        blockerTimeMs: totalBlockerMs,
        lastSubmitted: lastSubmittedStr,
        tasks: myTasks,
      };
    });
  }, [designers, designerTasks, designerEodReports, selectedDate]);

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
      if (s === "completed") cp[clientId].completed++;
      else {
        cp[clientId].pending++;
        if (s.includes("revision")) cp[clientId].revision++;
        if (task.dueDate) {
          if (isToday(parseISO(task.dueDate))) cp[clientId].dueToday++;
          if (isPast(parseISO(task.dueDate))) cp[clientId].delayed++;
        }
      }
    });

    return Object.values(cp).map((c) => {
      const cl = clients?.find((cl) => cl._id === c.id);
      return { ...c, name: cl?.name || cl?.companyName || "Unknown Client" };
    });
  }, [designerTasks, projects, clients]);

  // 7. Delayed Projects/Tasks (Raw active bottlenecks)
  const rawBottleneckTasks = useMemo(() => {
    return designerTasks
      .filter((t) => {
        const s = t.status?.toLowerCase() || "";
        const isActive = s !== "completed" && !s.includes("approve");
        return isActive;
      })
      .map((t) => {
        const s = t.status?.toLowerCase() || "";
        let diff = t.dueDate
          ? differenceInDays(new Date(), parseISO(t.dueDate))
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

  const filteredModalTasks = useMemo(() => {
    const filtered = designerTasksList.filter((task) => {
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
  }, [designerTasksList, taskTab, taskSearch, projects]);

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
    designerTasksList.forEach((task) => {
      counts.all++;
      const cat = getTaskCategory(task.status);
      if (counts[cat] !== undefined) {
        counts[cat]++;
      }
    });
    return counts;
  }, [designerTasksList]);

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
    const days = getDaysRemaining(dueDateStr);
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
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        key={task._id}
        className="bg-white dark:bg-slate-800/80 p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-400 transition-all shadow-2xs hover:shadow-sm relative group backdrop-blur-sm"
      >
        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-indigo-500 to-purple-500 rounded-l-xl opacity-100" />
        {/* Title row: icon + name */}
        <div className="flex items-start justify-between gap-1 pl-1 mb-1.5">
          <div className="flex items-start gap-1 min-w-0">
            <FiFileText
              size={11}
              className="text-indigo-400 dark:text-indigo-400 shrink-0 mt-0.5"
            />
            <p className="text-[8.5px] font-extrabold text-slate-700 dark:text-white leading-tight break-words" title={task.title}>
              {task.title}
            </p>
          </div>
        </div>
        {/* Due Date & Deadline Badge */}
        {task.dueDate && (
          <div className="pl-1 mb-1.5 flex items-center justify-between gap-1">
            <span
              className={`shrink-0 flex items-center gap-1 text-[7.5px] font-black uppercase tracking-wider whitespace-nowrap px-1 py-0.5 rounded ${(() => {
                const days = getDaysRemaining(task.dueDate);
                const isCompleted =
                  task.status?.toLowerCase() === "completed" ||
                  task.status?.toLowerCase().includes("approve");
                if (isCompleted)
                  return "text-emerald-600 dark:text-emerald-450 bg-emerald-50 dark:bg-emerald-500/10";
                if (days < 0)
                  return "text-rose-605 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 border border-rose-200/50 dark:border-rose-900/30";
                if (days === 0)
                  return "text-amber-605 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-200/50 dark:border-amber-900/30";
                if (days === 1)
                  return "text-blue-605 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border border-blue-200/50 dark:border-blue-900/30";
                return "text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50";
              })()}`}
            >
              <FiClock size={8} />
              <span>{format(parseISO(task.dueDate), "MMM dd")}</span>
              <span className="opacity-40 font-normal">|</span>
              <span className="truncate max-w-[55px]">{getDeadlineBadgeText(task.dueDate, task.status)}</span>
            </span>
          </div>
        )}
        {/* Project and Priority Info */}
        <div className="flex items-center justify-between gap-1 pl-1 mb-1">
          <span className="text-[8px] font-semibold text-slate-400 dark:text-slate-500 truncate max-w-[65%]" title={clientName}>
            {clientName}
          </span>
          {task.priority && (
            <span
              className={`px-1 py-0.2 rounded text-[7.5px] font-black uppercase tracking-wider shrink-0 ${getPriorityStyle(task.priority)}`}
            >
              {task.priority}
            </span>
          )}
        </div>
        {/* Assigned User */}
        {(assignedUser || assignedByName) && (
          <div className="mt-1 pl-1 pt-1 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-1">
            {/* Assigned To — left */}
            {assignedUser ? (
              <div className="flex items-center gap-1 min-w-0" title={`Assigned to: ${assignedUser.name}`}>
                {profileImg ? (
                  <img
                    src={profileImg}
                    alt={assignedUser.name}
                    className="w-4 h-4 rounded-full object-cover ring-1 ring-indigo-400/40 shrink-0"
                  />
                ) : (
                  <div className="w-4 h-4 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-[7.5px] font-black ring-1 ring-indigo-400/30 shrink-0">
                    {initials}
                  </div>
                )}
                <span className="text-[8.5px] font-semibold text-slate-600 dark:text-slate-400 truncate">
                  {assignedUser.name}
                </span>
              </div>
            ) : (
              <div />
            )}
            {/* Assigned By — right */}
            {assignedByName && (
              <div className="flex items-center gap-1 shrink-0" title={`Assigned by: ${assignedByName}`}>
                <div className="w-4 h-4 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 flex items-center justify-center text-[7.5px] font-black ring-1 ring-amber-400/30 shrink-0">
                  {creatorInitials || "SM"}
                </div>
                <span className="text-[8.5px] font-semibold text-slate-500 dark:text-slate-400 truncate max-w-[45px]">
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

  return (
    <div className="bg-white dark:bg-[#0b1120] py-4 md:py-4 px-0 md:px-0 space-y-8 font-sans  overflow-visible transition-colors duration-300 relative">
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
          <span className="text-[11px] font-extrabold text-slate-650 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/50 px-3.5 py-2.5 rounded-xl shadow-sm tracking-wide">
            {getRelativeDateLabel(selectedDate)}
          </span>

          {/* Date Picker Button */}
          <label className="relative flex items-center gap-2 px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-250 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 shadow-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all font-bold text-xs">
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
          <div className="flex items-center border border-slate-250 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-800 shadow-sm">
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-2 relative z-10">
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
            label: `${getRelativeDateLabel(selectedDate)} Assigned`,
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
            label: `${getRelativeDateLabel(selectedDate)} Pending`,
            value: metrics.pending,
            icon: FiClock,
            glow: "hover:shadow-[0_4px_20px_rgba(245,158,11,0.15)]",
            bg: "bg-slate-300 dark:bg-slate-300 border border-amber-200/50 dark:border-amber-900/30",
            labelColor: "text-white dark:text-white",
            valueColor: "text-slate-100 dark:text-white",
            iconBg:
              "bg-white dark:bg-amber-950/60 border border-amber-200 dark:border-amber-500/20",
            iconColor: "text-black dark:text-amber-400",
            onClick: () => handleMetricClick("Pending"),
          },
          {
            label: `${getRelativeDateLabel(selectedDate)} In Progress`,
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
            label: `${getRelativeDateLabel(selectedDate)} On Hold`,
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
            label: `${getRelativeDateLabel(selectedDate)} In Review`,
            value: metrics.inReview,
            icon: FiEye,
            glow: "hover:shadow-[0_4px_20px_rgba(99,102,241,0.15)]",
            bg: "bg-yellow-400 dark:from-indigo-850 dark:to-indigo-950 border border-indigo-200/50 dark:border-indigo-900/30",
            labelColor: "text-white dark:text-white",
            valueColor: "text-slate-100 dark:text-white",
            iconBg:
              "bg-indigo-100 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-500/20",
            iconColor: "text-indigo-600 dark:text-indigo-400",
            onClick: () => handleMetricClick("IN-REVIEW"),
          },
          {
            label: `${getRelativeDateLabel(selectedDate)} Correction`,
            value: metrics.corrections,
            icon: FiEdit3,
            glow: "hover:shadow-[0_4px_20px_rgba(245,158,11,0.15)]",
            bg: "bg-gradient-to-br from-amber-500 to-amber-600 dark:from-amber-700 dark:to-amber-800 border border-amber-200/50 dark:border-amber-900/30",
            labelColor: "text-white dark:text-white",
            valueColor: "text-slate-100 dark:text-white",
            iconBg:
              "bg-amber-100 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-500/20",
            iconColor: "text-amber-600 dark:text-amber-400",
            onClick: () => handleMetricClick("Correction"),
          },
          {
            label: `${getRelativeDateLabel(selectedDate)} Completed`,
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
            label: `${getRelativeDateLabel(selectedDate)} Overdue`,
            value: metrics.overdue,
            icon: FiAlertCircle,
            glow: "hover:shadow-[0_4px_20px_rgba(244,63,94,0.15)]",
            bg: "bg-gradient-to-br from-rose-400 to-rose-400 dark:from-rose-600 dark:to-rose-800 border border-rose-200/50 dark:border-rose-900/30",
            labelColor: "text-white dark:text-white",
            valueColor: "text-slate-100 dark:text-white",
            iconBg:
              "bg-rose-100 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-500/20",
            iconColor: "text-rose-600 dark:text-rose-400",
            onClick: () => handleMetricClick("Overdue"),
          },
          {
            label: `${getRelativeDateLabel(selectedDate)} Rejected`,
            value: metrics.rejected,
            icon: FiXCircle,
            glow: "hover:shadow-[0_4px_20px_rgba(239,68,68,0.15)]",
            bg: "bg-gradient-to-br from-red-500 to-red-600 dark:from-red-650 dark:to-red-800 border border-red-200/50 dark:border-red-900/30",
            labelColor: "text-white dark:text-white",
            valueColor: "text-slate-100 dark:text-white",
            iconBg:
              "bg-red-100 dark:bg-red-950/60 border border-red-200 dark:border-red-500/20",
            iconColor: "text-red-650 dark:text-red-400",
            onClick: () => handleMetricClick("Rejected"),
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
                  className={`p-2.5 rounded-xl ${m.iconBg} group-hover:scale-110 transition-transform duration-300`}
                >
                  <IconComponent size={18} className={m.iconColor} />
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
      {/* Today's Interruptions */}
      <div ref={performanceTableRef} className="mb-8 relative z-10">
        <div className="sidebar-bg p-5 rounded-3xl backdrop-blur-md shadow-lg">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex-shrink-0 min-w-[150px] border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-700 pb-4 md:pb-0 md:pr-6">
              <h3 className="text-xs font-black tracking-widest text-slate-500 dark:text-slate-400 mb-2 uppercase flex items-center gap-2">
                <FiAlertCircle className="text-orange-500" size={14} />
                Interruptions
              </h3>
              <span className="text-4xl font-black text-slate-800 dark:text-white block leading-none">
                {interruptions.total}
              </span>
              <span className="text-[10px] font-bold text-slate-500 uppercase mt-1.5 block">
                Total Blockers Today
              </span>
            </div>

            <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/50 hover:border-blue-400 transition-colors group">
                <span className="text-2xl font-black text-blue-600 dark:text-blue-400 block group-hover:scale-105 transition-transform origin-left">
                  {interruptions.counts["Client Calls"]}
                </span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1 block">
                  Client Calls
                </span>
              </div>
              <div className="bg-white dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/50 hover:border-rose-400 transition-colors group">
                <span className="text-2xl font-black text-rose-600 dark:text-rose-400 block group-hover:scale-105 transition-transform origin-left">
                  {interruptions.counts["Urgent Tasks"]}
                </span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1 block">
                  Urgent Tasks
                </span>
              </div>
              <div className="bg-white dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/50 hover:border-purple-400 transition-colors group">
                <span className="text-2xl font-black text-purple-600 dark:text-purple-400 block group-hover:scale-105 transition-transform origin-left">
                  {interruptions.counts["Revisions"]}
                </span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1 block">
                  Revisions
                </span>
              </div>
              <div className="bg-white dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/50 hover:border-emerald-400 transition-colors group">
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 block group-hover:scale-105 transition-transform origin-left">
                  {interruptions.counts["Meetings"]}
                </span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1 block">
                  Meetings
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Live Task Board */}
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4 px-1">
          <h3 className="text-md font-bold text-slate-800 dark:text-white tracking-wide ">
            Live Task Board
          </h3>
          <span className="flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            LIVE SYNC
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2 pb-4 w-full">
          {boardColumns.map((col, i) => {
            let colBg = "bg-slate-50 dark:bg-slate-800/80";
            let boardBg = "bg-slate-50/50 dark:bg-[#0f172a]";
            let colBorder = "border-slate-200 dark:border-slate-700";
            let textCol = "text-slate-800 dark:text-white";
            let countBg = "bg-slate-200 dark:bg-slate-700";
            let countText = "text-slate-700 dark:text-slate-300";

            const lowerCol = col.toLowerCase();
            const isOverdueCol = lowerCol === "overall overdue";

            if (isOverdueCol) {
              colBg = "bg-red-500 dark:bg-red-650";
              boardBg = "bg-red-50/10 dark:bg-[#0f172a]";
              textCol = "text-white dark:text-white";
              colBorder = "border-red-200 dark:border-red-800/50";
              countBg = "bg-red-100 dark:bg-red-900/40";
              countText = "text-red-800 dark:text-red-300";
            } else if (lowerCol === "pending") {
              colBg = "bg-slate-300 dark:bg-slate-300";
              boardBg = "bg-slate-50/50 dark:bg-[#0f172a]";
              textCol = "text-white dark:text-slate-900";
              colBorder = "border-slate-300 dark:border-slate-600";
              countBg = "bg-slate-200 dark:bg-slate-700";
              countText = "text-slate-800 dark:text-slate-100";
            } else if (lowerCol === "in progress") {
              colBg = "bg-blue-500 dark:bg-blue-500";
              boardBg = "bg-blue-50/30 dark:bg-[#0f172a]";
              textCol = "text-white dark:text-white";
              colBorder = "border-blue-200 dark:border-blue-800/50";
              countBg = "bg-blue-100 dark:bg-blue-800/50";
              countText = "text-blue-800 dark:text-blue-300";
            } else if (lowerCol === "on hold") {
              colBg = "bg-[#da1cf1] dark:bg-[#da1cf1]";
              boardBg = "bg-amber-50/30 dark:bg-[#0f172a]";
              textCol = "text-white dark:text-white";
              colBorder = "border-amber-200 dark:border-amber-800/50";
              countBg = "bg-amber-100 dark:bg-amber-800/50";
              countText = "text-amber-800 dark:text-amber-300";
            } else if (lowerCol === "in review") {
              colBg = "bg-yellow-300 dark:bg-yellow-300";
              boardBg = "bg-indigo-50/30 dark:bg-[#0f172a]";
              textCol = "text-white dark:text-white";
              colBorder = "border-indigo-200 dark:border-indigo-800/50";
              countBg = "bg-indigo-100 dark:bg-indigo-800/50";
              countText = "text-indigo-800 dark:text-indigo-300";
            } else if (lowerCol === "completed") {
              colBg = "bg-green-500 dark:bg-green-500";
              boardBg = "bg-emerald-50/30 dark:bg-[#0f172a]";
              textCol = "text-white dark:text-white";
              colBorder = "border-emerald-200 dark:border-emerald-800/50";
              countBg = "bg-emerald-100 dark:bg-emerald-800/50";
              countText = "text-emerald-800 dark:text-emerald-300";
            } else if (lowerCol === "rejected") {
              colBg = "bg-rose-500 dark:bg-rose-500";
              boardBg = "bg-rose-50/30 dark:bg-[#0f172a]";
              textCol = "text-white dark:text-white";
              colBorder = "border-rose-200 dark:border-rose-800/50";
              countBg = "bg-rose-100 dark:bg-rose-800/50";
              countText = "text-rose-800 dark:text-rose-300";
            }

            const columnTasks = tasksByColumn[col] || [];

            // Split overdue tasks into previous, today, and tomorrow
            const previousOverdue = isOverdueCol
              ? columnTasks.filter((t) => {
                  const days = getDaysRemaining(t.dueDate);
                  return days !== null && days < 0;
                })
              : [];
            const todayOverdue = isOverdueCol
              ? columnTasks.filter((t) => {
                  const days = getDaysRemaining(t.dueDate);
                  return days !== null && days === 0;
                })
              : [];
            const tomorrowOverdue = isOverdueCol
              ? columnTasks.filter((t) => {
                  const days = getDaysRemaining(t.dueDate);
                  return days !== null && days === 1;
                })
              : [];

            return (
              <div
                key={i}
                className={`w-full min-w-0 ${boardBg} backdrop-blur-md rounded-xl border ${colBorder} flex flex-col max-h-[580px] shadow-sm overflow-hidden`}
              >
                <div
                  className={`p-2 px-2.5 border-b flex items-center justify-between rounded-t-xl backdrop-blur-md ${colBg} ${colBorder}`}
                >
                  <span
                    className={`text-[9px] xl:text-[9.5px] font-black tracking-wider uppercase truncate max-w-[75%] ${textCol}`}
                    title={col}
                  >
                    {col}
                  </span>
                  <span
                    className={`text-[9px] font-black px-1.5 py-0.5 rounded shrink-0 ${countBg} ${countText}`}
                  >
                    {columnTasks.length}
                  </span>
                </div>
                <div className="p-1.5 overflow-y-auto space-y-2 flex-1 custom-scrollbar">
                  {isOverdueCol ? (
                    <div className="space-y-3">
                      {/* Previous Overdue */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between px-1.5 py-0.5 bg-red-100/40 dark:bg-red-950/20 border border-red-200/30 dark:border-red-900/30 rounded-md">
                          <span className="text-[8px] font-extrabold uppercase text-red-600 dark:text-red-400 tracking-wider truncate">
                            Prev Overdue
                          </span>
                          <span className="text-[8px] font-black text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/50 px-1 py-0.2 rounded shrink-0">
                            {previousOverdue.length}
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          <AnimatePresence>
                            {previousOverdue.length > 0 ? (
                              previousOverdue.map((task) =>
                                renderTaskCard(task),
                              )
                            ) : (
                              <p className="text-[9px] text-slate-400 dark:text-slate-500 italic text-center py-1">
                                No previous overdue
                              </p>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>

                      {/* Today Overdue */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between px-1.5 py-0.5 bg-amber-100/40 dark:bg-amber-950/20 border border-amber-200/30 dark:border-amber-900/30 rounded-md">
                          <span className="text-[8px] font-extrabold uppercase text-amber-600 dark:text-amber-400 tracking-wider truncate">
                            Due Today
                          </span>
                          <span className="text-[8px] font-black text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/50 px-1 py-0.2 rounded shrink-0">
                            {todayOverdue.length}
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          <AnimatePresence>
                            {todayOverdue.length > 0 ? (
                              todayOverdue.map((task) => renderTaskCard(task))
                            ) : (
                              <p className="text-[9px] text-slate-400 dark:text-slate-500 italic text-center py-1">
                                No tasks due today
                              </p>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>

                      {/* Tomorrow Overdue */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between px-1.5 py-0.5 bg-orange-100/40 dark:bg-orange-950/20 border border-orange-200/30 dark:border-orange-900/30 rounded-md">
                          <span className="text-[8px] font-extrabold uppercase text-orange-600 dark:text-orange-400 tracking-wider truncate">
                            Due Tomorrow
                          </span>
                          <span className="text-[8px] font-black text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-900/50 px-1 py-0.2 rounded shrink-0">
                            {tomorrowOverdue.length}
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          <AnimatePresence>
                            {tomorrowOverdue.length > 0 ? (
                              tomorrowOverdue.map((task) =>
                                renderTaskCard(task),
                              )
                            ) : (
                              <p className="text-[9px] text-slate-400 dark:text-slate-500 italic text-center py-1">
                                No tasks due tomorrow
                              </p>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <AnimatePresence>
                      {columnTasks.map((task) => renderTaskCard(task))}
                    </AnimatePresence>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="relative z-10 scroll-mt-6" ref={performanceTableRef}>
        {/* Team Performance */}
        <div className="sidebar-bg dark:sidebar-bg backdrop-blur-xl rounded-2xl  overflow-hidden shadow-sm dark:shadow-2xl">
          <div className="p-4 border-b  bg-slate-50 dark:bg-transparent flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white tracking-widest ">
              {targetDept} Performance
            </h3>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40">
                <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  Office:
                </span>
                <span className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300">
                  {(() => {
                    const s = officeHours.startHour;
                    const e = officeHours.endHour;
                    const fmt = (h) => {
                      const ampm = h >= 12 ? "PM" : "AM";
                      const val = h % 12 === 0 ? 12 : h % 12;
                      return `${String(val).padStart(2, "0")}:00 ${ampm}`;
                    };
                    return `${fmt(s)} – ${fmt(e)}`;
                  })()}
                </span>
              </div>
              <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-300 uppercase tracking-wider">
                {format(selectedDate, "MMM dd, yyyy")}
              </span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/60">
                  <th className="py-1.5 px-2 border-r border-b border-slate-200 dark:border-slate-700 text-[9px] font-black tracking-wider text-slate-500 dark:text-slate-400 uppercase">
                    {targetDept}
                  </th>
                  <th className="py-1.5 px-2 border-r border-b border-slate-200 dark:border-slate-700 text-[9px] font-black tracking-wider uppercase bg-slate-500 text-white dark:bg-slate-700 dark:text-slate-500">
                    Assigned
                  </th>
                  <th className="py-1.5 px-2 border-r border-b border-slate-200 dark:border-slate-700 text-[9px] font-black tracking-wider uppercase bg-red-500 text-white dark:bg-red-650 dark:text-slate-500">
                    Pending
                  </th>
                  <th className="py-1.5 px-2 border-r border-b border-slate-200 dark:border-slate-700 text-[9px] font-black tracking-wider uppercase bg-violet-500 text-white dark:bg-violet-600 dark:text-slate-500">
                    In Progress
                  </th>
                  <th className="py-1.5 px-2 border-r border-b border-slate-200 dark:border-slate-700 text-[9px] font-black tracking-wider uppercase bg-fuchsia-500 text-white dark:bg-fuchsia-600 dark:text-slate-500">
                    On Hold
                  </th>
                  <th className="py-1.5 px-2 border-r border-b border-slate-200 dark:border-slate-700 text-[9px] font-black tracking-wider uppercase bg-yellow-400 text-slate-950 dark:bg-yellow-500 dark:text-slate-950">
                    In Review
                  </th>
                  <th className="py-1.5 px-2 border-r border-b border-slate-200 dark:border-slate-700 text-[9px] font-black tracking-wider uppercase bg-emerald-500 text-white dark:bg-emerald-600 dark:text-slate-500">
                    Completed
                  </th>
                  <th className="py-1.5 px-2 border-r border-b border-slate-200 dark:border-slate-700 text-[9px] font-black tracking-wider text-slate-500 dark:text-slate-400 uppercase">
                    Revisions
                  </th>
                  <th className="py-1.5 px-2 border-r border-b border-slate-200 dark:border-slate-700 text-[9px] font-black tracking-wider text-slate-500 dark:text-slate-400 uppercase">
                    Blockers
                  </th>
                  <th className="py-1.5 px-2 border-r border-b border-slate-200 dark:border-slate-700 text-[9px] font-black tracking-wider text-slate-500 dark:text-slate-400 uppercase">
                    Blocker Time
                  </th>
                  <th className="py-1.5 px-2 border-r border-b border-slate-200 dark:border-slate-700 text-[9px] font-black tracking-wider text-slate-500 dark:text-slate-400 uppercase">
                    Productivity
                  </th>

                  <th className="py-1.5 px-2 border-r border-b border-slate-200 dark:border-slate-700 text-[9px] font-black tracking-wider text-slate-500 dark:text-slate-400 uppercase">
                    Delay
                  </th>
                  <th className="py-1.5 px-2 border-r border-b border-slate-200 dark:border-slate-700 text-[9px] font-black tracking-wider text-slate-500 dark:text-slate-400 uppercase">
                    Last Submitted
                  </th>
                  <th className="py-1.5 px-2 border-b border-slate-200 dark:border-slate-700 text-[9px] font-black tracking-wider text-slate-500 dark:text-slate-400 uppercase">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/80 text-xs">
                {teamPerformance.map((tp, idx) => (
                  <tr
                    key={tp.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-1.5 px-2 border-r border-b border-slate-100 dark:border-slate-700/60 text-[11px] font-medium text-slate-750 dark:text-slate-200">
                      <div className="flex items-center gap-2">
                        {tp.profileImage ? (
                          <img
                            src={tp.profileImage}
                            alt={tp.name}
                            className="w-5.5 h-5.5 rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-700 shadow-2xs"
                          />
                        ) : (
                          <div className="w-5.5 h-5.5 rounded-full bg-blue-600 dark:bg-blue-500 text-white text-[9px] font-bold flex items-center justify-center shrink-0 shadow-2xs">
                            {tp.name ? tp.name.charAt(0).toUpperCase() : "U"}
                          </div>
                        )}
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[130px]">
                          {tp.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-1.5 px-2 border-r border-b border-slate-100 dark:border-slate-700/60 text-[11px] font-medium text-slate-700 dark:text-slate-200">
                      {tp.assigned}
                    </td>
                    <td className="py-1.5 px-2 border-r border-b border-slate-100 dark:border-slate-700/60 text-[11px] font-bold bg-red-500 text-red-850 dark:bg-red-700 dark:text-red-400">
                      {tp.pending}
                    </td>
                    <td className="py-1.5 px-2 border-r border-b border-slate-100 dark:border-slate-700/60 text-[11px] font-bold bg-purple-500 text-violet-850 dark:bg-purple-700 dark:text-violet-400">
                      {tp.inProgress}
                    </td>
                    <td className="py-1.5 px-2 border-r border-b border-slate-100 dark:border-slate-700/60 text-[11px] font-bold bg-fuchsia-500 text-fuchsia-850 dark:bg-fuchsia-700 dark:text-fuchsia-400">
                      {tp.onHold}
                    </td>
                    <td
                      className={`py-1.5 px-2 border-r border-b text-[11px] font-bold transition-all ${
                        tp.inReview > 0
                          ? "bg-yellow-400/90 text-yellow-950 dark:bg-yellow-500/40 dark:text-yellow-200 animate-pulse ring-2 ring-yellow-500 dark:ring-yellow-400 border-2 border-yellow-600 dark:border-yellow-300 shadow-sm"
                          : "bg-yellow-500 text-yellow-850 dark:bg-yellow-700 dark:text-yellow-450 border-slate-100 dark:border-slate-700/60"
                      }`}
                    >
                      {tp.inReview}
                    </td>
                    <td className="py-1.5 px-2 border-r border-b border-slate-100 dark:border-slate-700/60 text-[11px] font-bold bg-emerald-500 text-emerald-850 dark:bg-emerald-700 dark:text-emerald-400">
                      {tp.completed}
                    </td>
                    <td className="py-1.5 px-2 border-r border-b border-slate-100 dark:border-slate-700/60 text-[11px] text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-extrabold border ${
                          tp.avgRevisions === 0
                            ? "bg-slate-50 text-slate-400 border-slate-200 dark:bg-slate-800/40 dark:text-slate-500 dark:border-slate-700/50"
                            : tp.avgRevisions <= 1.5
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/40"
                              : tp.avgRevisions <= 3.0
                                ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/40"
                                : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800/40"
                        }`}
                      >
                        {tp.avgRevisions.toFixed(1)} rev
                      </span>
                    </td>
                    <td className="py-1.5 px-2 border-r border-b border-slate-100 dark:border-slate-700/60 text-[11px] text-slate-600 dark:text-slate-200">
                      {tp.blockers === "none" ? (
                        <span className="text-slate-400 dark:text-slate-500 font-bold italic text-[9px]">
                          none
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1 max-w-[150px]">
                          {tp.blockers.split(", ").map((b, idx) => (
                            <span
                              key={idx}
                              className="px-1 py-0.5 text-[8px] font-bold rounded bg-orange-50 dark:bg-orange-500/10 text-orange-650 dark:text-orange-400 border border-orange-200 dark:border-orange-500/20"
                            >
                              {b}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="py-1.5 px-2 border-r border-b border-slate-100 dark:border-slate-700/60 text-[11px] font-medium text-slate-600 dark:text-slate-350">
                      {tp.blockerTimeMs > 0 ? (
                        <span className="text-orange-600 dark:text-orange-400">
                          {(() => {
                            const totalMinutes = Math.floor(
                              tp.blockerTimeMs / (1000 * 60),
                            );
                            const h = Math.floor(totalMinutes / 60);
                            const m = totalMinutes % 60;
                            return h > 0 ? `${h}h ${m}m` : `${m}m`;
                          })()}
                        </span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 font-medium">
                          0m
                        </span>
                      )}
                    </td>
                    <td className="py-1.5 px-2 border-r border-b border-slate-100 dark:border-slate-700/60 text-[11px] text-center">
                      <LiveProductivityCell
                        tasks={tp.tasks}
                        initialLoggedMs={tp.inProgressLoggedMs}
                      />
                    </td>

                    <td className="py-1.5 px-2 border-r border-b border-slate-100 dark:border-slate-700/60 text-[11px] font-medium">
                      {tp.overdue > 0 ? (
                        <div className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-bold">
                          <span className="w-1 h-1 rounded-full bg-rose-500 animate-pulse" />
                          <span className="text-[10px]">
                            {tp.overdue} overdue
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 font-medium text-[10px]">
                          0
                        </span>
                      )}
                    </td>
                    <td className="py-1.5 px-2 border-r border-b border-slate-100 dark:border-slate-700/60 text-[10px] font-bold">
                      {tp.lastSubmitted === "Not submitted" ? (
                        <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500 font-semibold">
                          <span className="w-1 h-1 rounded-full bg-slate-350 dark:bg-slate-700" />
                          <span>Not submitted</span>
                        </div>
                      ) : tp.lastSubmitted === "Draft" ? (
                        <div className="flex items-center gap-1 text-amber-500 dark:text-amber-400 font-bold">
                          <span className="w-1 h-1 rounded-full bg-amber-500 animate-pulse" />
                          <span>Draft</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                          <span className="w-1 h-1 rounded-full bg-emerald-500" />
                          <span>{tp.lastSubmitted}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-1.5 px-2 border-b border-slate-100 dark:border-slate-700/60 text-[10px] font-bold text-center">
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
                        className="p-1 rounded bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 text-indigo-650 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/50 transition-all cursor-pointer flex items-center justify-center mx-auto"
                        title="View Performance Tasks"
                      >
                        <FiEye size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>{" "}
      {/* Delayed Projects & Bottlenecks */}
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
      {/* View Tasks Modal */}
      {viewTasksModal.open &&
        createPortal(
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() =>
                setViewTasksModal({
                  open: false,
                  designerId: null,
                  designerName: "",
                })
              }
            />
            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative z-10 bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-6xl h-[85vh] overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-3">
                  {activeDesigner?.profileImage ? (
                    <img
                      src={activeDesigner.profileImage}
                      alt={activeDesigner.name}
                      className="w-9 h-9 rounded-full object-cover border border-indigo-500/20"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-black">
                      {getInitials(activeDesigner?.name)}
                    </div>
                  )}
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-slate-800 dark:text-white tracking-wide">
                      {activeDesigner?.name}'s Performance Details
                    </h3>
                    <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-650 dark:text-slate-350 font-black text-[9px] border border-slate-200 dark:border-slate-750">
                        Today: {format(new Date(), "dd MMM yyyy")}
                      </span>
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-red-50/70 dark:bg-red-950/20 text-red-655 dark:text-red-400 font-black text-[9px] border border-red-150 dark:border-red-900/20">
                        Today Assigned: {activeDesigner?.assigned || 0}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center flex-wrap gap-2.5 sm:gap-3 ml-12 sm:ml-0">
                  {/* status filter venum */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9.5px] font-black text-slate-400 dark:text-slate-555 uppercase tracking-widest">
                      Filter:
                    </span>
                    <select
                      value={taskTab}
                      onChange={(e) => setTaskTab(e.target.value)}
                      className="px-2 py-1 text-[11px] font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-lg text-slate-705 dark:text-white placeholder-slate-450 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all shadow-sm cursor-pointer"
                    >
                      <option value="all">All</option>
                      <option value="pending">Pending</option>
                      <option value="inprogress">In Progress</option>
                      <option value="onhold">On Hold</option>
                      <option value="inreview">In Review</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>

                  {/* overdue details */}
                  <span
                    className={`px-1.5 py-0.5 text-[10px] font-black uppercase rounded-lg border ${
                      (activeDesigner?.overdue || 0) > 0
                        ? "bg-red-50 text-red-655 border-red-200 dark:bg-red-950/30 dark:text-red-450 dark:border-red-900/30 animate-pulse shadow-sm"
                        : "bg-rose-50 text-rose-700 border-rose-250 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-900/30"
                    }`}
                  >
                    Overdue: {activeDesigner?.overdue || 0}
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
                    className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-350 transition-all cursor-pointer shrink-0"
                  >
                    <FiX size={16} />
                  </button>
                </div>
              </div>

              {/* Modal Body Container */}
              <div className="flex-1 flex flex-col overflow-hidden min-h-0">
                {/* Top Side: Card Metrics list in grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 p-6 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/30 dark:bg-slate-900/10 shrink-0 select-none">
                  {[
                    {
                      id: "all",
                      label: "Assigned",
                      count: modalTabCounts.all,
                      colorClass: "text-blue-600 dark:text-blue-400",
                      dotBg: "bg-blue-500",
                      activeClass:
                        "ring-2 ring-blue-500 bg-blue-500 text-white border-transparent",
                    },
                    {
                      id: "pending",
                      label: "Pending",
                      count: modalTabCounts.pending,
                      colorClass: "text-rose-650 dark:text-rose-400",
                      dotBg: "bg-rose-500",
                      activeClass:
                        "ring-2 ring-rose-500 bg-rose-500 text-white border-transparent",
                    },
                    {
                      id: "inprogress",
                      label: "In Progress",
                      count: modalTabCounts.inprogress,
                      colorClass: "text-violet-650 dark:text-violet-400",
                      dotBg: "bg-violet-500",
                      activeClass:
                        "ring-2 ring-violet-500 bg-violet-500 text-white border-transparent",
                    },
                    {
                      id: "onhold",
                      label: "On Hold",
                      count: modalTabCounts.onhold,
                      colorClass: "text-fuchsia-650 dark:text-fuchsia-400",
                      dotBg: "bg-fuchsia-500",
                      activeClass:
                        "ring-2 ring-fuchsia-500 bg-fuchsia-500 text-white border-transparent",
                    },
                    {
                      id: "inreview",
                      label: "In Review",
                      count: modalTabCounts.inreview,
                      colorClass: "text-amber-600 dark:text-amber-400",
                      dotBg: "bg-amber-500",
                      activeClass:
                        "ring-2 ring-amber-500 bg-amber-500 text-white border-transparent",
                    },
                    {
                      id: "completed",
                      label: "Completed",
                      count: modalTabCounts.completed,
                      colorClass: "text-emerald-650 dark:text-emerald-400",
                      dotBg: "bg-emerald-500",
                      activeClass:
                        "ring-2 ring-emerald-500 bg-emerald-500 text-white border-transparent",
                    },
                  ].map((card) => {
                    const isActive = taskTab === card.id;
                    return (
                      <button
                        key={card.id}
                        type="button"
                        onClick={() => setTaskTab(card.id)}
                        className={`p-4 rounded-xl border text-left transition-all hover:scale-[1.03] flex flex-col justify-between h-24 relative overflow-hidden shadow-sm duration-200 cursor-pointer ${
                          isActive
                            ? card.activeClass
                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span
                            className={`text-[10px] font-black uppercase tracking-widest ${isActive ? "text-white/85" : "text-slate-400 dark:text-slate-500"}`}
                          >
                            {card.label}
                          </span>
                          <span
                            className={`w-2 h-2 rounded-full ${isActive ? "bg-white" : card.dotBg}`}
                          />
                        </div>
                        <div className="mt-2 flex items-baseline gap-1">
                          <span
                            className={`text-2xl font-black ${isActive ? "text-white" : "text-slate-800 dark:text-white"}`}
                          >
                            {card.count}
                          </span>
                          <span
                            className={`text-[9px] font-bold ${isActive ? "text-white/77" : "text-slate-400"}`}
                          >
                            tasks
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Bottom Side: Task details table */}
                <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-[#0f172a] p-6 overflow-hidden">
                  {/* Table Content */}
                  <div
                    className="flex-1 overflow-y-auto min-h-0 scroll-smooth custom-scrollbar"
                    style={{
                      scrollBehavior: "smooth",
                      WebkitOverflowScrolling: "touch",
                    }}
                  >
                    {filteredModalTasks.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-500 bg-slate-50/50 dark:bg-slate-900/10 rounded-2xl border border-dashed border-slate-200 dark:border-slate-850">
                        <FiLayers
                          size={36}
                          className="mb-3 opacity-40 text-slate-400"
                        />
                        <p className="text-sm font-black uppercase tracking-widest text-slate-500">
                          No tasks found
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-550 mt-1 font-semibold">
                          Try modifying your search or status filter
                        </p>
                      </div>
                    ) : (
                      <div className="border border-slate-200 dark:border-slate-850 rounded-2xl overflow-x-auto shadow-sm bg-white dark:bg-slate-900/20 custom-scrollbar">
                        <table className="w-full text-left border-collapse min-w-[1050px]">
                          <thead>
                            <tr className="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-850">
                              <th className="py-3 px-4 text-[11px] font-black tracking-widest text-slate-500 dark:text-slate-455 uppercase">
                                Task Title
                              </th>
                              <th className="py-3 px-4 text-[11px] font-black tracking-widest text-slate-500 dark:text-slate-455 uppercase">
                                Client
                              </th>
                              <th className="py-3 px-4 text-[11px] font-black tracking-widest text-slate-500 dark:text-slate-455 uppercase">
                                Created By
                              </th>
                              <th className="py-3 px-4 text-[11px] font-black tracking-widest text-slate-500 dark:text-slate-455 uppercase">
                                Priority
                              </th>
                              <th className="py-3 px-4 text-[11px] font-black tracking-widest text-slate-500 dark:text-slate-455 uppercase">
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
                              <th className="py-3 px-4 text-[11px] font-black tracking-widest text-slate-500 dark:text-slate-455 uppercase">
                                Status
                              </th>
                              <th className="py-3 px-4 text-[11px] font-black tracking-widest text-slate-500 dark:text-slate-455 uppercase text-center">
                                Approval Timeline
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-150 dark:divide-slate-850">
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
                                const p = projects?.find((x) => x._id === pId);
                                if (p) {
                                  const cId =
                                    typeof p.client === "object"
                                      ? p.client?._id
                                      : p.client;
                                  const c = clients?.find((x) => x._id === cId);
                                  clientName =
                                    c?.companyName ||
                                    c?.name ||
                                    (typeof p.client === "object"
                                      ? p.client?.companyName || p.client?.name
                                      : "Unknown Client");
                                }
                              }

                              const getStatusBadgeStyle = (status = "") => {
                                const s = status.toLowerCase();
                                if (
                                  s === "completed" ||
                                  s.includes("approve")
                                ) {
                                  return "bg-emerald-50 text-emerald-650 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-455 dark:border-emerald-900/30";
                                }
                                if (s.includes("hold")) {
                                  return "bg-fuchsia-50 text-fuchsia-655 border border-fuchsia-200 dark:bg-fuchsia-950/30 dark:text-fuchsia-450 dark:border-fuchsia-900/30";
                                }
                                if (s.includes("progress")) {
                                  return "bg-sky-50 text-sky-655 border border-sky-205 dark:bg-sky-950/30 dark:text-sky-400 dark:border-sky-900/30";
                                }
                                if (
                                  s.includes("review") ||
                                  s.includes("revision")
                                ) {
                                  return "bg-amber-50 text-amber-655 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/30";
                                }
                                if (s === "assigned") {
                                  return "bg-blue-50 text-blue-655 border border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/30";
                                }
                                return "bg-rose-50 text-rose-655 border border-rose-200 dark:bg-rose-950/30 dark:text-rose-455 dark:border-rose-900/30";
                              };

                              return (
                                <tr
                                  key={task._id}
                                  className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-all duration-155 border-b border-slate-100 dark:border-slate-850 last:border-b-0"
                                >
                                  <td className="py-2 px-3 text-xs font-black text-slate-850 dark:text-slate-100 max-w-xs break-words">
                                    <span className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                                      {task.title}
                                    </span>
                                  </td>
                                  <td className="py-2 px-3">
                                    <span
                                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-bold shadow-sm ${(() => {
                                        const colors = [
                                          "bg-indigo-50 text-indigo-750 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-900/30",
                                          "bg-emerald-50 text-emerald-750 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/30",
                                          "bg-blue-50 text-blue-750 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/30",
                                          "bg-purple-50 text-purple-755 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-900/30",
                                          "bg-amber-50 text-amber-755 border-amber-250 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/30",
                                          "bg-rose-50 text-rose-755 border-rose-200 dark:bg-rose-950/30 dark:text-rose-450 dark:border-rose-900/30",
                                          "bg-sky-50 text-sky-755 border-sky-200 dark:bg-sky-950/30 dark:text-sky-400 dark:border-sky-900/30",
                                          "bg-teal-50 text-teal-755 border-teal-200 dark:bg-teal-950/30 dark:text-teal-400 dark:border-teal-900/30",
                                        ];
                                        let hash = 0;
                                        for (
                                          let i = 0;
                                          i < clientName.length;
                                          i++
                                        ) {
                                          hash =
                                            clientName.charCodeAt(i) +
                                            ((hash << 5) - hash);
                                        }
                                        const index =
                                          Math.abs(hash) % colors.length;
                                        return colors[index];
                                      })()}`}
                                    >
                                      <FiBriefcase
                                        size={9}
                                        className="opacity-80"
                                      />
                                      {clientName}
                                    </span>
                                  </td>
                                  <td className="py-2 px-3">
                                    {(() => {
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
                                        (typeof creatorObj?.profile
                                          ?.profileImage === "object"
                                          ? creatorObj?.profile?.profileImage
                                              ?.url
                                          : creatorObj?.profile
                                              ?.profileImage) ||
                                        (typeof creatorObj?.profileImage ===
                                        "object"
                                          ? creatorObj?.profileImage?.url
                                          : creatorObj?.profileImage) ||
                                        creatorObj?.profilePic ||
                                        creatorObj?.avatar ||
                                        creatorObj?.profile?.profilePic ||
                                        creatorObj?.profile?.avatar ||
                                        null;

                                      return (
                                        <div className="flex items-center gap-1.5">
                                          {creatorImage ? (
                                            <img
                                              src={creatorImage}
                                              alt={creatorName}
                                              className="w-4.5 h-4.5 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700 shrink-0"
                                            />
                                          ) : (
                                            <div className="w-4.5 h-4.5 rounded-full bg-slate-205 dark:bg-slate-750 text-slate-750 dark:text-slate-300 flex items-center justify-center text-[7.5px] font-black ring-1 ring-slate-300 shrink-0">
                                              {getInitials(creatorName)}
                                            </div>
                                          )}
                                          <span className="text-[10px] font-bold text-slate-700 dark:text-slate-350">
                                            {creatorName}
                                          </span>
                                        </div>
                                      );
                                    })()}
                                  </td>
                                  <td className="py-2 px-3">
                                    {task.priority && (
                                      <span
                                        className={`px-1.5 py-0.5 rounded-md text-[8.5px] font-black uppercase tracking-wider shadow-sm ${getPriorityStyle(task.priority)}`}
                                      >
                                        {task.priority}
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2 px-3 text-xs text-slate-500 dark:text-slate-400">
                                    {(() => {
                                      let targetDate = null;
                                      if (taskTab === "assigned")
                                        targetDate = task.createdAt;
                                      else if (taskTab === "pending")
                                        targetDate = task.createdAt;
                                      else if (taskTab === "inprogress")
                                        targetDate =
                                          task.actualStartTime ||
                                          task.updatedAt;
                                      else if (taskTab === "onhold")
                                        targetDate =
                                          task.pausedAt ||
                                          task.blockerPausedAt ||
                                          task.updatedAt;
                                      else if (taskTab === "inreview")
                                        targetDate =
                                          task.actualEndTime || task.updatedAt;
                                      else if (taskTab === "completed")
                                        targetDate =
                                          task.approvedAt ||
                                          task.actualEndTime ||
                                          task.updatedAt;
                                      else
                                        targetDate =
                                          task.dueDate || task.createdAt;

                                      if (!targetDate)
                                        return (
                                          <span className="text-slate-400 font-medium italic text-[11px]">
                                            -
                                          </span>
                                        );
                                      try {
                                        const dateObj = parseISO(targetDate);
                                        const taskStatus = (
                                          task.status || ""
                                        ).toLowerCase();

                                        if (
                                          taskStatus === "completed" ||
                                          taskStatus.includes("approve")
                                        ) {
                                          return (
                                            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50/90 dark:bg-emerald-950/40 text-emerald-650 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/30 shadow-sm transition-all hover:scale-[1.02]">
                                              <FiCheckCircle
                                                size={10}
                                                className="shrink-0 text-emerald-500 animate-pulse"
                                              />
                                              <span className="tracking-wide text-[9px]">
                                                Done
                                              </span>
                                              <span className="w-[1px] h-2.5 bg-emerald-300 dark:bg-emerald-800" />
                                              <span className="text-[9px] font-semibold opacity-90">
                                                {format(
                                                  dateObj,
                                                  "MMM dd, h:mm a",
                                                )}
                                              </span>
                                            </div>
                                          );
                                        }

                                        if (
                                          taskStatus.includes("review") ||
                                          taskStatus.includes("revision")
                                        ) {
                                          return (
                                            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-50/90 dark:bg-amber-950/40 text-amber-650 dark:text-amber-400 border border-amber-200 dark:border-amber-900/30 shadow-sm transition-all hover:scale-[1.02]">
                                              <FiClock
                                                size={10}
                                                className="shrink-0 text-amber-505 animate-spin"
                                                style={{
                                                  animationDuration: "4s",
                                                }}
                                              />
                                              <span className="tracking-wide text-[9px]">
                                                In Review
                                              </span>
                                              <span className="w-[1px] h-2.5 bg-amber-300 dark:bg-amber-800" />
                                              <span className="text-[9px] font-semibold opacity-90">
                                                {format(
                                                  dateObj,
                                                  "MMM dd, h:mm a",
                                                )}
                                              </span>
                                            </div>
                                          );
                                        }

                                        const isDueToday = isToday(dateObj);
                                        if (isDueToday) {
                                          return (
                                            <div className="relative w-fit">
                                              <style>{`
                                                @keyframes brightBlink {
                                                  0%, 100% {
                                                    opacity: 1;
                                                    filter: drop-shadow(0 0 8px rgba(239, 68, 68, 0.9));
                                                    transform: scale(1.02);
                                                  }
                                                  50% {
                                                    opacity: 0.4;
                                                    filter: drop-shadow(0 0 1px rgba(239, 68, 68, 0.1));
                                                    transform: scale(0.98);
                                                  }
                                                }
                                                .bright-warning-blink {
                                                  animation: brightBlink 1s infinite ease-in-out;
                                                }
                                              `}</style>
                                              <div className="relative p-[1px] overflow-hidden rounded-lg bg-gradient-to-r from-red-500 via-rose-500 to-red-500 flex items-center justify-center w-fit shadow-sm bright-warning-blink">
                                                <div
                                                  className="absolute inset-0 bg-gradient-to-r from-red-500 via-rose-500 to-red-500 animate-spin"
                                                  style={{
                                                    animationDuration: "2s",
                                                  }}
                                                />
                                                <div className="relative bg-red-500 px-1.5 py-0.5 rounded-[7px] flex items-center gap-1 z-10 text-white font-extrabold text-[9px] tracking-wide border-transparent">
                                                  <FiClock
                                                    size={9}
                                                    className="text-white animate-bounce"
                                                  />
                                                  <span>
                                                    Today -{" "}
                                                    {format(
                                                      dateObj,
                                                      "MMM dd, h:mm a",
                                                    )}
                                                  </span>
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        }

                                        const getRelativeBadge = () => {
                                          if (isYesterday(dateObj)) {
                                            return (
                                              <span className="px-1 py-0.5 text-[8.5px] font-black uppercase bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 rounded-md border border-rose-200 dark:border-rose-900/30">
                                                Yesterday
                                              </span>
                                            );
                                          }
                                          if (isTomorrow(dateObj)) {
                                            return (
                                              <span className="px-1 py-0.5 text-[8.5px] font-black uppercase bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 rounded-md border border-sky-200 dark:border-sky-900/30">
                                                Tomorrow
                                              </span>
                                            );
                                          }
                                          return null;
                                        };

                                        return (
                                          <span className="flex items-center gap-1 flex-wrap text-[10.5px]">
                                            <span className="flex items-center gap-1">
                                              <FiClock
                                                size={10}
                                                className="text-slate-400"
                                              />
                                              {format(
                                                dateObj,
                                                "MMM dd, h:mm a",
                                              )}
                                            </span>
                                            {getRelativeBadge()}
                                          </span>
                                        );
                                      } catch (err) {
                                        return (
                                          <span className="text-slate-400 font-medium italic text-xs">
                                            -
                                          </span>
                                        );
                                      }
                                    })()}
                                  </td>
                                  <td className="py-2 px-3">
                                    <span
                                      className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-sm ${getStatusBadgeStyle(task.status)}`}
                                    >
                                      {task.status || "Pending"}
                                    </span>
                                  </td>
                                  <td className="py-2 px-3 text-center">
                                    {(() => {
                                      const effectiveReviewStart =
                                        task.reviewStartedAt ||
                                        task.lastReviewStartedAt ||
                                        (task.reviewCycles && task.reviewCycles.length > 0
                                          ? task.reviewCycles[task.reviewCycles.length - 1]?.startedAt
                                          : null);

                                      if (
                                        !effectiveReviewStart &&
                                        !task.completedAt &&
                                        !task.approvedAt
                                      ) {
                                        return (
                                          <span className="text-slate-400 dark:text-slate-600 font-bold">
                                            —
                                          </span>
                                        );
                                      }

                                      const totalWaitMs =
                                        task.approvalWaitingMs ||
                                        (effectiveReviewStart &&
                                        task.completedAt
                                          ? calculateBusinessMs(
                                              effectiveReviewStart,
                                              task.completedAt,
                                            )
                                          : 0);

                                      let tookText = "";
                                      if (totalWaitMs > 0) {
                                        const totalSecs = Math.floor(
                                          totalWaitMs / 1000,
                                        );
                                        const h = Math.floor(totalSecs / 3600);
                                        const m = Math.floor(
                                          (totalSecs % 3600) / 60,
                                        );
                                        const s = totalSecs % 60;
                                        tookText =
                                          h > 0
                                            ? `Took ${h}h ${m}m ${s}s`
                                            : `Took ${m}m ${s}s`;
                                      }

                                      const formatApprovalDate = (dateStr) => {
                                        if (!dateStr) return null;
                                        try {
                                          const d = parseISO(dateStr);
                                          return {
                                            dayMonth: format(d, "dd MMM"),
                                            time: format(d, "hh:mm a"),
                                            relative:
                                              formatDistanceToNow(d) + " ago",
                                          };
                                        } catch (e) {
                                          return null;
                                        }
                                      };

                                      const startInfo = formatApprovalDate(
                                        effectiveReviewStart,
                                      );
                                      const endInfo = formatApprovalDate(
                                        task.completedAt,
                                      );

                                      return (
                                        <div className="flex flex-col items-center gap-1 py-0.5 select-none text-[11px] text-center w-full">
                                          {/* Duration Badge */}
                                          {tookText ? (
                                            <span className="inline-flex items-center gap-1 text-[9.5px] font-black px-2.5 py-0.5 bg-violet-100 dark:bg-violet-950/40 text-violet-750 dark:text-violet-450 border border-violet-200 dark:border-violet-800/30 rounded-full shadow-inner">
                                              <span className="w-1 h-1 rounded-full bg-violet-500 animate-pulse" />
                                              {tookText}
                                            </span>
                                          ) : (
                                            <span className="text-[10px] text-slate-400 font-bold">
                                              —
                                            </span>
                                          )}

                                          {/* Times Flow */}
                                          <div className="flex items-center justify-center gap-1.5 text-[10.5px] font-extrabold mt-0.5">
                                            <div className="flex flex-col items-center">
                                              <span className="text-[8px] font-black text-blue-500 dark:text-blue-400 uppercase tracking-widest leading-none mb-0.5">
                                                Start
                                              </span>
                                              <span className="text-slate-800 dark:text-slate-100 leading-tight">
                                                {startInfo
                                                  ? `${startInfo.dayMonth}, ${startInfo.time}`
                                                  : "—"}
                                              </span>
                                            </div>

                                            <span className="text-slate-300 dark:text-slate-700 font-normal mt-2">
                                              →
                                            </span>

                                            <div className="flex flex-col items-center">
                                              <span className="text-[8px] font-black text-emerald-500 dark:text-emerald-450 uppercase tracking-widest leading-none mb-0.5">
                                                End
                                              </span>
                                              <span className="text-slate-850 dark:text-slate-100 leading-tight">
                                                {endInfo
                                                  ? startInfo?.dayMonth ===
                                                    endInfo.dayMonth
                                                    ? endInfo.time
                                                    : `${endInfo.dayMonth}, ${endInfo.time}`
                                                  : "—"}
                                              </span>
                                            </div>
                                          </div>

                                          {/* Relatives */}
                                          {endInfo?.relative && (
                                            <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 mt-0.5">
                                              Approved {endInfo.relative}
                                            </span>
                                          )}
                                        </div>
                                      );
                                    })()}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-end shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    setViewTasksModal({
                      open: false,
                      designerId: null,
                      designerName: "",
                    })
                  }
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-xs font-black text-slate-650 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
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

              <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
                <motion.div
                  initial={{ x: "100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "100%" }}
                  transition={{ type: "spring", damping: 25, stiffness: 200 }}
                  className="w-screen max-w-5xl bg-white dark:bg-[#0f111a] border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden"
                >
                  {/* Header */}
                  <div className="p-5 px-6 border-b border-slate-150 dark:border-slate-800 flex justify-between items-center bg-slate-50/80 dark:bg-[#0c121e] shrink-0">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          setApprovalModal({
                            open: false,
                            designerName: "",
                            tasks: [],
                          })
                        }
                        className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer mr-1 shadow-sm"
                        title="Close panel"
                      >
                        <FiArrowRight size={18} />
                      </button>
                      <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-450 shadow-sm shrink-0">
                        <FiClock size={18} />
                      </div>
                      <div>
                        <h2 className="text-base font-black text-slate-800 dark:text-white tracking-wider">
                          Approval Info
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-bold tracking-wide mt-0.5">
                          Detailed review and completion timestamps for{" "}
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
                      className="w-8 h-8 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-655 dark:hover:text-white transition-colors cursor-pointer"
                    >
                      <FiXCircle size={20} className="text-slate-450" />
                    </button>
                  </div>

                  {/* Body */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {approvalModal.tasks.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                        <FiAlertCircle size={36} className="opacity-50 mb-2" />
                        <span className="text-xs font-bold uppercase tracking-wider">
                          No approval tasks found
                        </span>
                      </div>
                    ) : (
                      <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm bg-white dark:bg-slate-900/40">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50/90 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black tracking-widest text-slate-500 dark:text-slate-400 uppercase">
                              <th className="py-3 px-4 border-r border-slate-250 dark:border-slate-800">
                                Task Name
                              </th>
                              <th className="py-3 px-4 border-r border-slate-250 dark:border-slate-800">
                                Client Name
                              </th>
                              <th className="py-3 px-4 border-r border-slate-250 dark:border-slate-800">
                                Created By
                              </th>
                              <th className="py-3 px-4 border-r border-slate-250 dark:border-slate-800">
                                Assignee
                              </th>
                              <th className="py-3 px-4 border-r border-slate-250 dark:border-slate-800">
                                Start & End Date
                              </th>
                              <th className="py-3 px-4 text-center">
                                Approval Info
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-150 dark:divide-slate-800/80 text-xs">
                            {approvalModal.tasks.map((task) => {
                              const clientObj =
                                task.project?.client || task.client;
                              // Resolve clientName
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
                              const creatorName = creatorObj?.name || "Unknown";

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

                              const effectiveReviewStart =
                                task.reviewStartedAt ||
                                task.lastReviewStartedAt ||
                                (task.reviewCycles && task.reviewCycles.length > 0
                                  ? task.reviewCycles[task.reviewCycles.length - 1]?.startedAt
                                  : null);

                              const totalWaitMs =
                                task.approvalWaitingMs ||
                                (effectiveReviewStart && task.completedAt
                                  ? calculateBusinessMs(
                                      effectiveReviewStart,
                                      task.completedAt,
                                    )
                                  : 0);

                              let tookText = "";
                              if (totalWaitMs > 0) {
                                const totalSecs = Math.floor(
                                  totalWaitMs / 1000,
                                );
                                const h = Math.floor(totalSecs / 3600);
                                const m = Math.floor((totalSecs % 3600) / 60);
                                const s = totalSecs % 60;
                                tookText =
                                  h > 0
                                    ? `Took ${h}h ${m}m ${s}s`
                                    : `Took ${m}m ${s}s`;
                              }

                              const formatApprovalDate = (dateStr) => {
                                if (!dateStr) return null;
                                try {
                                  const d = parseISO(dateStr);
                                  return {
                                    dayMonth: format(d, "dd MMM"),
                                    time: format(d, "hh:mm a"),
                                    relative: formatDistanceToNow(d) + " ago",
                                  };
                                } catch (e) {
                                  return null;
                                }
                              };

                              const startInfo = formatApprovalDate(
                                effectiveReviewStart,
                              );
                              const endInfo = formatApprovalDate(
                                task.completedAt,
                              );

                              return (
                                <tr
                                  key={task._id}
                                  className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                                >
                                  <td className="py-3 px-4 border-r border-slate-200 dark:border-slate-800 font-bold text-slate-800 dark:text-white">
                                    {task.title}
                                  </td>
                                  <td className="py-3 px-4 border-r border-slate-200 dark:border-slate-800 font-semibold text-slate-600 dark:text-slate-350">
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
                                  <td className="py-3 px-4 text-center flex flex-col items-center justify-center gap-2">
                                    <div className="flex items-stretch bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm max-w-[280px]">
                                      {/* Left side: Rev Start */}
                                      <div className="flex-1 p-2 flex flex-col items-start min-w-[105px] text-left">
                                        <span className="text-[8px] font-black text-blue-500 dark:text-blue-400 uppercase tracking-wider mb-0.5">
                                          REV START
                                        </span>
                                        {startInfo ? (
                                          <>
                                            <span className="text-xs font-black text-slate-855 dark:text-white leading-tight">
                                              {startInfo.dayMonth}
                                            </span>
                                            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 leading-tight">
                                              {startInfo.time}
                                            </span>
                                            <span className="text-[9px] font-bold text-blue-500 dark:text-blue-400 leading-tight mt-0.5">
                                              {startInfo.relative}
                                            </span>
                                          </>
                                        ) : (
                                          <span className="text-xs font-bold text-slate-400 dark:text-slate-600">
                                            —
                                          </span>
                                        )}
                                      </div>

                                      {/* Divider */}
                                      <div className="w-[1px] bg-slate-200 dark:bg-slate-700 self-stretch" />

                                      {/* Right side: Completed */}
                                      <div className="flex-1 p-2 flex flex-col items-start min-w-[105px] text-left">
                                        <span className="text-[8px] font-black text-emerald-500 dark:text-emerald-450 uppercase tracking-wider mb-0.5">
                                          COMPLETED
                                        </span>
                                        {endInfo ? (
                                          <>
                                            <span className="text-xs font-black text-slate-855 dark:text-white leading-tight">
                                              {endInfo.dayMonth}
                                            </span>
                                            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 leading-tight">
                                              {endInfo.time}
                                            </span>
                                            <span className="text-[9px] font-bold text-emerald-500 dark:text-emerald-450 leading-tight mt-0.5">
                                              {endInfo.relative}
                                            </span>
                                          </>
                                        ) : (
                                          <span className="text-xs font-bold text-slate-400 dark:text-slate-600">
                                            —
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    {tookText ? (
                                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-violet-50 dark:bg-violet-500/10 text-violet-750 dark:text-violet-400 border border-violet-200 dark:border-violet-500/25">
                                        <span className="w-1.5 h-1.5 rounded-full bg-violet-500 dark:bg-violet-400" />
                                        {tookText}
                                      </div>
                                    ) : (
                                      <span className="text-[10px] text-slate-400 dark:text-slate-600 font-bold">
                                        —
                                      </span>
                                    )}
                                    <div className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-1.5">
                                      Created by:{" "}
                                      <span className="text-slate-700 dark:text-slate-350">
                                        {creatorName}
                                      </span>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="px-6 py-4 border-t border-slate-150 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-end shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        setApprovalModal({
                          open: false,
                          designerName: "",
                          tasks: [],
                        })
                      }
                      className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-xs font-black text-slate-655 dark:text-slate-250 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer shadow-sm"
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
