import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import WelcomeUser from "../admin/partnerhub/components/WelcomeUser";
import DashboardCards from "./cards/DashboardCards";
import GraphicDesignerDashboard from "./cards/GraphicDesignerDashboard";
import WebDeveloperDashboard from "./cards/WebDeveloperDashboard";
import SocialMediaManagerDashboard from "./cards/SocialMediaManagerDashboard";
import SEOSpecialistDashboard from "./cards/SEOSpecialistDashboard";
import PerformanceMarketerDashboard from "./cards/PerformanceMarketerDashboard";
import { getEvents } from "../../features/events/eventSlice";
import {
  getProjects,
  createProject,
} from "../../features/projects/projectSlice";
import { getClients } from "../../features/clients/clientslice";
import { getUsers } from "../../features/users/userSlice";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import {
  useGetTasksQuery,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
  useGetGoalsQuery,
  useCreateGoalMutation,
  useUpdateGoalMutation,
  useDeleteGoalMutation,
} from "../../features/api/apiSlice";
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
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const matchesDateFilter = (t, dateStr) => {
  if (!dateStr) return true;
  const filterDate = new Date(dateStr);
  const fY = filterDate.getFullYear();
  const fM = filterDate.getMonth();
  const fD = filterDate.getDate();

  if (t.dueDate) {
    const d = new Date(t.dueDate);
    if (d.getFullYear() === fY && d.getMonth() === fM && d.getDate() === fD) {
      return true;
    }
  }

  if (t.startDate) {
    const s = new Date(t.startDate);
    if (s.getFullYear() === fY && s.getMonth() === fM && s.getDate() === fD) {
      return true;
    }
  }

  return false;
};

