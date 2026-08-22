import { useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { addNotification } from "../features/notifications/notificationSlice";
import { logoutUser } from "../features/auth/authSlice";
import { apiSlice } from "../features/api/apiSlice";
import { incrementUnreadCount } from "../features/chat/chatSlice";
import toast from "react-hot-toast";
import { FiBell, FiX } from "react-icons/fi";

import { playNotificationSound } from "../utils/sound";


let titleFlashInterval = null;
let originalTitle =
  typeof document !== "undefined" ? document.title : "Project Management Tool";

const flashTabTitle = (message) => {
  if (typeof window === "undefined") return;

  // Track dynamic tab titles updated by page navigation
  const currentDocTitle = document.title;
  if (currentDocTitle && !currentDocTitle.startsWith("🔔")) {
    originalTitle = currentDocTitle;
  }

  if (window.titleFlashInterval) {
    clearInterval(window.titleFlashInterval);
  }

  let showFlash = true;
  window.titleFlashInterval = setInterval(() => {
    document.title = showFlash
      ? `🔔 ${message}`
      : originalTitle || "Project Management Tool";
    showFlash = !showFlash;
  }, 1200);
};

const clearTabTitleFlash = () => {
  if (typeof window === "undefined") return;
  if (window.titleFlashInterval) {
    clearInterval(window.titleFlashInterval);
    window.titleFlashInterval = null;
    document.title = originalTitle || "Project Management Tool";
  }
};

// Clear title flash on user activity / focus
if (typeof window !== "undefined") {
  window.addEventListener("focus", clearTabTitleFlash);
  window.addEventListener("click", clearTabTitleFlash);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      clearTabTitleFlash();
    }
  });
}

