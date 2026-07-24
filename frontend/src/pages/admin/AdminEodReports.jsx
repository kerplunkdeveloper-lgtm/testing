import React, { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getEodReports, deleteEodReport } from "../../features/eodReports/eodReportSlice";
import { getDesignerEodReports, deleteDesignerEodReport } from "../../features/eodReports/designerEodReportSlice";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  FiImage,
  FiFile,
  FiSearch,
  FiCalendar,
  FiFilter,
  FiChevronLeft,
  FiChevronRight,
  FiX,
  FiEye,
  FiInfo,
  FiChevronDown,
  FiTrash2,
} from "react-icons/fi";

const getContentTypeStyle = (contentType) => {
  if (!contentType)
    return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
  const type = contentType.toLowerCase().trim();
  if (type.includes("reel")) {
    return "bg-pink-50 text-pink-650 border border-pink-200/50 dark:bg-pink-500/10 dark:text-pink-400 dark:border-pink-500/20";
  }
  if (type.includes("static") || type.includes("single")) {
    return "bg-sky-50 text-sky-650 border border-sky-200/50 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20";
  }
  if (type.includes("video")) {
    return "bg-violet-50 text-violet-650 border border-violet-200/50 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/20";
  }
  if (type.includes("carousel") || type.includes("slider")) {
    return "bg-amber-50 text-amber-650 border border-amber-200/50 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20";
  }
  if (type.includes("story")) {
    return "bg-emerald-50 text-emerald-650 border border-emerald-200/50 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20";
  }
  if (type.includes("logo") || type.includes("brand")) {
    return "bg-indigo-50 text-indigo-650 border border-indigo-200/50 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20";
  }
  return "bg-slate-50 text-slate-655 border border-slate-200/50 dark:bg-slate-500/10 dark:text-slate-450 dark:border-slate-500/20";
};

