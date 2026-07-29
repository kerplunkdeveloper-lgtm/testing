import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import WelcomeUser from "../admin/partnerhub/components/WelcomeUser";
import DashboardCards from "./cards/DashboardCards";
import GraphicDesignerDashboard from "./cards/GraphicDesignerDashboard";
import { getEvents } from "../../features/events/eventSlice";
import {
  getProjects,
  createProject,
} from "../../features/projects/projectSlice";
import { getClients } from "../../features/clients/clientslice";
import { getUsers } from "../../features/users/userSlice";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import { useGetTasksQuery, useUpdateTaskMutation, useDeleteTaskMutation } from "../../features/api/apiSlice";
import toast from "react-hot-toast";

ChartJS.register(ArcElement, Tooltip, Legend);

import {
  FiCalendar,
  FiClock,
  FiInstagram,
  FiVideo,
  FiLayers,
  FiTarget,
  FiFileText,
  FiUser,
  FiChevronRight,
  FiAlertCircle,
  FiPlus,
  FiList,
  FiBriefcase,
  FiX,
  FiChevronDown,
  FiSearch,
  FiCheck,
  FiCheckCircle,
  FiSliders,
  FiLock,
  FiFolder,
  FiTrash2,
} from "react-icons/fi";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import ProjectIcon from "../../components/common/ProjectIcon";
import ClientBadge from "../../components/common/ClientBadge";
import { useTheme } from "../../context/ThemeContext";

const TYPE_CONFIG = {
  Post: {
    color: "text-blue-500 bg-blue-500/10 border-blue-500/20",
    icon: FiInstagram,
  },
  Reel: {
    color: "text-rose-500 bg-rose-500/10 border-rose-500/20",
    icon: FiVideo,
  },
  Story: {
    color: "text-purple-500 bg-purple-500/10 border-purple-500/20",
    icon: FiLayers,
  },
  Ad: {
    color: "text-amber-500 bg-amber-500/10 border-amber-500/20",
    icon: FiTarget,
  },
  Report: {
    color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    icon: FiFileText,
  },
  "Birthday Celebration": {
    color: "text-pink-500 bg-pink-500/10 border-pink-500/20",
    icon: FiCalendar,
  },
};

const ACCENT_COLOR_MAP = {
  default: "bg-blue-600 dark:bg-blue-500",
  emerald: "bg-emerald-600 dark:bg-emerald-500",
  violet: "bg-violet-600 dark:bg-violet-500",
  amber: "bg-amber-600 dark:bg-amber-500",
  rose: "bg-rose-600 dark:bg-rose-500",
  cyan: "bg-cyan-600 dark:bg-cyan-500",
  lime: "bg-lime-600 dark:bg-lime-500",
  fuchsia: "bg-fuchsia-600 dark:bg-fuchsia-500",
  teal: "bg-teal-600 dark:bg-teal-500",
  red: "bg-red-600 dark:bg-red-500",
  indigo: "bg-indigo-600 dark:bg-indigo-500",
  gold: "bg-amber-700 dark:bg-amber-650",
};

