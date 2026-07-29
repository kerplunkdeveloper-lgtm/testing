import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  useGetTasksQuery,
  useGetProjectsQuery,
  useUpdateTaskMutation,
} from "../../features/api/apiSlice";
import { getUsers } from "../../features/users/userSlice";
import { format } from "date-fns";
import toast from "react-hot-toast";
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
      bg: "bg-indigo-50/80 text-indigo-600 border-indigo-200 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/30",
    },
    {
      bg: "bg-rose-50/80 text-rose-600 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30",
    },
    {
      bg: "bg-amber-50/80 text-amber-600 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30",
    },
    {
      bg: "bg-emerald-50/80 text-emerald-600 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30",
    },
    {
      bg: "bg-blue-50/80 text-blue-600 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30",
    },
    {
      bg: "bg-purple-50/80 text-purple-650 border-purple-200 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/30",
    },
    {
      bg: "bg-cyan-50/80 text-cyan-600 border-cyan-200 dark:bg-cyan-950/20 dark:text-cyan-400 dark:border-cyan-900/30",
    },
    {
      bg: "bg-fuchsia-50/80 text-fuchsia-600 border-fuchsia-200 dark:bg-fuchsia-950/20 dark:text-fuchsia-400 dark:border-fuchsia-900/30",
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

const formatElapsed = (
  startTime,
  endTime,
  pausedAt = null,
  totalPausedMs = 0,
) => {
  if (!startTime) return "";
  const start = new Date(startTime).getTime();
  const end = endTime
    ? new Date(endTime).getTime()
    : pausedAt
      ? new Date(pausedAt).getTime()
      : Date.now();

  const paused = totalPausedMs || 0;

  const elapsed = Math.max(0, Math.floor((end - start - paused) / 1000));
  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = elapsed % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m`;
  }
  return `${seconds}s`;
};

// Helper: map task board status to EOD status enum
const mapTaskStatusToEodStatus = (status) => {
  return status || "Pending";
};

const getStatusBadgeStyle = (status) => {
  const s = (status || "Pending").toUpperCase();
  switch (s) {
    case "COMPLETED":
      return "bg-emerald-50 text-emerald-700 border-emerald-200/50 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30";
    case "IN PROGRESS":
    case "IN_PROGRESS":
      return "bg-blue-50 text-blue-600 border-blue-200/50 dark:bg-blue-950/25 dark:text-blue-400 dark:border-blue-900/30";
    case "IN-REVIEW":
    case "IN REVIEW":
    case "IN_REVIEW":
      return "bg-purple-50 text-purple-600 border-purple-200/50 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/30";
    case "ON HOLD":
    case "ON_HOLD":
      return "bg-amber-50 text-amber-600 border-amber-200/50 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30";
    case "REJECTED":
      return "bg-rose-50 text-rose-600 border-rose-200/50 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30";
    default: // Pending
      return "bg-slate-50 text-slate-655 border border-slate-200/60 dark:bg-slate-900/10 dark:text-slate-400 dark:border-slate-800/60";
  }
};

const getStatusTextColor = (status) => {
  const s = (status || "Pending").toUpperCase();
  switch (s) {
    case "COMPLETED":
      return "text-emerald-600 dark:text-emerald-400";
    case "IN PROGRESS":
    case "IN_PROGRESS":
      return "text-blue-600 dark:text-blue-400";
    case "IN-REVIEW":
    case "IN REVIEW":
    case "IN_REVIEW":
      return "text-purple-605 dark:text-purple-400";
    case "ON HOLD":
    case "ON_HOLD":
      return "text-amber-600 dark:text-amber-400";
    case "REJECTED":
      return "text-rose-600 dark:text-rose-400";
    default: // Pending
      return "text-slate-500 dark:text-slate-400";
  }
};

const calculateTotalLoggedTime = (tasks) => {
  let totalMinutes = 0;
  (tasks || []).forEach((t) => {
    const timeStr = t.time || "";
    const hoursMatch = timeStr.match(/(\d+)\s*h/i);
    const minsMatch = timeStr.match(/(\d+)\s*m/i);
    const secsMatch = timeStr.match(/(\d+)\s*s/i);

    if (hoursMatch) {
      totalMinutes += parseInt(hoursMatch[1], 10) * 60;
    }
    if (minsMatch) {
      totalMinutes += parseInt(minsMatch[1], 10);
    }
    if (secsMatch && !hoursMatch && !minsMatch) {
      const secs = parseInt(secsMatch[1], 10);
      if (secs > 0) totalMinutes += Math.ceil(secs / 60);
    }
  });

  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;

  if (h > 0) {
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${m}m`;
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
  const [daySummary, setDaySummary] = useState({
    toolsIssues: "None",
    clientCalls: "",
    anythingElseOps: "",
  });
  const [tomorrowPlan, setTomorrowPlan] = useState("None");
  const [overallStatus, setOverallStatus] = useState("On Track");
  const [reportId, setReportId] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const getLocalDateString = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const [selectedDate, setSelectedDate] = useState(getLocalDateString());

  // Fetch users and designer EOD report
  useEffect(() => {
    dispatch(getUsers());
  }, [dispatch]);

  useEffect(() => {
    if (selectedDate) {
      dispatch(getDesignerEodReports({ date: selectedDate }));
    }
  }, [dispatch, selectedDate]);

  // Filter tasks assigned to me for the selected date
  const myTasks = React.useMemo(() => {
    return allTasks.filter((task) => {
      const assigneeId = task.assignedTo?._id || task.assignedTo;
      const isAssignedToMe = assigneeId === (user?._id || user?.id);
      if (!isAssignedToMe) return false;

      // Filter strictly by selectedDate (using dueDate instead of createdAt)
      if (!task.dueDate) return false;

      const taskDate = new Date(task.dueDate);
      const year = taskDate.getFullYear();
      const month = String(taskDate.getMonth() + 1).padStart(2, "0");
      const day = String(taskDate.getDate()).padStart(2, "0");
      const taskDateStr = `${year}-${month}-${day}`;

      return taskDateStr === selectedDate;
    });
  }, [allTasks, user, selectedDate]);

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
        const savedTasks = todayReport.tasks.map((t) => {
          const correspondingTask = myTasks.find(
            (mt) => mt._id === (t.taskId?._id || t.taskId),
          );
          const actualStatus = correspondingTask
            ? mapTaskStatusToEodStatus(correspondingTask.status)
            : t.statusAtEod || "Pending";
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
            creator && typeof creator === "object"
              ? creator._id
              : creator || "";

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
            time: t.loggedTime || "",
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

        // Merge any new tasks from myTasks that are not in the saved report tasks
        const savedTaskIds = new Set(
          todayReport.tasks.map((t) =>
            (t.taskId?._id || t.taskId || t._id).toString(),
          ),
        );
        const newUnsavedTasks = myTasks.filter(
          (mt) => !savedTaskIds.has(mt._id.toString()),
        );

        const unsavedMapped = newUnsavedTasks.map((t) => {
          const clientName = t.project?.client?.companyName || "Internal";
          const projectName = t.project?.name || "Internal";
          const elapsedStr = formatElapsed(
            t.actualStartTime,
            t.actualEndTime,
            t.pausedAt,
            t.totalPausedMs,
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
        });

        setTasksState([...savedTasks, ...unsavedMapped]);
      } else if (myTasks.length > 0) {
        setTasksState(
          myTasks.map((t) => {
            const clientName = t.project?.client?.companyName || "Internal";
            const projectName = t.project?.name || "Internal";
            const elapsedStr = formatElapsed(
              t.actualStartTime,
              t.actualEndTime,
              t.pausedAt,
              t.totalPausedMs,
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
          const elapsedStr = formatElapsed(
            t.actualStartTime,
            t.actualEndTime,
            t.pausedAt,
            t.totalPausedMs,
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
  }, [todayReport, myTasks, projects, users]);

  // Sync task status, code, and elapsed time dynamically from allTasks/myTasks
  useEffect(() => {
    if (myTasks.length > 0 && tasksState.length > 0 && projects.length > 0) {
      setTasksState((prev) =>
        prev.map((t) => {
          const correspondingTask = myTasks.find((mt) => mt._id === t.taskId);
          if (correspondingTask) {
            const mappedStatus = mapTaskStatusToEodStatus(
              correspondingTask.status,
            );
            const elapsedStr = formatElapsed(
              correspondingTask.actualStartTime,
              correspondingTask.actualEndTime,
              correspondingTask.pausedAt,
              correspondingTask.totalPausedMs,
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

            if (
              t.statusAtEod !== mappedStatus ||
              t.time !== elapsedStr ||
              t.code !== taskCode ||
              t.reviewedBy !== creatorId ||
              t.assignedByName !== creatorName ||
              t.revision !== taskRevision
            ) {
              return {
                ...t,
                statusAtEod: mappedStatus,
                time: elapsedStr,
                code: taskCode,
                reviewedBy: creatorId,
                assignedByName: creatorName,
                revision: taskRevision,
              };
            }
          }
          return t;
        }),
      );
    }
  }, [myTasks, projects, users]);

  // Automatically calculate overallStatus from tasksState
  useEffect(() => {
    if (tasksState.length > 0) {
      const hasPending = tasksState.some(
        (t) =>
          !["Completed", "In Review", "IN-REVIEW", "IN-Review"].includes(
            t.statusAtEod,
          ),
      );
      const hasInReview = tasksState.some((t) =>
        ["In Review", "IN-REVIEW", "IN-Review"].includes(t.statusAtEod),
      );
      const allCompleted = tasksState.every((t) => t.statusAtEod === "Completed");

      if (hasPending) {
        setOverallStatus("Delayed");
      } else if (hasInReview) {
        setOverallStatus("On Track");
      } else if (allCompleted) {
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

  // Dynamic stats
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
  const inReviewCount = tasksState.filter((t) =>
    ["IN-REVIEW", "In Review", "IN-Review"].includes(t.statusAtEod),
  ).length;
  const revisionCount = tasksState.filter((t) =>
    ["Revision", "Revision Pending"].includes(t.statusAtEod),
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
    <div className="min-h-screen max-w-7xl  mx-auto">
      {/* Header Card */}
      <div className="theme-bg-card  ">
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

          <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border theme-border px-4 py-2.5 rounded-xl text-slate-700 dark:text-slate-300 self-start lg:self-auto shadow-sm">
            <FiCalendar className="shrink-0 text-indigo-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-xs font-bold outline-none cursor-pointer [&::-webkit-calendar-picker-indicator]:dark:invert"
            />
          </div>
        </div>
      </div>

      {/* Task Cards Grid */}
      {tasksState.length === 0 ? (
        <div className="mt-8 theme-bg-card border border-dashed theme-border rounded-2xl p-12 text-center flex flex-col items-center justify-center">
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
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
          {tasksState.map((task) => {
            const assignerUser = users.find((u) => u._id === task.reviewedBy);
            const assignerName = assignerUser?.name || task.assignedByName || "Admin";
            const assignerDept = assignerUser?.department || "Management";
            const avatarUrl = assignerUser ? (
              (typeof assignerUser.profile?.profileImage === "object"
                ? assignerUser.profile?.profileImage?.url
                : assignerUser.profile?.profileImage) ||
              (typeof assignerUser.profileImage === "object"
                ? assignerUser.profileImage?.url
                : assignerUser.profileImage) ||
              assignerUser.profilePic ||
              assignerUser.profile?.profilePic ||
              assignerUser.profile?.avatar
            ) : "";

            return (
              <div
                key={task.id}
                className="theme-bg-card border border-slate-100 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-slate-200 dark:hover:border-slate-700/80 transition-all duration-300 text-left relative overflow-hidden"
              >
                {/* Task Top Meta info */}
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <h3 className="font-bold text-sm theme-text-primary flex items-center gap-2 flex-wrap leading-relaxed">
                      {task.code && (
                        <span
                          className={`px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold border tracking-wider select-none ${getTaskCodeStyle(task.code).bg}`}
                        >
                          [{task.code}]
                        </span>
                      )}
                      <span className="flex items-center gap-1.5 ml-0.5">
                        <FiFileText
                          className="text-slate-400 dark:text-slate-500 shrink-0"
                          size={14}
                        />
                        <span className="italic font-semibold text-slate-700 dark:text-slate-200">
                          {task.title}
                        </span>
                      </span>
                    </h3>

                    <div className="flex flex-wrap gap-2 mt-2.5 items-center">
                      <span className="bg-slate-50 text-slate-600 dark:bg-slate-900/40 dark:text-slate-400 border border-slate-200/50 dark:border-slate-800/60 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">
                        {task.client}
                      </span>
                      {task.contentType && (
                        <span className="bg-purple-50/50 text-purple-650 border border-purple-200/30 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/30 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">
                          {task.contentType}
                        </span>
                      )}
                      {task.time && (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50/50 text-blue-600 border border-blue-150/40 rounded-md text-[10px] font-bold dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30">
                          <FiClock size={10} className="shrink-0" />
                          <span>Time spent: {task.time}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
                    <span
                      className={`${getPriorityStyle(
                        task.priority,
                      )} text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider`}
                    >
                      {task.priority}
                    </span>
                    <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mt-0.5">
                      Rev. {task.revision || 0}
                    </span>
                  </div>
                </div>

                {/* Status & Assigned By Row Stack */}
                <div className="mt-5 pt-4 border-t theme-border space-y-3">
                  {/* Status Row */}
                  <div className="flex items-center justify-between text-xs px-1">
                    <span className="font-bold theme-text-secondary uppercase tracking-wider text-[10px]">status :</span>
                    <span className={`font-black tracking-wide ${getStatusTextColor(task.statusAtEod)}`}>
                      {task.statusAtEod || "Pending"}
                    </span>
                  </div>

                  {/* Assigned By Row */}
                  <div className="flex items-center justify-between text-xs px-1 mt-6">
                    <span className="font-bold theme-text-secondary uppercase tracking-wider text-[10px]">Assigned By :</span>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <span className="block font-bold theme-text-primary text-[11px] leading-tight">
                          {assignerName}
                        </span>
                        <span className="block text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-0.5">
                          {assignerDept}
                        </span>
                      </div>
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={assignerName}
                          className="w-6.5 h-6.5 rounded-full object-cover border border-slate-100 dark:border-slate-800 shadow-sm"
                        />
                      ) : (
                        <div className="w-6.5 h-6.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-[9px] border border-indigo-100 dark:border-indigo-900/30">
                          {assignerName.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Dynamic field rows depending on the status */}
                {task.statusAtEod !== "Completed" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 pt-4 border-t theme-border">
                    <div>
                      <label className="text-[10px] font-bold theme-text-secondary uppercase tracking-wider block">
                        Reason for {task.statusAtEod}
                      </label>
                      <input
                        type="text"
                        placeholder={`Why is it ${task.statusAtEod.toLowerCase()}?`}
                        className="w-full mt-1.5 bg-slate-50 border border-slate-200 dark:bg-slate-900/40 dark:border-slate-800/80 rounded-xl px-3 py-2.5 text-xs text-slate-700 dark:text-slate-200 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 dark:focus:ring-emerald-500/50 transition-all font-semibold"
                        value={task.reason || ""}
                        onChange={(e) =>
                          updateTask(task.id, "reason", e.target.value)
                        }
                        disabled={isSubmitted}
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold theme-text-secondary uppercase tracking-wider block">
                        Next Action
                      </label>
                      <input
                        type="text"
                        placeholder="What is the next plan?"
                        className="w-full mt-1.5 bg-slate-50 border border-slate-200 dark:bg-slate-900/40 dark:border-slate-800/80 rounded-xl px-3 py-2.5 text-xs text-slate-700 dark:text-slate-200 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 dark:focus:ring-emerald-500/50 transition-all font-semibold"
                        value={task.nextAction || ""}
                        onChange={(e) =>
                          updateTask(task.id, "nextAction", e.target.value)
                        }
                        disabled={isSubmitted}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* =========================================
                      DAY SUMMARY
      ========================================= */}
      {(tasksState.length > 0 || todayReport) && (
        <div className="theme-bg-card border theme-border rounded-2xl mt-8 p-6 text-left shadow-sm">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-3">
            <div>
              <h2 className="text-md font-bold theme-text-primary">
                EOD REPORT
              </h2>
            </div>
            <span className="text-[10px] font-bold text-slate-400 ">
              Submitted once, covers all tasks
            </span>
          </div>{" "}
          {/* eod card  */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mt-4 mb-5">
            {/* Completed Card */}
            <div className="bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent dark:from-emerald-500/15 dark:via-emerald-500/5 dark:to-transparent border border-emerald-500/20 dark:border-emerald-500/30 rounded-2xl p-4 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-300 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-full -mr-6 -mt-6 blur-md group-hover:bg-emerald-500/10 transition-all duration-300" />
              <span className="text-2xl font-black tracking-tight text-emerald-600 dark:text-emerald-400 block relative z-10">
                {completedCount}
              </span>
              <span className="text-[10px] font-black text-emerald-700/80 dark:text-emerald-300/80 uppercase tracking-widest mt-1.5 block relative z-10">
                Completed
              </span>
            </div>

            {/* In Progress Card */}
            <div className="bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent dark:from-blue-500/15 dark:via-blue-500/5 dark:to-transparent border border-blue-500/20 dark:border-blue-500/30 rounded-2xl p-4 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-300 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/5 rounded-full -mr-6 -mt-6 blur-md group-hover:bg-blue-500/10 transition-all duration-300" />
              <span className="text-2xl font-black tracking-tight text-blue-600 dark:text-blue-400 block relative z-10">
                {inProgressCount}
              </span>
              <span className="text-[10px] font-black text-blue-700/80 dark:text-blue-300/80 uppercase tracking-widest mt-1.5 block relative z-10">
                In Progress
              </span>
            </div>

            {/* In Review Card */}
            <div className="bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent dark:from-purple-500/15 dark:via-purple-500/5 dark:to-transparent border border-purple-500/20 dark:border-purple-500/30 rounded-2xl p-4 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-300 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/5 rounded-full -mr-6 -mt-6 blur-md group-hover:bg-purple-500/10 transition-all duration-300" />
              <span className="text-2xl font-black tracking-tight text-purple-600 dark:text-purple-400 block relative z-10">
                {inReviewCount}
              </span>
              <span className="text-[10px] font-black text-purple-700/80 dark:text-purple-300/80 uppercase tracking-widest mt-1.5 block relative z-10">
                In Review
              </span>
            </div>

            {/* On Hold Card */}
            <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent dark:from-amber-500/15 dark:via-amber-500/5 dark:to-transparent border border-amber-500/20 dark:border-amber-500/30 rounded-2xl p-4 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-300 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/5 rounded-full -mr-6 -mt-6 blur-md group-hover:bg-amber-500/10 transition-all duration-300" />
              <span className="text-2xl font-black tracking-tight text-amber-600 dark:text-amber-400 block relative z-10">
                {onHoldCount}
              </span>
              <span className="text-[10px] font-black text-amber-700/80 dark:text-amber-300/80 uppercase tracking-widest mt-1.5 block relative z-10">
                On Hold
              </span>
            </div>

            {/* Total Logged Card */}
            <div className="bg-gradient-to-br from-slate-500/10 via-slate-500/5 to-transparent dark:from-slate-500/15 dark:via-slate-500/5 dark:to-transparent border border-slate-500/20 dark:border-slate-700/30 rounded-2xl p-4 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-300 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-16 h-16 bg-slate-500/5 rounded-full -mr-6 -mt-6 blur-md group-hover:bg-slate-500/10 transition-all duration-300" />
              <span className="text-2xl font-black tracking-tight theme-text-primary block relative z-10">
                {calculateTotalLoggedTime(tasksState)}
              </span>
              <span className="text-[10px] font-black theme-text-secondary uppercase tracking-widest mt-1.5 block relative z-10">
                Today total timetaken
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
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-xs text-slate-700 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all font-semibold"
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
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-4 pr-10 text-xs text-slate-700 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all font-semibold"
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
                  <span className="text-[9px] uppercase tracking-widest text-slate-400 dark:text-slate-500 font-extrabold">Auto</span>
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
            <div>
              <label className="text-[10px] font-bold theme-text-secondary uppercase tracking-wider block">
                Anything Else Ops Should Know
              </label>
              <textarea
                rows={4}
                placeholder="Operational difficulties, approvals pending etc..."
                className="w-full mt-2 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-700 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all resize-none font-semibold"
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
              <label className="text-[10px] font-bold theme-text-secondary uppercase tracking-wider block">
                Tomorrow Plan <span className="text-rose-500">*</span>
              </label>
              <select
                className="w-full mt-2 bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-xs text-slate-700 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all font-semibold"
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
                  <div className="relative mt-2">
                    <textarea
                      rows={3}
                      placeholder="What tasks do you plan to work on tomorrow?"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 pr-10 text-xs text-slate-700 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all resize-none font-semibold"
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
          <div className="flex flex-col md:flex-row justify-between items-center gap-5 mt-8 border-t theme-border pt-6">
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