const calculateTotalLoggedTime = (report) => {
  if (!report.tasks || !Array.isArray(report.tasks)) {
    return report.timeSpentToday || "-";
  }

  let totalMinutes = 0;
  report.tasks.forEach((t) => {
    if (!t.loggedTime) return;
    const timeStr = t.loggedTime.toLowerCase().trim();
    let hours = 0;
    let minutes = 0;

    if (/^\d+(\.\d+)?$/.test(timeStr)) {
      hours = parseFloat(timeStr);
    } else {
      const hMatch = timeStr.match(/(\d+(\.\d+)?)\s*h/);
      if (hMatch) {
        hours = parseFloat(hMatch[1]);
      } else {
        const hourWordMatch = timeStr.match(/(\d+(\.\d+)?)\s*hour/);
        if (hourWordMatch) hours = parseFloat(hourWordMatch[1]);
      }

      const mMatch = timeStr.match(/(\d+)\s*m/);
      if (mMatch) {
        minutes = parseInt(mMatch[1], 10);
      } else {
        const minWordMatch = timeStr.match(/(\d+)\s*min/);
        if (minWordMatch) minutes = parseInt(minWordMatch[1], 10);
      }
    }

    totalMinutes += hours * 60 + minutes;
  });

  if (totalMinutes === 0) {
    return report.timeSpentToday || "-";
  }

  const h = Math.floor(totalMinutes / 60);
  const m = Math.round(totalMinutes % 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
};

const AdminEodReports = () => {
  const dispatch = useDispatch();

  const { eodReports, loading: generalLoading } = useSelector(
    (state) => state.eodReports,
  );
  const { designerEodReports, loading: designerLoading } = useSelector(
    (state) => state.designerEodReports,
  );

  const [activeTab, setActiveTab] = useState("Graphic Designer");

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [clientFilter, setClientFilter] = useState("All");
  const [dateRange, setDateRange] = useState("All");
  const [customDate, setCustomDate] = useState("");
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [openViewModal, setOpenViewModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, target: null });
  const [deleting, setDeleting] = useState(false);
  const itemsPerPage = 10;

  useEffect(() => {
    setSelectedIds([]);
  }, [activeTab]);

  const dateRangeOptions = [
    { value: "All", label: "All Dates" },
    { value: "Today", label: "Today" },
    { value: "Yesterday", label: "Yesterday" },
    { value: "Week", label: "This Week" },
    { value: "Month", label: "This Month" },
    { value: "Custom", label: "Custom Date" },
  ];

  const dateRangeLabelMap = {
    All: "All Dates",
    Today: "Today",
    Yesterday: "Yesterday",
    Week: "This Week",
    Month: "This Month",
    Custom: "Custom Date",
  };

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!event.target.closest("#date-filter-dropdown-container")) {
        setShowDateDropdown(false);
      }
    };
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, []);

  useEffect(() => {
    dispatch(getEodReports());
    dispatch(getDesignerEodReports());
  }, [dispatch]);

  // Group reports by User Department
  const groupedDepartments = useMemo(() => {
    const groups = {};

    // Initialize Graphic Designer tab with designer-specific reports
    groups["Graphic Designer"] = designerEodReports || [];

    // Group general reports under user's department
    (eodReports || []).forEach((report) => {
      const dept = report.user?.department || "General";
      if (!groups[dept]) {
        groups[dept] = [];
      }
      groups[dept].push(report);
    });

    return groups;
  }, [eodReports, designerEodReports]);

  // Generate department list (Graphic Designer is always first)
  const departmentsList = useMemo(() => {
    const depts = Object.keys(groupedDepartments)
      .filter((d) => d !== "Graphic Designer")
      .sort();
    return ["Graphic Designer", ...depts];
  }, [groupedDepartments]);

  // Extract unique clients based on the active tab's reports
  const uniqueClients = useMemo(() => {
    const reports = groupedDepartments[activeTab] || [];
    const clientsSet = new Set();
    reports.forEach((report) => {
      if (report.tasks && Array.isArray(report.tasks)) {
        report.tasks.forEach((t) => {
          if (t.client) clientsSet.add(t.client.trim());
        });
      } else if (report.clientName) {
        clientsSet.add(report.clientName.trim());
      }
    });
    return Array.from(clientsSet).sort();
  }, [groupedDepartments, activeTab]);

  // Filter reports of active department
  const filteredReports = useMemo(() => {
    const reports = groupedDepartments[activeTab] || [];
    return reports.filter((report) => {
      const searchLower = searchQuery.toLowerCase();
      let client = report.clientName || "";
      let task = report.projectsWorkedOn || "";

      if (report.tasks && Array.isArray(report.tasks)) {
        client = report.tasks
          .map((t) => t.client)
          .filter(Boolean)
          .join(" ");
        task = report.tasks
          .map((t) => `${t.title} ${t.project}`)
          .filter(Boolean)
          .join(" ");
      }

      const matchesSearch =
        client.toLowerCase().includes(searchLower) ||
        task.toLowerCase().includes(searchLower) ||
        (report.user?.name || "").toLowerCase().includes(searchLower);

      const matchesStatus =
        statusFilter === "All" || report.overallStatus === statusFilter;

      // Client filter matches
      let matchesClient = true;
      if (clientFilter !== "All") {
        if (report.tasks && Array.isArray(report.tasks)) {
          matchesClient = report.tasks.some(
            (t) => t.client && t.client.trim() === clientFilter
          );
        } else {
          matchesClient = report.clientName && report.clientName.trim() === clientFilter;
        }
      }

      let matchesDate = true;
      const reportDate = new Date(report.date);
      const reportDateStr = reportDate.toISOString().split("T")[0];

      const today = new Date();
      const todayStr = today.toISOString().split("T")[0];

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      if (dateRange === "Today") {
        matchesDate = reportDateStr === todayStr;
      } else if (dateRange === "Yesterday") {
        matchesDate = reportDateStr === yesterdayStr;
      } else if (dateRange === "Week") {
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        matchesDate = reportDate >= startOfWeek && reportDate <= today;
      } else if (dateRange === "Month") {
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        matchesDate = reportDate >= startOfMonth && reportDate <= today;
      } else if (dateRange === "Custom") {
        if (customDate) {
          matchesDate = reportDateStr === customDate;
        }
      }

      return matchesSearch && matchesStatus && matchesClient && matchesDate;
    });
  }, [
    groupedDepartments,
    activeTab,
    searchQuery,
    statusFilter,
    clientFilter,
    dateRange,
    customDate,
  ]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);
  const currentReports = useMemo(() => {
    return filteredReports.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage,
    );
  }, [filteredReports, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery, statusFilter, clientFilter, dateRange, customDate]);

  useEffect(() => {
    setClientFilter("All");
  }, [activeTab]);

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case "Completed":
        return "bg-emerald-50 text-emerald-600 border border-emerald-200/50 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20";
      case "On Track":
      case "In Progress":
        return "bg-blue-50 text-blue-650 border border-blue-200/50 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20";
      case "Delayed":
        return "bg-rose-50 text-rose-600 border border-rose-200/50 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20";
      case "Blocked":
        return "bg-amber-50 text-amber-600 border border-amber-200/50 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20";
      default:
        return "bg-slate-50 text-slate-655 border border-slate-200/50 dark:bg-slate-500/10 dark:text-slate-450 dark:border-slate-500/20";
    }
  };

  const getStatusDotStyle = (status) => {
    switch (status) {
      case "Completed":
        return "bg-emerald-500";
      case "On Track":
      case "In Progress":
        return "bg-blue-500";
      case "Delayed":
        return "bg-rose-500";
      case "Blocked":
        return "bg-amber-500";
      default:
        return "bg-slate-400";
    }
  };

  const handleView = (report) => {
    setSelectedReport(report);
    setOpenViewModal(true);
  };

  const handleDelete = (report) => {
    setDeleteConfirm({ show: true, target: report });
  };

  const confirmDeleteAction = async () => {
    setDeleting(true);
    try {
      if (deleteConfirm.target === "bulk") {
        if (activeTab === "Graphic Designer") {
          await Promise.all(
            selectedIds.map((id) => dispatch(deleteDesignerEodReport({ id, silent: true })).unwrap())
          );
          toast.success("Designer EOD Reports deleted successfully");
        } else {
          await Promise.all(
            selectedIds.map((id) => dispatch(deleteEodReport({ id, silent: true })).unwrap())
          );
          toast.success("EOD Reports deleted successfully");
        }
        setSelectedIds([]);
      } else if (deleteConfirm.target) {
        const id = deleteConfirm.target._id;
        if (activeTab === "Graphic Designer") {
          await dispatch(deleteDesignerEodReport(id)).unwrap();
        } else {
          await dispatch(deleteEodReport(id)).unwrap();
        }
        setSelectedIds((prev) => prev.filter((item) => item !== id));
      }
      setDeleteConfirm({ show: false, target: null });
    } catch (err) {
      console.error("Deletion failed:", err);
    } finally {
      setDeleting(false);
    }
  };

  const loading =
    activeTab === "Graphic Designer" ? designerLoading : generalLoading;
  const totalColumnsCount = activeTab === "Graphic Designer" ? 15 : 14;

  return (
    <div className="min-h-screen py-6 transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h1 className="text-md font-bold text-slate-800 dark:text-white tracking-tight text-left">
            Teammate EOD Reports
          </h1>
        </div>

        {/* Dynamic Department Tabs */}
        <div className="flex border-b theme-border overflow-x-auto scrollbar-none mb-6">
          {departmentsList.map((dept) => {
            const count = (groupedDepartments[dept] || []).length;
            return (
              <button
                key={dept}
                onClick={() => setActiveTab(dept)}
                className={`px-5 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === dept
                    ? "border-blue-600 dark:border-blue-500 theme-text-accent font-black"
                    : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                <span>{dept}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    activeTab === dept
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                      : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* METRICS CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="theme-bg-card border theme-border p-4 rounded-2xl flex flex-col justify-between shadow-sm">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">
              Total Reports
            </span>
            <span className="text-2xl font-black theme-text-primary text-left mt-2">
              {filteredReports.length}
            </span>
          </div>
          <div className="theme-bg-card border theme-border p-4 rounded-2xl flex flex-col justify-between shadow-sm">
            <span className="text-[10px] font-black uppercase tracking-widest text-left text-emerald-600 dark:text-emerald-400">
              Completed
            </span>
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 text-left mt-2">
              {
                filteredReports.filter((r) => r.overallStatus === "Completed")
                  .length
              }
            </span>
          </div>
          <div className="theme-bg-card border theme-border p-4 rounded-2xl flex flex-col justify-between shadow-sm">
            <span className="text-[10px] font-black uppercase tracking-widest text-left text-blue-600 dark:text-blue-400">
              Active / On Track
            </span>
            <span className="text-2xl font-black text-blue-600 dark:text-blue-400 text-left mt-2">
              {
                filteredReports.filter(
                  (r) =>
                    r.overallStatus === "On Track" ||
                    r.overallStatus === "In Progress",
                ).length
              }
            </span>
          </div>
          <div className="theme-bg-card border theme-border p-4 rounded-2xl flex flex-col justify-between shadow-sm">
            <span className="text-[10px] font-black uppercase tracking-widest text-left text-rose-600 dark:text-rose-450">
              Delayed / Blocked
            </span>
            <span className="text-2xl font-black text-rose-600 dark:text-rose-400 text-left mt-2">
              {
                filteredReports.filter(
                  (r) =>
                    r.overallStatus === "Delayed" ||
                    r.overallStatus === "Blocked",
                ).length
              }
            </span>
          </div>
        </div>

        {/* FILTER BAR */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 mb-6 flex flex-col lg:flex-row gap-4 justify-between items-center transition-colors border border-slate-100 dark:border-slate-700/40">
          {/* SEARCH */}
          <div className="relative w-full lg:max-w-md">
            <input
              type="text"
              placeholder="Search by teammate, client, project, or task..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
            {/* DATE FILTER (Custom Dropdown matching Reference Image) */}
            <div
              id="date-filter-dropdown-container"
              className="relative w-full sm:w-auto"
            >
              <button
                type="button"
                onClick={() => setShowDateDropdown(!showDateDropdown)}
                className="w-full sm:w-auto px-5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full flex items-center justify-between sm:justify-start gap-3 text-xs font-bold text-slate-705 dark:text-slate-205 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-all cursor-pointer min-w-[130px] h-[38px]"
              >
                <div className="flex items-center gap-2">
                  <FiFilter
                    className="text-emerald-500 dark:text-emerald-400 font-bold"
                    size={13}
                  />
                  <span>
                    {dateRange === "Custom" && customDate
                      ? new Date(customDate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })
                      : dateRangeLabelMap[dateRange]}
                  </span>
                </div>
                <FiChevronDown
                  className="text-slate-400 dark:text-slate-500 ml-1"
                  size={12}
                />
              </button>

              {showDateDropdown && (
                <div className="absolute right-0 sm:left-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 py-1.5 z-30 animate-in fade-in slide-in-from-top-2 duration-150">
                  {dateRangeOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setDateRange(opt.value);
                        if (opt.value !== "Custom") {
                          setShowDateDropdown(false);
                        }
                      }}
                      className={`w-full text-left px-4 py-2 text-xs font-bold transition-colors cursor-pointer ${
                        dateRange === opt.value
                          ? "bg-slate-50 dark:bg-slate-700/50 text-blue-650 dark:text-blue-400"
                          : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}

                  {dateRange === "Custom" && (
                    <div className="px-3 py-2 border-t border-slate-100 dark:border-slate-750 mt-1">
                      <input
                        type="date"
                        value={customDate}
                        onChange={(e) => {
                          setCustomDate(e.target.value);
                        }}
                        className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-[11px] font-medium text-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer [&::-webkit-calendar-picker-indicator]:dark:invert"
                      />
                      <button
                        type="button"
                        onClick={() => setShowDateDropdown(false)}
                        className="w-full mt-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-bold transition-colors cursor-pointer"
                      >
                        Apply
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* STATUS FILTER */}
            <div className="relative w-full sm:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-4 pr-10 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all cursor-pointer appearance-none min-w-[160px] bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23475569%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_0.75rem_center] bg-[length:0.85em_0.85em]"
              >
                <option value="All">All Statuses</option>
                <option value="On Track">On Track</option>
                <option value="Completed">Completed</option>
                <option value="Delayed">Delayed</option>
              </select>
            </div>

            {/* CLIENT FILTER */}
            <div className="relative w-full sm:w-auto">
              <select
                value={clientFilter}
                onChange={(e) => setClientFilter(e.target.value)}
                className="w-full pl-4 pr-10 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all cursor-pointer appearance-none min-w-[160px] bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23475569%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_0.75rem_center] bg-[length:0.85em_0.85em]"
              >
                <option value="All">All Clients</option>
                {uniqueClients.map((client) => (
                  <option key={client} value={client}>
                    {client}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* TABLE SECTION */}
        <div className="bg-white dark:bg-[#111827] shadow-sm overflow-hidden transition-colors rounded-xl">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full min-w-[1000px] text-left border-collapse border border-slate-200 dark:border-slate-850 [&_th]:border [&_th]:border-slate-200 [&_th]:dark:border-slate-850 [&_td]:border [&_td]:border-slate-200 [&_td]:dark:border-slate-850">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-[#0f172a]/50 ">
                  <th className="px-4 py-3 text-center w-12 min-w-[48px]">
                    <input
                      type="checkbox"
                      checked={
                        currentReports.length > 0 &&
                        currentReports.every((r) => selectedIds.includes(r._id))
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          const pageIds = currentReports.map((r) => r._id);
                          setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
                        } else {
                          const pageIds = currentReports.map((r) => r._id);
                          setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
                        }
                      }}
                      className="rounded border-slate-350 dark:border-slate-700 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer transition-all"
                    />
                  </th>
                  <th className="px-5 py-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap min-w-[120px]">
                    Date
                  </th>
                  <th className="px-5 py-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">
                    Team Member
                  </th>
                  <th className="px-5 py-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">
                    Client Name
                  </th>
                  <th className="px-5 py-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">
                    Task Name
                  </th>
                  <th className="px-5 py-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">
                    Task Assigned by
                  </th>

                  {activeTab === "Graphic Designer" && (
                    <>
                      <th className="px-5 py-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">
                        Total Completed Designs
                      </th>
                    </>
                  )}
                  <th className="px-5 py-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap min-w-[200px]">
                    Pending Tasks
                  </th>
                  <th className="px-5 py-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">
                    Reason for Pending
                  </th>
                  <th className="px-5 py-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap min-w-[320px]">
                    Tomorrow Plan
                  </th>
                  <th className="px-5 py-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">
                    Total Time Spent
                  </th>
                  <th className="px-5 py-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">
                    Overall Status
                  </th>
                  <th className="px-5 py-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">
                    Last Submitted
                  </th>
                  <th className="px-5 py-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center whitespace-nowrap">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td
                      colSpan={totalColumnsCount}
                      className="text-center py-16"
                    >
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-6 h-6 border-2 border-slate-200 dark:border-slate-700 border-t-blue-500 rounded-full animate-spin"></div>
                        <p className="text-slate-500 dark:text-slate-400 font-medium text-xs">
                          Fetching EOD reports...
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : currentReports.length === 0 ? (
                  <tr>
                    <td
                      colSpan={totalColumnsCount}
                      className="text-center py-16"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center border border-slate-100 dark:border-slate-800">
                          <FiFile
                            className="text-slate-400 dark:text-slate-500"
                            size={16}
                          />
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 font-medium text-xs mt-2">
                          No reports found.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  currentReports.map((report) => (
                    <tr
                      key={report._id}
                      className={`transition-colors group no-hover-row ${
                        report.overallStatus?.trim() === "On Track"
                          ? "bg-yellow-300 dark:bg-yellow-600"
                          : report.overallStatus?.trim() === "Completed"
                            ? "bg-emerald-200 dark:bg-emerald-600"
                            : report.overallStatus?.trim() === "Delayed"
                              ? "bg-rose-200 dark:bg-rose-200"
                              : ""
                      }`}
                    >
                      {/* CHECKBOX */}
                      <td className="px-4 py-3 text-center w-12 min-w-[48px]">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(report._id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedIds((prev) => [...prev, report._id]);
                            } else {
                              setSelectedIds((prev) => prev.filter((id) => id !== report._id));
                            }
                          }}
                          className="rounded border-slate-350 dark:border-slate-700 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer transition-all"
                        />
                      </td>

                      {/* DATE */}
                      <td className="px-5 py-3 whitespace-nowrap">
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {new Date(report.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "2-digit",
                            year: "numeric",
                          })}
                        </p>
                      </td>

                      {/* TEAM MEMBER */}
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3 min-w-[160px]">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-650 flex items-center justify-center text-white text-[10px] font-bold shadow-sm shrink-0 overflow-hidden">
                            {report.user?.profile?.profileImage?.url ? (
                              <img
                                src={report.user.profile.profileImage.url}
                                alt={report.user?.name || "User"}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              report.user?.name?.charAt(0) || "U"
                            )}
                          </div>
                          <div className="min-w-0 flex flex-col">
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate text-left">
                              {report.user?.name || "Anonymous"}
                            </p>
                            <p className="text-[9px] text-slate-450 dark:text-slate-500 uppercase tracking-widest font-bold truncate mt-0.5 text-left">
                              {report.user?.department ||
                                report.user?.role ||
                                "Team"}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* CLIENT NAME */}
                      <td
                        className="px-5 py-3 max-w-[150px] truncate text-left"
                        title={
                          report.tasks
                            ? [
                                ...new Set(
                                  report.tasks
                                    .map((t) => t.client)
                                    .filter(Boolean),
                                ),
                              ].join(", ")
                            : report.clientName
                        }
                      >
                        <span className="text-xs font-semibold text-slate-855 dark:text-slate-200">
                          {report.tasks
                            ? [
                                ...new Set(
                                  report.tasks
                                    .map((t) => t.client)
                                    .filter(Boolean),
                                ),
                              ].join(", ") || "-"
                            : report.clientName || "-"}
                        </span>
                      </td>

                      {/* TASK NAME */}
                      <td className="px-5 py-3 max-w-[280px] text-left">
                        {report.tasks && Array.isArray(report.tasks) ? (
                          <div className="flex flex-col gap-1.5">
                            {report.tasks.map((t, idx) => (
                              <div
                                key={idx}
                                className="flex items-center gap-1.5 min-w-0"
                              >
                                <span
                                  className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate"
                                  title={t.title}
                                >
                                  {t.title || "-"}
                                </span>
                                {t.contentType && (
                                  <span
                                    className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider shrink-0 ${getContentTypeStyle(t.contentType)}`}
                                  >
                                    {t.contentType}
                                  </span>
                                )}
                              </div>
                            ))}
                            {report.tasks.length === 0 && (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </div>
                        ) : (
                          <span
                            className="text-xs font-semibold text-slate-805 dark:text-slate-200 block truncate"
                            title={report.projectsWorkedOn}
                          >
                            {report.projectsWorkedOn || "-"}
                          </span>
                        )}
                      </td>

                      {/* TASK ASSIGNED BY */}
                      <td className="px-5 py-3 text-left whitespace-nowrap">
                        {report.tasks && Array.isArray(report.tasks) && report.tasks[0]?.reviewedBy ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-[9px] font-bold shadow-sm shrink-0 overflow-hidden">
                              {report.tasks[0].reviewedBy?.profile?.profileImage?.url ? (
                                <img
                                  src={report.tasks[0].reviewedBy.profile.profileImage.url}
                                  alt={report.tasks[0].reviewedBy?.name || "User"}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                (report.tasks[0].reviewedBy?.name || "U").charAt(0).toUpperCase()
                              )}
                            </div>
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                              {[
                                ...new Set(
                                  report.tasks
                                    .map((t) => t.reviewedBy?.name)
                                    .filter(Boolean),
                                ),
                              ].join(", ") || "-"}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </td>

                      {/* DYNAMIC DESIGNER SPECIFIC FIELDS */}
                      {activeTab === "Graphic Designer" && (
                        <>
                          <td className="px-5 py-3 text-left">
                            <span className="text-slate-655 dark:text-slate-400 text-xs">
                              {report.tasks
                                ? `${report.tasks.filter((t) => t.statusAtEod === "Completed").length} / ${report.tasks.length}`
                                : report.designCount || "-"}
                            </span>
                          </td>
                        </>
                      )}

                      {/* PENDING TASKS */}
                      <td
                        className="px-5 py-3 min-w-[200px] max-w-[220px] truncate text-left text-xs text-slate-700 dark:text-slate-350"
                        title={
                          report.tasks
                            ? report.tasks
                                .filter((t) => t.statusAtEod !== "Completed")
                                .map((t) => t.title)
                                .join(", ")
                            : report.pendingTasks
                        }
                      >
                        {report.tasks
                          ? report.tasks
                              .filter((t) => t.statusAtEod !== "Completed")
                              .map((t) => t.title)
                              .join(", ") || "None"
                          : report.pendingTasks || "-"}
                      </td>

                      {/* REASON FOR PENDING */}
                      <td
                        className="px-5 py-3 max-w-[150px] truncate text-left text-xs text-slate-500 dark:text-slate-400"
                        title={
                          report.tasks
                            ? report.tasks
                                .filter((t) => t.reason)
                                .map((t) => `${t.title}: ${t.reason}`)
                                .join(" | ")
                            : report.reasonForPending
                        }
                      >
                        {report.tasks
                          ? report.tasks
                              .filter((t) => t.reason)
                              .map((t) => `${t.title}: ${t.reason}`)
                              .join(" | ") || "None"
                          : report.reasonForPending || "-"}
                      </td>

                      {/* TOMORROW PLAN */}
                      <td
                        className="px-5 py-3 min-w-[320px] max-w-[360px] truncate text-left text-xs text-slate-500 dark:text-slate-400"
                        title={report.tomorrowPlan}
                      >
                        {report.tomorrowPlan || "-"}
                      </td>

                      {/* TOTAL TIME SPENT */}
                      <td className="px-5 py-3 text-left whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-black bg-violet-50 text-violet-700 border border-violet-200/50 dark:bg-violet-500/10 dark:text-violet-300 dark:border-violet-500/20">
                          {calculateTotalLoggedTime(report)}
                        </span>
                      </td>

                      {/* OVERALL STATUS */}
                      <td className="px-5 py-3 whitespace-nowrap">
                        {report.overallStatus ? (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${getStatusBadgeStyle(report.overallStatus)}`}
                          >
                            <span
                              className={`w-1 h-1 rounded-full mr-1.5 ${getStatusDotStyle(report.overallStatus)}`}
                            ></span>
                            {report.overallStatus}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 dark:text-slate-500">
                            —
                          </span>
                        )}
                      </td>

                      {/* LAST SUBMITTED */}
                      <td className="px-5 py-3 whitespace-nowrap">
                        <p className="text-xs font-semibold text-slate-605 dark:text-slate-350">
                          {report.updatedAt || report.createdAt ? (
                            <>
                              <span className="block">
                                {new Date(report.updatedAt || report.createdAt).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "2-digit",
                                  year: "numeric",
                                })}
                              </span>
                              <span className="block text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 font-normal">
                                {new Date(report.updatedAt || report.createdAt).toLocaleTimeString("en-US", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  hour12: true,
                                })}
                              </span>
                            </>
                          ) : (
                            "-"
                          )}
                        </p>
                      </td>

                      {/* ACTIONS */}
                      <td className="px-5 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleView(report)}
                            title="View Details"
                            className="w-7 h-7 rounded-lg bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center justify-center transition-all cursor-pointer"
                          >
                            <FiEye size={13} />
                          </button>
                          <button
                            onClick={() => handleDelete(report)}
                            title="Delete Report"
                            className="w-7 h-7 rounded-lg bg-transparent hover:bg-rose-50 dark:hover:bg-rose-950/20 text-slate-400 hover:text-rose-600 dark:hover:text-rose-450 flex items-center justify-center transition-all cursor-pointer"
                          >
                            <FiTrash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}
          {!loading && filteredReports.length > itemsPerPage && (
            <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-[#111827] flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Showing{" "}
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {(currentPage - 1) * itemsPerPage + 1}
                </span>{" "}
                to{" "}
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {Math.min(currentPage * itemsPerPage, filteredReports.length)}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {filteredReports.length}
                </span>{" "}
                entries
              </p>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1 rounded text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <FiChevronLeft size={14} />
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }).map((_, idx) => {
                    const page = idx + 1;
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`min-w-[24px] h-6 px-1.5 rounded text-[11px] font-bold transition-colors cursor-pointer ${
                            currentPage === page
                              ? "bg-blue-650 text-white"
                              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                          }`}
                        >
                          {page}
                        </button>
                      );
                    } else if (
                      page === currentPage - 2 ||
                      page === currentPage + 2
                    ) {
                      return (
                        <span
                          key={page}
                          className="px-1 text-[11px] text-slate-400"
                        >
                          ...
                        </span>
                      );
                    }
                    return null;
                  })}
                </div>

                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="p-1 rounded text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <FiChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* DETAILS VIEW MODAL */}
        {openViewModal && selectedReport && (
          <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-slate-800 w-full max-w-[640px] rounded-2xl shadow-xl overflow-hidden border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
              {/* HEADER */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50">
                <div className="text-left">
                  <h2 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
                    {selectedReport.tasks ? "Graphic Designer " : ""}EOD Report
                    Details
                  </h2>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-0.5 flex items-center gap-1">
                    <FiCalendar size={11} />
                    Submitted on{" "}
                    {new Date(selectedReport.date).toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "short",
                      day: "2-digit",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <button
                  onClick={() => setOpenViewModal(false)}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  <FiX size={16} />
                </button>
              </div>

              {/* DETAILS CONTENT */}
              <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar text-left">
                {/* User Card */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-800/60">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-650 flex items-center justify-center text-white text-xs font-bold shadow-sm shrink-0 overflow-hidden">
                    {selectedReport.user?.profile?.profileImage?.url ? (
                      <img
                        src={selectedReport.user.profile.profileImage.url}
                        alt={selectedReport.user?.name || "User"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      selectedReport.user?.name?.charAt(0) || "U"
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-extrabold text-slate-855 dark:text-slate-100">
                      {selectedReport.user?.name || "Anonymous Member"}
                    </p>
                    <p className="text-[10px] text-slate-450 dark:text-slate-500 uppercase tracking-widest font-bold mt-0.5">
                      {selectedReport.user?.department || "Team Member"} •{" "}
                      {selectedReport.user?.email || ""}
                    </p>
                  </div>
                </div>

                {selectedReport.tasks && selectedReport.tasks.length > 0 ? (
                  /* GRAPHIC DESIGNER BREAKDOWN */
                  <div className="space-y-4">
                    {/* Visual Stats */}
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-800/60 grid grid-cols-3 gap-4 text-center">
                      <div>
                        <span className="text-[9px] font-black text-slate-450 uppercase tracking-wider block">
                          Completed
                        </span>
                        <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-450">
                          {
                            selectedReport.tasks.filter(
                              (t) => t.statusAtEod === "Completed",
                            ).length
                          }
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] font-black text-slate-450 uppercase tracking-wider block">
                          Pending
                        </span>
                        <span className="text-sm font-extrabold text-amber-600 dark:text-amber-450">
                          {
                            selectedReport.tasks.filter(
                              (t) =>
                                t.statusAtEod === "Pending" ||
                                t.statusAtEod === "In Progress",
                            ).length
                          }
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] font-black text-slate-450 uppercase tracking-wider block">
                          Rejected
                        </span>
                        <span className="text-sm font-extrabold text-rose-600 dark:text-rose-450">
                          {
                            selectedReport.tasks.filter(
                              (t) => t.statusAtEod === "Rejected",
                            ).length
                          }
                        </span>
                      </div>
                    </div>

                    {/* Task List */}
                    <div className="space-y-2">
                      <span className="text-[9px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest block">
                        Logged Tasks
                      </span>
                      <div className="space-y-3">
                        {selectedReport.tasks.map((task, idx) => (
                          <div
                            key={idx}
                            className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800 relative overflow-hidden"
                          >
                            <div
                              className={`absolute top-0 left-0 bottom-0 w-1 ${
                                task.statusAtEod === "Completed"
                                  ? "bg-emerald-500"
                                  : task.statusAtEod === "Rejected"
                                    ? "bg-rose-500"
                                    : "bg-amber-500"
                              }`}
                            />

                            <div className="flex justify-between items-start gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                                    {task.title}
                                  </h4>
                                  {task.contentType && (
                                    <span
                                      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${getContentTypeStyle(task.contentType)}`}
                                    >
                                      {task.contentType}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                                  • Client: {task.client || "None"}
                                </p>
                              </div>
                              <span
                                className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                                  task.statusAtEod === "Completed"
                                    ? "bg-emerald-50 text-emerald-600 border border-emerald-200/40"
                                    : task.statusAtEod === "Rejected"
                                      ? "bg-rose-50 text-rose-600 border border-rose-200/40"
                                      : "bg-amber-50 text-amber-600 border border-amber-200/40"
                                }`}
                              >
                                {task.statusAtEod}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-2 text-[10px]">
                              <div>
                                <span className="text-[8px] text-slate-400 uppercase tracking-wider block font-bold">
                                  Time Spent
                                </span>
                                <span className="font-bold text-slate-700 dark:text-slate-350">
                                  {task.loggedTime || "0m"}
                                </span>
                              </div>
                              <div>
                                <span className="text-[8px] text-slate-400 uppercase tracking-wider block font-bold">
                                  Content Type
                                </span>
                                <span className="font-bold text-slate-700 dark:text-slate-350">
                                  {task.contentType || "IMAGE"}
                                </span>
                              </div>
                              {task.outputLink && (
                                <div className="col-span-2">
                                  <span className="text-[8px] text-slate-400 uppercase tracking-wider block font-bold">
                                    Output Link
                                  </span>
                                  <a
                                    href={task.outputLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-500 hover:underline font-bold truncate block"
                                  >
                                    {task.outputLink}
                                  </a>
                                </div>
                              )}
                              {task.reason && (
                                <div className="col-span-2 bg-amber-50/50 dark:bg-amber-950/10 p-2 rounded text-amber-700 dark:text-amber-400 font-semibold">
                                  <span className="text-[8px] text-amber-600 uppercase tracking-wider block font-black">
                                    Reason
                                  </span>
                                  {task.reason}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Operational Summary */}
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-800/60 space-y-2">
                      <span className="text-[9px] font-black text-slate-455 dark:text-slate-500 uppercase tracking-widest block border-b border-slate-200/60 pb-1">
                        Operational Summary
                      </span>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-[8px] text-slate-400 uppercase tracking-wider block font-bold">
                            Tools Issues
                          </span>
                          <span className="font-bold text-slate-700 dark:text-slate-350">
                            {selectedReport.daySummary?.toolsIssues || "None"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[8px] text-slate-400 uppercase tracking-wider block font-bold">
                            Client Calls
                          </span>
                          <span className="font-bold text-slate-700 dark:text-slate-350">
                            {selectedReport.daySummary?.clientCalls || "None"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* GENERAL EOD BREAKDOWN */
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-xs font-semibold">
                    <div className="space-y-1">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
                        Client Name
                      </span>
                      <p className="text-slate-800 dark:text-slate-200">
                        {selectedReport.clientName || "-"}
                      </p>
                    </div>

                    <div className="space-y-1 md:col-span-2">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
                        Projects Worked On (Task Name)
                      </span>
                      <p className="text-slate-800 dark:text-slate-200">
                        {selectedReport.projectsWorkedOn || "-"}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
                        Time Spent Today
                      </span>
                      <p className="text-slate-800 dark:text-slate-200">
                        {selectedReport.timeSpentToday || "-"}
                      </p>
                    </div>

                    <div className="space-y-1 md:col-span-2">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
                        Pending Tasks
                      </span>
                      <p className="text-slate-655 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                        {selectedReport.pendingTasks || "None"}
                      </p>
                    </div>

                    {selectedReport.reasonForPending && (
                      <div className="space-y-1 md:col-span-2">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
                          Reason for Pending
                        </span>
                        <p className="text-slate-655 dark:text-slate-300">
                          {selectedReport.reasonForPending}
                        </p>
                      </div>
                    )}

                    {selectedReport.challengesFaced && (
                      <div className="space-y-1 md:col-span-2">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
                          Challenges Faced
                        </span>
                        <p className="text-slate-655 dark:text-slate-300">
                          {selectedReport.challengesFaced}
                        </p>
                      </div>
                    )}

                    {selectedReport.supportNeeded && (
                      <div className="space-y-1 md:col-span-2">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
                          Support Needed
                        </span>
                        <p className="text-slate-655 dark:text-slate-300">
                          {selectedReport.supportNeeded}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Common fields (Tomorrow plan and attachments) */}
                <div className="space-y-1 pt-2">
                  <span className="text-[9px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest block">
                    Tomorrow's Plan
                  </span>
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-medium whitespace-pre-line leading-relaxed bg-blue-50/20 dark:bg-blue-900/10 p-3 rounded-lg border border-blue-100/30 dark:border-blue-900/20">
                    {selectedReport.tomorrowPlan}
                  </p>
                </div>

                {selectedReport.attachments?.length > 0 && (
                  <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-slate-700/50">
                    <span className="text-[9px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest block">
                      Attachments
                    </span>
                    <div className="grid grid-cols-2 gap-3">
                      {selectedReport.attachments.map((att, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-3 p-2 rounded-lg border border-slate-200/60 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 overflow-hidden"
                        >
                          <div className="text-slate-400 dark:text-slate-500 shrink-0">
                            {att.fileType === "image" ? (
                              <FiImage size={15} />
                            ) : (
                              <FiFile size={15} />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <a
                              href={att.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:text-blue-550 truncate block text-left"
                            >
                              {att.filename}
                            </a>
                            <span className="text-[8px] text-slate-400 uppercase tracking-wider block mt-0.5 text-left">
                              {att.fileType || "File"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Overall status display */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                  <span className="text-[9px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest">
                    Overall Status:
                  </span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${getStatusBadgeStyle(selectedReport.overallStatus)}`}
                  >
                    <span
                      className={`w-1 h-1 rounded-full mr-1.5 ${getStatusDotStyle(selectedReport.overallStatus)}`}
                    ></span>
                    {selectedReport.overallStatus || "Completed"}
                  </span>
                </div>
              </div>

              {/* FOOTER */}
              <div className="flex items-center justify-end px-6 py-3.5 border-t border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50">
                <button
                  type="button"
                  onClick={() => setOpenViewModal(false)}
                  className="px-4 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-750 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* BULK ACTION FLOATING BAR */}
        <AnimatePresence>
          {selectedIds.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 50, x: "-50%" }}
              animate={{ opacity: 1, y: 0, x: "-50%" }}
              exit={{ opacity: 0, y: 50, x: "-50%" }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="fixed bottom-6 left-1/2 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-5 py-3 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-xl flex items-center gap-4"
            >
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-600 dark:bg-blue-500 text-white font-extrabold text-[10px] flex items-center justify-center shadow-sm">
                  {selectedIds.length}
                </span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  Reports Selected
                </span>
              </div>
              <div className="h-4 w-px bg-slate-200 dark:bg-slate-850" />
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedIds([])}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
                >
                  Clear Selection
                </button>
                <button
                  onClick={() => setDeleteConfirm({ show: true, target: "bulk" })}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-sm hover:shadow-rose-500/20 hover:scale-[1.01] transition-all cursor-pointer"
                >
                  <FiTrash2 size={12} />
                  Delete Selected
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* DELETE CONFIRMATION MODAL */}
        <AnimatePresence>
          {deleteConfirm.show && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => !deleting && setDeleteConfirm({ show: false, target: null })}
                className="absolute inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm"
              />

              {/* Modal Card */}
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                transition={{ type: "spring", duration: 0.3 }}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative z-10 p-6 flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-200"
              >
                <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/20 text-rose-500 flex items-center justify-center mb-4 ring-4 ring-rose-500/10">
                  <FiTrash2 size={22} className="animate-pulse" />
                </div>

                <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100 mb-2">
                  {deleteConfirm.target === "bulk" ? "Confirm Bulk Deletion" : "Confirm Deletion"}
                </h3>

                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
                  {deleteConfirm.target === "bulk"
                    ? `Are you sure you want to permanently delete the ${selectedIds.length} selected EOD reports? This action will remove them from the database and cannot be undone.`
                    : "Are you sure you want to delete this EOD report? This action will permanently remove the record from the database and cannot be undone."}
                </p>

                <div className="flex items-center gap-3 w-full">
                  <button
                    disabled={deleting}
                    onClick={() => setDeleteConfirm({ show: false, target: null })}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={deleting}
                    onClick={confirmDeleteAction}
                    className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-sm hover:shadow-rose-500/20 hover:scale-[1.01] transition-all cursor-pointer disabled:opacity-50"
                  >
                    {deleting ? (
                      <div className="w-4.5 h-4.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      "Yes, Delete"
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AdminEodReports;
