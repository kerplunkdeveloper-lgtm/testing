import React, { useMemo, useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useGetTasksQuery, useGetProjectsQuery, useDeleteTaskMutation } from "../../features/api/apiSlice";
import { getUsers } from "../../features/users/userSlice";
import { FiFileText, FiCheckCircle, FiCalendar, FiChevronDown, FiChevronLeft, FiChevronRight, FiTrash2 } from "react-icons/fi";
import ClientBadge from "../../components/common/ClientBadge";
import ClientCalls from "../client-calls/ClientCalls";
import axiosInstance from "../../services/axiosInstance";

const formatCreatedTime = (time) => {
  if (!time) return "—";
  const date = new Date(time);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};



const renderUserAvatarSmall = (u, sizeClass = "w-6 h-6 text-[8px]") => {
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
        className={`${sizeClass} rounded-full object-cover border border-slate-200/80 dark:border-white/10 shadow-2xs shrink-0`}
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
      className={`${sizeClass} rounded-full bg-gradient-to-br ${colorClass} flex items-center justify-center text-white font-black border border-white/10 shadow-2xs shrink-0`}
    >
      {initials}
    </div>
  );
};

const getStatusStyle = (status) => {
  const s = (status || "").toLowerCase();
  if (s === "pending" || s === "to do") {
    return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
  }
  if (s === "in progress") {
    return "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300";
  }
  if (s === "on hold") {
    return "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300";
  }
  if (s === "in review") {
    return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300";
  }
  if (s === "completed" || s === "done") {
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300";
  }
  if (s === "correction") {
    return "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300";
  }
  if (s === "rejected") {
    return "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300";
  }
  return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
};

const getPriorityStyle = (priority) => {
  const p = (priority || "").toLowerCase();
  if (p === "top high") {
    return "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300 font-bold";
  }
  if (p === "high") {
    return "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300 font-bold";
  }
  if (p === "medium") {
    return "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 font-medium";
  }
  return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
};

