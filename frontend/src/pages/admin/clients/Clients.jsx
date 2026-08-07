import React, { useEffect, useMemo, useState } from "react";

import {
  FiPlus,
  FiEdit,
  FiTrash2,
  FiX,
  FiUsers,
  FiPhone,
  FiMail,
  FiBriefcase,
  FiDollarSign,
  FiPercent,
  FiGlobe,
  FiLayers,
  FiUser,
  FiAlertTriangle,
  FiBookOpen,
  FiSearch,
  FiVideo,
  FiPlusCircle,
  FiHelpCircle,
  FiCalendar,
  FiCheck,
  FiEye,
  FiArrowLeft,
  FiMoreHorizontal,
} from "react-icons/fi";
import { FaRegBuilding } from "react-icons/fa";
import {
  getClientIconComponent,
  CLIENT_COLORS,
  CLIENT_ICONS,
} from "../../../utils/clientHelpers";

import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import {Link} from "react-router-dom";

import {
  getClients,
  createClient,
  updateClient,
  deleteClient,
} from "../../../features/clients/clientslice";

import { getUsers } from "../../../features/users/userSlice";
import { getProjects } from "../../../features/projects/projectSlice";
import { getTasks } from "../../../features/tasks/taskSlice";
import { useTheme } from "../../../context/ThemeContext";

const getUserColor = (userId) => {
  if (!userId)
    return {
      bg: "bg-slate-50/80 dark:bg-slate-900/10",
      text: "text-slate-400 dark:text-slate-500",
      border: "border-slate-200 dark:border-slate-800",
    };
  let hash = 0;
  const str = String(userId);
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    {
      bg: "bg-indigo-50/80 dark:bg-indigo-950/30",
      text: "text-indigo-600 dark:text-indigo-300",
      border: "border-indigo-100/80 dark:border-indigo-900/40",
    },
    {
      bg: "bg-fuchsia-50/80 dark:bg-fuchsia-950/30",
      text: "text-fuchsia-600 dark:text-fuchsia-300",
      border: "border-fuchsia-100/80 dark:border-fuchsia-900/40",
    },
    {
      bg: "bg-emerald-50/80 dark:bg-emerald-950/30",
      text: "text-emerald-600 dark:text-emerald-300",
      border: "border-emerald-100/80 dark:border-emerald-900/40",
    },
    {
      bg: "bg-rose-50/80 dark:bg-rose-950/30",
      text: "text-rose-600 dark:text-rose-300",
      border: "border-rose-100/80 dark:border-rose-900/40",
    },
    {
      bg: "bg-cyan-50/80 dark:bg-cyan-950/30",
      text: "text-cyan-600 dark:text-cyan-300",
      border: "border-cyan-100/80 dark:border-cyan-900/40",
    },
    {
      bg: "bg-amber-50/80 dark:bg-amber-950/30",
      text: "text-amber-600 dark:text-amber-300",
      border: "border-amber-100/80 dark:border-amber-900/40",
    },
    {
      bg: "bg-teal-50/80 dark:bg-teal-950/30",
      text: "text-teal-600 dark:text-teal-300",
      border: "border-teal-100/80 dark:border-teal-900/40",
    },
    {
      bg: "bg-violet-50/80 dark:bg-violet-950/30",
      text: "text-violet-600 dark:text-violet-300",
      border: "border-violet-100/80 dark:border-violet-900/40",
    },
  ];
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

const getDeptColor = (dept) => {
  if (!dept) return "text-slate-500 dark:text-slate-400";
  const d = dept.toLowerCase().trim();
  if (d.includes("marketing") || d.includes("digital")) {
    return "text-blue-600 dark:text-blue-400";
  }
  if (d.includes("design") || d.includes("creative") || d.includes("branding")) {
    return "text-purple-650 dark:text-purple-400";
  }
  if (d.includes("development") || d.includes("tech") || d.includes("website") || d.includes("web")) {
    return "text-emerald-600 dark:text-emerald-400";
  }
  if (d.includes("seo")) {
    return "text-amber-600 dark:text-amber-400";
  }
  if (d.includes("video") || d.includes("production") || d.includes("shoot")) {
    return "text-rose-600 dark:text-rose-400";
  }
  if (d.includes("accounts") || d.includes("finance") || d.includes("sales")) {
    return "text-teal-650 dark:text-teal-400";
  }
  return "text-[#c2410c] dark:text-[#ea580c]";
};