const useSocket = () => {
  const socket = useRef();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    const userId = user?._id || user?.id;
    if (user && userId) {
      const baseUrl = import.meta.env.VITE_API_BASE_URL;
      const socketUrl = baseUrl ? baseUrl : (typeof window !== 'undefined' ? window.location.origin : "http://localhost:5001");
      socket.current = io(socketUrl, {
        transports: ["websocket", "polling"],
        withCredentials: true
      });

      socket.current.on("connect", () => {
        socket.current.emit("join", userId);
      });

      socket.current.on("task_updated", () => {
        dispatch(apiSlice.util.invalidateTags(["Task"]));
      });

      socket.current.on("account_deactivated", (data) => {
        toast.error(
          data?.message || "Your account has been deactivated. Please contact your administrator.",
          { duration: 6000, id: "account-deactivated-toast" }
        );
        dispatch(logoutUser());
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("originalRole");
        localStorage.removeItem("originalAdminUser");
        localStorage.removeItem("originalAdminToken");
        window.location.href = "/";
      });

      socket.current.on("notification", (notification) => {
        // Play premium audio chime
        playNotificationSound();

        // Sync local notification store and force RTK Query refetch so the Navbar bell updates instantly
        dispatch(addNotification(notification));
        dispatch(apiSlice.util.invalidateTags(["Notification"]));

        if (
          notification.type === "message_received" ||
          notification.type === "mention_received" ||
          notification.type === "reaction_received"
        ) {
          const isMention = notification.type === "mention_received";
          const isReaction = notification.type === "reaction_received";

          // If it's a message or mention, increment the sidebar chat unread count
          if (notification.chatRoomId && !isReaction) {
            dispatch(incrementUnreadCount(notification.chatRoomId));
          }

          // Flash tab title
          const senderName = notification.sender?.name || "Someone";
          flashTabTitle(
            isReaction
              ? `${senderName} reacted to your message`
              : isMention
              ? `🔔 ${senderName} mentioned you!`
              : `New Message from ${senderName}`
          );

          // Premium Chatting-Style Toast Card on the Top Right
          const senderImage = notification.sender?.profile?.profileImage?.url;

          toast.custom(
            (t) => (
              <div
                className={`${
                  t.visible ? "animate-enter" : "animate-leave"
                } max-w-[360px] w-full bg-white dark:bg-[#0f172a] shadow-2xl rounded-2xl pointer-events-auto flex items-start p-4 border ${
                  isReaction
                    ? "border-amber-300/80 dark:border-amber-600/40 bg-gradient-to-r from-amber-50/40 to-transparent dark:from-amber-950/20"
                    : isMention
                    ? "border-amber-400/60 dark:border-amber-500/40 bg-gradient-to-r from-amber-50/30 to-transparent dark:from-amber-950/20"
                    : "border-slate-100 dark:border-slate-800"
                } relative cursor-pointer`}
                onClick={() => {
                  toast.dismiss(t.id);
                  const targetUrl = `/${user?.role}/chat?id=${notification.chatRoomId}${notification.messageId ? `&messageId=${notification.messageId}` : ''}`;
                  navigate(targetUrl);
                }}
              >
                {/* Sender Image / Initials */}
                <div className="shrink-0">
                  {senderImage ? (
                    <img
                      src={senderImage}
                      alt={senderName}
                      className={`w-10 h-10 rounded-full object-cover border-2 ${
                        isReaction
                          ? "border-amber-400"
                          : isMention
                          ? "border-amber-500"
                          : "border-indigo-500/10"
                      }`}
                    />
                  ) : (
                    <div className={`w-10 h-10 rounded-full ${
                      isReaction
                        ? "bg-gradient-to-tr from-amber-400 to-orange-500"
                        : isMention
                        ? "bg-gradient-to-tr from-amber-500 to-orange-600"
                        : "bg-gradient-to-tr from-indigo-500 to-purple-600"
                    } flex items-center justify-center text-white text-xs font-black shadow-inner`}>
                      {senderName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Chat Message details */}
                <div className="ml-3 flex-1 min-w-0 pr-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-black text-slate-800 dark:text-slate-100 truncate">
                      {senderName}
                    </p>
                    {isReaction ? (
                      <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/50">
                        Reaction
                      </span>
                    ) : isMention ? (
                      <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md ${
                        notification.message.includes("@all")
                          ? "bg-amber-500 text-white shadow-xs"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                      }`}>
                        {notification.message.includes("@all") ? "📢 @ALL" : "@Mention"}
                      </span>
                    ) : (
                      <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md text-indigo-600 dark:text-[#3b82f6] bg-indigo-50 dark:bg-[#3b82f6]/10">
                        Message
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {isReaction
                      ? notification.message
                      : notification.message.replace(
                          /^New message( in [^:]+)? from [^:]+: /,
                          "",
                        )}
                  </p>
                </div>

                {/* Dismiss Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toast.dismiss(t.id);
                  }}
                  className="absolute top-3 right-3 w-5 h-5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-white transition-colors"
                >
                  <FiX size={12} />
                </button>
              </div>
            ),
            {
              duration: 4000,
              position: "top-right",
            },
          );
        } else {
          // Flash tab title for system notifications
          flashTabTitle(`New Alert: ${notification.message}`);

          // Standard Alert Toast
          toast.custom(
            (t) => (
              <div
                className={`${
                  t.visible ? "animate-enter" : "animate-leave"
                } max-w-[340px] w-full bg-white dark:bg-[#0f172a] shadow-xl border border-slate-200/60 dark:border-slate-800/80 rounded-xl pointer-events-auto flex items-center p-3 pr-8 relative cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50`}
                onClick={() => {
                  toast.dismiss(t.id);
                  if (
                    notification.type === "client_assigned" ||
                    (notification.message &&
                      notification.message.toLowerCase().includes("client:"))
                  ) {
                    navigate(`/${user?.role}/clients`);
                  } else if (notification.type?.startsWith("task_")) {
                    if (notification.project) {
                      const projectId = typeof notification.project === 'object' ? notification.project._id : notification.project;
                      navigate(`/${user?.role}/projects?id=${projectId}`);
                    } else {
                      navigate(`/${user?.role}/tasks`);
                    }
                  }
                }}
              >
                {/* Sender Avatar or Icon */}
                <div className="flex-shrink-0 relative">
                  {notification.sender?.profile?.profileImage?.url ? (
                    <img
                      src={notification.sender.profile.profileImage.url}
                      alt={notification.sender.name || "User"}
                      className="h-9 w-9 rounded-full object-cover border-2 border-indigo-500/20 shadow-sm"
                    />
                  ) : notification.sender?.name ? (
                    <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white text-xs font-black shadow-sm">
                      {notification.sender.name.charAt(0).toUpperCase()}
                    </div>
                  ) : (
                    <div className="h-9 w-9 rounded-xl bg-indigo-50 dark:bg-slate-800 flex items-center justify-center text-indigo-600 dark:text-white shadow-sm">
                      <FiBell size={14} />
                    </div>
                  )}
                </div>

                <div className="ml-3 flex-1 min-w-0">
                  {notification.sender?.name ? (
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 truncate">
                        {notification.sender.name}
                      </span>
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">
                        • {notification.type === "task_assigned" ? "Assigned task" : "Alert"}
                      </span>
                    </div>
                  ) : (
                    <p className="text-[9px] font-bold text-slate-400 dark:text-slate-550 tracking-wider uppercase">
                      System Alert
                    </p>
                  )}
                  <p className="mt-0.5 text-[11px] font-bold text-slate-800 dark:text-slate-100 leading-normal">
                    {notification.message}
                  </p>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toast.dismiss(t.id);
                  }}
                  className="absolute top-2.5 right-2.5 w-5 h-5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 transition-colors"
                >
                  <FiX size={12} />
                </button>
              </div>
            ),
            {
              duration: 3000,
              position: "bottom-right",
            },
          );
        }
      });

      return () => {
        if (socket.current) {
          socket.current.disconnect();
        }
      };
    }
  }, [user, dispatch]);

  return socket.current;
};

export default useSocket;
