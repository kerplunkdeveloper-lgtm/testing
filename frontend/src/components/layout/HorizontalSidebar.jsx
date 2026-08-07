import React, { useState, useEffect, useRef } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { createPortal } from "react-dom";
import { FiUsers, FiX, FiSearch, FiArrowLeft } from "react-icons/fi";
import toast from "react-hot-toast";
import { sidebarConfig } from "../../config/sidebarConfig";
import { markAllChatAsRead } from "../../features/notifications/notificationSlice";
import { clearAllUnreadCounts } from "../../features/chat/chatSlice";
import { impersonateUser, exitImpersonation } from "../../features/auth/authSlice";
import { getUsers } from "../../features/users/userSlice";
import { apiSlice } from "../../features/api/apiSlice";

const HorizontalSidebar = ({ role }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user: currentUser, originalAdminUser } = useSelector((state) => state.auth);
  const { unreadCounts = {} } = useSelector((state) => state.chat);
  const { notifications } = useSelector((state) => state.notifications);
  const { users = [] } = useSelector((state) => state.users || {});
  
  const [showSwitchDropdown, setShowSwitchDropdown] = useState(false);
  const [switchSearch, setSwitchSearch] = useState("");
  const [switchCoords, setSwitchCoords] = useState({ top: 0, left: 0 });
  const switchTriggerRef = useRef(null);

  useEffect(() => {
    if (currentUser?.role === "admin" || originalAdminUser) {
      dispatch(getUsers());
    }
  }, [dispatch, currentUser, originalAdminUser]);

  const updateSwitchCoords = () => {
    if (switchTriggerRef.current) {
      const rect = switchTriggerRef.current.getBoundingClientRect();
      const dropdownWidth = 240; // width of user switcher dropdown
      let left = rect.left;
      if (rect.left + dropdownWidth > window.innerWidth) {
        left = Math.max(10, rect.right - dropdownWidth);
      }
      setSwitchCoords({
        top: rect.bottom + 8,
        left: left,
      });
    }
  };

  useEffect(() => {
    if (showSwitchDropdown) {
      updateSwitchCoords();
      window.addEventListener("scroll", updateSwitchCoords, true);
      window.addEventListener("resize", updateSwitchCoords);
    }
    return () => {
      window.removeEventListener("scroll", updateSwitchCoords, true);
      window.removeEventListener("resize", updateSwitchCoords);
    };
  }, [showSwitchDropdown]);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (
        switchTriggerRef.current &&
        !switchTriggerRef.current.contains(e.target) &&
        !e.target.closest(".switch-user-portal")
      ) {
        setShowSwitchDropdown(false);
      }
    };
    if (showSwitchDropdown) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [showSwitchDropdown]);

  const handleSwitchUser = async (userId) => {
    try {
      const result = await dispatch(impersonateUser(userId)).unwrap();
      dispatch(apiSlice.util.resetApiState());
      toast.success("Successfully logged in as user");
      setShowSwitchDropdown(false);
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

  const handleSwitchBackLocal = () => {
    dispatch(exitImpersonation());
    dispatch(apiSlice.util.resetApiState());
    toast.success("Switched back to Admin");
    setShowSwitchDropdown(false);
    navigate("/admin");
  };

  const localUnreadChatCount = Object.values(unreadCounts).reduce(
    (sum, val) => sum + (val || 0),
    0,
  );
  
  const dbUnreadChatCount = notifications
    ? notifications.filter((n) => !n.isRead && n.type === "message_received").length
    : 0;

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

    // Hide My Reports for Social Media Manager department
    if (
      item.name === "My Reports" &&
      currentUser?.department === "Social Media Manager"
    ) {
      return false;
    }

    if (role === "admin") return true;
    if (item.permissionKey === "manage_clients") return true;
    if (!item.permissionKey) return true;
    const perm = currentUser?.permissions?.[item.permissionKey];
    if (perm === true) return true;
    return perm?.read;
  });

  // filter users (exclude yourself if not impersonating, or allow switching back)
  const filteredUsers = (users || []).filter((u) => {
    if (!u || !u.name) return false;
    return u.name.toLowerCase().includes(switchSearch.toLowerCase());
  });

  const getInitials = (name) => {
    if (!name) return "";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarUrl = (userObj) => {
    return (
      userObj?.profile?.profileImage?.url ||
      userObj?.profileImage?.url ||
      userObj?.profile?.avatar ||
      userObj?.avatar ||
      ""
    );
  };

  const displayRole = (role) => {
    if (role === "operationmanager") return "Operation Manager";
    if (role === "admin") return "Admin";
    return "Team";
  };

  const safeGetAvatarColor = (name) => {
    const colors = [
      "from-blue-500 to-indigo-600",
      "from-emerald-500 to-teal-650",
      "from-purple-500 to-pink-600",
      "from-amber-500 to-orange-600",
      "from-rose-500 to-red-600",
    ];
    if (!name) return colors[0];
    let sum = 0;
    for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
    return colors[sum % colors.length];
  };

  return (
    <div className="max-w-7xl mt-3 fixed left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] p-2.5   rounded-full z-40 px-4 backdrop-blur-md border border-slate-200/50 dark:border-white/10 shadow-sm">
      <div className="flex items-center w-full overflow-x-auto px-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
        <div className="flex items-center gap-1.5 mx-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isChat = item.name.toLowerCase() === "chat";

            return (
              <NavLink
                key={item.name}
                to={item.path}
                onClick={() => {
                  if (isChat) {
                    dispatch(clearAllUnreadCounts());
                    dispatch(markAllChatAsRead());
                  }
                }}
                end={item.path === `/${role}`}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3.5 py-2 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all group relative ${
                    isActive
                      ? "bg-white/80 dark:bg-slate-800/80 theme-text-accent shadow-sm border border-slate-200/50 dark:border-white/10"
                      : "text-slate-650 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white border border-transparent"
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                <span>{item.name}</span>
                {isChat && totalUnreadChatCount > 0 && (
                  <span className="ml-1 bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full flex items-center justify-center animate-pulse shadow-sm">
                    {totalUnreadChatCount}
                  </span>
                )}
              </NavLink>
            );
          })}

          {/* Switch User for Admin / Impersonating Mode */}
          {(currentUser?.role === "admin" || originalAdminUser) && (
            <div className="relative border-l border-slate-200 dark:border-white/10 pl-2">
              <button
                ref={switchTriggerRef}
                type="button"
                onClick={() => setShowSwitchDropdown((prev) => !prev)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all group relative border cursor-pointer ${
                  showSwitchDropdown
                    ? "bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/30 shadow-sm"
                    : "text-slate-650 dark:text-slate-450 hover:bg-white/50 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white border-transparent"
                }`}
              >
                <FiUsers className="w-4 h-4 text-indigo-500" />
                <span>Switch User</span>
                {originalAdminUser && (
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {showSwitchDropdown &&
        createPortal(
          <div
            style={{
              position: "fixed",
              top: `${switchCoords.top}px`,
              left: `${switchCoords.left}px`,
              zIndex: 999999,
            }}
            className="switch-user-portal w-64 bg-white dark:bg-[#151518] border border-slate-200 dark:border-white/10 shadow-2xl rounded-2xl p-3 flex flex-col max-h-[350px] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Title / Switch back button */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-white/5 shrink-0">
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-550 tracking-wider uppercase">
                {originalAdminUser ? "Impersonating User" : "Switch User"}
              </span>
              {originalAdminUser && (
                <button
                  type="button"
                  onClick={handleSwitchBackLocal}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 text-[9px] font-black uppercase cursor-pointer hover:bg-amber-500/20 transition-all"
                >
                  <FiArrowLeft size={10} />
                  Switch Back
                </button>
              )}
            </div>

            {/* Search Input */}
            <div className="relative mb-2 shrink-0">
              <input
                type="text"
                placeholder="Search user..."
                value={switchSearch}
                onChange={(e) => setSwitchSearch(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#111111] text-xs px-2.5 py-1.5 pl-8 rounded-lg border border-slate-200 dark:border-white/10 outline-none focus:border-blue-500 text-slate-700 dark:text-white transition-colors"
                autoFocus
              />
              <FiSearch size={11.5} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>

            {/* User List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 pr-0.5">
              {filteredUsers.map((u) => {
                const isCurrent = u._id === (currentUser?._id || currentUser?.id);
                const avatarUrl = getAvatarUrl(u);
                const dept = u.department || displayRole(u.role);
                return (
                  <button
                    key={u._id}
                    type="button"
                    onClick={() => {
                      if (!isCurrent) {
                        handleSwitchUser(u._id);
                      }
                    }}
                    disabled={isCurrent}
                    className={`w-full flex items-center gap-2.5 p-2 rounded-xl transition-all text-xs text-left border ${
                      isCurrent
                        ? "bg-indigo-50/50 dark:bg-indigo-500/10 border-indigo-200/50 dark:border-indigo-500/25 text-indigo-650 dark:text-indigo-400 font-bold"
                        : "hover:bg-slate-50 dark:hover:bg-white/5 border-transparent text-slate-750 dark:text-slate-300 cursor-pointer"
                    }`}
                  >
                    <div className="shrink-0">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={u.name}
                          className="w-7 h-7 rounded-full object-cover border border-slate-200/80 dark:border-white/10"
                        />
                      ) : (
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-white font-black text-[9px] bg-gradient-to-br shrink-0 ${safeGetAvatarColor(
                            u.name || "U",
                          )}`}
                        >
                          {getInitials(u.name)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-extrabold truncate">{u.name}</div>
                      <div className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider mt-0.5">
                        {dept}
                      </div>
                    </div>
                  </button>
                );
              })}

              {filteredUsers.length === 0 && (
                <div className="py-6 text-center text-slate-400 dark:text-slate-550 text-xs">
                  No users found.
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default HorizontalSidebar;
