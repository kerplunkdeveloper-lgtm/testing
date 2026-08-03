import React, { useState, useEffect, useRef } from "react";
import { useTheme } from "../../context/ThemeContext";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  FiX,
  FiLogOut,
  FiFolder,
  FiList,
  FiLayers,
  FiShare2,
} from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { sidebarConfig } from "../../config/sidebarConfig";
import {
  logoutUser,
  impersonateUser,
  exitImpersonation,
} from "../../features/auth/authSlice";
import { getProjects } from "../../features/projects/projectSlice";
import { getUsers } from "../../features/users/userSlice";
import { getPortfolios } from "../../features/portfolio/portfolioSlice";
import { getClients } from "../../features/clients/clientslice";
import { apiSlice } from "../../features/api/apiSlice";
import { markAllChatAsRead } from "../../features/notifications/notificationSlice";
import { clearAllUnreadCounts } from "../../features/chat/chatSlice";
import ProjectIcon from "../common/ProjectIcon";

const projectColors = [
  "bg-fuchsia-300 text-fuchsia-900 dark:bg-fuchsia-400 dark:text-fuchsia-950",
  "bg-emerald-300 text-emerald-900 dark:bg-emerald-400 dark:text-emerald-950",
  "bg-lime-300 text-lime-900 dark:bg-lime-400 dark:text-lime-950",
  "bg-indigo-300 text-indigo-900 dark:bg-indigo-400 dark:text-indigo-950",
  "bg-rose-300 text-rose-900 dark:bg-rose-400 dark:text-rose-950",
  "bg-cyan-300 text-cyan-900 dark:bg-cyan-400 dark:text-cyan-950",
];

const getInitials = (name) => {
  if (!name) return "";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const displayRole = (role) => {
  if (role === "operationmanager") return "Operation Manager";
  if (role === "admin") return "Admin";
  return "Team";
};

const dropdownVariants = {
  hidden: {
    opacity: 0,
    y: 10,
    scale: 0.95,
    transition: {
      duration: 0.15,
      ease: "easeInOut",
    },
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 22,
      staggerChildren: 0.04,
      delayChildren: 0.05,
    },
  },
  exit: {
    opacity: 0,
    y: 8,
    scale: 0.95,
    transition: {
      duration: 0.12,
      ease: "easeInOut",
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 22,
    },
  },
};

