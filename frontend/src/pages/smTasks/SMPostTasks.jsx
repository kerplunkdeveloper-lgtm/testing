import React, { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getProfile } from "../../features/profile/profileSlice";
import {
  FiCheckSquare,
  FiClock,
  FiPlayCircle,
  FiCheckCircle,
  FiAlertCircle,
  FiMinusCircle,
  FiSearch,
  FiFilter,
  FiDownload,
  FiPlus,
  FiMoreVertical,
  FiPhone,
  FiMessageSquare,
  FiThumbsUp,
  FiCalendar,
  FiChevronLeft,
  FiChevronRight,
  FiTrash2,
  FiEdit,
  FiUsers,
  FiZap,
} from "react-icons/fi";
import { FaInstagram, FaFacebook, FaLinkedin, FaYoutube, FaTwitter, FaTiktok, FaGoogle } from "react-icons/fa";
import { getSMTasks, createSMTask, updateSMTask, deleteSMTask, clearAllSMTasks } from "../../features/smTasks/smTaskApi";
import { getClientsAPI as getClients } from "../../features/clients/clientApi";
import { getUsersAPI } from "../../features/users/userApi";

const categoryColors = {
  Publishing: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  "Community Mgmt": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  "Review & Approval": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  "Content Planning": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  Coordination: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
  Reporting: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  "Shoot Management": "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  Documentation: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
  "Performance Support": "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
};

const statusStyles = {
  "To Do": "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300",
  "In Progress": "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400",
  Waiting: "bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400",
  Scheduled: "bg-cyan-50 text-cyan-600 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-400",
  Completed: "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400",
  Blocked: "bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400",
};

const priorityStyles = {
  High: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
  Medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  Low: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
};

