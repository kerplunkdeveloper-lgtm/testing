import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiBell,
  FiCheckSquare,
  FiBriefcase,
  FiCheck,
  FiInfo,
  FiTrash2,
  FiInbox,
  FiMail,
  FiUser,
  FiFileText,
} from "react-icons/fi";
import {
  useGetNotificationsQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
} from "../../features/api/apiSlice";

const Notifications = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  // RTK Query hooks for Notifications API
  const { data: notifications = [], isLoading: loading } =
    useGetNotificationsQuery(undefined, {
      skip: !user,
      pollingInterval: 60000,
    });

  const [markAsReadTrigger] = useMarkAsReadMutation();
  const [markAllAsReadTrigger] = useMarkAllAsReadMutation();

  const [filter, setFilter] = useState("All"); // "All", "Unread", "Read"

  const handleMarkAsRead = (id) => {
    markAsReadTrigger(id);
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadTrigger();
  };

  const unreadCount = (notifications || []).filter((n) => !n.isRead).length;

  const filteredNotifications = notifications.filter((n) => {
    if (filter === "Unread") return !n.isRead;
    if (filter === "Read") return n.isRead;
    return true;
  });

  const getNotificationDetails = (n) => {
    const type = n?.type;
    const message = n?.message || "";
    if (
      type === "client_assigned" ||
      message.toLowerCase().includes("client:")
    ) {
      return {
        icon: FiUser,
        bgColor: "bg-indigo-50 text-indigo-650 border-indigo-100",
      };
    }
    if (
      type === "report_submitted" ||
      (message &&
        (message
          .toLowerCase()
          .includes("submitted a new designer eod report") ||
          message.toLowerCase().includes("submitted a new eod report")))
    ) {
      return {
        icon: FiFileText,
        bgColor: "bg-fuchsia-50 text-fuchsia-600 border-fuchsia-100",
      };
    }
    switch (type) {
      case "project_assigned":
        return {
          icon: FiBriefcase,
          bgColor: "bg-amber-50 text-amber-600 border-amber-100",
        };
      case "task_assigned":
        return {
          icon: FiCheckSquare,
          bgColor: "bg-blue-50 text-blue-600 border-blue-100",
        };
      case "task_completed":
        return {
          icon: FiCheck,
          bgColor: "bg-emerald-50 text-emerald-600 border-emerald-100",
        };
      case "task_updated":
        return {
          icon: FiInfo,
          bgColor: "bg-purple-50 text-purple-600 border-purple-100",
        };
      case "message_received":
        return {
          icon: FiMail,
          bgColor: "bg-teal-50 text-teal-600 border-teal-100",
        };
      case "report_submitted":
        return {
          icon: FiFileText,
          bgColor: "bg-fuchsia-50 text-fuchsia-600 border-fuchsia-100",
        };
      default:
        return {
          icon: FiBell,
          bgColor: "bg-slate-50 text-slate-600 border-slate-100",
        };
    }
  };

  return (
    <div className=" space-y-6 max-w-7xl mx-auto">
      {/* HEADER CARD */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full animate-pulse uppercase tracking-wider">
                {unreadCount} Unread
              </span>
            )}
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100/70 border border-blue-100 transition-all duration-200"
          >
            <FiCheck className="text-sm" />
            Mark all as read
          </button>
        )}
      </div>

      {/* FILTER CONTROLS */}
      <div className="flex gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-100 w-fit">
        {["All", "Unread", "Read"].map((tab) => {
          const count =
            tab === "All"
              ? notifications.length
              : tab === "Unread"
                ? unreadCount
                : notifications.length - unreadCount;

          return (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all duration-200 flex items-center gap-1.5 ${
                filter === tab
                  ? "bg-white text-slate-800 shadow-sm border border-slate-200/50"
                  : "text-slate-500 hover:text-slate-850"
              }`}
            >
              <span>{tab}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${
                  filter === tab
                    ? "bg-slate-150 text-slate-700"
                    : "bg-slate-200/50 text-slate-500"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* NOTIFICATIONS LIST */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
          <FiInbox
            size={42}
            className="mx-auto text-slate-300 animate-bounce"
          />
          <h3 className="mt-4 text-sm font-black text-slate-750">
            Clean Inbox!
          </h3>
          <p className="text-slate-400 text-xs mt-1">
            No {filter.toLowerCase()} notifications found.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {filteredNotifications.map((n) => {
              const details = getNotificationDetails(n);
              const Icon = details.icon;
              return (
                <motion.div
                  key={n._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => {
                    if (!n.isRead) {
                      handleMarkAsRead(n._id);
                    }
                    if (n.type === "message_received" || n.chatRoomId) {
                      navigate(`/${user?.role}/chat?id=${n.chatRoomId}`);
                    } else if (
                      n.type === "report_submitted" ||
                      (n.message &&
                        (n.message
                          .toLowerCase()
                          .includes("submitted a new designer eod report") ||
                          n.message
                            .toLowerCase()
                            .includes("submitted a new eod report")))
                    ) {
                      navigate(`/${user?.role}/eod-reports`);
                    } else if (
                      n.type === "client_assigned" ||
                      (n.message && n.message.toLowerCase().includes("client:"))
                    ) {
                      navigate(`/${user?.role}/clients`);
                    } else if (n.type === "task_assigned") {
                      navigate(`/${user?.role}/tasks`);
                    } else if (n.type?.startsWith("task_")) {
                      if (n.project) {
                        const projectId =
                          typeof n.project === "object"
                            ? n.project._id
                            : n.project;
                        navigate(`/${user?.role}/projects?id=${projectId}`);
                      } else {
                        navigate(`/${user?.role}/tasks`);
                      }
                    } else if (n.project) {
                      const projectId =
                        typeof n.project === "object"
                          ? n.project._id
                          : n.project;
                      navigate(`/${user?.role}/projects?id=${projectId}`);
                    } else {
                      navigate(`/${user?.role}/tasks`);
                    }
                  }}
                  className={`p-4 rounded-3xl border transition-all cursor-pointer flex items-start gap-4 relative group hover:shadow-md ${
                    !n.isRead
                      ? "bg-gradient-to-r from-blue-50/40 via-blue-50/20 to-white border-blue-200/60 shadow-sm"
                      : "bg-white border-slate-100 hover:bg-slate-50/50"
                  }`}
                >
                  {/* SENDER PROFILE AVATAR OR TYPE ICON */}
                  <div className="relative shrink-0">
                    {n.sender?.profile?.profileImage?.url ? (
                      <img
                        src={n.sender.profile.profileImage.url}
                        alt={n.sender.name || "User"}
                        className="w-11 h-11 rounded-full object-cover border-2 border-indigo-500/20 shadow-md"
                      />
                    ) : n.sender?.name ? (
                      <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-black shadow-md">
                        {n.sender.name.charAt(0).toUpperCase()}
                      </div>
                    ) : (
                      <div
                        className={`w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 shadow-sm ${details.bgColor}`}
                      >
                        <Icon size={18} />
                      </div>
                    )}

                    {/* Floating badge for notification type */}
                    {(n.sender?.profile?.profileImage?.url || n.sender?.name) && (
                      <div
                        className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center text-white shadow-sm ${details.bgColor}`}
                      >
                        <Icon size={10} />
                      </div>
                    )}
                  </div>

                  {/* MESSAGE AND TIME */}
                  <div className="flex-1 space-y-1.5 pr-6">
                    {n.sender?.name && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-lg border border-indigo-200/50 dark:border-indigo-800/40">
                          {n.sender.name}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          {n.type === "task_assigned" ? "Assigned task" : "Notification sent"}
                        </span>
                      </div>
                    )}

                    <p
                      className={`text-xs sm:text-sm leading-relaxed ${
                        !n.isRead
                          ? "text-slate-800 font-extrabold"
                          : "text-slate-600 font-medium"
                      }`}
                    >
                      {n.message}
                    </p>

                    <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1.5 pt-0.5">
                      <FiMail className="shrink-0 text-slate-400" size={11} />
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

                  {/* STATUS DOT / UNREAD HIGHLIGHT */}
                  {!n.isRead && (
                    <span className="absolute top-1/2 -translate-y-1/2 right-4 w-2 h-2 rounded-full bg-blue-600 shadow-lg shadow-blue-500/50 animate-pulse" />
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default Notifications;
