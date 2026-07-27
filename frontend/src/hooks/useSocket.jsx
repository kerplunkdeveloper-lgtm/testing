import { useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { addNotification } from "../features/notifications/notificationSlice";
import { apiSlice } from "../features/api/apiSlice";
import { incrementUnreadCount } from "../features/chat/chatSlice";
import toast from "react-hot-toast";
import { FiBell, FiX } from "react-icons/fi";

// Global interaction listener to unlock AudioContext on first user click/tap/keypress
let audioContextUnlocked = false;
const unlockAudioContext = () => {
  if (audioContextUnlocked) return;
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") {
      audioCtx.resume().then(() => {
        audioContextUnlocked = true;
        cleanupUnlockListeners();
      });
    } else {
      audioContextUnlocked = true;
      cleanupUnlockListeners();
    }
  } catch (e) {
    console.error("Failed to unlock audio context:", e);
  }
};

const cleanupUnlockListeners = () => {
  if (typeof window !== "undefined") {
    window.removeEventListener("click", unlockAudioContext);
    window.removeEventListener("keydown", unlockAudioContext);
    window.removeEventListener("touchstart", unlockAudioContext);
  }
};

if (typeof window !== "undefined") {
  window.addEventListener("click", unlockAudioContext);
  window.addEventListener("keydown", unlockAudioContext);
  window.addEventListener("touchstart", unlockAudioContext);
}

const playNotificationSound = () => {
  const soundEnabledSetting = localStorage.getItem("soundEnabled");
  if (soundEnabledSetting === "false") {
    return;
  }
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    // Explicitly resume if suspended
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }

    const playTone = (time, freq, duration, vol) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, time);

      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(vol, time + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

      osc.start(time);
      osc.stop(time + duration);
    };

    const now = audioCtx.currentTime;
    // Premium major triad crystal bell chime (C6, E6, G6)
    playTone(now, 1046.5, 0.6, 0.08); // C6
    playTone(now + 0.05, 1318.51, 0.8, 0.06); // E6
    playTone(now + 0.1, 1567.98, 1.0, 0.05); // G6
  } catch (err) {
    console.error("Audio Context playback failed:", err);
  }
};

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
        transports: ["polling", "websocket"],
        withCredentials: true
      });

      socket.current.on("connect", () => {
        socket.current.emit("join", userId);
      });

      socket.current.on("task_updated", () => {
        dispatch(apiSlice.util.invalidateTags(["Task"]));
      });

      socket.current.on("notification", (notification) => {
        // Play premium audio chime
        playNotificationSound();

        // Sync local notification store and force RTK Query refetch so the Navbar bell updates instantly
        dispatch(addNotification(notification));
        dispatch(apiSlice.util.invalidateTags(["Notification"]));

        if (notification.type === "message_received") {
          // If it's a message, increment the sidebar chat unread count
          if (notification.chatRoomId) {
            dispatch(incrementUnreadCount(notification.chatRoomId));
          }

          // Flash tab title
          const senderName = notification.sender?.name || "Someone";
          flashTabTitle(`New Message from ${senderName}`);

          // Premium Chatting-Style Toast Card on the Top Right
          const senderImage = notification.sender?.profile?.profileImage?.url;

          toast.custom(
            (t) => (
              <div
                className={`${
                  t.visible ? "animate-enter" : "animate-leave"
                } max-w-[360px] w-full bg-white dark:bg-[#0f172a] shadow-2xl rounded-2xl pointer-events-auto flex items-start p-4 border border-slate-100 dark:border-slate-800 relative cursor-pointer`}
                onClick={() => {
                  toast.dismiss(t.id);
                  navigate(`/${user?.role}/chat?id=${notification.chatRoomId}`);
                }}
              >
                {/* Sender Image / Initials */}
                <div className="shrink-0">
                  {senderImage ? (
                    <img
                      src={senderImage}
                      alt={senderName}
                      className="w-10 h-10 rounded-full object-cover border-2 border-indigo-500/10"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-black shadow-inner">
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
                    <span className="text-[8px] font-bold text-indigo-600 dark:text-[#3b82f6] uppercase tracking-wider bg-indigo-50 dark:bg-[#3b82f6]/10 px-1.5 py-0.5 rounded-md">
                      Message
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {notification.message.replace(
                      /^New message( in General Team Chat)? from [^:]+: /,
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
              duration: 3500,
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
                <div className="flex-shrink-0 relative">
                  <div className="h-8 w-8 rounded-lg bg-indigo-50 dark:bg-slate-800 flex items-center justify-center text-indigo-600 dark:text-white shadow-sm relative z-10">
                    <FiBell size={14} />
                  </div>
                </div>

                <div className="ml-3 flex-1 min-w-0">
                  <p className="text-[9px] font-bold text-slate-400 dark:text-slate-550 tracking-wider uppercase">
                    System Alert
                  </p>
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