const MomClientReport = () => {
  const { user } = useSelector((state) => state.auth);
  const { users } = useSelector((state) => state.users);
  const dispatch = useDispatch();

  React.useEffect(() => {
    dispatch(getUsers());
  }, [dispatch]);

  const [deleteTask] = useDeleteTaskMutation();
  const handleDeleteTask = async (taskId) => {
    if (window.confirm("Are you sure you want to delete this task?")) {
      try {
        await deleteTask(taskId).unwrap();
      } catch (err) {
        console.error("Failed to delete task:", err);
      }
    }
  };

  const { data: tasks = [], isLoading: tasksLoading } = useGetTasksQuery(undefined, {
    skip: !user,
  });

  const { data: projects = [], isLoading: projectsLoading } = useGetProjectsQuery(undefined, {
    skip: !user,
  });

  const [dateFilter, setDateFilter] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [clientFilter, setClientFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [localCheckedTasks, setLocalCheckedTasks] = useState(new Set());
  const [activeTab, setActiveTab] = useState("mom");

  const [clientCalls, setClientCalls] = useState([]);
  const [clientCallsLoading, setClientCallsLoading] = useState(false);
  const [localCheckedCalls, setLocalCheckedCalls] = useState(new Set());
  
  const [currentPage, setCurrentPage] = useState(1);
  const tasksPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [dateFilter, assigneeFilter, clientFilter, activeTab, statusFilter]);

  useEffect(() => {
    if (activeTab === "clientcall" && clientCalls.length === 0) {
      const fetchCalls = async () => {
        setClientCallsLoading(true);
        try {
          const res = await axiosInstance.get("/client-calls");
          setClientCalls(res.data.data || []);
        } catch (error) {
          console.error("Error fetching client calls:", error);
        } finally {
          setClientCallsLoading(false);
        }
      };
      fetchCalls();
    }
  }, [activeTab, clientCalls.length]);

  const handleToggleCheckCall = (callId) => {
    setLocalCheckedCalls(prev => {
      const next = new Set(prev);
      if (next.has(callId)) next.delete(callId);
      else next.add(callId);
      return next;
    });
  };

  const handleToggleCheck = (taskId) => {
    setLocalCheckedTasks(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const filteredTasks = useMemo(() => {
    const filtered = tasks.filter((task) => {
      if ((task.contentType || "").toUpperCase() !== "MOM") return false;

      const assigneeId = task.assignedTo?._id || task.assignedTo;
      if (assigneeFilter && assigneeId !== assigneeFilter) return false;

      const projId = task.project?._id || task.project;
      const projectObj = projects.find((p) => p._id === projId);
      const clientObj = task.project?.client?.companyName ? task.project.client : projectObj?.client;
      const clientId = clientObj?._id || clientObj;
      
      if (clientFilter && clientId !== clientFilter) return false;

      if (dateFilter) {
        const taskDate = task.createdAt ? new Date(task.createdAt).toISOString().split('T')[0] : null;
        if (taskDate !== dateFilter) return false;
      }

      if (statusFilter !== "All") {
        const s = (task.status || "pending").toLowerCase();
        const isCompleted = s === "completed" || s === "done";
        if (statusFilter === "Completed" && !isCompleted) return false;
        if (statusFilter === "Pending" && isCompleted) return false;
      }

      return true;
    });

    return filtered.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [tasks, projects, dateFilter, assigneeFilter, clientFilter, statusFilter]);

  const filteredClientCalls = useMemo(() => {
    const filtered = clientCalls.filter(call => {
      const assigneeId = call.createdBy?._id || call.createdBy;
      if (assigneeFilter && assigneeId !== assigneeFilter) return false;

      const clientId = call.client?._id || call.client;
      if (clientFilter && clientId !== clientFilter) return false;

      if (dateFilter) {
        const callDate = call.createdAt ? new Date(call.createdAt).toISOString().split('T')[0] : null;
        if (callDate !== dateFilter) return false;
      }

      return true;
    });

    return filtered.sort((a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0));
  }, [clientCalls, dateFilter, assigneeFilter, clientFilter]);

  const uniqueClientCallAssignees = useMemo(() => {
    const map = new Map();
    clientCalls.forEach(call => {
      const id = call.createdBy?._id || call.createdBy;
      if (id && !map.has(id)) {
        const name = call.createdBy?.name || "Unknown User";
        map.set(id, { id, name });
      }
    });
    return Array.from(map.values()).sort((a,b) => a.name.localeCompare(b.name));
  }, [clientCalls]);

  const uniqueClientCallClients = useMemo(() => {
    const map = new Map();
    clientCalls.forEach(call => {
      const clientId = call.client?._id || call.client;
      if (clientId && !map.has(clientId)) {
        const name = call.client?.companyName || "Unknown Client";
        map.set(clientId, { id: clientId, name });
      }
    });
    return Array.from(map.values()).sort((a,b) => a.name.localeCompare(b.name));
  }, [clientCalls]);

  const uniqueAssignees = useMemo(() => {
    const map = new Map();
    tasks.forEach(task => {
      if ((task.contentType || "").toUpperCase() === "MOM") {
        const id = task.assignedTo?._id || task.assignedTo;
        if (id && !map.has(id)) {
           const name = typeof task.assignedTo === "object" ? task.assignedTo.name : users?.find(u => (u._id || u.id) === id)?.name || "Unknown";
           map.set(id, { id, name });
        }
      }
    });
    return Array.from(map.values()).sort((a,b) => a.name.localeCompare(b.name));
  }, [tasks, users]);

  const uniqueClients = useMemo(() => {
    const map = new Map();
    tasks.forEach(task => {
      if ((task.contentType || "").toUpperCase() === "MOM") {
        const projId = task.project?._id || task.project;
        const projectObj = projects.find((p) => p._id === projId);
        const clientObj = task.project?.client?.companyName ? task.project.client : projectObj?.client;
        const clientId = clientObj?._id || clientObj;
        const clientName = clientObj?.companyName || "Unknown Client";
        if (clientId && !map.has(clientId)) {
           map.set(clientId, { id: clientId, name: clientName });
        }
      }
    });
    return Array.from(map.values()).sort((a,b) => a.name.localeCompare(b.name));
  }, [tasks, projects]);

  const handleAdjustDate = (days) => {
    let d;
    if (dateFilter) {
      const [year, month, day] = dateFilter.split("-").map(Number);
      d = new Date(year, month - 1, day);
    } else {
      d = new Date();
    }
    d.setDate(d.getDate() + days);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dayStr = String(d.getDate()).padStart(2, '0');
    setDateFilter(`${y}-${m}-${dayStr}`);
  };

  const handleSetToday = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dayStr = String(d.getDate()).padStart(2, '0');
    setDateFilter(`${y}-${m}-${dayStr}`);
  };

  const getDisplayDate = () => {
    if (!dateFilter) return "Select Date";
    const [year, month, day] = dateFilter.split("-").map(Number);
    const d = new Date(year, month - 1, day);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const loading = tasksLoading || projectsLoading;

  const indexOfLastTask = currentPage * tasksPerPage;
  const indexOfFirstTask = indexOfLastTask - tasksPerPage;
  const currentTasks = filteredTasks.slice(indexOfFirstTask, indexOfLastTask);
  const totalPages = Math.ceil(filteredTasks.length / tasksPerPage);

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-[#020710] overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-3.5 theme-bg-accent shadow-md shrink-0">
        <div className="bg-white/20 p-1.5 rounded-lg">
          <FiFileText size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-base font-bold text-white leading-tight">MOM Client Report / Client Call </h1>
          <p className="text-[11px] font-medium text-indigo-100">Social Media Team - MOM Tasks Overview And  ClientCall  Overview</p>
        </div>
      </div>



{/* tab for MoM and Clientcall logs */}
<div className="px-6 pb-3 theme-bg-accent">
  <div className="flex p-1 space-x-1 bg-black/15 dark:bg-black/30 rounded-xl w-fit shadow-inner">
    <button
      onClick={() => setActiveTab("mom")}
      className={`px-6 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${
        activeTab === "mom"
          ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 shadow-sm ring-1 ring-black/5"
          : "text-white/80 hover:text-white hover:bg-white/10"
      }`}
    >
      MoM
    </button>
    <button
      onClick={() => setActiveTab("clientcall")}
      className={`px-6 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${
        activeTab === "clientcall"
          ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 shadow-sm ring-1 ring-black/5"
          : "text-white/80 hover:text-white hover:bg-white/10"
      }`}
    >
      Client Call
    </button>
  </div>
</div>












      
      <div className="  py-3 flex-1 flex flex-col min-h-0 overflow-y-auto">
        {activeTab === "mom" ? (
          <>
            <div className="flex flex-col xl:flex-row xl:justify-between xl:items-center mb-3 gap-2.5 shrink-0 px-6">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 min-w-[130px] shadow-2xs cursor-pointer hover:border-slate-300 transition-colors"
            >
              <option value="">All Assignees</option>
              {uniqueAssignees.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
            
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 min-w-[130px] shadow-2xs cursor-pointer hover:border-slate-300 transition-colors"
            >
              <option value="">All Clients</option>
              {uniqueClients.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setDateFilter("")}
              className="px-3 py-1.5 bg-[#f0f5fa] dark:bg-slate-800 hover:bg-[#e2e8f0] dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-lg transition-colors cursor-pointer"
            >
              All Dates
            </button>
            <button
              onClick={handleSetToday}
              className="px-3 py-1.5 bg-[#f0f5fa] dark:bg-slate-800 hover:bg-[#e2e8f0] dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-lg transition-colors cursor-pointer"
            >
              Today
            </button>

            <div 
              className="relative group cursor-pointer" 
              onClick={(e) => {
                const input = e.currentTarget.querySelector('input[type="date"]');
                if (input && typeof input.showPicker === 'function') {
                  input.showPicker();
                }
              }}
            >
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[#f0f5fa] dark:bg-slate-800 hover:bg-[#e2e8f0] dark:hover:bg-slate-700 rounded-lg transition-colors min-w-[130px] justify-between cursor-pointer">
                <div className="flex items-center gap-1.5">
                  <FiCalendar className="text-emerald-500" size={14} />
                  <span className="text-slate-800 dark:text-slate-200 font-bold text-xs">
                    {getDisplayDate()}
                  </span>
                </div>
                <FiChevronDown className="text-slate-400" size={12} />
              </div>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>

            <div className="flex items-center bg-[#f0f5fa] dark:bg-slate-800 rounded-lg overflow-hidden">
              <button
                onClick={() => handleAdjustDate(-1)}
                className="px-2 py-1.5 hover:bg-[#e2e8f0] dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                title="Previous Day"
              >
                <FiChevronLeft size={14} strokeWidth={2.5} />
              </button>
              <div className="w-px h-3.5 bg-slate-200 dark:bg-slate-600"></div>
              <button
                onClick={() => handleAdjustDate(1)}
                className="px-2 py-1.5 hover:bg-[#e2e8f0] dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                title="Next Day"
              >
                <FiChevronRight size={14} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <span className="text-slate-500 text-xs font-medium animate-pulse">Loading reports...</span>
          </div>
        ) : (
          <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-2xs border border-slate-200 dark:border-slate-800 overflow-hidden flex-1 flex flex-col min-h-0">
            <div className="flex justify-between items-center px-4 py-3 shrink-0 border-b border-slate-200 dark:border-slate-800">
              <div className="flex space-x-2">
                {["All", "Pending", "Completed"].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setStatusFilter(tab)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                      statusFilter === tab
                        ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/50 shadow-sm"
                        : "text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto overflow-y-auto flex-1">
              <table className="w-full table-auto text-left border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-slate-50 dark:bg-[#151b2b] border-b border-slate-200 dark:border-slate-800 shadow-2xs">
                    <th className="px-3 py-2 text-center whitespace-nowrap">
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Check</span>
                    </th>
                    <th className="px-3 py-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Client Name</th>
                    <th className="px-3 py-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Task Title</th>
                    <th className="px-3 py-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Created By</th>
                    <th className="px-3 py-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Assignee</th>
                    <th className="px-3 py-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Start Date</th>
                    <th className="px-3 py-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">End Date</th>
                    <th className="px-3 py-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap text-center">Priority</th>
                    <th className="px-3 py-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center whitespace-nowrap">Status</th>
                    <th className="px-3 py-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center whitespace-nowrap">Created Time</th>
                    <th className="px-3 py-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Feedback MOM</th>
                    <th className="px-3 py-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {currentTasks.length === 0 ? (
                    <tr>
                      <td colSpan="12" className="px-3 py-8 text-center text-slate-500 text-[11px] font-medium">
                        No MOM tasks found for the selected criteria.
                      </td>
                    </tr>
                  ) : (
                    currentTasks.map((task) => {
                      const assigneeId = task.assignedTo?._id || task.assignedTo;
                      const assigneeName = typeof task.assignedTo === "object" ? task.assignedTo?.name : (users?.find(u => (u._id || u.id) === assigneeId)?.name || "Unknown");
                      
                      const createdById = task.createdBy?._id || task.createdBy;
                      const createdByName = typeof task.createdBy === "object" ? task.createdBy?.name : (users?.find(u => (u._id || u.id) === createdById)?.name || "Unknown");
                      const createdByUserObj = typeof task.createdBy === "object" ? task.createdBy : users?.find(u => (u._id || u.id) === createdById);

                      const projId = task.project?._id || task.project;
                      const projectObj = projects.find((p) => p._id === projId);
                      const clientObj = task.project?.client?.companyName ? task.project.client : projectObj?.client;
                      const clientName = clientObj?.companyName || "Unknown Client";
                      
                      const assigneeUserObj = typeof task.assignedTo === "object" ? task.assignedTo : users?.find(u => (u._id || u.id) === assigneeId);

                      const isCompleted = task.status?.toLowerCase() === "completed" || task.status?.toLowerCase() === "done";

                      return (
                        <tr key={task._id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition-colors">
                          <td className="px-3 py-3 align-top text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1">
                              <button 
                                onClick={() => handleToggleCheck(task._id)}
                                className={`w-4 h-4 rounded-full flex items-center justify-center shadow-2xs cursor-pointer transition-colors ${
                                  (isCompleted || localCheckedTasks.has(task._id))
                                    ? "bg-emerald-500 text-white border-emerald-500" 
                                    : "border border-slate-300 dark:border-slate-600 hover:border-slate-400"
                                }`}
                              >
                                {(isCompleted || localCheckedTasks.has(task._id)) && <FiCheckCircle size={10} strokeWidth={3} />}
                              </button>
                              {(isCompleted || localCheckedTasks.has(task._id)) && (
                                <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">Checked</span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-3 align-top text-xs font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                            {clientObj ? (
                              <ClientBadge client={clientObj} size="sm" />
                            ) : (
                              <span>{clientName}</span>
                            )}
                          </td>
                          <td className="px-3 py-3 align-top text-xs text-slate-700 dark:text-slate-300 font-medium min-w-[350px]" title={task.title}>
                            <div className="line-clamp-3 whitespace-normal break-words">
                              {task.title}
                            </div>
                          </td>
                          <td className="px-3 py-3 align-top text-xs font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              {renderUserAvatarSmall(createdByUserObj, "w-5 h-5 text-[8px]")}
                              <div className="flex flex-col">
                                <span>{createdByName}</span>
                                {createdByUserObj?.department && (
                                  <span className="text-[9px] font-medium text-slate-500 dark:text-slate-400 leading-[10px]">
                                    {createdByUserObj.department}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3 align-top text-xs font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              {renderUserAvatarSmall(assigneeUserObj, "w-5 h-5 text-[8px]")}
                              <div className="flex flex-col">
                                <span>{assigneeName}</span>
                                {assigneeUserObj?.department && (
                                  <span className="text-[9px] font-medium text-slate-500 dark:text-slate-400 leading-[10px]">
                                    {assigneeUserObj.department}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3 align-top text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            {task.startDate ? new Date(task.startDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "—"}
                          </td>
                          <td className="px-3 py-3 align-top text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            {task.dueDate ? new Date(task.dueDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "—"}
                          </td>
                          <td className="px-3 py-3 align-top text-[11px] text-center whitespace-nowrap">
                            <span className={`px-1.5 py-0.5 rounded ${getPriorityStyle(task.priority)}`}>
                              {task.priority || "Medium"}
                            </span>
                          </td>
                          <td className="px-3 py-3 align-top text-[11px] text-center whitespace-nowrap">
                            <span className={`px-1.5 py-0.5 rounded ${getStatusStyle(task.status)} font-bold`}>
                              {task.status || "Pending"}
                            </span>
                          </td>
                          <td className="px-3 py-3 align-top text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap text-center">
                            {formatCreatedTime(task.createdAt)}
                          </td>
                          <td className="px-3 py-3 align-top text-xs text-slate-700 dark:text-slate-200 whitespace-nowrap" title={task.feedbackMom || ""}>
                            {task.feedbackMom ? (
                              <span className="font-medium text-slate-700 dark:text-slate-200">
                                {task.feedbackMom}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">—</span>
                            )}
                          </td>
                          <td className="px-3 py-3 align-top text-center whitespace-nowrap">
                            <button
                              onClick={() => handleDeleteTask(task._id)}
                              className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                              title="Delete Task"
                            >
                              <FiTrash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 shrink-0">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Showing {indexOfFirstTask + 1} to {Math.min(indexOfLastTask, filteredTasks.length)} of {filteredTasks.length} entries
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-2.5 py-1 text-xs font-bold rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-slate-600 dark:text-slate-300"
                  >
                    Prev
                  </button>
                  <span className="px-2 text-xs font-bold text-slate-700 dark:text-slate-200">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-2.5 py-1 text-xs font-bold rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-slate-600 dark:text-slate-300"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
          </>
        ) : (
          <>
            <div className="flex flex-col xl:flex-row xl:justify-between xl:items-center mb-3 gap-2.5 shrink-0 px-6">
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={assigneeFilter}
                  onChange={(e) => setAssigneeFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 min-w-[130px] shadow-2xs cursor-pointer hover:border-slate-300 transition-colors"
                >
                  <option value="">All Users</option>
                  {uniqueClientCallAssignees.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
                
                <select
                  value={clientFilter}
                  onChange={(e) => setClientFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 min-w-[130px] shadow-2xs cursor-pointer hover:border-slate-300 transition-colors"
                >
                  <option value="">All Clients</option>
                  {uniqueClientCallClients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => setDateFilter("")}
                  className="px-3 py-1.5 bg-[#f0f5fa] dark:bg-slate-800 hover:bg-[#e2e8f0] dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  All Dates
                </button>
                <button
                  onClick={handleSetToday}
                  className="px-3 py-1.5 bg-[#f0f5fa] dark:bg-slate-800 hover:bg-[#e2e8f0] dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  Today
                </button>

                <div 
                  className="relative group cursor-pointer" 
                  onClick={(e) => {
                    const input = e.currentTarget.querySelector('input[type="date"]');
                    if (input && typeof input.showPicker === 'function') {
                      input.showPicker();
                    }
                  }}
                >
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-[#f0f5fa] dark:bg-slate-800 hover:bg-[#e2e8f0] dark:hover:bg-slate-700 rounded-lg transition-colors min-w-[130px] justify-between cursor-pointer">
                    <div className="flex items-center gap-1.5">
                      <FiCalendar className="text-emerald-500" size={14} />
                      <span className="text-slate-800 dark:text-slate-200 font-bold text-xs">
                        {getDisplayDate()}
                      </span>
                    </div>
                    <FiChevronDown className="text-slate-400" size={12} />
                  </div>
                  <input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>

                <div className="flex items-center bg-[#f0f5fa] dark:bg-slate-800 rounded-lg overflow-hidden">
                  <button
                    onClick={() => handleAdjustDate(-1)}
                    className="px-2 py-1.5 hover:bg-[#e2e8f0] dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                    title="Previous Day"
                  >
                    <FiChevronLeft size={14} strokeWidth={2.5} />
                  </button>
                  <div className="w-px h-3.5 bg-slate-200 dark:bg-slate-600"></div>
                  <button
                    onClick={() => handleAdjustDate(1)}
                    className="px-2 py-1.5 hover:bg-[#e2e8f0] dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                    title="Next Day"
                  >
                    <FiChevronRight size={14} strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            </div>

            {clientCallsLoading ? (
              <div className="flex justify-center items-center py-20">
                <span className="text-slate-500 text-xs font-medium animate-pulse">Loading calls...</span>
              </div>
            ) : (
              <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-2xs border border-slate-200 dark:border-slate-800 overflow-hidden flex-1 flex flex-col min-h-0 mx-6">
                <div className="overflow-x-auto overflow-y-auto flex-1">
                  <table className="w-full table-auto text-left border-collapse">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-slate-50 dark:bg-[#151b2b] border-b border-slate-200 dark:border-slate-800 shadow-2xs">
                        <th className="px-3 py-2 text-center whitespace-nowrap"><span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Check</span></th>
                        <th className="px-3 py-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">User Name</th>
                        <th className="px-3 py-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Client Name</th>
                        <th className="px-3 py-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Time</th>
                        <th className="px-3 py-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Duration</th>
                        <th className="px-3 py-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Discussion Points</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                      {filteredClientCalls.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400 text-xs">
                            No client calls found for the selected criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredClientCalls.map(call => {
                          const isChecked = localCheckedCalls.has(call._id);
                          const clientObj = call.client;
                          const clientName = clientObj?.companyName || "Unknown Client";
                          const userName = call.createdBy?.name || "Unknown User";

                          const callDate = call.date ? new Date(call.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "";
                          
                          return (
                            <tr key={call._id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition-colors">
                              <td className="px-3 py-1.5 text-center whitespace-nowrap">
                                <div className="flex items-center justify-center gap-1">
                                  <button 
                                    onClick={() => handleToggleCheckCall(call._id)}
                                    className={`w-4 h-4 rounded-full flex items-center justify-center shadow-2xs cursor-pointer transition-colors ${
                                      isChecked
                                        ? "bg-emerald-500 text-white border-emerald-500" 
                                        : "border border-slate-300 dark:border-slate-600 hover:border-slate-400"
                                    }`}
                                  >
                                    {isChecked && <FiCheckCircle size={10} strokeWidth={3} />}
                                  </button>
                                  {isChecked && (
                                    <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">Checked</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                                <div className="flex items-center gap-1.5">
                                  {renderUserAvatarSmall(call.createdBy, "w-5 h-5 text-[8px]")}
                                  <span>{userName}</span>
                                </div>
                              </td>
                              <td className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                {clientObj ? (
                                  <ClientBadge client={clientObj} size="sm" />
                                ) : (
                                  <span>{clientName}</span>
                                )}
                              </td>
                              <td className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                <span className="font-medium">{callDate}</span> <br/>
                                <span className="text-[10px] text-slate-500">{call.startTime} - {call.endTime}</span>
                              </td>
                              <td className="px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                                {call.duration}
                              </td>
                              <td className="px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 min-w-[200px]">
                                {call.discussionPoints ? (
                                  <span className="font-medium">{call.discussionPoints}</span>
                                ) : (
                                  <span className="text-slate-400 italic">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MomClientReport;
