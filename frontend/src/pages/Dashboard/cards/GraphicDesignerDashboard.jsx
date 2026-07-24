import React, { useMemo, useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useTheme } from "../../../context/ThemeContext";
import { useGetTasksQuery } from "../../../features/api/apiSlice";
import { getDesignerEodReports } from "../../../features/eodReports/designerEodReportSlice";
import {
  format,
  isToday,
  isPast,
  parseISO,
  differenceInDays,
  isYesterday,
  isAfter,
  subDays,
  isSameMonth,
} from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiClock,
  FiAlertCircle,
  FiActivity,
  FiFilter,
  FiChevronDown,
  FiCheckCircle,
  FiUsers,
  FiLayers,
  FiBriefcase,
  FiTrendingUp,
  FiXCircle,
  FiFileText,
} from "react-icons/fi";

const GraphicDesignerDashboard = ({ targetDept = "Graphic Designer" }) => {
  const dispatch = useDispatch();
  const { theme } = useTheme();
  const isDarkMode =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  const { user } = useSelector((state) => state.auth);
  const { users } = useSelector((state) => state.users);
  const { projects } = useSelector((state) => state.projects);
  const { clients } = useSelector((state) => state.clients);
  const { designerEodReports = [] } = useSelector(
    (state) => state.designerEodReports || {},
  );
  const { data: allTasks = [], isLoading } = useGetTasksQuery();

  const [dateFilter, setDateFilter] = useState("Today");
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const params = {};
    if (dateFilter === "Today") {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, "0");
      const day = String(today.getDate()).padStart(2, "0");
      params.date = `${year}-${month}-${day}`;
    } else if (dateFilter === "Yesterday") {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const year = yesterday.getFullYear();
      const month = String(yesterday.getMonth() + 1).padStart(2, "0");
      const day = String(yesterday.getDate()).padStart(2, "0");
      params.date = `${year}-${month}-${day}`;
    }
    dispatch(getDesignerEodReports(params));
  }, [dispatch, dateFilter]);

  // 1. Filter Department Members dynamically based on targetDept
  const designers = useMemo(() => {
    const deptLower = targetDept.toLowerCase();
    const baseDesigners =
      users?.filter((u) => {
        const uDept = u.department?.toLowerCase() || "";
        if (deptLower.includes("graphic")) {
          return uDept.includes("graphic") || uDept.includes("design");
        }
        if (deptLower.includes("videographer") || deptLower.includes("video")) {
          return uDept.includes("videographer") || uDept.includes("video");
        }
        if (deptLower.includes("editor")) {
          return uDept.includes("editor") || uDept.includes("edit");
        }
        return uDept === deptLower || uDept.includes(deptLower);
      }) || [];

    const isSocialMediaManager =
      user?.department?.toLowerCase() === "social media manager";
    if (isSocialMediaManager) {
      const currentUserId = user?._id || user?.id;
      const assignedDesignerIds = new Set();

      allTasks.forEach((task) => {
        const creatorId =
          task.createdBy && typeof task.createdBy === "object"
            ? task.createdBy._id
            : task.createdBy;
        if (creatorId === currentUserId && task.assignedTo) {
          const assigneeId =
            typeof task.assignedTo === "object"
              ? task.assignedTo._id
              : task.assignedTo;
          assignedDesignerIds.add(assigneeId);
        }
      });

      return baseDesigners.filter((d) => assignedDesignerIds.has(d._id));
    }

    return baseDesigners;
  }, [users, allTasks, user, targetDept]);

  const designerIds = useMemo(() => designers.map((d) => d._id), [designers]);

  // 2. Filter Tasks assigned to Graphic Designers + Date Filter
  const designerTasks = useMemo(() => {
    return allTasks.filter((task) => {
      // Check Assignee
      if (!task.assignedTo) return false;
      const assigneeId =
        typeof task.assignedTo === "object"
          ? task.assignedTo._id
          : task.assignedTo;
      if (!designerIds.includes(assigneeId)) return false;

      // Check Creator if logged-in user is a Social Media Manager
      const isSocialMediaManager =
        user?.department?.toLowerCase() === "social media manager";
      if (isSocialMediaManager) {
        const creatorId =
          task.createdBy && typeof task.createdBy === "object"
            ? task.createdBy._id
            : task.createdBy;
        const currentUserId = user?._id || user?.id;
        if (creatorId !== currentUserId) return false;
      }

      // Check Date
      if (dateFilter === "All Time") return true;
      if (!task.createdAt) return true; // fallback

      const taskDate = parseISO(task.createdAt);
      if (dateFilter === "Today") return isToday(taskDate);
      if (dateFilter === "Yesterday") return isYesterday(taskDate);
      if (dateFilter === "Last 7 Days")
        return isAfter(taskDate, subDays(new Date(), 7));
      if (dateFilter === "This Month") return isSameMonth(taskDate, new Date());

      return true;
    });
  }, [allTasks, designerIds, dateFilter, user]);

  // 3. Compute Metrics
  const metrics = useMemo(() => {
    let completed = 0;
    let pending = 0;
    let overdue = 0;
    let inRevision = 0;
    let clientApproval = 0;
    let rejected = 0;
    let totalRevisions = 0;

    designerTasks.forEach((task) => {
      const status = task.status?.toLowerCase() || "";
      if (status === "completed") completed++;
      else if (status.includes("reject")) rejected++;
      else if (status.includes("revision")) inRevision++;
      else if (status.includes("client") || status.includes("approval"))
        clientApproval++;
      else pending++;

      totalRevisions += task.revisions || 0;

      if (
        task.dueDate &&
        isPast(parseISO(task.dueDate)) &&
        status !== "completed"
      ) {
        overdue++;
      }
    });

    return {
      designersWorking: designers.length,
      tasksAssigned: designerTasks.length,
      completed,
      pending,
      overdue,
      inRevision,
      clientApproval,
      rejected,
      totalRevisions,
    };
  }, [designerTasks, designers.length]);

  const interruptions = useMemo(() => {
    let totalBlockers = 0;
    const counts = {
      "Client Calls": 0,
      "Urgent Tasks": 0,
      "Revisions": 0,
      "Meetings": 0,
      "Other": 0
    };

    const processBlocker = (type) => {
      totalBlockers++;
      if (!type) {
        counts["Other"]++;
        return;
      }
      const t = type.toLowerCase();
      if (t.includes("call") || t.includes("client")) counts["Client Calls"]++;
      else if (t.includes("urgent")) counts["Urgent Tasks"]++;
      else if (t.includes("revision")) counts["Revisions"]++;
      else if (t.includes("meeting")) counts["Meetings"]++;
      else counts["Other"]++;
    };

    designerTasks.forEach((task) => {
      if (task.blockerHistory && Array.isArray(task.blockerHistory)) {
        task.blockerHistory.forEach(b => processBlocker(b.blockerType));
      }
      if (task.isBlocked) {
        processBlocker(task.blockerType);
      }
    });

    return { total: totalBlockers, counts };
  }, [designerTasks]);

  // 4. Board Data
  const boardColumns = [
    "Pending",
    "In Progress",
    "Revision Pending",
    "Rejected",
    "Completed",
  ];
  const getColumnForTask = (task) => {
    const status = task.status || "Pending";
    if (boardColumns.includes(status)) return status;
    if (status.toLowerCase().includes("progress")) return "In Progress";
    if (status.toLowerCase().includes("review")) return "Revision Pending";
    if (status.toLowerCase().includes("revision")) return "Revision";
    if (status.toLowerCase().includes("reject")) return "Rejected";
    if (status.toLowerCase().includes("approve")) return "Completed";
    if (status.toLowerCase() === "completed") return "Completed";
    if (status.toLowerCase() === "assigned") return "Pending";
    return "Pending";
  };

  const tasksByColumn = useMemo(() => {
    const cols = {};
    boardColumns.forEach((c) => (cols[c] = []));
    designerTasks.forEach((task) => {
      const col = getColumnForTask(task);
      if (cols[col]) cols[col].push(task);
    });
    return cols;
  }, [designerTasks]);

  // 5. Team Performance
  const teamPerformance = useMemo(() => {
    return designers.map((designer) => {
      const myTasks = designerTasks.filter((t) => {
        if (!t.assignedTo) return false;
        const aId =
          typeof t.assignedTo === "object" ? t.assignedTo._id : t.assignedTo;
        return aId === designer._id;
      });

      let comp = 0;
      let pend = 0;
      let over = 0;
      let totalRevisions = 0;
      let totalLoggedMs = 0;
      let totalBlockerMs = 0;
      const blockerTypesSet = new Set();

      myTasks.forEach((t) => {
        const s = t.status?.toLowerCase() || "";
        if (s === "completed") comp++;
        else pend++;
        if (t.dueDate && isPast(parseISO(t.dueDate)) && s !== "completed")
          over++;

        totalRevisions += t.revisions || 0;

        if (t.actualStartTime) {
          const start = new Date(t.actualStartTime).getTime();
          const end = t.actualEndTime
            ? new Date(t.actualEndTime).getTime()
            : Date.now();
          totalLoggedMs += Math.max(0, end - start);
        }

        // Collect blockers and compute blocker time
        if (t.blockerHistory && Array.isArray(t.blockerHistory)) {
          t.blockerHistory.forEach((item) => {
            if (item.blockerType) {
              blockerTypesSet.add(item.blockerType);
            }
            if (item.pausedAt && item.resumedAt) {
              const p = new Date(item.pausedAt).getTime();
              const r = new Date(item.resumedAt).getTime();
              if (r >= p) {
                totalBlockerMs += r - p;
              }
            } else if (item.totalPauseMinutes) {
              totalBlockerMs += item.totalPauseMinutes * 60 * 1000;
            }
          });
        }
        
        if (t.isBlocked) {
          if (t.blockerType) {
            blockerTypesSet.add(t.blockerType);
          }
          if (t.blockerPausedAt) {
            const pauseStart = new Date(t.blockerPausedAt).getTime();
            const currentPause = Date.now() - pauseStart;
            if (currentPause > 0) {
              totalBlockerMs += currentPause;
            }
          }
        }
      });

      const avgRevisions =
        myTasks.length > 0 ? totalRevisions / myTasks.length : 0;
      const totalHours = totalLoggedMs / (1000 * 60 * 60);

      const getLocalDateString = (date = new Date()) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      };

      // Filter reports for this designer
      const designerReports =
        designerEodReports?.filter((report) => {
          const rUserId =
            typeof report.user === "object" ? report.user?._id : report.user;
          return rUserId === designer._id;
        }) || [];

      // Find the one that matches the dateFilter
      let designerReport = null;
      if (dateFilter === "Today") {
        const todayStr = getLocalDateString();
        designerReport = designerReports.find((report) => {
          const reportDate = new Date(report.date).toISOString().split("T")[0];
          return reportDate === todayStr;
        });
      } else if (dateFilter === "Yesterday") {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = getLocalDateString(yesterday);
        designerReport = designerReports.find((report) => {
          const reportDate = new Date(report.date).toISOString().split("T")[0];
          return reportDate === yesterdayStr;
        });
      } else {
        // For range filters, find the latest report within the filter range
        designerReport = designerReports.find((report) => {
          const reportDate = new Date(report.date);
          if (dateFilter === "Last 7 Days") {
            return isAfter(reportDate, subDays(new Date(), 7));
          } else if (dateFilter === "This Month") {
            return isSameMonth(reportDate, new Date());
          }
          return true; // All Time
        });
      }

      let lastSubmittedStr = "Not submitted";
      if (designerReport) {
        if (designerReport.isDraft) {
          lastSubmittedStr = "Draft";
        } else {
          const reportUpdatedAt = new Date(designerReport.updatedAt);
          if (isToday(reportUpdatedAt)) {
            lastSubmittedStr = format(reportUpdatedAt, "h:mm a");
          } else {
            lastSubmittedStr = format(reportUpdatedAt, "MMM dd, h:mm a");
          }
        }
      }

      return {
        id: designer._id,
        name: designer.name,
        profileImage:
          (typeof designer.profile?.profileImage === "object"
            ? designer.profile?.profileImage?.url
            : designer.profile?.profileImage) ||
          (typeof designer.profileImage === "object"
            ? designer.profileImage?.url
            : designer.profileImage) ||
          designer.profilePic ||
          designer.avatar ||
          designer.profile?.profilePic ||
          designer.profile?.avatar,
        assigned: myTasks.length,
        completed: comp,
        pending: pend,
        overdue: over,
        avgRevisions,
        totalHours,
        blockers: blockerTypesSet.size > 0 ? Array.from(blockerTypesSet).join(", ") : "none",
        blockerTimeMs: totalBlockerMs,
        lastSubmitted: lastSubmittedStr,
      };
    });
  }, [designers, designerTasks, designerEodReports, dateFilter]);

  // 6. Client Progress
  const clientProgress = useMemo(() => {
    const cp = {};
    designerTasks.forEach((task) => {
      let clientId = task.client;
      if (typeof clientId === "object" && clientId?._id)
        clientId = clientId._id;
      if (!clientId && task.project) {
        const projId =
          typeof task.project === "object" ? task.project._id : task.project;
        const proj = projects?.find((p) => p._id === projId);
        clientId = proj?.client?._id || proj?.client;
      }
      if (!clientId) return;

      if (!cp[clientId]) {
        cp[clientId] = {
          id: clientId,
          pending: 0,
          completed: 0,
          dueToday: 0,
          delayed: 0,
          revision: 0,
        };
      }

      const s = task.status?.toLowerCase() || "";
      if (s === "completed") cp[clientId].completed++;
      else {
        cp[clientId].pending++;
        if (s.includes("revision")) cp[clientId].revision++;
        if (task.dueDate) {
          if (isToday(parseISO(task.dueDate))) cp[clientId].dueToday++;
          if (isPast(parseISO(task.dueDate))) cp[clientId].delayed++;
        }
      }
    });

    return Object.values(cp).map((c) => {
      const cl = clients?.find((cl) => cl._id === c.id);
      return { ...c, name: cl?.name || cl?.companyName || "Unknown Client" };
    });
  }, [designerTasks, projects, clients]);

  // 7. Delayed Projects/Tasks
  const delayedTasks = useMemo(() => {
    return designerTasks
      .filter(
        (t) =>
          t.dueDate &&
          isPast(parseISO(t.dueDate)) &&
          t.status?.toLowerCase() !== "completed",
      )
      .map((t) => {
        let diff = differenceInDays(new Date(), parseISO(t.dueDate));
        return {
          ...t,
          daysDelayed:
            diff === 0 ? "Same day" : diff + (diff === 1 ? " day" : " days"),
        };
      });
  }, [designerTasks]);

  if (isLoading) {
    return (
      <div className="animate-pulse h-96 bg-slate-100 dark:bg-slate-800/50 rounded-2xl w-full flex items-center justify-center text-slate-400 font-mono text-sm tracking-widest uppercase shadow-inner border border-slate-200 dark:border-slate-800">
        Initializing {targetDept} Board...
      </div>
    );
  }

  const getInitials = (name) => {
    if (!name) return "";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="bg-white dark:bg-[#0b1120] py-4 md:py-4 px-0 md:px-0 space-y-8 font-sans  overflow-visible transition-colors duration-300 relative">
      {/* Header & Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-20">
        <div className="space-y-1 ">
          <h2 className="text-sm lg:text-xl font-black tracking-tight text-slate-800 dark:text-white flex items-center justify-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-500/20 rounded-xl">
              <FiActivity className="text-emerald-600 dark:text-emerald-400 text-xl" />
            </div>
            {targetDept} Board
          </h2>
        </div>

        {/* Date Filter Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-100  border border-slate-200 dark:border-slate-600/50 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 transition-all shadow-sm backdrop-blur-md"
          >
            <FiFilter className="text-emerald-500 dark:text-emerald-400" />
            {dateFilter}
            <FiChevronDown
              className={`transition-transform duration-200 ${showDropdown ? "rotate-180" : ""}`}
            />
          </button>

          <AnimatePresence>
            {showDropdown && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setShowDropdown(false)}
                />
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0  w-48 bg-white dark:bg-[#070b13] border border-slate-200 dark:border-slate-800/80 rounded-xl shadow-2xl z-40 overflow-hidden backdrop-blur-xl"
                >
                  {[
                    "Today",
                    "Yesterday",
                    "Last 7 Days",
                    "This Month",
                    "All Time",
                  ].map((option) => (
                    <button
                      key={option}
                      onClick={() => {
                        setDateFilter(option);
                        setShowDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-3 text-sm font-black transition-colors ${
                        dateFilter === option 
                          ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                          : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-800 dark:hover:text-slate-100"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Premium Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-7 gap-3 lg:gap-2 relative z-10">
        {[
          {
            label:
              user?.role === "admin" || user?.role === "operationmanager"
                ? (targetDept.toLowerCase().endsWith("s") ? `Total ${targetDept}` : `Total ${targetDept}s`)
                : `Assigned ${targetDept}`,
            value: metrics.designersWorking,
            icon: FiUsers,
            glow: "hover:shadow-[0_4px_20px_rgba(59,130,246,0.15)]",
            bg: "bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-800 dark:to-blue-900 border border-blue-200/50 dark:border-blue-900/30",
            labelColor: "text-white dark:text-white",
            valueColor: "text-slate-100 dark:text-white",
            iconBg:
              "bg-blue-100 dark:bg-blue-950 border border-blue-200 dark:border-blue-500",
            iconColor: "text-blue-600 dark:text-blue-400",
          },
          {
            label: "Tasks Assigned",
            value: metrics.tasksAssigned,
            icon: FiLayers,
            glow: "hover:shadow-[0_4px_20px_rgba(99,102,241,0.15)]",
            bg: "bg-gradient-to-br from-violet-400 to-violet-500 dark:from-red-950 dark:to-indigo-900 border border-indigo-200/50 dark:border-indigo-900/30",
            labelColor: "text-white dark:text-white",
            valueColor: "text-slate-100 dark:text-white",
            iconBg:
              "bg-indigo-100 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-500/20",
            iconColor: "text-indigo-600 dark:text-indigo-400",
          },
          {
            label: "Completed",
            value: metrics.completed,
            icon: FiCheckCircle,
            glow: "hover:shadow-[0_4px_20px_rgba(16,185,129,0.15)]",
            bg: "bg-gradient-to-br from-emerald-400 to-emerald-500 dark:from-emerald-700 dark:to-emerald-800 border border-emerald-200/50 dark:border-emerald-900/30",
            labelColor: "text-white dark:text-white",
            valueColor: "text-slate-100 dark:text-white",
            iconBg:
              "bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-500/20",
            iconColor: "text-emerald-600 dark:text-emerald-400",
          },
          {
            label: "Pending",
            value: metrics.pending,
            icon: FiClock,
            glow: "hover:shadow-[0_4px_20px_rgba(245,158,11,0.15)]",
            bg: "bg-gradient-to-br from-amber-500 to-amber-600 dark:from-amber-800 dark:to-amber-900 border border-amber-200/50 dark:border-amber-900/30",
            labelColor: "text-white dark:text-white",
            valueColor: "text-slate-100 dark:text-white",
            iconBg:
              "bg-amber-100 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-500/20",
            iconColor: "text-amber-600 dark:text-amber-400",
          },
          {
            label: "Revision",
            value: metrics.totalRevisions,
            icon: FiTrendingUp,
            glow: "hover:shadow-[0_4px_20px_rgba(139,92,246,0.15)]",
            bg: "bg-gradient-to-br from-indigo-500 to-indigo-600 dark:from-indigo-800 dark:to-indigo-950 border border-indigo-200/50 dark:border-indigo-900/30",
            labelColor: "text-white dark:text-white",
            valueColor: "text-slate-100 dark:text-white",
            iconBg:
              "bg-indigo-100 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-500/20",
            iconColor: "text-indigo-600 dark:text-indigo-400",
          },
          {
            label: "Overdue",
            value: metrics.overdue,
            icon: FiAlertCircle,
            glow: "hover:shadow-[0_4px_20px_rgba(244,63,94,0.15)]",
            bg: "bg-gradient-to-br from-rose-500 to-rose-600 dark:from-rose-600 dark:to-rose-800 border border-rose-200/50 dark:border-rose-900/30",
            labelColor: "text-white dark:text-white",
            valueColor: "text-slate-100 dark:text-white",
            iconBg:
              "bg-rose-100 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-500/20",
            iconColor: "text-rose-600 dark:text-rose-400",
          },
          {
            label: "Rejected",
            value: metrics.rejected,
            icon: FiXCircle,
            glow: "hover:shadow-[0_4px_20px_rgba(239,68,68,0.15)]",
            bg: "bg-gradient-to-br from-red-500 to-red-600 dark:from-red-650 dark:to-red-800 border border-red-200/50 dark:border-red-900/30",
            labelColor: "text-white dark:text-white",
            valueColor: "text-slate-100 dark:text-white",
            iconBg:
              "bg-red-100 dark:bg-red-950/60 border border-red-200 dark:border-red-500/20",
            iconColor: "text-red-600 dark:text-red-400",
          },
        ].map((m, i) => {
          const IconComponent = m.icon;
          return (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              key={i}
              className={`flex flex-col text-left p-3 rounded-2xl ${m.bg} ${m.glow} relative overflow-hidden group hover:scale-[1.03] transition-all duration-300 backdrop-blur-md shadow-sm`}
            >
              {/* Decorative light reflection overlay */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-white/10 to-transparent rounded-full -mr-6 -mt-6 blur-md pointer-events-none" />

              <div className="flex items-center justify-between mb-3 relative z-10">
                <span
                  className={`text-3xl font-black ${m.valueColor} tracking-tight`}
                >
                  {m.value}
                </span>
                <div
                  className={`p-2.5 rounded-xl ${m.iconBg} group-hover:scale-110 transition-transform duration-300`}
                >
                  <IconComponent size={18} className={m.iconColor} />
                </div>
              </div>

              <span
                className={`text-[10px] font-black tracking-widest uppercase mt-1 leading-tight relative z-10 ${m.labelColor}`}
              >
                {m.label}
              </span>
            </motion.div>
          );
        })}
      </div>

      {/* Today's Interruptions */}
      <div className="mb-8 relative z-10">
        <div className="bg-slate-50 dark:bg-slate-100 p-5 rounded-3xl border border-slate-200 dark:border-slate-300 backdrop-blur-md shadow-lg">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex-shrink-0 min-w-[150px] border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-700 pb-4 md:pb-0 md:pr-6">
              <h3 className="text-xs font-black tracking-widest text-slate-500 dark:text-slate-400 mb-2 uppercase flex items-center gap-2">
                <FiAlertCircle className="text-orange-500" size={14} />
                Interruptions
              </h3>
              <span className="text-4xl font-black text-slate-800 dark:text-white block leading-none">
                {interruptions.total}
              </span>
              <span className="text-[10px] font-bold text-slate-500 uppercase mt-1.5 block">
                Total Blockers Today
              </span>
            </div>
            
            <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/50 hover:border-blue-400 transition-colors group">
                <span className="text-2xl font-black text-blue-600 dark:text-blue-400 block group-hover:scale-105 transition-transform origin-left">{interruptions.counts["Client Calls"]}</span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1 block">Client Calls</span>
              </div>
              <div className="bg-white dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/50 hover:border-rose-400 transition-colors group">
                <span className="text-2xl font-black text-rose-600 dark:text-rose-400 block group-hover:scale-105 transition-transform origin-left">{interruptions.counts["Urgent Tasks"]}</span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1 block">Urgent Tasks</span>
              </div>
              <div className="bg-white dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/50 hover:border-purple-400 transition-colors group">
                <span className="text-2xl font-black text-purple-600 dark:text-purple-400 block group-hover:scale-105 transition-transform origin-left">{interruptions.counts["Revisions"]}</span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1 block">Revisions</span>
              </div>
              <div className="bg-white dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/50 hover:border-emerald-400 transition-colors group">
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 block group-hover:scale-105 transition-transform origin-left">{interruptions.counts["Meetings"]}</span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1 block">Meetings</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Live Task Board */}
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4 px-1">
          <h3 className="text-md font-bold text-slate-800 dark:text-white tracking-wide ">
            Live Task Board
          </h3>
          <span className="flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            LIVE SYNC
          </span>
        </div>
        <div className="flex xl:grid xl:grid-cols-5 overflow-x-auto gap-3 pb-6 snap-x hide-scrollbar">
          {boardColumns.map((col, i) => (
            <div
              key={i}
              className="min-w-[210px] xl:min-w-0 w-full flex-shrink-0 snap-start bg-slate-50 dark:bg-[#0f172a] backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-300/80 flex flex-col max-h-[450px] shadow-sm"
            >
              <div className="p-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-800/80 rounded-t-2xl backdrop-blur-md">
                <span className="text-[10px] font-black text-slate-800 dark:text-black tracking-widest uppercase truncate max-w-[80%]">
                  {col}
                </span>
                <span className="text-[10px] font-black bg-slate-200 dark:bg-indigo-500/20 text-slate-700 dark:text-white px-2 py-0.5 rounded-md border border-slate-300 dark:border-indigo-500/30 shrink-0">
                  {tasksByColumn[col].length}
                </span>
              </div>
              <div className="p-2.5 overflow-y-auto space-y-2.5 flex-1 custom-scrollbar">
                <AnimatePresence>
                  {tasksByColumn[col].map((task) => {
                    let projName = "No Project";
                    if (task.project) {
                      const pId =
                        typeof task.project === "object"
                          ? task.project._id
                          : task.project;
                      const p = projects?.find((x) => x._id === pId);
                      projName = p?.name || "Unknown";
                    }

                    return (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        key={task._id}
                        className="bg-white dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-400 transition-all shadow-sm hover:shadow-md relative group backdrop-blur-sm"
                      >
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-indigo-500 to-purple-500 rounded-l-xl opacity-100" />
                        {/* Title row: icon + name on left, date on right */}
                        <div className="flex items-start justify-between gap-2 pl-1.5 mb-2">
                          <div className="flex items-start gap-1.5 min-w-0">
                            <FiFileText size={12} className="text-indigo-400 dark:text-indigo-400 shrink-0 mt-0.5" />
                            <p className="text-xs font-bold text-slate-700 dark:text-white leading-snug break-words">
                              {task.title}
                            </p>
                          </div>
                          {task.dueDate && (
                            <span
                              className={`shrink-0 flex items-center gap-1 text-[9px] font-bold whitespace-nowrap ${isPast(parseISO(task.dueDate)) && task.status !== "Completed" ? "text-rose-500 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 px-1.5 py-0.5 rounded" : "text-slate-400 dark:text-slate-500"}`}
                            >
                              <FiClock size={9} />
                              {format(parseISO(task.dueDate), "MMM dd")}
                            </span>
                          )}
                        </div>
                        {/* Assigned User */}
                        {(() => {
                          const aId = task.assignedTo
                            ? typeof task.assignedTo === "object"
                              ? task.assignedTo._id
                              : task.assignedTo
                            : null;
                          const assignedUser = aId
                            ? designers.find((d) => d._id === aId) ||
                              (task.assignedTo &&
                              typeof task.assignedTo === "object"
                                ? task.assignedTo
                                : null)
                            : null;
                          const assignedByName = task.createdBy
                            ? typeof task.createdBy === "object"
                              ? task.createdBy.name
                              : null
                            : null;
                          if (!assignedUser && !assignedByName) return null;
                          const profileImg =
                            assignedUser?.profile?.profileImage?.url ||
                            assignedUser?.profileImage?.url ||
                            null;
                          const initials = (assignedUser?.name || "")
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2);
                          return (
                            <div className="mt-2 pl-1 pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-2">
                              {/* Assigned To — left */}
                              {assignedUser ? (
                                <div className="flex items-center gap-1.5 min-w-0">
                                  {profileImg ? (
                                    <img
                                      src={profileImg}
                                      alt={assignedUser.name}
                                      className="w-5 h-5 rounded-full object-cover ring-1 ring-indigo-400/40 shrink-0"
                                    />
                                  ) : (
                                    <div className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-[8px] font-black ring-1 ring-indigo-400/30 shrink-0">
                                      {initials}
                                    </div>
                                  )}
                                  <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 truncate">
                                    {assignedUser.name}
                                  </span>
                                </div>
                              ) : (
                                <div />
                              )}
                              {/* Assigned By — right */}
                              {assignedByName && (
                                <div className="flex items-center gap-1 shrink-0">
                                  <span className="text-[9px] font-black bg-yellow-500 p-2 rounded-full text-black  uppercase tracking-wider">
                                    SM
                                  </span>
                                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                                    {assignedByName}
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="relative z-10">
        {/* Team Performance */}
        <div className="bg-white dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm dark:shadow-2xl">
          <div className="p-5 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-transparent flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white tracking-widest ">
              {targetDept} Performance
            </h3>
            <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-300 uppercase tracking-wider">
              {dateFilter}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/60">
                  <th className="p-4 border-r border-b border-slate-200 dark:border-slate-700 text-[10px] font-black tracking-widest text-slate-500 dark:text-slate-400 uppercase">
                    {targetDept}
                  </th>
                  <th className="p-4 border-r border-b border-slate-200 dark:border-slate-700 text-[10px] font-black tracking-widest text-slate-500 dark:text-slate-400 uppercase">
                    Assigned
                  </th>
                  <th className="p-4 border-r border-b border-slate-200 dark:border-slate-700 text-[10px] font-black tracking-widest text-slate-500 dark:text-slate-400 uppercase">
                    Completed
                  </th>
                  <th className="p-4 border-r border-b border-slate-200 dark:border-slate-700 text-[10px] font-black tracking-widest text-slate-500 dark:text-slate-400 uppercase">
                    Pending
                  </th>
                  <th className="p-4 border-r border-b border-slate-200 dark:border-slate-700 text-[10px] font-black tracking-widest text-slate-500 dark:text-slate-400 uppercase">
                    Revisions
                  </th>
                  <th className="p-4 border-r border-b border-slate-200 dark:border-slate-700 text-[10px] font-black tracking-widest text-slate-500 dark:text-slate-400 uppercase">
                    Blockers
                  </th>
                  <th className="p-4 border-r border-b border-slate-200 dark:border-slate-700 text-[10px] font-black tracking-widest text-slate-500 dark:text-slate-400 uppercase">
                    Blocker Time
                  </th>
                  <th className="p-4 border-r border-b border-slate-200 dark:border-slate-700 text-[10px] font-black tracking-widest text-slate-500 dark:text-slate-400 uppercase">
                    Total Hours
                  </th>
                  <th className="p-4 border-r border-b border-slate-200 dark:border-slate-700 text-[10px] font-black tracking-widest text-slate-500 dark:text-slate-400 uppercase">
                    Delay
                  </th>
                  <th className="p-4 border-b border-slate-200 dark:border-slate-700 text-[10px] font-black tracking-widest text-slate-500 dark:text-slate-400 uppercase">
                    Last Submitted
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/80">
                {teamPerformance.map((tp) => (
                  <tr
                    key={tp.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="p-4 border-r border-b border-slate-100 dark:border-slate-700/60 text-sm font-bold text-slate-700 dark:text-white">
                      <div className="flex items-center gap-2">
                        {tp.profileImage ? (
                          <img
                            src={tp.profileImage}
                            alt={tp.name}
                            className="w-6 h-6 rounded-full object-cover border border-slate-400"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[9px] font-extrabold tracking-wider">
                            {getInitials(tp.name)}
                          </div>
                        )}
                        {tp.name}
                      </div>
                    </td>
                    <td className="p-4 border-r border-b border-slate-100 dark:border-slate-700/60 text-sm font-black text-slate-650 dark:text-slate-200">
                      {tp.assigned}
                    </td>
                    <td className="p-4 border-r border-b border-slate-100 dark:border-slate-700/60 text-sm font-black text-slate-650 dark:text-slate-200">
                      {tp.completed}
                    </td>
                    <td className="p-4 border-r border-b border-slate-100 dark:border-slate-700/60 text-sm font-black text-slate-650 dark:text-slate-200">
                      {tp.pending}
                    </td>
                    <td className="p-4 border-r border-b border-slate-100 dark:border-slate-700/60 text-sm font-black text-slate-600 dark:text-slate-200">
                      <div className="flex items-center gap-2.5 min-w-[110px]">
                        <div className="w-14 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              tp.avgRevisions <= 1.5
                                ? "bg-emerald-500"
                                : tp.avgRevisions <= 3.0
                                  ? "bg-amber-500"
                                  : "bg-rose-500"
                            }`}
                            style={{
                              width: `${Math.min(100, (tp.avgRevisions / 5) * 100)}%`,
                            }}
                          />
                        </div>
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-300">
                          {tp.avgRevisions.toFixed(1)} avg
                        </span>
                      </div>
                    </td>
                    <td className="p-4 border-r border-b border-slate-100 dark:border-slate-700/60 text-sm text-slate-600 dark:text-slate-200">
                      {tp.blockers === "none" ? (
                        <span className="text-slate-400 dark:text-slate-500 font-bold italic">none</span>
                      ) : (
                        <div className="flex flex-wrap gap-1 max-w-[180px]">
                          {tp.blockers.split(", ").map((b, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 text-[10px] font-bold rounded bg-orange-50 dark:bg-orange-500/10 text-orange-650 dark:text-orange-400 border border-orange-200 dark:border-orange-500/20"
                            >
                              {b}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="p-4 border-r border-b border-slate-100 dark:border-slate-700/60 text-sm font-black text-slate-600 dark:text-slate-200">
                      {tp.blockerTimeMs > 0 ? (
                        <span className="text-orange-600 dark:text-orange-400">
                          {(() => {
                            const totalMinutes = Math.floor(tp.blockerTimeMs / (1000 * 60));
                            const h = Math.floor(totalMinutes / 60);
                            const m = totalMinutes % 60;
                            return h > 0 ? `${h}h ${m}m` : `${m}m`;
                          })()}
                        </span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 font-medium">0m</span>
                      )}
                    </td>
                    <td className="p-4 border-r border-b border-slate-100 dark:border-slate-700/60 text-sm font-black text-slate-600 dark:text-slate-200">
                      {tp.totalHours.toFixed(1)}h
                    </td>
                    <td className="p-4 border-r border-b border-slate-100 dark:border-slate-700/60 text-sm font-black">
                      {tp.overdue > 0 ? (
                        <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-extrabold">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                          <span>{tp.overdue} overdue</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 font-medium">0</span>
                      )}
                    </td>
                    <td className="p-4 border-b border-slate-100 dark:border-slate-700/60 text-xs font-bold">
                      {tp.lastSubmitted === "Not submitted" ? (
                        <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                          <span>Not submitted</span>
                        </div>
                      ) : tp.lastSubmitted === "Draft" ? (
                        <div className="flex items-center gap-1.5 text-amber-500 dark:text-amber-400 font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                          <span>Draft</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-extrabold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span>{tp.lastSubmitted}</span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Delayed Projects & Bottlenecks */}
      <div className="bg-white dark:bg-[#0f172a]/90 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-700/80 overflow-hidden shadow-sm dark:shadow-xl relative z-10">
        <div className="p-5 border-b border-slate-200 dark:border-slate-700/80 flex items-center gap-3 bg-slate-50 dark:bg-transparent">
          <div className="p-2 bg-rose-100 dark:bg-rose-500/20 rounded-lg text-rose-600 dark:text-rose-400">
            <FiAlertCircle className="text-lg" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-white tracking-widest">
            Delayed Projects & Bottlenecks
          </h3>
        </div>
        <div className="p-5 space-y-4">
          {delayedTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-emerald-500 dark:text-emerald-400">
              <FiCheckCircle className="text-4xl mb-3 opacity-50" />
              <p className="text-sm font-black tracking-widest uppercase">
                Zero Delays!
              </p>
            </div>
          ) : (
            delayedTasks.slice(0, 5).map((task) => {
              let projName = "No Project";
              if (task.project) {
                const pId =
                  typeof task.project === "object"
                    ? task.project._id
                    : task.project;
                const p = projects?.find((x) => x._id === pId);
                projName = p?.name || "Unknown";
              }
              return (
                <div
                  key={task._id}
                  className="flex items-center justify-between p-4 rounded-xl border-l-4 border-rose-500 bg-rose-50 dark:bg-rose-500/10 shadow-sm dark:shadow-none transition-transform hover:-translate-y-0.5"
                >
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      {projName} —{" "}
                      <span className="text-slate-500 dark:text-slate-400">
                        {task.title}
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-500 font-bold mt-1 uppercase tracking-widest">
                      {task.status}
                    </p>
                  </div>
                  <div className="text-xs font-black text-rose-600 dark:text-rose-300 bg-white dark:bg-rose-500/20 px-4 py-1.5 rounded-lg border border-rose-200 dark:border-rose-500/30 shadow-sm">
                    {task.daysDelayed}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default GraphicDesignerDashboard;
