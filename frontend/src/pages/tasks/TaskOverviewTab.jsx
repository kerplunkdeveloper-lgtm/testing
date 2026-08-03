import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { BiFile } from "react-icons/bi";
import {
  FiCalendar,
  FiFilter,
  FiChevronDown,
  FiColumns,
  FiCheckSquare,
  FiX,
  FiTag,
  FiCheck,
  FiBriefcase,
  FiSearch,
  FiTrash2,
  FiAlertCircle,
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { useSelector } from "react-redux";
import {
  useUpdateTaskMutation,
  useDeleteTaskMutation,
} from "../../features/api/apiSlice";
import ClientBadge from "../../components/common/ClientBadge";
import toast from "react-hot-toast";

const SimpleTimeTracker = ({
  startTime,
  endTime,
  status,
  pausedAt,
  savedPausedMs = 0,
  isBlocked,
  blockerPausedAt,
  blockerHistory,
}) => {
  const [elapsed, setElapsed] = useState(0);

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
      return Math.max(0, Math.floor(totalElapsedMs / 1000));
    };

    const update = () => {
      setElapsed(calculateTime());
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
    savedPausedMs,
  ]);

  if (!startTime)
    return (
      <span className="text-slate-450 dark:text-slate-500 font-normal">—</span>
    );

  const formatTime = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h > 0 ? `${h}h ` : ""}${m}m ${s}s`;
  };

  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-xl text-[10px] font-black bg-blue-50/80 text-blue-700 border border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/30 shadow-2xs">
      {formatTime(elapsed)}
    </span>
  );
};

const renderUserAvatarSmall = (u) => {
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
        className="w-5 h-5 rounded-full object-cover border border-slate-200/80 dark:border-white/10 shadow-xs shrink-0"
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
      className={`w-5 h-5 rounded-full bg-gradient-to-br ${colorClass} flex items-center justify-center text-white font-black text-[8px] border border-white/10 shadow-xs shrink-0`}
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
  const [updateTaskTrigger] = useUpdateTaskMutation();
  const [deleteTask] = useDeleteTaskMutation();
  const [taskToDelete, setTaskToDelete] = useState(null);

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

  // Internal selected task state for workspace preview drawer
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const selectedTask = tasks.find((t) => t._id === selectedTaskId);

  const getTaskDisplayId = (task) => {
    if (!task || !task._id) return "";
    const projId = task.project?._id || task.project;
    const projectObj = projects.find((p) => p._id === projId);
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

  const handleTaskFieldChange = async (taskId, fields) => {
    const sanitizedFields = { ...fields };

    if (sanitizedFields.startDate === "") sanitizedFields.startDate = null;

    if (sanitizedFields.dueDate === "") sanitizedFields.dueDate = null;

    try {
      await updateTaskTrigger({
        id: taskId,
        taskData: sanitizedFields,
      }).unwrap();
    } catch (err) {
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
      case "IN-REVIEW":
      case "In Review":
        return {
          bg: "!bg-sky-50 !text-sky-700 !border-sky-200 dark:!bg-sky-500/20 dark:!text-sky-350 dark:!border-sky-500/40",
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
    createdBy: false,
    clientName: false,
    assignee: false,
    startDate: false,
    dueDate: false,
    priority: false,
    status: false,
    totalHours: false,
    action: false,
  });
  const [isColsOpen, setIsColsOpen] = useState(false);
  const colsDropdownRef = useRef(null);

  const [searchParams] = useSearchParams();
  const statusParam = searchParams.get("status");

  const [overviewStatusFilter, setOverviewStatusFilter] = useState(() => {
    return statusParam || "All";
  });

  useEffect(() => {
    if (statusParam) {
      setOverviewStatusFilter(statusParam);
    }
  }, [statusParam]);

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
    overviewStartDateFilter,
    overviewEndDateFilter,
    dateFilter,
    overviewClientFilter,
    overviewCreatedByFilter,
    overviewAssigneeFilter,
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
      case "Pending":
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

  const filteredOverviewTasks = React.useMemo(() => {
    return tasks
      .filter((task) => {
        const isAdminOrManager =
          user?.role === "admin" || user?.role === "operationmanager";
        const creatorId = task.createdBy?._id || task.createdBy;

        const projId = task.project?._id || task.project;
        const projectObj = projects.find((p) => p._id === projId);

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
        } else if (
          overviewStatusFilter !== "All" &&
          task.status !== overviewStatusFilter
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

        if (dateFilter !== "All") {
          const targetDate = task.dueDate ? new Date(task.dueDate) : null;

          if (!targetDate || isNaN(targetDate.getTime())) {
            return false;
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
              if (targetDate < todayStart || targetDate > todayEnd)
                return false;
            } else if (dateFilter === "Yesterday") {
              const yesterdayStart = new Date(todayStart);
              yesterdayStart.setDate(yesterdayStart.getDate() - 1);
              const yesterdayEnd = new Date(todayEnd);
              yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);
              if (targetDate < yesterdayStart || targetDate > yesterdayEnd)
                return false;
            } else if (dateFilter === "This Week") {
              const dayOfWeek = now.getDay();
              const startOfWeek = new Date(todayStart);
              startOfWeek.setDate(
                startOfWeek.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1),
              );
              const endOfWeek = new Date(startOfWeek);
              endOfWeek.setDate(endOfWeek.getDate() + 6);
              endOfWeek.setHours(23, 59, 59, 999);
              if (targetDate < startOfWeek || targetDate > endOfWeek)
                return false;
            } else if (dateFilter === "This Month") {
              const startOfMonth = new Date(
                now.getFullYear(),
                now.getMonth(),
                1,
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
              if (targetDate < startOfMonth || targetDate > endOfMonth)
                return false;
            }
          }
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
        const priorityRank = {
          "Top High": 1,
          High: 2,
          Medium: 3,
          Low: 4,
        };

        const pRankA = priorityRank[a.priority] || 5;
        const pRankB = priorityRank[b.priority] || 5;

        if (pRankA !== pRankB) {
          return pRankA - pRankB;
        }

        const isCompletedA = a.status === "Completed" ? 1 : 0;
        const isCompletedB = b.status === "Completed" ? 1 : 0;
        if (isCompletedA !== isCompletedB) {
          return isCompletedA - isCompletedB;
        }

        const creatorA = (a.createdBy?.name || "Unknown").toLowerCase();
        const creatorB = (b.createdBy?.name || "Unknown").toLowerCase();

        if (creatorA < creatorB) return -1;
        if (creatorA > creatorB) return 1;

        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });
  }, [
    tasks,
    currentUserId,
    projectSearch,
    projects,
    overviewPriorityFilter,
    overviewStatusFilter,
    overviewStartDateFilter,
    overviewEndDateFilter,
    dateFilter,
    overviewClientFilter,
    overviewCreatedByFilter,
    overviewAssigneeFilter,
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

  return (
    <>
      <div className="bg-white dark:bg-[#11131e] overflow-hidden flex flex-col h-[calc(100vh-160px)]">
        <div className="px-10 flex flex-col sm:flex-row items-center justify-between gap-3 pb-3 pt-1 border-b border-slate-100 dark:border-white/5 relative z-30 shrink-0">
          {/* client display */}
          <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-700 dark:text-slate-300">
            <span>Client:</span>
            {overviewClientFilter === "All" ? (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[8.5px] font-black border rounded bg-slate-50 dark:bg-slate-900/20 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800/30">
                <FiBriefcase size={8} />
                All
              </span>
            ) : (
              <ClientBadge
                client={clients?.find((c) => c._id === overviewClientFilter)}
                size="sm"
                className="!text-[8px] !px-1.5 !py-0.5"
              />
            )}
          </div>

          {/* status display  */}
          <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-700 dark:text-slate-300">
            <span>Status:</span>
            {overviewStatusFilter === "All" ? (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[8.5px] font-black border rounded bg-slate-50 dark:bg-slate-900/20 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800/30">
                <FiBriefcase size={8} />
                All
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[8.5px] font-black border rounded bg-slate-50 dark:bg-slate-900/20 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800/30">
                <FiBriefcase size={8} />
                {overviewStatusFilter}
              </span>
            )}
          </div>

          <div className="flex items-center justify-end gap-2.5 w-full sm:w-auto">
            <div className="relative" ref={clientDropdownRef}>
              <div className="relative rounded-full p-[2px] overflow-hidden group inline-block shadow-sm">
                <div className="absolute inset-[-100%] bg-[conic-gradient(transparent_0deg,#3b82f6_90deg,transparent_180deg)] animate-[spin_2s_linear_infinite] group-hover:bg-[conic-gradient(transparent_0deg,#6366f1_90deg,transparent_180deg)] transition-colors duration-300" />
                <div
                  className={`absolute inset-[1px] rounded-full z-0 ${
                    overviewClientFilter !== "All"
                      ? "bg-blue-50/80 dark:bg-blue-950/30"
                      : "bg-white dark:bg-[#151725]"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowClientDropdown((prev) => !prev)}
                  className={`relative flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-extrabold transition-all cursor-pointer z-10 bg-transparent outline-none border-none tracking-wide ${
                    overviewClientFilter !== "All"
                      ? "text-blue-800 dark:text-blue-300"
                      : "text-slate-800 dark:text-slate-200"
                  }`}
                >
                  <span className="truncate max-w-[90px]">
                    {overviewClientFilter === "All"
                      ? "All Clients"
                      : clients?.find((c) => c._id === overviewClientFilter)
                          ?.companyName || "Client"}
                  </span>
                  <FiChevronDown
                    size={13}
                    className={`text-slate-400 transition-transform duration-200 ${
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
                    className="absolute right-0 top-full mt-2 w-64 max-h-[340px] flex flex-col bg-white dark:bg-[#151725] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl z-[70] overflow-hidden"
                  >
                    <div className="p-2 border-b border-slate-100 dark:border-white/10 shrink-0">
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Search clients..."
                          value={clientSearchQuery}
                          onChange={(e) => setClientSearchQuery(e.target.value)}
                          className="w-full pl-7 pr-3 py-1.5 text-[11px] font-semibold rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 outline-none focus:border-blue-500 text-slate-800 dark:text-slate-200"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-1.5 flex flex-col gap-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setOverviewClientFilter("All");
                          setShowClientDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
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
                            className={`w-full text-left px-2 py-1.5 rounded-xl transition-all shrink-0 flex items-center ${
                              overviewClientFilter === client._id
                                ? "bg-blue-50 dark:bg-blue-500/10"
                                : "hover:bg-slate-50 dark:hover:bg-white/5"
                            }`}
                          >
                            <ClientBadge
                              client={client}
                              size="md"
                              className="w-full justify-start"
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
              <div className="relative rounded-full p-[2px] overflow-hidden group inline-block shadow-sm">
                <div className="absolute inset-[-100%] bg-[conic-gradient(transparent_0deg,#a855f7_90deg,transparent_180deg)] animate-[spin_2s_linear_infinite] group-hover:bg-[conic-gradient(transparent_0deg,#ec4899_90deg,transparent_180deg)] transition-colors duration-300" />
                <div
                  className={`absolute inset-[1px] rounded-full z-0 ${
                    overviewCreatedByFilter !== "All"
                      ? "bg-blue-50/80 dark:bg-blue-950/30"
                      : "bg-white dark:bg-[#151725]"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowCreatedByDropdown((prev) => !prev)}
                  className={`relative flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-extrabold transition-all cursor-pointer z-10 bg-transparent outline-none border-none tracking-wide ${
                    overviewCreatedByFilter !== "All"
                      ? "text-blue-800 dark:text-blue-300"
                      : "text-slate-800 dark:text-slate-200"
                  }`}
                >
                  {overviewCreatedByFilter !== "All" &&
                    renderUserAvatarSmall(
                      uniqueCreators.find(
                        (u) => (u._id || u.id) === overviewCreatedByFilter,
                      ),
                    )}
                  <span className="truncate max-w-[90px]">
                    {overviewCreatedByFilter === "All"
                      ? "Created By"
                      : uniqueCreators.find(
                          (u) => (u._id || u.id) === overviewCreatedByFilter,
                        )?.name || "Creator"}
                  </span>
                  <FiChevronDown
                    size={13}
                    className={`text-slate-400 transition-transform duration-200 ${
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
                    className="absolute right-0 top-full mt-2 w-64 max-h-[340px] flex flex-col bg-white dark:bg-[#151725] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl z-[70] overflow-hidden"
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
                          className="w-full pl-7 pr-3 py-1.5 text-[11px] font-semibold rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 outline-none focus:border-blue-500 text-slate-800 dark:text-slate-200"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-1.5 flex flex-col gap-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setOverviewCreatedByFilter("All");
                          setShowCreatedByDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
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
                              className={`w-full text-left px-3 py-2 rounded-xl transition-all shrink-0 flex items-center gap-2 ${
                                overviewCreatedByFilter === uid
                                  ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 font-extrabold"
                                  : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5"
                              }`}
                            >
                              {renderUserAvatarSmall(u)}
                              <span className="truncate text-xs">{u.name}</span>
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
              <div className="relative rounded-full p-[2px] overflow-hidden group inline-block shadow-sm">
                <div className="absolute inset-[-100%] bg-[conic-gradient(transparent_0deg,#e11d48_90deg,transparent_180deg)] animate-[spin_2s_linear_infinite] group-hover:bg-[conic-gradient(transparent_0deg,#f43f5e_90deg,transparent_180deg)] transition-colors duration-300" />
                <div
                  className={`absolute inset-[1px] rounded-full z-0 ${
                    overviewAssigneeFilter !== "All"
                      ? "bg-blue-50/80 dark:bg-blue-950/30"
                      : "bg-white dark:bg-[#151725]"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowAssigneeDropdown((prev) => !prev)}
                  className={`relative flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-extrabold transition-all cursor-pointer z-10 bg-transparent outline-none border-none tracking-wide ${
                    overviewAssigneeFilter !== "All"
                      ? "text-blue-800 dark:text-blue-300"
                      : "text-slate-800 dark:text-slate-200"
                  }`}
                >
                  {overviewAssigneeFilter !== "All" &&
                    renderUserAvatarSmall(
                      uniqueAssignees.find(
                        (u) => (u._id || u.id) === overviewAssigneeFilter,
                      ),
                    )}
                  <span className="truncate max-w-[90px]">
                    {overviewAssigneeFilter === "All"
                      ? "Assignee"
                      : uniqueAssignees.find(
                          (u) => (u._id || u.id) === overviewAssigneeFilter,
                        )?.name || "Assignee"}
                  </span>
                  <FiChevronDown
                    size={13}
                    className={`text-slate-400 transition-transform duration-200 ${
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
                    className="absolute right-0 top-full mt-2 w-64 max-h-[340px] flex flex-col bg-white dark:bg-[#151725] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl z-[70] overflow-hidden"
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
                          className="w-full pl-7 pr-3 py-1.5 text-[11px] font-semibold rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 outline-none focus:border-blue-500 text-slate-800 dark:text-slate-200"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-1.5 flex flex-col gap-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setOverviewAssigneeFilter("All");
                          setShowAssigneeDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
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
                              className={`w-full text-left px-3 py-2 rounded-xl transition-all shrink-0 flex items-center gap-2 ${
                                overviewAssigneeFilter === uid
                                  ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 font-extrabold"
                                  : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5"
                              }`}
                            >
                              {renderUserAvatarSmall(u)}
                              <span className="truncate text-xs">{u.name}</span>
                            </button>
                          );
                        })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Status Filter */}
            <div className="relative" ref={statusDropdownRef}>
              <div className="relative rounded-full p-[2px] overflow-hidden group inline-block shadow-sm">
                <div className="absolute inset-[-100%] bg-[conic-gradient(transparent_0deg,#0ea5e9_90deg,transparent_180deg)] animate-[spin_2s_linear_infinite] group-hover:bg-[conic-gradient(transparent_0deg,#2563eb_90deg,transparent_180deg)] transition-colors duration-300" />
                <div
                  className={`absolute inset-[1px] rounded-full z-0 ${
                    overviewStatusFilter !== "All"
                      ? "bg-blue-50/80 dark:bg-blue-950/30"
                      : "bg-white dark:bg-[#151725]"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowStatusDropdown((prev) => !prev)}
                  className={`relative flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-extrabold transition-all cursor-pointer z-10 bg-transparent outline-none border-none tracking-wide ${
                    overviewStatusFilter !== "All"
                      ? "text-blue-800 dark:text-blue-300"
                      : "text-slate-800 dark:text-slate-200"
                  }`}
                >
                  <span className="truncate max-w-[90px]">
                    {overviewStatusFilter === "All"
                      ? "Status"
                      : overviewStatusFilter}
                  </span>
                  <FiChevronDown
                    size={13}
                    className={`text-slate-400 transition-transform duration-200 ${
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
                    className="absolute right-0 top-full mt-2 w-44 bg-white dark:bg-[#151725] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl p-1.5 z-[70] flex flex-col gap-0.5"
                  >
                    {[
                      "All",
                      "Pending",
                      "In Progress",
                      "IN-REVIEW",
                      "On Hold",
                      "Completed",
                      "Rejected",
                      ...(overviewStatusFilter === "Overdue"
                        ? ["Overdue"]
                        : []),
                    ].map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => {
                          setOverviewStatusFilter(st);
                          setShowStatusDropdown(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
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
              <div className="relative rounded-full p-[2px] overflow-hidden group inline-block shadow-sm">
                <div className="absolute inset-[-100%] bg-[conic-gradient(transparent_0deg,#f59e0b_90deg,transparent_180deg)] animate-[spin_2s_linear_infinite] group-hover:bg-[conic-gradient(transparent_0deg,#ea580c_90deg,transparent_180deg)] transition-colors duration-300" />
                <div
                  className={`absolute inset-[1px] rounded-full z-0 ${
                    overviewPriorityFilter !== "All"
                      ? "bg-blue-50/80 dark:bg-blue-950/30"
                      : "bg-white dark:bg-[#151725]"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPriorityDropdown((prev) => !prev)}
                  className={`relative flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-extrabold transition-all cursor-pointer z-10 bg-transparent outline-none border-none tracking-wide ${
                    overviewPriorityFilter !== "All"
                      ? "text-blue-800 dark:text-blue-300"
                      : "text-slate-800 dark:text-slate-200"
                  }`}
                >
                  <span className="truncate max-w-[90px]">
                    {overviewPriorityFilter === "All"
                      ? "Priority"
                      : overviewPriorityFilter}
                  </span>
                  <FiChevronDown
                    size={13}
                    className={`text-slate-400 transition-transform duration-200 ${
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
                    className="absolute right-0 top-full mt-2 w-44 bg-white dark:bg-[#151725] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl p-1.5 z-[70] flex flex-col gap-0.5"
                  >
                    {["All", "Top High", "High", "Medium", "Low"].map((pr) => (
                      <button
                        key={pr}
                        type="button"
                        onClick={() => {
                          setOverviewPriorityFilter(pr);
                          setShowPriorityDropdown(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                          overviewPriorityFilter === pr
                            ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 font-extrabold"
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
              <div className="relative rounded-full p-[2px] overflow-hidden group inline-block shadow-sm">
                <div className="absolute inset-[-100%] bg-[conic-gradient(transparent_0deg,#10b981_90deg,transparent_180deg)] animate-[spin_2s_linear_infinite] group-hover:bg-[conic-gradient(transparent_0deg,#0ea5e9_90deg,transparent_180deg)] transition-colors duration-300" />
                <div
                  className={`absolute inset-[1px] rounded-full z-0 ${
                    dateFilter !== "All"
                      ? "bg-blue-50/80 dark:bg-blue-950/30"
                      : "bg-white dark:bg-[#151725]"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowDateDropdown((prev) => !prev)}
                  className={`relative flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-extrabold transition-all cursor-pointer z-10 bg-transparent outline-none border-none tracking-wide ${
                    dateFilter !== "All"
                      ? "text-blue-800 dark:text-blue-300"
                      : "text-slate-800 dark:text-slate-200"
                  }`}
                >
                  <FiFilter size={13} className="text-[#10b981] stroke-[3]" />
                  <span>{dateFilter === "All" ? "Date" : dateFilter}</span>
                  <FiChevronDown
                    size={13}
                    className={`text-slate-400 transition-transform duration-200 ${
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

            <div className="relative" ref={colsDropdownRef}>
              <button
                type="button"
                onClick={() => setIsColsOpen(!isColsOpen)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl border text-xs font-extrabold cursor-pointer transition-all shadow-2xs ${
                  isColsOpen || Object.values(hiddenColumns).some(Boolean)
                    ? "bg-blue-50 border-blue-300 text-blue-600 dark:bg-blue-950/30 dark:border-blue-500/40 dark:text-blue-300"
                    : "bg-white dark:bg-[#151725] border-slate-200/90 dark:border-white/10 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900"
                }`}
              >
                <FiColumns className="text-blue-500" size={13} />
                <span>Hide Column</span>
                {Object.values(hiddenColumns).filter(Boolean).length > 0 && (
                  <span className="text-[10px] font-black bg-blue-505 text-white rounded-full w-4 h-4 flex items-center justify-center ml-0.5">
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
                    className="absolute right-0 mt-2 w-52 bg-white dark:bg-[#151725] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl p-2.5 z-50 space-y-1.5 backdrop-blur-md"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-2 px-1">
                      <span className="text-xs font-bold text-slate-800 dark:text-white tracking-wider">
                        Toggle Columns
                      </span>
                      {Object.values(hiddenColumns).some(Boolean) && (
                        <button
                          type="button"
                          onClick={() =>
                            setHiddenColumns({
                              taskName: false,
                              createdBy: false,
                              clientName: false,
                              startDate: false,
                              dueDate: false,
                              priority: false,
                              status: false,
                              revisions: false,
                              totalHours: false,
                              action: false,
                            })
                          }
                          className="text-[10px] font-bold text-blue-500 hover:text-blue-600 transition-colors"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 max-h-60 overflow-y-auto custom-scrollbar">
                      {[
                        { key: "taskName", label: "Task Name" },
                        { key: "createdBy", label: "Created By" },
                        { key: "clientName", label: "Client Name" },
                        { key: "assignee", label: "Assignee" },
                        { key: "startDate", label: "Start Date" },
                        { key: "dueDate", label: "End Date" },
                        { key: "priority", label: "Priority" },
                        { key: "status", label: "Status" },
                        { key: "totalHours", label: "Total Hours" },
                        { key: "action", label: "Action" },
                      ].map((col) => (
                        <label
                          key={col.key}
                          className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-355 select-none"
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
          </div>
        </div>

        <div className="overflow-x-auto overflow-y-auto custom-scrollbar flex-1 relative bg-white dark:bg-[#11131e]">
          <table className="w-full text-left border-collapse min-w-[1305px] table-fixed">
            <thead className="sticky top-0 z-20 bg-slate-50 dark:bg-[#161826] shadow-sm">
              <tr className="border-b border-slate-300 dark:border-white/15 text-[9.5px] font-black text-slate-550 dark:text-slate-400 uppercase tracking-wider">
                {!hiddenColumns.taskName && (
                  <th className="py-2.5 px-3 border-r border-b border-slate-300 dark:border-white/15 w-[220px]">
                    TASK NAME
                  </th>
                )}

                {!hiddenColumns.clientName && (
                  <th className="py-2.5 px-3 border-r border-b border-slate-300 dark:border-white/15 w-[130px]">
                    CLIENT NAME
                  </th>
                )}

                {!hiddenColumns.createdBy && (
                  <th className="py-2.5 px-3 border-r border-b border-slate-300 dark:border-white/15 w-[100px]">
                    CREATED BY
                  </th>
                )}

                {!hiddenColumns.assignee && (
                  <th className="py-2.5 px-3 border-r border-b border-slate-300 dark:border-white/15 w-[110px]">
                    ASSIGNEE
                  </th>
                )}
                {!hiddenColumns.startDate && (
                  <th className="py-2.5 px-3 border-r border-b border-slate-300 dark:border-white/15 text-center w-[100px]">
                    START DATE
                  </th>
                )}
                {!hiddenColumns.dueDate && (
                  <th className="py-2.5 px-3 border-r border-b border-slate-300 dark:border-white/15 text-center w-[100px]">
                    END DATE
                  </th>
                )}
                {!hiddenColumns.priority && (
                  <th className="py-2.5 px-3 border-r border-b border-slate-300 dark:border-white/15 text-center w-[110px]">
                    PRIORITY
                  </th>
                )}
                {!hiddenColumns.status && (
                  <th className="py-2.5 px-3 border-r border-b border-slate-300 dark:border-white/15 text-center w-[130px]">
                    STATUS
                  </th>
                )}
                {!hiddenColumns.totalHours && (
                  <th className="py-2.5 px-3 border-r border-b border-slate-300 dark:border-white/15 text-center w-[110px]">
                    TOTAL HOURS
                  </th>
                )}
                {!hiddenColumns.action && (
                  <th className="py-2.5 px-3 border-b border-slate-300 dark:border-white/15 text-right w-[125px]">
                    ACTION
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/10 text-xs font-semibold">
              {filteredOverviewTasks.length === 0 ? (
                <tr>
                  <td
                    colSpan={
                      Object.values(hiddenColumns).filter(
                        (isHidden) => !isHidden,
                      ).length
                    }
                    className="py-8 text-center text-slate-400 font-bold"
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
                  .map((task) => {
                    const isCompleted = task.status === "Completed";
                    const pStyle = getPriorityStyle(task.priority || "Medium");
                    const sStyle = getStatusStyle(task.status, task.isBlocked);

                    const projId = task.project?._id || task.project;
                    const projectObj = projects.find((p) => p._id === projId);
                    const clientRaw =
                      projectObj?.client || task.project?.client;
                    const clientId = clientRaw?._id || clientRaw;
                    const clientObj =
                      clients?.find((c) => c._id === clientId) ||
                      (typeof clientRaw === "object" ? clientRaw : null);
                    const clientName = clientObj?.companyName || "N/A";

                    return (
                      <tr
                        key={task._id}
                        className={`hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors cursor-pointer border-b border-slate-200 dark:border-white/10 ${
                          isCompleted
                            ? "bg-slate-50/20 text-slate-400 dark:text-slate-500"
                            : "text-slate-800 dark:text-slate-100"
                        }`}
                        onClick={() => setSelectedTaskId(task._id)}
                      >
                        {!hiddenColumns.taskName && (
                          <td className="py-2.5 px-3 border-r border-b border-slate-200 dark:border-white/10 font-extrabold text-left">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTaskFieldChange(task._id, {
                                    status: isCompleted
                                      ? "Pending"
                                      : "Completed",
                                  });
                                }}
                                className={`w-4 h-4 rounded-full flex items-center justify-center border transition-all shrink-0 cursor-pointer ${
                                  isCompleted
                                    ? "bg-[#10b981] border-[#10b981] text-white shadow-sm"
                                    : "bg-white dark:bg-[#151725] border-slate-350 dark:border-slate-650 text-slate-400 dark:text-slate-500 hover:border-[#10b981] hover:text-[#10b981]"
                                }`}
                              >
                                <FiCheck
                                  size={9}
                                  className={
                                    isCompleted
                                      ? "stroke-[4px]"
                                      : "opacity-0 hover:opacity-100"
                                  }
                                />
                              </button>
                              <BiFile
                                className="text-slate-400 shrink-0"
                                size={13}
                              />
                              <span
                                className={`truncate max-w-[180px] text-[11px] ${isCompleted ? "line-through text-slate-400 dark:text-slate-500" : ""}`}
                                title={task.title}
                              >
                                {task.title}
                              </span>
                            </div>
                          </td>
                        )}
                        {!hiddenColumns.clientName && (
                          <td className="py-2.5 px-3 border-r border-b border-slate-200 dark:border-white/10 text-left">
                            {clientObj && clientObj.companyName ? (
                              <ClientBadge
                                client={clientObj}
                                size="sm"
                                className="!text-[10px] !px-1.5 !py-0.5"
                              />
                            ) : (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[14px] font-bold bg-pink-50 text-pink-600 border border-pink-100 dark:bg-pink-950/30 dark:text-pink-400 dark:border-pink-900/30">
                                {clientName}
                              </span>
                            )}
                          </td>
                        )}
                        {!hiddenColumns.createdBy && (
                          <td className="py-2.5 px-3 border-r border-b border-slate-200 dark:border-white/10 text-left">
                            <div className="flex items-center gap-2">
                              {renderUserAvatarSmall(task.createdBy)}
                              <div className="flex flex-col justify-center min-w-0">
                                <span
                                  className={`font-extrabold text-[9.5px] truncate transition-colors ${getUserColorClass(task.createdBy?.name || "Unknown")}`}
                                >
                                  {task.createdBy?.name || "Unknown"}
                                </span>
                                <span
                                  className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black border uppercase tracking-wider mt-1 w-max ${getDeptBadgeStyle(task.createdBy?.department || "Creator")}`}
                                >
                                  {shortenDept(
                                    task.createdBy?.department || "Creator",
                                  )}
                                </span>
                              </div>
                            </div>
                          </td>
                        )}
                        {!hiddenColumns.assignee && (
                          <td className="py-2.5 px-3 border-r border-b border-slate-200 dark:border-white/10 text-left">
                            <div className="flex items-center gap-2">
                              {renderUserAvatarSmall(task.assignedTo)}
                              <div className="flex flex-col justify-center min-w-0">
                                <span
                                  className={`font-extrabold text-[9.5px] truncate transition-colors ${getUserColorClass(task.assignedTo?.name || "Unassigned")}`}
                                >
                                  {task.assignedTo?.name || "Unassigned"}
                                </span>
                                <span
                                  className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black border uppercase tracking-wider mt-1 w-max ${getDeptBadgeStyle(task.assignedTo?.department || "Team Member")}`}
                                >
                                  {shortenDept(
                                    task.assignedTo?.department ||
                                      "Team Member",
                                  )}
                                </span>
                              </div>
                            </div>
                          </td>
                        )}
                        {!hiddenColumns.startDate && (
                          <td className="py-2.5 px-3 border-r border-b border-slate-200 dark:border-white/10 text-center whitespace-nowrap">
                            {task.startDate ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[14px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200/50 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-550/20 shadow-2xs">
                                <FiCalendar size={10} className="shrink-0" />
                                {formatDate(task.startDate)}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-normal text-[10px]">
                                —
                              </span>
                            )}
                          </td>
                        )}
                        {!hiddenColumns.dueDate && (
                          <td className="py-2.5 px-3 border-r border-b border-slate-200 dark:border-white/10 text-center whitespace-nowrap">
                            {task.dueDate ? (
                              <span className="inline-flex items-center gap-1  px-2.5 py-0.5 rounded-full text-[14px] font-bold bg-rose-50 text-rose-700 border border-rose-200/50 dark:bg-rose-500/10 dark:text-rose-350 dark:border-rose-550/20 shadow-2xs">
                                <FiCalendar size={10} className="shrink-0" />
                                {formatDate(task.dueDate)}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-normal text-[10px]">
                                —
                              </span>
                            )}
                          </td>
                        )}
                        {!hiddenColumns.priority && (
                          <td className="py-2.5 px-3 border-r border-b border-slate-200 dark:border-white/10 text-center whitespace-nowrap">
                            <span
                              className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-[14px] font-medium  tracking-wider shadow-lg border ${pStyle}`}
                            >
                              {task.priority || "Medium"}
                            </span>
                          </td>
                        )}
                        {!hiddenColumns.status && (
                          <td className="py-2.5 px-3 border-r border-b border-slate-200 dark:border-white/10 text-center whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[14px] font-medium border  tracking-wider shadow-lg ${sStyle.bg} ${sStyle.text} ${sStyle.border}`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${sStyle.dot}`}
                              />
                              {task.status || "Pending"}
                            </span>
                          </td>
                        )}
                        {!hiddenColumns.totalHours && (
                          <td className="py-2.5 px-3 border-r border-b border-slate-200 dark:border-white/10 text-center whitespace-nowrap">
                            <SimpleTimeTracker
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
                        )}
                        {!hiddenColumns.action && (
                          <td
                            className="py-2.5 px-3 border-b border-slate-200 dark:border-white/10 text-right"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-end gap-2">
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
                                    `/${userRole}/projects?id=${projId}`,
                                  );
                                }}
                                className="px-2 py-1 rounded-lg border border-slate-200 dark:border-white/10 text-[10px] font-extrabold text-slate-800 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-[#3b82f6] hover:border-blue-200 transition-all cursor-pointer shadow-2xs"
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
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#161826] shrink-0 mt-auto">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
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
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-white/5 transition-colors shadow-2xs cursor-pointer"
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
                        className="px-2 py-1 text-xs text-slate-400 dark:text-slate-650 font-bold select-none"
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
                      className={`px-3 py-1.5 text-xs rounded-lg border transition-all cursor-pointer font-bold ${
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
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-white/5 transition-colors shadow-2xs cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedTask && (
          <div className="fixed inset-0 z-50 flex justify-end">
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
                    <h2 className="text-sm font-black text-slate-800 dark:text-white tracking-wider">
                      Task Workspace
                    </h2>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold tracking-wider mt-0.5">
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
                            return <ClientBadge client={clientObj} size="sm" />;
                          }
                          return (
                            <span className="text-slate-400 italic font-normal">
                              {clientObj?.companyName || "—"}
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

                    <div className="space-y-1">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
                        Assigned By
                      </span>
                      <span className="font-bold text-slate-700 dark:text-white">
                        {selectedTask.createdBy?.name || "Unknown"}
                      </span>
                    </div>
                  </div>
                </div>

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
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-semibold cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors ${getDrawerStatusStyle(selectedTask.status).bg}`}
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
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {taskToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
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
    </>
  );
};

export default TaskOverviewTab;
