import React, { useState, useEffect, useRef, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import ProjectIcon from "../../../components/common/ProjectIcon";
import {
  FiPlus,
  FiTrash2,
  FiEdit3,
  FiCheck,
  FiChevronLeft,
  FiChevronRight,
  FiMoreHorizontal,
  FiCalendar,
  FiStar,
  FiSearch,
  FiX,
  FiArrowRight,
  FiFolder,
  FiFilter,
  FiUser,
} from "react-icons/fi";
import {
  LuPlus,
  LuFolderOpen,
  LuRocket,
  LuListTodo,
  LuBriefcase,
  LuFolder,
  LuLaptop,
  LuCalendarDays,
} from "react-icons/lu";

const getProjectIcon = (projectName, projectId) => {
  const hash = (projectId || projectName || "")
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const icons = [
    {
      icon: LuRocket,
      bg: "bg-blue-500/10 dark:bg-blue-500/20 text-blue-500 dark:text-blue-400",
    },
    {
      icon: LuListTodo,
      bg: "bg-pink-500/10 dark:bg-pink-500/20 text-pink-500 dark:text-pink-400",
    },
    {
      icon: LuBriefcase,
      bg: "bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-500 dark:text-emerald-400",
    },
    {
      icon: LuFolder,
      bg: "bg-amber-500/10 dark:bg-amber-500/20 text-amber-500 dark:text-amber-400",
    },
    {
      icon: LuLaptop,
      bg: "bg-purple-500/10 dark:bg-purple-500/20 text-purple-500 dark:text-purple-400",
    },
    {
      icon: LuCalendarDays,
      bg: "bg-cyan-500/10 dark:bg-cyan-500/20 text-cyan-500 dark:text-cyan-400",
    },
    {
      icon: LuFolderOpen,
      bg: "bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-500 dark:text-indigo-400",
    },
  ];
  return icons[hash % icons.length];
};

const getRelativeTime = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  if (isNaN(diffMs)) return "";

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) {
    return "just now";
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  if (hours < 24) {
    return `${hours}h ago`;
  }
  if (days === 1) {
    return "1 day ago";
  }
  return `${days} days ago`;
};

