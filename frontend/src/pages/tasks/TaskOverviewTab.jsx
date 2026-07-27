import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
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
  FiAlertCircle
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { useSelector } from "react-redux";
import { useUpdateTaskMutation, useDeleteTaskMutation } from "../../features/api/apiSlice";
import ClientBadge from "../../components/common/ClientBadge";

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

  if (!startTime) return <span className="text-slate-450 dark:text-slate-500 font-normal">—</span>;

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
  const itemsPerPage = 15;

  const [overviewClientFilter, setOverviewClientFilter] = useState("All");
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const clientDropdownRef = useRef(null);

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

  const [overviewStatusFilter, setOverviewStatusFilter] = useState("All");
  const [overviewPriorityFilter, setOverviewPriorityFilter] = useState("All");
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
        const isAdminOrManager = user?.role === "admin" || user?.role === "operationmanager";
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
        const clientObj = projectObj?.client || task.project?.client;

        if (overviewClientFilter !== "All") {
          const cId = clientObj?._id || (typeof clientRaw === "string" ? clientRaw : null);
          if (cId !== overviewClientFilter) {
            return false;
          }
        }

        if (overviewPriorityFilter !== "All" && task.priority !== overviewPriorityFilter) {
          return false;
        }

        if (overviewStatusFilter !== "All" && task.status !== overviewStatusFilter) {
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
          const fDue = new Date(overviewEndDateFilter).setHours(23, 59, 59, 999);
          if (tDue > fDue) return false;
        }

        if (dateFilter !== "All") {
          const targetDate = task.startDate
            ? new Date(task.startDate)
            : task.dueDate
              ? new Date(task.dueDate)
              : task.createdAt
                ? new Date(task.createdAt)
                : null;

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
              if (targetDate < todayStart || targetDate > todayEnd) return false;
            } else if (dateFilter === "Yesterday") {
              const yesterdayStart = new Date(todayStart);
              yesterdayStart.setDate(yesterdayStart.getDate() - 1);
              const yesterdayEnd = new Date(todayEnd);
              yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);
              if (targetDate < yesterdayStart || targetDate > yesterdayEnd) return false;
            } else if (dateFilter === "This Week") {
              const dayOfWeek = now.getDay();
              const startOfWeek = new Date(todayStart);
              startOfWeek.setDate(
                startOfWeek.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1),
              );
              if (targetDate < startOfWeek || targetDate > todayEnd) return false;
            } else if (dateFilter === "This Month") {
              const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
              if (targetDate < startOfMonth || targetDate > todayEnd) return false;
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
        const projIdA = a.project?._id || a.project;
        const projectObjA = projects.find((p) => p._id === projIdA);
        const clientObjA = projectObjA?.client || a.project?.client;
        const clientNameA = (clientObjA?.companyName || "N/A").toLowerCase();

        const projIdB = b.project?._id || b.project;
        const projectObjB = projects.find((p) => p._id === projIdB);
        const clientObjB = projectObjB?.client || b.project?.client;
        const clientNameB = (clientObjB?.companyName || "N/A").toLowerCase();

        const isCompletedA = a.status === "Completed" ? 1 : 0;
        const isCompletedB = b.status === "Completed" ? 1 : 0;
        if (isCompletedA !== isCompletedB) {
          return isCompletedA - isCompletedB;
        }

        if (clientNameA < clientNameB) return -1;
        if (clientNameA > clientNameB) return 1;

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
  ]);

  return (
    <>
    <div className="bg-white dark:bg-[#11131e] overflow-hidden flex flex-col h-[calc(100vh-160px)]">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-3 pt-1 border-b border-slate-100 dark:border-white/5 relative z-30 shrink-0">
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            placeholder="Search task name or details..."
            value={projectSearch}
            onChange={(e) => setProjectSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 outline-none focus:border-blue-500 text-slate-800 dark:text-slate-200"
          />
        </div>

        <div className="flex items-center justify-end gap-2.5 w-full sm:w-auto">
          <div className="relative" ref={clientDropdownRef}>
            <button
              type="button"
              onClick={() => setShowClientDropdown((prev) => !prev)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-2xl border text-xs font-extrabold transition-all shadow-2xs cursor-pointer ${
                overviewClientFilter !== "All"
                  ? "bg-blue-50/80 border-blue-300 text-blue-800 dark:bg-blue-950/30 dark:border-blue-500/40 dark:text-blue-300"
                  : "bg-white dark:bg-[#151725] border-slate-200/90 dark:border-white/10 text-slate-800 dark:text-slate-200 hover:border-blue-500/50"
              }`}
            >
              <span className="truncate max-w-[90px]">
                {overviewClientFilter === "All"
                  ? "All Clients"
                  : clients?.find((c) => c._id === overviewClientFilter)?.companyName || "Client"}
              </span>
              <FiChevronDown
                size={13}
                className={`text-slate-400 transition-transform duration-200 ${
                  showClientDropdown ? "rotate-180" : ""
                }`}
              />
            </button>

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
                      ?.filter(c => c.companyName?.toLowerCase().includes(clientSearchQuery.toLowerCase()))
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
                        <ClientBadge client={client} size="md" className="w-full justify-start" />
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

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
              <span>{dateFilter === "All" ? "Date" : dateFilter}</span>
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

          <div className="relative" ref={overviewFilterRef}>
            <button
              type="button"
              onClick={() => setShowOverviewFilter(!showOverviewFilter)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-2xl border text-xs font-extrabold transition-all shadow-2xs cursor-pointer ${
                overviewPriorityFilter !== "All" ||
                overviewStatusFilter !== "All" ||
                overviewStartDateFilter ||
                overviewEndDateFilter
                  ? "bg-blue-50 border-blue-300 text-blue-600 dark:bg-blue-950/30 dark:border-blue-500/40 dark:text-blue-300"
                  : "bg-white dark:bg-[#151725] border-slate-200/90 dark:border-white/10 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900"
              }`}
            >
              <FiFilter size={14} className="text-blue-500" />
              <span>Filter</span>
              {(overviewPriorityFilter !== "All" ||
                overviewStatusFilter !== "All" ||
                overviewStartDateFilter ||
                overviewEndDateFilter) && (
                <span className="flex items-center justify-center bg-blue-600 dark:bg-[#3b82f6] text-white dark:text-black text-[9px] w-4 h-4 rounded-full font-black">
                  {
                    [
                      overviewPriorityFilter !== "All",
                      overviewStatusFilter !== "All",
                      !!overviewStartDateFilter,
                      !!overviewEndDateFilter,
                    ].filter(Boolean).length
                  }
                </span>
              )}
            </button>

            <AnimatePresence>
              {showOverviewFilter && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-72 bg-white dark:bg-[#151725] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl p-4 z-50 space-y-4 backdrop-blur-md"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-2">
                    <span className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                      Task Overview Filters
                    </span>
                    {(overviewPriorityFilter !== "All" ||
                      overviewStatusFilter !== "All" ||
                      overviewStartDateFilter ||
                      overviewEndDateFilter) && (
                      <button
                        type="button"
                        onClick={() => {
                          setOverviewPriorityFilter("All");
                          setOverviewStatusFilter("All");
                          setOverviewStartDateFilter("");
                          setOverviewEndDateFilter("");
                        }}
                        className="text-[10px] font-bold text-blue-500 hover:text-blue-600 transition-colors"
                      >
                        Clear All
                      </button>
                    )}
                  </div>

                  <div className="space-y-1 text-left">
                    <label className="text-[10px] font-bold text-slate-455 dark:text-slate-400 uppercase tracking-wider">
                      Status
                    </label>
                    <select
                      value={overviewStatusFilter}
                      onChange={(e) => setOverviewStatusFilter(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 outline-none focus:border-blue-500 text-slate-800 dark:text-slate-200 cursor-pointer"
                    >
                      <option value="All">All Statuses</option>
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                      <option value="On Hold">On Hold</option>
                    </select>
                  </div>

                  <div className="space-y-1 text-left">
                    <label className="text-[10px] font-bold text-slate-455 dark:text-slate-400 uppercase tracking-wider">
                      Priority
                    </label>
                    <select
                      value={overviewPriorityFilter}
                      onChange={(e) => setOverviewPriorityFilter(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 outline-none focus:border-blue-500 text-slate-800 dark:text-slate-200 cursor-pointer"
                    >
                      <option value="All">All Priorities</option>
                      <option value="Top High">Top High</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>

                  <div className="space-y-1 text-left">
                    <label className="text-[10px] font-bold text-slate-455 dark:text-slate-400 uppercase tracking-wider">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={overviewStartDateFilter}
                      onChange={(e) => setOverviewStartDateFilter(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 outline-none focus:border-blue-500 text-slate-800 dark:text-slate-200 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1 text-left">
                    <label className="text-[10px] font-bold text-slate-455 dark:text-slate-400 uppercase tracking-wider">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={overviewEndDateFilter}
                      onChange={(e) => setOverviewEndDateFilter(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 outline-none focus:border-blue-500 text-slate-800 dark:text-slate-200 cursor-pointer"
                    />
                  </div>
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
        <table className="w-full text-left border-collapse min-w-[1000px] table-auto">
          <thead className="sticky top-0 z-20 bg-slate-50 dark:bg-[#161826] shadow-sm">
            <tr className="border-b border-slate-200/80 dark:border-white/10 text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {!hiddenColumns.taskName && <th className="py-2.5 px-3.5">TASK NAME</th>}
              {!hiddenColumns.createdBy && <th className="py-2.5 px-3.5">CREATED BY</th>}
              {!hiddenColumns.clientName && <th className="py-2.5 px-3.5">CLIENT NAME</th>}
              {!hiddenColumns.assignee && <th className="py-2.5 px-3.5">ASSIGNEE</th>}
              {!hiddenColumns.startDate && <th className="py-2.5 px-3.5 text-center">START DATE</th>}
              {!hiddenColumns.dueDate && <th className="py-2.5 px-3.5 text-center">END DATE</th>}
              {!hiddenColumns.priority && <th className="py-2.5 px-3.5 text-center">PRIORITY</th>}
              {!hiddenColumns.status && <th className="py-2.5 px-3.5 text-center">STATUS</th>}
              {!hiddenColumns.totalHours && <th className="py-2.5 px-3.5 text-center">TOTAL HOURS</th>}
              {!hiddenColumns.action && <th className="py-2.5 px-3.5 text-right">ACTION</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-xs font-semibold">
            {filteredOverviewTasks.length === 0 ? (
              <tr>
                <td
                  colSpan={Object.values(hiddenColumns).filter((isHidden) => !isHidden).length}
                  className="py-8 text-center text-slate-400 font-bold"
                >
                  No tasks found.
                </td>
              </tr>
            ) : (
              filteredOverviewTasks
                .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                .map((task) => {
                const isCompleted = task.status === "Completed";
                const pStyle = getPriorityStyle(task.priority || "Medium");
                const sStyle = getStatusStyle(task.status, task.isBlocked);

                const projId = task.project?._id || task.project;
                const projectObj = projects.find((p) => p._id === projId);
                const clientRaw = projectObj?.client || task.project?.client;
                const clientId = clientRaw?._id || clientRaw;
                const clientObj = clients?.find((c) => c._id === clientId) || (typeof clientRaw === 'object' ? clientRaw : null);
                const clientName = clientObj?.companyName || "N/A";

                return (
                  <tr
                    key={task._id}
                    className={`hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors cursor-pointer border-b border-slate-50 dark:border-white/5 ${
                      isCompleted
                        ? "bg-slate-50/20 text-slate-400 dark:text-slate-500"
                        : "text-slate-800 dark:text-slate-100"
                    }`}
                    onClick={() => setSelectedTaskId(task._id)}
                  >
                    {!hiddenColumns.taskName && (
                      <td className="py-2 px-3.5 font-extrabold text-left">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTaskFieldChange(task._id, {
                                status: isCompleted ? "Pending" : "Completed"
                              });
                            }}
                            className={`w-4 h-4 rounded-full flex items-center justify-center border transition-all shrink-0 cursor-pointer ${
                              isCompleted
                                ? "bg-[#10b981] border-[#10b981] text-white shadow-sm"
                                : "bg-white dark:bg-[#151725] border-slate-300 dark:border-slate-650 text-slate-400 dark:text-slate-500 hover:border-[#10b981] hover:text-[#10b981]"
                            }`}
                          >
                            <FiCheck size={9} className={isCompleted ? "stroke-[4px]" : "opacity-0 hover:opacity-100"} />
                          </button>
                          <BiFile className="text-slate-400 shrink-0" size={13} />
                          <span className={`truncate max-w-[180px] text-[11px] ${isCompleted ? "line-through text-slate-400 dark:text-slate-500" : ""}`} title={task.title}>
                            {task.title}
                          </span>
                        </div>
                      </td>
                    )}

                    {!hiddenColumns.createdBy && (
                      <td className="py-2 px-3.5 text-left">
                        <div className="flex items-center gap-2.5">
                          <div className="relative shrink-0">
                            {(() => {
                              const createdUser = task.createdBy;
                              const avatarUrl =
                                (typeof createdUser?.profile?.profileImage === "object"
                                  ? createdUser?.profile?.profileImage?.url
                                  : createdUser?.profile?.profileImage) ||
                                (typeof createdUser?.profileImage === "object"
                                  ? createdUser?.profileImage?.url
                                  : createdUser?.profileImage) ||
                                createdUser?.profilePic ||
                                createdUser?.avatar ||
                                createdUser?.profile?.profilePic ||
                                createdUser?.profile?.avatar;

                              if (avatarUrl) {
                                return (
                                  <img
                                    src={avatarUrl}
                                    alt={createdUser?.name || "Creator"}
                                    className="w-8 h-8 rounded-full object-cover border border-slate-200/80 dark:border-white/10 shadow-sm"
                                  />
                                );
                              }

                              const initials = (createdUser?.name || "U")
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
                                  ((createdUser?.name || "U").charCodeAt(0) || 0) %
                                    AVATAR_COLORS.length
                                ];

                              return (
                                <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${colorClass} flex items-center justify-center text-white font-black text-[10px] border border-white/10 shadow-sm`}>
                                  {initials}
                                </div>
                              );
                            })()}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-extrabold text-[11px] text-slate-800 dark:text-slate-200">
                              {task.createdBy?.name || "Unknown"}
                            </span>
                            <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                              {task.createdBy?.department || "Creator"}
                            </span>
                          </div>
                        </div>
                      </td>
                    )}

                    {!hiddenColumns.clientName && (
                      <td className="py-2 px-3.5 text-left">
                        {clientObj && clientObj.companyName ? (
                          <ClientBadge client={clientObj} size="sm" />
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-pink-50 text-pink-600 border border-pink-100 dark:bg-pink-950/30 dark:text-pink-400 dark:border-pink-900/30">
                            {clientName}
                          </span>
                        )}
                      </td>
                    )}

                    {!hiddenColumns.assignee && (
                      <td className="py-2 px-3.5 text-left">
                        <div className="flex items-center gap-2.5">
                          <div className="relative shrink-0">
                            {(() => {
                              const assignedUser = task.assignedTo;
                              const avatarUrl =
                                (typeof assignedUser?.profile?.profileImage === "object"
                                  ? assignedUser?.profile?.profileImage?.url
                                  : assignedUser?.profile?.profileImage) ||
                                (typeof assignedUser?.profileImage === "object"
                                  ? assignedUser?.profileImage?.url
                                  : assignedUser?.profileImage) ||
                                assignedUser?.profilePic ||
                                assignedUser?.avatar ||
                                assignedUser?.profile?.profilePic ||
                                assignedUser?.profile?.avatar;

                              if (avatarUrl) {
                                return (
                                  <img
                                    src={avatarUrl}
                                    alt={assignedUser?.name || "Assignee"}
                                    className="w-8 h-8 rounded-full object-cover border border-slate-200/80 dark:border-white/10 shadow-sm"
                                  />
                                );
                              }

                              const initials = (assignedUser?.name || "U")
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
                                  ((assignedUser?.name || "U").charCodeAt(0) || 0) %
                                    AVATAR_COLORS.length
                                ];

                              return (
                                <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${colorClass} flex items-center justify-center text-white font-black text-[10px] border border-white/10 shadow-sm`}>
                                  {initials}
                                </div>
                              );
                            })()}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-extrabold text-[11px] text-slate-800 dark:text-slate-200">
                              {task.assignedTo?.name || "Unassigned"}
                            </span>
                            <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                              {task.assignedTo?.department || "Team Member"}
                            </span>
                          </div>
                        </div>
                      </td>
                    )}

                    {!hiddenColumns.startDate && (
                      <td className="py-2 px-3.5 text-center whitespace-nowrap">
                        {task.startDate ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200/50 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20 shadow-2xs">
                            <FiCalendar size={10} className="shrink-0" />
                            {formatDate(task.startDate)}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal text-[10px]">—</span>
                        )}
                      </td>
                    )}

                    {!hiddenColumns.dueDate && (
                      <td className="py-2 px-3.5 text-center whitespace-nowrap">
                        {task.dueDate ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200/50 dark:bg-rose-500/10 dark:text-rose-350 dark:border-rose-500/20 shadow-2xs">
                            <FiCalendar size={10} className="shrink-0" />
                            {formatDate(task.dueDate)}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal text-[10px]">—</span>
                        )}
                      </td>
                    )}

                    {!hiddenColumns.priority && (
                      <td className="py-2 px-3.5 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={task.priority || "Medium"}
                          onChange={(e) => handleTaskFieldChange(task._id, { priority: e.target.value })}
                          className={`px-1.5 py-0.5 text-[9px] rounded-lg font-bold uppercase border cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 bg-transparent ${pStyle}`}
                        >
                          <option value="Top High" className="bg-white dark:bg-[#151725] text-red-600">Top High</option>
                          <option value="High" className="bg-white dark:bg-[#151725] text-orange-600">High</option>
                          <option value="Medium" className="bg-white dark:bg-[#151725] text-blue-600">Medium</option>
                          <option value="Low" className="bg-white dark:bg-[#151725] text-slate-600">Low</option>
                        </select>
                      </td>
                    )}

                    {!hiddenColumns.status && (
                      <td className="py-2 px-3.5 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={task.status || "Pending"}
                          onChange={(e) => handleTaskFieldChange(task._id, { status: e.target.value })}
                          className={`px-2 py-0.5 rounded-lg text-[9px] font-black border uppercase tracking-wider cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm transition-colors ${
                            task.status === "Completed"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-550/30"
                              : task.status === "In Progress"
                              ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-550/30"
                              : task.status === "On Hold"
                              ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-550/30"
                              : task.status === "IN-REVIEW" || task.status === "In Review"
                              ? "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/20 dark:text-sky-355 dark:border-sky-550/30"
                              : task.status === "Rejected"
                              ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/20 dark:text-rose-355 dark:border-rose-550/30"
                              : "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-500/20 dark:text-slate-300 dark:border-slate-550/30"
                          }`}
                        >
                          <option value="Pending" className="bg-white dark:bg-[#151725] text-slate-700 dark:text-slate-300">Pending</option>
                          <option value="In Progress" className="bg-white dark:bg-[#151725] text-blue-700 dark:text-blue-400">In Progress</option>
                          <option value="IN-REVIEW" className="bg-white dark:bg-[#151725] text-sky-700 dark:text-sky-400">In Review</option>
                          <option value="Completed" className="bg-white dark:bg-[#151725] text-emerald-700 dark:text-emerald-400">Completed</option>
                          <option value="On Hold" className="bg-white dark:bg-[#151725] text-amber-700 dark:text-amber-400">On Hold</option>
                          <option value="Rejected" className="bg-white dark:bg-[#151725] text-rose-700 dark:text-rose-450">Rejected</option>
                        </select>
                      </td>
                    )}

                    {!hiddenColumns.totalHours && (
                      <td className="py-2 px-3.5 text-center whitespace-nowrap">
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
                      <td className="py-2 px-3.5 text-right" onClick={(e) => e.stopPropagation()}>
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
                              navigate(`/${userRole}/projects?id=${projId}`);
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

      {filteredOverviewTasks.length > itemsPerPage && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#161826] shrink-0 mt-auto">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
            {Math.min(currentPage * itemsPerPage, filteredOverviewTasks.length)}{" "}
            of {filteredOverviewTasks.length} tasks
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-white/5 transition-colors shadow-2xs cursor-pointer"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() =>
                setCurrentPage((prev) =>
                  currentPage * itemsPerPage < filteredOverviewTasks.length
                    ? prev + 1
                    : prev
                )
              }
              disabled={currentPage * itemsPerPage >= filteredOverviewTasks.length}
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
                          const projId = selectedTask.project?._id || selectedTask.project;
                          const projectObj = projects.find((p) => p._id === projId);
                          const clientRaw = projectObj?.client || selectedTask.project?.client;
                          const clientId = clientRaw?._id || clientRaw;
                          const clientObj = clients?.find((c) => c._id === clientId) || (typeof clientRaw === 'object' ? clientRaw : null);
                          
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
                  <FiAlertCircle className="text-red-600 dark:text-red-500" size={24} />
                </div>
                <h3 className="text-lg font-black text-slate-800 dark:text-white mb-2">
                  Delete Task
                </h3>
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-6">
                  Are you sure you want to delete this task? This action cannot be undone.
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
