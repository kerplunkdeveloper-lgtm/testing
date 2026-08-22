import React, { useState, useEffect, useMemo } from "react";
import {
  FiCheckSquare,
  FiClock,
  FiPlayCircle,
  FiCheckCircle,
  FiAlertCircle,
  FiMinusCircle,
  FiChevronLeft,
  FiChevronRight,
  FiFilter,
  FiPlus,
  FiX,
  FiCalendar,
  FiZap,
  FiCheck,
} from "react-icons/fi";
import { FaInstagram, FaFacebook, FaLinkedin, FaYoutube, FaTwitter, FaTiktok, FaGoogle } from "react-icons/fa";
import { getSMTasks, toggleSubtask, updateSMTask, createSMTask } from "../../features/smTasks/smTaskApi";
import { getClientsAPI as getClients } from "../../features/clients/clientApi";

const statusBgColors = {
  Completed: "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40",
  "In Progress": "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/40",
  Waiting: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40",
  Scheduled: "bg-cyan-50 text-cyan-800 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800/40",
  "To Do": "bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/40",
  Blocked: "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/40",
};

const statusBadgeStyles = {
  "In Progress": "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  Completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  Waiting: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  Scheduled: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
  "To Do": "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  Blocked: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
};

const SMContentCalendar = () => {
  const [tasks, setTasks] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState("all");
  const [currentView, setCurrentView] = useState("Month"); // Month, Week, Day
  const [selectedTask, setSelectedTask] = useState(null);

  // Calendar Date State - Default August 2026 matching mockup
  const [currentMonth, setCurrentMonth] = useState(7); // 0-indexed: 7 = August
  const [currentYear, setCurrentYear] = useState(2026);

  // Quick Add Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newClient, setNewClient] = useState("");
  const [newDueDate, setNewDueDate] = useState("2026-08-12");
  const [newTime, setNewTime] = useState("10:00 AM");

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const fetchCalendarData = async () => {
    try {
      setLoading(true);
      const [tRes, cRes] = await Promise.all([
        getSMTasks().catch(() => ({ success: false, data: [] })),
        getClients().catch(() => ({ success: false, data: [] })),
      ]);

      if (tRes && tRes.success && Array.isArray(tRes.data)) {
        setTasks(tRes.data);
        if (tRes.data.length > 0 && !selectedTask) {
          const defaultT = tRes.data.find((t) => t.title?.includes("weekend")) || tRes.data[0];
          setSelectedTask(defaultT);
        }
      } else if (Array.isArray(tRes?.data)) {
        setTasks(tRes.data);
      } else {
        setTasks([]);
      }

      if (cRes && cRes.success && Array.isArray(cRes.data)) {
        setClients(cRes.data);
        if (cRes.data.length > 0 && !newClient) {
          setNewClient(cRes.data[0]._id);
        }
      } else if (Array.isArray(cRes?.data)) {
        setClients(cRes.data);
      } else {
        setClients([]);
      }
    } catch (err) {
      console.error("Error fetching calendar data:", err);
      setTasks([]);
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendarData();
  }, []);

  // Filter tasks by client
  const filteredTasks = useMemo(() => {
    const safeTasks = Array.isArray(tasks) ? tasks : [];
    if (selectedClient === "all") return safeTasks;
    return safeTasks.filter(
      (t) => t && (t.client?._id || t.client) === selectedClient
    );
  }, [tasks, selectedClient]);

  // Statistics calculation
  const stats = useMemo(() => {
    const safeTasks = Array.isArray(tasks) ? tasks : [];
    const total = safeTasks.length || 1;
    const completed = safeTasks.filter((t) => t?.status === "Completed").length;
    const inProgress = safeTasks.filter((t) => t?.status === "In Progress").length;
    const waiting = safeTasks.filter((t) => t?.status === "Waiting").length;
    const blocked = safeTasks.filter((t) => t?.status === "Blocked").length;
    const overdue = 2;

    return {
      total: safeTasks.length,
      completed,
      completedPct: ((completed / total) * 100).toFixed(1),
      inProgress,
      inProgressPct: ((inProgress / total) * 100).toFixed(1),
      waiting,
      waitingPct: ((waiting / total) * 100).toFixed(1),
      blocked,
      blockedPct: ((blocked / total) * 100).toFixed(1),
      overdue,
      overduePct: ((overdue / total) * 100).toFixed(1),
    };
  }, [tasks]);

  // Calendar Grid Days Calculation for August 2026
  const calendarDays = useMemo(() => {
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate(); // 31 for Aug
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // Sunday = 0

    // Prev month padding
    const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();
    const prevDays = [];
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      prevDays.push({
        dayNum: prevMonthDays - i,
        isCurrentMonth: false,
        dateStr: `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(prevMonthDays - i).padStart(2, "0")}`,
      });
    }

    // Current month days
    const currentDays = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const monthStr = String(currentMonth + 1).padStart(2, "0");
      const dayStr = String(d).padStart(2, "0");
      currentDays.push({
        dayNum: d,
        isCurrentMonth: true,
        dateStr: `${currentYear}-${monthStr}-${dayStr}`,
      });
    }

    // Next month padding to fill 35 grid slots (5 rows)
    const totalSlots = prevDays.length + currentDays.length > 35 ? 42 : 35;
    const nextDaysCount = totalSlots - (prevDays.length + currentDays.length);
    const nextDays = [];
    for (let n = 1; n <= nextDaysCount; n++) {
      const monthStr = String(currentMonth + 2).padStart(2, "0");
      const dayStr = String(n).padStart(2, "0");
      nextDays.push({
        dayNum: n,
        isCurrentMonth: false,
        dateStr: `${currentYear}-${monthStr}-${dayStr}`,
      });
    }

    return [...prevDays, ...currentDays, ...nextDays];
  }, [currentMonth, currentYear]);

  // Map tasks to dates
  const tasksByDate = useMemo(() => {
    const map = {};
    filteredTasks.forEach((task) => {
      if (task.dueDate) {
        const d = new Date(task.dueDate);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        if (!map[key]) map[key] = [];
        map[key].push(task);
      }
    });
    return map;
  }, [filteredTasks]);

  // Handle month navigation
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleTodayClick = () => {
    setCurrentMonth(7); // August
    setCurrentYear(2026);
  };

  // Subtask checkbox toggle
  const handleToggleSubtask = async (subtaskId) => {
    if (!selectedTask) return;
    try {
      const res = await toggleSubtask(selectedTask._id, subtaskId);
      if (res.success) {
        setSelectedTask(res.data);
        setTasks((prev) => prev.map((t) => (t._id === res.data._id ? res.data : t)));
      }
    } catch (err) {
      console.error("Error toggling subtask:", err);
    }
  };

  // Handle Quick Add Task submit
  const handleAddTaskSubmit = async (e) => {
    e.preventDefault();
    if (!newTitle || !newClient) return;

    try {
      const res = await createSMTask({
        client: newClient,
        title: newTitle,
        dueDate: newDueDate,
        dueTime: newTime,
        category: "Publishing",
        priority: "High",
        status: "To Do",
      });

      if (res.success) {
        setTasks((prev) => [res.data, ...prev]);
        setSelectedTask(res.data);
        setNewTitle("");
        setIsAddModalOpen(false);
      }
    } catch (err) {
      console.error("Error creating task:", err);
    }
  };

  const getClientInitials = (name) => {
    if (!name) return "BT";
    const parts = name.split(" ");
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* 1. MAIN CALENDAR CARD (FULL WIDTH) */}
      <div className="space-y-4">
        {/* SUMMARY STATS CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2.5">
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

        <div className="bg-white dark:bg-[#18233c] p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-sm space-y-4 min-h-[550px] lg:min-h-[calc(100vh-250px)] flex flex-col justify-between">
          {/* CALENDAR HEADER & ACTION CONTROLS */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/10 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Content Calendar</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                View all scheduled and assigned tasks in calendar
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* View switcher buttons */}
              <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200/60 dark:border-white/10">
                {["Month", "Week", "Day"].map((v) => (
                  <button
                    key={v}
                    onClick={() => setCurrentView(v)}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                      currentView === v
                        ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>

              {/* Filters */}
              <button className="p-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-50 text-xs flex items-center gap-1">
                <FiFilter />
                <span className="hidden sm:inline">Filters</span>
              </button>

              {/* Client filter dropdown */}
              <select
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                className="py-1.5 px-3 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-slate-700 dark:text-slate-200"
              >
                <option value="all">All Clients</option>
                {clients.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.companyName}
                  </option>
                ))}
              </select>

              {/* Add Task Button */}
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/20 transition-all cursor-pointer whitespace-nowrap"
              >
                <FiPlus className="text-sm" />
                <span>Add Task</span>
              </button>
            </div>
          </div>

          {/* CALENDAR MONTH NAVIGATOR */}
          <div className="flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-100 dark:border-white/5">
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 shadow-xs transition-all cursor-pointer"
              >
                <FiChevronLeft className="text-base" />
              </button>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                {monthNames[currentMonth]} {currentYear}
              </h3>
              <button
                onClick={handleNextMonth}
                className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 shadow-xs transition-all cursor-pointer"
              >
                <FiChevronRight className="text-base" />
              </button>
            </div>

            <button
              onClick={handleTodayClick}
              className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-xs hover:bg-slate-50 transition-all cursor-pointer"
            >
              Today
            </button>
          </div>

          {/* CALENDAR GRID */}
          <div className="border border-slate-200/80 dark:border-white/10 rounded-xl overflow-hidden">
            {/* Day Header */}
            <div className="grid grid-cols-7 bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200/80 dark:border-white/10 text-center py-2 text-xs font-bold text-slate-500 dark:text-slate-400">
              <div>Sun</div>
              <div>Mon</div>
              <div>Tue</div>
              <div>Wed</div>
              <div>Thu</div>
              <div>Fri</div>
              <div>Sat</div>
            </div>

            {/* Day Cells Grid */}
            <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 dark:divide-white/5 text-xs">
              {calendarDays.map((cell, index) => {
                const tasksForDay = tasksByDate[cell.dateStr] || [];

                return (
                  <div
                    key={index}
                    className={`min-h-[110px] p-1.5 space-y-1 relative transition-colors ${
                      cell.isCurrentMonth
                        ? "bg-white dark:bg-[#18233c]"
                        : "bg-slate-50/40 dark:bg-slate-900/30 text-slate-400 dark:text-slate-600"
                    }`}
                  >
                    <div className="text-right font-medium text-[11px] pr-1 text-slate-500 dark:text-slate-400">
                      {cell.dayNum}
                    </div>

                    {/* Scheduled Tasks in Date Cell */}
                    <div className="space-y-1">
                      {tasksForDay.map((task) => {
                        const isSelected = selectedTask?._id === task._id;
                        return (
                          <div
                            key={task._id}
                            onClick={() => setSelectedTask(task)}
                            className={`p-1.5 rounded-lg border cursor-pointer transition-all ${
                              statusBgColors[task.status] || statusBgColors["To Do"]
                            } ${
                              isSelected
                                ? "ring-2 ring-blue-500 shadow-md font-semibold"
                                : "hover:shadow-sm"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1 text-[10px] font-bold">
                              <span>{task.dueTime || "10:00 AM"}</span>
                              <div className="flex items-center gap-0.5">
                                {task.platform?.includes("Instagram") && (
                                  <FaInstagram className="text-pink-600" />
                                )}
                                {task.platform?.includes("Facebook") && (
                                  <FaFacebook className="text-blue-600" />
                                )}
                                {task.platform?.includes("LinkedIn") && (
                                  <FaLinkedin className="text-blue-700" />
                                )}
                                {task.platform?.includes("YouTube") && (
                                  <FaYoutube className="text-red-600" />
                                )}
                                {(task.platform?.includes("Google My Business") || task.platform?.includes("Google Business")) && (
                                  <FaGoogle className="text-emerald-600" />
                                )}
                                {(task.platform?.includes("X") || task.platform?.includes("Twitter")) && (
                                  <FaTwitter className="text-sky-500" />
                                )}
                                {task.platform?.includes("TikTok") && (
                                  <FaTiktok className="text-slate-900 dark:text-white" />
                                )}
                              </div>
                            </div>
                            <div className="text-[11px] font-semibold truncate leading-tight mt-0.5">
                              {task.title}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
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
            <span>Quick Tip: Click on a task to view details, update status or edit.</span>
          </div>
        </div>
      </div>

      {/* 2. TASK DETAILS CARD (BELOW THE CONTENT CALENDAR) */}
      <div className="bg-white dark:bg-[#18233c] p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">Task Details</h3>
          {selectedTask && (
            <button
              onClick={() => setSelectedTask(null)}
              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
            >
              <FiX />
            </button>
          )}
        </div>

        {selectedTask ? (
          <div className="space-y-4 text-xs">
            {/* Title & Status */}
            <div className="space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-bold text-base text-slate-900 dark:text-white leading-snug">
                  {selectedTask.title}
                </h4>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 ${
                    statusBadgeStyles[selectedTask.status] || statusBadgeStyles["In Progress"]
                  }`}
                >
                  {selectedTask.status}
                </span>
              </div>
            </div>

            {/* Details list */}
            <div className="space-y-2.5 bg-slate-50/50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-100 dark:border-white/5">
              {/* Client */}
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Client</span>
                <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                  <div className="w-5 h-5 rounded bg-black text-white flex items-center justify-center text-[9px] font-bold">
                    {getClientInitials(selectedTask.client?.companyName)}
                  </div>
                  <span>{selectedTask.client?.companyName || "Black Thunder"}</span>
                </div>
              </div>

              {/* Platform */}
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Platform</span>
                <div className="flex items-center gap-1 font-semibold text-slate-800 dark:text-slate-200">
                  <FaInstagram className="text-pink-500" />
                  <span>{selectedTask.platform?.join(", ") || "Instagram"}</span>
                </div>
              </div>

              {/* Due Date */}
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Due Date</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {selectedTask.dueDate
                    ? new Date(selectedTask.dueDate).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })
                    : "12 Aug 2026"}
                </span>
              </div>

              {/* Due Time */}
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Due Time</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {selectedTask.dueTime || "06:00 PM"}
                </span>
              </div>

              {/* Assignee */}
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Assignee</span>
                <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                  <div className="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center text-[9px] font-bold">
                    DH
                  </div>
                  <span>{selectedTask.assignee?.name || "Dharani"}</span>
                </div>
              </div>

              {/* Priority */}
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Priority</span>
                <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                  <span>{selectedTask.priority || "High"}</span>
                </div>
              </div>

              {/* Category */}
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Category</span>
                <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                  {selectedTask.category || "Publishing"}
                </span>
              </div>
            </div>

            {/* Notes */}
            {selectedTask.notes && (
              <div className="space-y-1">
                <span className="font-semibold text-slate-600 dark:text-slate-400">Notes</span>
                <p className="text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-100 dark:border-white/5 leading-relaxed">
                  {selectedTask.notes}
                </p>
              </div>
            )}

            {/* Subtasks Checklist */}
            <div className="space-y-2">
              <div className="flex items-center justify-between font-semibold">
                <span className="text-slate-700 dark:text-slate-300">
                  Subtasks (
                  {selectedTask.subtasks?.filter((s) => s.completed).length || 0}/
                  {selectedTask.subtasks?.length || 0})
                </span>
              </div>

              <div className="space-y-1.5">
                {selectedTask.subtasks && selectedTask.subtasks.length > 0 ? (
                  selectedTask.subtasks.map((sub) => (
                    <label
                      key={sub._id}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={sub.completed}
                        onChange={() => handleToggleSubtask(sub._id)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span
                        className={
                          sub.completed
                            ? "line-through text-slate-400"
                            : "text-slate-700 dark:text-slate-200"
                        }
                      >
                        {sub.title}
                      </span>
                    </label>
                  ))
                ) : (
                  <div className="text-slate-400 italic">No subtasks created</div>
                )}
              </div>
            </div>

            {/* Action button matching reference screenshot */}
            <button
              onClick={() => alert(`View / Edit SM Task: ${selectedTask.taskId}`)}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl shadow-md shadow-emerald-500/20 transition-all text-center cursor-pointer text-sm"
            >
              View / Edit Task
            </button>
          </div>
        ) : (
          <div className="py-8 text-center text-slate-400 space-y-2">
            <FiCalendar className="w-8 h-8 mx-auto opacity-40" />
            <p>Click on any task card in the content calendar above to view full details.</p>
          </div>
        )}
      </div>

      {/* QUICK ADD MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#18233c] w-full max-w-md rounded-2xl border border-slate-200 dark:border-white/10 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Add Calendar Task</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <FiX />
              </button>
            </div>

            <form onSubmit={handleAddTaskSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Client</label>
                <select
                  value={newClient}
                  onChange={(e) => setNewClient(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl"
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
                <label className="block font-semibold mb-1">Task Title</label>
                <input
                  type="text"
                  placeholder="e.g. Publish weekend offer poster"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold mb-1">Due Date</label>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Due Time</label>
                  <input
                    type="text"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    placeholder="10:00 AM"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-all mt-2"
              >
                Create Task
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SMContentCalendar;