const getInitials = (name) => {
  if (!name) return "U";
  const parts = name.split(" ");
  if (parts.length > 1) {
    return (parts[0][0] + parts[1][parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

const getAvatarColor = (name) => {
  const colors = [
    "bg-amber-500",
    "bg-orange-500",
    "bg-red-500",
    "bg-blue-500",
    "bg-emerald-500",
    "bg-purple-500",
  ];
  const hash = (name || "")
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

const getStatusPill = (project, timeTick) => {
  const relativeTime = getRelativeTime(project.updatedAt);

  switch (project.status) {
    case "Active":
      return (
        <div className="flex items-center gap-2 text-[11px]">
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            On track
          </span>
          {relativeTime && (
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
              {relativeTime}
            </span>
          )}
        </div>
      );
    case "On Hold":
      return (
        <div className="flex items-center gap-2 text-[11px]">
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-amber-100 dark:border-amber-900/40 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            At risk
          </span>
          {relativeTime && (
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
              {relativeTime}
            </span>
          )}
        </div>
      );
    case "Completed":
      return (
        <div className="flex items-center gap-2 text-[11px]">
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-blue-100 dark:border-blue-900/40 bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            Completed
          </span>
          {relativeTime && (
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
              {relativeTime}
            </span>
          )}
        </div>
      );
    default:
      return (
        <div className="flex items-center gap-2 text-[11px]">
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-slate-200 dark:border-white/5 bg-slate-50 text-slate-650 dark:bg-[#1a1a1a] dark:text-slate-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full border border-slate-400 dark:border-slate-500" />
            No recent updates
          </span>
          {relativeTime && (
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
              {relativeTime}
            </span>
          )}
        </div>
      );
  }
};

import {
  getProjects,
  createProject,
  updateProject,
} from "../../../features/projects/projectSlice";
import { getTasks } from "../../../features/tasks/taskSlice";
import { getUsers } from "../../../features/users/userSlice";
import { getClients } from "../../../features/clients/clientslice";
import {
  getPortfolios,
  createPortfolio,
  updatePortfolio,
  deletePortfolio,
  addProjectsToPortfolio,
  removeProjectFromPortfolio,
} from "../../../features/portfolio/portfolioSlice";

const Portfolio = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Redux state
  const { projects } = useSelector((state) => state.projects);
  const { tasks } = useSelector((state) => state.tasks);
  const { users } = useSelector((state) => state.users);
  const { clients } = useSelector((state) => state.clients);
  const { portfolios: rawPortfolios, loading: portfolioLoading } = useSelector(
    (state) => state.portfolios,
  );
  const { user } = useSelector((state) => state.auth);

  // Normalize projectIds into a list of strings to handle backend populate
  const portfolios = useMemo(() => {
    return rawPortfolios.map((p) => ({
      ...p,
      projectIdsList: (p.projectIds || []).map((proj) =>
        typeof proj === "object" && proj !== null ? proj._id : proj,
      ),
    }));
  }, [rawPortfolios]);

  // Helper for generating user initials
  const getInitials = (name) => {
    if (!name) return "U";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Helper for generating deterministic avatar colors
  const getAvatarColor = (name) => {
    const colors = [
      "bg-blue-600",
      "bg-indigo-600",
      "bg-purple-600",
      "bg-pink-600",
      "bg-emerald-600",
      "bg-amber-600",
      "bg-teal-600",
      "bg-cyan-600",
    ];
    if (!name) return colors[0];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  // Local UI state
  const location = useLocation();
  const role = user?.role || "admin";
  const isAdminOrManager = role === "admin" || role === "operationmanager";
  const [selectedUserFilter, setSelectedUserFilter] = useState("all");

  // Filter users list to include Social Media Executives / Social Media Managers (Logged-in user comes first)
  const socialMediaUsers = useMemo(() => {
    if (!users || !Array.isArray(users)) return [];
    const currentUserId = String(user?._id || user?.id || "");
    const filtered = users.filter((u) => {
      const roleStr = String(u.role || "").toLowerCase();
      const deptStr = String(u.department || "").toLowerCase();

      const isSocialMedia =
        roleStr.includes("social") ||
        roleStr.includes("media") ||
        roleStr.includes("sme") ||
        deptStr.includes("social") ||
        deptStr.includes("media") ||
        deptStr.includes("sme");

      const hasCreatedPortfolio = portfolios.some((p) => {
        const creatorId = p.createdBy?._id || p.createdBy;
        return String(creatorId) === String(u._id);
      });

      return isSocialMedia || hasCreatedPortfolio;
    });

    return [...filtered].sort((a, b) => {
      const aIsMe = String(a._id) === currentUserId;
      const bIsMe = String(b._id) === currentUserId;
      if (aIsMe) return -1;
      if (bIsMe) return 1;
      return 0;
    });
  }, [users, portfolios, user]);

  // Filter portfolios by selected team member for Admin and Operation Manager
  const filteredPortfolios = useMemo(() => {
    if (!isAdminOrManager || selectedUserFilter === "all") {
      return portfolios;
    }
    return portfolios.filter((p) => {
      const creatorId = p.createdBy?._id || p.createdBy;
      return String(creatorId) === String(selectedUserFilter);
    });
  }, [portfolios, selectedUserFilter, isAdminOrManager]);

  // Group portfolios by user for Admin and Operation Manager view (Logged-in user group comes first)
  const groupedPortfoliosByUser = useMemo(() => {
    const groupsMap = {};
    filteredPortfolios.forEach((portfolio) => {
      const creator = portfolio.createdBy;
      const userId = creator?._id || creator || "unassigned";
      const userName = creator?.name || "Unassigned";
      const userDept =
        creator?.department || creator?.role || "Team Member";
      const profileImage = creator?.profile?.profileImage?.url;

      if (!groupsMap[userId]) {
        groupsMap[userId] = {
          userId,
          userName,
          userDept,
          profileImage,
          portfolios: [],
        };
      }
      groupsMap[userId].portfolios.push(portfolio);
    });

    const currentUserId = String(user?._id || user?.id || "");
    const groupsList = Object.values(groupsMap);

    return groupsList.sort((a, b) => {
      const aIsMe = String(a.userId) === currentUserId;
      const bIsMe = String(b.userId) === currentUserId;
      if (aIsMe) return -1;
      if (bIsMe) return 1;
      return 0;
    });
  }, [filteredPortfolios, user]);
  const selectedPortfolioId = new URLSearchParams(location.search).get("id");
  const activePortfolio = portfolios.find((p) => p._id === selectedPortfolioId);
  const [showAddProjectDropdown, setShowAddProjectDropdown] = useState(false);
  const [projectSearchQuery, setProjectSearchQuery] = useState("");
  const [selectedAddProjects, setSelectedAddProjects] = useState([]);

  // Real-time ticking state for relative time updates
  const [timeTick, setTimeTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeTick((t) => t + 1);
    }, 15000); // Ticks every 15 seconds
    return () => clearInterval(interval);
  }, []);
  const [showCreateProjectForm, setShowCreateProjectForm] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectClientId, setNewProjectClientId] = useState("");
  const [newProjectStatus, setNewProjectStatus] = useState("Active");
  const [creatingProject, setCreatingProject] = useState(false);

  // Modal & form states for create/edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [portfolioName, setPortfolioName] = useState("");
  const [portfolioColor, setPortfolioColor] = useState("#ff80bf");
  const [portfolioId, setPortfolioId] = useState(null);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [menuOpenId, setMenuOpenId] = useState(null);

  // Close menus on click outside
  useEffect(() => {
    const handleOutsideClick = () => setMenuOpenId(null);
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, []);

  // Fetch all data on load
  useEffect(() => {
    dispatch(getProjects());
    dispatch(getTasks());
    dispatch(getUsers());
    dispatch(getClients());
    dispatch(getPortfolios());
  }, [dispatch]);

  // Set default client selection once clients are loaded or active portfolio changes
  useEffect(() => {
    if (clients && clients.length > 0) {
      const targetClientId =
        activePortfolio?.client?._id ||
        activePortfolio?.client ||
        clients[0]._id;
      setNewProjectClientId(targetClientId);
    }
  }, [clients, activePortfolio]);

  // Open create modal
  const handleOpenCreateModal = () => {
    setPortfolioName("");
    setPortfolioColor("#ff80bf");
    setSelectedClientId(clients && clients.length > 0 ? clients[0]._id : "");
    setIsEditMode(false);
    setIsModalOpen(true);
  };

  // Open edit modal
  const handleOpenEditModal = (p) => {
    setPortfolioId(p._id);
    setPortfolioName(p.name);
    setPortfolioColor(p.color || "#ff80bf");
    setSelectedClientId(p.client?._id || p.client || "");
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  // Save portfolio from modal (create or update)
  const handleSavePortfolio = (e) => {
    e.preventDefault();
    if (!selectedClientId) return;
    const clientObj = clients.find((c) => c._id === selectedClientId);
    const finalName = clientObj ? clientObj.companyName : "Portfolio";

    if (isEditMode) {
      dispatch(
        updatePortfolio({
          id: portfolioId,
          data: {
            name: finalName,
            client: selectedClientId,
            color: portfolioColor,
          },
        }),
      );
    } else {
      dispatch(
        createPortfolio({
          name: finalName,
          client: selectedClientId,
          color: portfolioColor,
        }),
      );
    }
    setIsModalOpen(false);
  };

  // Delete portfolio
  const handleDeletePortfolio = (e, id) => {
    e.stopPropagation();
    if (
      window.confirm("Are you sure you want to delete this portfolio folder?")
    ) {
      dispatch(deletePortfolio(id));
      if (selectedPortfolioId === id) navigate(`/${role}/portfolio`);
    }
  };

  // Toggle favorite
  const handleToggleFavorite = (e, portfolio) => {
    e.stopPropagation();
    dispatch(
      updatePortfolio({
        id: portfolio._id,
        data: { isFavorite: !portfolio.isFavorite },
      }),
    );
  };

  // Batch add selected projects to portfolio
  const handleBatchAddProjects = () => {
    if (!selectedAddProjects.length || !activePortfolio) return;
    dispatch(
      addProjectsToPortfolio({
        id: activePortfolio._id,
        projectIds: selectedAddProjects,
      }),
    );
    setSelectedAddProjects([]);
    setShowAddProjectDropdown(false);
    setProjectSearchQuery("");
  };

  // Remove project from current portfolio
  const handleRemoveProject = (projectId) => {
    if (!activePortfolio) return;
    dispatch(
      removeProjectFromPortfolio({ id: activePortfolio._id, projectId }),
    );
  };

  // Create or edit a project
  const handleCreateAndAddProject = async () => {
    if (!newProjectName.trim() || !newProjectClientId) return;
    setCreatingProject(true);
    try {
      if (editingProject) {
        // Edit mode
        await dispatch(
          updateProject({
            id: editingProject._id,
            data: {
              name: newProjectName.trim(),
              client: newProjectClientId,
              status: newProjectStatus,
            },
          }),
        );
        // Refresh projects to fetch updated data
        dispatch(getProjects());
      } else {
        // Create mode
        const result = await dispatch(
          createProject({
            name: newProjectName.trim(),
            client: newProjectClientId,
            status: newProjectStatus,
          }),
        );
        const newProj = result?.payload?.data;
        if (newProj?._id && activePortfolio) {
          dispatch(
            addProjectsToPortfolio({
              id: activePortfolio._id,
              projectIds: [newProj._id],
            }),
          );
        }
      }
    } finally {
      setCreatingProject(false);
      setNewProjectName("");
      const targetClientId =
        activePortfolio?.client?._id ||
        activePortfolio?.client ||
        clients[0]?._id ||
        "";
      setNewProjectClientId(targetClientId);
      setNewProjectStatus("Active");
      setEditingProject(null);
      setShowCreateProjectForm(false);
      setShowAddProjectDropdown(false);
    }
  };

  // Guard clause to prevent rendering detail view before portfolios state is loaded/resolved
  if (selectedPortfolioId && !activePortfolio) {
    return (
      <div className="p-8 text-center max-w-md mx-auto mt-12 bg-white dark:bg-slate-800 rounded-2xl border border-slate-150 dark:border-slate-700/60 shadow-sm">
        <p className="text-slate-500 dark:text-slate-400 font-medium">
          Resolving portfolio group...
        </p>
        <button
          onClick={() => navigate(`/${role}/portfolio`)}
          className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-3 hover:underline uppercase tracking-wider block mx-auto"
        >
          Go Back to Directory
        </button>
      </div>
    );
  }

  // Get status badge colors
  const getStatusBadge = (status) => {
    switch (status) {
      case "Active":
        return "bg-emerald-50 text-emerald-700 border-emerald-200/50 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-800/50";
      case "Completed":
        return "bg-blue-50 text-blue-700 border-blue-200/50 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-800/50";
      case "On Hold":
        return "bg-amber-50 text-amber-700 border-amber-200/50 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-800/50";
      default:
        return "bg-slate-50 text-slate-605 border-slate-205 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800";
    }
  };

  return (
    <div className="space-y-6 max-w-8xl mx-auto p-4 md:p-0  transition-all duration-300">
      <AnimatePresence mode="wait">
        {!selectedPortfolioId ? (
          /* ========================================================
             VIEW 1: PORTFOLIO GRID DIRECTORY (IMAGE 1)
             ======================================================== */
          <motion.div
            key="directory"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl font-extrabold text-slate-800 dark:text-white">
                  Portfolios Dashboard
                </h1>
              </div>

              {/* Team Member Filter Dropdown — Admin & Operation Manager Only */}
              {isAdminOrManager && (
                <div className="flex items-center gap-2.5 bg-white dark:bg-slate-800/80 px-3.5 py-2 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-sm">
                  <FiFilter className="text-blue-500 dark:text-blue-400 text-sm shrink-0" />
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                    Members:
                  </span>
                  <select
                    value={selectedUserFilter}
                    onChange={(e) => setSelectedUserFilter(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-xl px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500/30 transition-all cursor-pointer"
                  >
                    <option value="all">All</option>
                    {(socialMediaUsers || []).map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.name}
                        {String(u._id) === String(user?._id || user?.id)
                          ? " (You)"
                          : ""}{" "}
                        ({u.department || u.role})
                      </option>
                    ))}
                  </select>
                  {selectedUserFilter !== "all" && (
                    <button
                      type="button"
                      onClick={() => setSelectedUserFilter("all")}
                      className="text-slate-400 hover:text-red-500 transition-colors p-1"
                      title="Clear Filter"
                    >
                      <FiX size={14} />
                    </button>
                  )}
                </div>
              )}
            </div>

            {isAdminOrManager ? (
              /* ========================================================
                 ADMIN & OPERATION MANAGER: TOP CONTAINER + USER GROUPS
                 ======================================================== */
              <div className="space-y-6">
                {/* TOP DEDICATED CONTAINER: Create New Portfolio */}
                <div className="bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 rounded-3xl p-5 shadow-sm">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    <button
                      type="button"
                      onClick={handleOpenCreateModal}
                      className="group flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-300/80 dark:border-slate-700/60 hover:border-blue-500 dark:hover:border-blue-500 bg-slate-50/40 hover:bg-blue-50/20 dark:bg-slate-900/30 dark:hover:bg-blue-500/10 rounded-2xl transition-all duration-300 cursor-pointer shadow-sm relative text-center min-h-[160px]"
                    >
                      <div className="w-12 h-12 rounded-2xl border border-slate-250 dark:border-slate-700 flex items-center justify-center text-slate-400 group-hover:text-blue-500 group-hover:border-blue-400 dark:group-hover:border-blue-500 transition-all shadow-sm bg-white dark:bg-slate-800">
                        <FiPlus
                          size={22}
                          className="group-hover:scale-110 transition-transform text-slate-500 group-hover:text-blue-500"
                        />
                      </div>
                      <span className="text-xs font-black text-slate-655 dark:text-slate-300 mt-3 group-hover:text-blue-500 transition-colors uppercase tracking-wider">
                        New portfolio
                      </span>
                    </button>
                  </div>
                </div>

                {/* USER-GROUPED PORTFOLIOS SECTIONS */}
                {groupedPortfoliosByUser.length === 0 ? (
                  <div className="py-12 text-center bg-white dark:bg-slate-900/60 rounded-3xl border border-slate-200/80 dark:border-white/10 p-8 shadow-sm">
                    <FiFolder className="mx-auto h-10 w-10 text-slate-400 mb-3" />
                    <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
                      No portfolios found for the selected team member.
                    </p>
                    {selectedUserFilter !== "all" && (
                      <button
                        onClick={() => setSelectedUserFilter("all")}
                        className="mt-4 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline uppercase tracking-wider"
                      >
                        Clear Filter
                      </button>
                    )}
                  </div>
                ) : (
                  groupedPortfoliosByUser.map((group) => (
                    <div
                      key={group.userId}
                      className="bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 rounded-3xl p-5 shadow-sm space-y-4 hover:border-slate-300 dark:hover:border-white/20 transition-colors"
                    >
                      {/* User Container Header */}
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-2xl overflow-hidden shadow-sm flex items-center justify-center text-white text-xs font-bold shrink-0 ${getAvatarColor(
                              group.userName,
                            )}`}
                          >
                            {group.profileImage ? (
                              <img
                                src={group.profileImage}
                                alt={group.userName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              getInitials(group.userName)
                            )}
                          </div>
                          <div>
                            <h3 className="text-sm font-extrabold text-slate-800 dark:text-white">
                              {group.userName}
                            </h3>
                            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                              {group.userDept}
                            </p>
                          </div>
                        </div>

                        <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 border border-slate-200/50 dark:border-white/5">
                          {group.portfolios.length} Portfolio
                          {group.portfolios.length !== 1 ? "s" : ""}
                        </span>
                      </div>

                      {/* User's Portfolios Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                        {group.portfolios.map((portfolio) => {
                          const projectCount = (
                            portfolio.projectIdsList || []
                          ).filter((id) =>
                            projects.some((p) => p._id === id),
                          ).length;

                          return (
                            <div
                              key={portfolio._id}
                              onDoubleClick={() => {
                                navigate(
                                  `/${role}/portfolio?id=${portfolio._id}`,
                                );
                              }}
                              className="group flex flex-col items-center justify-center p-3 rounded-2xl hover:bg-slate-50/80 dark:hover:bg-white/[0.03] border border-transparent hover:border-slate-200/60 dark:hover:border-white/5 transition-all duration-200 cursor-pointer relative text-center"
                            >
                              {/* Folder Container */}
                              <div className="relative w-36 h-28 flex items-center justify-center shrink-0">
                                <svg
                                  viewBox="0 0 240 180"
                                  className="w-full h-full drop-shadow-md transition-transform duration-300 group-hover:scale-105"
                                  style={{ fill: portfolio.color || "#ff80bf" }}
                                >
                                  <path d="M 16 0 A 16 16 0 0 0 0 16 L 0 144 A 16 16 0 0 0 16 160 L 224 160 A 16 16 0 0 0 240 144 L 240 48 A 16 16 0 0 0 224 32 L 120 32 L 96 6 A 16 16 0 0 0 80 0 Z" />
                                </svg>

                                {/* Star Icon */}
                                <button
                                  type="button"
                                  onClick={(e) =>
                                    handleToggleFavorite(e, portfolio)
                                  }
                                  className="absolute top-7 left-4 text-white/85 hover:text-white transition-colors cursor-pointer"
                                >
                                  <FiStar
                                    size={15}
                                    className={
                                      portfolio.isFavorite
                                        ? "fill-white text-white"
                                        : ""
                                    }
                                  />
                                </button>

                                {/* Actions Menu Trigger */}
                                <div
                                  className="absolute top-7 right-4"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setMenuOpenId(
                                        menuOpenId === portfolio._id
                                          ? null
                                          : portfolio._id,
                                      )
                                    }
                                    className="text-white/85 hover:text-white transition-colors cursor-pointer flex items-center justify-center p-0.5"
                                  >
                                    <FiMoreHorizontal size={18} />
                                  </button>

                                  {/* Dropdown Menu */}
                                  {menuOpenId === portfolio._id && (
                                    <div className="absolute right-0 mt-1.5 w-28 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-150 dark:border-slate-700 py-1 z-30">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          handleOpenEditModal(portfolio);
                                          setMenuOpenId(null);
                                        }}
                                        className="w-full text-left px-3 py-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 flex items-center gap-2"
                                      >
                                        <FiEdit3
                                          size={12}
                                          className="text-slate-400"
                                        />{" "}
                                        Edit
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          handleDeletePortfolio(
                                            e,
                                            portfolio._id,
                                          );
                                          setMenuOpenId(null);
                                        }}
                                        className="w-full text-left px-3 py-1.5 text-[11px] font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 flex items-center gap-2"
                                      >
                                        <FiTrash2
                                          size={12}
                                          className="text-red-400"
                                        />{" "}
                                        Delete
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Title */}
                              <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider truncate mt-3 w-full px-1">
                                {portfolio.name}
                              </h3>

                              {/* Project count */}
                              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase mt-0.5">
                                {projectCount} Project
                                {projectCount !== 1 ? "s" : ""}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              /* ========================================================
                 REGULAR TEAM MEMBER: FLAT GRID DIRECTORY
                 ======================================================== */
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {/* "+ New portfolio" Card */}
                <button
                  onClick={handleOpenCreateModal}
                  className="group flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 bg-slate-50/40 hover:bg-blue-50/10 dark:bg-slate-900/10 rounded-[2.5rem] h-60 transition-all duration-300 cursor-pointer shadow-sm relative"
                >
                  <div className="w-12 h-12 rounded-xl border border-slate-250 dark:border-slate-750 flex items-center justify-center text-slate-400 group-hover:text-blue-500 group-hover:border-blue-300 dark:group-hover:border-blue-800 transition-all shadow-inner">
                    <FiPlus
                      size={22}
                      className="group-hover:scale-110 transition-transform"
                    />
                  </div>
                  <span className="text-xs font-black text-slate-655 dark:text-slate-300 mt-4 group-hover:text-blue-500 transition-colors uppercase tracking-wider">
                    New portfolio
                  </span>
                </button>

                {filteredPortfolios.map((portfolio) => {
                  return (
                    <div
                      key={portfolio._id}
                      onDoubleClick={() => {
                        navigate(`/${role}/portfolio?id=${portfolio._id}`);
                      }}
                      className="group flex flex-col items-center justify-center p-2 transition-all duration-300 cursor-pointer relative text-center"
                    >
                      {/* Folder Container */}
                      <div className="relative w-36 h-28 flex items-center justify-center shrink-0">
                        <svg
                          viewBox="0 0 240 180"
                          className="w-full h-full drop-shadow-md transition-transform duration-300 group-hover:scale-105"
                          style={{ fill: portfolio.color || "#ff80bf" }}
                        >
                          <path d="M 16 0 A 16 16 0 0 0 0 16 L 0 144 A 16 16 0 0 0 16 160 L 224 160 A 16 16 0 0 0 240 144 L 240 48 A 16 16 0 0 0 224 32 L 120 32 L 96 6 A 16 16 0 0 0 80 0 Z" />
                        </svg>

                        {/* Star Icon */}
                        <button
                          onClick={(e) => handleToggleFavorite(e, portfolio)}
                          className="absolute top-7 left-4 text-white/85 hover:text-white transition-colors cursor-pointer"
                        >
                          <FiStar
                            size={15}
                            className={
                              portfolio.isFavorite ? "fill-white text-white" : ""
                            }
                          />
                        </button>

                        {/* Actions Menu Trigger */}
                        <div
                          className="absolute top-7 right-4"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() =>
                              setMenuOpenId(
                                menuOpenId === portfolio._id
                                  ? null
                                  : portfolio._id,
                              )
                            }
                            className="text-white/85 hover:text-white transition-colors cursor-pointer flex items-center justify-center p-0.5"
                          >
                            <FiMoreHorizontal size={18} />
                          </button>

                          {/* Dropdown Menu */}
                          {menuOpenId === portfolio._id && (
                            <div className="absolute right-0 mt-1.5 w-28 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-150 dark:border-slate-700 py-1 z-30">
                              <button
                                onClick={() => {
                                  handleOpenEditModal(portfolio);
                                  setMenuOpenId(null);
                                }}
                                className="w-full text-left px-3 py-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 flex items-center gap-2"
                              >
                                <FiEdit3 size={12} className="text-slate-400" />{" "}
                                Edit
                              </button>
                              <button
                                onClick={(e) => {
                                  handleDeletePortfolio(e, portfolio._id);
                                  setMenuOpenId(null);
                                }}
                                className="w-full text-left px-3 py-1.5 text-[11px] font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 flex items-center gap-2"
                              >
                                <FiTrash2 size={12} className="text-red-400" />{" "}
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Title */}
                      <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider truncate mt-4 w-full px-2">
                        {portfolio.name}
                      </h3>

                      {/* Project count */}
                      <p className="text-[10px] text-slate-400 dark:text-slate-550 font-bold uppercase mt-1">
                        {
                          (portfolio.projectIdsList || []).filter((id) =>
                            projects.some((p) => p._id === id),
                          ).length
                        }{" "}
                        Project
                        {(portfolio.projectIdsList || []).filter((id) =>
                          projects.some((p) => p._id === id),
                        ).length !== 1
                          ? "s"
                          : ""}
                      </p>

                      {/* Created by info */}
                      <p className="text-[9px] text-slate-500 dark:text-slate-400 font-semibold uppercase mt-0.5">
                        {portfolio.createdBy?.name || "N/A"} (
                        {portfolio.createdBy?.department || "N/A"})
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        ) : (
          /* ========================================================
             VIEW 2: PORTFOLIO DETAIL WORKSPACE (IMAGE 2)
             ======================================================== */
          <motion.div
            key="workspace"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {/* Premium Header Block */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 ">
              <div className="flex items-center gap-3">
                <div>
                  {/* Breadcrumb Back Button */}
                  <button
                    onClick={() => navigate(`/${role}/portfolio`)}
                    className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-250 transition-colors"
                  >
                    <FiChevronLeft size={16} />
                  </button>
                </div>

                <div
                  className="w-11 h-11 rounded-2xl text-white flex items-center justify-center shadow-sm shrink-0"
                  style={{
                    backgroundColor: activePortfolio.color || "#ff80bf",
                  }}
                >
                  <LuFolderOpen size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-wider">
                      {activePortfolio.name}
                    </h1>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase mt-0.5">
                    Created By: {activePortfolio.createdBy?.name || "N/A"} (
                    {activePortfolio.createdBy?.department || "N/A"})
                  </p>
                </div>
              </div>

              {/* Action Buttons Right Side */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => {
                    setNewProjectName("");
                    const targetClientId =
                      activePortfolio?.client?._id ||
                      activePortfolio?.client ||
                      clients[0]?._id ||
                      "";
                    setNewProjectClientId(targetClientId);
                    setShowCreateProjectForm(true);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-50/60 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-755 dark:text-slate-200 hover:bg-slate-105 dark:hover:bg-slate-850 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-sm active:scale-95 cursor-pointer"
                >
                  <LuPlus
                    size={14}
                    className="text-slate-500 dark:text-slate-400"
                  />
                  Create New Project
                </button>
              </div>
            </div>
            <div className="min-h-[350px] space-y-4">
              {/* Grouped Projects Table (Image 2) */}
              {(() => {
                const validProjects = (activePortfolio.projectIdsList || [])
                  .map((projId) => projects.find((p) => p._id === projId))
                  .filter(Boolean);

                if (validProjects.length === 0) {
                  return (
                    <div className="px-6 py-12 text-center text-slate-400 dark:text-slate-505 italic bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-850  shadow-sm">
                      No projects added. Choose "+ Add work" or search below to
                      group projects inside this portfolio.
                    </div>
                  );
                }

                return (
                  <div className="overflow-x-auto bg-white dark:bg-slate-900/30">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50/50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px]">
                          <th className="px-4 py-2 border-r border-b border-slate-200 dark:border-slate-800">
                            Project Name
                          </th>
                          <th className="px-4 py-2 border-r border-b border-slate-200 dark:border-slate-800">
                            Portfolio created by
                          </th>

                          <th className="px-4 py-2 border-r border-b border-slate-200 dark:border-slate-800">
                            Status
                          </th>
                          <th className="px-4 py-2 border-r border-b border-slate-200 dark:border-slate-800">
                            Task progress
                          </th>
                          <th className="px-4 py-2 border-r border-b border-slate-200 dark:border-slate-800">
                            Due date
                          </th>
                          <th className="px-4 py-2 border-b border-slate-200 dark:border-slate-800 text-center w-20">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {validProjects.map((project, index) => {
                          const projId = project._id;

                          // Calculate progress percentage
                          const projectTasks = tasks.filter(
                            (t) =>
                              t.project?._id === projId || t.project === projId,
                          );
                          const totalTasks = projectTasks.length;
                          const completedTasks = projectTasks.filter(
                            (t) => t.status === "Completed",
                          ).length;
                          const progressPercent =
                            totalTasks > 0
                              ? Math.round((completedTasks / totalTasks) * 100)
                              : 0;

                          // Calculate due date range
                          const dueDates = projectTasks
                            .map((t) => t.dueDate)
                            .filter(Boolean)
                            .map((d) => new Date(d).getTime());
                          const minDueDate =
                            dueDates.length > 0
                              ? new Date(Math.min(...dueDates))
                              : null;
                          const maxDueDate =
                            dueDates.length > 0
                              ? new Date(Math.max(...dueDates))
                              : null;

                          let formattedDueDateRange = "";
                          if (minDueDate && maxDueDate) {
                            const opt = { month: "short", day: "numeric" };
                            const startStr = minDueDate.toLocaleDateString(
                              "en-US",
                              opt,
                            );
                            const endStr = maxDueDate.toLocaleDateString(
                              "en-US",
                              opt,
                            );
                            formattedDueDateRange =
                              startStr === endStr
                                ? startStr
                                : `${startStr} – ${endStr}`;
                          }

                          const projectIcon = getProjectIcon(
                            project.name,
                            project._id,
                          );
                          const IconComponent = projectIcon.icon;

                          return (
                            <tr
                              key={projId}
                              className={`group transition-colors ${
                                index % 2 === 0
                                  ? "bg-white dark:bg-slate-800/40"
                                  : "bg-slate-50/40 dark:bg-slate-900/10"
                              } hover:bg-blue-50/20 dark:hover:bg-[#3b82f6]/5`}
                            >
                              {/* Name */}
                              <td
                                className="px-4 py-2 border-r border-b border-slate-200 dark:border-slate-800 cursor-pointer"
                                onClick={() =>
                                  navigate(
                                    `/${user?.role || "admin"}/projects?id=${project._id}`,
                                  )
                                }
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2.5">
                                    <ProjectIcon
                                      client={(() => {
                                        const clientId = project.client?._id || project.client;
                                        return clients.find((c) => c._id === clientId) || null;
                                      })()}
                                      name={project.name}
                                      size="md"
                                    />
                                    <span className="font-semibold text-slate-800 dark:text-slate-600 hover:text-blue-600 dark:hover:text-[#3b82f6] transition-colors">
                                      {project.name}
                                    </span>
                                  </div>
                                  <FiChevronRight
                                    size={12}
                                    className="text-slate-400 dark:text-slate-500 opacity-0 group-hover:opacity-100 transition-all duration-200"
                                  />
                                </div>
                              </td>

                              {/* User Name */}
                              <td className="px-4 py-2 border-r border-b border-slate-200 dark:border-slate-800">
                                <span className="font-semibold text-slate-705 dark:text-slate-400">
                                  {project.createdBy?.name || "N/A"}
                                </span>
                              </td>

                              {/* Status */}
                              <td className="px-4 py-2 border-r border-b border-slate-200 dark:border-slate-800">
                                {getStatusPill(project, timeTick)}
                              </td>

                              {/* Task Progress */}
                              <td className="px-4 py-2 border-r border-b border-slate-200 dark:border-slate-800">
                                <div className="flex items-center gap-2 max-w-[120px]">
                                  <div className="w-16 bg-slate-100 dark:bg-slate-700 h-1.5 rounded overflow-hidden shrink-0">
                                    <div
                                      className="bg-blue-600 dark:bg-[#3b82f6] h-full rounded transition-all duration-350"
                                      style={{ width: `${progressPercent}%` }}
                                    />
                                  </div>
                                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                                    {progressPercent}%
                                  </span>
                                </div>
                              </td>

                              {/* Due Date */}
                              <td className="px-4 py-2 border-r border-b border-slate-200 dark:border-slate-800 font-semibold text-slate-655 dark:text-slate-400">
                                {formattedDueDateRange}
                              </td>

                              {/* Actions */}
                              <td className="px-4 py-2 border-b border-slate-200 dark:border-slate-800 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingProject(project);
                                      setNewProjectName(project.name);
                                      setNewProjectStatus(project.status || "Active");
                                      const targetClientId = project.client?._id || project.client || "";
                                      setNewProjectClientId(targetClientId);
                                      setShowCreateProjectForm(true);
                                    }}
                                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-blue-500 rounded transition-colors"
                                    title="Edit project"
                                  >
                                    <FiEdit3 size={12} />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemoveProject(projId);
                                    }}
                                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-red-500 rounded transition-colors"
                                    title="Remove from group"
                                  >
                                    <FiTrash2 size={12} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CREATE/EDIT PORTFOLIO MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-200 dark:border-slate-800 shadow-2xl z-10"
            >
              <h2 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-wider mb-6">
                {isEditMode ? "Edit Portfolio Group" : "Create New Portfolio"}
              </h2>

              <form onSubmit={handleSavePortfolio} className="space-y-6">
                {/* Client Select Field */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                    Client Name
                  </label>
                  <div className="relative">
                    <select
                      required
                      value={selectedClientId}
                      onChange={(e) => setSelectedClientId(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 pr-10 text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-500 transition-all appearance-none cursor-pointer"
                    >
                      <option value="" disabled>
                        Select Client...
                      </option>
                      {clients.map((c) => (
                        <option
                          key={c._id}
                          value={c._id}
                          className="dark:bg-slate-900"
                        >
                          {c.companyName}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      <FiChevronRight size={14} className="rotate-90" />
                    </div>
                  </div>
                </div>

                {/* Color Selection Field */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                    Choose Folder Color
                  </label>

                  {/* Swatches Grid */}
                  <div className="grid grid-cols-3  gap-4">
                    {[
                      { name: "Periwinkle Blue", value: "#5281CE" },
                      { name: "Teacup Lilac", value: "#998CEB" },
                      { name: "Dijon Yellow", value: "#E9D787" },
                      { name: "Raspberry Cream Red", value: "#ff9a9e" },
                      { name: "Iciice Teal", value: "#9EF5FF" },
                      { name: "Pistachie Green", value: "#BAE8AC" },
                    ].map((col) => (
                      <button
                        key={col.value}
                        type="button"
                        onClick={() => setPortfolioColor(col.value)}
                        className="w-30 h-20 mt-5 border border-slate-200 dark:border-slate-800 transition-all flex items-center justify-center shadow-inner relative hover:scale-110 active:scale-95"
                        style={{ backgroundColor: col.value }}
                        title={col.name}
                      >
                        {portfolioColor === col.value && (
                          <FiCheck
                            size={14}
                            className="text-white drop-shadow-sm font-black"
                          />
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Custom Color Input */}
                  <div className="flex items-center gap-3 pt-2">
                    <div className="relative w-8 h-8 rounded-full border border-slate-200 dark:border-slate-800 overflow-hidden shadow-inner shrink-0">
                      <input
                        type="color"
                        value={portfolioColor}
                        onChange={(e) => setPortfolioColor(e.target.value)}
                        className="absolute inset-0 w-full h-full scale-150 cursor-pointer border-0 bg-transparent"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-wider">
                        Custom color picker
                      </span>
                      <p className="text-[9px] font-mono text-slate-400 dark:text-slate-500 uppercase">
                        {portfolioColor}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Form Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-455 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-95"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-wider text-white dark:text-black transition-all shadow-md bg-gradient-to-b from-[#92d1ef] via-[#69afe2] to-[#408ed8] dark:bg-[#3b82f6] dark:bg-none hover:opacity-95 active:scale-95"
                  >
                    {isEditMode ? "Save Changes" : "Create Portfolio"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CREATE NEW PROJECT OFFCANVAS DRAWER */}
      <AnimatePresence>
        {showCreateProjectForm && activePortfolio && (
          <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateProjectForm(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Side Sheet Drawer */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", ease: "easeOut", duration: 0.3 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col z-10 border-l border-slate-100 dark:border-slate-800"
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-[#3b82f6]/10 border border-blue-100 dark:border-[#3b82f6]/20 flex items-center justify-center text-blue-600 dark:text-[#3b82f6]">
                    <LuBriefcase size={20} />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-slate-800 dark:text-white">
                      {editingProject ? "Edit Project" : "Add New Project"}
                    </h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                      {editingProject ? "Update Project Details" : "Project Details"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCreateProjectForm(false)}
                  className="w-8 h-8 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 flex items-center justify-center text-slate-400 hover:text-slate-650 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <FiX size={18} />
                </button>
              </div>

              {/* Form Content */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleCreateAndAddProject();
                }}
                className="flex-1 flex flex-col overflow-hidden"
              >
                <div className="flex-1 p-6 space-y-6 overflow-y-auto">
                  {/* Name Field */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-650 dark:text-slate-400 uppercase tracking-wide">
                      Project Name
                    </label>
                    <input
                      type="text"
                      required
                      autoFocus
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      placeholder="Enter project name..."
                      className="w-full bg-slate-50/60 dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-500 transition-all placeholder:text-slate-450 focus:shadow-sm"
                    />
                  </div>

                  {/* Client Select Field */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-650 dark:text-slate-400 uppercase tracking-wide block">
                      Client Name
                    </label>
                    <div className="relative">
                      <select
                        value={newProjectClientId}
                        onChange={(e) => setNewProjectClientId(e.target.value)}
                        className="w-full bg-slate-50/60 dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 pr-10 text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-500 transition-all appearance-none cursor-pointer focus:shadow-sm"
                      >
                        {(() => {
                          const targetClientId =
                            activePortfolio?.client?._id ||
                            activePortfolio?.client;
                          const mappedClient = clients.find(
                            (c) => c._id === targetClientId,
                          );
                          if (mappedClient) {
                            return (
                              <option
                                value={mappedClient._id}
                                className="dark:bg-slate-900"
                              >
                                {mappedClient.companyName}
                              </option>
                            );
                          }
                          return clients.map((c) => (
                            <option
                              key={c._id}
                              value={c._id}
                              className="dark:bg-slate-900"
                            >
                              {c.companyName}
                            </option>
                          ));
                        })()}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <FiChevronRight size={14} className="rotate-90" />
                      </div>
                    </div>
                  </div>

                  {/* Status Select Field */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-650 dark:text-slate-400 uppercase tracking-wide block">
                      Status
                    </label>
                    <div className="relative">
                      <select
                        value={newProjectStatus}
                        onChange={(e) => setNewProjectStatus(e.target.value)}
                        className="w-full bg-slate-50/60 dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 pr-10 text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-500 transition-all appearance-none cursor-pointer focus:shadow-sm"
                      >
                        <option value="Active" className="dark:bg-slate-900">
                          Active
                        </option>
                        <option value="On Hold" className="dark:bg-slate-900">
                          On Hold
                        </option>
                        <option value="Completed" className="dark:bg-slate-900">
                          Completed
                        </option>
                        <option value="Inactive" className="dark:bg-slate-900">
                          Inactive
                        </option>
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <FiChevronRight size={14} className="rotate-90" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sticky Footer */}
                <div className="p-6 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/30 dark:bg-slate-900/50 flex justify-end gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowCreateProjectForm(false)}
                    className="px-5 py-3 rounded-2xl border border-slate-200 dark:border-white/10 text-slate-605 dark:text-slate-300 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-white/5 active:scale-95 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={
                      creatingProject ||
                      !newProjectName.trim() ||
                      !newProjectClientId
                    }
                    className={`px-5 py-3 rounded-2xl text-sm font-bold shadow-md transition-all active:scale-95 bg-blue-600 dark:bg-[#3b82f6] hover:bg-blue-500 dark:hover:bg-[#ccff00] text-white dark:text-black shadow-blue-500/10 dark:shadow-[#3b82f6]/20 ${
                      creatingProject ||
                      !newProjectName.trim() ||
                      !newProjectClientId
                        ? "opacity-50 cursor-not-allowed shadow-none"
                        : "cursor-pointer"
                    }`}
                  >
                    {creatingProject
                      ? editingProject
                        ? "Saving..."
                        : "Creating..."
                      : editingProject
                        ? "Save Changes"
                        : "Create Project"}
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

export default Portfolio;
