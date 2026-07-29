import React, { useEffect, useState, useRef } from "react";
import ReactDOM from "react-dom";
import { useSelector, useDispatch } from "react-redux";
import { logoutUser } from "../../features/auth/authSlice";
import { getProfile, clearProfile } from "../../features/profile/profileSlice";
import { getClients } from "../../features/clients/clientslice";
import { useNavigate, useLocation } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import {
  useGetNotificationsQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
  useDeleteNotificationMutation,
  useGetProjectsQuery,
  useGetTasksQuery,
} from "../../features/api/apiSlice";
import toast from "react-hot-toast";
import { HiOutlineMenuAlt3 } from "react-icons/hi";
import {
  FiBell,
  FiSearch,
  FiUser,
  FiLogOut,
  FiChevronDown,
  FiCheckSquare,
  FiBriefcase,
  FiCheck,
  FiInfo,
  FiTrash2,
  FiSun,
  FiMoon,
  FiMonitor,
  FiMessageSquare,
  FiMapPin,
  FiCompass,
  FiArrowLeft,
  FiX,
  FiFileText,
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";

const Navbar = ({ setSidebarOpen }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const dropdownRef = useRef(null);
  const notificationRef = useRef(null);
  const [openDropdown, setOpenDropdown] = useState(false);
  const [openNotifications, setOpenNotifications] = useState(false);

  const { user } = useSelector((state) => state.auth);
  const { profile, loading: profileLoading } = useSelector((state) => state.profile);
  const { clients = [], loading: clientsLoading } = useSelector((state) => state.clients);
  const { theme, setTheme, sidebarLayout } = useTheme();

  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const { data: projects = [] } = useGetProjectsQuery(undefined, {
    skip: !user,
  });
  const { data: tasks = [] } = useGetTasksQuery(undefined, { skip: !user });

  const { data: notifications = [] } = useGetNotificationsQuery(undefined, {
    skip: !user,
    pollingInterval: 60000,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });

  const [markAsReadTrigger] = useMarkAsReadMutation();
  const [markAllAsReadTrigger] = useMarkAllAsReadMutation();
  const [deleteNotificationTrigger] = useDeleteNotificationMutation();

  const unreadCount = (notifications || []).filter((n) => !n.isRead).length;

  const getNotificationDetails = (n) => {
    const type = n?.type;
    const message = n?.message || "";
    if (
      type === "client_assigned" ||
      message.toLowerCase().includes("client:")
    ) {
      return {
        icon: FiUser,
        bgColor:
          "bg-indigo-50 dark:bg-indigo-950/20 text-indigo-650 dark:text-indigo-400 border border-indigo-100/50 dark:border-indigo-900/30",
      };
    }
    if (
      type === "report_submitted" ||
      (message &&
        (message.toLowerCase().includes("submitted a new designer eod report") ||
         message.toLowerCase().includes("submitted a new eod report")))
    ) {
      return {
        icon: FiFileText,
        bgColor:
          "bg-fuchsia-50 dark:bg-fuchsia-950/20 text-fuchsia-600 dark:text-fuchsia-400 border border-fuchsia-100/50 dark:border-fuchsia-900/30",
      };
    }
    switch (type) {
      case "message_received":
        return {
          icon: FiMessageSquare,
          bgColor:
            "bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border border-indigo-100/50 dark:border-indigo-900/30",
        };
      case "project_assigned":
        return {
          icon: FiBriefcase,
          bgColor:
            "bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-100/50 dark:border-amber-900/30",
        };
      case "task_assigned":
        return {
          icon: FiCheckSquare,
          bgColor:
            "bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border border-blue-100/50 dark:border-blue-900/30",
        };
      case "task_completed":
        return {
          icon: FiCheck,
          bgColor:
            "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100/50 dark:border-emerald-900/30",
        };
      case "task_updated":
        return {
          icon: FiInfo,
          bgColor:
            "bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 border border-purple-100/50 dark:border-purple-900/30",
        };
      default:
        return {
          icon: FiBell,
          bgColor:
            "bg-slate-50 dark:bg-slate-800/30 text-slate-600 dark:text-slate-400 border border-slate-100/50 dark:border-slate-800/30",
        };
    }
  };

  const getPageTitle = () => {
    const path = location.pathname.toLowerCase();

    const renderDashboardTitle = () => {
      return user?.department ? (
        <>
          <span className="theme-text-accent">{user.department}</span>{" "}
          <span className="text-black dark:text-white">Dashboard</span>
        </>
      ) : (
        <span className="text-black dark:text-white">Dashboard</span>
      );
    };

    if (
      path.endsWith("/dashboard") ||
      path === "/admin" ||
      path === "/admin/" ||
      path === "/operationmanager" ||
      path === "/operationmanager/" ||
      path === "/team" ||
      path === "/team/"
    ) {
      return renderDashboardTitle();
    }

    if (path.includes("clients")) return "Clients Management";
    if (path.includes("portfolio")) return "Portfolio Groups";

    if (path.includes("projects")) {
      const searchParams = new URLSearchParams(location.search);
      return searchParams.get("id")
        ? "Project task assign"
        : "Projects Management";
    }
    if (path.includes("tasks")) return "Tasks";
    if (path.includes("partnerhub")) return "PartnerHub";
    if (path.includes("profile")) return "Profile";

    if (
      path.includes("/team-members") ||
      path.endsWith("/team-members") ||
      path.endsWith("/team")
    ) {
      return "Team";
    }

    if (path.includes("users")) return "Users Management";
    if (path.includes("workload")) return "Workload";
    if (path.includes("chat")) return "Chat";
    if (path.includes("notifications")) return "Notifications";
    if (path.includes("settings")) return "Settings";

    if (path.includes("report") || path.includes("eod")) return "EOD Reports";
    if (path.includes("calendar") || path.includes("calendor"))
      return "Calendar";
    return renderDashboardTitle();
  };
  const pageTitle = getPageTitle();

  useEffect(() => {
    if (user && !profileLoading) {
      const profileUserId = profile?.user?._id || profile?.user;
      if (!profile || profileUserId !== (user.id || user._id)) {
        dispatch(getProfile());
      }
    }
  }, [dispatch, user]);

  const categories = ["Navigation", "Projects", "Tasks", "Clients"];

  const getSearchItems = () => {
    const items = [];

    // 1. Pages / Navigation
    const pages = [
      {
        id: "nav-dashboard",
        category: "Navigation",
        title: "Go to Dashboard",
        path: `/${user?.role}`,
      },
      {
        id: "nav-projects",
        category: "Navigation",
        title: "Go to Projects",
        path: `/${user?.role}/projects`,
      },
      {
        id: "nav-tasks",
        category: "Navigation",
        title: "Go to Tasks",
        path: `/${user?.role}/tasks`,
      },
      {
        id: "nav-clients",
        category: "Navigation",
        title: "Go to Clients",
        path: `/${user?.role}/clients`,
      },
      {
        id: "nav-portfolio",
        category: "Navigation",
        title: "Go to Portfolio Groups",
        path: `/${user?.role}/portfolio`,
      },
      {
        id: "nav-calendar",
        category: "Navigation",
        title: "Go to Calendar",
        path: `/${user?.role}/calendar`,
      },
      {
        id: "nav-chat",
        category: "Navigation",
        title: "Go to Chat / Messages",
        path: `/${user?.role}/chat`,
      },
      {
        id: "nav-workload",
        category: "Navigation",
        title: "Go to Workload",
        path: `/${user?.role}/workload`,
      },
      {
        id: "nav-settings",
        category: "Navigation",
        title: "Go to Settings",
        path: `/${user?.role}/settings`,
      },
      {
        id: "nav-profile",
        category: "Navigation",
        title: "Go to Profile",
        path: `/${user?.role}/profile`,
      },
    ];

    pages.forEach((p) => {
      if (
        !searchQuery ||
        p.title.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        items.push({ ...p, type: "navigation" });
      }
    });

    // 2. Projects
    (projects || []).forEach((proj) => {
      if (
        !searchQuery ||
        (proj.name || "").toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        items.push({
          id: proj._id,
          category: "Projects",
          title: proj.name,
          subtitle: proj.description || "No description",
          path: `/${user?.role}/projects?id=${proj._id}`,
          type: "project",
        });
      }
    });

    // 3. Tasks
    (tasks || []).forEach((t) => {
      if (
        !searchQuery ||
        (t.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.taskId && t.taskId.toLowerCase().includes(searchQuery.toLowerCase()))
      ) {
        items.push({
          id: t._id,
          category: "Tasks",
          title: t.taskId ? `[${t.taskId}] ${t.title}` : t.title,
          subtitle: `Status: ${t.status || "To Do"}`,
          path: t.project
            ? `/${user?.role}/projects?id=${t.project}`
            : `/${user?.role}/tasks`,
          type: "task",
        });
      }
    });

    // 4. Clients
    (clients || []).forEach((c) => {
      if (
        !searchQuery ||
        (c.name || "").toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        items.push({
          id: c._id,
          category: "Clients",
          title: c.name,
          subtitle: c.email || "No email",
          path: `/${user?.role}/clients`,
          type: "client",
        });
      }
    });

    return items;
  };

  const allFilteredItems = getSearchItems();

  useEffect(() => {
    if (user && !clientsLoading && (!clients || clients.length === 0)) {
      dispatch(getClients());
    }
  }, [dispatch, user]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setShowSearchModal((prev) => !prev);
        setSearchQuery("");
        setSelectedIndex(0);
      }

      if (!showSearchModal) return;

      if (e.key === "Escape") {
        setShowSearchModal(false);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < allFilteredItems.length - 1 ? prev + 1 : 0,
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : allFilteredItems.length - 1,
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (allFilteredItems[selectedIndex]) {
          const selectedItem = allFilteredItems[selectedIndex];
          navigate(selectedItem.path);
          setShowSearchModal(false);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showSearchModal, allFilteredItems, selectedIndex, navigate]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenDropdown(false);
      }
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setOpenNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await dispatch(logoutUser());
    dispatch(clearProfile());
    toast.success("Logout Success");
    navigate("/");
  };

  const getThemeIcon = () => {
    if (theme === "dark")
      return <FiMoon size={14} className="theme-text-accent" />;
    return <FiSun size={14} className="theme-text-accent" />;
  };

  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="
        sticky top-0 z-50
        h-14
      bg-white  dark:bg-black
        px-3 md:px-5
        flex items-center justify-between
      
      

    
      "
    >
      {/* LEFT */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* SIDEBAR TOGGLE BUTTON - hidden on lg when horizontal layout */}
        {!(sidebarLayout === "horizontal") && (
          <button
            onClick={() => setSidebarOpen((prev) => !prev)}
            className="
              w-8 h-8
              rounded-lg border theme-border theme-bg-main
              theme-text-secondary hover:theme-text-primary
              flex items-center justify-center
              hover:bg-slate-50 dark:hover:bg-white/5
              transition-all duration-200 cursor-pointer
            "
            title="Toggle Sidebar"
          >
            <HiOutlineMenuAlt3 className="text-[1.0625rem] transform hover:scale-110 transition-transform duration-200" />
          </button>
        )}

        {/* PAGE TITLE */}
        <h1 className="text-xs md:text-[1.05rem] theme-text-accent font-medium shrink-0">
          {pageTitle}
        </h1>
      </div>


      {/* RIGHT */}
      <div className="flex items-center gap-5 shrink-0">
       
       


        {/* NOTIFICATIONS */}
        <div className="relative" ref={notificationRef}>
          <button
            onClick={() => setOpenNotifications(!openNotifications)}
            className={`
              relative w-8 h-8 rounded-lg  border flex items-center justify-center transition-all duration-200 cursor-pointer
              ${
                openNotifications
                  ? "theme-bg-main border-indigo-500 dark:border-indigo-400 theme-text-primary ring-2 ring-indigo-500/10"
                  : "theme-border theme-bg-card theme-text-secondary hover:theme-bg-main hover:theme-text-primary"
              }
            `}
          >
            <FiBell className="text-[0.9375rem]" />
            {unreadCount > 0 && (
              <>
                <span
                  className="
                  absolute -top-1.5 -right-1.5
                  min-w-[1.0625rem] h-[1.0625rem] px-1
                  rounded-full bg-rose-500
                  text-white text-[0.5rem] font-black
                  flex items-center justify-center
                  border-2 border-white  shadow-sm z-10
                "
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
                <span className="absolute -top-1.5 -right-1.5 w-[1.0625rem] h-[1.0625rem] rounded-full bg-rose-500 animate-ping opacity-60 border-2 border-white dark:border-slate-900" />
              </>
            )}
          </button>

          {/* DROPDOWN MENU */}
          <AnimatePresence>
            {openNotifications && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="
                  fixed top-[3.875rem] left-4 right-4
                  md:absolute md:top-auto md:left-auto md:right-0 md:mt-2
                  md:w-[21.25rem] md:max-w-none
                  bg-white dark:bg-slate-900 rounded-2xl border theme-border
                  shadow-2xl z-50 overflow-hidden
                "
              >
                {/* Header */}
                <div className="px-4 py-3 theme-bg-accent text-white dark:text-black border-b theme-border flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-[0.6875rem] text-white dark:text-black uppercase tracking-wider">
                      Notifications
                    </span>
                    {unreadCount > 0 && (
                      <span className="bg-white/20 dark:bg-black/10 text-white dark:text-black text-[0.625rem] font-extrabold px-2 py-0.5 rounded-full">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={() => {
                        markAllAsReadTrigger();
                      }}
                      className="text-[0.625rem] text-white/85 dark:text-black/85 hover:text-white dark:hover:text-black font-bold transition-colors cursor-pointer hover:underline"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>

                {/* List */}
                <div className="max-h-[300px] overflow-y-auto divide-y theme-border scrollbar-thin">
                  {(notifications || []).length === 0 ? (
                    <div className="py-12 text-center flex flex-col items-center justify-center text-slate-400">
                      <FiBell className="text-2xl mb-2 opacity-30 text-slate-400" />
                      <span className="text-[11px] font-bold">
                        No notifications yet
                      </span>
                      <p className="text-[9px] text-slate-400 mt-0.5 px-6">
                        You will be notified here when tasks are assigned or
                        updated.
                      </p>
                    </div>
                  ) : (
                    (notifications || []).map((n) => {
                      const details = getNotificationDetails(n);
                      const Icon = details.icon;
                      return (
                        <div
                          key={n._id}
                          onClick={() => {
                            if (!n.isRead) {
                              markAsReadTrigger(n._id);
                            }
                            setOpenNotifications(false);
                            if (n.type === "message_received" || n.chatRoomId) {
                              navigate(
                                `/${user?.role}/chat?id=${n.chatRoomId}`,
                              );
                            } else if (
                              n.type === "report_submitted" ||
                              (n.message &&
                                (n.message.toLowerCase().includes("submitted a new designer eod report") ||
                                 n.message.toLowerCase().includes("submitted a new eod report")))
                            ) {
                              navigate(`/${user?.role}/eod-reports`);
                            } else if (
                              n.type === "client_assigned" ||
                              (n.message &&
                                n.message.toLowerCase().includes("client:"))
                            ) {
                              navigate(`/${user?.role}/clients`);
                            } else if (n.type === "task_assigned" || n.type?.startsWith("task_")) {
                              const isProjectRedirect = n.message && /in-review|in progress|on-hold|on hold/i.test(n.message);
                              if (n.project && (user?.role !== "team" || isProjectRedirect)) {
                                const projectId = typeof n.project === 'object' ? n.project._id : n.project;
                                navigate(`/${user?.role}/projects?id=${projectId}`);
                              } else {
                                navigate(`/${user?.role}/tasks`);
                              }
                            } else if (n.project) {
                              const projectId = typeof n.project === 'object' ? n.project._id : n.project;
                              navigate(
                                `/${user?.role}/projects?id=${projectId}`,
                              );
                            } else {
                              navigate(`/${user?.role}/tasks`);
                            }
                          }}
                          className={`
                            px-4 py-3 text-left transition-all cursor-pointer flex items-start gap-3 relative group
                            ${
                              !n.isRead
                                ? "bg-indigo-500/5 hover:bg-indigo-500/10"
                                : "theme-bg-card hover:theme-bg-main"
                            }
                          `}
                        >
                          <div
                            className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 shadow-sm ${details.bgColor}`}
                          >
                            <Icon size={13} />
                          </div>
                          <div className="flex-1 min-w-0 pr-6">
                            <p
                              className={`text-[11px] leading-relaxed break-words ${!n.isRead ? "theme-text-primary font-black" : "theme-text-secondary font-medium"}`}
                            >
                              {n.message}
                            </p>
                            <span className="text-[9px] text-slate-400 block mt-1 font-semibold">
                              {new Date(n.createdAt).toLocaleDateString([], {
                                month: "short",
                                day: "numeric",
                              })}{" "}
                              at{" "}
                              {new Date(n.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0 absolute right-3 top-1/2 -translate-y-1/2">
                            {!n.isRead && (
                              <span className="w-1.5 h-1.5 rounded-full theme-bg-accent animate-pulse shadow-lg shadow-[var(--accent-color)]/50" />
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotificationTrigger(n._id);
                                toast.success("Notification deleted");
                              }}
                              className="
                                p-1 rounded-lg text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all duration-150
                                opacity-100 lg:opacity-0 lg:group-hover:opacity-100 focus:opacity-100 cursor-pointer
                              "
                              title="Delete Notification"
                            >
                              <FiTrash2 size={12} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Footer */}
                <div className="px-4 py-2.5 theme-bg-main border-t theme-border text-center">
                  <button
                    onClick={() => {
                      setOpenNotifications(false);
                      navigate(`/${user?.role}/notifications`);
                    }}
                    className="text-[10px] theme-text-secondary hover:theme-text-primary font-bold tracking-wide uppercase transition-colors cursor-pointer"
                  >
                    View All History
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* LIGHT/DARK MODE TOGGLE */}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="
            w-8 h-8 rounded-lg  border flex items-center justify-center transition-all duration-200 cursor-pointer
            theme-border theme-bg-card hover:theme-bg-main
          "
          title="Toggle Theme"
        >
          {getThemeIcon()}
        </button>

        {/* PROFILE DROPDOWN */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setOpenDropdown(!openDropdown)}
            className="
              flex items-center gap-1.5
              px-1.5 py-1
  
              rounded-lg border theme-border theme-bg-card
              transition-all cursor-pointer
            "
          >
            <div className="relative shrink-0">
              {profile?.profileImage?.url ? (
                <img
                  src={profile.profileImage.url}
                  alt="profile"
                  className="w-7 h-7 rounded-full object-cover"
                />
              ) : (
                <div className="w-7 h-7 rounded-full theme-bg-accent flex items-center justify-center text-white dark:text-black">
                  <FiUser size={13} />
                </div>
              )}
              {/* Online status indicator dot */}
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 animate-pulse" />
            </div>

            <div className="text-left hidden md:block">
              <h3 className="text-[12px] font-black theme-text-primary leading-tight">
                {user?.name}
              </h3>
              <p className="text-[10px] theme-text-secondary capitalize leading-tight">
                {user?.role}
              </p>
            </div>

            <FiChevronDown
              className={`text-gray-550 dark:text-slate-400 text-xs transition-transform ${openDropdown ? "rotate-180" : ""}`}
            />
          </button>

          {/* DROPDOWN */}
          <AnimatePresence>
            {openDropdown && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="
                  absolute right-0 top-10
                  w-52 rounded-xl
                  theme-bg-card border theme-border
                  p-1.5 z-50
                "
              >
                {/* User Info Header */}
                <div className="px-3 py-2 border-b theme-border mb-1 flex items-center justify-between gap-2">
                  <div className="truncate">
                    <p className="text-[12px] font-black theme-text-primary truncate">
                      {user?.name}
                    </p>
                    <p className="text-[10px] theme-text-secondary truncate capitalize font-medium">
                      {user?.role}
                    </p>
                  </div>
                  <span className="flex items-center gap-1 text-[9px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-500/20 shrink-0">
                    <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                    ACTIVE
                  </span>
                </div>

                <button
                  onClick={() => {
                    navigate(`/${user?.role}/profile`);
                    setOpenDropdown(false);
                  }}
                  className="
                    w-full px-3 py-2 rounded-lg
                    flex items-center gap-2
                    text-xs theme-text-primary hover:theme-bg-main transition-all cursor-pointer
                  "
                >
                  <FiUser className="theme-text-accent" size={13} />
                  <span>Edit Profile</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="
                    w-full px-3 py-2 rounded-lg
                    flex items-center gap-2
                    text-xs text-red-500
                    hover:bg-red-50 dark:hover:bg-red-950/20 transition-all cursor-pointer
                  "
                >
                  <FiLogOut size={13} />
                  Logout
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {ReactDOM.createPortal(
        <AnimatePresence>
          {showSearchModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-md z-[9999] flex items-start justify-center pt-10 sm:pt-20 px-3 sm:px-4"
              onClick={() => setShowSearchModal(false)}
            >
              <motion.div
                initial={{ opacity: 0, y: -40, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -30, scale: 0.96 }}
                transition={{ type: "spring", damping: 26, stiffness: 320 }}
                className="w-full max-h-[85vh] sm:h-auto sm:max-w-2xl bg-white/95 dark:bg-[#0b0f1a]/95 backdrop-blur-xl border border-slate-200/60 dark:border-slate-700/60 rounded-2xl shadow-2xl shadow-black/30 overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Search Bar Input inside modal */}
                <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200 dark:border-slate-800/60">
                  <FiSearch className="text-slate-400 text-lg shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setSelectedIndex(0);
                    }}
                    placeholder="Search projects, tasks, clients, and pages..."
                    className="w-full bg-transparent border-none text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-0 placeholder-slate-400 font-medium"
                    autoFocus
                  />
                  <button
                    onClick={() => setShowSearchModal(false)}
                    className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800/60 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-all cursor-pointer flex items-center justify-center shrink-0"
                    title="Close Search"
                  >
                    <FiX size={16} />
                  </button>
                </div>

                {/* Results List */}
                <div className="flex-1 sm:max-h-[380px] overflow-y-auto p-2 scrollbar-thin">
                  {allFilteredItems.length === 0 ? (
                    <div className="py-12 text-center flex flex-col items-center justify-center text-slate-400">
                      <FiSearch className="text-3xl mb-2 opacity-35" />
                      <span className="text-xs font-bold">No matches found</span>
                      <p className="text-[10px] text-slate-450 mt-1">
                        No results for "{searchQuery}"
                      </p>
                    </div>
                  ) : (
                    <div>
                      {(() => {
                        let globalItemIndex = 0;
                        return categories.map((cat) => {
                          const catItems = allFilteredItems.filter(
                            (item) => item.category === cat,
                          );
                          if (catItems.length === 0) return null;

                          return (
                            <div key={cat} className="mb-3">
                              <div className="px-3 py-1.5 text-[9px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest">
                                {cat}
                              </div>
                              <div className="space-y-0.5">
                                {catItems.map((item) => {
                                  const isHighlighted =
                                    globalItemIndex === selectedIndex;
                                  const itemIndex = globalItemIndex;
                                  globalItemIndex++;

                                  return (
                                    <div
                                      key={item.id}
                                      onClick={() => {
                                        navigate(item.path);
                                        setShowSearchModal(false);
                                      }}
                                      onMouseEnter={() =>
                                        setSelectedIndex(itemIndex)
                                      }
                                      className={`
                                        flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-150
                                        ${
                                          isHighlighted
                                            ? "bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300"
                                            : "hover:bg-slate-100 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300"
                                        }
                                      `}
                                    >
                                      <div className="flex items-center gap-3 min-w-0">
                                        <div
                                          className={`w-7 h-7 rounded-lg flex items-center justify-center border border-slate-200 dark:border-slate-700 shrink-0 ${
                                            isHighlighted
                                              ? "bg-indigo-500/20 border-indigo-300 dark:border-indigo-700"
                                              : "bg-slate-100 dark:bg-slate-800"
                                          }`}
                                        >
                                          {item.type === "navigation" && (
                                            <FiCompass size={13} />
                                          )}
                                          {item.type === "project" && (
                                            <FiBriefcase size={13} />
                                          )}
                                          {item.type === "task" && (
                                            <FiCheckSquare size={13} />
                                          )}
                                          {item.type === "client" && (
                                            <FiUser size={13} />
                                          )}
                                        </div>
                                        <div className="min-w-0">
                                          <span className="text-xs font-bold block truncate">
                                            {item.title}
                                          </span>
                                          {item.subtitle && (
                                            <span className="text-[10px] opacity-75 mt-0.5 block truncate font-medium">
                                              {item.subtitle}
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      {isHighlighted && (
                                        <span className="text-[9px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 shrink-0 mr-1 animate-pulse">
                                          ⏎ Go
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  )}
                </div>

                {/* Footer navigation guide */}
                <div className="hidden sm:flex px-4 py-2.5 bg-slate-50/80 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800/60 items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 font-semibold select-none">
                  <div className="flex items-center gap-2">
                    <span>↑↓ to navigate</span>
                    <span>·</span>
                    <span>↵ to select</span>
                    <span>·</span>
                    <span>esc to close</span>
                  </div>
                  <div>Press Ctrl+K to open anywhere</div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </motion.div>
  );
};

export default Navbar;
