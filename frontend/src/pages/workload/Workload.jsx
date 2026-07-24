import React, { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiUser,
  FiChevronDown,
  FiChevronRight,
  FiClock,
  FiBriefcase,
  FiX,
  FiCheckSquare,
  FiCalendar,
  FiFilter,
  FiActivity,
  FiUsers,
  FiTrendingUp,
  FiAlertCircle,
  FiTag,
  FiPieChart,
  FiCheck,
  FiPlus,
  FiAlertTriangle,
} from "react-icons/fi";
import {
  useGetTasksQuery,
  useGetProjectsQuery,
  useUpdateTaskMutation,
  useCreateTaskMutation,
} from "../../features/api/apiSlice";
import { getUsers } from "../../features/users/userSlice";
import toast from "react-hot-toast";

const Workload = () => {
  const dispatch = useDispatch();
  const { users = [], loading: usersLoading } = useSelector((state) => state.users);

  // Fetch tasks, projects, and mutations
  const { data: tasks = [], isLoading: tasksLoading } = useGetTasksQuery();
  const { data: projects = [] } = useGetProjectsQuery();
  const [updateTaskTrigger] = useUpdateTaskMutation();
  const [createTaskTrigger, { isLoading: isCreatingTask }] = useCreateTaskMutation();

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDept, setSelectedDept] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedUserId, setSelectedUserId] = useState(null);

  // Drawer Quick Task Creation State
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskProject, setNewTaskProject] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState("Medium");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");

  // Accordion state for departments (all open by default)
  const [collapsedDepts, setCollapsedDepts] = useState({});

  useEffect(() => {
    dispatch(getUsers());
  }, [dispatch]);

  // Set default project when drawer opens or projects change
  useEffect(() => {
    if (projects.length > 0 && !newTaskProject) {
      setNewTaskProject(projects[0]._id);
    }
  }, [projects, newTaskProject]);

  // Filter out administrators
  const eligibleUsers = useMemo(() => {
    return users.filter((u) => u.role !== "admin");
  }, [users]);

  // Calculate workloads and advanced metrics for each user
  const usersWithWorkload = useMemo(() => {
    return eligibleUsers.map((user) => {
      const userTasks = tasks.filter((t) => {
        const assignedId = t.assignedTo?._id || t.assignedTo;
        return assignedId === user._id;
      });

      const pending = userTasks.filter((t) => t.status === "Pending" || !t.status).length;
      const inProgress = userTasks.filter((t) => t.status === "In Progress").length;
      const completed = userTasks.filter((t) => t.status === "Completed").length;
      const onHold = userTasks.filter((t) => t.status === "On Hold").length;
      const total = userTasks.length;
      const active = pending + inProgress + onHold;

      // Overdue tasks check
      const now = new Date();
      const overdueTasks = userTasks.filter((t) => {
        if (t.status === "Completed" || !t.dueDate) return false;
        return new Date(t.dueDate) < now;
      });

      const capacity = user.capacity || 8;
      let status = "Available";
      let statusText = "Available for work";
      let ringColor = "ring-emerald-500/30 border-emerald-500/70";
      let pulseBg = "bg-emerald-500";
      let textClass = "text-emerald-600 dark:text-emerald-400";
      let badgeClass = "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20";
      let glowClass = "hover:shadow-[0_0_20px_rgba(16,185,129,0.15)] hover:border-emerald-500/30";

      if (active > 5) {
        status = "Overloaded";
        statusText = "Overburdened";
        ringColor = "ring-rose-500/40 border-rose-500/70";
        pulseBg = "bg-rose-500";
        textClass = "text-rose-600 dark:text-rose-400";
        badgeClass = "bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/20";
        glowClass = "hover:shadow-[0_0_20px_rgba(239,68,68,0.15)] hover:border-rose-500/30";
      } else if (active >= 2) {
        status = "Optimal";
        statusText = "Optimal capacity";
        ringColor = "ring-blue-500/30 border-blue-500/70";
        pulseBg = "bg-blue-500";
        textClass = "text-blue-600 dark:text-blue-400";
        badgeClass = "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20";
        glowClass = "hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] hover:border-blue-500/30";
      }

      return {
        ...user,
        tasks: userTasks,
        overdueCount: overdueTasks.length,
        overdueTasks,
        metrics: {
          pending,
          inProgress,
          completed,
          onHold,
          total,
          active,
          capacity,
          completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
        },
        workloadStatus: status,
        workloadText: statusText,
        styles: {
          ring: ringColor,
          pulse: pulseBg,
          text: textClass,
          badge: badgeClass,
          glow: glowClass,
        },
      };
    });
  }, [eligibleUsers, tasks]);

  // Unique departments list
  const departments = useMemo(() => {
    const depts = new Set();
    eligibleUsers.forEach((u) => {
      if (u.department) depts.add(u.department);
    });
    return ["All", ...Array.from(depts)];
  }, [eligibleUsers]);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return usersWithWorkload.filter((u) => {
      const matchesSearch =
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDept = selectedDept === "All" || u.department === selectedDept;
      const matchesStatus = selectedStatus === "All" || u.workloadStatus === selectedStatus;
      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [usersWithWorkload, searchTerm, selectedDept, selectedStatus]);

  // Grouped by department
  const groupedByDepartment = useMemo(() => {
    const groups = {};
    filteredUsers.forEach((u) => {
      const dept = u.department || "No Department";
      if (!groups[dept]) groups[dept] = [];
      groups[dept].push(u);
    });
    return groups;
  }, [filteredUsers]);

  // Global workload summary counts
  const summaryMetrics = useMemo(() => {
    const totalMembers = usersWithWorkload.length;
    const overloaded = usersWithWorkload.filter((u) => u.workloadStatus === "Overloaded").length;
    const optimal = usersWithWorkload.filter((u) => u.workloadStatus === "Optimal").length;
    const available = usersWithWorkload.filter((u) => u.workloadStatus === "Available").length;

    const totalActiveTasks = tasks.filter((t) => t.status !== "Completed").length;
    const totalOverdue = usersWithWorkload.reduce((sum, u) => sum + u.overdueCount, 0);

    return {
      totalMembers,
      overloaded,
      optimal,
      available,
      totalActiveTasks,
      totalOverdue,
    };
  }, [usersWithWorkload, tasks]);

  // Selected user details for drawer
  const selectedUser = useMemo(() => {
    return usersWithWorkload.find((u) => u._id === selectedUserId);
  }, [usersWithWorkload, selectedUserId]);

  // Toggle department accordion collapse
  const toggleDeptCollapse = (deptName) => {
    setCollapsedDepts((prev) => ({
      ...prev,
      [deptName]: !prev[deptName],
    }));
  };

  const handleUpdateTaskStatus = async (taskId, newStatus) => {
    try {
      await updateTaskTrigger({ id: taskId, taskData: { status: newStatus } }).unwrap();
      toast.success("Task status updated");
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  // Create and assign task directly from workload view
  const handleAssignTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !newTaskProject || !selectedUserId) return;

    try {
      await createTaskTrigger({
        title: newTaskTitle.trim(),
        project: newTaskProject,
        assignedTo: selectedUserId,
        status: "Pending",
        priority: newTaskPriority,
        dueDate: newTaskDueDate || null,
      }).unwrap();

      toast.success(`Task assigned to ${selectedUser.name}!`);
      setNewTaskTitle("");
      setNewTaskDueDate("");
      setShowAssignForm(false);
    } catch (err) {
      toast.error("Failed to create and assign task");
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case "Completed":
        return "bg-emerald-50 text-emerald-700 border-emerald-250 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40";
      case "In Progress":
        return "bg-blue-50 text-blue-700 border-blue-250 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/40";
      case "On Hold":
        return "bg-amber-50 text-amber-700 border-amber-250 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40";
      default:
        return "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700";
    }
  };

  const getPriorityStyle = (priority) => {
    switch (priority) {
      case "Top High":
        return "badge-priority-top-high";
      case "High":
        return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800";
      case "Medium":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800";
      default:
        return "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-805 dark:text-slate-300 dark:border-slate-800";
    }
  };

  const isLoading = usersLoading || tasksLoading;

  return (
    <div className="p-1 space-y-6 pb-16 theme-bg-main">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black theme-text-primary flex items-center gap-2">
            <span className="p-2.5 rounded-2xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400">
              <FiActivity className="animate-pulse" />
            </span>
            Workload Management
          </h1>
          <p className="text-xs md:text-sm theme-text-secondary mt-1">
            Real-time visual monitoring of resource allocations, capacities, and active deliverables.
          </p>
        </div>
      </div>

      {/* METRIC HIGHLIGHTS */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Total Members */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-650 text-white border-transparent p-4.5 rounded-2xl shadow-lg hover:scale-[1.02] transition-all duration-300 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-blue-100/90 uppercase tracking-wider block">
              Active Resources
            </span>
            <span className="text-2xl font-black text-white">
              {summaryMetrics.totalMembers}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/20 text-white flex items-center justify-center shrink-0">
            <FiUsers size={18} />
          </div>
        </div>

        {/* Overloaded */}
        <div className="bg-gradient-to-br from-red-500 to-rose-600 text-white border-transparent p-4.5 rounded-2xl shadow-lg hover:scale-[1.02] transition-all duration-300 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-rose-100/90 uppercase tracking-wider block">
              Overloaded (&gt; 5)
            </span>
            <span className="text-2xl font-black text-white">
              {summaryMetrics.overloaded}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/20 text-white flex items-center justify-center shrink-0">
            <FiAlertCircle size={18} />
          </div>
        </div>

        {/* Optimal */}
        <div className="bg-gradient-to-br from-sky-500 to-blue-600 text-white border-transparent p-4.5 rounded-2xl shadow-lg hover:scale-[1.02] transition-all duration-300 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-sky-100/90 uppercase tracking-wider block">
              Optimal Level
            </span>
            <span className="text-2xl font-black text-white">
              {summaryMetrics.optimal}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/20 text-white flex items-center justify-center shrink-0">
            <FiTrendingUp size={18} />
          </div>
        </div>

        {/* Available */}
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-transparent p-4.5 rounded-2xl shadow-lg hover:scale-[1.02] transition-all duration-300 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-emerald-100/90 uppercase tracking-wider block">
              Available
            </span>
            <span className="text-2xl font-black text-white">
              {summaryMetrics.available}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/20 text-white flex items-center justify-center shrink-0">
            <FiCheckSquare size={18} />
          </div>
        </div>

        {/* Total Overdue Tasks */}
        <div className="col-span-2 lg:col-span-1 bg-gradient-to-br from-amber-500 to-orange-600 text-white border-transparent p-4.5 rounded-2xl shadow-lg hover:scale-[1.02] transition-all duration-300 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-amber-100/90 uppercase tracking-wider block">
              Overdue Tasks
            </span>
            <span className="text-2xl font-black text-white">
              {summaryMetrics.totalOverdue}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/20 text-white flex items-center justify-center shrink-0">
            <FiAlertTriangle size={18} />
          </div>
        </div>
      </div>

      {/* FILTER & TABS */}
      <div className="space-y-4 bg-white dark:bg-[#0f172a] p-4.5 rounded-2xl border theme-border shadow-sm">
        <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center">
          {/* Search Box */}
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search team members by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-slate-400 dark:placeholder-slate-500 transition-all"
            />
          
          </div>

          {/* Allocation Level Filters (Tabs style) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            <span className="text-[10px] font-black theme-text-secondary uppercase tracking-wider mr-2 shrink-0">
              Workload Level:
            </span>
            {["All", "Overloaded", "Optimal", "Available"].map((status) => {
              const isActive = selectedStatus === status;
              const count =
                status === "All"
                  ? summaryMetrics.totalMembers
                  : status === "Overloaded"
                  ? summaryMetrics.overloaded
                  : status === "Optimal"
                  ? summaryMetrics.optimal
                  : summaryMetrics.available;

              return (
                <button
                  key={status}
                  onClick={() => setSelectedStatus(status)}
                  className={`dept-filter-tab px-3.5 py-1.5 text-[10px] flex items-center gap-1.5 ${
                    isActive ? "dept-filter-tab-active" : "dept-filter-tab-inactive"
                  }`}
                >
                  {status}
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[8px] font-black ${
                      isActive ? "bg-white/20 text-white animate-pulse" : "bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Horizontal Scrollable Department Selection Tabs */}
        <div className="flex items-center gap-1.5 border-t theme-border pt-4 overflow-x-auto pb-1">
          <span className="text-[10px] font-black theme-text-secondary uppercase tracking-wider mr-2 shrink-0">
            Departments:
          </span>
          {departments.map((dept) => {
            const isActive = selectedDept === dept;
            const count =
              dept === "All"
                ? eligibleUsers.length
                : eligibleUsers.filter((u) => u.department === dept).length;

            return (
              <button
                key={dept}
                onClick={() => setSelectedDept(dept)}
                className={`dept-filter-tab px-3.5 py-1.5 text-[10px] flex items-center gap-1.5 ${
                  isActive ? "dept-filter-tab-active" : "dept-filter-tab-inactive"
                }`}
              >
                {dept}
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[8px] font-black ${
                    isActive ? "bg-white/20 text-white animate-pulse" : "bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* DEPARTMENT-WISE CONTENT BOARDS */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs theme-text-secondary font-black tracking-wide">COMPILING RESOURCING CHARTS...</span>
        </div>
      ) : Object.keys(groupedByDepartment).length > 0 ? (
        <div className="space-y-8">
          {Object.entries(groupedByDepartment).map(([deptName, deptUsers]) => {
            const isCollapsed = !!collapsedDepts[deptName];
            const overloadedCount = deptUsers.filter((u) => u.workloadStatus === "Overloaded").length;
            const totalTasksInDept = deptUsers.reduce((sum, u) => sum + u.metrics.total, 0);
            const activeTasksInDept = deptUsers.reduce((sum, u) => sum + u.metrics.active, 0);

            return (
              <div
                key={deptName}
                className="theme-bg-card border theme-border rounded-2xl shadow-sm overflow-hidden transition-all duration-200"
              >
                {/* Accordion header block */}
                <div
                  onClick={() => toggleDeptCollapse(deptName)}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/10 border-b theme-border cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-slate-455 transition-transform duration-200 ${
                        isCollapsed ? "rotate-0" : "rotate-90"
                      }`}
                    >
                      <FiChevronRight size={16} />
                    </span>
                    <div>
                      <h2 className="text-sm font-black theme-text-primary uppercase tracking-wider flex items-center gap-2">
                        {deptName}
                      </h2>
                      <p className="text-[10px] theme-text-secondary font-bold mt-0.5 uppercase tracking-wide">
                        {deptUsers.length} {deptUsers.length === 1 ? "Staff resource" : "Staff resources"}
                      </p>
                    </div>
                  </div>

                  {/* Summary badges for department */}
                  <div className="flex flex-wrap items-center gap-2.5 text-[9px] font-bold">
                    <div className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-805 text-slate-600 dark:text-slate-350 border theme-border">
                      Active deliverables: <span className="font-black theme-text-primary">{activeTasksInDept}</span> / {totalTasksInDept}
                    </div>

                    {overloadedCount > 0 && (
                      <div className="px-2.5 py-1 rounded bg-rose-500/10 text-rose-500 border border-rose-500/20">
                        {overloadedCount} Overloaded
                      </div>
                    )}
                  </div>
                </div>

                {/* Staff Cards Grid */}
                <AnimatePresence initial={false}>
                  {!isCollapsed && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="p-5 bg-slate-50/30 dark:bg-slate-900/10"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                        {deptUsers.map((user) => {
                          const avatarUrl = user.profile?.profileImage?.url || user.profileImage?.url;
                          const initial = user.name?.charAt(0).toUpperCase() || "?";

                          return (
                            <motion.div
                              layout
                              whileHover={{ y: -3, transition: { duration: 0.15 } }}
                              key={user._id}
                              onClick={() => setSelectedUserId(user._id)}
                              className={`theme-bg-card border theme-border rounded-2xl p-5 shadow-md hover:shadow-xl dark:shadow-[#000000]/60 transition-all duration-300 cursor-pointer flex flex-col justify-between ${user.styles.glow}`}
                            >
                              <div>
                                {/* Row 1: Profile & Status Badge */}
                                <div className="flex justify-between items-start mb-4">
                                  <div className="flex gap-3.5 items-center">
                                    <div className="relative shrink-0">
                                      {avatarUrl ? (
                                        <img
                                          src={avatarUrl}
                                          alt={user.name}
                                          className={`w-11.5 h-11.5 rounded-full object-cover shadow-sm ring-3 ${user.styles.ring}`}
                                        />
                                      ) : (
                                        <div className="w-11.5 h-11.5 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 dark:from-[#3b82f6] dark:to-emerald-400 flex items-center justify-center text-white dark:text-black font-black text-base shadow-sm ring-3 ring-slate-100 dark:ring-slate-800">
                                          {initial}
                                        </div>
                                      )}
                                      {/* Glowing activity dot based on status */}
                                      <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-slate-800 shadow-sm ${user.styles.pulse}`} />
                                    </div>

                                    <div className="min-w-0">
                                      <h3 className="text-xs font-black theme-text-primary truncate">
                                        {user.name}
                                      </h3>
                                      <p className="text-[10px] theme-text-secondary truncate uppercase tracking-wider font-extrabold mt-0.5">
                                        {user.role === "operationmanager" ? "Operation Manager" : "Team Member"}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Workload Pill */}
                                  <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border ${user.styles.badge}`}>
                                    {user.workloadStatus}
                                  </span>
                                </div>

                                {/* Row 2: Visual Workload Allocation Gauge */}
                                <div className="space-y-1.5 mb-4">
                                  <div className="flex justify-between text-[10px] font-bold">
                                    <span className="theme-text-secondary">Workload Allocation</span>
                                    <span className="theme-text-primary font-black">
                                      {user.metrics.active} / {user.metrics.capacity} tasks
                                    </span>
                                  </div>

                                  {/* Multi-segment allocation indicator bar */}
                                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden flex">
                                    {/* In Progress */}
                                    <div
                                      style={{ width: `${(user.metrics.inProgress / user.metrics.capacity) * 105}%` }}
                                      className="bg-blue-500 dark:bg-[#3b82f6] h-full shrink-0"
                                      title="In Progress"
                                    />
                                    {/* Pending */}
                                    <div
                                      style={{ width: `${(user.metrics.pending / user.metrics.capacity) * 105}%` }}
                                      className="bg-amber-400 h-full shrink-0"
                                      title="Pending"
                                    />
                                    {/* On Hold */}
                                    <div
                                      style={{ width: `${(user.metrics.onHold / user.metrics.capacity) * 105}%` }}
                                      className="bg-purple-500 h-full shrink-0"
                                      title="On Hold"
                                    />
                                  </div>
                                </div>

                                {/* Row 3: Allocation Metrics Box */}
                                <div className="grid grid-cols-4 gap-1 p-2 rounded-xl bg-slate-100/50 dark:bg-slate-850/60 border border-slate-200 dark:border-slate-800 text-center mb-4 text-[9px]">
                                  <div>
                                    <span className="font-bold theme-text-secondary block">Active</span>
                                    <span className="text-xs font-black theme-text-primary">{user.metrics.active}</span>
                                  </div>
                                  <div>
                                    <span className="font-bold theme-text-secondary block">Completed</span>
                                    <span className="text-xs font-black text-emerald-500">{user.metrics.completed}</span>
                                  </div>
                                  <div>
                                    <span className="font-bold theme-text-secondary block">Overdue</span>
                                    <span className={`text-xs font-black ${user.overdueCount > 0 ? "text-rose-500" : "theme-text-secondary"}`}>
                                      {user.overdueCount}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="font-bold theme-text-secondary block">Capacity</span>
                                    <span className="text-xs font-black theme-text-secondary">{user.metrics.capacity}</span>
                                  </div>
                                </div>

                                {/* Row 4: Currently Assigned Tasks board */}
                                <div className="space-y-1.5">
                                  <div className="flex justify-between items-center text-[9px] font-black theme-text-secondary uppercase tracking-wider mb-1">
                                    <span>Active Deliverables</span>
                                    <span>Status</span>
                                  </div>

                                  {user.tasks.filter((t) => t.status !== "Completed").length > 0 ? (
                                    user.tasks
                                      .filter((t) => t.status !== "Completed")
                                      .slice(0, 3)
                                      .map((task) => (
                                        <div
                                          key={task._id}
                                          className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-150 dark:border-slate-800 text-[10px] group/task"
                                        >
                                          <span className="font-semibold theme-text-primary truncate max-w-[140px] group-hover/task:text-blue-500 transition-colors">
                                            {task.title}
                                          </span>
                                          <span className={`px-2 py-0.5 rounded text-[8px] font-black ${getStatusStyle(task.status)}`}>
                                            {task.status}
                                          </span>
                                        </div>
                                      ))
                                  ) : (
                                    <div className="p-3 text-center bg-slate-100/50 dark:bg-slate-850/30 border border-dashed theme-border rounded-xl text-[10px] theme-text-secondary italic">
                                      No active deliverables. Available!
                                    </div>
                                  )}

                                  {user.tasks.filter((t) => t.status !== "Completed").length > 3 && (
                                    <span className="text-[9.5px] text-indigo-500 dark:text-[#3b82f6] font-bold hover:underline block mt-1.5 text-right">
                                      + {user.tasks.filter((t) => t.status !== "Completed").length - 3} more deliverables
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Row 5: Card footer info */}
                              <div className="mt-4 pt-3.5 border-t theme-border flex items-center justify-between text-[9.5px] font-bold theme-text-secondary uppercase tracking-wider">
                                <span>Efficiency:</span>
                                <span className="theme-text-primary font-black">{user.metrics.completionRate}% completion</span>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="theme-bg-card border theme-border rounded-2xl py-20 flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 rounded-full theme-bg-main flex items-center justify-center mb-3.5 theme-text-secondary">
            <FiActivity size={24} />
          </div>
          <h4 className="text-sm font-black theme-text-primary">No workload reports found</h4>
          <p className="text-xs theme-text-secondary mt-1.5 max-w-sm leading-normal">
            We couldn't locate any matching staff records. Try clearing your filters or widening your search term.
          </p>
        </div>
      )}

      {/* RESOURCE DETAILS SIDE DRAWER */}
      <AnimatePresence>
        {selectedUserId && selectedUser && (
          <div className="fixed inset-0 z-[200] flex justify-end">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedUserId(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
            />

            {/* Sliding Panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", ease: "easeOut", duration: 0.3 }}
              className="relative w-full max-w-lg bg-white dark:bg-[#0f172a] h-full shadow-[0_0_50px_rgba(0,0,0,0.15)] flex flex-col z-10 border-l theme-border"
            >
              {/* Header */}
              <div className="p-6 border-b theme-border flex justify-between items-center theme-bg-main">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-sm shrink-0">
                    <FiActivity size={18} />
                  </div>
                  <div>
                    <h2 className="text-sm font-black theme-text-primary tracking-wider uppercase">
                      Resource Workspace
                    </h2>
                    <p className="text-[10px] theme-text-secondary font-bold tracking-wider mt-0.5 uppercase">
                      Inspect & Modify Task Allocations
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedUserId(null)}
                  className="w-8 h-8 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center theme-text-secondary hover:theme-text-primary transition-colors"
                >
                  <FiX size={18} />
                </button>
              </div>

              {/* Scrollable Workspace Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Profile Card Summary */}
                <div className="flex gap-4 items-center bg-slate-50 dark:bg-slate-850 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
                  {selectedUser.profile?.profileImage?.url || selectedUser.profileImage?.url ? (
                    <img
                      src={selectedUser.profile?.profileImage?.url || selectedUser.profileImage?.url}
                      alt={selectedUser.name}
                      className={`w-14 h-14 rounded-full object-cover shadow-sm ring-3 ${selectedUser.styles.ring}`}
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 dark:from-[#3b82f6] dark:to-emerald-400 flex items-center justify-center text-white dark:text-black font-black text-xl shadow-sm">
                      {selectedUser.name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <h3 className="text-sm font-black theme-text-primary leading-tight">{selectedUser.name}</h3>
                    <p className="text-xs theme-text-secondary mt-0.5">{selectedUser.email}</p>
                    <div className="flex gap-2 mt-2">
                      <span className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-extrabold theme-text-secondary border theme-border uppercase tracking-wider">
                        {selectedUser.department || "No Department"}
                      </span>
                      <span className={`px-2.5 py-1 rounded text-[10px] font-extrabold uppercase tracking-wider border ${selectedUser.styles.badge}`}>
                        {selectedUser.workloadStatus}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Resource Health Warnings Card */}
                {selectedUser.overdueCount > 0 && (
                  <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 dark:bg-amber-900/10 dark:border-amber-900/30 flex gap-3">
                    <FiAlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={16} />
                    <div className="space-y-1">
                      <h4 className="text-xs font-black text-amber-800 dark:text-amber-450">Resourcing Alert: Overdue Tasks</h4>
                      <p className="text-[10px] text-amber-705 dark:text-amber-300 leading-normal font-medium">
                        This resource currently has {selectedUser.overdueCount} active tasks past their designated due date. Adjust deadlines or reassign tasks if necessary.
                      </p>
                    </div>
                  </div>
                )}

                {/* Capacity Statistics Dashboard */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-black theme-text-secondary uppercase tracking-wider">Allocation Health Metrics</h4>
                  <div className="grid grid-cols-4 gap-2.5">
                    <div className="p-3 bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 rounded-xl text-center">
                      <span className="text-[9px] font-bold theme-text-secondary block uppercase tracking-wider">Assigned</span>
                      <span className="text-base font-black theme-text-primary">{selectedUser.metrics.total}</span>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 rounded-xl text-center">
                      <span className="text-[9px] font-bold theme-text-secondary block uppercase tracking-wider">Active</span>
                      <span className="text-base font-black text-indigo-500 dark:text-[#3b82f6]">{selectedUser.metrics.active}</span>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 rounded-xl text-center">
                      <span className="text-[9px] font-bold theme-text-secondary block uppercase tracking-wider">Overdue</span>
                      <span className={`text-base font-black ${selectedUser.overdueCount > 0 ? "text-rose-500" : "theme-text-secondary"}`}>
                        {selectedUser.overdueCount}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 rounded-xl text-center">
                      <span className="text-[9px] font-bold theme-text-secondary block uppercase tracking-wider">Capacity</span>
                      <span className="text-base font-black theme-text-secondary">{selectedUser.metrics.capacity}</span>
                    </div>
                  </div>
                </div>

                {/* Task Assignment Board (Category sections) */}
                <div className="space-y-4 pt-4 border-t theme-border">
                  <div className="flex justify-between items-center">
                    <h4 className="text-[10px] font-black theme-text-secondary uppercase tracking-widest flex items-center gap-1.5">
                      <FiBriefcase size={12} /> Resource Allocation Board
                    </h4>

                    {/* Quick Assign Trigger */}
                    <button
                      onClick={() => setShowAssignForm(!showAssignForm)}
                      className="px-2.5 py-1 text-[9px] font-black rounded-lg border theme-border hover:bg-slate-50 dark:hover:bg-slate-800 text-indigo-650 dark:text-blue-400 flex items-center gap-1.5 uppercase transition-all"
                    >
                      <FiPlus size={10} /> Assign Initiative
                    </button>
                  </div>

                  {/* Form to quickly assign task directly to this user */}
                  <AnimatePresence>
                    {showAssignForm && (
                      <motion.form
                        onSubmit={handleAssignTask}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="p-4 bg-slate-100/50 dark:bg-slate-850 border theme-border rounded-xl space-y-4"
                      >
                        <div className="space-y-1">
                          <label className="text-[9px] font-black theme-text-secondary uppercase tracking-wider block">
                            Initiative Title
                          </label>
                          <input
                            type="text"
                            required
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.target.value)}
                            placeholder="Type task details..."
                            className="w-full px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[9px] font-black theme-text-secondary uppercase tracking-wider block">
                              Associated Project
                            </label>
                            <select
                              value={newTaskProject}
                              onChange={(e) => setNewTaskProject(e.target.value)}
                              className="w-full px-2 py-1.5 text-xs focus:ring-1 focus:ring-blue-500"
                            >
                              {projects.map((proj) => (
                                <option key={proj._id} value={proj._id}>
                                  {proj.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] font-black theme-text-secondary uppercase tracking-wider block">
                              Priority
                            </label>
                            <select
                              value={newTaskPriority}
                              onChange={(e) => setNewTaskPriority(e.target.value)}
                              className="w-full px-2 py-1.5 text-xs focus:ring-1 focus:ring-blue-500"
                            >
                              <option value="Low">Low Priority</option>
                              <option value="Medium">Medium Priority</option>
                              <option value="High">High Priority</option>
                              <option value="Top High">Top High Priority</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 items-end">
                          <div className="space-y-1">
                            <label className="text-[9px] font-black theme-text-secondary uppercase tracking-wider block">
                              Target Date
                            </label>
                            <input
                              type="date"
                              value={newTaskDueDate}
                              onChange={(e) => setNewTaskDueDate(e.target.value)}
                              className="w-full px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-blue-500"
                            />
                          </div>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setShowAssignForm(false)}
                              className="flex-1 py-2 text-[10px] font-bold rounded-lg border theme-border hover:bg-slate-100 dark:hover:bg-slate-800 theme-text-secondary transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={isCreatingTask}
                              className="flex-1 py-2 text-[10px] font-black rounded-lg bg-blue-650 hover:bg-blue-600 dark:bg-blue-600 text-white disabled:opacity-50 transition-colors"
                            >
                              {isCreatingTask ? "Assigning..." : "Assign"}
                            </button>
                          </div>
                        </div>
                      </motion.form>
                    )}
                  </AnimatePresence>

                  {/* Tasks List */}
                  <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                    {selectedUser.tasks.length > 0 ? (
                      selectedUser.tasks.map((task) => (
                        <div
                          key={task._id}
                          className="bg-slate-50 dark:bg-slate-850 p-4 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                        >
                          <div className="space-y-1 min-w-0">
                            <h5 className="text-xs font-black theme-text-primary truncate">
                              {task.title}
                            </h5>
                            <div className="flex flex-wrap items-center gap-2.5 text-[10px] font-semibold">
                              {task.project && (
                                <span className="font-black text-indigo-500 dark:text-[#3b82f6] max-w-[120px] truncate">
                                  {task.project.name || "Project"}
                                </span>
                              )}
                              {task.dueDate && (
                                <span className="theme-text-secondary flex items-center gap-1">
                                  <FiCalendar size={10} />
                                  {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                </span>
                              )}
                              <span className={`px-2 py-0.5 rounded border text-[8px] font-black uppercase ${getPriorityStyle(task.priority)}`}>
                                {task.priority || "Medium"}
                              </span>
                            </div>
                          </div>

                          {/* Quick Status Update Selector */}
                          <div className="shrink-0 select-none">
                            <select
                              value={task.status}
                              onChange={(e) => handleUpdateTaskStatus(task._id, e.target.value)}
                              className={`border rounded-lg px-2.5 py-1 text-[10px] font-extrabold cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors ${getStatusStyle(task.status)}`}
                            >
                              <option value="Pending">Pending</option>
                              <option value="In Progress">In Progress</option>
                              <option value="Completed">Completed</option>
                              <option value="On Hold">On Hold</option>
                            </select>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12 bg-slate-50 dark:bg-slate-850 rounded-xl border border-dashed theme-border theme-text-secondary text-xs italic">
                        This resource currently has no assigned deliverables.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t theme-border theme-bg-main flex justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedUserId(null)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 theme-text-secondary rounded-xl text-xs font-bold transition-all active:scale-95"
                >
                  Close Workspace
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Workload;
