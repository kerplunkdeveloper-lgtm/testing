import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useSearchParams } from "react-router-dom";
import { getUsers } from "../../features/users/userSlice";
import { markAsRead } from "../../features/notifications/notificationSlice";
import {
  fetchDirectMessages,
  fetchGroupMessages,
  sendMessageAction,
  receiveMessage,
  removeMessage,
  clearMessages,
  deleteMessageAction,
  fetchRooms,
  createRoomAction,
  updateRoomAction,
  deleteRoomAction,
  markChatAsRead,
  fetchLastMessages,
  setActiveChatId,
  clearChatAction,
  clearChatLocal,
  updateMessageSeen,
  toggleReactionAction,
  updateMessageReaction,
} from "../../features/chat/chatSlice";
import {
  FiSend,
  FiUser,
  FiVideo,
  FiPhone,
  FiSmile,
  FiSearch,
  FiChevronLeft,
  FiCalendar,
  FiVideoOff,
  FiMic,
  FiMicOff,
  FiCamera,
  FiMessageSquare,
  FiLayers,
  FiPlus,
  FiSettings,
  FiX,
  FiUsers,
  FiTrash2,
  FiLogOut,
  FiDownload,
  FiFileText,
  FiPaperclip,
  FiCornerUpLeft,
  FiArrowRight,
  FiShare2,
  FiMonitor,
  FiCopy,
  FiAtSign,
  FiCheck,
  FiCheckCircle,
  FiMoreVertical,
} from "react-icons/fi";
import io from "socket.io-client";
import toast from "react-hot-toast";
import axiosInstance from "../../services/axiosInstance";
import { motion, AnimatePresence } from "framer-motion";
import { FiMail, FiInfo, FiEye } from "react-icons/fi";
import grouplogo from "../../assets/grouplogo.png";
import notificationSound from "../../assets/notification.mp3";
import { playDirectMessageSound, playGroupMessageSound } from "../../utils/sound";

const formatDateSeparator = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const isToday =
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();

  if (isToday) return "Today";

  const isYesterday =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear();

  if (isYesterday) return "Yesterday";

  const isSameYear = d.getFullYear() === today.getFullYear();
  if (isSameYear) {
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }

  return d.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const isDifferentDay = (d1Str, d2Str) => {
  if (!d1Str || !d2Str) return true;
  const d1 = new Date(d1Str);
  const d2 = new Date(d2Str);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return true;
  return (
    d1.getDate() !== d2.getDate() ||
    d1.getMonth() !== d2.getMonth() ||
    d1.getFullYear() !== d2.getFullYear()
  );
};

const displayRole = (role) => {
  if (!role) return "Member";
  if (role === "admin") return "Admin";
  if (role === "client") return "Client";
  if (role === "team") return "Team Member";
  return role.charAt(0).toUpperCase() + role.slice(1);
};

const EMOJIS = [
  "😀",
  "😃",
  "😄",
  "😁",
  "😆",
  "😅",
  "😂",
  "🤣",
  "😊",
  "😇",
  "🙂",
  "🙃",
  "😉",
  "😌",
  "😍",
  "🥰",
  "😘",
  "😗",
  "😙",
  "😚",
  "😋",
  "😛",
  "😝",
  "😜",
  "😜",
  "🧐",
  "🤓",
  "😎",
  "🤩",
  "🥳",
  "😏",
  "😒",
  "😞",
  "😔",
  "😟",
  "😕",
  "🙁",
  "☹️",
  "😣",
  "😖",
  "😫",
  "😩",
  "🥺",
  "😢",
  "😭",
  "😤",
  "😠",
  "😡",
  "🤬",
  "🤯",
  "😳",
  "🥵",
  "🥶",
  "😱",
  "😨",
  "😰",
  "😥",
  "😓",
  "🤗",
  "🤔",
  "🤭",
  "🤫",
  "🤥",
  "😶",
  "😐",
  "😑",
  "😬",
  "🙄",
  "🔥",
  "👍",
  "👎",
  "👏",
  "🙌",
  "🙏",
  "🤝",
  "❤️",
  "💔",
  "💖",
  "✨",
  "🎉",
  "🚀",
  "💡",
  "💯",
];

const STICKERS = [
  "👾",
  "🛸",
  "🦄",
  "🐼",
  "🦊",
  "🦁",
  "🐰",
  "🐱",
  "🐶",
  "🐯",
  "🐨",
  "🐷",
  "🐸",
  "🐵",
  "🐒",
  "🐔",
  "🐧",
  "🐦",
  "🦆",
  "🦅",
  "🦉",
  "🦇",
  "🐺",
  "🐗",
  "🐴",
  "🐝",
  "🐛",
  "🦋",
  "🐌",
  "🐞",
  "🐜",
  "🕷️",
  "🦂",
  "🐢",
  "🐍",
  "🦎",
  "🐙",
  "🦑",
  "🦞",
  "🦀",
  "🐡",
  "🐠",
  "🐟",
  "🐬",
  "🐳",
  "🐋",
  "🦈",
  "🐊",
  "🐅",
  "🐆",
  "🦓",
  "🦍",
  "🐘",
  "🦛",
  "🦏",
  "🐪",
  "🐫",
  "🦒",
  "🦘",
  "🐃",
  "🐂",
  "🐄",
  "🐎",
  "🐖",
  "🐏",
  "🐑",
  "🐐",
  "🦌",
  "🐕",
  "🐩",
  "🐈",
  "🐓",
  "🦃",
  "🕊️",
  "🐇",
  "🐁",
  "🐀",
  "🐿️",
  "🦔",
];