const isSameDateHelper = (d1, d2) => {
  if (!d1 || !d2) return false;
  try {
    const s1 =
      typeof d1 === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d1.trim())
        ? d1.trim()
        : new Date(d1).toISOString().split("T")[0];
    const s2 =
      typeof d2 === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d2.trim())
        ? d2.trim()
        : new Date(d2).toISOString().split("T")[0];
    return s1 === s2 && s1 !== "1970-01-01";
  } catch (e) {
    return false;
  }
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
      if (!matchesDateFilter(t, selectedDate)) return;

      if (t.status === "Completed") {
        completedCount++;
      } else {
        activeCount++;
        const dueDays = getDaysRemaining(t.dueDate);
        const startDays = getDaysRemaining(t.startDate);
        if (dueDays !== null && dueDays < 0) overdueCount++;
        if (dueDays === 0 || startDays === 0) todayCount++;
      }
    });

    return { overdueCount, todayCount, activeCount, completedCount };
  }, [myTasks, selectedClient, selectedDate]);

  const filteredTasks = React.useMemo(() => {
    return myTasks
      .filter((t) => {
        const dueDays = getDaysRemaining(t.dueDate);
        const startDays = getDaysRemaining(t.startDate);
        const isCompleted = t.status === "Completed";

        if (filterTab === "overdue") {
          if (isCompleted || dueDays === null || dueDays >= 0) return false;
        } else if (filterTab === "today") {
          if (isCompleted || (dueDays !== 0 && startDays !== 0)) return false;
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
        if (!matchesDateFilter(t, selectedDate)) return false;

        return true;
      })
      .sort((a, b) => {
        const isSameA = isSameDateHelper(a.startDate, a.dueDate);
        const isSameB = isSameDateHelper(b.startDate, b.dueDate);
        const pA = isSameA ? "Top High" : a.priority || "Medium";
        const pB = isSameB ? "Top High" : b.priority || "Medium";
        const priorityRank = { "Top High": 1, High: 2, Medium: 3, Low: 4 };
        const rankA = priorityRank[pA] || 3;
        const rankB = priorityRank[pB] || 3;
        if (rankA !== rankB) return rankA - rankB;

        const dateA = a.dueDate || a.startDate;
        const dateB = b.dueDate || b.startDate;
        if (!dateA) return 1;
        if (!dateB) return -1;
        return new Date(dateA) - new Date(dateB);
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
                if (!matchesDateFilter(t, selectedDate)) return false;
                return true;
              }).length,
              color:
                "border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800",
            },
            {
              id: "overdue",
              label: "Overdue",
              count: taskStats.overdueCount,
              color:
                "border-rose-300 dark:border-rose-700/60 text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50",
              highlight: taskStats.overdueCount > 0,
            },
            {
              id: "completed",
              label: "Completed",
              count: taskStats.completedCount,
              color:
                "border-emerald-300 dark:border-emerald-700/60 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50",
            },
          ].map((tab) => {
            const isActive = filterTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setFilterTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[11px] font-bold transition-all shadow-sm cursor-pointer ${
                  isActive
                    ? "bg-blue-600 border-blue-600 text-white dark:bg-blue-600 dark:border-blue-500 dark:text-white"
                    : `${tab.color} hover:bg-slate-200 dark:hover:bg-slate-800`
                } ${tab.highlight ? "animate-pulse" : ""}`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200"
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
          <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-3 py-1.5 rounded-xl text-slate-800 dark:text-slate-100 shadow-sm relative">
            <FiCalendar
              className="shrink-0 text-indigo-600 dark:text-indigo-400"
              size={13}
            />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-[11px] font-bold outline-none cursor-pointer text-slate-800 dark:text-slate-100 [&::-webkit-calendar-picker-indicator]:dark:invert"
            />
            {selectedDate && (
              <button
                onClick={() => setSelectedDate("")}
                className="text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors ml-1"
              >
                <FiX size={12} />
              </button>
            )}
          </div>

          <button
            onClick={() => navigate(`/${user?.role}/tasks`)}
            className="inline-flex items-center gap-1 text-[10px] font-black text-blue-600 dark:text-blue-400 hover:underline uppercase tracking-wider ml-1"
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

            const createdByUserId =
              typeof task.createdBy === "object"
                ? task.createdBy?._id || task.createdBy?.id
                : task.createdBy;
            const creatorUserObj = users?.find(
              (u) => u._id === createdByUserId,
            );
            const taskCreatorName =
              task.createdBy?.name || creatorUserObj?.name || "Admin";

            const isTopHigh =
              isSameDateHelper(task.startDate, task.dueDate) ||
              task.priority === "Top High";

            // Priority styling (left border & glow)
            const priorityBorder = isTopHigh
              ? "border-2 border-yellow-400 animate-pulse shadow-lg"
              : task.priority === "High"
                ? "border-l-4 border-l-pink-500 dark:border-l-pink-600"
                : task.priority === "Medium"
                  ? "border-l-4  border-l-amber-500 dark:border-l-amber-600"
                  : "border-l-4 border-l-slate-400 dark:border-l-slate-600";

            return (
              <div
                key={task._id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl transition-all duration-200 shadow-sm ${
                  isTopHigh
                    ? "bg-red-600 dark:bg-rose-950 text-white border-2 border-yellow-400 animate-pulse shadow-yellow-500/20"
                    : `border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 hover:bg-slate-50/50 dark:hover:bg-slate-800/80 ${priorityBorder}`
                }`}
              >
                {/* Left side: Title, Details */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    {/* Client Badge */}
                    {task.client && (
                      <span
                        className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                          isTopHigh
                            ? "bg-white/20 text-yellow-200 border border-white/20"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
                        }`}
                      >
                        Client:{" "}
                        {task.client.companyName ||
                          (typeof task.client === "object"
                            ? task.client.name
                            : task.client)}
                      </span>
                    )}
                    {/* Content Type Badge */}
                    {task.contentType && (
                      <span
                        className={`text-[12px] px-2 py-0.5 rounded-full font-bold ${
                          isTopHigh
                            ? "bg-white/20 text-white border border-white/20"
                            : "bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-white border border-blue-200 dark:border-blue-700"
                        }`}
                      >
                        {task.contentType}
                      </span>
                    )}
                    {/* Status Badge */}
                    <span
                      className={`text-[13px] px-2 py-0.5 rounded-full font-black ${
                        isTopHigh
                          ? "bg-white/20 text-white border border-white/20"
                          : task.status === "Completed"
                            ? "bg-emerald-400 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700"
                            : task.status === "Pending"
                              ? "bg-slate-400 dark:bg-blue-900 text-slate-800 dark:text-white border border-slate-300 dark:border-slate-700"
                              : task.status === "In Progress"
                                ? "bg-amber-400 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700"
                                : task.status === "IN-REVIEW" ||
                                    task.status === "In Review"
                                  ? "bg-sky-400 dark:bg-sky-950 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-700"
                                  : task.status === "On Hold"
                                    ? "bg-rose-400 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-700"
                                    : task.status === "Rejected"
                                      ? "bg-red-400 dark:bg-red-950 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-700"
                                      : "bg-slate-400 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700"
                      }`}
                    >
                      {task.status}
                    </span>

                    {/* Priority Badge */}
                    <span
                      className={`text-[13px] px-2 py-0.5 rounded-full font-extrabold uppercase tracking-wider ${
                        isTopHigh
                          ? "bg-yellow-300 text-red-950 border border-yellow-200 shadow-sm"
                          : task.priority === "High"
                            ? "bg-pink-100 dark:bg-pink-950 text-pink-800 dark:text-pink-300 border border-pink-300 dark:border-pink-700"
                            : task.priority === "Medium"
                              ? "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700"
                      }`}
                    >
                      {isSameDateHelper(task.startDate, task.dueDate)
                        ? "🔴 Top High"
                        : task.priority || "Medium"}
                    </span>

                    {/* Creator Badge */}
                    <span
                      className={`text-[13px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 border ${
                        isTopHigh
                          ? "bg-white/20 text-white border-white/20"
                          : "bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700"
                      }`}
                    >
                      <FiUser
                        size={10}
                        className={
                          isTopHigh
                            ? "text-yellow-300"
                            : "text-indigo-600 dark:text-indigo-400"
                        }
                      />
                      <span>Created By: {taskCreatorName}</span>
                    </span>
                  </div>

                  <h3
                    className={`text-md font-bold leading-snug ${
                      isTopHigh
                        ? "text-white"
                        : isCompleted
                          ? "line-through text-slate-400 dark:text-white font-medium"
                          : "text-slate-900 dark:text-white"
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
                          isTopHigh
                            ? "bg-yellow-300 text-red-950 border border-yellow-200 font-extrabold"
                            : isCompleted
                              ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700"
                              : isOverdue
                                ? "bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-700 animate-pulse"
                                : isToday
                                  ? "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700"
                                  : "bg-blue-50 dark:bg-slate-800 text-blue-700 dark:text-slate-200 border border-blue-200 dark:border-slate-700"
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

                      <span
                        className={`text-[10px] font-bold ${isTopHigh ? "text-yellow-200" : "text-slate-500 dark:text-slate-300"}`}
                      >
                        ({formatDate(task.dueDate)})
                      </span>
                    </div>
                  ) : (
                    <span
                      className={`text-[10px] font-bold italic ${isTopHigh ? "text-yellow-200" : "text-slate-500 dark:text-slate-400"}`}
                    >
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

  // Goals logic
  const { data: goals = [] } = useGetGoalsQuery();
  const [createGoal] = useCreateGoalMutation();
  const [updateGoal] = useUpdateGoalMutation();
  const [deleteGoal] = useDeleteGoalMutation();

  const [isCreatingGoal, setIsCreatingGoal] = useState(false);
  const [newGoalName, setNewGoalName] = useState("");
  const [newGoalStartDate, setNewGoalStartDate] = useState("");
  const [newGoalEndDate, setNewGoalEndDate] = useState("");
  const [goalTab, setGoalTab] = useState("Upcoming");
  const [editingGoalId, setEditingGoalId] = useState(null);
  const [editingGoalName, setEditingGoalName] = useState("");
  const [editingGoalStartDate, setEditingGoalStartDate] = useState("");
  const [editingGoalEndDate, setEditingGoalEndDate] = useState("");
  const [editingGoalDatesId, setEditingGoalDatesId] = useState(null);
  const [activeCalendarGoalId, setActiveCalendarGoalId] = useState(null);
  const [calendarTarget, setCalendarTarget] = useState("start");
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [newCreatedGoalId, setNewCreatedGoalId] = useState(null);
  const [calendarPosition, setCalendarPosition] = useState({ top: 0, left: 0 });
  const [goalPage, setGoalPage] = useState(1);
  const [showCelebration, setShowCelebration] = useState(false);

  const goalStats = React.useMemo(() => {
    let upcoming = [];
    let overdue = [];
    let completed = [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sortedGoals = [...goals].sort((a, b) => {
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });

    sortedGoals.forEach((g) => {
      if (g.completed) {
        completed.push(g);
        upcoming.push(g);
      } else if (g.endDate) {
        const goalEndDate = new Date(g.endDate);
        const compareEndDate = new Date(
          goalEndDate.getFullYear(),
          goalEndDate.getMonth(),
          goalEndDate.getDate(),
        );
        if (compareEndDate <= today) {
          overdue.push(g);
          if (compareEndDate.getTime() === today.getTime()) {
            upcoming.push(g);
          }
        } else {
          upcoming.push(g);
        }
      } else {
        upcoming.push(g);
      }
    });

    return { upcoming, overdue, completed };
  }, [goals]);

  const activeTabGoals = React.useMemo(() => {
    if (goalTab === "Upcoming") return goalStats.upcoming;
    if (goalTab === "Overdue") return goalStats.overdue;
    return goalStats.completed;
  }, [goalTab, goalStats]);

  const GOALS_PER_PAGE = 5;
  const totalGoalPages = Math.ceil(activeTabGoals.length / GOALS_PER_PAGE) || 1;

  const paginatedGoals = React.useMemo(() => {
    return activeTabGoals.slice(
      (goalPage - 1) * GOALS_PER_PAGE,
      goalPage * GOALS_PER_PAGE,
    );
  }, [activeTabGoals, goalPage]);

  useEffect(() => {
    setGoalPage(1);
  }, [goalTab]);

  const userProjects = React.useMemo(() => {
    if (!projects) return [];
    const currentUserId = user?._id || user?.id;
    return projects.filter((p) => {
      const creatorId = p.createdBy?._id || p.createdBy;
      return creatorId === currentUserId;
    });
  }, [projects, user]);

  const formatGoalDates = (startStr, endStr) => {
    if (!startStr && !endStr) return null;
    const start = startStr ? new Date(startStr) : null;
    const end = endStr ? new Date(endStr) : null;

    const optMonth = { month: "short" };

    if (start && end) {
      if (start.getMonth() === end.getMonth()) {
        const month = start.toLocaleDateString("en-US", optMonth);
        const startDay = start.getDate();
        const endDay = end.getDate();
        return `${month} ${startDay} – ${endDay}`;
      } else {
        const startFormatted = start.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        const endFormatted = end.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        return `${startFormatted} – ${endFormatted}`;
      }
    } else if (start) {
      return start.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    } else if (end) {
      return end.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }
    return null;
  };

  const handleCreateGoal = async (
    e,
    customName = null,
    customStartDate = null,
    customEndDate = null,
  ) => {
    if (e) e.preventDefault();
    const taskNameVal = customName !== null ? customName : newGoalName;
    const startVal =
      customStartDate !== null ? customStartDate : newGoalStartDate;
    const endVal = customEndDate !== null ? customEndDate : newGoalEndDate;

    try {
      const res = await createGoal({
        taskName: taskNameVal,
        startDate: startVal || undefined,
        endDate: endVal || undefined,
      }).unwrap();

      if (res?.data?._id) {
        setNewCreatedGoalId(res.data._id);
      }

      if (customName === null) {
        setNewGoalName("");
        setNewGoalStartDate("");
        setNewGoalEndDate("");
      }
    } catch (err) {
      toast.error("Failed to create goal");
    }
  };

  const handleExistingGoalEnter = async (goal, newName) => {
    const val = newName.trim();
    if (val && val !== goal.taskName) {
      try {
        await updateGoal({
          id: goal._id,
          goalData: { taskName: val },
        }).unwrap();
      } catch (err) {
        toast.error("Failed to update goal name");
      }
    }
    // Automatically create a new blank goal and focus it
    await handleCreateGoal(null, "");
  };

  // Custom calendar popover rendering function matching reference image
  const renderCalendarPopover = (
    goalId,
    currentStart,
    currentEnd,
    onSaveDates,
  ) => {
    const today = new Date();
    const currentYear = calendarMonth.getFullYear();
    const currentMonthNum = calendarMonth.getMonth();

    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    const firstDayIndex = new Date(currentYear, currentMonthNum, 1).getDay();
    const totalDays = new Date(currentYear, currentMonthNum + 1, 0).getDate();
    const prevTotalDays = new Date(currentYear, currentMonthNum, 0).getDate();

    const daysArray = [];
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      daysArray.push({ day: prevTotalDays - i, isCurrentMonth: false });
    }
    for (let i = 1; i <= totalDays; i++) {
      daysArray.push({ day: i, isCurrentMonth: true });
    }
    const remainingCells = 42 - daysArray.length;
    for (let i = 1; i <= remainingCells; i++) {
      daysArray.push({ day: i, isCurrentMonth: false });
    }

    const handlePrevMonth = (e) => {
      e.stopPropagation();
      setCalendarMonth(new Date(currentYear, currentMonthNum - 1, 1));
    };

    const handleNextMonth = (e) => {
      e.stopPropagation();
      setCalendarMonth(new Date(currentYear, currentMonthNum + 1, 1));
    };

    const handleSelectDay = (e, dayObj) => {
      e.stopPropagation();
      if (!dayObj.isCurrentMonth) return;

      const selectedDate = new Date(
        currentYear,
        currentMonthNum,
        dayObj.day,
        12,
        0,
        0,
        0,
      );

      let newStart = currentStart ? new Date(currentStart) : null;
      let newEnd = currentEnd ? new Date(currentEnd) : null;

      if (calendarTarget === "start") {
        newStart = selectedDate;
        if (newEnd && selectedDate > newEnd) {
          newEnd = null;
        }
        setCalendarTarget("due");
      } else {
        newEnd = selectedDate;
        if (newStart && selectedDate < newStart) {
          newStart = selectedDate;
          newEnd = null;
          setCalendarTarget("due");
        } else {
          setCalendarTarget("start");
        }
      }

      onSaveDates(newStart, newEnd);
    };

    const handleClear = (e) => {
      e.stopPropagation();
      onSaveDates(null, null);
    };

    const formattedStart = currentStart
      ? new Date(currentStart).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "";
    const formattedEnd = currentEnd
      ? new Date(currentEnd).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "";

    return (
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "absolute",
          top: "80px",
          right: "16px",
          zIndex: 50,
          backgroundColor: isDark ? "#1a1a1a" : "#ffffff",
        }}
        className="border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl p-4 w-72 text-slate-800 dark:text-slate-200"
      >
        {/* Top date input buttons */}
        <div className="flex items-center gap-2 mb-4">
          <button
            type="button"
            onClick={() => setCalendarTarget("start")}
            className={`flex-1 py-1.5 px-2 text-center rounded-lg text-xs font-semibold border transition-all ${
              calendarTarget === "start"
                ? "border-blue-500 bg-blue-500/5 text-blue-600 dark:text-blue-400"
                : "border-slate-200 dark:border-white/5 text-slate-500 dark:text-slate-400"
            }`}
          >
            {formattedStart ? `+ ${formattedStart}` : "+ Start date"}
          </button>
          <button
            type="button"
            onClick={() => setCalendarTarget("due")}
            className={`flex-1 py-1.5 px-2 text-center rounded-lg text-xs font-semibold border transition-all ${
              calendarTarget === "due"
                ? "border-blue-500 bg-blue-500/5 text-blue-600 dark:text-blue-400 font-bold border-2"
                : "border-slate-200 dark:border-white/5 text-slate-500 dark:text-slate-400"
            }`}
          >
            {formattedEnd ? formattedEnd : "Due date"}
          </button>
        </div>

        {/* Month selector header */}
        <div className="flex items-center justify-between mb-4 px-1">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-100 p-1 text-sm font-bold"
          >
            &lt;
          </button>
          <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
            {monthNames[currentMonthNum]} {currentYear}
          </span>
          <button
            type="button"
            onClick={handleNextMonth}
            className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-100 p-1 text-sm font-bold"
          >
            &gt;
          </button>
        </div>

        {/* Days of week header */}
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black text-slate-400 dark:text-slate-500 mb-2">
          <span>S</span>
          <span>M</span>
          <span>T</span>
          <span>W</span>
          <span>T</span>
          <span>F</span>
          <span>S</span>
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-1 text-center text-xs">
          {daysArray.map((dayObj, index) => {
            const isTodayDay =
              dayObj.isCurrentMonth &&
              today.getDate() === dayObj.day &&
              today.getMonth() === currentMonthNum &&
              today.getFullYear() === currentYear;

            const isStartDaySelected =
              currentStart &&
              dayObj.isCurrentMonth &&
              new Date(currentStart).getDate() === dayObj.day &&
              new Date(currentStart).getMonth() === currentMonthNum &&
              new Date(currentStart).getFullYear() === currentYear;

            const isEndDaySelected =
              currentEnd &&
              dayObj.isCurrentMonth &&
              new Date(currentEnd).getDate() === dayObj.day &&
              new Date(currentEnd).getMonth() === currentMonthNum &&
              new Date(currentEnd).getFullYear() === currentYear;

            const inRange =
              currentStart &&
              currentEnd &&
              dayObj.isCurrentMonth &&
              new Date(currentYear, currentMonthNum, dayObj.day) >
                new Date(currentStart) &&
              new Date(currentYear, currentMonthNum, dayObj.day) <
                new Date(currentEnd);

            return (
              <button
                key={index}
                type="button"
                onClick={(e) => handleSelectDay(e, dayObj)}
                className={`py-1 w-full rounded-full transition-all focus:outline-none cursor-pointer flex items-center justify-center font-bold ${
                  !dayObj.isCurrentMonth
                    ? "text-slate-300 dark:text-slate-700"
                    : isStartDaySelected || isEndDaySelected
                      ? "bg-blue-600 text-white"
                      : inRange
                        ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400"
                        : isTodayDay
                          ? "border-2 border-blue-500 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center mx-auto"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
                }`}
              >
                {dayObj.day}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-white/5">
          <div className="flex items-center gap-3 text-slate-400">
            <button type="button" className="hover:text-slate-600">
              <FiClock size={14} />
            </button>
            <button type="button" className="hover:text-slate-600">
              <svg
                className="w-3.5 h-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
            </button>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="text-xs font-bold text-slate-500 dark:text-slate-300 hover:text-red-500 cursor-pointer"
          >
            Clear
          </button>
        </div>
      </div>
    );
  };

  const handleToggleGoalComplete = async (goal) => {
    try {
      const nextCompletedState = !goal.completed;
      await updateGoal({
        id: goal._id,
        goalData: { completed: nextCompletedState },
      }).unwrap();

      if (nextCompletedState) {
        setShowCelebration(true);
        setTimeout(() => {
          setShowCelebration(false);
        }, 3000);
      }

      toast.success(
        goal.completed ? "Goal marked as pending" : "Goal completed!",
      );
    } catch (err) {
      toast.error("Failed to update goal");
    }
  };

  const handleDeleteGoalClick = async (goalId) => {
    if (window.confirm("Are you sure you want to delete this goal?")) {
      try {
        await deleteGoal(goalId).unwrap();
        toast.success("Goal deleted");
      } catch (err) {
        toast.error("Failed to delete goal");
      }
    }
  };

  const handleStartEditGoal = (goal) => {
    setEditingGoalId(goal._id);
    setEditingGoalName(goal.taskName);
    setEditingGoalStartDate(
      goal.startDate
        ? new Date(goal.startDate).toISOString().split("T")[0]
        : "",
    );
    setEditingGoalEndDate(
      goal.endDate ? new Date(goal.endDate).toISOString().split("T")[0] : "",
    );
  };

  const handleSaveEditGoal = async (goalId) => {
    if (!editingGoalName.trim()) return;
    try {
      await updateGoal({
        id: goalId,
        goalData: {
          taskName: editingGoalName,
          startDate: editingGoalStartDate || null,
          endDate: editingGoalEndDate || null,
        },
      }).unwrap();
      toast.success("Goal updated");
      setEditingGoalId(null);
    } catch (err) {
      toast.error("Failed to update goal");
    }
  };

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
      await updateTask({
        id: task._id,
        taskData: { status: newStatus },
      }).unwrap();
      toast.success(`Task marked as ${newStatus}`);
    } catch (err) {
      toast.error("Failed to update task status");
    }
  };

  const renderRocketCelebration = () => {
    if (!showCelebration) return null;
    return (
      <div className="fixed inset-0 z-[99999] pointer-events-none overflow-hidden select-none">
        <style
          dangerouslySetInnerHTML={{
            __html: `
          @keyframes launchRocket {
            0% { transform: translate(-150px, 100vh) rotate(45deg) scale(0.6); }
            10% { transform: translate(10vw, 80vh) rotate(43deg) scale(0.8); }
            45% { transform: translate(45vw, 45vh) rotate(47deg) scale(1.1); }
            70% { transform: translate(75vw, 25vh) rotate(42deg) scale(0.9); }
            100% { transform: translate(105vw, -150px) rotate(45deg) scale(0.6); }
          }
          @keyframes thrustWobble {
            0%, 100% { transform: translate(0, 0) rotate(0deg); }
            25% { transform: translate(1px, -1px) rotate(-1deg); }
            50% { transform: translate(-1px, 1px) rotate(1deg); }
            75% { transform: translate(-1px, -1px) rotate(-0.5deg); }
          }
          @keyframes flamePulse {
            0%, 100% { transform: scaleY(1); }
            50% { transform: scaleY(1.3) scaleX(1.1); }
          }
          @keyframes particleFade {
            0% { transform: translate(0, 0) scale(1); opacity: 1; }
            100% { transform: translate(-120px, 120px) scale(0.1); opacity: 0; }
          }
          .rocket-container {
            position: absolute;
            animation: launchRocket 3.0s cubic-bezier(0.25, 1, 0.5, 1) forwards;
          }
          .rocket-shaker {
            animation: thrustWobble 0.08s infinite ease-in-out;
          }
          .rocket-flame {
            transform-origin: 25px 95px;
            animation: flamePulse 0.15s infinite ease-in-out;
          }
          .rainbow-particle {
            position: absolute;
            border-radius: 50%;
            filter: blur(2px);
            animation: particleFade 0.6s infinite linear;
          }
        `,
          }}
        />
        <div className="rocket-container w-[160px] h-[160px]">
          <div className="rocket-shaker w-full h-full relative">
            {/* Rainbow particles exhaust trail */}
            <div className="absolute top-[75px] left-[10px] pointer-events-none">
              <div
                className="rainbow-particle w-7 h-7 bg-red-500"
                style={{ animationDelay: "0s", left: "-5px", top: "10px" }}
              />
              <div
                className="rainbow-particle w-6 h-6 bg-orange-500"
                style={{ animationDelay: "0.08s", left: "-12px", top: "18px" }}
              />
              <div
                className="rainbow-particle w-5.5 h-5.5 bg-yellow-400"
                style={{ animationDelay: "0.16s", left: "-18px", top: "24px" }}
              />
              <div
                className="rainbow-particle w-5 h-5 bg-green-400"
                style={{ animationDelay: "0.24s", left: "-24px", top: "30px" }}
              />
              <div
                className="rainbow-particle w-4.5 h-4.5 bg-blue-400"
                style={{ animationDelay: "0.32s", left: "-30px", top: "36px" }}
              />
              <div
                className="rainbow-particle w-4 h-4 bg-indigo-500"
                style={{ animationDelay: "0.4s", left: "-36px", top: "42px" }}
              />
              <div
                className="rainbow-particle w-3 h-3 bg-purple-500"
                style={{ animationDelay: "0.48s", left: "-42px", top: "48px" }}
              />
            </div>

            <svg viewBox="0 0 120 120" className="w-full h-full">
              <g className="rocket-flame">
                <path
                  d="M20 95 C 10 115, 25 125, 25 125 C 25 125, 40 115, 30 95 Z"
                  fill="#ffa801"
                />
                <path
                  d="M22 98 C 15 110, 25 118, 25 118 C 25 118, 35 110, 28 98 Z"
                  fill="#ffd32a"
                />
              </g>
              <path d="M15 85 C 5 85, 5 70, 20 60 Z" fill="#ef5777" />
              <path d="M35 85 C 45 85, 45 70, 30 60 Z" fill="#ef5777" />
              <path
                d="M15 55 C 15 25, 25 10, 25 10 C 25 10, 35 25, 35 55 C 35 75, 33 90, 25 95 C 17 90, 15 75, 15 55 Z"
                fill="#ffffff"
                stroke="#dcdde1"
                strokeWidth="1.5"
              />
              <path
                d="M18 40 C 18 30, 25 10, 25 10 C 25 10, 32 30, 32 40 Z"
                fill="#ef5777"
              />
              <circle
                cx="25"
                cy="45"
                r="5"
                fill="#34e7e4"
                stroke="#00d8d6"
                strokeWidth="1.5"
              />
              <path
                d="M23 42.5 C 25 41.5, 27 42, 27 43"
                stroke="#ffffff"
                strokeWidth="0.8"
                fill="none"
                strokeLinecap="round"
              />
              <rect x="16.5" y="60" width="17" height="4" fill="#0be881" />
            </svg>
          </div>
        </div>
      </div>
    );
  };
  const roleNorm = (user?.role || "").toLowerCase().replace(/[\s_]+/g, "");
  const desigNorm = (
    user?.designation ||
    user?.department ||
    user?.profile?.department ||
    ""
  ).toLowerCase();
  const canSeeGoalsAndProjects =
    roleNorm === "admin" ||
    roleNorm === "operationmanager" ||
    roleNorm === "socialmediamanager" ||
    desigNorm.includes("social media") ||
    desigNorm.includes("operation manager") ||
    desigNorm.includes("admin");

  return (
    <div className="space-y-4 pb-6 ">
      {renderRocketCelebration()}
      {/* GREETING */}
      <WelcomeUser />

      {/* Goal tasks & My Projects shortcut - shown ONLY for Admin, Operation Manager, and Social Media Manager */}
      {canSeeGoalsAndProjects && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-2 relative z-10">
          {/* My Goals tasks card */}
          <div className="sidebar-bg rounded-xl border border-slate-200 dark:border-white/5 shadow-xs p-6 flex flex-col min-h-[400px] relative w-full">
            {/* Header: Avatar, Title, Lock, and Dots menu */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                {/* Yellow initials avatar */}
                <div className="w-10 h-10 rounded-full bg-[#f5d05e] dark:bg-[#eab308]/90 text-[#543d02] font-semibold text-sm flex items-center justify-center shrink-0">
                  {getInitials(user?.name) || "Aw"}
                </div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-medium">My Goals tasks</h3>
                  <FiLock
                    size={14}
                    className="text-slate-400 dark:text-slate-500 fill-slate-400 dark:fill-slate-500"
                  />
                </div>
              </div>

              {/* Rounded rectangular ... button */}
              <button className="w-9 h-7 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 flex items-center justify-center text-slate-400 cursor-pointer">
                <span className="text-base font-bold tracking-widest leading-none">
                  •••
                </span>
              </button>
            </div>

            {/* Tabs matching reference image */}
            <div className="flex items-center gap-6 border-b border-slate-100 dark:border-white/5 pb-0.5 mb-2">
              {[
                {
                  id: "Upcoming",
                  label: `Upcoming (${goalStats.upcoming.length})`,
                },
                {
                  id: "Overdue",
                  label: `Overdue (${goalStats.overdue.length})`,
                },
                {
                  id: "Completed",
                  label: `Completed (${goalStats.completed.length})`,
                },
              ].map((tab) => {
                const isActive = goalTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setGoalTab(tab.id);
                      setEditingGoalId(null);
                    }}
                    className={`text-[13px] font-medium pb-2 cursor-pointer relative transition-colors ${
                      isActive
                        ? "text-slate-900 dark:text-slate-500 font-semibold"
                        : "text-slate-455 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-400"
                    }`}
                  >
                    {tab.label}
                    {isActive && (
                      <motion.div
                        layoutId="activeAdminGoalTab"
                        className="absolute bottom-0 left-0 right-0 h-[2px] bg-slate-800 dark:bg-slate-200"
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* + Create task link - only visible in Upcoming tab */}
            {goalTab === "Upcoming" && (
              <button
                onClick={() => handleCreateGoal(null, "")}
                className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors text-[13px] py-2 cursor-pointer pl-1"
              >
                <FiPlus size={14} className="text-slate-455" />
                <span>Create task</span>
              </button>
            )}
            <div className="flex-1 flex flex-col pt-1">
              {/* Tasks List with bottom border lines */}
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 mt-0.5 divide-y divide-slate-100 dark:divide-white/5">
                {paginatedGoals.map((g) => {
                  const dateText = formatGoalDates(g.startDate, g.endDate);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const isOverdueGoal =
                    g.endDate && new Date(g.endDate) < today && !g.completed;

                  return (
                    <div
                      key={g._id}
                      className="flex items-center justify-between py-2 bg-transparent group/row"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1 pl-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleGoalComplete(g);
                          }}
                          className="shrink-0 focus:outline-none cursor-pointer"
                        >
                          {g.completed ? (
                            <div className="w-5 h-5 rounded-full border border-slate-350 dark:border-slate-650 flex items-center justify-center text-slate-450">
                              <FiCheck size={11} className="stroke-[3]" />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-full border border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-300 dark:text-slate-700 hover:border-slate-455 transition-all">
                              <FiCheck
                                size={11}
                                className="text-slate-100 dark:text-[#1e1e1e]"
                              />
                            </div>
                          )}
                        </button>

                        {/* Title Editable Directly */}
                        <div className="flex-1 min-w-0">
                          <input
                            type="text"
                            placeholder="Write a task name"
                            defaultValue={g.taskName}
                            autoFocus={g._id === newCreatedGoalId}
                            onFocus={() => {
                              if (g._id === newCreatedGoalId) {
                                setTimeout(() => {
                                  setNewCreatedGoalId(null);
                                }, 50);
                              }
                            }}
                            onBlur={async (e) => {
                              const val = e.target.value.trim();
                              if (val !== g.taskName) {
                                try {
                                  await updateGoal({
                                    id: g._id,
                                    goalData: { taskName: val },
                                  }).unwrap();
                                  toast.success("Goal updated");
                                } catch {
                                  toast.error("Failed to update goal name");
                                }
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleExistingGoalEnter(g, e.target.value);
                              }
                            }}
                            className={`goal-inline-input text-[13px] w-full focus:outline-none ${
                              g.completed
                                ? "goal-completed-text"
                                : "text-slate-700 dark:text-slate-200"
                            }`}
                          />
                          {g.completed && g.completedAt && (
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 block -mt-0.5 font-medium pl-0.5">
                              {(() => {
                                const d = new Date(g.completedAt);
                                const timeStr = d.toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                });
                                const dateStr = d.toLocaleDateString([], {
                                  month: "short",
                                  day: "numeric",
                                });
                                return `Completed at ${timeStr}, ${dateStr}`;
                              })()}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right Date and Actions */}
                      <div className="flex items-center gap-2.5 shrink-0 pr-1">
                        {/* Start Date Badge */}
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveCalendarGoalId(
                              activeCalendarGoalId === g._id ? null : g._id,
                            );
                            setCalendarTarget("start");
                          }}
                          className="text-[12px] text-slate-450 dark:text-slate-500 font-normal cursor-pointer hover:underline flex items-center gap-1"
                        >
                          {dateText ? (
                            <span
                              className={`px-2 py-0.5 rounded-full font-semibold text-[11px] border ${
                                isOverdueGoal
                                  ? "bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/25"
                                  : "bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/20 dark:text-blue-400 dark:border-white/5"
                              }`}
                            >
                              {dateText}
                            </span>
                          ) : (
                            /* Dashed circle wrapper around calendar icon when date is missing */
                            <div className="w-6 h-6 rounded-full border border-dashed border-slate-350 dark:border-slate-650 flex items-center justify-center text-slate-455 hover:text-blue-500 cursor-pointer">
                              <FiCalendar size={11} />
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteGoalClick(g._id);
                          }}
                          className="w-6 h-6 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors cursor-pointer shrink-0 opacity-0 group-hover/row:opacity-100"
                        >
                          <FiTrash2 size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {activeTabGoals.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center py-10">
                    <FiCheck className="w-7 h-7 text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 rounded-full p-1.5 mb-1.5 animate-bounce" />
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Target & Overdue Tasks
                    </span>
                  </div>
                )}
              </div>

              {/* Pagination Controls */}
              {totalGoalPages > 1 && (
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-white/5 mt-auto bg-transparent px-1">
                  <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-550 select-none">
                    Page {goalPage} of {totalGoalPages}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() =>
                        setGoalPage((prev) => Math.max(prev - 1, 1))
                      }
                      disabled={goalPage === 1}
                      className="w-7 h-7 rounded-lg border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-455 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-white/5 transition-all cursor-pointer"
                    >
                      &lt;
                    </button>
                    <button
                      onClick={() =>
                        setGoalPage((prev) =>
                          Math.min(prev + 1, totalGoalPages),
                        )
                      }
                      disabled={goalPage === totalGoalPages}
                      className="w-7 h-7 rounded-lg border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-455 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-white/5 transition-all cursor-pointer"
                    >
                      &gt;
                    </button>
                  </div>
                </div>
              )}
            </div>

            {activeCalendarGoalId && (
              <>
                <div
                  className="fixed inset-0 z-40 bg-transparent cursor-default"
                  onClick={() => setActiveCalendarGoalId(null)}
                />
                {renderCalendarPopover(
                  activeCalendarGoalId,
                  goals.find((g) => g._id === activeCalendarGoalId)?.startDate,
                  goals.find((g) => g._id === activeCalendarGoalId)?.endDate,
                  async (start, end) => {
                    try {
                      await updateGoal({
                        id: activeCalendarGoalId,
                        goalData: {
                          startDate: start ? start.toISOString() : null,
                          endDate: end ? end.toISOString() : null,
                        },
                      }).unwrap();
                    } catch (err) {
                      toast.error("Failed to update dates");
                    }
                  },
                )}
              </>
            )}
          </div>

          {/* MY PROJECTS card */}
          <div className="sidebar-bg rounded-xl border border-slate-200 dark:border-white/5 shadow-xs p-6 flex flex-col min-h-[400px]">
            {/* Header: Title and Go to project page link */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[13px] font-black text-[#2e1d6c] dark:text-[#a594fd] uppercase tracking-wider">
                My Projects
              </h3>
              <Link
                to={`/${user?.role}/projects`}
                className="text-[13px] font-bold text-[#8370ec] dark:text-[#9b89ff] hover:underline cursor-pointer"
              >
                Go to project page
              </Link>
            </div>

            {/* Grid list of project blocks */}
            <div className="flex flex-wrap gap-4 align-top content-start">
              {/* Dashed Create Project Button */}
              <div
                onClick={() => setShowCreateModal(true)}
                className="w-44 h-20 border-2 border-dashed border-[#8d7df5]/60 hover:border-[#8d7df5] dark:border-purple-600/40 rounded-2xl flex flex-col items-center justify-center gap-0.5 cursor-pointer bg-white/20 dark:bg-white/5 hover:bg-white/40 dark:hover:bg-white/10 transition-all text-[#2e1d6c] dark:text-purple-300"
              >
                <span className="text-xl font-bold font-sans">+</span>
                <span className="text-[10px] font-black uppercase tracking-wider">
                  Create Project
                </span>
              </div>

              {/* Loop through projects created by current user */}
              {userProjects &&
                userProjects.slice(0, 3).map((proj) => (
                  <Link
                    key={proj._id}
                    to={`/${user?.role}/projects?id=${proj._id}`}
                    className="w-52 h-20 bg-white/80 dark:bg-white/5 rounded-2xl p-4 flex items-center gap-3 border border-white/40 dark:border-white/5 shadow-xs hover:shadow-md transition-all cursor-pointer text-left block"
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/30 flex items-center justify-center text-[#8d7df5] dark:text-purple-300 shrink-0 border border-purple-200/40 dark:border-white/5">
                        <FiLayers size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-[12px] font-bold text-[#2e1d6c] dark:text-purple-200 truncate leading-tight">
                          {proj.name}
                        </h4>
                        <span className="text-[9px] font-black text-[#8d7df5] dark:text-purple-400 uppercase tracking-widest block mt-1">
                          {proj.status || "Active"}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
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
          ) && <GraphicDesignerDashboard targetDept={activeDeptTab} />}
          {activeDeptTab?.toLowerCase().includes("web") && (
            <WebDeveloperDashboard targetDept={activeDeptTab} />
          )}
          {activeDeptTab?.toLowerCase().includes("social") && (
            <SocialMediaManagerDashboard targetDept={activeDeptTab} />
          )}
          {activeDeptTab?.toLowerCase().includes("seo") && (
            <SEOSpecialistDashboard targetDept={activeDeptTab} />
          )}
          {activeDeptTab?.toLowerCase().includes("performance") && (
            <PerformanceMarketerDashboard targetDept={activeDeptTab} />
          )}

          {!["Graphic Designer", "VideoGrapher", "Editor"].includes(
            activeDeptTab,
          ) &&
            !activeDeptTab?.toLowerCase().includes("web") &&
            !activeDeptTab?.toLowerCase().includes("social") &&
            !activeDeptTab?.toLowerCase().includes("seo") &&
            !activeDeptTab?.toLowerCase().includes("performance") && (
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
        user?.role !== "operationmanager" &&
        user?.department?.toLowerCase() !== "social media manager" && (
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