const Sidebar = ({ role, sidebarOpen, setSidebarOpen }) => {
  const location = useLocation();
  const activeProjectId = location.pathname.includes("/projects")
    ? new URLSearchParams(location.search).get("id")
    : null;
  const activePortfolioId = location.pathname.includes("/portfolio")
    ? new URLSearchParams(location.search).get("id")
    : null;
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { theme } = useTheme();

  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  const { notifications } = useSelector((state) => state.notifications);
  const unreadCount = notifications
    ? notifications.filter((n) => !n.isRead).length
    : 0;

  const { projects } = useSelector((state) => state.projects);
  const { portfolios = [] } = useSelector((state) => state.portfolios || {});
  const { users } = useSelector((state) => state.users);
  const { clients = [] } = useSelector((state) => state.clients || {});
  const { user: currentUser, originalAdminUser } = useSelector(
    (state) => state.auth,
  );
  const { profile } = useSelector((state) => state.profile);
  const { unreadCounts = {} } = useSelector((state) => state.chat);
  const localUnreadChatCount = Object.values(unreadCounts).reduce(
    (sum, val) => sum + (val || 0),
    0,
  );
  const dbUnreadChatCount = notifications
    ? notifications.filter((n) => !n.isRead && n.type === "message_received").length
    : 0;
  
  // Use the database notifications count as the source of truth if it exists, otherwise fallback to local session state
  const totalUnreadChatCount = Math.max(localUnreadChatCount, dbUnreadChatCount);

  const menuItems = (sidebarConfig[role] || []).filter((item) => {
    // Hide Projects Overview for Social Media Manager department
    if (
      item.name === "Projects Overview" &&
      (currentUser?.department === "Social Media Manager" ||
        currentUser?.department === "Social Media Executive")
    ) {
      return false;
    }

    // Hide Chat when admin is impersonating another user
    if (item.name === "Chat" && originalAdminUser) {
      return false;
    }

    if (role === "admin") return true;
    if (item.permissionKey === "manage_clients") return true;
    if (!item.permissionKey) return true;
    const perm = currentUser?.permissions?.[item.permissionKey];
    if (perm === true) return true; // legacy
    return perm?.read;
  });

  const [isPortfoliosListOpen, setIsPortfoliosListOpen] = useState(() => {
    try {
      const saved = localStorage.getItem("sidebar_portfolios_open");
      return saved !== null ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  const [isSmePortfoliosListOpen, setIsSmePortfoliosListOpen] = useState(() => {
    try {
      const saved = localStorage.getItem("sidebar_sme_portfolios_open");
      return saved !== null ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [expandedPortfolios, setExpandedPortfolios] = useState(() => {
    try {
      const saved = localStorage.getItem("sidebar_expanded_portfolios");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const userDropdownRef = useRef(null);

  useEffect(() => {
    try {
      localStorage.setItem(
        "sidebar_portfolios_open",
        JSON.stringify(isPortfoliosListOpen),
      );
    } catch (e) {
      console.error(e);
    }
  }, [isPortfoliosListOpen]);

  useEffect(() => {
    try {
      localStorage.setItem(
        "sidebar_sme_portfolios_open",
        JSON.stringify(isSmePortfoliosListOpen),
      );
    } catch (e) {
      console.error(e);
    }
  }, [isSmePortfoliosListOpen]);

  useEffect(() => {
    try {
      localStorage.setItem(
        "sidebar_expanded_portfolios",
        JSON.stringify(expandedPortfolios),
      );
    } catch (e) {
      console.error(e);
    }
  }, [expandedPortfolios]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        userDropdownRef.current &&
        !userDropdownRef.current.contains(event.target)
      ) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!showUserDropdown) {
      const timer = setTimeout(() => setUserSearchQuery(""), 200);
      return () => clearTimeout(timer);
    }
  }, [showUserDropdown]);

  useEffect(() => {
    if (activePortfolioId) {
      const parentPortfolio = (portfolios || []).find(
        (p) => p._id === activePortfolioId,
      );
      const userName = parentPortfolio?.createdBy?.name;
      const folderId = userName ? `user-folder-${userName}` : null;

      setExpandedPortfolios((prev) => ({
        ...prev,
        [activePortfolioId]: true,
        ...(folderId ? { [folderId]: true } : {}),
      }));
    } else if (
      activeProjectId &&
      (projects || []).length > 0 &&
      (portfolios || []).length > 0
    ) {
      const parentPortfolio = portfolios.find((p) => {
        const ids = (p.projectIds || []).map((pId) =>
          typeof pId === "object" && pId !== null ? pId._id : pId,
        );
        return ids.includes(activeProjectId);
      });
      if (parentPortfolio) {
        const userName = parentPortfolio.createdBy?.name;
        const folderId = userName ? `user-folder-${userName}` : null;

        setExpandedPortfolios((prev) => ({
          ...prev,
          [parentPortfolio._id]: true,
          ...(folderId ? { [folderId]: true } : {}),
        }));
      }
    }
  }, [activePortfolioId, activeProjectId, projects, portfolios]);

  useEffect(() => {
    dispatch(getProjects());
    dispatch(getPortfolios());
    dispatch(getClients());
    if (role === "admin") {
      dispatch(getUsers());
    }
  }, [dispatch, role]);

  const handleSwitchUser = async (userId) => {
    try {
      const result = await dispatch(impersonateUser(userId)).unwrap();
      dispatch(apiSlice.util.resetApiState());
      toast.success("Successfully logged in as user");
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      }
      const targetRole = result.data.user.role;
      if (targetRole === "admin") {
        navigate("/admin");
      } else if (targetRole === "operationmanager") {
        navigate("/operationmanager");
      } else if (targetRole === "team") {
        navigate("/team");
      }
    } catch (err) {
      toast.error(err || "Failed to switch user");
    }
  };

  const handleSwitchBack = () => {
    dispatch(exitImpersonation());
    dispatch(apiSlice.util.resetApiState());
    toast.success("Switched back to Admin");
    if (window.innerWidth < 1024) setSidebarOpen(false);
    navigate("/admin");
  };

  const handleLogout = async () => {
    await dispatch(logoutUser());
    toast.success("Logout Success");
    navigate("/");
  };

  return (
    <>
      {/* MOBILE OVERLAY */}
      <div
        onClick={() => setSidebarOpen(false)}
        className={`
          fixed inset-0 z-[90]
          bg-black/40 backdrop-blur-sm
          transition-all duration-300
          lg:hidden
          ${sidebarOpen ? "opacity-100 visible" : "opacity-0 invisible"}
        `}
      />

      <aside
        className={`
          fixed top-0 left-0 z-[100] h-[100dvh]
          w-64 max-w-[80vw] lg:w-52
          sidebar-bg
          backdrop-blur-xl
        
          shadow-[0_8px_32px_0_rgba(0,0,0,0.02)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.25)]
          flex flex-col
          transition-transform duration-300 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between px-4 py-4 ">
          {/* LOGO */}
          <div
            onClick={() => navigate(`/${role}`)}
            className="logo-container group mb-2"
            title="Kerplunk Media"
          >
            <div className="logo-border-wrapper">
              <div className="logo-spinning-border" />
            </div>
            <div className="logo-inner">
              <span className="logo-text-kerplunk">
                {"KERPLUNK".split("").map((char, index) => (
                  <span key={index} className="logo-char">
                    {char}
                  </span>
                ))}
              </span>
            </div>
            <span className="logo-text-media">MEDIA</span>
          </div>

          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden w-8 h-8 rounded-lg bg-white dark:bg-[#0b0c10] hover:bg-slate-50  flex items-center justify-center transition-all border border-slate-200 dark:border-white/5"
          >
            <FiX size={18} className="text-slate-900 dark:text-white" />
          </button>
        </div>

        {/* MENU */}
        <nav className="flex-1 overflow-y-auto px-2 py-1.5 space-y-px sidebar-scrollbar">
          {(() => {
            let hasRenderedPortfoliosList = false;

            const renderPortfolioDropdown = (
              title,
              icon,
              isOpen,
              setIsOpen,
              list,
              groupByUser = false,
            ) => {
              if (title === "My Projects" || title === "My Project") {
                if (!projects || projects.length === 0) return null;
              } else {
                if (!list || list.length === 0) return null;
              }

              const renderPortfolioItems = (portfoliosToRender) => {
                return portfoliosToRender.map((portfolio) => {
                  const isActive = activePortfolioId === portfolio._id;
                  const portfolioProjects = (projects || []).filter((proj) => {
                    const ids = (portfolio.projectIds || []).map((pId) =>
                      typeof pId === "object" && pId !== null ? pId._id : pId,
                    );
                    return ids.includes(proj._id);
                  });

                  return (
                    <div key={portfolio._id} className="w-full text-left">
                      {/* Portfolio Row */}
                      <div className="flex items-center justify-between group rounded-lg transition-all duration-150 relative w-full text-left">
                        <button
                          type="button"
                          onClick={() => {
                            if (window.innerWidth < 1024) setSidebarOpen(false);
                            navigate(`/${role}/portfolio?id=${portfolio._id}`);
                            setExpandedPortfolios((prev) => ({
                              ...prev,
                              [portfolio._id]: isActive
                                ? !prev[portfolio._id]
                                : true,
                            }));
                          }}
                          className={`flex-1 flex items-center gap-2 text-left text-xs lg:text-[0.6875rem] py-1.5 px-2 transition-all duration-150 rounded-lg border ${
                            isActive
                              ? "bg-slate-900/10 dark:bg-white/10 text-slate-900 dark:text-white font-black shadow-sm border-slate-900/5 dark:border-white/5"
                              : "text-slate-700 dark:text-slate-300 font-semibold border-transparent hover:text-slate-900 dark:hover:text-white hover:bg-slate-900/5 dark:hover:bg-white/5"
                          }`}
                          title={portfolio.name}
                        >
                          <div className="w-4 h-4 shrink-0 flex items-center justify-center">
                            <svg
                              viewBox="0 0 240 180"
                              className="w-3.5 h-3 shrink-0"
                              style={{ fill: portfolio.color || "#ff80bf" }}
                            >
                              <path d="M 16 0 A 16 16 0 0 0 0 16 L 0 144 A 16 16 0 0 0 16 160 L 224 160 A 16 16 0 0 0 240 144 L 240 48 A 16 16 0 0 0 224 32 L 120 32 L 96 6 A 16 16 0 0 0 80 0 Z" />
                            </svg>
                          </div>
                          <span className="truncate flex-1 text-left">
                            {portfolio.name}
                          </span>
                          {isActive && !portfolioProjects.length && (
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-900 dark:bg-white shrink-0" />
                          )}
                        </button>

                        {portfolioProjects.length > 0 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedPortfolios((prev) => ({
                                ...prev,
                                [portfolio._id]: !prev[portfolio._id],
                              }));
                            }}
                            className={`py-1.5 px-1.5 rounded-r-lg transition-all duration-150 flex items-center justify-center cursor-pointer ${
                              isActive
                                ? "bg-slate-900/10 dark:bg-white/10 text-slate-900 dark:text-white"
                                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-900/5 dark:hover:bg-white/5"
                            }`}
                          >
                            <svg
                              className={`w-3 h-3 shrink-0 transform transition-transform duration-200 ${
                                expandedPortfolios[portfolio._id]
                                  ? "rotate-180"
                                  : ""
                              }`}
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2.5}
                                d="M19 9l-7 7-7-7"
                              />
                            </svg>
                          </button>
                        )}
                      </div>

                      {/* Projects inside this Portfolio */}
                      {portfolioProjects.length > 0 &&
                        expandedPortfolios[portfolio._id] && (
                          <div className="ml-2.5 pl-2 border-l border-slate-200/60 dark:border-white/10 space-y-0.5 my-0.5 text-left">
                            {portfolioProjects.map((project) => {
                              const isProjectActive =
                                activeProjectId === project._id;
                              const _clientId1 =
                                project.client?._id || project.client;
                              const _clientObj1 =
                                clients.find((c) => c._id === _clientId1) ||
                                null;
                              return (
                                <button
                                  key={project._id}
                                  type="button"
                                  onClick={() => {
                                    if (window.innerWidth < 1024)
                                      setSidebarOpen(false);
                                    navigate(
                                      `/${role}/projects?id=${project._id}`,
                                    );
                                  }}
                                  className={`w-full flex items-center gap-2 text-left text-[11px] lg:text-[0.625rem] font-semibold py-1 px-1.5 rounded-md transition-all duration-150 cursor-pointer ${
                                    isProjectActive
                                      ? "bg-slate-100 dark:bg-slate-800/80 theme-text-accent font-bold"
                                      : "text-slate-500 dark:text-white/80 hover:theme-text-accent hover:bg-slate-100/50 dark:hover:bg-white/5"
                                  }`}
                                  title={project.name}
                                >
                                  <div className="w-6 h-6 shrink-0 flex items-center justify-center">
                                    <ProjectIcon
                                      client={_clientObj1}
                                      name={project.name}
                                      size="sm"
                                    />
                                  </div>
                                  <div className="flex-1 min-w-0 flex flex-col items-start gap-0.5 text-left">
                                    <span className="truncate text-left block w-full">
                                      {project.name}
                                    </span>
                                    {_clientObj1 && (
                                      <span
                                        className="text-[8px] font-bold truncate block w-fit max-w-full rounded px-1.5 py-0.5 leading-tight text-left self-start"
                                        style={{
                                          color: _clientObj1.color || "#6366f1",
                                          backgroundColor: `${_clientObj1.color || "#6366f1"}18`,
                                        }}
                                      >
                                        {_clientObj1.companyName}
                                      </span>
                                    )}
                                  </div>
                                  {isProjectActive && (
                                    <span className="w-1.5 h-1.5 rounded-full theme-bg-accent shrink-0" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                    </div>
                  );
                });
              };

              let content;
              if (groupByUser) {
                const groupedUsers = {};
                list.forEach((p) => {
                  const userName = p.createdBy?.name || "Unknown User";
                  if (!groupedUsers[userName])
                    groupedUsers[userName] = new Set();
                  (p.projectIds || []).forEach((pId) => {
                    const id =
                      typeof pId === "object" && pId !== null ? pId._id : pId;
                    if (id) groupedUsers[userName].add(id);
                  });
                });

                content = Object.entries(groupedUsers).map(
                  ([userName, projIdSet]) => {
                    const folderId = `user-folder-${userName}`;
                    const userProjects = (projects || []).filter((proj) =>
                      projIdSet.has(proj._id),
                    );

                    return (
                      <div key={folderId} className="mb-0.5 text-left">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedPortfolios((prev) => ({
                              ...prev,
                              [folderId]: !prev[folderId],
                            }));
                          }}
                          className="w-full flex items-center gap-2 text-left text-xs lg:text-[0.6875rem] font-bold py-1.5 px-2 rounded-lg hover:bg-slate-100/60 dark:hover:bg-white/5 text-slate-600 dark:text-white/90 group transition-all"
                        >
                          <div className="w-4 h-4 shrink-0 flex items-center justify-center">
                            <svg
                              className="w-3.5 h-3.5 text-amber-500 group-hover:text-amber-600"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M2 6a2 2 0 012-2h4l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                            </svg>
                          </div>
                          <span className="truncate flex-1 text-left group-hover:theme-text-accent">
                            {userName}
                          </span>
                          <svg
                            className={`w-3 h-3 shrink-0 transform transition-transform duration-200 ${
                              expandedPortfolios[folderId] ? "rotate-180" : ""
                            }`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2.5}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </button>
                        {expandedPortfolios[folderId] && (
                          <div className="ml-2.5 pl-2 border-l border-slate-200/60 dark:border-white/10 mt-0.5 space-y-0.5 text-left">
                            {userProjects.length > 0 ? (
                              userProjects.map((project) => {
                                const isProjectActive =
                                  activeProjectId === project._id;
                                const _clientId2 =
                                  project.client?._id || project.client;
                                const _clientObj2 =
                                  clients.find((c) => c._id === _clientId2) ||
                                  null;
                                return (
                                  <button
                                    key={project._id}
                                    type="button"
                                    onClick={() => {
                                      if (window.innerWidth < 1024)
                                        setSidebarOpen(false);
                                      navigate(
                                        `/${role}/projects?id=${project._id}`,
                                      );
                                    }}
                                    className={`w-full flex items-center gap-2 text-left text-[11px] lg:text-[0.625rem] font-semibold py-1.5 px-2 rounded-lg transition-all duration-150 cursor-pointer ${
                                      isProjectActive
                                        ? "bg-slate-100 dark:bg-slate-800/80 theme-text-accent font-bold"
                                        : "text-slate-600 dark:text-white hover:theme-text-accent hover:bg-slate-100/50 dark:hover:bg-white/5"
                                    }`}
                                    title={project.name}
                                  >
                                    <div className="w-6 h-6 shrink-0 flex items-center justify-center">
                                      <ProjectIcon
                                        client={_clientObj2}
                                        name={project.name}
                                        size="sm"
                                      />
                                    </div>
                                    <div className="flex-1 min-w-0 flex flex-col items-start gap-0.5 text-left">
                                      <span className="truncate text-left block w-full">
                                        {project.name}
                                      </span>
                                      {_clientObj2 && (
                                        <span
                                          className="text-[8px] font-bold truncate block w-fit max-w-full rounded px-1.5 py-0.5 leading-tight text-left self-start"
                                          style={{
                                            color:
                                              _clientObj2.color || "#6366f1",
                                            backgroundColor: `${_clientObj2.color || "#6366f1"}18`,
                                          }}
                                        >
                                          {_clientObj2.companyName}
                                        </span>
                                      )}
                                    </div>
                                    {isProjectActive && (
                                      <span className="w-1.5 h-1.5 rounded-full theme-bg-accent shrink-0" />
                                    )}
                                  </button>
                                );
                              })
                            ) : (
                              <div className="text-[10px] text-slate-400 px-2 py-1 italic">
                                No projects found
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  },
                );
              } else {
                // If title is Works or My Projects, list projects directly without middle portfolio folders
                if (
                  title === "Works" ||
                  title === "My Projects" ||
                  title === "My Project" ||
                  title === "Portfolios"
                ) {
                  let matchedProjects = [];
                  if (title === "My Projects" || title === "My Project") {
                    matchedProjects = projects || [];
                  } else {
                    const allProjectIds = new Set();
                    list.forEach((port) => {
                      (port.projectIds || []).forEach((pId) => {
                        const id =
                          typeof pId === "object" && pId !== null ? pId._id : pId;
                        if (id) allProjectIds.add(id);
                      });
                    });

                    matchedProjects = (projects || []).filter((proj) =>
                      allProjectIds.has(proj._id),
                    );
                  }

                  content =
                    matchedProjects.length > 0 ? (
                      <div className="space-y-0.5 my-0.5 text-left">
                        {matchedProjects.map((project) => {
                          const isProjectActive =
                            activeProjectId === project._id;
                          const _clientId3 =
                            project.client?._id || project.client;
                          const _clientObj3 =
                            clients.find((c) => c._id === _clientId3) || null;
                          return (
                            <button
                              key={project._id}
                              type="button"
                              onClick={() => {
                                if (window.innerWidth < 1024)
                                  setSidebarOpen(false);
                                navigate(`/${role}/projects?id=${project._id}`);
                              }}
                              className={`w-full flex items-center gap-2 text-left text-[11px] lg:text-[0.625rem] font-semibold py-1.5 px-2 rounded-lg transition-all duration-150 cursor-pointer ${
                                isProjectActive
                                  ? "bg-slate-100 dark:bg-slate-800/80 theme-text-accent font-bold"
                                  : "text-slate-600 dark:text-white hover:theme-text-accent hover:bg-slate-100/50 dark:hover:bg-white/5"
                              }`}
                              title={project.name}
                            >
                              <div className="w-6 h-6 shrink-0 flex items-center justify-center">
                                <ProjectIcon
                                  client={_clientObj3}
                                  name={project.name}
                                  size="sm"
                                />
                              </div>
                              <div className="flex-1 min-w-0 flex flex-col items-start gap-0.5 text-left">
                                <span className="truncate text-left block w-full">
                                  {project.name}
                                </span>
                                {_clientObj3 && (
                                  <span
                                    className="text-[8px] font-bold truncate block w-fit max-w-full rounded px-1.5 py-0.5 leading-tight text-left self-start"
                                    style={{
                                      color: _clientObj3.color || "#6366f1",
                                      backgroundColor: `${_clientObj3.color || "#6366f1"}18`,
                                    }}
                                  >
                                    {_clientObj3.companyName}
                                  </span>
                                )}
                              </div>
                              {isProjectActive && (
                                <span className="w-1.5 h-1.5 rounded-full theme-bg-accent shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-400 px-2 py-1 italic">
                        No projects found
                      </div>
                    );
                } else {
                  content = renderPortfolioItems(list);
                }
              }

              return (
                <div className="my-0.5 text-left">
                  {/* Dropdown Header Toggle */}
                  <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 lg:py-1.5 text-left rounded-xl border border-transparent hover:bg-slate-100/60 dark:hover:bg-white/5 transition-all duration-200 cursor-pointer group text-slate-500 dark:text-white hover:theme-text-accent"
                  >
                    <div className="shrink-0 w-6 h-6 rounded-lg flex items-center justify-center bg-slate-100/70 dark:bg-white/5 group-hover:bg-[var(--accent-light-bg-subtle)] dark:group-hover:bg-[var(--accent-dark-bg-subtle)] transition-colors">
                      {icon}
                    </div>
                    <span className="text-xs lg:text-[0.625rem] font-bold uppercase tracking-wider whitespace-nowrap truncate flex-1 text-left transition-colors">
                      {title}
                    </span>
                    <svg
                      className={`w-3 h-3 shrink-0 transform transition-transform duration-200 transition-colors ${
                        isOpen ? "rotate-180" : ""
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  {/* Portfolio List */}
                  {isOpen && (
                    <div className="ml-3 pl-2 border-l border-slate-200/60 dark:border-white/10 space-y-0.5 overflow-y-auto max-h-[18.75rem] sidebar-scrollbar mt-0.5 text-left">
                      {content}
                    </div>
                  )}
                </div>
              );
            };

            const renderPortfoliosList = () => {
              const canSeeMyProject =
                currentUser?.role?.toLowerCase() === "managingpartner" ||
                currentUser?.role?.toLowerCase() === "operationmanager" ||
                currentUser?.department?.toLowerCase() === "social media manager";

              return (
                <>
                  {canSeeMyProject && renderPortfolioDropdown(
                    "My Project",
                    <FiLayers
                      size={14}
                      className="shrink-0 transition-colors"
                    />,
                    isPortfoliosListOpen,
                    setIsPortfoliosListOpen,
                    [], // list not used for My Project
                    false, // Disable user name folder dropdown under My Project
                  )}
                </>
              );
            };

            const renderMenuItem = (item) => {
              const Icon = item.icon;
              const isPortfoliosItem = item.name === "Portfolio";

              return (
                <React.Fragment key={item.path}>
                  <NavLink
                    to={item.path}
                    onClick={() => {
                      if (window.innerWidth < 1024) setSidebarOpen(false);
                      if (item.name === "Chat") {
                        dispatch(clearAllUnreadCounts());
                        dispatch(markAllChatAsRead());
                      }
                    }}
                    end={
                      item.path === "/admin" ||
                      item.path === "/operationmanager" ||
                      item.path === "/team"
                    }
                    className={({ isActive }) => {
                      return `block rounded-xl transition-all duration-200 relative group ${isActive ? "" : ""}`;
                    }}
                  >
                    {({ isActive }) => (
                      <motion.div
                        className={`flex items-center gap-2.5 px-3 py-2 lg:py-1.5 w-full rounded-xl relative overflow-hidden transition-all duration-200 text-left border ${
                          isActive
                            ? "bg-slate-900/10 dark:bg-white/20 shadow-sm border-slate-900/5 dark:border-white/10"
                            : "hover:bg-slate-900/5 dark:hover:bg-white/10 border-transparent"
                        }`}
                        whileHover={{ x: 2 }}
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 25,
                        }}
                      >
                        {/* Active left accent bar */}
                        {isActive && (
                          <motion.span
                            layoutId="activeBar"
                            className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4.5 rounded-r-full theme-bg-accent"
                            initial={{ scaleY: 0 }}
                            animate={{ scaleY: 1 }}
                            transition={{
                              type: "spring",
                              stiffness: 400,
                              damping: 25,
                            }}
                          />
                        )}

                        {/* Icon wrapper — fixed w-6 h-6 ensures all icons align on same column */}
                        <motion.div
                          className={`shrink-0 w-6 h-6 rounded-lg flex items-center justify-center relative overflow-hidden transition-colors duration-200 ${
                            isActive
                              ? "bg-slate-900 dark:bg-white shadow-md shadow-slate-900/20 dark:shadow-black/50"
                              : "bg-slate-900/5 dark:bg-white/10 group-hover:bg-slate-900/10 dark:group-hover:bg-white/20"
                          }`}
                          whileHover={{
                            scale: 1.22,
                            rotate: [0, -10, 7, -4, 0],
                            y: -1,
                            boxShadow:
                              "0 0 0 3px rgba(99,102,241,0.25), 0 0 12px rgba(99,102,241,0.15)",
                          }}
                          whileTap={{ scale: 0.85 }}
                          transition={{
                            scale: {
                              type: "spring",
                              stiffness: 500,
                              damping: 14,
                            },
                            rotate: { duration: 0.38, ease: "easeInOut" },
                            y: {
                              type: "spring",
                              stiffness: 500,
                              damping: 18,
                            },
                            boxShadow: { duration: 0.25 },
                          }}
                        >
                          {/* Shimmer burst on hover */}
                          <span className="absolute inset-0 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.35)_0%,rgba(255,255,255,0)_70%)]" />
                          <Icon
                            size={14}
                            className={`transition-colors duration-200 relative z-10 ${
                              isActive
                                ? "text-white dark:text-slate-900"
                                : "text-slate-700 dark:text-white group-hover:text-slate-900 dark:group-hover:text-white"
                            }`}
                          />
                        </motion.div>

                        {/* Label */}
                        <span
                          className={`text-xs lg:text-[0.6875rem] truncate flex-1 text-left transition-colors duration-200 ${
                            isActive
                              ? "text-slate-900 dark:text-white font-black"
                              : "text-slate-700 dark:text-white font-bold group-hover:text-slate-900 dark:group-hover:text-white"
                          }`}
                        >
                          {item.name}
                        </span>

                        {/* Notification badges */}
                        {item.name === "Notifications" &&
                          unreadCount > 0 && (
                            <span className="min-w-[1rem] h-[1rem] px-1 bg-red-500 text-white rounded-full flex items-center justify-center text-[0.5625rem] font-bold animate-pulse shrink-0">
                              {unreadCount}
                            </span>
                          )}
                        {item.name === "Chat" &&
                          totalUnreadChatCount > 0 && (
                            <span className="flex h-[1rem] min-w-[1rem] items-center justify-center rounded-full bg-gradient-to-r from-rose-500 to-red-600 px-1 text-[0.5625rem] font-black text-white animate-pulse shrink-0">
                              {totalUnreadChatCount}
                            </span>
                          )}

                        {/* Active dot (for items without badge) */}
                        {isActive &&
                          !unreadCount &&
                          item.name !== "Notifications" &&
                          item.name !== "Chat" && (
                            <motion.span
                              className="w-1.5 h-1.5 rounded-full bg-slate-900 dark:bg-white shrink-0"
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{
                                type: "spring",
                                stiffness: 500,
                                damping: 20,
                              }}
                            />
                          )}
                      </motion.div>
                    )}
                  </NavLink>

                  {isPortfoliosItem &&
                    ((portfolios && portfolios.length > 0) || (projects && projects.length > 0)) &&
                    (() => {
                      hasRenderedPortfoliosList = true;
                      return renderPortfoliosList();
                    })()}
                </React.Fragment>
              );
            };

            const isGroupedRole = role === "admin" || role === "operationmanager";

            return (
              <>
                {isGroupedRole ? (
                  <div className="space-y-4">
                    {/* General / Core Group */}
                    <div className="space-y-1">
                      <div className="px-3 py-1 text-[9px] font-black tracking-wider text-slate-450 dark:text-slate-500 uppercase">
                        Workspace
                      </div>
                      <div className="border border-slate-200/60 dark:border-white/5 bg-slate-50/30 dark:bg-white/[0.01] rounded-2xl p-1.5 space-y-0.5 shadow-sm">
                        {menuItems
                          .filter((item) => ["Home", "Sticky Notes", "Chat", "Users"].includes(item.name))
                          .map((item) => renderMenuItem(item))}
                      </div>
                    </div>

                    {/* Management Group */}
                    <div className="space-y-1">
                      <div className="px-3 py-1 text-[9px] font-black tracking-wider text-slate-450 dark:text-slate-500 uppercase">
                        Management
                      </div>
                      <div className="space-y-0.5">
                        {menuItems
                          .filter((item) => !["Home", "Sticky Notes", "Chat", "Users"].includes(item.name))
                          .map((item) => renderMenuItem(item))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {menuItems.map((item) => renderMenuItem(item))}
                  </div>
                )}

                {/* Fallback at the bottom if items were not in the menu list */}
                {!hasRenderedPortfoliosList &&
                  ((portfolios && portfolios.length > 0) || (projects && projects.length > 0)) &&
                  (role === "admin" ||
                    currentUser?.permissions?.manage_portfolios?.read ||
                    currentUser?.permissions?.manage_portfolios === true ||
                    (projects && projects.length > 0)) &&
                  renderPortfoliosList()}
              </>
            );
          })()}
        </nav>

        {/* FOOTER */}
        <div className="p-3 border-t border-slate-200 dark:border-white/5 space-y-1.5">
          {/* Switch Back to Admin — shown when impersonating any user */}
          {originalAdminUser && (
            <button
              type="button"
              onClick={handleSwitchBack}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200/60 dark:border-indigo-500/20 hover:bg-indigo-100/80 dark:hover:bg-indigo-500/20 transition-all duration-200 cursor-pointer group"
            >
              <div className="w-6 h-6 rounded-lg bg-indigo-500/10 dark:bg-indigo-400/10 border border-indigo-300/40 dark:border-indigo-400/20 flex items-center justify-center shrink-0">
                <span className="text-[0.5625rem] font-black text-indigo-600 dark:text-indigo-400">
                  {getInitials(originalAdminUser?.name)}
                </span>
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-[0.625rem] font-bold text-indigo-700 dark:text-indigo-300 truncate leading-tight">
                  Switch Back
                </p>
                <p className="text-[0.5rem] font-black text-indigo-500/70 dark:text-indigo-400/60 uppercase tracking-wider leading-none mt-0.5 truncate">
                  {originalAdminUser?.name}
                </p>
              </div>
              <svg
                className="w-3 h-3 text-indigo-400 dark:text-indigo-500 shrink-0 group-hover:translate-x-0.5 transition-transform"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3"
                />
              </svg>
            </button>
          )}

          {/* Switch User dropdown — shown only for the actual admin (not impersonating) */}
          {role === "admin" &&
            !originalAdminUser &&
            users &&
            users.length > 0 && (
              <div ref={userDropdownRef} className="p-1.5 text-left relative">
                <label className="block text-[10px] lg:text-[0.5rem] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 px-1">
                  Switch User
                </label>

                {/* Trigger Button */}
                <button
                  type="button"
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200/50 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 hover:bg-slate-100/50 dark:hover:bg-[#131d35] transition-all cursor-pointer shadow-sm text-left relative z-50"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {/* Avatar */}
                    <div className="w-6 h-6 rounded-lg overflow-hidden border border-indigo-500/20 dark:border-indigo-400/20 shrink-0 relative flex items-center justify-center bg-indigo-500/10 dark:bg-indigo-400/10 text-indigo-600 dark:text-indigo-400">
                      {profile?.profileImage?.url ? (
                        <img
                          src={profile.profileImage.url}
                          alt={currentUser?.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-xs lg:text-[0.5625rem] font-black">
                          {getInitials(currentUser?.name)}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs lg:text-[0.625rem] font-bold theme-text-primary truncate leading-tight">
                        {currentUser?.name}
                      </p>
                      <p className="text-[10px] lg:text-[0.5rem] font-medium theme-text-secondary  leading-none mt-0.5">
                        {currentUser?.role === "team"
                          ? currentUser?.department || "Team"
                          : displayRole(currentUser?.role)}
                      </p>
                    </div>
                  </div>
                  <svg
                    className={`w-3 h-3 text-slate-400 dark:text-slate-500 transform transition-transform duration-200 shrink-0 ${
                      showUserDropdown ? "rotate-180" : ""
                    }`}
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
                </button>

                {/* Dropdown Options List */}
                <AnimatePresence>
                  {showUserDropdown && (
                    <motion.div
                      variants={dropdownVariants}
                      initial="hidden"
                      animate="visible"
                      exit="hidden"
                      className="absolute bottom-full left-0 right-0 mb-2.5 z-[100] w-full bg-white/95 dark:bg-[#0b1120]/95 backdrop-blur-xl border border-slate-200/50 dark:border-white/10 rounded-2xl shadow-2xl shadow-indigo-500/10 dark:shadow-black/50 overflow-hidden flex flex-col origin-bottom"
                    >
                      <div className="p-2  border-b border-slate-100 dark:border-white/5 shrink-0 bg-slate-50/50 dark:bg-white/5 backdrop-blur-md">
                        <div className="relative flex items-center">
                          <input
                            type="text"
                            placeholder="Search users..."
                            value={userSearchQuery}
                            onChange={(e) => setUserSearchQuery(e.target.value)}
                            className="w-full bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </div>

                      <div className="p-2 max-h-[22rem] overflow-y-auto sidebar-scrollbar flex flex-col gap-1">
                        {(() => {
                          const filteredUsers = users.filter((u) => {
                            const searchStr = userSearchQuery.toLowerCase().trim();
                            if (!searchStr) return true;
                            
                            const searchTerms = searchStr.split(/\s+/);
                            const searchableText = [
                              u.name,
                              u.department || "",
                              displayRole(u.role)
                            ].join(" ").toLowerCase();

                            return searchTerms.every(term => searchableText.includes(term));
                          });

                          if (filteredUsers.length === 0) {
                            return (
                              <div className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">
                                No users found matching "{userSearchQuery}"
                              </div>
                            );
                          }

                          // Group by department
                          const groupedUsers = filteredUsers.reduce(
                            (acc, u) => {
                              const dept = u.department || displayRole(u.role);
                              if (!acc[dept]) acc[dept] = [];
                              acc[dept].push(u);
                              return acc;
                            },
                            {},
                          );

                          return Object.entries(groupedUsers).map(
                            ([dept, deptUsers]) => (
                              <div
                                key={dept}
                                className="space-y-0.5 mb-1 last:mb-0"
                              >
                                {deptUsers.map((u) => {
                                  const isCurrent =
                                    u._id ===
                                    (currentUser?._id || currentUser?.id);
                                  return (
                                    <motion.button
                                      key={u._id}
                                      variants={itemVariants}
                                      whileHover={{ scale: 1.02, x: 2 }}
                                      whileTap={{ scale: 0.98 }}
                                      type="button"
                                      onClick={() => {
                                        setShowUserDropdown(false);
                                        if (!isCurrent) {
                                          handleSwitchUser(u._id);
                                        }
                                      }}
                                      className={`w-full flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-xl text-left transition-all duration-300 cursor-pointer group mb-1 last:mb-0 ${
                                        isCurrent
                                          ? "bg-gradient-to-r from-indigo-50/80 to-blue-50/80 dark:from-indigo-500/10 dark:to-blue-500/5 border border-indigo-100 dark:border-indigo-500/20 shadow-sm"
                                          : "border border-transparent hover:bg-slate-50/80 dark:hover:bg-white/5 hover:border-slate-200/50 dark:hover:border-white/5 hover:shadow-sm"
                                      }`}
                                    >
                                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                        {/* Avatar */}
                                        <div
                                          className={`w-7 h-7 rounded-full shrink-0 overflow-hidden shadow-sm flex items-center justify-center transition-transform duration-300 group-hover:scale-105 ${
                                            isCurrent
                                              ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30"
                                              : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700/50"
                                          }`}
                                        >
                                          {u.profile?.profileImage?.url ? (
                                            <img
                                              src={u.profile.profileImage.url}
                                              alt={u.name}
                                              className="w-full h-full object-cover"
                                            />
                                          ) : (
                                            <span className="text-xs lg:text-[0.625rem] font-black">
                                              {getInitials(u.name)}
                                            </span>
                                          )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                          <p
                                            className={`text-[11px] lg:text-[0.625rem] font-bold truncate leading-tight transition-colors ${
                                              isCurrent
                                                ? "text-indigo-700 dark:text-indigo-300"
                                                : "text-slate-700 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400"
                                            }`}
                                          >
                                            {u.name}
                                          </p>
                                          <p className="text-[9px] lg:text-[0.5rem] font-black opacity-70 uppercase tracking-widest mt-[1px] theme-text-secondary truncate">
                                            {u.role === "team"
                                              ? u.department || "Team"
                                              : displayRole(u.role)}
                                          </p>
                                        </div>
                                      </div>
                                      {/* Active Indicator */}
                                      {isCurrent && (
                                        <div className="shrink-0 w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)] animate-pulse" />
                                      )}
                                    </motion.button>
                                  );
                                })}
                              </div>
                            ),
                          );
                        })()}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

          <motion.button
            initial="initial"
            whileHover="hover"
            whileTap="tap"
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 text-white text-xs font-bold transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md"
          >
            <motion.div
              variants={{
                hover: { x: -2, scale: 1.1 },
                initial: { x: 0, scale: 1 },
              }}
              className="shrink-0"
            >
              <FiLogOut size={14} />
            </motion.div>
            <span>Logout</span>
          </motion.button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