const ChatPage = () => {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const { users } = useSelector((s) => s.users);
  const { user } = useSelector((s) => s.auth);
  const currentUserId = user?._id || user?.id;
  const {
    messages,
    rooms,
    loading,
    loadingOlder,
    hasMoreGroupMessages,
    unreadCounts = {},
    lastMessages = {},
  } = useSelector((s) => s.chat);

  const [activeChat, setActiveChat] = useState("group"); // 'group' or custom roomId or userId
  const [sidebarTab, setSidebarTab] = useState("groups"); // 'groups' | 'direct'
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDept, setSelectedDept] = useState("All");
  const [inputText, setInputText] = useState("");
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [showChatWindowMobile, setShowChatWindowMobile] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]); // Array of online userIds
  const [userPresence, setUserPresence] = useState({}); // userId -> { status, lastSeen }

  // Group Member Presence Panel State
  const [showMembersDrawer, setShowMembersDrawer] = useState(false);
  const [memberSearchTerm, setMemberSearchTerm] = useState("");

  // Group @Mention System State (Group Chat Only)
  const [mentionQuery, setMentionQuery] = useState(null); // string or null
  const [mentionIndex, setMentionIndex] = useState(0);
  const [mentions, setMentions] = useState([]); // [{ userId, username }]

  // Seen By Modal State (Group Chat Only)
  const [seenModalMessage, setSeenModalMessage] = useState(null);

  const groupUnreadTotal = React.useMemo(() => {
    let count = unreadCounts["group"] || 0;
    (rooms || []).forEach((r) => {
      count += unreadCounts[r._id] || 0;
    });
    return count;
  }, [unreadCounts, rooms]);

  const directUnreadTotal = React.useMemo(() => {
    let count = 0;
    (users || []).forEach((u) => {
      if (u._id !== currentUserId) {
        count += unreadCounts[u._id] || 0;
      }
    });
    return count;
  }, [unreadCounts, users, currentUserId]);

  // New Reply, Forward & Share State
  const [replyingToMessage, setReplyingToMessage] = useState(null);
  const [forwardingMessage, setForwardingMessage] = useState(null);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [forwardSearchTerm, setForwardSearchTerm] = useState("");
  const [showShareMenu, setShowShareMenu] = useState(null);
  const [sharingMessage, setSharingMessage] = useState(null);

  // Message Options & Reaction State
  const [reactionPickerMessage, setReactionPickerMessage] = useState(null);
  const [activeOptionsDropdown, setActiveOptionsDropdown] = useState(null);
  const [showFullEmojiReactionModal, setShowFullEmojiReactionModal] =
    useState(null);

  // Group Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);

  // Group Form Data
  const [groupName, setGroupName] = useState("");
  const [groupDesc, setGroupDesc] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);

  // Manage Group Form Data
  const [manageGroupName, setManageGroupName] = useState("");
  const [manageGroupDesc, setManageGroupDesc] = useState("");
  const [manageSelectedMembers, setManageSelectedMembers] = useState([]);

  // Call System State
  const { notifications } = useSelector((state) => state.notifications);
  const [activeCall, setActiveCall] = useState(null); // 'video' or 'voice' or null
  const [callRoomId, setCallRoomId] = useState("");
  const [uploadingFile, setUploadingFile] = useState(false);
  const [activeMessageMenu, setActiveMessageMenu] = useState(null);
  const [profileModalUser, setProfileModalUser] = useState(null);

  const zegoInitializedRef = useRef(false);
  const zegoInstanceRef = useRef(null);

  const socketRef = useRef();
  const messagesEndRef = useRef();
  const messagesContainerRef = useRef(null);
  const fileInputRef = useRef();
  const inputRef = useRef(null);
  const isGroupType =
    activeChat === "group" || rooms.some((r) => r._id === activeChat);

  // Group Members calculation
  const currentGroupMembers = React.useMemo(() => {
    if (!isGroupType) return [];
    if (activeChat === "group") {
      return users || [];
    }
    const room = rooms.find((r) => r._id === activeChat);
    return room?.members || [];
  }, [isGroupType, activeChat, users, rooms]);

  // Local filter for @mentions (Group chat only, zero API calls)
  const filteredMentionMembers = React.useMemo(() => {
    if (mentionQuery === null || !isGroupType) return [];
    const q = mentionQuery.toLowerCase();
    const members = currentGroupMembers.filter(
      (m) =>
        m._id !== currentUserId &&
        (m.name?.toLowerCase().includes(q) ||
          m.role?.toLowerCase().includes(q) ||
          m.department?.toLowerCase().includes(q)),
    );

    // If query is empty or matches 'all' / 'everyone', include special @all option at top
    const showAllOption =
      "all".includes(q) || "everyone".includes(q) || q === "";
    if (showAllOption) {
      const allOption = {
        _id: "all",
        isAll: true,
        name: "all",
        role: "Notify everyone in this room",
      };
      return [allOption, ...members];
    }

    return members;
  }, [mentionQuery, isGroupType, currentGroupMembers, currentUserId]);

  // Live Presence Helpers
  const isMemberOnline = useCallback(
    (memberId) => {
      if (!memberId) return false;
      const idStr = memberId.toString();
      return (
        onlineUsers.includes(idStr) || userPresence[idStr]?.status === "online"
      );
    },
    [onlineUsers, userPresence],
  );

  const formatMemberLastSeen = useCallback(
    (memberId, fallbackLastSeen) => {
      if (!memberId) return "Offline";
      const idStr = memberId.toString();
      if (isMemberOnline(idStr)) return "Online";
      const lastSeenDate = userPresence[idStr]?.lastSeen || fallbackLastSeen;
      if (!lastSeenDate) return "Offline";
      const d = new Date(lastSeenDate);
      if (isNaN(d.getTime())) return "Offline";
      const diffMs = Date.now() - d.getTime();
      const diffMin = Math.floor(diffMs / 60000);
      if (diffMin < 1) return "Just now";
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHrs = Math.floor(diffMin / 60);
      if (diffHrs < 24) return `${diffHrs}h ago`;
      return d.toLocaleDateString([], { month: "short", day: "numeric" });
    },
    [isMemberOnline, userPresence],
  );

  // Batch and debounce seen message emissions
  const seenBufferRef = useRef(new Set());
  const seenTimeoutRef = useRef(null);

  const flushSeenBuffer = useCallback(() => {
    if (seenBufferRef.current.size > 0 && socketRef.current) {
      const messageIds = Array.from(seenBufferRef.current);
      seenBufferRef.current.clear();
      socketRef.current.emit("message:seen", {
        messageIds,
        chatRoom: isGroupType ? activeChat : "direct",
      });
    }
  }, [activeChat, isGroupType]);

  const markMessageAsSeen = useCallback(
    (messageId) => {
      if (!messageId) return;
      seenBufferRef.current.add(messageId);
      if (seenTimeoutRef.current) clearTimeout(seenTimeoutRef.current);
      seenTimeoutRef.current = setTimeout(flushSeenBuffer, 300);
    },
    [flushSeenBuffer],
  );

  // Join existing Call Room via clicked meeting invitation
  const joinCallRoom = useCallback(async (roomId, type) => {
    setCallRoomId(roomId);
    setActiveCall(type);
    toast.success("Joined Meeting");
  }, []);

  // End call and destroy Zego instance
  const endCall = useCallback(async () => {
    if (zegoInstanceRef.current) {
      try {
        zegoInstanceRef.current.destroy();
      } catch (e) {
        console.error("Error destroying Zego instance:", e);
      }
      zegoInstanceRef.current = null;
    }
    setActiveCall(null);
    setCallRoomId("");
    zegoInitializedRef.current = false;
    toast.success("Call Ended");
  }, []);

  // Start Zego Video/Audio Call
  const startCall = async (type) => {
    const roomId =
      activeChat === "group" || rooms.some((r) => r._id === activeChat)
        ? activeChat
        : [currentUserId, activeChat].sort().join("-");

    setCallRoomId(roomId);
    setActiveCall(type);

    // Automatically post a join button link to the room
    const isGroupType =
      activeChat === "group" || rooms.some((r) => r._id === activeChat);
    const payload = {
      recipient: isGroupType ? null : activeChat,
      chatRoom: isGroupType ? activeChat : "direct",
      text: `📞 Join my live ${type === "video" ? "Video Meet" : "Audio Call"}! Room ID: ${roomId}`,
      messageType: "text",
    };
    await dispatch(sendMessageAction(payload)).unwrap();
    toast.success("Meeting Started");
  };

  // Sync active chat ID to Redux state so the reducer can route messages properly
  useEffect(() => {
    dispatch(setActiveChatId(activeChat));
  }, [activeChat, dispatch]);

  // Load chat query param & handle auto-joining call via link
  useEffect(() => {
    const queryId = searchParams.get("id");
    if (queryId) {
      setActiveChat(queryId);
      setShowChatWindowMobile(true);
    }
    const queryRoomId = searchParams.get("roomID");
    const queryType = searchParams.get("type");
    if (queryRoomId && queryType) {
      joinCallRoom(queryRoomId, queryType);
    }
  }, [searchParams, joinCallRoom]);

  // Auto-mark notifications and chat as read when active chat is open
  useEffect(() => {
    if (activeChat) {
      dispatch(setActiveChatId(activeChat));
      dispatch(markChatAsRead(activeChat));

      if (notifications && notifications.length > 0) {
        notifications.forEach((n) => {
          if (
            !n.isRead &&
            n.type === "message_received" &&
            n.chatRoomId === activeChat
          ) {
            dispatch(markAsRead(n._id));
          }
        });
      }
    }
  }, [activeChat, dispatch, notifications]);

  // Load directories and rooms
  useEffect(() => {
    dispatch(getUsers());
    dispatch(fetchRooms());
    dispatch(fetchLastMessages());
  }, [dispatch]);

  // Use a ref for rooms so the chat loading effect doesn't re-run when rooms list updates
  const roomsRef = useRef(rooms);
  useEffect(() => {
    roomsRef.current = rooms;
  }, [rooms]);

  // Load chat history on activeChat change ONLY (not on rooms change)
  useEffect(() => {
    const isGroupType =
      activeChat === "group" ||
      roomsRef.current.some((r) => r._id === activeChat);
    if (isGroupType) {
      dispatch(fetchGroupMessages(activeChat));
    } else {
      dispatch(fetchDirectMessages(activeChat));
    }
  }, [activeChat, dispatch]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Socket Connection & Real-Time Listeners
  useEffect(() => {
    const apiBase =
      import.meta.env.VITE_API_BASE_URL || "http://localhost:5001";
    socketRef.current = io(apiBase, {
      transports: ["websocket", "polling"],
      withCredentials: true,
    });

    const performJoin = () => {
      if (currentUserId) {
        socketRef.current.emit("join", currentUserId);
        console.log(`Socket joined room: ${currentUserId}`);
      }
    };

    // If socket is already connected when listener is registered, join immediately
    if (socketRef.current.connected) {
      performJoin();
    }

    socketRef.current.on("connect", performJoin);

    const showNewMessageToast = (msg) => {

      toast.custom(
        (t) => (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`${
              t.visible ? "animate-enter" : "animate-leave"
            } max-w-sm w-full bg-white dark:bg-slate-900 shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.3)] rounded-2xl pointer-events-auto flex ring-1 ring-black/5 dark:ring-white/10 overflow-hidden backdrop-blur-xl`}
          >
            <div className="flex-1 w-0 p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 pt-0.5 relative">
                  {msg.sender?.profile?.profileImage?.url ? (
                    <img
                      className="h-11 w-11 rounded-full object-cover shadow-sm border border-slate-100 dark:border-slate-800"
                      src={msg.sender.profile.profileImage.url}
                      alt={msg.sender?.name}
                    />
                  ) : (
                    <div className="h-11 w-11 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                      {msg.sender?.name?.charAt(0) || "U"}
                    </div>
                  )}
                  <span className="absolute bottom-0 right-0 block h-3 w-3 rounded-full ring-2 ring-white dark:ring-slate-900 bg-emerald-500"></span>
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between">
                    {msg.sender?.name}
                    <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                      Just now
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {msg.messageType === "file"
                      ? `📁 Sent a file: ${msg.file?.filename || ""}`
                      : msg.messageType === "sticker"
                        ? `🎨 Sent a sticker: ${msg.sticker}`
                        : msg.messageType === "call"
                          ? "📞 Started a call"
                          : msg.text}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex border-l border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-800/30">
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  setActiveChat(
                    msg.chatRoom === "direct" ? msg.sender._id : msg.chatRoom,
                  );
                  setShowChatWindowMobile(true);
                }}
                className="w-full border border-transparent rounded-none rounded-r-2xl px-4 py-3 flex flex-col items-center justify-center text-xs font-bold text-blue-600 dark:text-[#3b82f6] hover:bg-blue-100/50 dark:hover:bg-blue-900/30 focus:outline-none transition-colors"
              >
                <FiMessageSquare className="mb-1" size={16} />
                View
              </button>
            </div>
          </motion.div>
        ),
        { position: "top-right", duration: 5000 },
      );
    };

    socketRef.current.on("direct_message", (msg) => {
      dispatch(
        receiveMessage({
          message: msg,
          currentUserId,
        }),
      );
      if (msg.sender?._id !== currentUserId) {
        playDirectMessageSound();
        if (activeChatRef.current !== msg.sender?._id) {
          showNewMessageToast(msg);
        }
      }
    });

    socketRef.current.on("group_message", (msg) => {
      dispatch(
        receiveMessage({
          message: msg,
          currentUserId,
        }),
      );
      if (msg.sender?._id !== currentUserId) {
        playGroupMessageSound();
        if (activeChatRef.current !== msg.chatRoom) {
          showNewMessageToast(msg);
        }
      }
    });

    socketRef.current.on("message_deleted", ({ messageId }) => {
      dispatch(removeMessage(messageId));
    });

    socketRef.current.on("chat_cleared", ({ otherUserId }) => {
      dispatch(clearChatLocal(otherUserId));
    });

    // Track online/offline users
    socketRef.current.on("online_users_list", (userIds) => {
      setOnlineUsers(userIds || []);
    });

    // Receive full initial presence state
    socketRef.current.on("presence_state", (presenceMap) => {
      if (presenceMap && typeof presenceMap === "object") {
        setUserPresence(presenceMap);
      }
    });

    // Receive individual user presence updates
    socketRef.current.on("user:presence", ({ userId, status, lastSeen }) => {
      if (userId) {
        setUserPresence((prev) => ({
          ...prev,
          [userId]: {
            status,
            lastSeen: lastSeen ? new Date(lastSeen) : new Date(),
          },
        }));
      }
    });

    // Receive real-time group message seen updates
    socketRef.current.on("message:seen:update", (data) => {
      dispatch(updateMessageSeen(data));
    });

    // Receive real-time message reactions
    socketRef.current.on("message:reaction", (data) => {
      dispatch(updateMessageReaction(data));
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [currentUserId, dispatch]);

  // Click outside to close message dropdowns & reaction bars
  useEffect(() => {
    const handleDocClick = () => {
      setActiveOptionsDropdown(null);
      setReactionPickerMessage(null);
    };
    window.addEventListener("click", handleDocClick);
    return () => window.removeEventListener("click", handleDocClick);
  }, []);

  // Zego Meeting Container Callback Ref
  const zegoMeetingRef = useCallback(
    (element) => {
      if (!element) {
        zegoInitializedRef.current = false;
        return;
      }
      if (zegoInitializedRef.current) return;
      zegoInitializedRef.current = true;

      const initZego = async () => {
        try {
          const appID = parseInt(import.meta.env.VITE_ZEGO_APP_ID);
          const serverSecret = import.meta.env.VITE_ZEGO_SERVER_SECRET;

          if (!appID || !serverSecret) {
            toast.error(
              "Zego App ID or Server Secret is missing. Please check .env",
            );
            return;
          }

          const { ZegoUIKitPrebuilt } =
            await import("@zegocloud/zego-uikit-prebuilt");

          const room =
            callRoomId || "room_" + Math.random().toString(36).substring(7);
          const uID =
            currentUserId || "user_" + Math.random().toString(36).substring(7);
          const uName = user?.name || `User_${uID.slice(-4)}`;

          const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
            appID,
            serverSecret,
            room,
            uID,
            uName,
          );

          const zp = ZegoUIKitPrebuilt.create(kitToken);
          zegoInstanceRef.current = zp;

          zp.joinRoom({
            container: element,
            sharedLinks: [
              {
                name: "Join Link",
                url: `${window.location.origin}${window.location.pathname}?id=${activeChat}&roomID=${room}&type=${activeCall}`,
              },
            ],
            scenario: {
              mode: ZegoUIKitPrebuilt.GroupCall, // GroupCall supports multi-user video/audio calling
            },
            showPreJoinView: false,
            turnOnMicrophoneWhenJoining: true,
            turnOnCameraWhenJoining: activeCall === "video",
            showMyCameraToggleButton: true,
            showMyMicrophoneToggleButton: true,
            showAudioVideoSettingsButton: true,
            showScreenSharingButton: true,
            showUserList: true,
            showTextChat: false,
            onLeaveRoom: () => {
              endCall();
            },
          });
        } catch (err) {
          console.error("Zego initialization error:", err);
          toast.error("Failed to start call");
        }
      };

      initZego();
    },
    [callRoomId, activeCall, currentUserId, user, activeChat, endCall],
  );

  // Messages form handles
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      return toast.error("File is too large. Max size is 50MB.");
    }

    const isGroupType =
      activeChat === "group" || rooms.some((r) => r._id === activeChat);
    const formData = new FormData();
    formData.append("file", file);

    setUploadingFile(true);
    const toastId = toast.loading(`Uploading "${file.name}"...`);

    try {
      const res = await axiosInstance.post("/messages/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const fileData = res.data.data;

      const payload = {
        recipient: isGroupType ? null : activeChat,
        chatRoom: isGroupType ? activeChat : "direct",
        messageType: "file",
        file: fileData,
        text: `Sent a file: ${fileData.filename}`,
      };

      await dispatch(sendMessageAction(payload)).unwrap();
      toast.success("File sent successfully!", { id: toastId });
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(error.response?.data?.message || "File upload failed", {
        id: toastId,
      });
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    const cursorPos = e.target.selectionStart;
    setInputText(val);

    // Mentions are only active inside Group Chats
    if (!isGroupType) {
      setMentionQuery(null);
      return;
    }

    const textBeforeCursor = val.slice(0, cursorPos);
    const lastAtIdx = textBeforeCursor.lastIndexOf("@");

    if (lastAtIdx !== -1) {
      const charBeforeAt =
        lastAtIdx > 0 ? textBeforeCursor[lastAtIdx - 1] : " ";
      const textAfterAt = textBeforeCursor.slice(lastAtIdx + 1);

      // Check if cursor is right after @ or typing a query without whitespace
      if (
        (charBeforeAt === " " || charBeforeAt === "\n" || lastAtIdx === 0) &&
        !textAfterAt.includes(" ")
      ) {
        setMentionQuery(textAfterAt);
        setMentionIndex(0);
        return;
      }
    }

    setMentionQuery(null);
  };

  const handleSelectMention = (member) => {
    if (!member) return;
    const cursorPos = inputRef.current
      ? inputRef.current.selectionStart
      : inputText.length;
    const textBeforeCursor = inputText.slice(0, cursorPos);
    const textAfterCursor = inputText.slice(cursorPos);
    const lastAtIdx = textBeforeCursor.lastIndexOf("@");

    if (lastAtIdx !== -1) {
      const newText =
        textBeforeCursor.slice(0, lastAtIdx) +
        `@${member.name} ` +
        textAfterCursor;
      setInputText(newText);
      setMentions((prev) => {
        const exists = prev.some((m) => m.userId === member._id);
        if (!exists) {
          return [...prev, { userId: member._id, username: member.name }];
        }
        return prev;
      });
    }

    setMentionQuery(null);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleInputKeyDown = (e) => {
    if (mentionQuery !== null && filteredMentionMembers.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIndex((prev) => (prev + 1) % filteredMentionMembers.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIndex(
          (prev) =>
            (prev - 1 + filteredMentionMembers.length) %
            filteredMentionMembers.length,
        );
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        handleSelectMention(filteredMentionMembers[mentionIndex]);
      } else if (e.key === "Escape") {
        e.preventDefault();
        setMentionQuery(null);
      }
    }
  };

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    const trimmedText = inputText.trim();
    if (!trimmedText) return;

    const isSingleSticker =
      STICKERS.includes(trimmedText) || EMOJIS.includes(trimmedText);

    // Filter mentions to only those currently present in the text
    let activeMentions = isGroupType
      ? mentions.filter((m) => inputText.includes(`@${m.username}`))
      : [];

    // Automatically ensure @all is captured if present in text
    if (
      isGroupType &&
      (/\B@all\b/i.test(inputText) || /\B@everyone\b/i.test(inputText))
    ) {
      if (!activeMentions.some((m) => m.username === "all")) {
        activeMentions.push({ userId: "all", username: "all" });
      }
    }

    const payload = {
      recipient: isGroupType ? null : activeChat,
      chatRoom: isGroupType ? activeChat : "direct",
      ...(isSingleSticker
        ? { sticker: trimmedText, messageType: "sticker" }
        : { text: inputText, messageType: "text" }),
      replyTo: replyingToMessage?._id || null,
      mentions: activeMentions,
    };

    setInputText("");
    setMentions([]);
    setMentionQuery(null);
    setReplyingToMessage(null);
    await dispatch(sendMessageAction(payload)).unwrap();
  };

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight } = e.currentTarget;
    if (
      scrollTop === 0 &&
      hasMoreGroupMessages &&
      !loadingOlder &&
      isGroupType &&
      messages.length > 0
    ) {
      const oldestMessage = messages[0];
      if (oldestMessage && oldestMessage.createdAt) {
        const prevScrollHeight = scrollHeight;
        dispatch(
          fetchGroupMessages({
            roomId: activeChat,
            before: oldestMessage.createdAt,
            isLoadMore: true,
          }),
        ).then(() => {
          if (messagesContainerRef.current) {
            const newScrollHeight = messagesContainerRef.current.scrollHeight;
            messagesContainerRef.current.scrollTop =
              newScrollHeight - prevScrollHeight;
          }
        });
      }
    }
  };

  const renderMessageContentWithMentions = (text, messageMentions) => {
    if (!text) return null;
    const allMentions = messageMentions || [];
    const mentionNames = allMentions.map((m) => m.username).filter(Boolean);

    // Also include 'all' and 'everyone' in recognized mentions
    if (!mentionNames.includes("all")) mentionNames.push("all");
    if (!mentionNames.includes("everyone")) mentionNames.push("everyone");

    const regex = new RegExp(
      `(@(?:${mentionNames.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")}))`,
      "gi",
    );
    const parts = text.split(regex);

    return parts.map((part, i) => {
      if (part.startsWith("@")) {
        const lowerPart = part.toLowerCase();
        if (
          lowerPart === "@all" ||
          lowerPart === "@everyone" ||
          lowerPart === "@channel"
        ) {
          return (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-black text-amber-900 dark:text-amber-200 bg-amber-100/90 dark:bg-amber-950/70 border border-amber-300/80 dark:border-amber-700/60 text-[11px] mx-0.5 select-none shadow-2xs"
            >
              📢 {part}
            </span>
          );
        }

        const cleanName = part.slice(1).trim().toLowerCase();
        if (mentionNames.some((n) => n.toLowerCase() === cleanName)) {
          return (
            <span
              key={i}
              className="inline-flex items-center px-1.5 py-0.5 rounded-md font-bold text-blue-600 dark:text-[#3b82f6] bg-blue-50/80 dark:bg-[#3b82f6]/15 text-[11px] mx-0.5 select-none"
            >
              {part}
            </span>
          );
        }
      }
      return part;
    });
  };

  const handleToggleReaction = async (messageId, emoji) => {
    try {
      await dispatch(toggleReactionAction({ messageId, emoji })).unwrap();
    } catch (err) {
      toast.error(err || "Failed to update reaction");
    }
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      await dispatch(deleteMessageAction(messageId)).unwrap();
      toast.success("Message deleted");
    } catch (err) {
      toast.error(err || "Failed to delete message");
    }
  };

  const handleForwardSubmit = async (targetId, type) => {
    if (!forwardingMessage) return;

    const payload = {
      recipient: type === "direct" ? targetId : null,
      chatRoom: type === "group" ? targetId : "direct",
      messageType: forwardingMessage.messageType,
      text: forwardingMessage.text,
      sticker: forwardingMessage.sticker,
      file: forwardingMessage.file,
    };

    try {
      await dispatch(sendMessageAction(payload)).unwrap();
      toast.success("Message forwarded");
      setShowForwardModal(false);
      setForwardingMessage(null);
      setForwardSearchTerm("");
    } catch (err) {
      toast.error(err || "Failed to forward message");
    }
  };

  const handleShareExternal = (msg, platform) => {
    let shareText = "";
    if (msg.messageType === "file" && msg.file) {
      shareText = `Shared File: ${msg.file.filename}\nLink: ${msg.file.url}`;
    } else if (msg.messageType === "sticker") {
      shareText = `Shared Sticker: ${msg.sticker}`;
    } else {
      shareText = msg.text;
    }

    if (platform === "whatsapp") {
      const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
      window.open(url, "_blank");
    } else if (platform === "email") {
      const url = `mailto:?subject=Shared Chat Message&body=${encodeURIComponent(shareText)}`;
      window.open(url, "_blank");
    }
    setShowShareMenu(null);
  };

  // Create Group Room Action
  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!groupName.trim()) {
      return toast.error("Please enter a group name");
    }

    try {
      const result = await dispatch(
        createRoomAction({
          name: groupName,
          description: groupDesc,
          members: selectedMembers,
        }),
      ).unwrap();

      toast.success("Group created successfully!");
      setActiveChat(result._id);
      setShowCreateModal(false);
      setGroupName("");
      setGroupDesc("");
      setSelectedMembers([]);
    } catch (err) {
      toast.error(err || "Failed to create group");
    }
  };

  // Open Manage Members overlay
  const handleOpenManageModal = () => {
    const activeRoomObj = rooms.find((r) => r._id === activeChat);
    if (!activeRoomObj) return;

    setManageGroupName(activeRoomObj.name);
    setManageGroupDesc(activeRoomObj.description || "");
    setManageSelectedMembers(activeRoomObj.members.map((m) => m._id));
    setShowManageModal(true);
  };

  // Update Group Room Details / Members
  const handleUpdateGroup = async (e) => {
    e.preventDefault();
    if (!manageGroupName.trim()) {
      return toast.error("Group name cannot be empty");
    }

    try {
      await dispatch(
        updateRoomAction({
          id: activeChat,
          roomData: {
            name: manageGroupName,
            description: manageGroupDesc,
            members: manageSelectedMembers,
          },
        }),
      ).unwrap();

      toast.success("Group updated successfully!");
      setShowManageModal(false);
    } catch (err) {
      toast.error(err || "Failed to update group");
    }
  };

  // Leave Group
  const handleLeaveGroup = async () => {
    const activeRoomObj = rooms.find((r) => r._id === activeChat);
    if (!activeRoomObj) return;

    // Filter myself out
    const updatedMembers = activeRoomObj.members
      .map((m) => m._id)
      .filter((id) => id !== currentUserId);

    try {
      await dispatch(
        updateRoomAction({
          id: activeChat,
          roomData: {
            members: updatedMembers,
          },
        }),
      ).unwrap();

      toast.success("You left the group");
      setActiveChat("group");
      setShowManageModal(false);
    } catch (err) {
      toast.error(err || "Failed to leave group");
    }
  };

  // Delete Group
  const handleDeleteGroup = async () => {
    if (!window.confirm("Are you sure you want to delete this group?")) return;

    try {
      await dispatch(deleteRoomAction(activeChat)).unwrap();
      toast.success("Group deleted successfully");
      setActiveChat("group");
      setShowManageModal(false);
    } catch (err) {
      toast.error(err || "Failed to delete group");
    }
  };

  // Clear Direct Message conversation
  const handleClearChat = async (targetUserId, targetUserName) => {
    if (
      !window.confirm(
        `Are you sure you want to delete all messages with ${targetUserName}?`,
      )
    )
      return;

    try {
      await dispatch(clearChatAction(targetUserId)).unwrap();
      toast.success("Conversation deleted successfully");
      if (activeChat === targetUserId) {
        setActiveChat("group");
      }
    } catch (err) {
      toast.error(err || "Failed to delete conversation");
    }
  };

  const handleToggleMember = (userId) => {
    if (selectedMembers.includes(userId)) {
      setSelectedMembers((prev) => prev.filter((id) => id !== userId));
    } else {
      setSelectedMembers((prev) => [...prev, userId]);
    }
  };

  const handleToggleManageMember = (userId) => {
    // Creator cannot be removed
    const activeRoomObj = rooms.find((r) => r._id === activeChat);
    if (activeRoomObj && activeRoomObj.creator._id === userId) return;

    if (manageSelectedMembers.includes(userId)) {
      setManageSelectedMembers((prev) => prev.filter((id) => id !== userId));
    } else {
      setManageSelectedMembers((prev) => [...prev, userId]);
    }
  };

  // Get active conversation target metadata
  const activeCustomRoom = rooms.find((r) => r._id === activeChat);
  const activeChatUser =
    activeChat !== "group" && !activeCustomRoom
      ? users?.find((u) => u._id === activeChat)
      : null;

  const isCreatorOfActiveRoom =
    activeCustomRoom && activeCustomRoom.creator._id === currentUserId;
  const isAdmin = user?.role === "admin";

  // Get all unique departments from users list
  const departments = React.useMemo(() => {
    if (!users) return [];
    const depts = new Set();
    users.forEach((u) => {
      if (u.department && u.department.trim() !== "") {
        depts.add(u.department.trim());
      }
    });
    return Array.from(depts).sort();
  }, [users]);

  const filteredUsers = users?.filter((u) => {
    if (u._id === currentUserId) return false;

    // Search Term Filter
    const matchesSearch = u.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    // Department Filter
    if (selectedDept !== "All") {
      return u.department === selectedDept;
    }

    return true;
  });

  const formatLastMessageText = (msg) => {
    if (!msg) return "";
    if (msg.messageType === "sticker") return "🎨 Sent a sticker";
    if (msg.messageType === "file")
      return `📁 Sent a file: ${msg.file?.filename || "Attachment"}`;
    if (msg.messageType === "call") return "📞 Live Call Meet";
    return msg.text;
  };

  const formatRelativeTime = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";

    const now = new Date();
    const diffInSeconds = Math.floor((now - d) / 1000);

    if (diffInSeconds < 60) return "Just now";
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d`;

    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  const sortedDMs = filteredUsers
    ? [...filteredUsers].sort((a, b) => {
        const unreadA = unreadCounts[a._id] || 0;
        const unreadB = unreadCounts[b._id] || 0;

        // 1. Unread chats at the very top
        if (unreadA > 0 && unreadB === 0) return -1;
        if (unreadB > 0 && unreadA === 0) return 1;

        // 2. Latest message timestamp (newest first)
        const msgA = lastMessages[a._id];
        const msgB = lastMessages[b._id];
        const timeA = msgA ? new Date(msgA.createdAt).getTime() : 0;
        const timeB = msgB ? new Date(msgB.createdAt).getTime() : 0;

        if (timeA !== timeB) return timeB - timeA;

        return a.name.localeCompare(b.name);
      })
    : [];

  const sortedRooms = rooms
    ? [...rooms].sort((a, b) => {
        const unreadA = unreadCounts[a._id] || 0;
        const unreadB = unreadCounts[b._id] || 0;

        // 1. Unread group chats at the very top
        if (unreadA > 0 && unreadB === 0) return -1;
        if (unreadB > 0 && unreadA === 0) return 1;

        // 2. Latest message timestamp (newest first)
        const msgA = lastMessages[a._id];
        const msgB = lastMessages[b._id];
        const timeA = msgA ? new Date(msgA.createdAt).getTime() : 0;
        const timeB = msgB ? new Date(msgB.createdAt).getTime() : 0;

        if (timeA !== timeB) return timeB - timeA;

        return a.name.localeCompare(b.name);
      })
    : [];

  return (
    <div className="flex h-full w-full theme-bg-card  overflow-hidden border-0 md:border theme-border shadow-sm relative transition-colors duration-300">
      {/* LEFT PANEL: CHATS & DIRECT MESSAGE DIRECTORY */}
      <div
        className={`w-full md:w-80 shrink-0 theme-bg-main border-r theme-border flex flex-col h-full transition-colors duration-300 ${
          showChatWindowMobile ? "hidden md:flex" : "flex"
        }`}
      >
        <div className="p-4 border-b theme-border theme-bg-main">
          <div className="flex items-center justify-between  gap-2">
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Search team member..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs outline-none focus:ring-2 focus:ring-[var(--accent-color)]/20 transition-all theme-text-primary placeholder:theme-text-secondary"
              />
            </div>

            <div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="w-7 h-7 rounded-lg text-white flex items-center justify-center transition-all cursor-pointer shadow-sm"
                style={{
                  backgroundColor: "var(--accent-color)",
                  color: "#ffffff",
                }}
                title="Create Custom Group"
              >
                <FiPlus size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* DIRECTORY LIST */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 scrollbar-thin">
          {/* GROUPS SECTION */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-2 mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                <FiUsers size={12} /> Groups
              </span>
            </div>

            {/* Global Group Chat */}
            <div>
              <button
                onClick={() => {
                  setActiveChat("group");
                  dispatch(setActiveChatId("group"));
                  dispatch(markChatAsRead("group"));
                  setShowChatWindowMobile(true);
                }}
                className={`chat-sidebar-item transition-all ${
                  activeChat === "group"
                    ? "chat-sidebar-item-active"
                    : unreadCounts["group"] > 0
                      ? "bg-rose-50/90 dark:bg-rose-950/50 border-l-4 border-l-rose-500 shadow-md"
                      : ""
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold shrink-0 text-white shadow-sm relative`}
                  style={{
                    backgroundColor: "var(--accent-color)",
                    color: "#ffffff",
                  }}
                >
                  <img src={grouplogo} alt="" />
                  {unreadCounts["group"] > 0 && (
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 rounded-full border-2 border-white dark:border-slate-900 animate-bounce" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span
                      className={`item-title truncate ${
                        unreadCounts["group"] > 0
                          ? "font-black text-rose-700 dark:text-rose-300"
                          : ""
                      }`}
                    >
                      Kerplunk Group
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {unreadCounts["group"] > 0 ? (
                        <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 min-w-[18px] text-center shadow-md animate-pulse">
                          {unreadCounts["group"]} unread
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                          {lastMessages["group"]
                            ? formatRelativeTime(lastMessages["group"].createdAt)
                            : "Global"}
                        </span>
                      )}
                    </div>
                  </div>
                  <p
                    className={`item-subtitle truncate mt-0.5 ${
                      unreadCounts["group"] > 0
                        ? "font-extrabold text-rose-600 dark:text-rose-400"
                        : ""
                    }`}
                  >
                    {unreadCounts["group"] > 0 && "💬 "}
                    {lastMessages["group"]
                      ? formatLastMessageText(lastMessages["group"])
                      : "All developers and admins"}
                  </p>
                </div>
              </button>
            </div>

            {/* CUSTOM GROUP CHATS */}
            <div className="pt-2 border-t theme-border">
              <div className="flex items-center justify-between px-2 mb-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Custom Groups
                </span>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="text-[10px] font-extrabold hover:underline flex items-center gap-1 cursor-pointer"
                  style={{ color: "var(--accent-color)" }}
                >
                  <FiPlus size={11} /> Create
                </button>
              </div>

              {sortedRooms.length === 0 ? (
                <div className="text-center py-6 px-3 bg-slate-50/50 dark:bg-slate-900/40 rounded-2xl border border-dashed theme-border">
                  <p className="text-[11px] font-bold theme-text-secondary">
                    No Custom Groups
                  </p>
                  <p className="text-[9px] theme-text-secondary opacity-70 mt-0.5">
                    Create a group to chat with select team members
                  </p>
                </div>
              ) : (
                sortedRooms.map((r) => {
                  const unread = unreadCounts[r._id] || 0;
                  const hasUnread = unread > 0;
                  const lastMsg = lastMessages[r._id];
                  return (
                    <button
                      key={r._id}
                      onClick={() => {
                        setActiveChat(r._id);
                        dispatch(setActiveChatId(r._id));
                        dispatch(markChatAsRead(r._id));
                        setShowChatWindowMobile(true);
                      }}
                      className={`chat-sidebar-item transition-all ${
                        activeChat === r._id
                          ? "chat-sidebar-item-active"
                          : hasUnread
                            ? "bg-rose-50/90 dark:bg-rose-950/50 border-l-4 border-l-rose-500 shadow-md"
                            : ""
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold shrink-0 text-white shadow-sm relative`}
                        style={{
                          backgroundColor: "var(--accent-color)",
                          color: "#ffffff",
                        }}
                      >
                        <FiUsers size={16} />
                        {hasUnread && (
                          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 rounded-full border-2 border-white dark:border-slate-900 animate-bounce" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span
                            className={`item-title truncate ${
                              hasUnread
                                ? "font-black text-rose-700 dark:text-rose-300"
                                : ""
                            }`}
                          >
                            {r.name}
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {hasUnread ? (
                              <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 min-w-[18px] text-center shadow-md animate-pulse">
                                {unread} unread
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                                {lastMsg
                                  ? formatRelativeTime(lastMsg.createdAt)
                                  : `${r.members.length} members`}
                              </span>
                            )}
                          </div>
                        </div>
                        <p
                          className={`item-subtitle truncate mt-0.5 ${
                            hasUnread
                              ? "font-extrabold text-rose-600 dark:text-rose-400"
                              : ""
                          }`}
                        >
                          {hasUnread && "💬 "}
                          {lastMsg
                            ? formatLastMessageText(lastMsg)
                            : r.description || "No description"}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* DIRECT CHATS SECTION */}
          <div className="pt-3 border-t theme-border space-y-3">
            <div className="flex items-center justify-between px-2 mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                <FiUser size={12} /> Direct Messages
              </span>
            </div>

            {/* Department Filters */}
            <div className="px-1 mb-1">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-none snap-x">
                <button
                  type="button"
                  onClick={() => setSelectedDept("All")}
                  className={`dept-filter-tab snap-start ${
                    selectedDept === "All"
                      ? "dept-filter-tab-active"
                      : "dept-filter-tab-inactive"
                  }`}
                >
                  All
                </button>
                {departments.map((dept) => (
                  <button
                    key={dept}
                    type="button"
                    onClick={() => setSelectedDept(dept)}
                    className={`dept-filter-tab snap-start ${
                      selectedDept === dept
                        ? "dept-filter-tab-active"
                        : "dept-filter-tab-inactive"
                    }`}
                  >
                    {dept}
                  </button>
                ))}
              </div>
            </div>

            {/* Direct Message User List */}
            {sortedDMs.length === 0 ? (
              <p className="text-[10px] theme-text-secondary text-center py-6 font-semibold">
                No team members found
              </p>
            ) : (
              sortedDMs.map((u) => {
                const unread = unreadCounts[u._id] || 0;
                const hasUnread = unread > 0;
                const lastMsg = lastMessages[u._id];
                return (
                  <div
                    key={u._id}
                    onClick={() => {
                      setActiveChat(u._id);
                      dispatch(setActiveChatId(u._id));
                      dispatch(markChatAsRead(u._id));
                      setShowChatWindowMobile(true);
                    }}
                    className={`chat-sidebar-item group relative flex items-center gap-3 cursor-pointer select-none transition-all ${
                      activeChat === u._id
                        ? "chat-sidebar-item-active"
                        : hasUnread
                          ? "bg-rose-50/90 dark:bg-rose-950/50 border-l-4 border-l-rose-500 shadow-md"
                          : ""
                    }`}
                  >
                    <div className="relative shrink-0">
                      {u.profile?.profileImage?.url ? (
                        <img
                          src={u.profile.profileImage.url}
                          alt="profile"
                          className={`w-10 h-10 rounded-2xl object-cover border ${
                            activeChat === u._id
                              ? "border-blue-600/30 dark:border-[#3b82f6]/30"
                              : "theme-border"
                          }`}
                        />
                      ) : (
                        <div
                          className={`w-10 h-10 rounded-2xl border flex items-center justify-center font-bold text-xs ${
                            activeChat === u._id
                              ? "bg-blue-600/10 border-blue-600/20 text-blue-600 dark:bg-[#3b82f6]/10 dark:border-[#3b82f6]/20 dark:text-[#3b82f6] font-bold"
                              : "bg-indigo-100 dark:bg-indigo-900/40 border-indigo-200/80 dark:border-indigo-800/60 text-indigo-600 dark:text-indigo-400"
                          }`}
                        >
                          {u.name.charAt(0)}
                        </div>
                      )}
                      <span
                        className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 shadow-sm transition-colors duration-300 ${
                          onlineUsers.includes(u._id)
                            ? "bg-emerald-500"
                            : "bg-slate-400 dark:bg-slate-600"
                        } ${
                          activeChat === u._id
                            ? "border-blue-500 dark:border-slate-900"
                            : "border-white dark:border-slate-900"
                        }`}
                        title={
                          onlineUsers.includes(u._id) ? "Online" : "Offline"
                        }
                      />
                      {hasUnread && (
                        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 rounded-full border-2 border-white dark:border-slate-900 animate-bounce" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 justify-between">
                        <span
                          className={`item-title truncate ${
                            hasUnread
                              ? "font-black text-rose-700 dark:text-rose-300"
                              : ""
                          }`}
                        >
                          {u.name}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {hasUnread ? (
                            <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 min-w-[18px] text-center shadow-md animate-pulse">
                              {unread} unread
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                              {lastMsg
                                ? formatRelativeTime(lastMsg.createdAt)
                                : u.role === "team"
                                  ? u.department || "Team"
                                  : displayRole(u.role)}
                            </span>
                          )}
                        </div>
                      </div>
                      <p
                        className={`item-subtitle truncate mt-0.5 ${
                          hasUnread
                            ? "font-extrabold text-rose-600 dark:text-rose-400"
                            : ""
                        }`}
                      >
                        {hasUnread && "💬 "}
                        {lastMsg
                          ? formatLastMessageText(lastMsg)
                          : u.role === "team"
                            ? u.department || "Team"
                            : displayRole(u.role)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: ACTIVE CHAT SCREEN */}
      <div
        className={`flex-1 flex flex-col theme-bg-main transition-colors duration-300 h-full ${
          showChatWindowMobile ? "flex" : "hidden md:flex"
        }`}
      >
        {/* HEADER */}
        <div className="px-4 py-3 theme-bg-card border-b theme-border flex items-center justify-between shrink-0 transition-colors duration-300">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={() => setShowChatWindowMobile(false)}
              className="md:hidden p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 theme-icon transition-all shrink-0 cursor-pointer"
            >
              <FiChevronLeft size={18} />
            </button>

            {activeChat === "group" ? (
              <>
                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white dark:bg-[#3b82f6] dark:text-black flex items-center justify-center font-bold shadow-md shrink-0">
                  <img src={grouplogo} alt="" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-black theme-text-primary leading-tight truncate max-w-[120px] sm:max-w-xs">
                    Kerplunk Group Chat
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowMembersDrawer(true)}
                    className="text-[9px] text-emerald-500 hover:text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider leading-none mt-1 flex items-center gap-1 cursor-pointer transition-colors"
                    title="View Group Members & Presence"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>
                      {currentGroupMembers.length} members ·{" "}
                      {
                        currentGroupMembers.filter((m) => isMemberOnline(m._id))
                          .length
                      }{" "}
                      online
                    </span>
                  </button>
                </div>
              </>
            ) : activeCustomRoom ? (
              <>
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white flex items-center justify-center font-bold shadow-md shrink-0">
                  <FiUsers size={16} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-black theme-text-primary leading-tight truncate max-w-[120px] sm:max-w-xs">
                    {activeCustomRoom.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => setShowMembersDrawer(true)}
                      className="text-[9px] text-emerald-500 hover:text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider leading-none flex items-center gap-1 cursor-pointer transition-colors"
                      title="View Group Members & Presence"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span>
                        {currentGroupMembers.length} members ·{" "}
                        {
                          currentGroupMembers.filter((m) =>
                            isMemberOnline(m._id),
                          ).length
                        }{" "}
                        online
                      </span>
                    </button>
                    <span className="text-[9px] text-slate-300 dark:text-slate-700">
                      •
                    </span>
                    <button
                      type="button"
                      onClick={handleOpenManageModal}
                      className="text-[9px] text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 font-bold uppercase tracking-wider leading-none flex items-center gap-1 cursor-pointer"
                    >
                      <FiSettings size={10} /> Manage
                    </button>
                  </div>
                </div>
              </>
            ) : activeChatUser ? (
              <>
                <div className="relative shrink-0">
                  {activeChatUser.profile?.profileImage?.url ? (
                    <img
                      src={activeChatUser.profile.profileImage.url}
                      alt="profile"
                      className="w-10 h-10 rounded-2xl object-cover border theme-border cursor-pointer hover:scale-105 active:scale-95 transition-transform"
                      onClick={() => setProfileModalUser(activeChatUser)}
                    />
                  ) : (
                    <div
                      className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-900/40 border border-indigo-100 dark:border-indigo-800/60 flex items-center justify-center font-black text-indigo-600 dark:text-indigo-400 text-xs cursor-pointer hover:scale-105 active:scale-95 transition-transform"
                      onClick={() => setProfileModalUser(activeChatUser)}
                    >
                      {activeChatUser.name.charAt(0)}
                    </div>
                  )}
                  {/* Online / Offline dot on header */}
                  <span
                    className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 shadow-sm transition-colors duration-300 ${
                      onlineUsers.includes(activeChatUser._id)
                        ? "bg-emerald-500"
                        : "bg-slate-400 dark:bg-slate-600"
                    }`}
                    title={
                      onlineUsers.includes(activeChatUser._id)
                        ? "Online"
                        : "Offline"
                    }
                  />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-black theme-text-primary leading-tight truncate max-w-[120px] sm:max-w-xs">
                    {activeChatUser.name}
                  </h3>
                  <p
                    className={`text-[9px] font-bold capitalize mt-0.5 leading-none truncate max-w-[120px] sm:max-w-xs flex items-center gap-1 ${
                      onlineUsers.includes(activeChatUser._id)
                        ? "text-emerald-500"
                        : "theme-text-secondary"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full inline-block ${
                        onlineUsers.includes(activeChatUser._id)
                          ? "bg-emerald-500"
                          : "bg-slate-400 dark:bg-slate-600"
                      }`}
                    />
                    {onlineUsers.includes(activeChatUser._id)
                      ? "Online"
                      : "Offline"}
                  </p>
                </div>
              </>
            ) : null}
          </div>

          {/* CALL & ACTION TRIGGER BUTTONS */}
          <div className="flex items-center gap-1.5 shrink-0">
            {isGroupType && (
              <button
                type="button"
                onClick={() => setShowMembersDrawer(true)}
                className="w-8 h-8 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-blue-600 dark:text-[#3b82f6] flex items-center justify-center transition-all cursor-pointer shadow-sm"
                title="Group Members & Live Presence"
              >
                <FiUsers size={14} />
              </button>
            )}
            {activeChatUser && (
              <button
                type="button"
                onClick={() => {
                  if (
                    window.confirm(
                      "Are you sure you want to clear this conversation history? This cannot be undone.",
                    )
                  ) {
                    dispatch(clearChatAction(activeChatUser._id));
                  }
                }}
                className="w-8 h-8 rounded-lg bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/45 dark:hover:bg-rose-950/70 text-rose-600 dark:text-rose-400 flex items-center justify-center transition-all cursor-pointer shadow-sm mr-1"
                title="Clear Chat History"
              >
                <FiTrash2 size={13} />
              </button>
            )}
            <button
              onClick={() => startCall("voice")}
              className="w-8 h-8 rounded-lg bg-blue-600 hover:bg-blue-700 text-white dark:bg-[#3b82f6] dark:text-black flex items-center justify-center font-bold transition-all cursor-pointer shadow-sm"
              title="Voice Call"
            >
              <FiPhone size={14} />
            </button>
            <button
              onClick={() => startCall("video")}
              className="w-8 h-8 rounded-lg bg-blue-600 hover:bg-blue-700 text-white dark:bg-[#3b82f6] dark:text-black flex items-center justify-center font-bold transition-all cursor-pointer shadow-sm"
              title="Video Call"
            >
              <FiVideo size={14} />
            </button>
          </div>
        </div>

        {/* MESSAGES LIST AREA */}
        <div
          ref={messagesContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-2 sm:space-y-3.5 scrollbar-thin bg-chat-wallpaper"
        >
          {loadingOlder && (
            <div className="flex justify-center py-2">
              <div className="text-[10px] font-bold theme-text-secondary bg-white/70 dark:bg-slate-800/70 border theme-border px-3 py-1 rounded-full shadow-xs flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                Loading older messages...
              </div>
            </div>
          )}
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <span className="text-xs theme-text-secondary font-semibold">
                Loading conversation...
              </span>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full theme-text-secondary">
              <FiMessageSquare size={32} className="opacity-20 mb-2" />
              <p className="text-xs font-bold">Start the conversation</p>
              <p className="text-[10px] opacity-70 mt-0.5">
                Send stickers, call details, or messages
              </p>
            </div>
          ) : (
            messages.map((m, index) => {
              const isMe = m.sender?._id === currentUserId;
              const senderInitial = m.sender?.name?.charAt(0) || "?";

              const prevMsg = index > 0 ? messages[index - 1] : null;
              const showDateSeparator =
                !prevMsg || isDifferentDay(m?.createdAt, prevMsg?.createdAt);
              const dateLabel = showDateSeparator
                ? formatDateSeparator(m?.createdAt)
                : null;

              const renderReplyPreview = (replyTo) => (
                <div
                  className={`mb-2 p-2 rounded-lg border-l-[3px] text-[10px] text-left transition-all ${
                    isMe
                      ? "bg-black/30 text-white border-white/80"
                      : "bg-slate-200/80 dark:bg-[#0f172a] text-slate-800 dark:text-slate-100 border-[var(--accent-color)]"
                  }`}
                >
                  <div
                    className={`font-black text-[9px] mb-0.5 uppercase tracking-wider ${
                      isMe ? "text-white" : "text-[var(--accent-color)]"
                    }`}
                  >
                    ↩ Replying to {replyTo.sender?.name || "User"}
                  </div>
                  <div
                    className={`truncate font-semibold text-[10px] ${
                      isMe
                        ? "text-white/90"
                        : "text-slate-700 dark:text-slate-200"
                    }`}
                  >
                    {replyTo.messageType === "file"
                      ? `📁 ${replyTo.file?.filename || "Attachment"}`
                      : replyTo.messageType === "sticker"
                        ? `🎨 Sticker: ${replyTo.sticker}`
                        : replyTo.text}
                  </div>
                </div>
              );

              // Check if current user has already seen this message
              const hasSeen =
                m.seenBy &&
                m.seenBy.some((s) => {
                  const sId = s?.userId?._id || s?.userId || s;
                  return sId?.toString() === currentUserId?.toString();
                });

              const isCallMsg = m.messageType === "call";

              return (
                <React.Fragment key={m._id || index}>
                  {/* Sticky Date Separator Badge */}
                  {showDateSeparator && dateLabel && (
                    <div className="flex items-center justify-center my-3.5 select-none sticky top-2 z-20">
                      <div className="bg-white dark:bg-[#0f172a] text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 px-4 py-1.5 rounded-full text-[10px] font-extrabold tracking-widest uppercase shadow-md flex items-center gap-2">
                        <FiCalendar
                          size={12}
                          style={{ color: "var(--accent-color)" }}
                        />
                        <span className="text-slate-900 dark:text-white font-extrabold">
                          {dateLabel}
                        </span>
                      </div>
                    </div>
                  )}

                  {isCallMsg ? (
                    <div className="flex justify-center my-2">
                      <div className="theme-bg-main border theme-border rounded-full px-4 py-1.5 flex items-center gap-2 text-[10px] font-bold theme-text-secondary shadow-sm">
                        {m.text.includes("Video") ? (
                          <FiVideo size={12} />
                        ) : (
                          <FiPhone size={12} />
                        )}
                        <span>{m.text}</span>
                      </div>
                    </div>
                  ) : (
                    <div
                      ref={(el) => {
                        if (el && !isMe && !hasSeen) {
                          const observer = new IntersectionObserver(
                            (entries) => {
                              entries.forEach((entry) => {
                                if (entry.isIntersecting) {
                                  markMessageAsSeen(m._id);
                                  observer.unobserve(el);
                                }
                              });
                            },
                            { threshold: 0.5 },
                          );
                          observer.observe(el);
                        }
                      }}
                      onClick={() =>
                        setActiveMessageMenu(
                          activeMessageMenu === m._id ? null : m._id,
                        )
                      }
                      className={`flex items-start gap-2.5 ${isMe ? "flex-row-reverse" : ""} group cursor-pointer`}
                    >
                      {!isMe &&
                        (m.sender?.profile?.profileImage?.url ? (
                          <img
                            src={m.sender.profile.profileImage.url}
                            alt="profile"
                            className="w-7 h-7 rounded-lg object-cover border border-slate-300 dark:border-slate-800 shrink-0 cursor-pointer hover:scale-110 active:scale-90 transition-transform duration-200"
                            onClick={(e) => {
                              e.stopPropagation();
                              setProfileModalUser(m.sender);
                            }}
                          />
                        ) : (
                          <div
                            className="w-7 h-7 rounded-lg bg-blue-300 dark:bg-[#3b82f6] text-[10px] font-black text-slate-900 dark:text-slate-900 flex items-center justify-center shrink-0 cursor-pointer hover:scale-110 active:scale-90 transition-transform duration-200"
                            onClick={(e) => {
                              e.stopPropagation();
                              setProfileModalUser(m.sender);
                            }}
                          >
                            {senderInitial}
                          </div>
                        ))}

                      <div
                        className={`max-w-[85%] md:max-w-[70%] flex flex-col ${isMe ? "items-end" : ""}`}
                      >
                        {/* Sender Label */}
                        {!isMe && (
                          <span className="text-[9px] text-[#38bdf8] font-black uppercase tracking-wider mb-0.5 ml-1">
                            {m.sender?.name} ({m.sender?.role})
                          </span>
                        )}

                        {/* Content Display Wrapped with Reaction Badge */}
                        <div className="relative group/msg-bubble">
                          {m.messageType === "sticker" ? (
                            <div className="text-5xl select-none py-1 filter drop-shadow-md transform active:scale-90 transition-transform">
                              {m.sticker}
                            </div>
                          ) : m.messageType === "file" && m.file ? (
                            <div
                              className={`rounded-[1.25rem] overflow-hidden shadow-sm border max-w-xs md:max-w-sm ${
                                isMe
                                  ? "chat-bubble-me rounded-tr-none"
                                  : "theme-bg-card theme-text-primary theme-border rounded-tl-none"
                              }`}
                            >
                              {m.replyTo && (
                                <div className="p-2 pb-1">
                                  {renderReplyPreview(m.replyTo)}
                                </div>
                              )}
                              {m.file.fileType === "image" ? (
                                <a
                                  href={m.file.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="block relative group cursor-pointer"
                                >
                                  <img
                                    src={m.file.url}
                                    alt={m.file.filename}
                                    className="max-h-60 w-full object-cover rounded-t-[1.25rem]"
                                  />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[11px] font-bold gap-1.5">
                                    <FiDownload size={14} /> Open Photo
                                  </div>
                                  <div className="p-3 bg-black/5 dark:bg-white/5 border-t border-slate-200/10 text-xs font-semibold truncate flex items-center gap-1.5 justify-between">
                                    <span className="truncate">
                                      {m.file.filename}
                                    </span>
                                    <span className="text-[9px] opacity-60 font-medium shrink-0">
                                      {(m.file.size / 1024 / 1024).toFixed(2)}{" "}
                                      MB
                                    </span>
                                  </div>
                                </a>
                              ) : m.file.fileType === "video" ? (
                                <div
                                  className="p-1"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <video
                                    src={m.file.url}
                                    controls
                                    className="w-full max-h-60 rounded-[1rem] object-cover bg-black"
                                  />
                                  <div className="p-2 text-xs font-semibold truncate flex items-center gap-1.5 justify-between">
                                    <span className="truncate">
                                      {m.file.filename}
                                    </span>
                                    <span className="text-[9px] opacity-60 font-medium shrink-0">
                                      {(m.file.size / 1024 / 1024).toFixed(2)}{" "}
                                      MB
                                    </span>
                                  </div>
                                </div>
                              ) : m.file.fileType === "audio" ? (
                                <div
                                  className="p-3 w-64"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div className="text-xs font-bold truncate mb-2">
                                    {m.file.filename}
                                  </div>
                                  <audio
                                    src={m.file.url}
                                    controls
                                    className="w-full h-8"
                                  />
                                </div>
                              ) : (
                                // Document / generic file card
                                <a
                                  href={m.file.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  download={m.file.filename}
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex items-center gap-3 p-4 hover:bg-black/5 dark:hover:bg-white/5 transition-all text-xs cursor-pointer"
                                >
                                  <div className="w-9 h-9 rounded-xl theme-bg-main theme-text-primary border theme-border flex items-center justify-center shrink-0">
                                    <FiFileText size={18} />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="font-bold truncate leading-tight">
                                      {m.file.filename}
                                    </div>
                                    <div className="text-[9px] opacity-60 mt-0.5">
                                      {(m.file.size / 1024 / 1024).toFixed(2)}{" "}
                                      MB • File
                                    </div>
                                  </div>
                                  <div className="w-7 h-7 rounded-lg bg-black/5 dark:bg-white/10 theme-text-secondary flex items-center justify-center shrink-0">
                                    <FiDownload size={12} />
                                  </div>
                                </a>
                              )}
                            </div>
                          ) : (
                            <div
                              className={`px-4 py-2.5 rounded-[1.25rem] text-xs font-medium leading-relaxed break-words shadow-sm border ${
                                isMe
                                  ? "text-white font-semibold rounded-tr-none border-white/20"
                                  : "bg-slate-100 dark:bg-[#1e293b] text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-tl-none"
                              }`}
                              style={
                                isMe
                                  ? {
                                      backgroundColor: "var(--accent-color)",
                                      color: "#ffffff",
                                    }
                                  : {}
                              }
                            >
                              {m.replyTo && renderReplyPreview(m.replyTo)}
                              {m.text.includes("Join my live") ? (
                                <div className="flex flex-col gap-2.5 p-0.5">
                                  <span className="font-semibold">
                                    {m.text}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const match = m.text.match(
                                        /Room ID:\s*([a-zA-Z0-9\-_]+)/,
                                      );
                                      if (match) {
                                        const roomId = match[1];
                                        joinCallRoom(
                                          roomId,
                                          m.text.includes("Video")
                                            ? "video"
                                            : "voice",
                                        );
                                      }
                                    }}
                                    className={`w-full py-1.5 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider text-center cursor-pointer transition-all ${
                                      isMe
                                        ? "bg-white text-indigo-600 hover:bg-white/95 dark:bg-red-500 dark:text-white dark:font-bold"
                                        : "bg-blue-600 text-white hover:bg-blue-700 dark:bg-[#3b82f6] dark:text-black dark:font-bold dark:hover:bg-[#d4ec00] shadow shadow-blue-600/20 dark:shadow-[#3b82f6]/20"
                                    }`}
                                  >
                                    Join Call Meeting
                                  </button>
                                </div>
                              ) : (
                                renderMessageContentWithMentions(
                                  m.text,
                                  m.mentions,
                                )
                              )}
                            </div>
                          )}

                          {/* WhatsApp / SaaS Floating Reaction Badges on Bottom Right Corner */}
                          {m.reactions && m.reactions.length > 0 && (
                            <div
                              className={`absolute -bottom-3 right-2 z-10 flex items-center gap-1 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-1.5 py-0.5 rounded-full border border-slate-200/90 dark:border-slate-700/80 shadow-md transition-all hover:scale-105 select-none`}
                            >
                              {m.reactions.map((r, rIdx) => {
                                const hasReacted = r.users?.some(
                                  (u) =>
                                    (
                                      u.userId?._id ||
                                      u.userId ||
                                      u
                                    ).toString() === currentUserId?.toString(),
                                );
                                const userNames = r.users
                                  ?.map((u) =>
                                    (
                                      u.userId?._id ||
                                      u.userId ||
                                      u
                                    ).toString() === currentUserId?.toString()
                                      ? "You"
                                      : u.name || "User",
                                  )
                                  .join(", ");
                                return (
                                  <button
                                    key={r.emoji || rIdx}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleToggleReaction(m._id, r.emoji);
                                    }}
                                    className={`flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-full transition-all cursor-pointer ${
                                      hasReacted
                                        ? "bg-blue-100/90 dark:bg-blue-900/60 text-blue-700 dark:text-[#3b82f6] font-bold ring-1 ring-blue-500/40"
                                        : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium"
                                    }`}
                                    title={`Reacted by: ${userNames}`}
                                  >
                                    <span>{r.emoji}</span>
                                    {r.users?.length > 1 && (
                                      <span className="text-[9px] font-black opacity-90">
                                        {r.users.length}
                                      </span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Timestamp & Seen Status */}
                        <div
                          className={`flex items-center gap-1.5 ${
                            m.reactions && m.reactions.length > 0
                              ? "mt-2.5"
                              : "mt-1"
                          } px-1 flex-wrap ${isMe ? "justify-end" : "justify-start"}`}
                        >
                          <span className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold">
                            {new Date(m.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>

                          {/* Group Read Receipts (Seen By) */}
                          {isGroupType ? (
                            m.seenBy && m.seenBy.length > 0 ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSeenModalMessage(m);
                                }}
                                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border transition-all cursor-pointer select-none ${
                                  isMe
                                    ? "bg-blue-50/90 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 border-blue-200/80 dark:border-blue-800/60 text-blue-700 dark:text-[#3b82f6]"
                                    : "bg-slate-100/90 dark:bg-slate-800/70 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                                }`}
                                title="Click to view who read this message"
                              >
                                <span className="flex items-center text-blue-600 dark:text-[#3b82f6]">
                                  <FiCheck size={11} className="stroke-[3]" />
                                  <FiCheck
                                    size={11}
                                    className="-ml-1.5 stroke-[3]"
                                  />
                                </span>
                                <div className="flex -space-x-1.5 overflow-hidden py-0.5 items-center">
                                  {m.seenBy.slice(0, 3).map((reader, idx) => {
                                    const rUser = reader.userId || reader;
                                    const rProfileImg =
                                      rUser?.profile?.profileImage?.url;
                                    const rName = rUser?.name || "Member";
                                    return rProfileImg ? (
                                      <img
                                        key={reader._id || idx}
                                        src={rProfileImg}
                                        alt={rName}
                                        className="inline-block h-3.5 w-3.5 rounded-full ring-1.5 ring-white dark:ring-slate-900 object-cover shadow-2xs"
                                      />
                                    ) : (
                                      <div
                                        key={reader._id || idx}
                                        className="inline-flex h-3.5 w-3.5 rounded-full ring-1.5 ring-white dark:ring-slate-900 bg-gradient-to-tr from-blue-500 to-indigo-600 text-white text-[7px] font-black items-center justify-center shadow-2xs"
                                      >
                                        {rName.charAt(0).toUpperCase()}
                                      </div>
                                    );
                                  })}
                                </div>
                                <span className="text-[9px] font-extrabold">
                                  Seen by {m.seenBy.length}
                                </span>
                              </button>
                            ) : isMe ? (
                              <span
                                className="inline-flex items-center gap-0.5 text-[9px] text-slate-400 dark:text-slate-500 font-bold px-1.5 py-0.5 rounded-full bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-800/50 select-none"
                                title="Sent to group"
                              >
                                <FiCheck size={10} className="stroke-[2.5]" />{" "}
                                Sent
                              </span>
                            ) : null
                          ) : (
                            isMe &&
                            (m.seenBy && m.seenBy.length > 0 ? (
                              <span
                                className="inline-flex items-center gap-0.5 text-[9px] text-blue-500 font-bold px-1.5 py-0.5 rounded-full select-none"
                                title="Seen"
                              >
                                <span className="flex items-center text-blue-500">
                                  <FiCheck size={11} className="stroke-[3]" />
                                  <FiCheck
                                    size={11}
                                    className="-ml-1.5 stroke-[3]"
                                  />
                                </span>
                                Seen
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center gap-0.5 text-[9px] text-slate-400 dark:text-slate-500 font-bold px-1.5 py-0.5 rounded-full select-none"
                                title="Delivered"
                              >
                                <span className="flex items-center">
                                  <FiCheck size={11} className="stroke-[3]" />
                                  <FiCheck
                                    size={11}
                                    className="-ml-1.5 stroke-[3]"
                                  />
                                </span>
                                Delivered
                              </span>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Message Options Hover Action Bar */}
                      <div
                        className={`flex items-center gap-1 transition-opacity self-center shrink-0 ${
                          isMe ? "flex-row-reverse" : ""
                        } ${
                          activeOptionsDropdown === m._id ||
                          reactionPickerMessage === m._id
                            ? "opacity-100"
                            : "opacity-0 md:group-hover:opacity-100"
                        }`}
                      >
                        {/* Seen Info (Group only) */}
                        {isGroupType && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSeenModalMessage(m);
                              setActiveOptionsDropdown(null);
                              setReactionPickerMessage(null);
                            }}
                            className="p-1 rounded-lg theme-bg-main hover:theme-bg-card text-blue-600 dark:text-[#3b82f6] border theme-border cursor-pointer transition-colors"
                            title="Seen By / Message Info"
                          >
                            <FiEye size={11} />
                          </button>
                        )}

                        {/* Emoji Reaction Button & Floating Quick Reactions */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setReactionPickerMessage(
                                reactionPickerMessage === m._id ? null : m._id,
                              );
                              setActiveOptionsDropdown(null);
                            }}
                            className={`p-1 rounded-lg border theme-border cursor-pointer transition-colors ${
                              reactionPickerMessage === m._id
                                ? "bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700"
                                : "theme-bg-main hover:theme-bg-card text-slate-400 hover:text-amber-500"
                            }`}
                            title="React with Emoji"
                          >
                            <FiSmile size={11} />
                          </button>

                          {/* Floating Quick Reaction Bar */}
                          {reactionPickerMessage === m._id && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className={`absolute bottom-full mb-1.5 ${
                                isMe ? "right-0" : "left-0"
                              } bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full px-2 py-1 shadow-2xl z-50 flex items-center gap-1.5 backdrop-blur-xl animate-scale-up`}
                            >
                              {[
                                "👍",
                                "❤️",
                                "😂",
                                "😮",
                                "😢",
                                "🔥",
                                "🎉",
                                "🙏",
                              ].map((emoji) => (
                                <button
                                  key={emoji}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleReaction(m._id, emoji);
                                    setReactionPickerMessage(null);
                                  }}
                                  className="text-base p-0.5 hover:scale-125 active:scale-95 transition-transform cursor-pointer"
                                >
                                  {emoji}
                                </button>
                              ))}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowFullEmojiReactionModal(m._id);
                                  setReactionPickerMessage(null);
                                }}
                                className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer text-xs ml-0.5"
                                title="More Reactions"
                              >
                                <FiPlus size={11} />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Reply Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setReplyingToMessage(m);
                            setActiveOptionsDropdown(null);
                            setReactionPickerMessage(null);
                          }}
                          className="p-1 rounded-lg theme-bg-main hover:theme-bg-card theme-text-secondary hover:theme-text-primary border theme-border cursor-pointer transition-colors"
                          title="Reply"
                        >
                          <FiCornerUpLeft size={11} />
                        </button>

                        {/* Forward Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setForwardingMessage(m);
                            setShowForwardModal(true);
                            setActiveOptionsDropdown(null);
                            setReactionPickerMessage(null);
                          }}
                          className="p-1 rounded-lg theme-bg-main hover:theme-bg-card theme-text-secondary hover:theme-text-primary border theme-border cursor-pointer transition-colors"
                          title="Forward"
                        >
                          <FiArrowRight size={11} />
                        </button>

                        {/* 3-Dots Options Menu (Share & Delete dropdown) */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveOptionsDropdown(
                                activeOptionsDropdown === m._id ? null : m._id,
                              );
                              setReactionPickerMessage(null);
                            }}
                            className={`p-1 rounded-lg border theme-border cursor-pointer transition-colors ${
                              activeOptionsDropdown === m._id
                                ? "bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white"
                                : "theme-bg-main hover:theme-bg-card theme-text-secondary hover:theme-text-primary"
                            }`}
                            title="More Options"
                          >
                            <FiMoreVertical size={11} />
                          </button>

                          {/* Dropdown Menu - opens downwards */}
                          {activeOptionsDropdown === m._id && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className={`absolute top-full mt-1.5 ${
                                isMe ? "right-0" : "left-0"
                              } w-36 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-1 shadow-2xl z-50 backdrop-blur-xl animate-scale-up overflow-hidden`}
                            >
                              {/* Copy text (if text message) */}
                              {m.text && !m.text.includes("Join my live") && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigator.clipboard.writeText(m.text);
                                    toast.success("Text copied");
                                    setActiveOptionsDropdown(null);
                                  }}
                                  className="w-full px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-left text-xs font-semibold theme-text-primary flex items-center gap-2 cursor-pointer transition-colors"
                                >
                                  <FiCopy
                                    size={12}
                                    className="text-slate-400"
                                  />
                                  Copy Text
                                </button>
                              )}

                              {/* Share via WhatsApp */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleShareExternal(m, "whatsapp");
                                  setActiveOptionsDropdown(null);
                                }}
                                className="w-full px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-left text-xs font-semibold theme-text-primary flex items-center gap-2 cursor-pointer transition-colors"
                              >
                                <FiShare2
                                  size={12}
                                  className="text-emerald-500"
                                />
                                Share WhatsApp
                              </button>

                              {/* Share via Email */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleShareExternal(m, "email");
                                  setActiveOptionsDropdown(null);
                                }}
                                className="w-full px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-left text-xs font-semibold theme-text-primary flex items-center gap-2 cursor-pointer transition-colors"
                              >
                                <FiMail size={12} className="text-blue-500" />
                                Share Email
                              </button>

                              {/* Delete option */}
                              {(isMe || user?.role === "admin") && (
                                <>
                                  <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteMessage(m._id);
                                      setActiveOptionsDropdown(null);
                                    }}
                                    className="w-full px-3 py-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-left text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-2 cursor-pointer transition-colors"
                                  >
                                    <FiTrash2
                                      size={12}
                                      className="text-rose-500"
                                    />
                                    Delete
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </React.Fragment>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* INPUT FORM CONTAINER */}
        <div className="px-2 sm:px-4 py-2.5 sm:py-3 theme-bg-card border-t theme-border relative shrink-0 transition-colors duration-300">
          {/* @Mention Suggestion Popup (GROUP CHAT ONLY) */}
          {isGroupType &&
            mentionQuery !== null &&
            filteredMentionMembers.length > 0 && (
              <div className="absolute bottom-full left-2 sm:left-4 mb-2 w-72 sm:w-80 theme-bg-card border theme-border rounded-2xl shadow-2xl z-40 overflow-hidden animate-slide-up backdrop-blur-xl">
                <div className="px-3 py-2 border-b theme-border flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/70">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <FiAtSign size={12} className="text-blue-500" /> Mention
                    Member
                  </span>
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 font-medium">
                    ↑↓ Navigate · ↵ Select
                  </span>
                </div>
                <div className="max-h-52 overflow-y-auto p-1.5 space-y-1 scrollbar-thin">
                  {filteredMentionMembers.map((m, idx) => {
                    const isSelected = idx === mentionIndex;
                    const isOnline = m.isAll ? true : isMemberOnline(m._id);
                    return (
                      <button
                        key={m._id}
                        type="button"
                        onClick={() => handleSelectMention(m)}
                        className={`w-full flex items-center gap-2.5 p-2 rounded-xl text-left transition-all cursor-pointer ${
                          m.isAll
                            ? isSelected
                              ? "bg-amber-100 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700/80"
                              : "hover:bg-amber-50/80 dark:hover:bg-amber-950/30 text-amber-900 dark:text-amber-200 border border-amber-200/60 dark:border-amber-800/40 bg-amber-50/40 dark:bg-amber-950/20"
                            : isSelected
                              ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60"
                              : "hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200 border border-transparent"
                        }`}
                      >
                        {m.isAll ? (
                          <div className="relative shrink-0">
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-500 to-orange-500 text-white font-black text-xs flex items-center justify-center shadow-xs">
                              📢
                            </div>
                          </div>
                        ) : (
                          <div className="relative shrink-0">
                            {m.profile?.profileImage?.url ? (
                              <img
                                src={m.profile.profileImage.url}
                                alt={m.name}
                                className="w-7 h-7 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-500 to-indigo-600 text-white font-black text-xs flex items-center justify-center">
                                {m.name?.charAt(0) || "U"}
                              </div>
                            )}
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-slate-900 ${
                                isOnline
                                  ? "bg-emerald-500"
                                  : "bg-slate-400 dark:bg-slate-600"
                              }`}
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold truncate leading-tight flex items-center gap-1.5">
                            {m.isAll ? (
                              <>
                                <span className="text-amber-700 dark:text-amber-300 font-black">
                                  @all
                                </span>
                                <span className="text-[8px] font-black uppercase px-1 py-0.2 rounded bg-amber-200/70 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200">
                                  Everyone
                                </span>
                              </>
                            ) : (
                              m.name
                            )}
                          </p>
                          <p className="text-[9px] text-slate-400 dark:text-slate-500 truncate capitalize mt-0.5">
                            {m.role} {m.department ? `• ${m.department}` : ""}
                          </p>
                        </div>
                        <span
                          className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md ${
                            m.isAll
                              ? "text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60"
                              : isOnline
                                ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30"
                                : "text-slate-400 dark:text-slate-500"
                          }`}
                        >
                          {m.isAll
                            ? "All Members"
                            : isOnline
                              ? "Online"
                              : "Offline"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

          {/* Sticker Picker Drawer */}
          {showStickerPicker && (
            <div className="absolute bottom-16 left-2 right-2 sm:left-4 sm:right-auto theme-bg-card border theme-border rounded-2xl p-3 shadow-xl z-20 w-auto sm:w-72">
              <div className="flex items-center justify-between mb-2 pb-2 border-b theme-border">
                <span className="text-[10px] font-black uppercase tracking-wider theme-text-primary px-1">
                  Emojis
                </span>
                <button
                  type="button"
                  onClick={() => setShowStickerPicker(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <FiX size={12} />
                </button>
              </div>
              <div className="grid grid-cols-6 gap-2 max-h-48 overflow-y-auto pr-1">
                {EMOJIS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setInputText((prev) => prev + s);
                    }}
                    className="text-2xl p-1 hover:theme-bg-main active:scale-90 transition-all rounded-lg cursor-pointer flex items-center justify-center"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Replying To Preview Bar */}
          {replyingToMessage && (
            <div className="mb-2 p-2.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between z-10 animate-slide-up shadow-sm">
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 min-w-0">
                <FiCornerUpLeft
                  className="text-indigo-500 shrink-0"
                  size={12}
                />
                <div className="truncate font-medium">
                  <span className="font-extrabold text-indigo-600 dark:text-indigo-400">
                    Replying to {replyingToMessage.sender?.name || "User"}:
                  </span>{" "}
                  <span className="italic text-slate-500 dark:text-slate-400 font-medium">
                    {replyingToMessage.messageType === "file"
                      ? `📁 ${replyingToMessage.file?.filename}`
                      : replyingToMessage.messageType === "sticker"
                        ? `🎨 Sticker: ${replyingToMessage.sticker}`
                        : replyingToMessage.text}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReplyingToMessage(null)}
                className="w-5 h-5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
              >
                <FiX size={10} className="stroke-[3]" />
              </button>
            </div>
          )}

          <form
            onSubmit={handleSendMessage}
            className="flex items-center gap-2"
          >
            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />

            <button
              type="button"
              disabled={uploadingFile}
              onClick={() => fileInputRef.current?.click()}
              className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all theme-bg-main theme-border theme-text-secondary hover:theme-text-primary shrink-0 ${
                uploadingFile
                  ? "opacity-50 cursor-not-allowed"
                  : "cursor-pointer"
              }`}
              title="Attach files, photo, video"
            >
              <FiPaperclip
                size={16}
                className={uploadingFile ? "animate-pulse" : ""}
              />
            </button>

            <button
              type="button"
              onClick={() => setShowStickerPicker(!showStickerPicker)}
              className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all shrink-0 cursor-pointer ${
                showStickerPicker
                  ? "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400"
                  : "theme-bg-main theme-border theme-text-secondary hover:theme-text-primary"
              }`}
              title="Stickers"
            >
              <FiSmile size={16} />
            </button>

            <input
              ref={inputRef}
              type="text"
              placeholder={
                isGroupType
                  ? "Type message, reply, or @ to mention..."
                  : "Type message or reply..."
              }
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={handleInputKeyDown}
              className="flex-1 theme-bg-main border theme-border rounded-xl px-4 py-2 text-xs outline-none focus:border-blue-600 dark:focus:border-[#3b82f6] focus:ring-2 focus:ring-blue-600/20 dark:focus:ring-[#3b82f6]/20 transition-all theme-text-primary placeholder:theme-text-secondary"
            />

            <button
              type="submit"
              disabled={!inputText.trim()}
              className="w-9 h-9 bg-blue-600 text-white dark:bg-[#3b82f6] dark:text-black rounded-xl flex items-center justify-center hover:bg-blue-700 dark:hover:bg-[#d4ec00] transition-all shadow-md shadow-blue-100 dark:shadow-[#3b82f6]/10 active:scale-95 disabled:opacity-50 disabled:shadow-none shrink-0 cursor-pointer"
            >
              <FiSend size={14} />
            </button>
          </form>
        </div>
      </div>

      {/* FORWARD MESSAGE MODAL */}
      {showForwardModal && forwardingMessage && (
        <div className="fixed inset-0 z-[250] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3 animate-fade-in">
          <div className="theme-bg-card w-full max-w-md rounded-2xl overflow-hidden shadow-2xl border theme-border flex flex-col max-h-[80vh]">
            {/* Modal Header */}
            <div className="px-4 py-3.5 border-b theme-border flex items-center justify-between theme-bg-main">
              <div>
                <h2 className="text-[13px] font-black text-slate-800 dark:text-white flex items-center gap-2">
                  <FiArrowRight size={14} className="text-blue-500" />
                  Forward Message
                </h2>
                <p className="text-slate-400 dark:text-slate-500 text-[9px] font-semibold mt-0.5">
                  Select a recipient or group to forward this message to.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowForwardModal(false);
                  setForwardingMessage(null);
                  setForwardSearchTerm("");
                }}
                className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-transparent flex items-center justify-center text-slate-400 dark:text-slate-350 hover:text-rose-500 transition-all cursor-pointer shadow-sm"
              >
                <FiX size={12} className="stroke-[3]" />
              </button>
            </div>

            {/* Recipients Search & List */}
            <div className="p-4 flex-1 overflow-y-auto space-y-4">
              <div className="relative">
                <FiSearch
                  size={12}
                  className="absolute top-1/2 -translate-y-1/2 left-3 text-slate-400"
                />
                <input
                  type="text"
                  placeholder="Search rooms or people..."
                  value={forwardSearchTerm}
                  onChange={(e) => setForwardSearchTerm(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Group Rooms */}
              <div className="space-y-2">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                  Group Rooms
                </p>
                <div className="space-y-1.5">
                  {rooms
                    .filter((r) =>
                      r.name
                        .toLowerCase()
                        .includes(forwardSearchTerm.toLowerCase()),
                    )
                    .map((r) => (
                      <div
                        key={r._id}
                        className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 border border-transparent dark:border-transparent dark:hover:border-slate-800 transition-all"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 dark:text-white truncate">
                            {r.name}
                          </p>
                          <p className="text-[9px] text-slate-400 dark:text-slate-500 truncate">
                            {r.members?.length || 0} members
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleForwardSubmit(r._id, "group")}
                          className="bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                        >
                          Send
                        </button>
                      </div>
                    ))}
                </div>
              </div>

              {/* Direct Contacts */}
              <div className="space-y-2 pt-2">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                  Direct Contacts
                </p>
                <div className="space-y-1.5">
                  {filteredUsers
                    .filter((u) =>
                      u.name
                        .toLowerCase()
                        .includes(forwardSearchTerm.toLowerCase()),
                    )
                    .map((u) => (
                      <div
                        key={u._id}
                        className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 border border-transparent dark:border-transparent dark:hover:border-slate-800 transition-all"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 dark:text-white truncate">
                            {u.name}
                          </p>
                          <p className="text-[9px] text-slate-400 dark:text-slate-500 truncate capitalize">
                            {u.role}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleForwardSubmit(u._id, "direct")}
                          className="bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                        >
                          Send
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE CUSTOM GROUP MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="theme-bg-card w-full max-w-md rounded-2xl sm:rounded-3xl overflow-hidden border theme-border shadow-2xl flex flex-col max-h-[90vh] p-4 sm:p-6 theme-text-primary">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
              <h3 className="text-base font-black text-slate-800 dark:text-blue-500 flex items-center gap-2">
                <FiUsers className="text-blue-500" /> Create Custom Group
              </h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setGroupName("");
                  setGroupDesc("");
                  setSelectedMembers([]);
                }}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-all cursor-pointer"
              >
                <FiX size={18} />
              </button>
            </div>

            <form
              onSubmit={handleCreateGroup}
              className="space-y-4 overflow-y-auto pr-1 flex-1 scrollbar-thin"
            >
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider block mb-1">
                  Group Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Frontend Devs"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-blue-400 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 transition-all text-slate-700 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider block mb-1">
                  Description (Optional)
                </label>
                <textarea
                  placeholder="What is this group for?"
                  rows={2}
                  value={groupDesc}
                  onChange={(e) => setGroupDesc(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-blue-400 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 transition-all text-slate-700 dark:text-slate-200 resize-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider block mb-1">
                  Select Members
                </label>
                <div className="max-h-40 overflow-y-auto border border-slate-100 dark:border-slate-800 rounded-xl p-2 space-y-1 bg-slate-50/50 dark:bg-slate-950/20 scrollbar-thin">
                  {filteredUsers?.map((u) => (
                    <label
                      key={u._id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer select-none"
                    >
                      <input
                        type="checkbox"
                        checked={selectedMembers.includes(u._id)}
                        onChange={() => handleToggleMember(u._id)}
                        className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 dark:border-slate-700 focus:ring-blue-500"
                      />
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200 block truncate">
                          {u.name}
                        </span>
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 capitalize block leading-none">
                          {u.role}
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setGroupName("");
                    setGroupDesc("");
                    setSelectedMembers([]);
                  }}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-100 hover:shadow-blue-200 transition-all cursor-pointer"
                >
                  Create Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MANAGE GROUP MEMBERS & DETAILS MODAL */}
      {showManageModal && activeCustomRoom && (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="theme-bg-card w-full max-w-md rounded-2xl sm:rounded-3xl overflow-hidden border theme-border shadow-2xl flex flex-col max-h-[90vh] p-4 sm:p-6 theme-text-primary">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
              <h3 className="text-base font-black text-slate-800 dark:text-blue-500 flex items-center gap-2">
                <FiSettings className="text-blue-500" /> Manage Custom Group
              </h3>
              <button
                onClick={() => setShowManageModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-650 dark:hover:text-slate-300 transition-all cursor-pointer"
              >
                <FiX size={18} />
              </button>
            </div>

            <form
              onSubmit={handleUpdateGroup}
              className="space-y-4 overflow-y-auto pr-1 flex-1 scrollbar-thin"
            >
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider block mb-1">
                  Group Name
                </label>
                <input
                  type="text"
                  value={manageGroupName}
                  disabled={!isCreatorOfActiveRoom && !isAdmin}
                  onChange={(e) => setManageGroupName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-blue-400 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 transition-all text-slate-700 dark:text-slate-200 disabled:opacity-60"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider block mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={manageGroupDesc}
                  disabled={!isCreatorOfActiveRoom && !isAdmin}
                  onChange={(e) => setManageGroupDesc(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-blue-400 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 transition-all text-slate-700 dark:text-slate-200 resize-none disabled:opacity-60"
                />
              </div>

              {/* Members Checklist / Viewer */}
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider block mb-1">
                  {isCreatorOfActiveRoom || isAdmin
                    ? "Add/Remove Members"
                    : "Group Members"}
                </label>
                <div className="max-h-40 overflow-y-auto border border-slate-100 dark:border-slate-800 rounded-xl p-2 space-y-1 bg-slate-50/50 dark:bg-slate-950/20 scrollbar-thin">
                  {filteredUsers?.map((u) => {
                    const isChecked = manageSelectedMembers.includes(u._id);
                    const isRoomCreator =
                      activeCustomRoom.creator._id === u._id;

                    // Non-creator/Non-admin just see members
                    if (!isCreatorOfActiveRoom && !isAdmin) {
                      if (!isChecked) return null;
                      return (
                        <div
                          key={u._id}
                          className="flex items-center gap-3 p-2 rounded-lg bg-white dark:bg-slate-850 border border-slate-100 dark:border-slate-850"
                        >
                          <div className="w-5 h-5 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold">
                            {u.name.charAt(0)}
                          </div>
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                            {u.name} ({u.role})
                          </span>
                        </div>
                      );
                    }

                    // Creator/Admin see checkboxes to toggle
                    return (
                      <label
                        key={u._id}
                        className={`flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer select-none ${
                          isRoomCreator ? "opacity-55 cursor-not-allowed" : ""
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked || isRoomCreator}
                          disabled={isRoomCreator}
                          onChange={() => handleToggleManageMember(u._id)}
                          className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 dark:border-slate-700 focus:ring-blue-500"
                        />
                        <div className="min-w-0 flex-1">
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-200 block truncate">
                            {u.name}{" "}
                            {isRoomCreator && (
                              <span className="text-[9px] text-amber-500 font-bold ml-1">
                                (Creator)
                              </span>
                            )}
                          </span>
                          <span className="text-[9px] text-slate-400 dark:text-slate-500 capitalize block leading-none">
                            {u.role}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* ACTION FOOTER */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                {/* Delete / Leave Actions */}
                <div className="flex items-center gap-2">
                  {isCreatorOfActiveRoom || isAdmin ? (
                    <button
                      type="button"
                      onClick={handleDeleteGroup}
                      className="px-3.5 py-2 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                      title="Delete Group"
                    >
                      <FiTrash2 size={13} /> Delete
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleLeaveGroup}
                      className="px-3.5 py-2 bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                      title="Leave Group"
                    >
                      <FiLogOut size={13} /> Leave Group
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowManageModal(false)}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Close
                  </button>
                  {(isCreatorOfActiveRoom || isAdmin) && (
                    <button
                      type="submit"
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-100 hover:shadow-blue-200 transition-all cursor-pointer"
                    >
                      Save Changes
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PREMIUM CALLING INTERFACE OVERLAY */}
      {activeCall && (
        <div className="fixed inset-0 z-[200] bg-slate-900/95 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-fade-in">
          <div className="bg-slate-800 w-full max-w-5xl rounded-2xl sm:rounded-3xl overflow-hidden border border-slate-700 shadow-2xl flex flex-col relative text-white h-[85vh] sm:h-[80vh]">
            <div
              ref={zegoMeetingRef}
              className="w-full h-full"
              style={{ width: "100%", height: "100%" }}
            />
          </div>
        </div>
      )}

      {/* USER DETAILS MODAL */}
      <AnimatePresence>
        {profileModalUser && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setProfileModalUser(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="relative w-full max-w-sm md:max-w-2xl overflow-hidden bg-white dark:bg-[#0f172a] border border-slate-200/80 rounded-3xl shadow-2xl z-10 flex flex-col md:flex-row transition-colors duration-300"
            >
              {/* Left Section - Full Image / Initials */}
              <div className="w-full md:w-[42%] min-h-[220px] md:min-h-[380px] bg-slate-50 dark:bg-slate-900/50 relative flex items-center justify-center shrink-0 overflow-hidden">
                {profileModalUser.profile?.profileImage?.url ? (
                  <>
                    <img
                      src={profileModalUser.profile.profileImage.url}
                      alt={profileModalUser.name}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-black/50 md:from-black/30 via-transparent to-transparent" />
                  </>
                ) : (
                  <div className="w-full h-full min-h-[220px] md:min-h-[380px] bg-gradient-to-tr from-indigo-500 to-purple-600 dark:from-[#3b82f6]/20 dark:to-emerald-500/20 flex items-center justify-center text-white dark:text-[#3b82f6] text-6xl font-black shadow-inner">
                    {profileModalUser.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Right Section - Details */}
              <div className="w-full md:w-[58%] p-6 md:p-8 flex flex-col justify-center relative bg-white dark:bg-[#0f172a]">
                {/* Close Button */}
                <button
                  onClick={() => setProfileModalUser(null)}
                  className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-800 transition-colors"
                >
                  <FiX size={18} />
                </button>

                <div>
                  {/* Header Badge */}
                  <span className="inline-block text-[9px] font-extrabold tracking-widest text-indigo-600 dark:text-[#3b82f6] uppercase bg-indigo-50 dark:bg-[#3b82f6]/10 px-2.5 py-1 rounded-full mb-4">
                    Member Profile
                  </span>

                  {/* Basic Info */}
                  <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight leading-tight">
                    {profileModalUser.name}
                  </h2>
                  <div className="flex flex-wrap items-center gap-1.5 mt-2 mb-6">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-md">
                      {profileModalUser.role}
                    </span>
                    {profileModalUser.department && (
                      <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-650 dark:text-[#3b82f6] bg-indigo-50 dark:bg-[#3b82f6]/10 px-2.5 py-0.5 rounded-md">
                        {profileModalUser.department}
                      </span>
                    )}
                  </div>

                  {/* Details List */}
                  <div className="space-y-4 border-t border-slate-100 pt-5">
                    {/* Email */}
                    <div className="flex items-start gap-3">
                      <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-slate-450 shrink-0">
                        <FiMail
                          size={14}
                          className="text-indigo-600 dark:text-[#3b82f6]"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[8px] font-extrabold uppercase tracking-wider text-slate-500">
                          Email Address
                        </p>
                        <p className="text-xs font-semibold text-slate-700 truncate mt-0.5 select-all">
                          {profileModalUser.email}
                        </p>
                      </div>
                    </div>

                    {/* Phone */}
                    {profileModalUser.profile?.phone ? (
                      <div className="flex items-start gap-3">
                        <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-slate-450 shrink-0">
                          <FiPhone
                            size={14}
                            className="text-indigo-600 dark:text-[#3b82f6]"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[8px] font-extrabold uppercase tracking-wider text-slate-500">
                            Phone Number
                          </p>
                          <p className="text-xs font-semibold text-slate-700 mt-0.5">
                            {profileModalUser.profile.phone}
                          </p>
                        </div>
                      </div>
                    ) : null}

                    {/* Bio */}
                    {profileModalUser.profile?.bio ? (
                      <div className="flex items-start gap-3">
                        <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-slate-450 shrink-0">
                          <FiInfo
                            size={14}
                            className="text-indigo-600 dark:text-[#3b82f6]"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[8px] font-extrabold uppercase tracking-wider text-slate-500">
                            About / Bio
                          </p>
                          <p className="text-[11px] font-medium text-slate-600 leading-relaxed mt-0.5 whitespace-pre-line italic">
                            "{profileModalUser.profile.bio}"
                          </p>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* GROUP MEMBERS PRESENCE DRAWER (GROUP CHAT ONLY) */}
      {isGroupType && showMembersDrawer && (
        <div className="fixed inset-0 z-[220] bg-slate-950/50 backdrop-blur-xs flex justify-end animate-fade-in">
          <div className="theme-bg-card w-full max-w-sm h-full shadow-2xl border-l theme-border flex flex-col animate-slide-left">
            {/* Drawer Header */}
            <div className="p-4 border-b theme-border flex items-center justify-between theme-bg-main">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600/10 text-blue-600 dark:bg-[#3b82f6]/10 dark:text-[#3b82f6] flex items-center justify-center font-bold">
                  <FiUsers size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black theme-text-primary leading-tight">
                    Group Members
                  </h3>
                  <p className="text-[10px] text-emerald-500 font-bold mt-0.5">
                    {currentGroupMembers.length} members ·{" "}
                    {
                      currentGroupMembers.filter((m) => isMemberOnline(m._id))
                        .length
                    }{" "}
                    online
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMembersDrawer(false)}
                className="w-7 h-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <FiX size={16} />
              </button>
            </div>

            {/* Member Search */}
            <div className="p-3 border-b theme-border theme-bg-main">
              <div className="relative">
                <FiSearch
                  size={12}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  placeholder="Search members..."
                  value={memberSearchTerm}
                  onChange={(e) => setMemberSearchTerm(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-blue-500/20 theme-text-primary"
                />
              </div>
            </div>

            {/* Members List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
              {currentGroupMembers
                .filter(
                  (m) =>
                    !memberSearchTerm ||
                    m.name
                      ?.toLowerCase()
                      .includes(memberSearchTerm.toLowerCase()) ||
                    m.role
                      ?.toLowerCase()
                      .includes(memberSearchTerm.toLowerCase()),
                )
                .sort((a, b) => {
                  const onlineA = isMemberOnline(a._id) ? 1 : 0;
                  const onlineB = isMemberOnline(b._id) ? 1 : 0;
                  return onlineB - onlineA;
                })
                .map((m) => {
                  const isOnline = isMemberOnline(m._id);
                  const lastSeenText = formatMemberLastSeen(m._id, m.lastSeen);
                  const isSelf = m._id === currentUserId;

                  return (
                    <div
                      key={m._id}
                      className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/40 border border-transparent hover:border-slate-100 dark:hover:border-slate-800 transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative shrink-0">
                          {m.profile?.profileImage?.url ? (
                            <img
                              src={m.profile.profileImage.url}
                              alt={m.name}
                              className="w-10 h-10 rounded-2xl object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-600 text-white font-black text-xs flex items-center justify-center">
                              {m.name?.charAt(0) || "U"}
                            </div>
                          )}
                          <span
                            className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ${
                              isOnline
                                ? "bg-emerald-500"
                                : "bg-slate-400 dark:bg-slate-600"
                            }`}
                            title={isOnline ? "Online" : "Offline"}
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 dark:text-white truncate flex items-center gap-1.5">
                            {m.name}{" "}
                            {isSelf && (
                              <span className="text-[9px] text-blue-500 font-bold">
                                (You)
                              </span>
                            )}
                          </p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate capitalize mt-0.5">
                            {m.role} {m.department ? `• ${m.department}` : ""}
                          </p>
                          <p
                            className={`text-[9px] font-semibold mt-0.5 ${
                              isOnline
                                ? "text-emerald-500"
                                : "text-slate-400 dark:text-slate-500"
                            }`}
                          >
                            {isOnline ? "🟢 Online" : `⚪ ${lastSeenText}`}
                          </p>
                        </div>
                      </div>

                      {!isSelf && (
                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          <button
                            type="button"
                            onClick={() => {
                              setShowMembersDrawer(false);
                              setActiveChat(m._id);
                              setShowChatWindowMobile(true);
                            }}
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-blue-600 dark:hover:text-[#3b82f6] transition-colors cursor-pointer"
                            title="Direct Chat"
                          >
                            <FiMessageSquare size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowMembersDrawer(false);
                              handleSelectMention(m);
                            }}
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-blue-600 dark:hover:text-[#3b82f6] transition-colors cursor-pointer"
                            title="Mention in message"
                          >
                            <FiAtSign size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* SEEN BY DETAILS MODAL (GROUP CHAT ONLY) */}
      {seenModalMessage &&
        (() => {
          const seenUserIds = (seenModalMessage.seenBy || []).map((s) =>
            (s.userId?._id || s.userId || s).toString(),
          );
          const senderId = (
            seenModalMessage.sender?._id ||
            seenModalMessage.sender ||
            ""
          ).toString();

          const notSeenMembers = currentGroupMembers.filter(
            (m) =>
              m._id.toString() !== senderId &&
              !seenUserIds.includes(m._id.toString()),
          );

          return (
            <div className="fixed inset-0 z-[250] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 animate-fade-in">
              <div className="theme-bg-card w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl border theme-border flex flex-col max-h-[85vh]">
                {/* Modal Header */}
                <div className="px-4 py-3.5 border-b theme-border flex items-center justify-between theme-bg-main">
                  <div>
                    <h3 className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-2">
                      <FiCheckCircle size={14} className="text-blue-500" />
                      Message Info & Read Status
                    </h3>
                    <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5 truncate max-w-[220px]">
                      "
                      {seenModalMessage.text ||
                        (seenModalMessage.messageType === "file"
                          ? seenModalMessage.file?.filename
                          : "Attachment")}
                      "
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSeenModalMessage(null)}
                    className="w-7 h-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-rose-500 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <FiX size={14} />
                  </button>
                </div>

                {/* Message Sent Preview */}
                <div className="px-4 py-2.5 bg-slate-50/70 dark:bg-slate-900/50 border-b theme-border flex items-center justify-between text-[10px]">
                  <span className="font-bold text-slate-500 dark:text-slate-400">
                    Sent at{" "}
                    {new Date(seenModalMessage.createdAt).toLocaleTimeString(
                      [],
                      { hour: "2-digit", minute: "2-digit" },
                    )}
                  </span>
                  <span className="font-extrabold text-blue-600 dark:text-[#3b82f6]">
                    {seenModalMessage.seenBy?.length || 0} of{" "}
                    {
                      currentGroupMembers.filter(
                        (m) => m._id.toString() !== senderId,
                      ).length
                    }{" "}
                    read
                  </span>
                </div>

                {/* Readers List */}
                <div className="p-3 flex-1 overflow-y-auto space-y-3 scrollbar-thin">
                  {/* READ BY SECTION */}
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 flex items-center gap-1.5">
                      <span className="flex items-center text-blue-500">
                        <FiCheck size={11} className="stroke-[3]" />
                        <FiCheck size={11} className="-ml-1.5 stroke-[3]" />
                      </span>
                      Read by ({seenModalMessage.seenBy?.length || 0})
                    </h4>

                    {!seenModalMessage.seenBy ||
                    seenModalMessage.seenBy.length === 0 ? (
                      <p className="text-xs text-center text-slate-400 py-3 font-semibold">
                        No one has read this message yet.
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        {seenModalMessage.seenBy.map((item, idx) => {
                          const reader = item.userId || item;
                          const isOnline = isMemberOnline(reader._id);
                          const seenTime = item.seenAt
                            ? new Date(item.seenAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "Recently";

                          return (
                            <div
                              key={item._id || idx}
                              className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all border border-transparent hover:border-slate-100 dark:hover:border-slate-800"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="relative shrink-0">
                                  {reader.profile?.profileImage?.url ? (
                                    <img
                                      src={reader.profile.profileImage.url}
                                      alt={reader.name}
                                      className="w-8 h-8 rounded-xl object-cover"
                                    />
                                  ) : (
                                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                                      {reader.name?.charAt(0) || "U"}
                                    </div>
                                  )}
                                  <span
                                    className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-1.5 ring-white dark:ring-slate-900 ${
                                      isOnline
                                        ? "bg-emerald-500"
                                        : "bg-slate-400 dark:bg-slate-600"
                                    }`}
                                  />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-slate-800 dark:text-white truncate">
                                    {reader.name}
                                  </p>
                                  <p className="text-[9px] text-slate-400 dark:text-slate-500 capitalize">
                                    {reader.role || "Member"}{" "}
                                    {reader.department
                                      ? `• ${reader.department}`
                                      : ""}
                                  </p>
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <span className="text-[10px] font-bold text-blue-600 dark:text-[#3b82f6] flex items-center gap-1 justify-end">
                                  <FiCheck size={11} /> {seenTime}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* NOT READ YET SECTION */}
                  {notSeenMembers.length > 0 && (
                    <div className="pt-2 border-t theme-border">
                      <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 flex items-center gap-1.5">
                        <FiCheck size={11} className="text-slate-400" />
                        Delivered / Not read yet ({notSeenMembers.length})
                      </h4>
                      <div className="space-y-1.5">
                        {notSeenMembers.map((m) => {
                          const isOnline = isMemberOnline(m._id);
                          return (
                            <div
                              key={m._id}
                              className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all opacity-80"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="relative shrink-0">
                                  {m.profile?.profileImage?.url ? (
                                    <img
                                      src={m.profile.profileImage.url}
                                      alt={m.name}
                                      className="w-8 h-8 rounded-xl object-cover"
                                    />
                                  ) : (
                                    <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs flex items-center justify-center">
                                      {m.name?.charAt(0) || "U"}
                                    </div>
                                  )}
                                  <span
                                    className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-1.5 ring-white dark:ring-slate-900 ${
                                      isOnline
                                        ? "bg-emerald-500"
                                        : "bg-slate-400 dark:bg-slate-600"
                                    }`}
                                  />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">
                                    {m.name}
                                  </p>
                                  <p className="text-[9px] text-slate-400 dark:text-slate-500 capitalize">
                                    {m.role || "Member"}
                                  </p>
                                </div>
                              </div>

                              <span className="text-[9px] font-bold text-slate-400 bg-slate-100 dark:bg-red-500 dark:text-white px-2 py-0.5 rounded-full">
                                Delivered
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

      {/* Full Emoji Reaction Picker Modal */}
      {showFullEmojiReactionModal && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          onClick={() => setShowFullEmojiReactionModal(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xl max-w-xs w-full animate-scale-up"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
              <span className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                <FiSmile size={14} className="text-amber-500" /> React to
                Message
              </span>
              <button
                type="button"
                onClick={() => setShowFullEmojiReactionModal(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <FiX size={14} />
              </button>
            </div>
            <div className="grid grid-cols-6 gap-2 max-h-60 overflow-y-auto pr-1">
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    handleToggleReaction(showFullEmojiReactionModal, emoji);
                    setShowFullEmojiReactionModal(null);
                  }}
                  className="text-2xl p-1 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-90 transition-all rounded-lg cursor-pointer flex items-center justify-center"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatPage;