const SMPostTasks = () => {
  const dispatch = useDispatch();
  const { user: currentUser } = useSelector((state) => state.auth || {});
  const { profile: currentProfile } = useSelector((state) => state.profile || {});

  useEffect(() => {
    if (!currentProfile) {
      dispatch(getProfile());
    }
  }, [dispatch, currentProfile]);

  const extractProfileImageUrl = (userOrProfileObj) => {
    if (!userOrProfileObj) return null;
    const img =
      userOrProfileObj.profileImage ||
      userOrProfileObj.avatar ||
      userOrProfileObj.profilePic ||
      userOrProfileObj.image ||
      userOrProfileObj.photo ||
      userOrProfileObj.profile?.profileImage;

    if (!img) return null;
    if (typeof img === "object" && img.url) return img.url;
    if (typeof img === "string" && img.trim() !== "") return img;
    return null;
  };

  const [tasks, setTasks] = useState([]);
  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilterTab, setActiveFilterTab] = useState("all");
  const [selectedClientFilter, setSelectedClientFilter] = useState("all");
  const [selectedTasks, setSelectedTasks] = useState([]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [tasksPerPage, setTasksPerPage] = useState(10);

  // Quick Add Form state
  const [newTaskClient, setNewTaskClient] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskCategory, setNewTaskCategory] = useState("Publishing");
  const [newTaskDueDate, setNewTaskDueDate] = useState(new Date().toISOString().split("T")[0]);
  const [newTaskDueTime, setNewTaskDueTime] = useState("06:00 PM");
  const [newTaskPriority, setNewTaskPriority] = useState("Medium");
  const [newTaskPlatforms, setNewTaskPlatforms] = useState(["Instagram", "Facebook"]);
  const [newTaskAssignee, setNewTaskAssignee] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Action Menu & Modal state
  const [openMenuTaskId, setOpenMenuTaskId] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Fetch tasks, clients, and users
  const fetchData = async () => {
    try {
      setLoading(true);
      const [tasksRes, clientsRes, usersRes] = await Promise.all([
        getSMTasks().catch(() => ({ success: false, data: [] })),
        getClients().catch(() => ({ success: false, data: [] })),
        getUsersAPI().catch(() => ({ success: false, data: [] })),
      ]);

      if (tasksRes && tasksRes.success && Array.isArray(tasksRes.data)) {
        setTasks(tasksRes.data);
      } else if (Array.isArray(tasksRes?.data)) {
        setTasks(tasksRes.data);
      } else {
        setTasks([]);
      }

      if (clientsRes && clientsRes.success && Array.isArray(clientsRes.data)) {
        setClients(clientsRes.data);
        if (clientsRes.data.length > 0 && !newTaskClient) {
          setNewTaskClient(clientsRes.data[0]._id);
        }
      } else if (Array.isArray(clientsRes?.data)) {
        setClients(clientsRes.data);
      } else {
        setClients([]);
      }

      const uData = Array.isArray(usersRes?.data) ? usersRes.data : Array.isArray(usersRes?.users) ? usersRes.users : Array.isArray(usersRes) ? usersRes : [];
      setUsers(uData);
    } catch (err) {
      console.error("Error fetching SM tasks data:", err);
      setTasks([]);
      setClients([]);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    const safeTasks = Array.isArray(tasks) ? tasks : [];
    return safeTasks.filter((task) => {
      if (!task) return false;
      // Client filter
      if (selectedClientFilter !== "all") {
        const cId = task.client?._id || task.client;
        if (cId !== selectedClientFilter) return false;
      }

      // Search term filter
      if (searchTerm.trim() !== "") {
        const query = searchTerm.toLowerCase();
        const matchesTitle = task.title?.toLowerCase().includes(query);
        const matchesClient = task.client?.companyName?.toLowerCase().includes(query);
        const matchesId = task.taskId?.toLowerCase().includes(query);
        const matchesCategory = task.category?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesClient && !matchesId && !matchesCategory) return false;
      }

      // Filter tabs
      const isToday = (dateStr) => {
        if (!dateStr) return false;
        const d = new Date(dateStr);
        return d.toDateString() === new Date().toDateString();
      };

      const isOverdue = (dateStr, status) => {
        if (!dateStr || status === "Completed") return false;
        const d = new Date(dateStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return d < today;
      };

      if (activeFilterTab === "today") return isToday(task.dueDate);
      if (activeFilterTab === "dueToday") return isToday(task.dueDate) && task.status !== "Completed";
      if (activeFilterTab === "overdue") return isOverdue(task.dueDate, task.status) || task.status === "Blocked";
      if (activeFilterTab === "completed") return task.status === "Completed";

      return true;
    });
  }, [tasks, selectedClientFilter, searchTerm, activeFilterTab]);

  // Statistics calculation
  const stats = useMemo(() => {
    const safeTasks = Array.isArray(tasks) ? tasks : [];
    const totalCount = safeTasks.length;
    const completed = safeTasks.filter((t) => t?.status === "Completed").length;
    const inProgress = safeTasks.filter((t) => t?.status === "In Progress").length;
    const waiting = safeTasks.filter((t) => t?.status === "Waiting").length;
    const blocked = safeTasks.filter((t) => t?.status === "Blocked").length;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdue = safeTasks.filter((t) => {
      if (!t?.dueDate || t?.status === "Completed") return false;
      const d = new Date(t.dueDate);
      d.setHours(0, 0, 0, 0);
      return d < today;
    }).length;

    const calcPct = (val) => (totalCount > 0 ? ((val / totalCount) * 100).toFixed(1) : "0.0");

    return {
      total: totalCount,
      completed,
      completedPct: calcPct(completed),
      inProgress,
      inProgressPct: calcPct(inProgress),
      waiting,
      waitingPct: calcPct(waiting),
      blocked,
      blockedPct: calcPct(blocked),
      overdue,
      overduePct: calcPct(overdue),
    };
  }, [tasks]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredTasks.length / tasksPerPage) || 1;
  const paginatedTasks = useMemo(() => {
    const start = (currentPage - 1) * tasksPerPage;
    return filteredTasks.slice(start, start + tasksPerPage);
  }, [filteredTasks, currentPage, tasksPerPage]);

  // Form submission (CREATE)
  const handleQuickAddSubmit = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !newTaskClient) return;

    try {
      setIsSubmitting(true);
      const res = await createSMTask({
        client: newTaskClient,
        title: newTaskTitle,
        category: newTaskCategory,
        dueDate: newTaskDueDate,
        dueTime: newTaskDueTime,
        priority: newTaskPriority,
        platform: newTaskPlatforms,
        status: "To Do",
        assignee: newTaskAssignee || currentUser?._id || currentUser?.id,
      });

      if (res.success) {
        setTasks((prev) => [res.data, ...prev]);
        setNewTaskTitle("");
        setIsAddModalOpen(false);
      }
    } catch (err) {
      console.error("Error creating task:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTemplateClick = (title, category) => {
    setNewTaskTitle(title);
    if (category) setNewTaskCategory(category);
  };

  // Open Edit Modal (UPDATE)
  const handleOpenEditModal = (task) => {
    const clientId = task.client?._id || task.client || "";
    let formattedDate = "2026-08-12";
    if (task.dueDate) {
      try {
        formattedDate = new Date(task.dueDate).toISOString().split("T")[0];
      } catch (e) {
        formattedDate = "2026-08-12";
      }
    }
    setEditingTask({
      ...task,
      client: clientId,
      dueDate: formattedDate,
      platform: Array.isArray(task.platform) ? task.platform : ["Instagram"],
    });
    setIsEditModalOpen(true);
    setOpenMenuTaskId(null);
  };

  // Submit Edit Form (UPDATE)
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingTask || !editingTask.title.trim()) return;

    try {
      setIsSubmitting(true);
      const res = await updateSMTask(editingTask._id, editingTask);
      if (res.success) {
        setTasks((prev) => prev.map((t) => (t._id === editingTask._id ? res.data : t)));
        setIsEditModalOpen(false);
        setEditingTask(null);
      }
    } catch (err) {
      console.error("Error updating task:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Status Change (UPDATE)
  const handleStatusChange = async (taskId, newStatus) => {
    try {
      const res = await updateSMTask(taskId, { status: newStatus });
      if (res.success) {
        setTasks((prev) => prev.map((t) => (t._id === taskId ? res.data : t)));
      }
    } catch (err) {
      console.error("Error updating status:", err);
    } finally {
      setOpenMenuTaskId(null);
    }
  };

  // Delete Task (DELETE)
  const handleDeleteTask = async (taskId) => {
    if (!window.confirm("Are you sure you want to delete this SM Task?")) return;
    try {
      const res = await deleteSMTask(taskId);
      if (res.success) {
        setTasks((prev) => prev.filter((t) => t._id !== taskId));
      }
    } catch (err) {
      console.error("Error deleting task:", err);
    } finally {
      setOpenMenuTaskId(null);
    }
  };

  // Bulk Delete Tasks (DELETE)
  const handleBulkDelete = async () => {
    if (selectedTasks.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedTasks.length} selected tasks?`)) return;

    try {
      setLoading(true);
      await Promise.all(selectedTasks.map((id) => deleteSMTask(id)));
      setTasks((prev) => prev.filter((t) => !selectedTasks.includes(t._id)));
      setSelectedTasks([]);
    } catch (err) {
      console.error("Error performing bulk delete:", err);
    } finally {
      setLoading(false);
    }
  };

  // Clear All Tasks (DELETE ALL)
  const handleClearAllTasks = async () => {
    if (!window.confirm("Are you sure you want to clear ALL tasks from the table and database?")) return;
    try {
      setLoading(true);
      await clearAllSMTasks();
      setTasks([]);
      setSelectedTasks([]);
    } catch (err) {
      console.error("Error clearing all tasks:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedTasks.length === paginatedTasks.length) {
      setSelectedTasks([]);
    } else {
      setSelectedTasks(paginatedTasks.map((t) => t._id));
    }
  };

  const toggleSelectTask = (id) => {
    setSelectedTasks((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const getClientBadgeColor = (name) => {
    const colors = [
      "bg-black text-white",
      "bg-emerald-600 text-white",
      "bg-sky-600 text-white",
      "bg-purple-600 text-white",
      "bg-rose-600 text-white",
      "bg-amber-600 text-white",
      "bg-indigo-600 text-white",
    ];
    let hash = 0;
    for (let i = 0; i < (name || "").length; i++) hash += name.charCodeAt(i);
    return colors[Math.abs(hash) % colors.length];
  };

  const getInitials = (name) => {
    if (!name) return "CL";
    const parts = name.split(" ");
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* FULL-WIDTH LAYOUT */}
      <div className="space-y-4">
        {/* 1. TOP SUMMARY STATS ROW */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
            {/* Total Tasks */}
            <div className="bg-white dark:bg-[#18233c] p-3 rounded-xl border border-slate-200/80 dark:border-white/10 shadow-xs flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-sm shrink-0">
                <FiCheckSquare />
              </div>
              <div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-none">Total Tasks</div>
                <div className="text-base font-bold text-slate-900 dark:text-white mt-1 leading-none">{stats.total}</div>
              </div>
            </div>

            {/* Completed */}
            <div className="bg-white dark:bg-[#18233c] p-3 rounded-xl border border-slate-200/80 dark:border-white/10 shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-sm shrink-0">
                  <FiCheckCircle />
                </div>
                <div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-none">Completed</div>
                  <div className="text-base font-bold text-slate-900 dark:text-white mt-1 leading-none">{stats.completed}</div>
                </div>
              </div>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400 px-1.5 py-0.5 rounded">
                {stats.completedPct}%
              </span>
            </div>

            {/* In Progress */}
            <div className="bg-white dark:bg-[#18233c] p-3 rounded-xl border border-slate-200/80 dark:border-white/10 shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center text-sm shrink-0">
                  <FiPlayCircle />
                </div>
                <div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-none">In Progress</div>
                  <div className="text-base font-bold text-slate-900 dark:text-white mt-1 leading-none">{stats.inProgress}</div>
                </div>
              </div>
              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded">
                {stats.inProgressPct}%
              </span>
            </div>

            {/* Waiting */}
            <div className="bg-white dark:bg-[#18233c] p-3 rounded-xl border border-slate-200/80 dark:border-white/10 shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center text-sm shrink-0">
                  <FiClock />
                </div>
                <div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-none">Waiting</div>
                  <div className="text-base font-bold text-slate-900 dark:text-white mt-1 leading-none">{stats.waiting}</div>
                </div>
              </div>
              <span className="text-[10px] font-bold text-purple-600 bg-purple-50 dark:bg-purple-900/30 dark:text-purple-400 px-1.5 py-0.5 rounded">
                {stats.waitingPct}%
              </span>
            </div>

            {/* Blocked */}
            <div className="bg-white dark:bg-[#18233c] p-3 rounded-xl border border-slate-200/80 dark:border-white/10 shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 flex items-center justify-center text-sm shrink-0">
                  <FiMinusCircle />
                </div>
                <div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-none">Blocked</div>
                  <div className="text-base font-bold text-slate-900 dark:text-white mt-1 leading-none">{stats.blocked}</div>
                </div>
              </div>
              <span className="text-[10px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-900/30 dark:text-rose-400 px-1.5 py-0.5 rounded">
                {stats.blockedPct}%
              </span>
            </div>

            {/* Overdue */}
            <div className="bg-white dark:bg-[#18233c] p-3 rounded-xl border border-slate-200/80 dark:border-white/10 shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center text-sm shrink-0">
                  <FiAlertCircle />
                </div>
                <div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-none">Overdue</div>
                  <div className="text-base font-bold text-slate-900 dark:text-white mt-1 leading-none">{stats.overdue}</div>
                </div>
              </div>
              <span className="text-[10px] font-bold text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400 px-1.5 py-0.5 rounded">
                {stats.overduePct}%
              </span>
            </div>
          </div>

          {/* HEADER CONTROLS BAR (Compact Matching 2nd Reference Design) */}
          <div className="bg-white dark:bg-[#18233c] p-2.5 sm:p-3 rounded-xl border border-slate-200/80 dark:border-white/10 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* FILTER TABS */}
            <div className="flex items-center gap-3 sm:gap-4 overflow-x-auto pb-1 md:pb-0">
              {[
                { id: "all", label: "All Tasks", count: tasks.length, badgeStyle: "active:bg-blue-600 active:text-white bg-blue-600 text-white" },
                { id: "today", label: "Today's Tasks", count: tasks.filter((t) => t.dueDate && new Date(t.dueDate).toDateString() === new Date().toDateString()).length, badgeStyle: "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300" },
                { id: "dueToday", label: "Due Today", count: tasks.filter((t) => t.status !== "Completed" && t.dueDate && new Date(t.dueDate).toDateString() === new Date().toDateString()).length, badgeStyle: "bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-300" },
                { id: "overdue", label: "Overdue", count: stats.overdue, badgeStyle: "bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-300" },
                { id: "completed", label: "Completed", count: stats.completed, badgeStyle: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300" },
              ].map((tab) => {
                const isActive = activeFilterTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveFilterTab(tab.id);
                      setCurrentPage(1);
                    }}
                    className={`flex items-center gap-1.5 text-[11px] transition-all whitespace-nowrap cursor-pointer py-0.5 ${
                      isActive
                        ? "text-blue-600 dark:text-blue-400 font-bold border-b-2 border-blue-600 dark:border-blue-400"
                        : "text-slate-600 dark:text-slate-300 font-semibold hover:text-slate-900 dark:hover:text-white border-b-2 border-transparent"
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
                        isActive
                          ? "bg-blue-600 text-white"
                          : tab.badgeStyle
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* SEARCH & ACTION BUTTONS */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1 md:w-48">
                
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1 text-[11px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Client filter */}
              <select
                value={selectedClientFilter}
                onChange={(e) => setSelectedClientFilter(e.target.value)}
                className="py-1 px-2 text-[11px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none"
              >
                <option value="all">All Clients</option>
                {clients.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.companyName}
                  </option>
                ))}
              </select>

              {selectedTasks.length > 0 && (
                <button
                  onClick={handleBulkDelete}
                  className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold flex items-center gap-1 shadow-xs transition-all cursor-pointer"
                >
                  <FiTrash2 className="text-xs" />
                  <span>Delete ({selectedTasks.length})</span>
                </button>
              )}

              {tasks.length > 0 && (
                <button
                  onClick={handleClearAllTasks}
                  className="px-2 py-1 rounded-lg border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer"
                  title="Clear all tasks"
                >
                  <FiTrash2 className="text-xs" />
                  <span className="hidden md:inline">Clear All</span>
                </button>
              )}

              <button
                onClick={() => setIsAddModalOpen(true)}
                className="px-3.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/20 transition-all cursor-pointer whitespace-nowrap"
              >
                <FiPlus className="text-xs" />
                <span>Add SM Task</span>
              </button>
            </div>
          </div>

          {/* TABLE CONTAINER (SaaS Full-Height View) */}
          <div className="bg-white dark:bg-[#18233c] rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-sm flex flex-col justify-between min-h-[520px] lg:min-h-[calc(100vh-250px)] overflow-hidden">
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200/80 dark:border-white/10 text-slate-500 dark:text-slate-400 font-bold text-[10px] uppercase tracking-wider sticky top-0 z-10 backdrop-blur-xs">
                    <th className="py-3 px-3 w-7"></th>
                    <th className="py-3 px-2.5">Client</th>
                    <th className="py-3 px-2.5">Task Category</th>
                    <th className="py-3 px-3">Task</th>
                    <th className="py-3 px-2.5">Platform</th>
                    <th className="py-3 px-2.5">Due</th>
                    <th className="py-3 px-2.5">Priority</th>
                    <th className="py-3 px-2.5">Status</th>
                    <th className="py-3 px-2.5">Blocker</th>
                    <th className="py-3 px-2.5">Assignee</th>
                    <th className="py-3 px-2.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {loading ? (
                    <tr>
                      <td colSpan="11" className="py-20 text-center text-slate-400 font-medium">
                        Loading Social Media Tasks...
                      </td>
                    </tr>
                  ) : paginatedTasks.length === 0 ? (
                    <tr>
                      <td colSpan="11" className="py-20 text-center text-slate-400">
                        <div className="max-w-xs mx-auto space-y-2">
                          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto text-xl">
                            <FiCheckSquare />
                          </div>
                          <div className="font-bold text-sm text-slate-700 dark:text-slate-200">No SM Tasks Found</div>
                          <p className="text-xs text-slate-400">
                            Create your first social media task using the Quick Add sidebar or templates.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedTasks.map((t) => {
                      const clientName = t.client?.companyName || "Unknown Client";
                      const isChecked = selectedTasks.includes(t._id);

                      return (
                        <tr
                          key={t._id}
                          className={`hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors ${
                            isChecked ? "bg-blue-50/40 dark:bg-blue-900/10" : ""
                          }`}
                        >
                          {/* Completed Shortcut */}
                          <td className="py-2 px-3">
                            <div 
                              onClick={() => handleStatusChange(t._id, t.status === "Completed" ? "To Do" : "Completed")}
                              className={`w-6 h-6 rounded-full border-[1.5px] flex items-center justify-center cursor-pointer shadow-sm transition-all duration-200 ${
                                t.status === "Completed" 
                                  ? "bg-emerald-500 border-emerald-500 scale-105" 
                                  : "border-slate-300 dark:border-slate-600 hover:border-emerald-400 dark:hover:border-emerald-500"
                              }`}
                              title="Mark as completed"
                            >
                              {t.status === "Completed" && (
                                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                          </td>

                          {/* Client */}
                          <td className="py-2 px-2.5">
                            <div className="flex items-center gap-1.5">
                              <div
                                className={`w-5 h-5 rounded ${getClientBadgeColor(
                                  clientName
                                )} flex items-center justify-center font-bold text-[9px] shrink-0`}
                              >
                                {getInitials(clientName)}
                              </div>
                              <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[110px]">
                                {clientName}
                              </span>
                            </div>
                          </td>

                          {/* Task Category */}
                          <td className="py-2 px-2.5">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap ${
                                categoryColors[t.category] || "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {t.category || "Publishing"}
                            </span>
                          </td>

                          {/* Task */}
                          <td className="py-2 px-3">
                            <div>
                              <div className="font-semibold text-slate-800 dark:text-slate-100 line-clamp-1">
                                {t.title}
                              </div>
                              {t.subType && (
                                <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                                  {t.subType}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Platform */}
                          <td className="py-2 px-2.5">
                            <div className="flex items-center gap-1.5 text-sm">
                              {t.platform?.includes("Instagram") && (
                                <FaInstagram className="text-pink-600 dark:text-pink-400" title="Instagram" />
                              )}
                              {t.platform?.includes("Facebook") && (
                                <FaFacebook className="text-blue-600 dark:text-blue-400" title="Facebook" />
                              )}
                              {t.platform?.includes("LinkedIn") && (
                                <FaLinkedin className="text-blue-700 dark:text-blue-400" title="LinkedIn" />
                              )}
                              {t.platform?.includes("YouTube") && (
                                <FaYoutube className="text-red-600 dark:text-red-400" title="YouTube" />
                              )}
                              {(t.platform?.includes("Google My Business") || t.platform?.includes("Google Business")) && (
                                <FaGoogle className="text-emerald-600 dark:text-emerald-400" title="Google My Business" />
                              )}
                              {(t.platform?.includes("X") || t.platform?.includes("Twitter")) && (
                                <FaTwitter className="text-sky-500 dark:text-sky-400" title="X / Twitter" />
                              )}
                              {t.platform?.includes("TikTok") && (
                                <FaTiktok className="text-slate-900 dark:text-white" title="TikTok" />
                              )}
                              {(!t.platform || t.platform.length === 0) && (
                                <span className="text-slate-400">-</span>
                              )}
                            </div>
                          </td>

                          {/* Due */}
                          <td className="py-2 px-2.5 whitespace-nowrap text-slate-600 dark:text-slate-300">
                            <div>
                              {t.dueDate
                                ? new Date(t.dueDate).toLocaleDateString("en-GB", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  })
                                : "-"}
                            </div>
                            <div className="text-[9px] text-slate-400">{t.dueTime || "-"}</div>
                          </td>

                          {/* Priority */}
                          <td className="py-2 px-2.5">
                            <span
                              className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
                                priorityStyles[t.priority] || priorityStyles.Medium
                              }`}
                            >
                              {t.priority || "Medium"}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="py-2 px-2.5">
                            <select
                              value={t.status || "To Do"}
                              onChange={(e) => handleStatusChange(t._id, e.target.value)}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold border cursor-pointer outline-none transition-all ${
                                statusStyles[t.status] || statusStyles["To Do"]
                              }`}
                            >
                              {["To Do", "In Progress", "Waiting", "Scheduled", "Completed", "Blocked"].map((st) => (
                                <option key={st} value={st} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-semibold">
                                  {st}
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* Blocker */}
                          <td className="py-2 px-2.5 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                            {t.blocker || "-"}
                          </td>

                          {/* Assignee / Creator Profile */}
                          <td className="py-2 px-2.5 whitespace-nowrap">
                            {(() => {
                              const userObj =
                                (typeof t.createdBy === "object" && t.createdBy) ||
                                (typeof t.assignee === "object" && t.assignee) ||
                                currentUser ||
                                {};

                              const userName = userObj.name || currentUser?.name || "Dharani H";
                              const department = userObj.department || currentProfile?.department || currentUser?.department || "Social Media Dept";

                              const userAvatarUrl =
                                extractProfileImageUrl(userObj) ||
                                extractProfileImageUrl(t.assignee) ||
                                extractProfileImageUrl(t.createdBy) ||
                                extractProfileImageUrl(currentProfile) ||
                                extractProfileImageUrl(currentUser);

                              return (
                                <div className="flex items-center gap-2">
                                  {userAvatarUrl ? (
                                    <img
                                      src={userAvatarUrl}
                                      alt={userName}
                                      className="w-7 h-7 rounded-full object-cover shadow-xs shrink-0 ring-2 ring-indigo-500/20"
                                      onError={(e) => {
                                        e.currentTarget.style.display = "none";
                                        if (e.currentTarget.nextElementSibling) {
                                          e.currentTarget.nextElementSibling.style.display = "flex";
                                        }
                                      }}
                                    />
                                  ) : null}
                                  <div
                                    style={{ display: userAvatarUrl ? "none" : "flex" }}
                                    className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center text-[10px] font-bold shadow-xs shrink-0 ring-2 ring-indigo-500/20"
                                  >
                                    {getInitials(userName)}
                                  </div>
                                  <div className="flex flex-col min-w-0">
                                    <span className="text-slate-900 dark:text-white font-bold text-[11px] truncate max-w-[110px] leading-tight">
                                      {userName}
                                    </span>
                                    <span className="text-[9px] text-indigo-600 dark:text-indigo-400 font-bold tracking-tight truncate max-w-[110px]">
                                      {department}
                                    </span>
                                  </div>
                                </div>
                              );
                            })()}
                          </td>

                          {/* Action */}
                          <td className="py-2 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleOpenEditModal(t)}
                                className="p-1.5 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all cursor-pointer"
                                title="Edit Task"
                              >
                                <FiEdit className="text-xs" />
                              </button>
                              <button
                                onClick={() => handleDeleteTask(t._id)}
                                className="p-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all cursor-pointer"
                                title="Delete Task"
                              >
                                <FiTrash2 className="text-xs" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* TABLE FOOTER & PAGINATION */}
            <div className="p-4 border-t border-slate-200/80 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
              <div>
                Showing {filteredTasks.length === 0 ? 0 : (currentPage - 1) * tasksPerPage + 1} to{" "}
                {Math.min(currentPage * tasksPerPage, filteredTasks.length)} of {filteredTasks.length} tasks
              </div>

              <div className="flex items-center gap-1">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-white/5"
                >
                  <FiChevronLeft />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                  <button
                    key={pg}
                    onClick={() => setCurrentPage(pg)}
                    className={`w-7 h-7 rounded-lg text-xs font-semibold ${
                      currentPage === pg
                        ? "bg-blue-600 text-white"
                        : "border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    {pg}
                  </button>
                ))}
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-white/5"
                >
                  <FiChevronRight />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span>Tasks per page:</span>
                <select
                  value={tasksPerPage}
                  onChange={(e) => {
                    setTasksPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="py-1 px-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-md text-slate-700 dark:text-slate-200"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>
          </div>

          {/* STATUS LEGEND & QUICK TIP */}
          <div className="bg-blue-50/50 dark:bg-blue-950/20 p-3 rounded-xl border border-blue-100 dark:border-blue-900/30 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                <span className="w-2 h-2 rounded-full bg-slate-400"></span> To Do
              </span>
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span> In Progress
              </span>
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                <span className="w-2 h-2 rounded-full bg-purple-500"></span> Waiting
              </span>
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                <span className="w-2 h-2 rounded-full bg-cyan-500"></span> Scheduled
              </span>
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Completed
              </span>
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span> Blocked
              </span>
            </div>

            <div className="text-blue-700 dark:text-blue-300 font-medium flex items-center gap-1.5">
              <FiZap className="text-blue-500" />
              <span>Quick Tip: Use quick templates or set recurring tasks to save time.</span>
            </div>
          </div>
        </div>

      {/* ADD TASK MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#18233c] w-full max-w-lg rounded-2xl border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <FiPlus className="text-blue-600" /> Add Social Media Task
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-base cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleQuickAddSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                  Client *
                </label>
                <select
                  value={newTaskClient}
                  onChange={(e) => setNewTaskClient(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500/20"
                  required
                >
                  <option value="">Select Client</option>
                  {clients.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.companyName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                  Task Title *
                </label>
                <input
                  type="text"
                  placeholder="What needs to be done?"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-slate-200 font-semibold focus:ring-2 focus:ring-blue-500/20"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                    Category
                  </label>
                  <select
                    value={newTaskCategory}
                    onChange={(e) => setNewTaskCategory(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-slate-200"
                  >
                    {Object.keys(categoryColors).map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                    Priority
                  </label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-slate-200"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                    Due Date *
                  </label>
                  <input
                    type="date"
                    value={newTaskDueDate}
                    onChange={(e) => setNewTaskDueDate(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-slate-200"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                    Due Time
                  </label>
                  <input
                    type="text"
                    value={newTaskDueTime}
                    onChange={(e) => setNewTaskDueTime(e.target.value)}
                    placeholder="06:00 PM"
                    className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>



              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                  Platforms
                </label>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {["Instagram", "Facebook", "LinkedIn", "YouTube", "Google My Business", "X", "TikTok"].map((plat) => {
                    const isSelected = newTaskPlatforms.includes(plat);
                    return (
                      <button
                        key={plat}
                        type="button"
                        onClick={() => {
                          setNewTaskPlatforms((prev) =>
                            prev.includes(plat)
                              ? prev.filter((p) => p !== plat)
                              : [...prev, plat]
                          );
                        }}
                        className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                          isSelected
                            ? "bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                            : "border-slate-200 dark:border-white/10 text-slate-500 hover:border-slate-300"
                        }`}
                      >
                        {plat === "Instagram" && <FaInstagram className="text-pink-600" />}
                        {plat === "Facebook" && <FaFacebook className="text-blue-600" />}
                        {plat === "LinkedIn" && <FaLinkedin className="text-blue-700" />}
                        {plat === "YouTube" && <FaYoutube className="text-red-600" />}
                        {plat === "Google My Business" && <FaGoogle className="text-emerald-600" />}
                        {plat === "X" && <FaTwitter className="text-sky-500" />}
                        {plat === "TikTok" && <FaTiktok className="text-slate-900 dark:text-white" />}
                        <span>{plat}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 font-semibold cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md shadow-blue-500/20 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? "Adding..." : "Add Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT TASK MODAL */}
      {isEditModalOpen && editingTask && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#18233c] w-full max-w-lg rounded-2xl border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <FiEdit className="text-blue-600" /> Edit Social Media Task ({editingTask.taskId})
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-base"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                  Client
                </label>
                <select
                  value={editingTask.client}
                  onChange={(e) => setEditingTask({ ...editingTask, client: e.target.value })}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-slate-200"
                >
                  {clients.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.companyName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                  Task Title
                </label>
                <input
                  type="text"
                  value={editingTask.title}
                  onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-slate-200 font-semibold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                    Category
                  </label>
                  <select
                    value={editingTask.category}
                    onChange={(e) => setEditingTask({ ...editingTask, category: e.target.value })}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-slate-200"
                  >
                    {Object.keys(categoryColors).map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                    Priority
                  </label>
                  <select
                    value={editingTask.priority}
                    onChange={(e) => setEditingTask({ ...editingTask, priority: e.target.value })}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-slate-200"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                    Status
                  </label>
                  <select
                    value={editingTask.status}
                    onChange={(e) => setEditingTask({ ...editingTask, status: e.target.value })}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-slate-200 font-bold"
                  >
                    {["To Do", "In Progress", "Waiting", "Scheduled", "Completed", "Blocked"].map(
                      (st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                    Blocker Note
                  </label>
                  <input
                    type="text"
                    value={editingTask.blocker || ""}
                    placeholder="e.g. Waiting for Client"
                    onChange={(e) => setEditingTask({ ...editingTask, blocker: e.target.value })}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={editingTask.dueDate}
                    onChange={(e) => setEditingTask({ ...editingTask, dueDate: e.target.value })}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                    Due Time
                  </label>
                  <input
                    type="text"
                    value={editingTask.dueTime || "06:00 PM"}
                    onChange={(e) => setEditingTask({ ...editingTask, dueTime: e.target.value })}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                  Platforms
                </label>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {["Instagram", "Facebook", "LinkedIn", "YouTube", "Google My Business", "X", "TikTok"].map((plat) => {
                    const isSelected = (editingTask.platform || []).includes(plat);
                    return (
                      <button
                        key={plat}
                        type="button"
                        onClick={() => {
                          const currentPlatforms = Array.isArray(editingTask.platform) ? editingTask.platform : [];
                          const nextPlatforms = currentPlatforms.includes(plat)
                            ? currentPlatforms.filter((p) => p !== plat)
                            : [...currentPlatforms, plat];
                          setEditingTask({ ...editingTask, platform: nextPlatforms });
                        }}
                        className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                          isSelected
                            ? "bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                            : "border-slate-200 dark:border-white/10 text-slate-500 hover:border-slate-300"
                        }`}
                      >
                        {plat === "Instagram" && <FaInstagram className="text-pink-600" />}
                        {plat === "Facebook" && <FaFacebook className="text-blue-600" />}
                        {plat === "LinkedIn" && <FaLinkedin className="text-blue-700" />}
                        {plat === "YouTube" && <FaYoutube className="text-red-600" />}
                        {plat === "Google My Business" && <FaGoogle className="text-emerald-600" />}
                        {plat === "X" && <FaTwitter className="text-sky-500" />}
                        {plat === "TikTok" && <FaTiktok className="text-slate-900 dark:text-white" />}
                        <span>{plat}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md shadow-blue-500/20"
                >
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SMPostTasks;
