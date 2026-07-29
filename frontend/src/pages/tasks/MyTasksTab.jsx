import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
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
} from "react-icons/fi";
import {
  useUpdateTaskMutation,
  useDeleteTaskMutation,
} from "../../features/api/apiSlice";
import axiosInstance from "../../services/axiosInstance";
import toast from "react-hot-toast";
import ClientBadge from "../../components/common/ClientBadge";
import { getClientIconComponent } from "../../utils/clientHelpers";

const TimeTracker = ({
  startTime,
  endTime,
  status,
  pausedAt,
  savedPausedMs = 0,
  isBlocked,
  blockerPausedAt,
  blockerHistory,
  fullWidth = false,
}) => {
  const [elapsed, setElapsed] = useState(0);
  const [blockedMs, setBlockedMs] = useState(0);

  useEffect(() => {
    if (!startTime) return;

    const calculateTime = () => {
      const start = new Date(startTime).getTime();
      let end;

      if (endTime) {
        end = new Date(endTime).getTime();
      } else if (
        pausedAt &&
        ["On Hold", "Rejected", "IN-REVIEW", "In Review", "IN-Review"].includes(
          status,
        )
      ) {
        end = new Date(pausedAt).getTime();
      } else {
        end = Date.now();
      }

      let totalPauseMs = 0;
      if (blockerHistory && blockerHistory.length > 0) {
        blockerHistory.forEach((item) => {
          if (item.pausedAt) {
            const p = new Date(item.pausedAt).getTime();
            const r = item.resumedAt
              ? new Date(item.resumedAt).getTime()
              : Date.now();
            if (r >= p) {
              totalPauseMs += r - p;
            }
          }
        });
      }

      if (isBlocked && blockerPausedAt) {
        const pauseStart = new Date(blockerPausedAt).getTime();
        const currentPause = Date.now() - pauseStart;
        if (currentPause > 0) {
          totalPauseMs += currentPause;
        }
      }

      const totalElapsedMs = end - start - (savedPausedMs || 0) - totalPauseMs;
      return {
        active: Math.max(0, Math.floor(totalElapsedMs / 1000)),
        blocked: Math.max(0, Math.floor(totalPauseMs / 1000)),
      };
    };

    const update = () => {
      const { active, blocked } = calculateTime();
      setElapsed(active);
      setBlockedMs(blocked);
    };

    update();

    if (status === "In Progress" && !endTime) {
      const interval = setInterval(update, 1000);
      return () => clearInterval(interval);
    }
  }, [
    startTime,
    endTime,
    pausedAt,
    status,
    isBlocked,
    blockerPausedAt,
    blockerHistory,
  ]);

  if (!startTime && status !== "In Progress") {
    return (
      <span className="text-slate-400 dark:text-slate-500 font-semibold text-xs">—</span>
    );
  }
  if (!startTime && status === "In Progress")
    return (
      <div className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[9px] font-bold tracking-wider bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-500/10 dark:text-[#3b82f6] dark:border-[#3b82f6]/30 shadow-sm">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-[#3b82f6] animate-pulse"></span>
        Starting...
      </div>
    );

  const formatTime = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h > 0 ? `${h}h ` : ""}${m}m ${s}s`;
  };

  const activeStr = formatTime(elapsed);
  const blockedStr = formatTime(blockedMs);
  const totalStr = formatTime(elapsed + blockedMs);

  return (
    <div
      className={`flex flex-col gap-1 ${fullWidth ? "w-full" : "w-[120px]"} text-[9px] font-bold tracking-wide`}
    >
      <div className="flex justify-between items-center bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/50 dark:border-emerald-500/20 px-1.5 py-0.5 rounded text-emerald-700 dark:text-emerald-400">
        <span>Active:</span>
        <span>{activeStr}</span>
      </div>
      {(blockedMs > 0 || isBlocked) && (
        <div className="flex justify-between items-center bg-orange-50 dark:bg-orange-500/10 border border-orange-200/50 dark:border-orange-500/20 px-1.5 py-0.5 rounded text-orange-700 dark:text-orange-400">
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
  const navigate = useNavigate();

  const [updateTaskTrigger] = useUpdateTaskMutation();
  const [deleteTask] = useDeleteTaskMutation();
  const [selectedTasks, setSelectedTasks] = useState([]);

  const [priorityFilter, setPriorityFilter] = useState("All");
  const [projectFilter, setProjectFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [clientFilter, setClientFilter] = useState("All");
  
  const [localDateFilter, setLocalDateFilter] = useState(() => {
    try {
      const saved = localStorage.getItem("task_date_filter");
      return saved || "All";
    } catch {
      return "All";
    }
  });

  const dateFilter = dateFilterProp !== undefined ? dateFilterProp : localDateFilter;

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
  const itemsPerPage = 10;

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
    dateFilter,
    searchTerm,
  ]);

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

      const projectObj = projects.find((p) => p._id === taskProjectId);
      const clientObj = task.project?.client?.companyName
        ? task.project.client
        : projectObj?.client || task.project?.client;
      const clientId = clientObj?._id || clientObj?.id;
      const matchesClient = clientFilter === "All" || clientId === clientFilter;

      const projectName = projectObj?.name || task.project?.name || "";
      const clientName = clientObj?.companyName || "";
      const matchesSearch =
        task.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        clientName.toLowerCase().includes(searchTerm.toLowerCase());

      let matchesDate = true;
      if (dateFilter !== "All") {
        const targetDate = task.dueDate ? new Date(task.dueDate) : null;

        if (!targetDate || isNaN(targetDate.getTime())) {
          matchesDate = false;
        } else {
          const now = new Date();
          const todayStart = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
          );
          const todayEnd = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            23,
            59,
            59,
            999,
          );

          if (dateFilter === "Today") {
            matchesDate = targetDate >= todayStart && targetDate <= todayEnd;
          } else if (dateFilter === "Yesterday") {
            const yesterdayStart = new Date(todayStart);
            yesterdayStart.setDate(yesterdayStart.getDate() - 1);
            const yesterdayEnd = new Date(todayEnd);
            yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);
            matchesDate =
              targetDate >= yesterdayStart && targetDate <= yesterdayEnd;
          } else if (dateFilter === "This Week") {
            const dayOfWeek = now.getDay();
            const startOfWeek = new Date(todayStart);
            startOfWeek.setDate(
              startOfWeek.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1)
            );
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(endOfWeek.getDate() + 6);
            endOfWeek.setHours(23, 59, 59, 999);
            matchesDate = targetDate >= startOfWeek && targetDate <= endOfWeek;
          } else if (dateFilter === "This Month") {
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
            matchesDate = targetDate >= startOfMonth && targetDate <= endOfMonth;
          }
        }
      }

      return (
        matchesPriority &&
        matchesProject &&
        matchesClient &&
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
      if (
        statusFilter === "Pending,In Progress,In Review,On Hold" ||
        statusFilter === "Pending,In Progress,In Review"
      ) {
        const s = (task.status || "Pending").toUpperCase();
        return (
          s === "PENDING" ||
          s === "IN PROGRESS" ||
          s === "IN-REVIEW" ||
          s === "IN REVIEW" ||
          s === "ON HOLD"
        );
      }
      return task.status === statusFilter;
    });
    return [...list].sort((a, b) => {
      const isCompletedA = a.status === "Completed" ? 1 : 0;
      const isCompletedB = b.status === "Completed" ? 1 : 0;
      if (isCompletedA !== isCompletedB) {
        return isCompletedA - isCompletedB; // Completed tasks go to the end (1 - 0 = 1, so B first)
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

  const handleTaskFieldChange = (taskId, fields) => {
    const sanitizedFields = { ...fields };
    if (sanitizedFields.startDate === "") sanitizedFields.startDate = null;
    if (sanitizedFields.dueDate === "") sanitizedFields.dueDate = null;
    if (sanitizedFields.status === "In Progress") {
      (tasks || []).forEach((t) => {
        if (
          t._id !== taskId &&
          (t.status === "In Progress" || t.status === "In-Progress")
        ) {
          updateTaskTrigger({ id: t._id, taskData: { status: "On Hold" } });
        }
      });
    }
    updateTaskTrigger({ id: taskId, taskData: sanitizedFields });
  };

  const handleOpenBlockerModal = (task) => {
    setBlockerModalTask(task);
    setBlockerType("Client Call");
    setBlockerDescription("");
    setBlockerExpectedTime("15 mins");
    setBlockerPriority("Normal");
  };



  const handleSubmitBlocker = () => {
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

    handleTaskFieldChange(blockerModalTask._id, fields);
    setSelectedTaskId(blockerModalTask._id);
    setBlockerModalTask(null);
    toast.success("Task paused - Blocker added");
  };

  const handleResumeTask = (task) => {
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

    handleTaskFieldChange(task._id, fields);
    toast.success("Task resumed successfully!");
  };

  const handleStatusChange = (taskId, newStatus) => {
    if (newStatus === "In Progress") {
      (tasks || []).forEach((t) => {
        if (
          t._id !== taskId &&
          (t.status === "In Progress" || t.status === "In-Progress")
        ) {
          updateTaskTrigger({ id: t._id, taskData: { status: "On Hold" } });
        }
      });
    }
    updateTaskTrigger({ id: taskId, taskData: { status: newStatus } });
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
        bg: "!bg-orange-50/90 !text-orange-700 !border-orange-200 dark:!bg-orange-950/40 dark:!text-orange-400 dark:!border-orange-900/40",
        dot: "bg-orange-500",
        icon: FiAlertCircle,
      };
    }
    switch (status) {
      case "Completed":
        return {
          bg: "!bg-emerald-50 !text-emerald-700 !border-emerald-200 dark:!bg-emerald-500/20 dark:!text-emerald-300 dark:!border-emerald-500/40",
          dot: "bg-emerald-500",
          icon: FiCheckSquare,
        };
      case "In Progress":
        return {
          bg: "!bg-blue-50 !text-blue-700 !border-blue-200 dark:!bg-blue-500/20 dark:!text-blue-300 dark:!border-blue-500/40",
          dot: "bg-blue-500",
          icon: FiClock,
        };
      case "On Hold":
        return {
          bg: "!bg-amber-50 !text-amber-700 !border-amber-200 dark:!bg-amber-500/20 dark:!text-amber-300 dark:!border-amber-500/40",
          dot: "bg-amber-500",
          icon: FiAlertCircle,
        };
      case "IN-REVIEW":
      case "In Review":
      case "IN-Review":
        return {
          bg: "!bg-sky-50 !text-sky-700 !border-sky-200 dark:!bg-sky-500/20 dark:!text-sky-355 dark:!border-sky-500/40",
          dot: "bg-sky-500",
          icon: FiClock,
        };
      case "Rejected":
        return {
          bg: "!bg-rose-50 !text-rose-700 !border-rose-200 dark:!bg-rose-500/20 dark:!text-rose-355 dark:!border-rose-500/40",
          dot: "bg-rose-500",
          icon: FiAlertCircle,
        };
      default:
        return {
          bg: "!bg-slate-50 !text-slate-600 !border-slate-200 dark:!bg-slate-500/20 dark:!text-slate-300 dark:!border-slate-500/40",
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
    const projectObj = projects.find((p) => p._id === projId);
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
    const projectsMap = {};
    activeTasksList.forEach((t) => {
      if (t.project) {
        const pId = t.project._id || t.project;
        const projObj = projects.find((p) => p._id === pId);
        const pName = projObj?.name || t.project.name || "Internal";
        projectsMap[pId] = pName;
      }
    });
    return Object.entries(projectsMap).map(([id, name]) => ({ id, name }));
  }, [activeTasksList, projects]);

  const uniqueClients = React.useMemo(() => {
    const clientsMap = {};
    activeTasksList.forEach((t) => {
      const projId = t.project?._id || t.project;
      const projectObj = projects.find((p) => p._id === projId);
      const client = t.project?.client?.companyName
        ? t.project.client
        : projectObj?.client || t.project?.client;
      if (client) {
        const cId = client._id || client.id;
        clientsMap[cId] = {
          id: cId,
          name: client.companyName || "No Company Name",
          color: client.color || "#3b82f6",
          icon: client.icon || "FaRegBuilding",
        };
      }
    });
    return Object.values(clientsMap);
  }, [activeTasksList, projects]);

  return (
    <>
      {/* UNIFIED HEADER & CONTROLS */}
      <div className="flex flex-col xl:flex-row items-center justify-between gap-4 bg-white dark:bg-[#11131e] p-2 relative z-30">
        {/* Left: Bulk Actions */}
        <div className="flex items-center w-full xl:w-auto min-h-[36px]">
          {selectedTasks.length > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                {selectedTasks.length} selected
              </span>
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-450 border border-rose-200 dark:border-rose-500/30 hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors text-xs font-bold shadow-sm"
              >
                <FiTrash2 size={12} />
                Delete
              </button>
            </div>
          )}
        </div>

        {/* Center: View Toggle */}
        <div className="flex bg-slate-50 dark:bg-black p-1 rounded-xl shrink-0 w-full xl:w-auto mx-auto justify-center">
          <button
            onClick={() => setViewType("list")}
            className={`flex items-center justify-center gap-2 px-6 py-1.5 rounded-lg text-xs font-bold transition-all ${viewType === "list" ? "bg-white dark:bg-[#11131e] text-blue-600 dark:text-[#3b82f6] shadow-sm border theme-border-accent" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
          >
            <FiList size={14} /> List
          </button>
          <button
            onClick={() => setViewType("kanban")}
            className={`flex items-center justify-center gap-2 px-6 py-1.5 rounded-lg text-xs font-bold transition-all ${viewType === "kanban" ? "bg-white dark:bg-[#11131e] text-blue-600 dark:text-[#3b82f6] shadow-sm border theme-border-accent" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
          >
            <FiGrid size={14} /> Kanban
          </button>
        </div>

        {/* Right: Filter Action */}
        <div className="flex items-center justify-end gap-2.5 w-full xl:w-auto">
          {/* Search bar */}
          <div className="relative w-full xl:w-64">
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 outline-none focus:border-blue-500 text-slate-800 dark:text-slate-200"
            />
          </div>

          {/* Date Quick Filter Pill */}
          <div className="relative" ref={dateDropdownRef}>
            <button
              type="button"
              onClick={() => setShowDateDropdown((prev) => !prev)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-2xl border text-xs font-extrabold transition-all shadow-2xs cursor-pointer ${
                dateFilter !== "All"
                  ? "bg-emerald-50/80 border-emerald-300 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-500/40 dark:text-emerald-300"
                  : "bg-white dark:bg-[#151725] border-slate-200/90 dark:border-white/10 text-slate-800 dark:text-slate-200 hover:border-emerald-500/50"
              }`}
            >
              <FiFilter className="text-emerald-500 text-sm" />
              <span>{dateFilter === "All" ? "Filter Date" : dateFilter}</span>
              <FiChevronDown
                size={13}
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

          <button
            onClick={() => setFilterPanelOpen(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
              priorityFilter !== "All" ||
              projectFilter !== "All" ||
              statusFilter !== "All" ||
              clientFilter !== "All"
                ? "bg-blue-50 dark:bg-[#3b82f6]/10 border-blue-200 dark:border-[#3b82f6]/30 text-blue-700 dark:text-[#3b82f6]"
                : "bg-white dark:bg-black border-slate-200 dark:border-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900"
            }`}
          >
            <FiFilter size={14} />
            Filter
            {(priorityFilter !== "All" ||
              projectFilter !== "All" ||
              statusFilter !== "All" ||
              clientFilter !== "All") && (
              <span className="flex items-center justify-center bg-blue-600 dark:bg-[#3b82f6] text-white dark:text-black text-[9px] w-4 h-4 rounded-full font-black">
                {
                  [
                    priorityFilter,
                    projectFilter,
                    statusFilter,
                    clientFilter,
                  ].filter((f) => f !== "All").length
                }
              </span>
            )}
          </button>
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
                        name: "Pending,In Progress,In Review,On Hold",
                        label: "Pending / In Progress / In Review / On Hold",
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
                        name: "IN-REVIEW",
                        label: "In Review",
                        color: "bg-sky-500",
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
                    {uniqueClients.map((c) => {
                      const ClientIcon = getClientIconComponent(c.icon);
                      const isSelected = clientFilter === c.id;
                      return (
                        <button
                          key={c.id}
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
                    {uniqueProjects.map((p) => (
                      <button
                        key={p.id}
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
            "IN-REVIEW",
            "On Hold",
            "Completed",
            "Rejected",
          ].map((colStatus) => {
            const colTasks = filteredTasks.filter((t) => {
              if (colStatus === "IN-REVIEW") {
                return (
                  t.status === "IN-REVIEW" ||
                  t.status === "In Review" ||
                  t.status === "IN-Review"
                );
              }
              return t.status === colStatus;
            });
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
                    colTasks.map((task) => {
                      const isCompleted = task.status === "Completed";
                      return (
                        <div
                          key={task._id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, task._id)}
                          onDragEnd={() => setDraggedTaskId(null)}
                          onClick={() => handleSelectTaskForDrawer(task._id)}
                          className={`bg-white dark:bg-[#11131e] shadow-sm hover:shadow-lg dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] rounded-2xl p-5 border border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-500/60 transition-all cursor-grab active:cursor-grabbing group flex flex-col gap-3 ${
                            draggedTaskId === task._id
                              ? "opacity-50 scale-95 border-blue-500"
                              : ""
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
                                  const projectObj = projects.find(
                                    (p) => p._id === projId,
                                  );
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
                                const projectObj = projects.find(
                                  (p) => p._id === projId,
                                );
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
            <div className="overflow-x-auto overflow-y-auto h-[calc(100vh-200px)] min-h-[500px] w-full scrollbar-thin">
              <table className="w-full min-w-[1300px] text-left border-collapse table-auto border border-slate-200/70 dark:border-transparent">
                <thead>
                  <tr className="sticky top-0 z-20 uppercase text-center bg-slate-50 dark:bg-[#11131e] text-slate-500 dark:text-slate-400 text-[10.5px] sm:text-[9px] font-black tracking-wider border-b border-slate-200/70 dark:border-transparent shadow-sm">
                    <ResizableHeader
                      id="id"
                      label="ID"
                      colWidths={colWidths}
                      handleMouseDown={handleMouseDown}
                      defaultClassName="px-3 py-2 border border-slate-200/70 dark:border-transparent w-16"
                    />
                    <ResizableHeader
                      id="priority"
                      label="Priority"
                      colWidths={colWidths}
                      handleMouseDown={handleMouseDown}
                      defaultClassName="px-3 py-2 border border-slate-200/70 dark:border-transparent w-20"
                    />
                    <ResizableHeader
                      id="taskName"
                      label="Task Name"
                      colWidths={colWidths}
                      handleMouseDown={handleMouseDown}
                      defaultClassName="px-3 py-2 border border-slate-200/70 dark:border-transparent min-w-[180px] whitespace-nowrap"
                    />
                    <ResizableHeader
                      id="contentCopy"
                      label="Content Copy"
                      colWidths={colWidths}
                      handleMouseDown={handleMouseDown}
                      defaultClassName="px-20 py-2 border border-slate-200/70 dark:border-transparent min-w-[150px] max-w-[290px] w-auto whitespace-nowrap"
                    />
                    <ResizableHeader
                      id="client"
                      label="Client"
                      colWidths={colWidths}
                      handleMouseDown={handleMouseDown}
                      defaultClassName="px-3 py-2 border border-slate-200/70 dark:border-transparent w-24"
                    />
                    <ResizableHeader
                      id="contentType"
                      label="Content-type"
                      colWidths={colWidths}
                      handleMouseDown={handleMouseDown}
                      defaultClassName="px-3 py-2 border border-slate-200/70 dark:border-transparent w-32 whitespace-nowrap"
                    />
                    <ResizableHeader
                      id="status"
                      label="Status"
                      colWidths={colWidths}
                      handleMouseDown={handleMouseDown}
                      defaultClassName="px-3 py-2 border border-slate-200/70 dark:border-transparent w-48 min-w-[180px]"
                    />
                    <ResizableHeader
                      id="blocker"
                      label="Blocker"
                      colWidths={colWidths}
                      handleMouseDown={handleMouseDown}
                      defaultClassName="px-3 py-2 border border-slate-200/70 dark:border-transparent w-32 min-w-[125px]"
                    />
                    <ResizableHeader
                      id="timeTracker"
                      label="Time tracker"
                      colWidths={colWidths}
                      handleMouseDown={handleMouseDown}
                      defaultClassName="px-3 py-2 border border-slate-200/70 dark:border-transparent w-32 whitespace-nowrap"
                    />
                    <ResizableHeader
                      id="revision"
                      label="Revision"
                      colWidths={colWidths}
                      handleMouseDown={handleMouseDown}
                      defaultClassName="px-3 py-2 border border-slate-200/70 dark:border-transparent w-28"
                    />
                    <ResizableHeader
                      id="startDate"
                      label="Start Date"
                      colWidths={colWidths}
                      handleMouseDown={handleMouseDown}
                      defaultClassName="px-3 py-2 border border-slate-200/70 dark:border-transparent w-32"
                    />
                    <ResizableHeader
                      id="endDate"
                      label="DUE DATE"
                      colWidths={colWidths}
                      handleMouseDown={handleMouseDown}
                      defaultClassName="px-3 py-2 border border-slate-200/70 dark:border-transparent w-32"
                    />
                    <ResizableHeader
                      id="assignedBy"
                      label="Assigned By"
                      colWidths={colWidths}
                      handleMouseDown={handleMouseDown}
                      defaultClassName="px-20 py-2 border border-slate-200/70 dark:border-transparent w-60"
                    />
                    <ResizableHeader
                      id="createdTime"
                      label="Created Time"
                      colWidths={colWidths}
                      handleMouseDown={handleMouseDown}
                      defaultClassName="px-3 py-2 border border-slate-200/70 dark:border-transparent min-w-[200px] w-56"
                    />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {sortedTasks.length === 0 ? (
                    <tr>
                      <td
                        colSpan={13}
                        className="px-6 py-8 text-center text-slate-450 dark:text-slate-500 font-bold bg-slate-50/5 dark:bg-slate-900/5 text-xs"
                      >
                        No tasks found.
                      </td>
                    </tr>
                  ) : (
                    sortedTasks.map((task) => {
                      const isCompleted = task.status === "Completed";
                      const statusStyle = getStatusStyle(
                        task.status,
                        task.isBlocked,
                      );
                      const isExpanded = !!expandedTasks[task._id];

                      return (
                        <React.Fragment key={task._id}>
                          <tr
                            className={`hover:bg-slate-50/40 dark:hover:bg-[#1a1d2d] transition-colors group cursor-pointer ${
                              isCompleted
                                ? "bg-slate-50/20 text-slate-400 dark:text-slate-500"
                                : task.priority === "Top High"
                                  ? "row-priority-top-high text-slate-700 dark:text-slate-200"
                                  : "text-slate-700 dark:text-slate-200"
                            }`}
                            onClick={() => handleSelectTaskForDrawer(task._id)}
                          >
                            {/* ID */}
                            <td className="px-3 py-2 border border-slate-200/70 dark:border-transparent font-bold text-[11px] text-slate-500 dark:text-slate-400 text-center">
                              {getTaskDisplayId(task)}
                            </td>

                            {/* Priority Badge */}
                            <td className="px-3 py-2 border border-slate-200/70 dark:border-transparent text-center">
                              <span
                                className={`inline-block text-center w-16 py-2 text-[11px] sm:text-[10px] rounded-[15px] font-bold uppercase whitespace-nowrap ${getPriorityStyle(task.priority || "Medium")}`}
                              >
                                {task.priority || "Medium"}
                              </span>
                            </td>

                            {/* Title & Subtasks Dropdown */}
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

                            {/* Content Copy */}
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

                            {/* Client Name */}
                            <td className="px-3 py-2 border border-slate-200/70 dark:border-transparent text-center">
                              {(() => {
                                const projId =
                                  task.project?._id || task.project;
                                const projectObj = projects.find(
                                  (p) => p._id === projId,
                                );
                                const client = task.project?.client?.companyName
                                  ? task.project.client
                                  : projectObj?.client || task.project?.client;
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

                            {/* Content-type */}
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

                            {/* Status Select */}
                            <td
                              className="px-3 py-2 border border-slate-200/70 dark:border-transparent w-48 min-w-[180px] text-center"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {task.isBlocked ? (
                                <div className="px-2.5 py-1 text-[11px] sm:text-[9.5px] font-black rounded-full border border-orange-200 dark:border-orange-500/30 text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center gap-1.5 shadow-sm uppercase tracking-wider">
                                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                                  Paused - Blocked
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
                                    <option
                                      value="Pending"
                                      className="bg-white dark:bg-[#11131e] text-slate-700 dark:text-slate-200"
                                    >
                                      Pending
                                    </option>
                                    <option
                                      value="In Progress"
                                      className="bg-white dark:bg-[#11131e] text-slate-700 dark:text-slate-200"
                                    >
                                      In Progress
                                    </option>
                                    <option
                                      value="IN-REVIEW"
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
                                  </select>
                                  <div className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-505 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">
                                    <FiChevronDown size={9} strokeWidth={2.5} />
                                  </div>
                                </div>
                              )}
                            </td>

                            {/* Blocker Column */}
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
                                                        {hist.totalPauseMinutes}{" "}
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

                            {/* Timer Column */}
                            <td
                              className="px-3 py-2 border border-slate-200/70 dark:border-transparent w-32 whitespace-nowrap text-center"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <TimeTracker
                                startTime={task.actualStartTime}
                                endTime={task.actualEndTime}
                                pausedAt={task.pausedAt}
                                savedPausedMs={task.totalPausedMs}
                                status={task.status}
                                isBlocked={task.isBlocked}
                                blockerPausedAt={task.blockerPausedAt}
                                blockerHistory={task.blockerHistory}
                              />
                            </td>

                            {/* Revision Column */}
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

                            {/* Start Date */}
                            <td className="px-3 py-2 border border-slate-200/70 dark:border-transparent w-32 text-center">
                              <span
                                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-[10px] font-bold whitespace-nowrap ${task.startDate ? "bg-blue-200 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300 border border-blue-200/50 dark:border-blue-500/20" : "text-slate-450 dark:text-slate-505 border border-dashed border-slate-200 dark:border-[#1e293b]/40"}`}
                              >
                                <FiCalendar size={11} />
                                {formatDate(task.startDate)}
                              </span>
                            </td>

                            {/* DUE DATE */}
                            <td className="px-3 py-2 border border-slate-200/70 dark:border-transparent w-32 text-center">
                              <span
                                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-[10px] font-bold whitespace-nowrap ${task.dueDate ? "bg-rose-200 text-rose-700 dark:bg-rose-500/10 dark:text-rose-350 border border-rose-200/50 dark:border-rose-500/20" : "text-slate-450 dark:text-slate-550 border border-dashed border-slate-200 dark:border-[#1e293b]/40"}`}
                              >
                                <FiCalendar size={11} />
                                {formatDate(task.dueDate)}
                              </span>
                            </td>

                            {/* Assigned By */}
                            <td className="px-3 py-2 border border-slate-200/70 dark:border-transparent w-44 text-left">
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
                                          alt={assignerUser?.name || "Assigner"}
                                          className="w-8 h-8 rounded-full object-cover border border-slate-200/80 dark:border-white/10 shadow-sm"
                                        />
                                      );
                                    }

                                    // Fallback colored gradient avatar with initials
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
                                        ((assignerUser?.name || "I").charCodeAt(
                                          0,
                                        ) || 0) % AVATAR_COLORS.length
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

                            {/* Created Time */}
                            <td className="px-3 py-2 border border-slate-200/70 dark:border-transparent text-center font-bold text-slate-500 dark:text-slate-400 text-xs sm:text-[11.5px]">
                              <CreatedTime time={task.createdAt} />
                            </td>
                          </tr>

                          {/* Expanded Subtasks Row */}
                          {isExpanded &&
                            task.subtasks &&
                            task.subtasks.length > 0 && (
                              <tr>
                                <td
                                  colSpan={13}
                                  className="bg-slate-50/[0.15] dark:bg-[#121522]/30 px-6 py-4"
                                >
                                  <div className="space-y-2 border-l-2 border-blue-500/60 dark:border-blue-500/40 pl-6">
                                    <h5 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">
                                      Subtasks Checklist
                                    </h5>
                                    <div className="flex flex-col gap-2">
                                      {task.subtasks.map((sub) => {
                                        const subCompleted =
                                          sub.status === "Completed";
                                        return (
                                          <div
                                            key={sub._id}
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

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 bg-slate-50 dark:bg-[#11131e] border-t border-slate-200/80 dark:border-white/5 text-xs font-bold">
                <span className="text-slate-500 dark:text-slate-400">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                  {Math.min(currentPage * itemsPerPage, totalItems)} of{" "}
                  {totalItems} tasks
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="w-8 h-8 rounded-xl hover:bg-slate-200 dark:hover:bg-white/5 border border-slate-250 dark:border-white/10 flex items-center justify-center disabled:opacity-40 disabled:hover:bg-transparent text-slate-600 dark:text-slate-300 cursor-pointer"
                  >
                    <FiChevronLeft size={16} />
                  </button>
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer ${
                        currentPage === i + 1
                          ? "bg-blue-600 dark:bg-[#3b82f6] text-white dark:text-black shadow-sm"
                          : "hover:bg-slate-200 dark:hover:bg-white/5 border border-slate-250 dark:border-white/10 text-slate-600 dark:text-slate-300"
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    className="w-8 h-8 rounded-xl hover:bg-slate-200 dark:hover:bg-white/5 border border-slate-250 dark:border-white/10 flex items-center justify-center disabled:opacity-40 disabled:hover:bg-transparent text-slate-600 dark:text-slate-300 cursor-pointer"
                  >
                    <FiChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* BLOCKER ADD MODAL */}
      <AnimatePresence>
        {blockerModalTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setBlockerModalTask(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white dark:bg-[#0f111a] border border-slate-200 dark:border-slate-800 max-w-md w-full rounded-3xl p-6 shadow-2xl space-y-5 overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-500">
                    <FiAlertCircle size={16} />
                  </div>
                  <span className="text-sm font-black text-slate-805 dark:text-white uppercase tracking-wider">
                    Add Blocker / Pause Task
                  </span>
                </div>
                <button
                  onClick={() => setBlockerModalTask(null)}
                  className="text-slate-400 hover:text-slate-605"
                >
                  <FiX size={18} />
                </button>
              </div>

              <div className="space-y-4 text-xs font-semibold">
                <div className="space-y-1 text-left">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
                    Blocker Type
                  </label>
                  <select
                    value={blockerType}
                    onChange={(e) => setBlockerType(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-250 dark:border-white/10 outline-none focus:border-rose-500 text-slate-800 dark:text-slate-200 cursor-pointer"
                  >
                    <option value="Client Call">📞 Client Call</option>
                    <option value="Feedback Pending">
                      ⌛ Feedback Pending
                    </option>
                    <option value="Internet / Server down">
                      🌐 Internet / Server down
                    </option>
                    <option value="Asset Pending">📁 Asset Pending</option>
                    <option value="Revision Work">✍️ Revision Work</option>
                    <option value="Personal Break / Shift End">
                      ☕ Personal Break / Shift End
                    </option>
                    <option value="Meeting / Discussion">
                      👥 Meeting / Discussion
                    </option>
                  </select>
                </div>

                <div className="space-y-1 text-left">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
                    Blocker Priority
                  </label>
                  <div className="flex gap-2.5">
                    {["Normal", "Urgent"].map((p) => (
                      <button
                        key={p}
                        onClick={() => setBlockerPriority(p)}
                        className={`flex-1 py-2 rounded-xl border text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer ${blockerPriority === p ? "bg-rose-500 border-rose-500 text-white shadow-md shadow-rose-500/20" : "bg-slate-50 border-slate-200 dark:bg-white/5 dark:border-white/5 text-slate-600 dark:text-slate-400 hover:border-rose-500/40"}`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1 text-left">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
                    Expected Block Duration
                  </label>
                  <select
                    value={blockerExpectedTime}
                    onChange={(e) => setBlockerExpectedTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-250 dark:border-white/10 outline-none focus:border-rose-500 text-slate-800 dark:text-slate-200 cursor-pointer"
                  >
                    <option value="15 mins">15 mins</option>
                    <option value="30 mins">30 mins</option>
                    <option value="1 hour">1 hour</option>
                    <option value="2-4 hours">2-4 hours</option>
                    <option value="End of Day">End of Day</option>
                    <option value="Next Day">Next Day</option>
                    <option value="Indefinite / Unsure">
                      Indefinite / Unsure
                    </option>
                  </select>
                </div>

                <div className="space-y-1 text-left">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
                    Detailed Reason
                  </label>
                  <textarea
                    value={blockerDescription}
                    onChange={(e) => setBlockerDescription(e.target.value)}
                    placeholder="Provide specific details about why the task is blocked..."
                    rows={3}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-250 dark:border-white/10 outline-none focus:border-rose-500 text-slate-800 dark:text-slate-200 placeholder-slate-400"
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
      {/* OFF-CANVAS WORKSPACE PREVIEW DRAWER */}
      <AnimatePresence>
        {selectedTask && (
          <div className="fixed inset-0 z-50 flex justify-end">
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
                          const projectObj = projects.find(
                            (p) => p._id === projId,
                          );
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
                  </div>
                </div>

                {/* Status Selection */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 tracking-wider flex items-center gap-1.5 uppercase">
                    <FiTag size={12} /> Status
                  </label>
                  <select
                    value={selectedTask.status}
                    onChange={(e) =>
                      handleTaskFieldChange(selectedTask._id, {
                        status: e.target.value,
                      })
                    }
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-semibold cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors ${getStatusStyle(selectedTask.status).bg}`}
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="IN-REVIEW">In Review</option>
                    {selectedTask.status === "Completed" && (
                      <option value="Completed">Completed</option>
                    )}
                    <option value="On Hold">On Hold</option>
                    {selectedTask.status === "Rejected" && (
                      <option value="Rejected">Rejected</option>
                    )}
                  </select>
                </div>

                {/* Time Tracker Display */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 tracking-wider flex items-center gap-1.5 uppercase">
                    <FiClock size={12} /> Time Tracker
                  </label>
                  <div className="bg-white dark:bg-[#0c121e] border border-slate-200/60 dark:border-slate-700/50 rounded-xl p-3 shadow-sm flex items-center justify-center">
                    <TimeTracker
                      startTime={selectedTask.actualStartTime}
                      endTime={selectedTask.actualEndTime}
                      status={selectedTask.status}
                      pausedAt={selectedTask.pausedAt}
                      isBlocked={selectedTask.isBlocked}
                      blockerPausedAt={selectedTask.blockerPausedAt}
                      blockerHistory={selectedTask.blockerHistory}
                      fullWidth={true}
                    />
                  </div>
                </div>

                {/* Blocker & Pause Control */}
                <div className="p-4 bg-rose-500/5 dark:bg-[#111827] border border-rose-200/50 dark:border-rose-900/30 rounded-3xl space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-rose-600 dark:text-rose-400 tracking-wider flex items-center gap-1.5 uppercase">
                      <FiAlertCircle size={14} /> Blocker & Pause Control
                    </label>
                    {selectedTask.isBlocked ? (
                      <span className="px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30 text-[9px] font-black uppercase tracking-wider animate-pulse">
                        Paused - Blocked
                      </span>
                    ) : (
                      <button
                        onClick={() => handleOpenBlockerModal(selectedTask)}
                        className="px-3 py-1.5 bg-rose-100 hover:bg-rose-600 dark:bg-rose-500/10 dark:hover:bg-rose-600 hover:text-white text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30 rounded-xl text-[10px] font-black tracking-wider uppercase transition-all cursor-pointer shadow-sm"
                      >
                        + Add Blocker
                      </button>
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

                  {/* Feedbacks Section */}
                  <div className="p-4 bg-blue-500/5 dark:bg-[#111827] border border-blue-200/50 dark:border-rose-900/30 rounded-3xl space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black text-blue-600 dark:text-blue-400 tracking-wider flex items-center gap-1.5 uppercase">
                        <FiMessageSquare size={14} /> Feedbacks ({(selectedTask.feedbacks || []).length})
                      </label>
                    </div>

                    {/* Add Feedback inline form */}
                    <div className="space-y-2">
                      <textarea
                        value={feedbackText}
                        onChange={(e) => setFeedbackText(e.target.value)}
                        placeholder="Type a new feedback..."
                        rows={2}
                        className="w-full bg-white dark:bg-[#1a1d2d] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
                      />
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            if (!feedbackText.trim()) {
                              toast.error("Feedback text cannot be empty");
                              return;
                            }
                            const newFeedback = {
                              _id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
                              text: feedbackText.trim(),
                              addedAt: new Date().toISOString(),
                              addedBy: currentUserId,
                            };
                            const updated = [...(selectedTask.feedbacks || []), newFeedback];
                            handleTaskFieldChange(selectedTask._id, { feedbacks: updated });
                            setFeedbackText("");
                            toast.success("Feedback added successfully");
                          }}
                          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-xl text-[10px] font-black tracking-wider uppercase transition-all cursor-pointer shadow-sm"
                        >
                          Submit
                        </button>
                      </div>
                    </div>

                    {/* List of Feedbacks */}
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1 scrollbar-thin">
                      {!(selectedTask.feedbacks) || selectedTask.feedbacks.length === 0 ? (
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 italic text-center py-2">
                          No feedbacks added yet.
                        </p>
                      ) : (
                        selectedTask.feedbacks
                          .slice()
                          .reverse()
                          .map((fb, idx) => {
                            const fbId = fb._id || fb.addedAt;
                            const isEditing = editingFeedbackId === fbId;
                            return (
                              <div
                                key={fbId || idx}
                                className="group p-2.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl space-y-1.5"
                              >
                                {isEditing ? (
                                  <div className="space-y-1.5">
                                    <textarea
                                      value={editingFeedbackText}
                                      onChange={(e) => setEditingFeedbackText(e.target.value)}
                                      rows={2}
                                      className="w-full bg-slate-50 dark:bg-[#1a1d2d] border border-slate-200 dark:border-white/10 rounded-xl px-2 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-blue-500 transition-all resize-none"
                                    />
                                    <div className="flex justify-end gap-2 text-[8.5px] font-extrabold uppercase">
                                      <button
                                        type="button"
                                        onClick={() => setEditingFeedbackId(null)}
                                        className="px-2 py-0.5 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (!editingFeedbackText.trim()) {
                                            toast.error("Feedback text cannot be empty");
                                            return;
                                          }
                                          const updated = (selectedTask.feedbacks || []).map((item) => {
                                            const isTarget = item._id ? item._id === fb._id : item.addedAt === fb.addedAt;
                                            if (isTarget) {
                                              return {
                                                ...item,
                                                text: editingFeedbackText.trim(),
                                                updatedAt: new Date().toISOString(),
                                              };
                                            }
                                            return item;
                                          });
                                          handleTaskFieldChange(selectedTask._id, { feedbacks: updated });
                                          setEditingFeedbackId(null);
                                          setEditingFeedbackText("");
                                          toast.success("Feedback updated successfully");
                                        }}
                                        className="px-2 py-0.5 bg-blue-600 dark:bg-blue-500 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors cursor-pointer"
                                      >
                                        Save
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <div className="flex justify-between items-center text-[8.5px] text-slate-500 dark:text-slate-400">
                                      <span>
                                        {new Date(fb.addedAt).toLocaleString()}
                                      </span>
                                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setEditingFeedbackId(fbId);
                                            setEditingFeedbackText(fb.text);
                                          }}
                                          className="p-0.5 hover:text-blue-500 transition-colors cursor-pointer"
                                          title="Edit Feedback"
                                        >
                                          <FiEdit size={10} />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            if (!window.confirm("Are you sure you want to delete this feedback?")) return;
                                            const updated = (selectedTask.feedbacks || []).filter((item) => {
                                              return item._id ? item._id !== fb._id : item.addedAt !== fb.addedAt;
                                            });
                                            handleTaskFieldChange(selectedTask._id, { feedbacks: updated });
                                            toast.success("Feedback deleted successfully");
                                          }}
                                          className="p-0.5 hover:text-rose-500 transition-colors cursor-pointer"
                                          title="Delete Feedback"
                                        >
                                          <FiTrash2 size={10} />
                                        </button>
                                      </div>
                                    </div>
                                    <p className="text-xs text-slate-700 dark:text-slate-200 font-medium break-words leading-relaxed">
                                      {fb.text}
                                    </p>
                                    {fb.updatedAt && (
                                      <div className="text-[8px] text-slate-400 dark:text-slate-500 text-right italic">
                                        Edited: {new Date(fb.updatedAt).toLocaleString()}
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            );
                          })
                      )}
                    </div>
                  </div>
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