const MultiSelect = ({
  label,
  options,
  selectedValues,
  onChange,
  placeholder,
  icon: Icon,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
    }
  }, [isOpen]);

  const toggleOption = (val) => {
    if (selectedValues.includes(val)) {
      onChange(selectedValues.filter((v) => v !== val));
    } else {
      onChange([...selectedValues, val]);
    }
  };

  const filteredOptions = useMemo(() => {
    if (!searchQuery) return options;
    const query = searchQuery.toLowerCase();
    return options.filter(
      (opt) =>
        (opt.label || "").toLowerCase().includes(query) ||
        (opt.subLabel || "").toLowerCase().includes(query)
    );
  }, [options, searchQuery]);

  // Group options if 'group' property exists
  const hasGrouping = filteredOptions.some((o) => o.group);

  const groupedOptions = useMemo(() => {
    if (!hasGrouping) return { "": filteredOptions };

    return filteredOptions.reduce((acc, opt) => {
      const g = opt.group || "Others";
      if (!acc[g]) acc[g] = [];
      acc[g].push(opt);
      return acc;
    }, {});
  }, [filteredOptions, hasGrouping]);

  return (
    <div className="relative">
      <label className="block text-[10px] font-extrabold text-slate-500 dark:text-slate-405 uppercase tracking-wide mb-1 flex items-center gap-1.5">
        {Icon && <Icon size={12} className="text-slate-450" />}
        {label}
      </label>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full min-h-10 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-black px-3.5 flex flex-wrap gap-1.5 items-center cursor-pointer outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-[#3b82f6]/20 focus:border-blue-500 dark:focus:border-[#3b82f6] transition-all"
      >
        {selectedValues.length === 0 ? (
          <span className="text-xs text-slate-400 dark:text-slate-550 font-semibold">
            {placeholder}
          </span>
        ) : (
          selectedValues.map((val) => {
            const opt = options.find((o) => o.value === val);
            const displayLabel = opt ? opt.label : val;
            return (
              <span
                key={val}
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-550/5 text-blue-600 border border-blue-200/50 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-900/40"
              >
                {opt && opt.avatarUrl !== undefined && (
                  <div className="shrink-0 -ml-1">
                    {opt.avatarUrl ? (
                      <img
                        src={opt.avatarUrl}
                        alt={displayLabel}
                        className="w-4 h-4 rounded-full object-cover border border-slate-200/80 dark:border-slate-800"
                      />
                    ) : (
                      <div
                        className={`w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-black ${
                          getUserColor(val).bg
                        } ${getUserColor(val).text} border ${
                          getUserColor(val).border
                        }`}
                      >
                        {displayLabel ? displayLabel.charAt(0).toUpperCase() : "?"}
                      </div>
                    )}
                  </div>
                )}
                {displayLabel}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleOption(val);
                  }}
                  className="hover:text-rose-500 dark:hover:text-rose-400 transition-colors p-0.5 focus:outline-none"
                >
                  <FiX size={10} className="stroke-[3]" />
                </button>
              </span>
            );
          })
        )}
        <span className="ml-auto pointer-events-none text-slate-400">
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </span>
      </div>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-20 max-h-60 overflow-y-auto p-1.5 space-y-1">
            {/* Search Input Box */}
            <div className="sticky top-0 bg-white dark:bg-slate-900 pb-1.5 pt-0.5 px-1 z-10 border-b border-slate-100 dark:border-slate-800 mb-1 flex items-center gap-2">
              <FiSearch className="text-slate-400 shrink-0" size={13} />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="w-full bg-slate-50 dark:bg-black text-xs px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 outline-none focus:border-blue-500 text-slate-700 dark:text-white transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSearchQuery("");
                  }}
                  className="text-slate-450 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                >
                  <FiX size={12} />
                </button>
              )}
            </div>

            {filteredOptions.length === 0 ? (
              <div className="py-4 text-center text-slate-400 dark:text-slate-550 text-xs italic">
                No results found
              </div>
            ) : (
              Object.entries(groupedOptions).map(([groupName, items]) => (
                <div key={groupName} className="space-y-0.5">
                  {groupName && (
                    <div className="px-3 py-1 text-[9px] font-black text-indigo-600 dark:text-[#3b82f6] uppercase tracking-wider bg-indigo-50/40 dark:bg-white/[0.02] rounded-md mb-1 mt-1 font-bold">
                      {groupName}
                    </div>
                  )}
                  {items.map((opt) => {
                    const isSelected = selectedValues.includes(opt.value);
                    return (
                      <div
                        key={opt.value}
                        onClick={() => toggleOption(opt.value)}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-indigo-500/5 text-indigo-600 dark:bg-[#3b82f6]/5 dark:text-[#3b82f6]"
                            : "hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-705 dark:text-slate-300"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="rounded text-indigo-600 dark:text-[#3b82f6] focus:ring-indigo-500 w-3.5 h-3.5 border-slate-350 dark:border-slate-700 bg-transparent cursor-pointer"
                        />
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {opt.avatarUrl !== undefined && (
                            <div className="shrink-0">
                              {opt.avatarUrl ? (
                                <img
                                  src={opt.avatarUrl}
                                  alt={opt.label}
                                  className="w-6 h-6 rounded-full object-cover border border-slate-200 dark:border-slate-800"
                                />
                              ) : (
                                <div
                                  className={`w-6 h-6 rounded-full flex items-center justify-center text-white font-black text-[9px] ${
                                    getUserColor(opt.value).bg
                                  } ${getUserColor(opt.value).text} border ${
                                    getUserColor(opt.value).border
                                  }`}
                                >
                                  {opt.label ? opt.label.charAt(0).toUpperCase() : "?"}
                                </div>
                              )}
                            </div>
                          )}
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-[11px] truncate">
                              {opt.label}
                            </span>
                            {opt.subLabel && (
                              <span className="text-[9px] text-slate-400 dark:text-slate-550 font-medium truncate">
                                {opt.subLabel}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};

const formatDept = (d) => {
  if (!d) return "";
  const str = d.trim();
  if (str.length <= 3) return str.toUpperCase();
  const words = str.split(/[\s_-]+/);
  if (words.length > 1) {
    return words.map(w => w[0]).join('').toUpperCase().substring(0, 3);
  }
  return str.substring(0, 3).toUpperCase();
};

const Clients = () => {
  const dispatch = useDispatch();

  const { clients, loading } = useSelector((state) => state.clients);
  const { users } = useSelector((state) => state.users);
  const { user } = useSelector((state) => state.auth);
  const { projects } = useSelector((state) => state.projects);
  const { tasks } = useSelector((state) => state.tasks);
  const { theme } = useTheme();

  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [serviceFilter, setServiceFilter] = useState("All");
  const [clientNameFilter, setClientNameFilter] = useState("All");
  const [memberFilter, setMemberFilter] = useState("All");
  const [clientToDelete, setClientToDelete] = useState(null);
  const [viewClient, setViewClient] = useState(null);
  const [showViewOffcanvas, setShowViewOffcanvas] = useState(false);
  const [activeTab, setActiveTab] = useState("profile"); // 'profile', 'service', 'finance'

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(4);

  const initialForm = {
    companyName: "",
    industry: "",
    onboardingDate: new Date().toISOString().split("T")[0],
    phoneNumber: "",
    spoc: "",
    designation: "",
    budget: "",
    gst: "",
    totalBudget: "",
    service: [],
    reels: "",
    posts: "",
    story: "",
    needDslr: "",
    pages: "",
    onpage: false,
    offpage: false,
    assignedTo: [],
    color: "#3b82f6",
    icon: "FaRegBuilding",
  };

  const [formData, setFormData] = useState(initialForm);

  const handleServiceChange = (services) => {
    setFormData((prev) => ({
      ...prev,
      service: services,
    }));
  };

  const handleAssignedChange = (assigned) => {
    setFormData((prev) => ({
      ...prev,
      assignedTo: assigned,
    }));
  };

  useEffect(() => {
    dispatch(getClients());
    dispatch(getUsers());
    dispatch(getProjects());
    dispatch(getTasks());
  }, [dispatch]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const calculateTotal = () => {
    const budget = Number(formData.budget || 0);
    const gst = Number(formData.gst || 0);
    return budget + (budget * gst) / 100;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      budget: formData.budget === "" ? 0 : Number(formData.budget),
      gst: formData.gst === "" ? 18 : Number(formData.gst),
      reels: formData.reels === "" ? 0 : Number(formData.reels),
      posts: formData.posts === "" ? 0 : Number(formData.posts),
      story: formData.story === "" ? 0 : Number(formData.story),
      pages: formData.pages === "" ? 0 : Number(formData.pages),
      totalBudget: calculateTotal(),
    };

    if (!payload.assignedTo) {
      delete payload.assignedTo;
    }

    if (editId) {
      await dispatch(updateClient({ id: editId, data: payload }));
    } else {
      await dispatch(createClient(payload));
    }

    setShowModal(false);
    setFormData(initialForm);
    setEditId(null);
  };

  const handleEdit = (client) => {
    setFormData({
      ...client,
      color: client.color || "#3b82f6",
      icon: client.icon || "FaRegBuilding",
      spoc: client.spoc || "",
      designation: client.designation || "",
      onboardingDate: client.onboardingDate
        ? new Date(client.onboardingDate).toISOString().split("T")[0]
        : "",
      service: Array.isArray(client.service)
        ? client.service
        : client.service
          ? [client.service]
          : [],
      assignedTo: Array.isArray(client.assignedTo)
        ? client.assignedTo.map((u) => u._id || u)
        : client.assignedTo
          ? [client.assignedTo._id || client.assignedTo]
          : [],
    });
    setEditId(client._id);
    setActiveTab("profile");
    setShowModal(true);
  };

  const allUsers = useMemo(() => {
    return users || [];
  }, [users]);

  const uniqueClientNames = useMemo(() => {
    if (!clients) return [];
    const names = clients.map((c) => c.companyName).filter(Boolean);
    return [...new Set(names)].sort((a, b) => a.localeCompare(b));
  }, [clients]);

  const filteredClients = useMemo(() => {
    return (clients || [])
      .filter((client) => {
        const matchesSearch =
          (client.companyName || "")
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          (client.industry || "")
            .toLowerCase()
            .includes(searchTerm.toLowerCase());

        const matchesService =
          serviceFilter === "All"
            ? true
            : Array.isArray(client.service)
              ? client.service.includes(serviceFilter)
              : client.service === serviceFilter;

        const matchesClientName =
          clientNameFilter === "All"
            ? true
            : client.companyName === clientNameFilter;

        const matchesMember =
          memberFilter === "All"
            ? true
            : Array.isArray(client.assignedTo)
              ? client.assignedTo.some((m) => (m._id || m) === memberFilter)
              : client.assignedTo &&
                (client.assignedTo._id || client.assignedTo) === memberFilter;

        return (
          matchesSearch && matchesService && matchesClientName && matchesMember
        );
      })
      // Sort A → Z by company name (ascending)
      .sort((a, b) =>
        (a.companyName || "").localeCompare(b.companyName || "", undefined, {
          sensitivity: "base",
        })
      );
  }, [clients, searchTerm, serviceFilter, clientNameFilter, memberFilter]);

  // Reset pagination to page 1 when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, serviceFilter, clientNameFilter, memberFilter]);

  const totalItems = filteredClients.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const paginatedClients = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredClients.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredClients, currentPage, itemsPerPage]);

  // Dynamic Service-Based styling helpers
  const getServiceStyles = (service) => {
    switch (service) {
      case "Digital Marketing":
        return {
          bg: "bg-blue-50/50 dark:bg-blue-950/10",
          text: "text-blue-600 dark:text-blue-400",
          border: "border-blue-100 dark:border-blue-900/30",
          pill: "bg-blue-50 text-blue-705 border-blue-200/50 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-800/50",
          gradient: "from-blue-550 to-cyan-500",
          icon: FiLayers,
        };
      case "Website":
        return {
          bg: "bg-emerald-50/50 dark:bg-emerald-950/10",
          text: "text-emerald-600 dark:text-emerald-400",
          border: "border-emerald-100 dark:border-emerald-900/30",
          pill: "bg-emerald-50 text-emerald-707 border-emerald-200/50 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-800/50",
          gradient: "from-emerald-550 to-teal-500",
          icon: FiGlobe,
        };
      case "SEO":
        return {
          bg: "bg-purple-50/50 dark:bg-purple-950/10",
          text: "text-purple-600 dark:text-purple-400",
          border: "border-purple-100 dark:border-purple-900/30",
          pill: "bg-purple-50 text-purple-705 border-purple-200/50 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-800/50",
          gradient: "from-purple-550 to-pink-500",
          icon: FiSearch,
        };
      case "Additional work":
        return {
          bg: "bg-amber-50/50 dark:bg-amber-950/10",
          text: "text-amber-600 dark:text-amber-400",
          border: "border-amber-100 dark:border-amber-900/30",
          pill: "bg-amber-50 text-amber-705 border-amber-200/50 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-800/50",
          gradient: "from-amber-550 to-orange-500",
          icon: FiPlusCircle,
        };
      case "Video Production":
        return {
          bg: "bg-rose-50/50 dark:bg-rose-950/10",
          text: "text-rose-600 dark:text-rose-400",
          border: "border-rose-100 dark:border-rose-900/30",
          pill: "bg-rose-50 text-rose-705 border-rose-200/50 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-800/50",
          gradient: "from-rose-550 to-red-500",
          icon: FiVideo,
        };
      case "Others":
        return {
          bg: "bg-teal-50/50 dark:bg-teal-950/10",
          text: "text-teal-605 dark:text-teal-400",
          border: "border-teal-100 dark:border-teal-900/30",
          pill: "bg-teal-50 text-teal-705 border-teal-200/50 dark:bg-teal-950/20 dark:text-teal-400 dark:border-teal-800/50",
          gradient: "from-teal-550 to-emerald-500",
          icon: FiHelpCircle,
        };
      default:
        return {
          bg: "bg-slate-50/50 dark:bg-slate-800/20",
          text: "text-slate-605 dark:text-slate-400",
          border: "border-slate-100 dark:border-slate-800",
          pill: "bg-slate-50 text-slate-650 border border-slate-200/50 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800",
          gradient: "from-slate-500 to-slate-755",
          icon: FiBriefcase,
        };
    }
  };

  return (
    <div className="min-h-screen pb-12 transition-colors duration-300">
      {/* SEARCH + FILTER CONTROLS */}
      <div className=" mb-6 flex flex-col md:flex-row items-center justify-between ">
        {/* LEFT: Search & Filter */}
        <div className="flex flex-col sm:flex-row flex-wrap items-center gap-3 w-full md:w-auto">
          {/* SEARCH BOX */}
          <div className="relative w-full sm:w-72">
            <input
              type="text"
              placeholder="Search company or industry..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-250 dark:border-slate-800 bg-slate-50 dark:bg-white/5 text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium placeholder:text-slate-300 dark:placeholder:text-slate-600"
            />
          </div>

          {/* CLIENT NAME FILTER */}
          <div className="relative w-full sm:w-52">
            <select
              value={clientNameFilter}
              onChange={(e) => setClientNameFilter(e.target.value)}
              className="w-full h-10 pl-3.5 pr-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-white/5 text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-semibold cursor-pointer appearance-none"
            >
              <option value="All">All Clients</option>
              {uniqueClientNames.map((name, idx) => (
                <option key={idx} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>

          {/* SERVICE FILTER */}
          <div className="relative w-full sm:w-52">
            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              className="w-full h-10 pl-3.5 pr-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-white/5 text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-semibold cursor-pointer appearance-none"
            >
              <option value="All">All Services</option>
              <option value="Digital Marketing">Digital Marketing</option>
              <option value="Website">Website Development</option>
              <option value="SEO">SEO Strategy</option>
              <option value="Additional work">Additional work</option>
              <option value="Video Production">Video Production</option>
              <option value="Others">Others</option>
            </select>
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>

          {/* MEMBERS FILTER */}
          <div className="relative w-full sm:w-52">
            <select
              value={memberFilter}
              onChange={(e) => setMemberFilter(e.target.value)}
              className="w-full h-10 pl-3.5 pr-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-white/5 text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-semibold cursor-pointer appearance-none"
            >
              <option value="All">All Members</option>
              {allUsers.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.name || u.email}
                </option>
              ))}
            </select>
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* RIGHT: Add Button */}
        <div>
          {(user?.role === "admin" || user?.role === "operationmanager") && (
            <button
              onClick={() => {
                setFormData(initialForm);
                setEditId(null);
                setActiveTab("profile");
                setShowModal(true);
              }}
              className="dashboard-btn-primary px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-md hover:shadow-lg text-xs font-semibold active:scale-[0.98] transition-all cursor-pointer"
            >
              <FiPlus size={15} className="stroke-[3]" />
              Add New Client
            </button>
          )}
        </div>
      </div>

      {/* LOADING LOADER */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-10 h-10 border-[3.5px] border-slate-205 border-t-[var(--accent-color)] rounded-full animate-spin"></div>
          <span className="text-xs text-slate-400 font-semibold animate-pulse">
            Syncing client details...
          </span>
        </div>
      )}

      {/* MAIN CONTENT TABLE */}
      {!loading && (
        <motion.div
          layout
          className="overflow-hidden theme-bg-card"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left  whitespace-nowrap min-w-[1100px] text-xs">
              <thead>
                <tr className=" text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-widest text-[8.5px]">
                  <th className="px-4 py-2.5 font-extrabold bg-transparent text-left w-[260px] border-r border-slate-200 dark:border-slate-700/60">
                    <div className="flex items-center justify-start gap-1.5">
                      <FaRegBuilding size={10} className="opacity-70" />
                      Client Name
                    </div>
                  </th>
                  {(user?.role === "admin" || user?.role === "operationmanager") && (
                    <th className="px-4 py-2.5 font-extrabold bg-transparent text-center border-r border-slate-200 dark:border-slate-700/60 w-28">
                      No. of Projects
                    </th>
                  )}
                  <th className="px-4 py-2.5 font-extrabold bg-transparent text-left w-[380px] border-r border-slate-200 dark:border-slate-700/60">
                    Service & Members
                  </th>
                  <th className="px-4 py-2.5 font-extrabold bg-transparent text-left w-[280px] border-r border-slate-200 dark:border-slate-700/60">
                    Deliverables
                  </th>

                  {user?.role === "team" && (
                    <th className="px-4 py-2.5 font-extrabold bg-transparent text-center border-r border-slate-200 dark:border-slate-700/60 last:border-r-0">
                      Assigned By
                    </th>
                  )}
                  {(user?.role === "admin" ||
                    user?.role === "operationmanager") && (
                    <th className="px-4 py-2.5 font-extrabold bg-transparent text-center w-24 border-r-0">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700/60">
                <AnimatePresence>
                  {filteredClients.length > 0 ? (
                    paginatedClients.map((client, index) => {
                      const primaryService = Array.isArray(client.service)
                        ? client.service[0] || ""
                        : client.service || "";
                      const conf = getServiceStyles(primaryService);
                      const ServiceIcon = conf.icon;

                      const cellClass =
                        "px-4 py-2.5 bg-transparent transition-colors border-r border-slate-200 dark:border-slate-700/60 last:border-r-0";

                      const nameColors = [
                        "text-blue-900 dark:text-blue-400",
                        "text-purple-700 dark:text-purple-400",
                        "text-emerald-600 dark:text-emerald-400",
                        "text-rose-600 dark:text-rose-400",
                        "text-amber-650 dark:text-amber-400",
                        "text-cyan-600 dark:text-cyan-400",
                        "text-indigo-600 dark:text-indigo-400",
                        "text-pink-600 dark:text-pink-400",
                        "text-yellow-500 dark:text-yellow-400",
                      ];

                      // Create a simple hash based on company name length and char codes
                      let hash = 0;
                      if (client.companyName) {
                        for (let i = 0; i < client.companyName.length; i++) {
                          hash =
                            client.companyName.charCodeAt(i) +
                            ((hash << 5) - hash);
                        }
                      }
                      const nameHexes = [
                        "#3b82f6", // blue
                        "#8b5cf6", // violet
                        "#10b981", // emerald
                        "#f43f5e", // rose
                        "#f59e0b", // amber
                        "#06b6d4", // cyan
                        "#6366f1", // indigo
                        "#ec4899", // pink
                        "#eab308", // yellow
                      ];
                      const colorIndex = Math.abs(hash) % nameColors.length;
                      const nameColor = nameColors[colorIndex];
                      const clientColor =
                        client.color && client.color !== "#3b82f6"
                          ? client.color
                          : nameHexes[colorIndex];

                      return (
                        <motion.tr
                          layout
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.2, delay: index * 0.02 }}
                          key={client._id}
                          className="group transition-colors hover:bg-slate-50/40 dark:hover:bg-[#16223f]/40 border-b border-slate-200 dark:border-slate-700/60"
                        >
                          {/* Client Info */}
                          <td className={`${cellClass} relative`}>
                            <div className="flex items-center gap-2.5">
                              {(() => {
                                const ClientIcon = getClientIconComponent(
                                  client.icon,
                                );
                                return (
                                  <div
                                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border shadow-sm transition-all duration-300"
                                    style={{
                                      backgroundColor: `${clientColor}12`,
                                      borderColor: `${clientColor}30`,
                                      color: clientColor,
                                    }}
                                  >
                                    <ClientIcon size={14} />
                                  </div>
                                );
                              })()}
                              <div className="min-w-[120px]">
                                <h2
                                  className="font-bold transition-colors text-[12.5px] text-slate-800 dark:text-slate-100 truncate max-w-[200px] cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                                  onClick={() => {
                                    setViewClient(client);
                                    setShowViewOffcanvas(true);
                                  }}
                                >
                                  {client.companyName}
                                </h2>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-[9px] text-slate-500 dark:text-slate-400 font-semibold bg-slate-100 dark:bg-[#16223f] px-1.5 py-0.5 rounded">
                                    {client.industry}
                                  </span>
                                  {client.onboardingDate && (
                                    <span className="text-[9px] text-black dark:text-white px-1.5 py-0.5 bg-slate-100 rounded dark:bg-[#16223f] font-medium flex items-center gap-1">
                                      <FiCalendar size={8} />
                                      {new Date(
                                        client.onboardingDate,
                                      ).toLocaleDateString("en-IN", {
                                        day: "2-digit",
                                        month: "short",
                                        year: "2-digit",
                                      })}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>                            {/* No. of Projects */}
                          {(user?.role === "admin" || user?.role === "operationmanager") && (
                            <td className={`${cellClass} text-center w-28`}>
                              <span className="inline-flex items-center justify-center px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold text-[10px] border border-blue-200/50 dark:border-blue-800/30">
                                {projects?.filter(p => p.client?._id === client._id || p.client === client._id).length || 0}
                              </span>
                            </td>
                          )}



                          {/* Service Info */}
                          <td className={cellClass}>
                            <div className="flex flex-col gap-1.5">
                              <div className="flex flex-wrap gap-1.5 mb-1">
                                {client.service &&
                                  (Array.isArray(client.service)
                                    ? client.service
                                    : [client.service || "Contract"]
                                  ).map((svc, idx) => {
                                    if (!svc) return null;
                                    const sConf = getServiceStyles(svc);
                                    const SIcon = sConf.icon;
                                    return (
                                      <span
                                        key={idx}
                                        className={`inline-flex px-2 py-0.5 rounded-full text-[8.5px] font-extrabold tracking-wider uppercase border ${sConf.pill} items-center gap-1 shadow-sm`}
                                      >
                                        <SIcon size={10} />
                                        {svc}
                                      </span>
                                    );
                                  })}
                              </div>

                              <div className="flex flex-wrap gap-2 max-w-[350px]">
                                {client.assignedTo &&
                                (Array.isArray(client.assignedTo)
                                  ? client.assignedTo.length > 0
                                  : true) ? (
                                  Array.isArray(client.assignedTo) ? (
                                    client.assignedTo.map((member) => {
                                      const fullUser = allUsers.find(
                                        (u) => u._id === (member._id || member),
                                      );
                                      const dept = fullUser?.department || "";
                                      return (
                                        <div
                                          key={member._id || member}
                                          className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-200/50 dark:border-slate-700/50 transition-transform hover:scale-105 w-max max-w-full overflow-hidden"
                                          title={member.name || member.email}
                                        >
                                          <div className="flex items-center gap-1.5">
                                            <span className="text-[9.5px] font-bold text-slate-800 dark:text-slate-400 truncate max-w-[85px]">
                                              {member.name || member.email}
                                            </span>
                                            {dept && (
                                              <>
                                                <span className="w-[1px] h-2.5 bg-slate-200 dark:bg-slate-700 block"></span>
                                                <span className={`text-[7.5px] font-bold ${getDeptColor(dept)} truncate max-w-[80px]`} title={dept}>
                                                  {dept.charAt(0).toUpperCase() + dept.slice(1)}
                                                </span>
                                              </>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })
                                  ) : (
                                    (() => {
                                      const singleMember = client.assignedTo;
                                      const fullUser = allUsers.find(
                                        (u) =>
                                          u._id ===
                                          (singleMember._id || singleMember),
                                      );
                                      const dept = fullUser?.department || "";
                                      return (
                                        <div
                                          className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white dark:bg-[#0B1120] border border-slate-200/50 dark:border-slate-750/50 shadow-sm transition-transform hover:scale-105 w-max max-w-full overflow-hidden"
                                          title={
                                            singleMember.name ||
                                            singleMember.email
                                          }
                                        >
                                          <div className="flex items-center gap-1.5">
                                            <span className="text-[9.5px] font-bold text-slate-800 dark:text-slate-400 truncate max-w-[85px]">
                                              {singleMember.name ||
                                                singleMember.email}
                                            </span>
                                            {dept && (
                                              <>
                                                <span className="w-[1px] h-2.5 bg-slate-200 dark:bg-slate-700 block"></span>
                                                <span className={`text-[7.5px] font-bold ${getDeptColor(dept)} truncate max-w-[80px]`} title={dept}>
                                                  {dept.charAt(0).toUpperCase() + dept.slice(1)}
                                                </span>
                                              </>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })()
                                  )
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5  bg-slate-50/50 dark:bg-white/5 text-slate-400 dark:text-slate-500 italic text-[9.5px]">
                                    <FiUser size={9} />
                                    <span>Unassigned</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Deliverables Info (NEW) */}
                          <td className={cellClass}>
                            <div className="flex flex-col gap-1.5 max-w-[280px] py-0.5">
                              {/* Digital Marketing */}
                              {(client.posts > 0 || client.reels > 0) && (
                                <div className="space-y-0.5">
                                  <div className="text-[8px] font-extrabold tracking-wider uppercase text-blue-500/80 dark:text-blue-400/80">
                                    Digital Marketing
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    {client.posts > 0 && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 font-bold text-[9.5px]">
                                        <FiLayers size={9} /> {client.posts}{" "}
                                        Posts
                                      </span>
                                    )}
                                    {client.reels > 0 && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 font-bold text-[9.5px]">
                                        <FiVideo size={9} /> {client.reels}{" "}
                                        Reels
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Video Production */}
                              {(client.story > 0 ||
                                (client.needDslr &&
                                  client.needDslr !== "No DSLR")) && (
                                <div className="space-y-0.5">
                                  <div className="text-[8px] font-extrabold tracking-wider uppercase text-rose-500/80 dark:text-rose-400/80">
                                    Video Production
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    {client.story > 0 && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 font-bold text-[9.5px]">
                                        <FiVideo size={9} /> {client.story}{" "}
                                        Stories
                                      </span>
                                    )}
                                    {client.needDslr &&
                                      client.needDslr !== "No DSLR" && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 font-bold text-[9.5px]">
                                          <FiVideo size={9} /> DSLR:{" "}
                                          {client.needDslr}
                                        </span>
                                      )}
                                  </div>
                                </div>
                              )}

                              {/* Website */}
                              {client.pages > 0 && (
                                <div className="space-y-0.5">
                                  <div className="text-[8px] font-extrabold tracking-wider uppercase text-emerald-500/80 dark:text-emerald-400/80">
                                    Website
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 font-bold text-[9.5px]">
                                      <FiGlobe size={9} /> {client.pages}{" "}
                                      Pages
                                    </span>
                                  </div>
                                </div>
                              )}

                              {/* SEO */}
                              {(client.onpage || client.offpage) && (
                                <div className="space-y-0.5">
                                  <div className="text-[8px] font-extrabold tracking-wider uppercase text-amber-500/80 dark:text-amber-400/80">
                                    SEO
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    {client.onpage && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800/60 font-bold text-[9.5px]">
                                        <FiSearch size={9} /> On-Page
                                      </span>
                                    )}
                                    {client.offpage && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800/60 font-bold text-[9.5px]">
                                        <FiSearch size={9} /> Off-Page
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Empty State Fallback */}
                              {!client.posts &&
                                !client.reels &&
                                !client.story &&
                                !client.pages &&
                                !client.onpage &&
                                !client.offpage && (
                                  <span className="text-[10px] text-slate-400 dark:text-slate-500 italic">
                                    No deliverables set.
                                  </span>
                                )}
                            </div>
                          </td>



                          {/* Assigned By */}
                          {user?.role === "team" && (
                            <td className={cellClass}>
                              <div className="flex items-center gap-1">
                                {client.createdBy ? (
                                  (() => {
                                    const uCol = getUserColor(
                                      client.createdBy._id || client.createdBy,
                                    );
                                    return (
                                      <span
                                        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md ${uCol.bg} ${uCol.text} border ${uCol.border} font-bold text-[10.5px]`}
                                      >
                                        <FiUser size={10} />
                                        <span>
                                          {client.createdBy.name ||
                                            client.createdBy.email}
                                        </span>
                                      </span>
                                    );
                                  })()
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-dashed border-slate-205 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/10 text-slate-450 dark:text-slate-500 italic text-[10.5px]">
                                    <FiUser size={10} />
                                    <span>System / Admin</span>
                                  </span>
                                )}
                              </div>
                            </td>
                          )}

                          {/* Actions */}
                          {(user?.role === "admin" ||
                            user?.role === "operationmanager") && (
                            <td className={`${cellClass} text-center`}>
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => {
                                    setViewClient(client);
                                    setShowViewOffcanvas(true);
                                  }}
                                  className="w-7 h-7 flex items-center justify-center bg-teal-50 dark:bg-teal-500/10 hover:bg-teal-100 dark:hover:bg-teal-500/20 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-500/30 rounded-lg transition-all shadow-sm hover:shadow active:scale-95 cursor-pointer"
                                  title="View Record"
                                >
                                  <FiEye size={12.5} className="stroke-[2.5]" />
                                </button>
                                <button
                                  onClick={() => handleEdit(client)}
                                  className="w-7 h-7 flex items-center justify-center bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30 rounded-lg transition-all shadow-sm hover:shadow active:scale-95 cursor-pointer"
                                  title="Edit Record"
                                >
                                  <FiEdit
                                    size={12.5}
                                    className="stroke-[2.5]"
                                  />
                                </button>
                                <button
                                  onClick={() => setClientToDelete(client)}
                                  className="w-7 h-7 flex items-center justify-center bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30 rounded-lg transition-all shadow-sm hover:shadow active:scale-95 cursor-pointer"
                                  title="Delete Record"
                                >
                                  <FiTrash2
                                    size={12.5}
                                    className="stroke-[2.5]"
                                  />
                                </button>
                              </div>
                            </td>
                          )}
                        </motion.tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan={
                          1 +
                          (user?.role === "admin" || user?.role === "operationmanager" ? 1 : 0) +
                          2 +
                          (user?.role === "team" ? 1 : 0) +
                          (user?.role === "admin" || user?.role === "operationmanager" ? 1 : 0)
                        }
                        className="px-5 py-24 text-center"
                      >
                        <div className="flex flex-col items-center justify-center text-center">
                          <div className="w-14 h-14 rounded-full theme-bg-main flex items-center justify-center mb-3">
                            <FiUsers
                              className="text-blue-500 animate-pulse"
                              size={22}
                            />
                          </div>
                          <h2 className="text-[14px] font-extrabold theme-text-primary">
                            No Registered Clients Found
                          </h2>
                          <p className="text-[11px] theme-text-secondary mt-1 max-w-xs leading-relaxed">
                            Add a new client and configure budgets, services,
                            and commitment deliverables.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          {/* Premium Pagination Controls */}
          {totalItems > itemsPerPage && (
            <div className="px-5 py-4 border-t theme-border flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/20 dark:bg-[#111111]/10">
              {/* Left Side: Info */}
              <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Showing{" "}
                <span className="font-extrabold text-slate-700 dark:text-slate-350">
                  {Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)}
                </span>{" "}
                to{" "}
                <span className="font-extrabold text-slate-700 dark:text-slate-350">
                  {Math.min(currentPage * itemsPerPage, totalItems)}
                </span>{" "}
                of{" "}
                <span className="font-extrabold text-slate-700 dark:text-slate-350">
                  {totalItems}
                </span>{" "}
                clients
              </div>

              {/* Right Side: Page buttons */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1 rounded-lg border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 text-[10px] font-bold theme-text-primary disabled:opacity-40 disabled:pointer-events-none transition-all active:scale-95 cursor-pointer"
                >
                  Previous
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => {
                    const isSelected = page === currentPage;
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`h-6 w-6 rounded-md text-[10px] font-extrabold flex items-center justify-center transition-all ${
                          isSelected
                            ? "theme-bg-accent text-white dark:text-black font-black"
                            : "bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400"
                        }`}
                      >
                        {page}
                      </button>
                    );
                  },
                )}

                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(p + 1, totalPages))
                  }
                  disabled={currentPage === totalPages}
                  className="px-2.5 py-1 rounded-lg border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 text-[10px] font-bold theme-text-primary disabled:opacity-40 disabled:pointer-events-none transition-all active:scale-95 cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* CREATE & EDIT CLIENT MODAL */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-5 bg-black/30 backdrop-blur-sm flex items-center justify-center p-3"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: "spring", stiffness: 350, damping: 28 }}
              className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl border border-slate-200/50 dark:border-slate-800 h-[85vh] sm:h-auto min-h-[500px] sm:min-h-[560px] md:min-h-[600px] max-h-[90vh] flex flex-col"
            >
              {/* MODAL HEADER */}
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-black/25">
                <div>
                  <h2 className="text-[13px] md:text-[14px] font-bold theme-text-accent  flex items-center gap-2">
                    <FiUsers size={16} className="theme-text-accent" />
                    {editId ? "Update Client details" : "Register New Client"}
                  </h2>
                </div>

                <button
                  onClick={() => setShowModal(false)}
                  className="w-5 h-5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-transparent flex items-center justify-center text-slate-400 dark:text-slate-350 hover:text-rose-500 dark:hover:text-rose-400 hover:border-rose-100 transition-all cursor-pointer shadow-sm"
                >
                  <FiX size={14} className="stroke-[3]" />
                </button>
              </div>

              {/* MODERN TAB NAVIGATION */}
              <div className="flex border-b border-slate-100 dark:border-slate-800 px-5 bg-[var(--accent-color)]/20 dark:bg-[var(--accent-color-dark)]/20 relative">
                {["profile", "branding", "service", "finance"].map((tab) => {
                  const isActive = activeTab === tab;
                  return (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab(tab)}
                      className={`relative px-4 py-3.5 text-[10px] md:text-[10.5px] font-extrabold capitalize transition-all cursor-pointer ${
                        isActive
                          ? "theme-text-accent font-black"
                          : "text-slate-400 dark:text-slate-500 hover:theme-text-accent"
                      }`}
                    >
                      <span className="relative z-10">
                        {tab === "profile"
                          ? "1. Company Details"
                          : tab === "branding"
                            ? "2. Brand Identity"
                            : tab === "service"
                              ? "3. Service Plan"
                              : "4. Budget Settings"}
                      </span>
                      {isActive && (
                        <motion.div
                          layoutId="activeModalTabIndicator"
                          className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--accent-color)] dark:bg-[var(--accent-color-dark)]"
                          transition={{
                            type: "spring",
                            stiffness: 380,
                            damping: 30,
                          }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* MODAL FORM */}
              <form
                onSubmit={handleSubmit}
                className="flex-1 overflow-y-auto p-5 space-y-4"
              >
                <AnimatePresence mode="wait">
                  {/* TAB 1: BASIC INFORMATION */}
                  {activeTab === "profile" && (
                    <motion.div
                      key="profile"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{
                        type: "spring",
                        stiffness: 350,
                        damping: 28,
                      }}
                      className="space-y-4 min-h-[280px] sm:min-h-[340px]"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Company Name */}
                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                            Company Name
                          </label>
                          <div className="flex items-center w-full h-10 px-3.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-black rounded-xl focus-within:ring-2 focus-within:ring-[var(--accent-color)]/20 dark:focus-within:ring-[var(--accent-color-dark)]/20 focus-within:border-[var(--accent-color)] dark:focus-within:border-[var(--accent-color-dark)] hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200 shadow-sm group">
                            <FaRegBuilding
                              size={12}
                              className="text-slate-400 dark:text-slate-500 mr-2.5 shrink-0 group-focus-within:theme-text-accent transition-colors duration-250"
                            />
                            <input
                              type="text"
                              name="companyName"
                              value={formData.companyName}
                              onChange={handleChange}
                              placeholder="Enter Client or Company Name"
                              className="w-full bg-transparent border-none outline-none focus:outline-none focus:border-none focus:ring-0 text-xs text-slate-850 dark:text-slate-100 font-semibold placeholder:text-slate-300 dark:placeholder:text-slate-600"
                              required
                            />
                          </div>
                        </div>

                        {/* Industry Sector */}
                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                            Industry Sector
                          </label>
                          <div className="flex items-center w-full h-10 px-3.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-black rounded-xl focus-within:ring-2 focus-within:ring-[var(--accent-color)]/20 dark:focus-within:ring-[var(--accent-color-dark)]/20 focus-within:border-[var(--accent-color)] dark:focus-within:border-[var(--accent-color-dark)] hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200 shadow-sm group">
                            <FiLayers
                              size={12}
                              className="text-slate-400 dark:text-slate-500 mr-2.5 shrink-0 group-focus-within:theme-text-accent transition-colors duration-250"
                            />
                            <input
                              type="text"
                              name="industry"
                              value={formData.industry}
                              onChange={handleChange}
                              placeholder="e.g. Technology / Retail"
                              className="w-full bg-transparent border-none outline-none focus:outline-none focus:border-none focus:ring-0 text-xs text-slate-850 dark:text-slate-100 font-semibold placeholder:text-slate-300 dark:placeholder:text-slate-600"
                              required
                            />
                          </div>
                        </div>

                        {/* Onboarding Date */}
                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                            Onboarding Date
                          </label>
                          <div className="flex items-center w-full h-10 px-3.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-black rounded-xl focus-within:ring-2 focus-within:ring-[var(--accent-color)]/20 dark:focus-within:ring-[var(--accent-color-dark)]/20 focus-within:border-[var(--accent-color)] dark:focus-within:border-[var(--accent-color-dark)] hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200 shadow-sm group">
                            <FiCalendar
                              size={12}
                              className="text-slate-400 dark:text-slate-500 mr-2.5 shrink-0 group-focus-within:theme-text-accent transition-colors duration-250"
                            />
                            <input
                              type="date"
                              name="onboardingDate"
                              value={formData.onboardingDate}
                              onChange={handleChange}
                              className="w-full bg-transparent border-none outline-none focus:outline-none focus:border-none focus:ring-0 text-xs text-slate-850 dark:text-slate-100 font-semibold placeholder:text-slate-300 dark:placeholder:text-slate-600 cursor-pointer"
                              required
                            />
                          </div>
                        </div>

                        {/* SPOC Name */}
                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                            SPOC Name
                          </label>
                          <div className="flex items-center w-full h-10 px-3.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-black rounded-xl focus-within:ring-2 focus-within:ring-[var(--accent-color)]/20 dark:focus-within:ring-[var(--accent-color-dark)]/20 focus-within:border-[var(--accent-color)] dark:focus-within:border-[var(--accent-color-dark)] hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200 shadow-sm group">
                            <FiUser
                              size={12}
                              className="text-slate-400 dark:text-slate-500 mr-2.5 shrink-0 group-focus-within:theme-text-accent transition-colors duration-250"
                            />
                            <input
                              type="text"
                              name="spoc"
                              value={formData.spoc}
                              onChange={handleChange}
                              placeholder="Representative Name"
                              className="w-full bg-transparent border-none outline-none focus:outline-none focus:border-none focus:ring-0 text-xs text-slate-850 dark:text-slate-100 font-semibold placeholder:text-slate-300 dark:placeholder:text-slate-600"
                            />
                          </div>
                        </div>

                        {/* Designation */}
                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                            Designation
                          </label>
                          <div className="flex items-center w-full h-10 px-3.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-black rounded-xl focus-within:ring-2 focus-within:ring-[var(--accent-color)]/20 dark:focus-within:ring-[var(--accent-color-dark)]/20 focus-within:border-[var(--accent-color)] dark:focus-within:border-[var(--accent-color-dark)] hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200 shadow-sm group">
                            <FiBriefcase
                              size={12}
                              className="text-slate-400 dark:text-slate-500 mr-2.5 shrink-0 group-focus-within:theme-text-accent transition-colors duration-250"
                            />
                            <input
                              type="text"
                              name="designation"
                              value={formData.designation}
                              onChange={handleChange}
                              placeholder="e.g. Marketing Manager"
                              className="w-full bg-transparent border-none outline-none focus:outline-none focus:border-none focus:ring-0 text-xs text-slate-850 dark:text-slate-100 font-semibold placeholder:text-slate-300 dark:placeholder:text-slate-600"
                            />
                          </div>
                        </div>

                        {/* Phone Number */}
                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                            Phone Number
                          </label>
                          <div className="flex items-center w-full h-10 px-3.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-black rounded-xl focus-within:ring-2 focus-within:ring-[var(--accent-color)]/20 dark:focus-within:ring-[var(--accent-color-dark)]/20 focus-within:border-[var(--accent-color)] dark:focus-within:border-[var(--accent-color-dark)] hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200 shadow-sm group">
                            <FiPhone
                              size={12}
                              className="text-slate-400 dark:text-slate-500 mr-2.5 shrink-0 group-focus-within:theme-text-accent transition-colors duration-250"
                            />
                            <input
                              type="tel"
                              maxLength={15}
                              name="phoneNumber"
                              value={formData.phoneNumber}
                              onChange={handleChange}
                              placeholder="Enter Phone Number"
                              className="w-full bg-transparent border-none outline-none focus:outline-none focus:border-none focus:ring-0 text-xs text-slate-850 dark:text-slate-100 font-semibold placeholder:text-slate-300 dark:placeholder:text-slate-600"
                              required
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* TAB 2: BRAND IDENTITY */}
                  {activeTab === "branding" && (
                    <motion.div
                      key="branding"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{
                        type: "spring",
                        stiffness: 350,
                        damping: 28,
                      }}
                      className="space-y-6 min-h-[280px] sm:min-h-[340px]"
                    >
                      <div className="space-y-6">
                        {/* Icon Selection */}
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest flex items-center gap-2">
                              <span className="w-5 h-5 rounded flex items-center justify-center bg-blue-50 dark:bg-blue-500/10 text-blue-500">
                                <FiBriefcase size={12} />
                              </span>
                              Brand Identity Icon
                            </label>
                          </div>
                          <div className="grid grid-cols-5 sm:grid-cols-10 gap-3 bg-slate-50 dark:bg-slate-800 p-4 rounded-3xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm">
                            {Object.entries(CLIENT_ICONS).map(
                              ([key, IconComponent]) => {
                                const isSelected = formData.icon === key;
                                return (
                                  <button
                                    key={key}
                                    type="button"
                                    onClick={() =>
                                      setFormData((prev) => ({
                                        ...prev,
                                        icon: key,
                                      }))
                                    }
                                    className={`w-12 h-12 rounded-[1.25rem] flex flex-col items-center justify-center transition-all duration-300 cursor-pointer ${
                                      isSelected
                                        ? "shadow-md scale-110 ring-2 ring-offset-2 dark:ring-offset-slate-900 bg-white dark:bg-slate-800"
                                        : "hover:scale-105 hover:bg-white dark:hover:bg-slate-700/50 hover:shadow-sm"
                                    }`}
                                    style={{
                                      color: isSelected
                                        ? formData.color
                                        : "rgb(148, 163, 184)",
                                      ringColor: isSelected
                                        ? formData.color
                                        : "transparent",
                                    }}
                                    title={key
                                      .replace("Fa", "")
                                      .replace("Fi", "")}
                                  >
                                    <IconComponent
                                      size={22}
                                      className={
                                        isSelected ? "drop-shadow-sm" : ""
                                      }
                                    />
                                  </button>
                                );
                              },
                            )}
                          </div>
                        </div>

                        {/* Color Selection */}
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <label className="text-[11px] font-black text-slate-705 dark:text-slate-300 uppercase tracking-widest flex items-center gap-2">
                              <span className="w-5 h-5 rounded flex items-center justify-center bg-purple-50 dark:bg-purple-500/10 text-purple-500">
                                <div className="w-2.5 h-2.5 rounded-full bg-current" />
                              </span>
                              Brand Theme Color
                            </label>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 bg-slate-50/50 dark:bg-slate-800/30 p-4 rounded-3xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm">
                            {CLIENT_COLORS.map((colorItem) => {
                              const c = colorItem.value || colorItem; // Handle both object and string formats
                              const isSelected = formData.color === c;
                              return (
                                <button
                                  key={c}
                                  type="button"
                                  onClick={() =>
                                    setFormData((prev) => ({
                                      ...prev,
                                      color: c,
                                    }))
                                  }
                                  className={`w-8 h-8 rounded-full transition-all duration-300 cursor-pointer flex items-center justify-center ${
                                    isSelected
                                      ? "scale-110 shadow-lg ring-2 ring-offset-2 dark:ring-offset-slate-900"
                                      : "hover:scale-110 hover:shadow-md"
                                  }`}
                                  style={{
                                    backgroundColor: c,
                                    ringColor: isSelected ? c : "transparent",
                                  }}
                                >
                                  {isSelected && (
                                    <FiCheck
                                      size={14}
                                      className="text-white drop-shadow-md"
                                    />
                                  )}
                                </button>
                              );
                            })}

                            <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 mx-2" />

                            <label
                              className={`relative h-10 px-4 rounded-xl border-2 border-dashed bg-white dark:bg-slate-800 cursor-pointer flex items-center justify-center shadow-sm transition-all duration-300 hover:border-slate-400 dark:hover:border-slate-500 ${
                                !CLIENT_COLORS.some(
                                  (colorItem) =>
                                    (colorItem.value || colorItem) ===
                                    formData.color,
                                )
                                  ? "border-solid shadow-md ring-2 ring-offset-2 dark:ring-offset-slate-900 scale-105"
                                  : "border-slate-300 dark:border-slate-600 hover:scale-105"
                              }`}
                              style={{
                                borderColor: !CLIENT_COLORS.some(
                                  (colorItem) =>
                                    (colorItem.value || colorItem) ===
                                    formData.color,
                                )
                                  ? formData.color
                                  : undefined,
                                ringColor: !CLIENT_COLORS.some(
                                  (colorItem) =>
                                    (colorItem.value || colorItem) ===
                                    formData.color,
                                )
                                  ? formData.color
                                  : "transparent",
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-4 h-4 rounded-full shadow-inner border border-black/10 dark:border-white/10"
                                  style={{ backgroundColor: formData.color }}
                                />
                                <span className="text-[11px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                                  Custom
                                </span>
                              </div>
                              <input
                                type="color"
                                name="color"
                                value={formData.color}
                                onChange={handleChange}
                                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                              />
                            </label>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* TAB 3: SERVICE CATEGORIES & COMMITMENTS */}
                  {activeTab === "service" && (
                    <motion.div
                      key="service"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{
                        type: "spring",
                        stiffness: 350,
                        damping: 28,
                      }}
                      className="space-y-4 min-h-[280px] sm:min-h-[340px] pb-32"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <MultiSelect
                          label="Core Contract Service"
                          placeholder="Select Service Areas"
                          options={[
                            {
                              value: "Digital Marketing",
                              label: "Digital Marketing",
                            },
                            { value: "Website", label: "Website Development" },
                            { value: "SEO", label: "SEO Strategy" },
                            {
                              value: "Additional work",
                              label: "Additional work",
                            },
                            {
                              value: "Video Production",
                              label: "Video Production",
                            },
                            { value: "Others", label: "Others" },
                          ]}
                          selectedValues={formData.service || []}
                          onChange={handleServiceChange}
                          icon={FiLayers}
                        />

                        <MultiSelect
                          label="Assign to members"
                          placeholder="Select members"
                          options={allUsers.map((u) => ({
                            value: u._id,
                            label: u.name,
                            subLabel: u.email,
                            avatarUrl: u.profile?.profileImage?.url || u.profileImage?.url || u.profile?.avatar || u.avatar || "",
                            group: u.department
                              ? u.department.toUpperCase()
                              : "UNASSIGNED",
                          }))}
                          selectedValues={formData.assignedTo || []}
                          onChange={handleAssignedChange}
                          icon={FiUsers}
                        />
                      </div>

                      {/* Commitments Dynamic Blocks */}
                      {formData.service &&
                        (Array.isArray(formData.service)
                          ? formData.service.length > 0
                          : formData.service) && (
                          <div className="pt-2 space-y-4">
                            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-widest mb-2 flex items-center gap-1.5 font-bold">
                              <FiBookOpen size={11} />
                              Deliverables Setup
                            </label>

                            {/* Digital Marketing commitments */}
                            {((Array.isArray(formData.service) &&
                              formData.service.includes("Digital Marketing")) ||
                              formData.service === "Digital Marketing") && (
                              <div className="bg-blue-50/30 dark:bg-black/40 border border-blue-100/50 dark:border-blue-900/20 rounded-2xl p-4 space-y-3.5">
                                <h4 className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                                  <FiLayers size={12} /> Digital Marketing
                                  Deliverables
                                </h4>
                                <div className="grid grid-cols-3 gap-3">
                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                                      Reels
                                    </label>
                                    <input
                                      type="number"
                                      name="reels"
                                      value={formData.reels}
                                      onChange={handleChange}
                                      placeholder="Count"
                                      className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-black px-3 text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-[#3b82f6]/20 font-semibold placeholder:text-slate-300 dark:placeholder:text-slate-600"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                                      Posts
                                    </label>
                                    <input
                                      type="number"
                                      name="posts"
                                      value={formData.posts}
                                      onChange={handleChange}
                                      placeholder="Count"
                                      className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-black px-3 text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-[#3b82f6]/20 font-semibold placeholder:text-slate-300 dark:placeholder:text-slate-600"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                                      story
                                    </label>
                                    <input
                                      type="number"
                                      name="story"
                                      value={formData.story}
                                      onChange={handleChange}
                                      placeholder="Count"
                                      className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-black px-3 text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-[#3b82f6]/20 font-semibold placeholder:text-slate-300 dark:placeholder:text-slate-600"
                                    />
                                  </div>
                                </div>

                                <div>
                                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                                    DSLR requirement
                                  </label>
                                  <select
                                    name="needDslr"
                                    value={formData.needDslr}
                                    onChange={handleChange}
                                    className="h-10 px-3.5 py-0 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-black text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-[#3b82f6]/20 font-semibold cursor-pointer w-full md:w-52 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23475569%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_0.75rem_center] bg-[length:0.85em_0.85em] pr-8"
                                  >
                                    <option value="">Select Option</option>
                                    <option value="Need DSLR">Need DSLR</option>
                                    <option value="No DSLR">No DSLR</option>
                                  </select>
                                </div>
                              </div>
                            )}

                            {/* Website commitments */}
                            {((Array.isArray(formData.service) &&
                              formData.service.includes("Website")) ||
                              formData.service === "Website") && (
                              <div className="bg-emerald-50/30 dark:bg-black/40 border border-emerald-100/50 dark:border-emerald-900/20 rounded-2xl p-4">
                                <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 mb-2.5">
                                  <FiGlobe size={12} /> Website Deliverables
                                </h4>
                                <div className="w-full md:w-1/2">
                                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                                    Estimated Web Pages
                                  </label>
                                  <input
                                    type="number"
                                    name="pages"
                                    value={formData.pages}
                                    onChange={handleChange}
                                    placeholder="e.g. 5 Pages"
                                    className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-black px-3.5 text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/25 dark:focus:ring-[#3b82f6]/25 font-semibold placeholder:text-slate-300 dark:placeholder:text-slate-600"
                                  />
                                </div>
                              </div>
                            )}

                            {/* SEO commitments */}
                            {((Array.isArray(formData.service) &&
                              formData.service.includes("SEO")) ||
                              formData.service === "SEO") && (
                              <div className="bg-purple-50/30 dark:bg-black/40 border border-purple-100/50 dark:border-purple-900/20 rounded-2xl p-4">
                                <h4 className="text-xs font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1.5 mb-2.5">
                                  <FiSearch size={12} /> SEO Deliverables
                                </h4>
                                <label className="block text-[10px] font-bold text-slate-550 dark:text-slate-350 mb-2">
                                  Select Deliverables
                                </label>
                                <div className="flex flex-wrap gap-3">
                                  <label className="flex items-center gap-2.5 bg-white dark:bg-black px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 cursor-pointer hover:border-purple-400 dark:hover:border-purple-500 transition-all font-semibold">
                                    <input
                                      type="checkbox"
                                      name="onpage"
                                      checked={formData.onpage}
                                      onChange={handleChange}
                                      className="rounded text-purple-650 focus:ring-purple-500"
                                    />
                                    On-Page SEO
                                  </label>

                                  <label className="flex items-center gap-2.5 bg-white dark:bg-black px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 cursor-pointer hover:border-purple-400 dark:hover:border-purple-500 transition-all font-semibold">
                                    <input
                                      type="checkbox"
                                      name="offpage"
                                      checked={formData.offpage}
                                      onChange={handleChange}
                                      className="rounded text-purple-650 focus:ring-purple-500"
                                    />
                                    Off-Page Link Building
                                  </label>
                                </div>
                              </div>
                            )}

                            {/* Video Production commitments */}
                            {((Array.isArray(formData.service) &&
                              formData.service.includes("Video Production")) ||
                              formData.service === "Video Production") && (
                              <div className="bg-rose-50/30 dark:bg-black/40 border border-rose-100/50 dark:border-rose-900/20 rounded-2xl p-4 space-y-3.5">
                                <h4 className="text-xs font-bold text-rose-600 dark:text-rose-405 flex items-center gap-1.5">
                                  <FiVideo size={12} /> Video Production
                                  Deliverables
                                </h4>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                                      story Count
                                    </label>
                                    <input
                                      type="number"
                                      name="story"
                                      value={formData.story}
                                      onChange={handleChange}
                                      placeholder="Count"
                                      className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-black px-3 text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-[#3b82f6]/20 font-semibold placeholder:text-slate-300 dark:placeholder:text-slate-600"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                                      Reels Count
                                    </label>
                                    <input
                                      type="number"
                                      name="reels"
                                      value={formData.reels}
                                      onChange={handleChange}
                                      placeholder="Count"
                                      className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-black px-3 text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-[#3b82f6]/20 font-semibold placeholder:text-slate-300 dark:placeholder:text-slate-600"
                                    />
                                  </div>
                                </div>

                                <div>
                                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                                    DSLR requirement
                                  </label>
                                  <select
                                    name="needDslr"
                                    value={formData.needDslr}
                                    onChange={handleChange}
                                    className="h-10 px-3.5 py-0 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-black text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-[#3b82f6]/20 font-semibold cursor-pointer w-full md:w-52 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23475569%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_0.75rem_center] bg-[length:0.85em_0.85em] pr-8"
                                  >
                                    <option value="">Select Option</option>
                                    <option value="Need DSLR">Need DSLR</option>
                                    <option value="No DSLR">No DSLR</option>
                                  </select>
                                </div>
                              </div>
                            )}

                            {/* Additional work commitments */}
                            {((Array.isArray(formData.service) &&
                              formData.service.includes("Additional work")) ||
                              formData.service === "Additional work") && (
                              <div className="bg-amber-50/30 dark:bg-black/40 border border-amber-100/50 dark:border-amber-900/20 rounded-2xl p-4">
                                <h4 className="text-xs font-bold text-amber-600 dark:text-amber-455 flex items-center gap-1.5 mb-2.5">
                                  <FiPlusCircle size={12} /> Additional Work
                                  Details
                                </h4>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                                  Additional deliverables and project-specific
                                  tasks can be added directly via the project
                                  boards or EOD notes.
                                </p>
                              </div>
                            )}

                            {/* Others commitments */}
                            {((Array.isArray(formData.service) &&
                              formData.service.includes("Others")) ||
                              formData.service === "Others") && (
                              <div className="bg-teal-50/30 dark:bg-black/40 border border-teal-100/50 dark:border-teal-900/20 rounded-2xl p-4">
                                <h4 className="text-xs font-bold text-teal-605 dark:text-teal-400 flex items-center gap-1.5 mb-2.5">
                                  <FiHelpCircle size={12} /> Custom Service
                                  Deliverables
                                </h4>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                                  Configure specific milestones and guidelines
                                  directly with the assigned team members.
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                    </motion.div>
                  )}

                  {/* TAB 4: FINANCIALS & GST SETUP */}
                  {activeTab === "finance" && (
                    <motion.div
                      key="finance"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{
                        type: "spring",
                        stiffness: 350,
                        damping: 28,
                      }}
                      className="space-y-4 min-h-[280px] sm:min-h-[340px]"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-500 dark:text-slate-405 uppercase tracking-wide mb-1 flex items-center gap-1">
                            <FiDollarSign
                              size={10}
                              className="text-slate-450"
                            />
                            Base Budget (INR)
                          </label>
                          <input
                            type="number"
                            name="budget"
                            value={formData.budget}
                            onChange={handleChange}
                            placeholder="e.g. 50000"
                            className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-black px-3.5 text-xs text-slate-800 dark:text-slate-150 outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-[#3b82f6]/20 focus:border-blue-500 dark:focus:border-[#3b82f6] transition-all font-semibold placeholder:text-slate-300 dark:placeholder:text-slate-600"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-500 dark:text-slate-405 uppercase tracking-wide mb-1 flex items-center gap-1">
                            <FiPercent size={10} className="text-slate-450" />
                            GST Slab (%)
                          </label>
                          <input
                            type="number"
                            name="gst"
                            value={formData.gst}
                            onChange={handleChange}
                            placeholder="e.g. 18"
                            className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-black px-3.5 text-xs text-slate-800 dark:text-slate-150 outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-[#3b82f6]/20 focus:border-blue-500 dark:focus:border-[#3b82f6] transition-all font-semibold placeholder:text-slate-300 dark:placeholder:text-slate-600"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-500 dark:text-slate-405 uppercase tracking-wide mb-1">
                            Grand Total (Inc. GST)
                          </label>
                          <div className="w-full h-10 rounded-xl bg-emerald-555/5 dark:bg-emerald-950/20 border border-emerald-500/10 dark:border-emerald-900/30 px-3.5 flex items-center text-emerald-600 dark:text-emerald-400 font-extrabold text-xs">
                            ₹{Number(calculateTotal()).toLocaleString("en-IN")}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ACTION FOOTER */}
                <div className="border-t border-slate-100 dark:border-white/5 pt-5 mt-3">
                  {/* Step Progress Indicator */}
                  <div className="flex items-center justify-center gap-2 mb-5">
                    {["profile", "branding", "service", "finance"].map(
                      (step, i) => {
                        const stepIndex = [
                          "profile",
                          "branding",
                          "service",
                          "finance",
                        ].indexOf(activeTab);
                        const isCurrent = step === activeTab;
                        const isDone = i < stepIndex;
                        return (
                          <div key={step} className="flex items-center gap-2">
                            <div
                              className={`flex items-center justify-center w-6 h-6 rounded-full text-[9px] font-black transition-all duration-300 ${
                                isCurrent
                                  ? "theme-bg-accent text-white dark:text-black shadow-lg scale-110"
                                  : isDone
                                    ? "bg-emerald-500 text-white shadow-sm"
                                    : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600"
                              }`}
                            >
                              {isDone ? "✓" : i + 1}
                            </div>
                            <span
                              className={`text-[9px] font-bold hidden sm:block ${
                                isCurrent
                                  ? "theme-text-accent"
                                  : isDone
                                    ? "text-emerald-500"
                                    : "text-slate-400 dark:text-slate-600"
                              }`}
                            >
                              {step === "profile"
                                ? "Company"
                                : step === "branding"
                                  ? "Brand"
                                  : step === "service"
                                    ? "Service"
                                    : "Finance"}
                            </span>
                            {i < 3 && (
                              <div
                                className={`w-8 h-[2px] rounded-full ${isDone ? "bg-emerald-400" : "bg-slate-200 dark:bg-slate-800"}`}
                              />
                            )}
                          </div>
                        );
                      },
                    )}
                  </div>

                  <div className="flex justify-between items-center gap-3">
                    {/* Back Button */}
                    <div>
                      {activeTab !== "profile" && (
                        <button
                          type="button"
                          onClick={() => {
                            if (activeTab === "finance")
                              setActiveTab("service");
                            else if (activeTab === "service")
                              setActiveTab("branding");
                            else if (activeTab === "branding")
                              setActiveTab("profile");
                          }}
                          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold transition-all text-xs cursor-pointer shadow-sm group"
                        >
                          <svg
                            className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2.5}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M15 19l-7-7 7-7"
                            />
                          </svg>
                          Back
                        </button>
                      )}
                    </div>

                    {/* Right Action Buttons */}
                    <div className="flex items-center gap-2.5">
                      {/* Cancel */}
                      <button
                        type="button"
                        onClick={() => setShowModal(false)}
                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold transition-all text-xs cursor-pointer shadow-sm group"
                      >
                        <svg
                          className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform duration-200"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2.5}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                        Cancel
                      </button>

                      {/* Next Step / Submit */}
                      {activeTab !== "finance" ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (activeTab === "profile")
                              setActiveTab("branding");
                            else if (activeTab === "branding")
                              setActiveTab("service");
                            else if (activeTab === "service")
                              setActiveTab("finance");
                          }}
                          className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl font-bold text-xs cursor-pointer shadow-md hover:shadow-lg transition-all duration-200 group text-white dark:text-black"
                          style={{ background: "var(--accent-gradient)" }}
                        >
                          Next Step
                          <svg
                            className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2.5}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </button>
                      ) : (
                        <button
                          type="submit"
                          className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl font-bold text-xs cursor-pointer shadow-md hover:shadow-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] group text-white dark:text-black"
                          style={{ background: "var(--accent-gradient)" }}
                        >
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2.5}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d={
                                editId
                                  ? "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                                  : "M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                              }
                            />
                          </svg>
                          {editId ? "Update Record" : "Register Client"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CONFIRM DELETE WARNING POPUP */}
      <AnimatePresence>
        {clientToDelete && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl p-5 border border-rose-100/50 dark:border-rose-950/20 text-slate-850 dark:text-slate-200"
            >
              <h2 className="text-[15px] font-black text-rose-600 dark:text-rose-405 flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <FiAlertTriangle size={15} />
                </span>
                Confirm Client Deletion
              </h2>

              <p className="text-xs text-slate-600 dark:text-slate-350 mt-3 leading-relaxed font-semibold">
                Are you sure you want to permanently delete the client record
                for{" "}
                <span className="text-rose-600 dark:text-rose-400 font-extrabold inline-flex items-center gap-1 mx-1 translate-y-0.5">
                  <FaRegBuilding size={11} />"{clientToDelete.companyName}"
                </span>
                ?
              </p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5 leading-relaxed font-medium">
                This will purge all commitment details, taxation configurations,
                and related project assignments from the system. This operation
                is irreversible.
              </p>

              {/* POPUP BUTTON ACTIONS */}
              <div className="flex justify-end gap-2 mt-5">
                <button
                  type="button"
                  onClick={() => setClientToDelete(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-950 text-slate-500 dark:text-slate-400 font-bold transition-all text-xs cursor-pointer"
                >
                  No, Keep Record
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    await dispatch(deleteClient(clientToDelete._id));
                    setClientToDelete(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 text-white font-bold shadow-md hover:scale-[1.01] transition-all text-xs cursor-pointer"
                >
                  Yes, Purge Client
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* VIEW CLIENT OFFCANVAS */}
      <AnimatePresence>
        {showViewOffcanvas && viewClient && (
          <React.Fragment>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowViewOffcanvas(false)}
              className="fixed inset-0 z-40 bg-black/40"
            />
            {/* Offcanvas Panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 z-50 w-full md:w-[480px] lg:w-[540px] bg-slate-50 dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col"
            >
              {/* Header Top */}
              <div className="px-4.5 py-3 flex items-center justify-between bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowViewOffcanvas(false)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                  >
                    <FiArrowLeft size={14} />
                  </button>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
                      {viewClient.companyName}
                    </h2>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 font-bold text-[9px] border border-emerald-200 dark:border-emerald-800/60">
                      Active
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => setShowViewOffcanvas(false)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:border-rose-200 dark:hover:border-rose-800 transition-colors"
                >
                  <FiX size={14} />
                </button>
              </div>

              {/* Tabs */}
              <div className="px-4.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
                <div className="flex items-center gap-6 overflow-x-auto no-scrollbar">
                  {["Overview"].map((tab) => (
                    <button
                      key={tab}
                      className={`py-2 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
                        tab === "Overview"
                          ? "border-emerald-500 text-slate-800 dark:text-slate-100"
                          : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-slate-50 dark:bg-slate-950 space-y-4">
                {(() => {
                  // Calculate Stats
                  const clientProjects = projects.filter(p => {
                    const cId = p.client?._id || p.client;
                    return cId === viewClient._id;
                  });
                  
                  const clientTasks = tasks.filter(t => {
                    const cId = t.client?._id || t.client || t.project?.client?._id || t.project?.client;
                    return cId === viewClient._id;
                  });

                  const totalTasks = clientTasks.length;
                  const inProgressTasks = clientTasks.filter(t => t.status === "In Progress" || t.status === "Pending").length;
                  const completedTasks = clientTasks.filter(t => t.status === "Completed").length;
                  const overdueTasks = clientTasks.filter(t => {
                    if (t.status === "Completed") return false;
                    return t.status === "Overdue" || (t.dueDate && new Date(t.dueDate) < new Date());
                  }).length;

                  return (
                    <div className="space-y-4">
                      {/* Section 1: Client details card */}
                      <div className="sidebar-bg rounded-2xl p-4.5 shadow-sm">
                        <h3 className="text-[16px] font-bold text-black dark:text-slate-500 uppercase tracking-widest mb-3.5">
                          Client Profile :
                        </h3>
                        <div className="space-y-2.5">
                          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800/40 pb-2">
                            <span className="text-[12px] font-medium text-black dark:text-slate-500">Company Name</span>
                            <span className="text-[12px] font-semibold text-slate-800 dark:text-slate-200 text-right">{viewClient.companyName}</span>
                          </div>
                          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800/40 pb-2">
                            <span className="text-[12px] font-medium text-black dark:text-slate-500">Industry</span>
                            <span className="text-[12px] font-semibold text-slate-800 dark:text-slate-200 text-right">{viewClient.industry || "-"}</span>
                          </div>
                          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800/60 pb-2">
                            <span className="text-[11px] font-medium text-black dark:text-slate-500">Account Manager</span>
                            <div className="flex items-center gap-1.5">
                              <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-[9px]">
                                {viewClient.spoc ? viewClient.spoc.charAt(0).toUpperCase() : "-"}
                              </div>
                              <span className="text-[12px] font-semibold text-slate-800 dark:text-slate-200 text-right">{viewClient.spoc || "-"}</span>
                            </div>
                          </div>
                          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800/40 pb-2">
                            <span className="text-[11px] font-medium text-black dark:text-slate-500">Contact Person</span>
                            <span className="text-[12px] font-semibold text-slate-800 dark:text-slate-200 text-right">
                              {viewClient.spoc || "-"}
                              {viewClient.designation ? ` (${viewClient.designation})` : ""}
                            </span>
                          </div>
                          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800/40 pb-2">
                            <span className="text-[11px] font-medium text-black dark:text-slate-500">Phone</span>
                            <span className="text-[12px] font-semibold text-slate-800 dark:text-slate-200 text-right">{viewClient.phoneNumber || "-"}</span>
                          </div>
                          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800/40 pb-2">
                            <span className="text-[11px] font-medium text-black dark:text-slate-500">Status</span>
                            <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 font-bold text-[9px] border border-emerald-200 dark:border-emerald-800/60">
                              Active
                            </span>
                          </div>
                          <div className={`flex justify-between items-center pb-2 ${(user?.role === "admin" || user?.role === "operationmanager") ? "border-b border-slate-100 dark:border-slate-800/60" : ""}`}>
                            <span className="text-[11px] font-medium text-black dark:text-slate-500">Onboard Date</span>
                            <span className="text-[12px] font-semibold text-slate-800 dark:text-slate-200 text-right">
                              {viewClient.onboardingDate
                                ? new Date(viewClient.onboardingDate).toLocaleDateString("en-IN", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  })
                                : "-"}
                            </span>
                          </div>
                          
                          {(user?.role === "admin" || user?.role === "operationmanager") && (
                            <>
                              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800/60 py-2">
                                <span className="text-[11px] font-medium text-black dark:text-slate-500">Base Budget</span>
                                <span className="text-[12px] font-semibold text-slate-800 dark:text-slate-200 text-right">
                                  ₹{(viewClient.budget || 0).toLocaleString("en-IN")}
                                </span>
                              </div>
                              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800/60 py-2">
                                <span className="text-[11px] font-medium text-black dark:text-slate-500">GST Slab</span>
                                <span className="text-[12px] font-semibold text-slate-800 dark:text-slate-200 text-right">
                                  {viewClient.gst || 18}%
                                </span>
                              </div>
                              <div className="flex justify-between items-center pt-2 pb-1">
                                <span className="text-[11px] font-bold text-black dark:text-slate-550">Grand Total</span>
                                <span className="text-[12.5px] font-extrabold text-emerald-600 dark:text-emerald-400 text-right">
                                  ₹{(viewClient.totalBudget || viewClient.budget || 0).toLocaleString("en-IN")}
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Section 2: Projects Card */}
                      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4.5 border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="flex items-center justify-between mb-3.5">
                          <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                            Projects ({clientProjects.length})
                          </h3>
                          <Link to={`/${user.role}/projects`}>
                            <span className="text-[10.5px] font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 cursor-pointer">
                              View All
                            </span>
                          </Link>
                        </div>
                        
                        <div className="space-y-2">
                          {clientProjects.slice(0, 5).map(project => (
                            <Link
                              key={project._id}
                              to={`/${user.role}/projects?id=${project._id}`}
                              className="block"
                            >
                              <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-800/30 transition-colors hover:bg-blue-50/80 dark:hover:bg-blue-950/20 hover:border-blue-200/50 dark:hover:border-blue-800/50 cursor-pointer group">
                                <div className="flex items-center gap-2.5">
                                  <div 
                                    className="w-6.5 h-6.5 rounded-lg flex items-center justify-center text-white shadow-sm"
                                    style={{ background: project.color || "var(--accent-gradient)" }}
                                  >
                                    <FiBriefcase size={12} />
                                  </div>
                                  <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{project.name}</span>
                                </div>
                                <span className="px-1.5 py-0.5 rounded text-[8.5px] font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                                  {project.status || "Active"}
                                </span>
                              </div>
                            </Link>
                          ))}
                          {clientProjects.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-4 text-slate-400">
                              <FiBriefcase size={20} className="mb-1.5 opacity-30" />
                              <span className="text-[11px] font-bold">No projects assigned yet.</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Section 3: Tasks Summary Card */}
                      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4.5 border border-slate-200 dark:border-slate-800 shadow-sm">
                        <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3.5">
                          Tasks Summary
                        </h3>
                        <div className="grid grid-cols-4 gap-2.5">
                          {/* Total */}
                          <div className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40">
                            <span className="text-lg font-black text-blue-700 dark:text-blue-400 mb-0.5">{totalTasks}</span>
                            <span className="text-[8px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 text-center">Total</span>
                          </div>
                          {/* In Progress */}
                          <div className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40">
                            <span className="text-lg font-black text-amber-600 dark:text-amber-400 mb-0.5">{inProgressTasks}</span>
                            <span className="text-[8px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 text-center">Active</span>
                          </div>
                          {/* Completed */}
                          <div className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40">
                            <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 mb-0.5">{completedTasks}</span>
                            <span className="text-[8px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 text-center">Done</span>
                          </div>
                          {/* Overdue */}
                          <div className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40">
                            <span className="text-lg font-black text-rose-600 dark:text-rose-400 mb-0.5">{overdueTasks}</span>
                            <span className="text-[8px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 text-center">Overdue</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          </React.Fragment>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Clients;