const getDaysRemaining = (dueDateStr) => {
  if (!dueDateStr) return null;
  const dueDate = new Date(dueDateStr);
  dueDate.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffTime = dueDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

const GraphicDesignerDeadlines = ({ user }) => {
  const navigate = useNavigate();
  const { users = [] } = useSelector((state) => state.users || {});
  const { data: tasks = [], isLoading } = useGetTasksQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });

  const getTodayDateString = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const [filterTab, setFilterTab] = useState("all"); // "active" | "overdue" | "today" | "completed" | "all"
  const [selectedClient, setSelectedClient] = useState("all");
  const [selectedDate, setSelectedDate] = useState(getTodayDateString());

  // Filter tasks assigned to this user
  const currentUserId = user?._id || user?.id;
  const myTasks = React.useMemo(() => {
    return tasks.filter((t) => {
      const assignedId = t.assignedTo?._id || t.assignedTo;
      return assignedId === currentUserId;
    });
  }, [tasks, currentUserId]);

  const uniqueClients = React.useMemo(() => {
    const clientsMap = new Map();
    myTasks.forEach((t) => {
      if (t.client) {
        const clientVal = t.client;
        const clientId =
          typeof clientVal === "object"
            ? clientVal._id || clientVal.id
            : clientVal;
        const clientName =
          typeof clientVal === "object"
            ? clientVal.companyName || clientVal.name
            : clientVal;
        if (clientId && clientName) {
          clientsMap.set(clientId, clientName);
        }
      }
    });
    return Array.from(clientsMap.entries()).map(([id, name]) => ({ id, name }));
  }, [myTasks]);

  const taskStats = React.useMemo(() => {
    let overdueCount = 0;
    let todayCount = 0;
    let activeCount = 0;
    let completedCount = 0;

    myTasks.forEach((t) => {
      // Client Filter
      if (selectedClient !== "all") {
        const clientVal = t.client;
        const clientId =
          typeof clientVal === "object"
            ? clientVal._id || clientVal.id
            : clientVal;
        if (clientId !== selectedClient) return;
      }

      // Date Filter
      if (selectedDate) {
        if (!t.dueDate) return;
        const taskDate = new Date(t.dueDate);
        const filterDate = new Date(selectedDate);
        if (
          taskDate.getFullYear() !== filterDate.getFullYear() ||
          taskDate.getMonth() !== filterDate.getMonth() ||
          taskDate.getDate() !== filterDate.getDate()
        ) {
          return;
        }
      }

      if (t.status === "Completed") {
        completedCount++;
      } else {
        activeCount++;
        const days = getDaysRemaining(t.dueDate);
        if (days !== null) {
          if (days < 0) overdueCount++;
          if (days === 0) todayCount++;
        }
      }
    });

    return { overdueCount, todayCount, activeCount, completedCount };
  }, [myTasks, selectedClient, selectedDate]);

  const filteredTasks = React.useMemo(() => {
    return myTasks
      .filter((t) => {
        const days = getDaysRemaining(t.dueDate);
        const isCompleted = t.status === "Completed";

        if (filterTab === "overdue") {
          if (isCompleted || days === null || days >= 0) return false;
        } else if (filterTab === "today") {
          if (isCompleted || days === null || days !== 0) return false;
        } else if (filterTab === "active") {
          if (isCompleted) return false;
        } else if (filterTab === "completed") {
          if (!isCompleted) return false;
        }

        // Client Filter
        if (selectedClient !== "all") {
          const clientVal = t.client;
          const clientId =
            typeof clientVal === "object"
              ? clientVal._id || clientVal.id
              : clientVal;
          if (clientId !== selectedClient) return false;
        }

        // Date Filter
        if (selectedDate) {
          if (!t.dueDate) return false;
          const taskDate = new Date(t.dueDate);
          const filterDate = new Date(selectedDate);
          if (
            taskDate.getFullYear() !== filterDate.getFullYear() ||
            taskDate.getMonth() !== filterDate.getMonth() ||
            taskDate.getDate() !== filterDate.getDate()
          ) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate) - new Date(b.dueDate);
      });
  }, [myTasks, filterTab, selectedClient, selectedDate]);

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, "0");
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
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  };

  if (isLoading) {
    return (
      <div className="theme-bg-card border theme-border rounded-xl p-6 shadow-sm animate-pulse space-y-4">
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/4"></div>
        <div className="space-y-3">
          <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded"></div>
          <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="theme-bg-card border theme-border rounded-2xl p-5 shadow-sm w-full">
      

      {/* Stats Quick Filters & Search Control Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5 border-b theme-border pb-4">
        {/* Quick Filter Tabs */}
        <div className="flex flex-wrap gap-2">
          {[
            {
              id: "all",
              label: "All Tasks",
              count: myTasks.filter((t) => {
                if (selectedClient !== "all") {
                  const clientVal = t.client;
                  const clientId =
                    typeof clientVal === "object"
                      ? clientVal._id || clientVal.id
                      : clientVal;
                  if (clientId !== selectedClient) return false;
                }
                if (selectedDate) {
                  if (!t.dueDate) return false;
                  const taskDate = new Date(t.dueDate);
                  const filterDate = new Date(selectedDate);
                  if (
                    taskDate.getFullYear() !== filterDate.getFullYear() ||
                    taskDate.getMonth() !== filterDate.getMonth() ||
                    taskDate.getDate() !== filterDate.getDate()
                  ) {
                    return false;
                  }
                }
                return true;
              }).length,
              color:
                "border-slate-500/20 text-slate-600 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-950/20",
            },
            {
              id: "active",
              label: "Active Tasks",
              count: taskStats.activeCount,
              color:
                "border-blue-500/20 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20",
            },
            {
              id: "overdue",
              label: "Overdue",
              count: taskStats.overdueCount,
              color:
                "border-rose-500/20 text-rose-600 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-950/20",
              highlight: taskStats.overdueCount > 0,
            },
            {
              id: "today",
              label: "Due Today",
              count: taskStats.todayCount,
              color:
                "border-amber-500/20 text-amber-605 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/20",
            },
            {
              id: "completed",
              label: "Completed",
              count: taskStats.completedCount,
              color:
                "border-emerald-500/20 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20",
            },
          ].map((tab) => {
            const isActive = filterTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setFilterTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[11px] font-bold transition-all shadow-sm cursor-pointer ${
                  isActive
                    ? "bg-blue-600 border-blue-600 text-white dark:bg-blue-500 dark:border-blue-500"
                    : `${tab.color} hover:bg-slate-100 dark:hover:bg-slate-800`
                } ${tab.highlight ? "animate-pulse" : ""}`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-slate-200/50 dark:bg-slate-800/80 text-slate-705 dark:text-slate-300"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Date Filter Input */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Date Picker */}
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border theme-border px-3 py-1.5 rounded-xl text-slate-755 dark:text-slate-300 shadow-sm relative">
            <FiCalendar className="shrink-0 text-indigo-500" size={13} />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-[11px] font-bold outline-none cursor-pointer [&::-webkit-calendar-picker-indicator]:dark:invert"
            />
            {selectedDate && (
              <button
                onClick={() => setSelectedDate("")}
                className="text-slate-400 hover:text-rose-500 transition-colors ml-1"
              >
                <FiX size={12} />
              </button>
            )}
          </div>

          <button
            onClick={() => navigate(`/${user?.role}/tasks`)}
            className="inline-flex items-center gap-1 text-[10px] font-black text-blue-600 dark:text-[#3b82f6] hover:underline uppercase tracking-wider ml-1"
          >
            View Task Board <FiChevronRight size={12} />
          </button>
        </div>


      </div>

      {/* Task List */}
      <div className="space-y-3 overflow-y-auto max-h-[400px] pr-2 scrollbar-thin">
        {filteredTasks.length > 0 ? (
          filteredTasks.map((task) => {
            const daysLeft = getDaysRemaining(task.dueDate);
            const isOverdue =
              task.status !== "Completed" && daysLeft !== null && daysLeft < 0;
            const isToday =
              task.status !== "Completed" &&
              daysLeft !== null &&
              daysLeft === 0;
            const isCompleted = task.status === "Completed";

            const createdByUserId = typeof task.createdBy === "object" ? task.createdBy?._id || task.createdBy?.id : task.createdBy;
            const creatorUserObj = users?.find(u => u._id === createdByUserId);
            const taskCreatorName = task.createdBy?.name || creatorUserObj?.name || "Admin";

            // Priority styling (left border & glow)
            const priorityBorder =
              task.priority === "Top High"
                ? "border-l-4 border-l-rose-500 dark:border-l-rose-600"
                : task.priority === "High"
                  ? "border-l-4 border-l-pink-500 dark:border-l-pink-600"
                  : task.priority === "Medium"
                    ? "border-l-4 border-l-amber-500 dark:border-l-amber-600"
                    : "border-l-4 border-l-slate-400 dark:border-l-slate-600";

            return (
              <div
                key={task._id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border theme-border bg-white dark:bg-slate-900/40 hover:bg-slate-50/50 dark:hover:bg-slate-900/80 transition-all duration-200 shadow-sm ${priorityBorder}`}
              >
                {/* Left side: Title, Details */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    {/* Client Badge */}
                    {task.client && (
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold">
                        Client:{" "}
                        {task.client.companyName ||
                          (typeof task.client === "object"
                            ? task.client.name
                            : task.client)}
                      </span>
                    )}
                    {/* Content Type Badge */}
                    {task.contentType && (
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider">
                        {task.contentType}
                      </span>
                    )}
                    {/* Status Badge */}
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider ${
                        task.status === "Completed"
                          ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400"
                          : task.status === "In Progress"
                            ? "bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400"
                            : task.status === "IN-REVIEW"
                              ? "bg-sky-50 dark:bg-sky-950/20 text-sky-600 dark:text-sky-400"
                              : task.status === "On Hold"
                                ? "bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-455"
                                : task.status === "Rejected"
                                  ? "bg-red-50 dark:bg-red-950/20 text-red-655 dark:text-red-405"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      {task.status}
                    </span>

                    {/* Priority Badge */}
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        task.priority === "Top High"
                          ? "bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-250 animate-pulse font-extrabold"
                          : task.priority === "High"
                            ? "bg-pink-50 dark:bg-pink-950/20 text-pink-600 dark:text-pink-400 border border-pink-200/50"
                            : task.priority === "Medium"
                              ? "bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-200/50"
                              : "bg-slate-50 dark:bg-slate-900/40 text-slate-500 dark:text-slate-400 border border-slate-200/50"
                      }`}
                    >
                      {task.priority || "Medium"}
                    </span>

                    {/* Creator Badge */}
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/20 text-indigo-650 dark:text-indigo-400 font-bold flex items-center gap-1 border border-indigo-150/40">
                      <FiUser size={10} className="text-indigo-550" />
                      <span>Created By: {taskCreatorName}</span>
                    </span>
                  </div>

                  <h3
                    className={`text-xs font-bold leading-snug theme-text-primary ${
                      isCompleted
                        ? "line-through text-slate-400 dark:text-slate-500 font-medium"
                        : ""
                    }`}
                  >
                    {task.title}
                  </h3>
                </div>

                {/* Right side: Deadline */}
                <div className="flex items-center gap-3 shrink-0 flex-wrap justify-between sm:justify-end">
                  {/* Deadline Label */}
                  {task.dueDate ? (
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[10px] px-2.5 py-1 rounded-full font-black uppercase tracking-wider flex items-center gap-1 ${
                          isCompleted
                            ? "bg-emerald-55 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400"
                            : isOverdue
                              ? "bg-rose-55 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30 animate-pulse"
                              : isToday
                                ? "bg-amber-55 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30"
                                : "bg-slate-55 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border theme-border"
                        }`}
                      >
                        {isOverdue && <FiAlertCircle size={10} />}
                        {isToday && <FiClock size={10} />}
                        {isCompleted
                          ? "Done"
                          : isOverdue
                            ? `Overdue by ${Math.abs(daysLeft)} day${Math.abs(daysLeft) > 1 ? "s" : ""}`
                            : isToday
                              ? "Due Today"
                              : daysLeft === 1
                                ? "Due Tomorrow"
                                : `${daysLeft} days left`}
                      </span>

                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-550">
                        ({formatDate(task.dueDate)})
                      </span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold italic">
                      No Deadline Set
                    </span>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-10 bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl border border-dashed theme-border">
            <FiCheckCircle
              size={32}
              className="mx-auto text-slate-300 dark:text-slate-700 mb-2"
            />
            <h3 className="text-xs font-bold theme-text-primary">
              All caught up!
            </h3>
            <p className="text-[10px] theme-text-secondary mt-0.5">
              No tasks found matching your filter criteria.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const Dashboardmain = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { theme, accentColor } = useTheme();
  const activeAccentBgClass =
    ACCENT_COLOR_MAP[accentColor] || ACCENT_COLOR_MAP.default;
  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  const { data: tasks = [] } = useGetTasksQuery();
  const [updateTask] = useUpdateTaskMutation();
  const [deleteTask] = useDeleteTaskMutation();
  const { events, loading } = useSelector((state) => state.events);
  const { projects } = useSelector((state) => state.projects);
  const { clients } = useSelector((state) => state.clients);
  const { users } = useSelector((state) => state.users);

  const [taskTab, setTaskTab] = useState("Upcoming");

  const myTasks = React.useMemo(() => {
    const currentUserId = user?._id || user?.id;
    return tasks.filter((t) => {
      const assignedId = t.assignedTo?._id || t.assignedTo;
      return assignedId === currentUserId;
    });
  }, [tasks, user]);

  const taskStats = React.useMemo(() => {
    let upcoming = [];
    let overdue = [];
    let completed = [];

    myTasks.forEach((t) => {
      const isCompleted = t.status?.toLowerCase() === "completed";
      if (isCompleted) {
        completed.push(t);
      } else {
        const days = getDaysRemaining(t.dueDate);
        if (days !== null && days < 0) {
          overdue.push(t);
        } else {
          upcoming.push(t);
        }
      }
    });

    return { upcoming, overdue, completed };
  }, [myTasks]);

  const activeTabTasks = React.useMemo(() => {
    if (taskTab === "Upcoming") return taskStats.upcoming;
    if (taskTab === "Overdue") return taskStats.overdue;
    return taskStats.completed;
  }, [taskTab, taskStats]);

  const recentProjects = React.useMemo(() => {
    if (!projects) return [];
    const currentUserId = user?._id || user?.id;
    return [...projects]
      .filter((p) => {
        const creatorId = p.createdBy?._id || p.createdBy;
        return creatorId === currentUserId;
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);
  }, [projects, user]);

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Process chart data for departments
  const departmentCounts =
    users?.reduce((acc, user) => {
      if (user.department) {
        acc[user.department] = (acc[user.department] || 0) + 1;
      }
      return acc;
    }, {}) || {};

  const chartData = {
    labels: Object.keys(departmentCounts),
    datasets: [
      {
        data: Object.values(departmentCounts),
        backgroundColor: [
          "rgba(59, 130, 246, 0.8)", // blue-500
          "rgba(16, 185, 129, 0.8)", // emerald-500
          "rgba(245, 158, 11, 0.8)", // amber-500
          "rgba(239, 68, 68, 0.8)", // red-500
          "rgba(139, 92, 246, 0.8)", // violet-500
          "rgba(236, 72, 153, 0.8)", // pink-500
          "rgba(6, 182, 212, 0.8)", // cyan-500
          "rgba(249, 115, 22, 0.8)", // orange-500
        ],
        borderColor: [
          "#3b82f6",
          "#10b981",
          "#f59e0b",
          "#ef4444",
          "#8b5cf6",
          "#ec4899",
          "#06b6d4",
          "#f97316",
        ],
        borderWidth: 1,
        hoverOffset: 6,
      },
    ],
  };

  const legendColor = isDark ? "#94a3b8" : "#475569";

  const chartOptions = {
    plugins: {
      legend: {
        position: isMobile ? "bottom" : "right",
        labels: {
          color: legendColor,
          font: {
            family: "'Inter', sans-serif",
            size: isMobile ? 9 : 11,
            weight: 600,
          },
          usePointStyle: true,
          padding: isMobile ? 8 : 16,
        },
      },
      tooltip: {
        backgroundColor: isDark
          ? "rgba(15, 23, 42, 0.97)"
          : "rgba(30, 41, 59, 0.95)",
        titleColor: "#f1f5f9",
        bodyColor: "#cbd5e1",
        padding: 12,
        cornerRadius: 8,
        displayColors: true,
        usePointStyle: true,
        borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.12)",
        borderWidth: 1,
      },
    },
    cutout: "72%",
    maintainAspectRatio: false,
    animation: {
      animateScale: true,
      animateRotate: true,
    },
  };

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState("");
  const [clientId, setClientId] = useState("");
  const [status, setStatus] = useState("Active");
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [activeDeptTab, setActiveDeptTab] = useState("Graphic Designer");
  const [access, setAccess] = useState("Private");

  const filterClients = React.useMemo(() => {
    const uniqueClientsMap = new Map();
    projects?.forEach((p) => {
      if (p.client && p.client._id) {
        uniqueClientsMap.set(p.client._id, p.client);
      } else if (p.client && typeof p.client === "string") {
        // Fallback if client is only ID
        const matched = clients?.find((c) => c._id === p.client);
        if (matched) uniqueClientsMap.set(matched._id, matched);
      }
    });
    clients?.forEach((c) => {
      if (c && c._id) {
        uniqueClientsMap.set(c._id, c);
      }
    });
    return Array.from(uniqueClientsMap.values());
  }, [projects, clients]);

  const filteredClientsList = React.useMemo(() => {
    if (!clients) return [];
    if (!clientSearchQuery) return clients;
    return clients.filter(
      (c) =>
        c.companyName
          ?.toLowerCase()
          .includes(clientSearchQuery.toLowerCase()) ||
        c.industry?.toLowerCase().includes(clientSearchQuery.toLowerCase()),
    );
  }, [clients, clientSearchQuery]);

  const uniqueDepartments = React.useMemo(() => {
    if (!users || users.length === 0)
      return ["Graphic Designer", "VideoGrapher", "Editor"];
    const depts = users
      .map((u) => u.department)
      .filter((d) => d && d.trim() !== "");
    const unique = Array.from(new Set(depts));

    const middleDepts = [];

    unique.forEach((d) => {
      const lower = d.toLowerCase();
      if (
        !lower.includes("managing partner") &&
        !lower.includes("operation manager") &&
        !lower.includes("graphic designer") &&
        !lower.includes("videographer") &&
        !lower.includes("editor")
      ) {
        middleDepts.push(d);
      }
    });

    // Priority Order: 1. Graphic Designer, 2. VideoGrapher, 3. Editor, followed by others
    const ordered = ["Graphic Designer", "VideoGrapher", "Editor"];
    middleDepts.forEach((d) => {
      if (!ordered.includes(d)) {
        ordered.push(d);
      }
    });

    return ordered;
  }, [users]);

  const getInitials = (name) => {
    if (!name) return "";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  useEffect(() => {
    dispatch(getEvents());
    dispatch(getProjects());
    dispatch(getUsers());
    if (
      user?.role === "admin" ||
      user?.role === "operationmanager" ||
      user?.role === "team"
    ) {
      dispatch(getClients());
    }
  }, [dispatch, user?._id, user?.role]);

  useEffect(() => {
    if (clients && clients.length > 0 && !clientId && clients[0]?._id) {
      setClientId(clients[0]._id);
    }
  }, [clients, clientId]);

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (!name || !clientId) return;
    dispatch(
      createProject({
        name,
        client: clientId,
        status,
        access,
      }),
    );
    setShowCreateModal(false);
    setName("");
    setClientId(clients[0]?._id || "");
    setStatus("Active");
    setAccess("Private");
  };

  const projectColors = [
    "bg-fuchsia-300 text-fuchsia-900 dark:bg-fuchsia-400 dark:text-fuchsia-950",
    "bg-emerald-300 text-emerald-900 dark:bg-emerald-400 dark:text-emerald-950",
    "bg-lime-300 text-lime-900 dark:bg-lime-400 dark:text-lime-950",
    "bg-indigo-300 text-indigo-900 dark:bg-indigo-400 dark:text-indigo-950",
    "bg-rose-300 text-rose-900 dark:bg-rose-400 dark:text-rose-950",
    "bg-cyan-300 text-cyan-900 dark:bg-cyan-400 dark:text-cyan-950",
  ];

  // Filter and sort upcoming events (today and future)
  const upcomingEvents = React.useMemo(() => {
    if (!events) return [];
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    return events
      .filter((event) => new Date(event.date) >= todayStart)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 4); // Limit to top 4 upcoming events
  }, [events]);

  const getRelativeTimeString = (eventDateStr) => {
    const eventDate = new Date(eventDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const eventDay = new Date(eventDate);
    eventDay.setHours(0, 0, 0, 0);

    const timeString = eventDate.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    if (eventDay.getTime() === today.getTime()) {
      return `Today at ${timeString}`;
    } else if (eventDay.getTime() === tomorrow.getTime()) {
      return `Tomorrow at ${timeString}`;
    } else {
      return `${eventDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} at ${timeString}`;
    }
  };

  const isToday = (eventDateStr) => {
    const eventDate = new Date(eventDateStr);
    const today = new Date();
    return eventDate.toDateString() === today.toDateString();
  };

  const handleToggleTaskComplete = async (task) => {
    const isCompleted = task.status === "Completed";
    const newStatus = isCompleted ? "Pending" : "Completed";
    try {
      await updateTask({ id: task._id, taskData: { status: newStatus } }).unwrap();
      toast.success(`Task marked as ${newStatus}`);
    } catch (err) {
      toast.error("Failed to update task status");
    }
  };

  const handleDeleteTaskClick = async (taskId) => {
    if (window.confirm("Are you sure you want to delete this task?")) {
      try {
        await deleteTask(taskId).unwrap();
        toast.success("Task deleted successfully");
      } catch (err) {
        toast.error("Failed to delete task");
      }
    }
  };

  return (
    <div className="space-y-4 pb-6 ">
      {/* GREETING */}
      <WelcomeUser />


      {/* Admin - task shortcut  */}
      {user?.role === "admin" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-2 relative z-10">
          
          {/* LEFT COLUMN: My Tasks */}
          <div className=" sidebar-bg   rounded-3xl border border-slate-200 dark:border-white/5 shadow-xs p-5 flex flex-col h-[400px] transition-all hover:shadow-md">
            
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                {/* Avatar with initials */}
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 text-white font-black text-[10px] flex items-center justify-center shadow-xs shrink-0">
                  {getInitials(user?.name)}
                </div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    My Tasks
                  </h3>
                  <FiLock size={12} className="text-slate-400 dark:text-slate-500" />
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate("/admin/tasks")}
                className="w-7 h-7 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 flex items-center justify-center text-slate-400 hover:text-slate-655 transition-colors cursor-pointer"
              >
                <FiSliders size={14} />
              </button>
            </div>

            <div className="flex items-center gap-4 border-b border-slate-150 dark:border-white/5 pb-2 mb-3">
              {[
                { id: "Upcoming", label: "Upcoming" },
                { id: "Completed", label: `Completed (${taskStats.completed.length})` }
              ].map((tab) => {
                const isActive = taskTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setTaskTab(tab.id)}
                    className={`text-[10px] font-black uppercase tracking-wider relative pb-1.5 cursor-pointer transition-colors ${
                      isActive
                        ? "text-blue-500 dark:text-blue-400"
                        : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400"
                    }`}
                  >
                    {tab.label}
                    {isActive && (
                      <motion.div
                        layoutId="activeAdminTaskTab"
                        className="absolute bottom-0 left-0 right-0 h-[2px] bg-blue-500 dark:bg-blue-400"
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Tasks List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
              {activeTabTasks.map((t) => {
                const days = getDaysRemaining(t.dueDate);
                const projId = typeof t.project === "object" ? t.project?._id || t.project?.id : t.project;
                return (
                  <div
                    key={t._id}
                    className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50/50 dark:bg-white/5 border border-slate-150/40 dark:border-white/5 hover:bg-slate-100/50 dark:hover:bg-white/10 transition-all group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleTaskComplete(t);
                        }}
                        className="shrink-0 text-slate-400 dark:text-slate-550 focus:outline-none cursor-pointer"
                      >
                        {t.status?.toLowerCase() === "completed" ? (
                          <FiCheckCircle className="w-4 h-4 text-emerald-500 hover:scale-110 transition-transform" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border-2 border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 hover:scale-110 transition-all" />
                        )}
                      </button>
                      <span className={`text-[10px] font-bold truncate leading-none ${
                        t.status?.toLowerCase() === "completed"
                          ? "line-through text-slate-400 dark:text-slate-500 font-medium"
                          : "text-slate-700 dark:text-slate-300"
                      }`}>
                        {t.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 pl-2">
                      {t.dueDate && (
                        <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
                          days !== null && days < 0
                            ? "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-200/50 dark:border-rose-500/20"
                            : "bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400 border border-slate-200 dark:border-white/5"
                        }`}>
                          {new Date(t.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                      )}
                      
                      {projId && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/${user?.role || "admin"}/projects?id=${projId}`);
                          }}
                          className="text-[9px] font-black uppercase tracking-wider bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-blue-500/30 px-2.5 py-0.5 rounded-full transition-all duration-200 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-500 dark:hover:text-white cursor-pointer"
                        >
                          View Task
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTaskClick(t._id);
                        }}
                        className="w-6 h-6 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors cursor-pointer shrink-0"
                      >
                        <FiTrash2 size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}

              {activeTabTasks.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center py-6">
                  <FiCheck className="w-7 h-7 text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 rounded-full p-1.5 mb-1.5 animate-bounce" />
                  <span className="text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-wider">
                    All caught up!
                  </span>
                </div>
              )}
            </div>

          </div>

          {/* RIGHT COLUMN: Projects */}
          <div className="sidebar-bg rounded-3xl border border-slate-200 dark:border-white/5 shadow-xs p-5 flex flex-col h-[400px] transition-all hover:shadow-md">
            
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  MY Projects
                </h3>
               
              </div>
              <button
                type="button"
                onClick={() => navigate("/admin/projects")}
                className=" rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 flex items-center justify-center text-slate-400 hover:text-slate-655 transition-colors cursor-pointer"
              >
               Go to project page
              </button>
            </div>

            {/* Projects Content */}
            <div className="flex-1 flex flex-col min-h-0">
              {recentProjects.length > 0 ? (
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pb-1">
                    
                    {/* Create Project Button */}
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(true)}
                      className="flex flex-col items-center justify-center p-3 rounded-2xl border-2 border-dashed border-slate-250 dark:border-white/5 hover:border-blue-500 dark:hover:border-blue-500/50 hover:bg-blue-50/20 dark:hover:bg-blue-500/5 transition-all text-center h-[80px] cursor-pointer group shrink-0"
                    >
                      <FiPlus className="w-5 h-5 text-slate-450 group-hover:text-blue-500 transition-colors mb-1" />
                      <span className="text-[9px] font-black text-slate-550 dark:text-slate-400 uppercase tracking-widest group-hover:text-blue-500 transition-colors">
                        Create Project
                      </span>
                    </button>

                    {/* Project List Items */}
                    {recentProjects.map((p, idx) => {
                      const projectColors = [
                        "bg-fuchsia-500/10 text-fuchsia-500 dark:bg-fuchsia-500/20",
                        "bg-emerald-500/10 text-emerald-500 dark:bg-emerald-500/20",
                        "bg-indigo-500/10 text-indigo-500 dark:bg-indigo-500/20",
                        "bg-rose-500/10 text-rose-500 dark:bg-rose-500/20",
                        "bg-cyan-500/10 text-cyan-500 dark:bg-cyan-500/20",
                        "bg-amber-500/10 text-amber-500 dark:bg-amber-500/20",
                      ];
                      const colorClass = projectColors[idx % projectColors.length];

                      return (
                        <div
                          key={p._id}
                          onClick={() => navigate(`/admin/projects?id=${p._id}`)}
                          className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50/50 dark:bg-white/5 hover:shadow-sm cursor-pointer transition-all h-[80px]"
                        >
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 font-bold ${colorClass}`}>
                            <FiList size={15} />
                          </div>
                          <div className="min-w-0 flex-1 flex flex-col text-left">
                            <span className="text-[10px] font-black text-slate-750 dark:text-slate-200 truncate leading-snug">
                              {p.name}
                            </span>
                            <span className="text-[8px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-550 mt-1 leading-none">
                              {p.status || "Active"}
                            </span>
                          </div>
                        </div>
                      );
                    })}

                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-slate-50/50 dark:bg-[#151725]/20 border border-dashed border-slate-200 dark:border-white/5 rounded-3xl h-full justify-items-center">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-3 shadow-inner">
                    <FiFolder size={20} className="animate-pulse" />
                  </div>
                  <h4 className="text-[11px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest">
                    No Projects Yet
                  </h4>
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold max-w-[200px] mt-1 leading-normal uppercase">
                    Get started by creating your very first project!
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate("/admin/projects")}
                    className="mt-4 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white text-[9px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-blue-500/20 hover:scale-105 hover:shadow-indigo-500/25 active:scale-95 transition-all duration-300 cursor-pointer"
                  >
                    Add Project
                  </button>
                </div>
              )}
            </div>

          </div>

        </div>
      )}










      {/* .................................................Dashboard Cards / Assigned Clients.............................. */}
      {(() => {
        const isAdminOrOpManager =
          user?.role === "admin" || user?.role === "operationmanager";
        return isAdminOrOpManager ? (
          <div className="mb-4 p-4">
            <DashboardCards />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 p-4 gap-3 md:gap-4 mb-4 items-start">
            <div className="col-span-1">
              <DashboardCards />
            </div>

            <div className="col-span-1 theme-bg-card border theme-border rounded-full px-5 py-2 flex items-center h-[48px] overflow-hidden">
              <div className="flex flex-wrap gap-2 overflow-y-auto max-h-[30px] w-full scrollbar-thin">
                {clients && clients.length > 0 ? (
                  clients.map((client) => (
                    <div
                      key={client._id}
                      onClick={() =>
                        navigate(`/${user?.role}/clients?id=${client._id}`)
                      }
                      className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-slate-800/40 hover:border-blue-500/30 hover:bg-slate-100/50 dark:hover:bg-slate-800/80 transition-all duration-150 group cursor-pointer"
                    >
                      <div
                        className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[7px] font-black shrink-0"
                        style={{ backgroundColor: client.color || "#3b82f6" }}
                      >
                        {getInitials(client.companyName)}
                      </div>
                      <span className="text-[10px] font-bold text-slate-700 dark:text-slate-350 group-hover:text-blue-500 transition-colors">
                        {client.companyName}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="w-full flex items-center justify-center py-2 text-slate-400 opacity-60">
                    <span className="text-[10px] font-semibold">
                      No clients assigned
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ............................................status cards .......................................... */}
      {(user?.role === "admin" ||
        user?.role === "operationmanager" ||
        user?.department?.toLowerCase() === "social media manager") && (
        <div className="w-full py-4 md:py-10">
          {/* Department Tabs */}
          <div className="flex justify-center w-full mb-8">
            <div
              className={`flex gap-1.5 p-2.5  border rounded-full shadow-inner max-w-full overflow-x-auto scrollbar-hide backdrop-blur-md ${isDark ? "bg-slate-50 border-slate-100" : "bg-slate-100/80 border-slate-200/50"}`}
            >
              {uniqueDepartments.map((dept) => {
                const isActive = activeDeptTab === dept;
                return (
                  <button
                    key={dept}
                    onClick={() => setActiveDeptTab(dept)}
                    className={`relative px-4 py-2 rounded-full text-[12px] font-bold transition-colors duration-300 whitespace-nowrap cursor-pointer z-10 ${
                      isActive
                        ? "text-white"
                        : isDark
                          ? "text-slate-400 hover:text-yellow-400"
                          : "text-slate-600 hover:text-slate-800"
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeDeptTabIndicator"
                        className={`absolute inset-0 ${activeAccentBgClass} rounded-full -z-10 shadow-md dark:shadow-none`}
                        transition={{
                          type: "spring",
                          stiffness: 380,
                          damping: 30,
                        }}
                      />
                    )}
                    <span>{dept}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab Content */}
          {["Graphic Designer", "VideoGrapher", "Editor"].includes(
            activeDeptTab,
          ) ? (
            <GraphicDesignerDashboard targetDept={activeDeptTab} />
          ) : (
            <div className="theme-bg-card border theme-border border-dashed rounded-2xl p-12 text-center flex flex-col items-center justify-center min-h-[200px]">
              <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-400 border theme-border">
                <FiLayers size={22} />
              </div>
              <h3 className="font-bold theme-text-primary mt-4 text-sm">
                No stats card for {activeDeptTab}
              </h3>
              <p className="text-xs theme-text-secondary mt-1 max-w-xs">
                Stats dashboard configuration is currently pending for this
                department.
              </p>
            </div>
          )}
        </div>
      )}
      {/* end................................................................................................... */}

      {/* Task status shortcut widget for non-admin team members */}
      {user &&
        user?.role !== "admin" &&
        user?.role !== "operationmanager" && (
          <div className="w-full mt-4">
            <GraphicDesignerDeadlines user={user} />
          </div>
        )}

      {/* user details list name and email */}
      {(user?.role === "admin" || user?.role === "operationmanager") && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          {/* Left Side: Users List */}
          <div className="theme-bg-card theme-border border rounded-2xl p-5 shadow-sm flex flex-col h-[400px]">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[14px] font-bold theme-text-primary flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-[var(--accent-light-bg-subtle)] dark:bg-[var(--accent-dark-bg-subtle)] flex items-center justify-center">
                  <FiUser
                    size={12}
                    className="text-[var(--accent-color)] dark:text-[var(--accent-color-dark)]"
                  />
                </span>
                Team Members
              </h3>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 tracking-wider">
                {users?.length || 0} USERS
              </span>
            </div>

            {/* Scrollable List */}
            <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin space-y-2">
              {users?.map((u) => {
                const avatarUrl =
                  u.profile?.profileImage?.url || u.profileImage?.url;
                const initial = u.name?.charAt(0).toUpperCase() || "?";
                return (
                  <div
                    key={u._id}
                    className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 dark:border-white/5 bg-white dark:bg-slate-800/40 hover:border-[var(--accent-color)]/30 dark:hover:border-[var(--accent-color-dark)]/30 hover:shadow-md dark:hover:bg-slate-800/70 transition-all duration-200 group"
                  >
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={u.name}
                          className="w-11 h-11 rounded-full object-cover shadow-sm ring-2 ring-white dark:ring-slate-700 group-hover:ring-[var(--accent-color)]/40 dark:group-hover:ring-[var(--accent-color-dark)]/30 transition-all"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 dark:from-[#3b82f6] dark:to-emerald-400 flex items-center justify-center text-white dark:text-black font-black text-base shadow-sm ring-2 ring-white dark:ring-slate-700">
                          {initial}
                        </div>
                      )}
                      {/* Online dot */}
                      <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white dark:border-slate-800 shadow-sm" />
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <h4 className="text-[13px] font-bold text-slate-800 dark:text-white truncate leading-tight group-hover:text-[var(--accent-color)] dark:group-hover:text-[var(--accent-color-dark)] transition-colors">
                        {u.name}
                      </h4>
                      <p className="text-[11px] text-slate-400 dark:text-slate-400 truncate mt-0.5">
                        {u.email}
                      </p>
                    </div>

                    {/* Department badge */}
                    {u.department && (
                      <div className="shrink-0 px-2 py-1 rounded-lg bg-[var(--accent-light-bg-subtle)] dark:bg-[var(--accent-dark-bg-subtle)] border border-[var(--accent-color)]/20 dark:border-[var(--accent-color-dark)]/15">
                        <span className="text-[9px] font-extrabold text-[var(--accent-color)] dark:text-[var(--accent-color-dark)] uppercase tracking-wider whitespace-nowrap">
                          {u.department}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
              {!users?.length && (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2 opacity-60 pt-10">
                  <FiUser size={32} />
                  <p className="text-xs font-semibold">No users found</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Side: Department Chart */}
          <div className="theme-bg-card theme-border border rounded-2xl p-5 shadow-sm flex flex-col h-[400px]">
            <h3 className="text-[14px] font-bold theme-text-primary mb-2 flex items-center gap-2">
              <FiTarget className="text-[var(--accent-color)] dark:text-[var(--accent-color-dark)]" />
              Department Distribution
            </h3>
            <div className="flex-1 relative w-full flex items-center justify-center min-h-[300px]">
              {Object.keys(departmentCounts).length > 0 ? (
                <Doughnut data={chartData} options={chartOptions} />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-400 gap-2 opacity-60">
                  <FiAlertCircle size={32} />
                  <p className="text-xs font-semibold">No department data</p>
                </div>
              )}

              {/* Center Label inside Doughnut */}
              {Object.keys(departmentCounts).length > 0 && (
                <div
                  className={`absolute inset-0 flex flex-col items-center justify-center pointer-events-none transition-all duration-300 ${
                    isMobile ? "pb-[30px]" : "pr-[120px]"
                  }`}
                >
                  <span className="text-3xl font-black theme-text-primary">
                    {users?.filter((u) => u.department).length || 0}
                  </span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                    Assigned
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TWO-COLUMN LOWER DASHBOARD SECTION */}
      {(user?.role === "admin" || user?.role === "operationmanager") && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 w-full">
          {/* UPCOMING EVENTS SECTION */}
          <div className="lg:col-span-2 theme-bg-card border theme-border rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4 border-b theme-border pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 shadow-sm">
                  <FiCalendar size={15} />
                </div>
                <div>
                  <h2 className="text-[13px] font-black theme-text-primary uppercase tracking-wider">
                    Upcoming Events & Deliverables
                  </h2>
                  <p className="text-[10px] theme-text-secondary font-bold">
                    Next scheduled calendar initiatives and marketing deadlines
                  </p>
                </div>
              </div>

              <Link
                to={`/${user?.role}/calendar`}
                className="text-[10px] font-black text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-350 flex items-center gap-1 uppercase tracking-wider transition-colors"
              >
                Calendar Page
                <FiChevronRight size={10} className="stroke-[3]" />
              </Link>
            </div>

            {/* Live Events List */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-[10px] theme-text-secondary font-bold">
                  Refreshing schedule...
                </span>
              </div>
            ) : upcomingEvents.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upcomingEvents.map((event) => {
                  const conf = TYPE_CONFIG[event.type] || {
                    color: "text-slate-500 bg-slate-500/10 border-slate-500/20",
                    icon: FiCalendar,
                  };
                  const EventIcon = conf.icon;
                  const eventIsToday = isToday(event.date);

                  return (
                    <motion.div
                      whileHover={{ y: -2, transition: { duration: 0.15 } }}
                      key={event._id}
                      className={`relative overflow-hidden p-3.5 rounded-xl border flex flex-col justify-between transition-all theme-bg-main ${
                        eventIsToday
                          ? "border-indigo-500/40 dark:border-indigo-900/40 ring-1 ring-indigo-500/10 shadow-[0_0_15px_rgba(99,102,241,0.05)]"
                          : "theme-border hover:border-slate-300 dark:hover:border-slate-750"
                      }`}
                    >
                      {/* Live Pulse Badge for Today's events */}
                      {eventIsToday && (
                        <span className="absolute top-3 right-3 flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                        </span>
                      )}

                      <div>
                        {/* Meta header */}
                        <div className="flex items-center justify-between mb-2.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${conf.color} flex items-center gap-1`}
                          >
                            <EventIcon size={9} />
                            {event.type}
                          </span>

                          <span className="text-[9px] theme-text-secondary font-bold flex items-center gap-1">
                            <FiClock size={10} />
                            {getRelativeTimeString(event.date)}
                          </span>
                        </div>

                        {/* Event Title */}
                        <h3 className="text-xs font-black theme-text-primary line-clamp-1">
                          {event.title}
                        </h3>

                        {/* Description */}
                        {event.description && (
                          <p className="text-[10px] theme-text-secondary mt-1 leading-normal font-medium line-clamp-2">
                            {event.description}
                          </p>
                        )}
                      </div>

                      {/* Client Footer */}
                      <div className="mt-3.5 pt-2.5 border-t theme-border flex items-center justify-between text-[9px] font-bold">
                        <span className="theme-text-secondary uppercase tracking-wider">
                          Client Account
                        </span>
                        <div className="max-w-[150px] flex justify-end truncate">
                          {event.client ? (
                            <ClientBadge
                              client={event.client}
                              size="sm"
                              className="!text-[8px] !px-1.5 !py-0.5"
                            />
                          ) : (
                            <span className="theme-text-primary font-extrabold truncate">
                              Internal Event
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-full theme-bg-main flex items-center justify-center mb-3 theme-icon">
                  <FiAlertCircle size={18} />
                </div>
                <h4 className="text-xs font-bold theme-text-primary">
                  No Upcoming Scheduled Initiatives
                </h4>
                <p className="text-[10px] theme-text-secondary mt-1 max-w-xs">
                  There are no scheduled events, reports, or content
                  deliverables listed for today or the coming week.
                </p>
              </div>
            )}
          </div>

          {/* WORKSPACE & ACTION SHORTCUTS */}
          <div className="theme-bg-card border theme-border rounded-xl p-4 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4 border-b theme-border pb-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 shadow-sm">
                  <FiTarget size={15} />
                </div>
                <div>
                  <h2 className="text-[13px] font-black theme-text-primary uppercase tracking-wider">
                    Shortcut Navigation
                  </h2>
                  <p className="text-[10px] theme-text-secondary font-bold">
                    Quick access to operational zones
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Link
                  to={`/${user?.role}/projects`}
                  className="flex items-center justify-between p-3 rounded-xl theme-bg-main hover:bg-slate-100/70 border theme-border transition-all group cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                      <FiLayers size={12} />
                    </span>
                    <span className="text-[11px] font-bold theme-text-primary truncate">
                      Active Projects & Tasks
                    </span>
                  </div>
                  <FiChevronRight
                    size={12}
                    className="theme-icon group-hover:translate-x-0.5 transition-transform"
                  />
                </Link>

                <Link
                  to={`/${user?.role}/chat`}
                  className="flex items-center justify-between p-3 rounded-xl theme-bg-main hover:bg-slate-100/70 border theme-border transition-all group cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-6 h-6 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
                      <FiUser size={12} />
                    </span>
                    <span className="text-[11px] font-bold theme-text-primary truncate">
                      Team Chats & Rooms
                    </span>
                  </div>
                  <FiChevronRight
                    size={12}
                    className="theme-icon group-hover:translate-x-0.5 transition-transform"
                  />
                </Link>

                {user?.role === "admin" && (
                  <Link
                    to={`/admin/clients`}
                    className="flex items-center justify-between p-3 rounded-xl theme-bg-main hover:bg-slate-100/70 border theme-border transition-all group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                        <FiUser size={12} />
                      </span>
                      <span className="text-[11px] font-bold theme-text-primary truncate">
                        Manage clients profiles
                      </span>
                    </div>
                    <FiChevronRight
                      size={12}
                      className="theme-icon group-hover:translate-x-0.5 transition-transform"
                    />
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* CREATE PROJECT OFFCANVAS DRAWER */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateModal(false)}
              className="absolute inset-0 bg-slate-900/40 dark:bg-[#111111]/70 backdrop-blur-[2px]"
            />
            {/* Side Sheet */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", ease: "easeOut", duration: 0.3 }}
              className="relative w-full max-w-md bg-white dark:bg-[#111111] h-full shadow-2xl flex flex-col z-10 border-l border-slate-100 dark:border-white/5"
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-[#1a1a1a]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-[#3b82f6]/10 border border-blue-100 dark:border-[#3b82f6]/20 flex items-center justify-center text-blue-600 dark:text-[#3b82f6]">
                    <FiBriefcase size={20} />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-slate-800 dark:text-white">
                      Add New Project
                    </h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                      Project Details
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="w-8 h-8 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 flex items-center justify-center text-slate-400 hover:text-slate-650 transition-colors"
                >
                  <FiX size={18} />
                </button>
              </div>

              {/* Form Content */}
              <form
                onSubmit={handleCreateSubmit}
                className="flex-1 flex flex-col overflow-hidden"
              >
                <div className="flex-1 p-6 space-y-6 overflow-y-auto">
                  {/* Name field */}
                  <div className="space-y-1.5 text-left">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                      Project Name
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter project name..."
                      className="w-full px-4 py-3 rounded-2xl bg-slate-50/60 dark:bg-[#0a0a0a] border border-slate-155 dark:border-white/10 focus:outline-none focus:border-blue-500 dark:focus:border-[#3b82f6] focus:bg-white dark:focus:bg-[#111111] text-sm text-slate-700 dark:text-white placeholder-slate-400 transition-all focus:shadow-sm"
                    />
                  </div>

                  {/* Client Select field */}
                  <div className="space-y-1.5 text-left">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                      Client <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        value={clientId}
                        onChange={(e) => setClientId(e.target.value)}
                        required
                        className="w-full px-4 py-3 pr-10 rounded-2xl bg-slate-50/60 dark:bg-[#0a0a0a] border border-slate-155 dark:border-white/10 focus:outline-none focus:border-blue-500 dark:focus:border-[#3b82f6] focus:bg-white dark:focus:bg-[#111111] text-sm text-slate-700 dark:text-white cursor-pointer appearance-none transition-all focus:shadow-sm"
                      >
                        <option value="" className="dark:bg-[#111111]">
                          Select a client
                        </option>
                        {clients?.map((c) => (
                          <option
                            key={c._id}
                            value={c._id}
                            className="dark:bg-[#111111]"
                          >
                            {c.companyName || c.name}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <FiChevronDown size={16} />
                      </div>
                    </div>
                  </div>

                  {/* Access Select field */}
                  <div className="space-y-1.5 text-left">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                      Access
                    </label>
                    <div className="relative">
                      <select
                        value={access}
                        onChange={(e) => setAccess(e.target.value)}
                        className="w-full px-4 py-3 pr-10 rounded-2xl bg-slate-50/60 dark:bg-[#0a0a0a] border border-slate-155 dark:border-white/10 focus:outline-none focus:border-blue-500 dark:focus:border-[#3b82f6] focus:bg-white dark:focus:bg-[#111111] text-sm text-slate-700 dark:text-white cursor-pointer appearance-none transition-all focus:shadow-sm"
                      >
                        <option value="Private" className="dark:bg-[#111111]">
                          Private
                        </option>
                        <option value="Public" className="dark:bg-[#111111]">
                          Public
                        </option>
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <FiChevronDown size={16} />
                      </div>
                    </div>
                  </div>

                  {/* Status Select field */}
                  <div className="space-y-1.5 text-left">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                      Status
                    </label>
                    <div className="relative">
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="w-full px-4 py-3 pr-10 rounded-2xl bg-slate-50/60 dark:bg-[#0a0a0a] border border-slate-155 dark:border-white/10 focus:outline-none focus:border-blue-500 dark:focus:border-[#3b82f6] focus:bg-white dark:focus:bg-[#111111] text-sm text-slate-700 dark:text-white cursor-pointer appearance-none transition-all focus:shadow-sm"
                      >
                        <option value="Active" className="dark:bg-[#111111]">
                          Active
                        </option>
                        <option value="On Hold" className="dark:bg-[#111111]">
                          On Hold
                        </option>
                        <option value="Completed" className="dark:bg-[#111111]">
                          Completed
                        </option>
                        <option value="Inactive" className="dark:bg-[#111111]">
                          Inactive
                        </option>
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <FiChevronDown size={16} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sticky Footer */}
                <div className="p-6 border-t border-slate-100 dark:border-white/5 bg-slate-50/30 dark:bg-[#1a1a1a] flex justify-end gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-5 py-3 rounded-2xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-white/5 active:scale-95 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-3 rounded-2xl bg-blue-600 dark:bg-[#3b82f6] hover:bg-blue-500 dark:hover:bg-[#ccff00] text-white dark:text-black text-sm font-bold shadow-md shadow-blue-500/10 dark:shadow-[#3b82f6]/20 active:scale-95 transition-all"
                  >
                    Create Project
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboardmain;
