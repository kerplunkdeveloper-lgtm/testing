import React from "react";
import { NavLink } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { sidebarConfig } from "../../config/sidebarConfig";
import { markAllChatAsRead } from "../../features/notifications/notificationSlice";
import { clearAllUnreadCounts } from "../../features/chat/chatSlice";

const HorizontalSidebar = ({ role }) => {
  const dispatch = useDispatch();
  const { user: currentUser } = useSelector((state) => state.auth);
  const { unreadCounts = {} } = useSelector((state) => state.chat);
  const { notifications } = useSelector((state) => state.notifications);
  
  const localUnreadChatCount = Object.values(unreadCounts).reduce(
    (sum, val) => sum + (val || 0),
    0,
  );
  
  const dbUnreadChatCount = notifications
    ? notifications.filter((n) => !n.isRead && n.type === "message_received").length
    : 0;

  const totalUnreadChatCount = Math.max(localUnreadChatCount, dbUnreadChatCount);

  const menuItems = (sidebarConfig[role] || []).filter((item) => {
    if (role === "admin") return true;
    if (item.permissionKey === "manage_clients") return true;
    if (!item.permissionKey) return true;
    const perm = currentUser?.permissions?.[item.permissionKey];
    if (perm === true) return true;
    return perm?.read;
  });

  return (
    <div className="max-w-8xl w-full mx-auto mt-2 rounded-full h-14  z-40 relative px-2">
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
                      : "text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white border border-transparent"
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
        </div>
      </div>
    </div>
  );
};

export default HorizontalSidebar;
