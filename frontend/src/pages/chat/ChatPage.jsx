import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { ZegoUIKitPrebuilt } from "@zegocloud/zego-uikit-prebuilt";
import { useSearchParams } from "react-router-dom";
import { getUsers } from "../../features/users/userSlice";
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
} from "../../features/chat/chatSlice";
import {
  FiSend,
  FiUser,
  FiVideo,
  FiPhone,
  FiSmile,
  FiSearch,
  FiChevronLeft,
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
} from "react-icons/fi";
import io from "socket.io-client";
import toast from "react-hot-toast";
import axiosInstance from "../../services/axiosInstance";
import { motion, AnimatePresence } from "framer-motion";
import { FiMail, FiInfo, FiEye } from "react-icons/fi";

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
  const {
    messages,
    rooms,
    loading,
    unreadCounts = {},
    lastMessages = {},
  } = useSelector((s) => s.chat);

  const [activeChat, setActiveChat] = useState("group"); // 'group' or custom roomId or userId
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDept, setSelectedDept] = useState("All");
  const [inputText, setInputText] = useState("");
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [showChatWindowMobile, setShowChatWindowMobile] = useState(false);

  // New Reply, Forward & Share State
  const [replyingToMessage, setReplyingToMessage] = useState(null);
  const [forwardingMessage, setForwardingMessage] = useState(null);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [forwardSearchTerm, setForwardSearchTerm] = useState("");
  const [showShareMenu, setShowShareMenu] = useState(null);
  const [sharingMessage, setSharingMessage] = useState(null);

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
  const [activeCall, setActiveCall] = useState(null); // 'video' or 'voice' or null
  const [callRoomId, setCallRoomId] = useState("");
  const [uploadingFile, setUploadingFile] = useState(false);
  const [activeMessageMenu, setActiveMessageMenu] = useState(null);
  const [profileModalUser, setProfileModalUser] = useState(null);

  const zegoInitializedRef = useRef(false);
  const zegoInstanceRef = useRef(null);

  const socketRef = useRef();
  const messagesEndRef = useRef();
  const fileInputRef = useRef();

  const currentUserId = user?._id || user?.id;

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

  // Mark chat as read
  useEffect(() => {
    if (activeChat) {
      dispatch(markChatAsRead(activeChat));
    }
  }, [activeChat, dispatch]);

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
      transports: ["polling", "websocket"],
      withCredentials: true
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

    socketRef.current.on("direct_message", (msg) => {
      dispatch(
        receiveMessage({
          message: msg,
          currentUserId,
        }),
      );
    });

    socketRef.current.on("group_message", (msg) => {
      dispatch(
        receiveMessage({
          message: msg,
          currentUserId,
        }),
      );
    });

    socketRef.current.on("message_deleted", ({ messageId }) => {
      dispatch(removeMessage(messageId));
    });

    socketRef.current.on("chat_cleared", ({ otherUserId }) => {
      dispatch(clearChatLocal(otherUserId));
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, [currentUserId, dispatch]);

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

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    const trimmedText = inputText.trim();
    if (!trimmedText) return;

    const isGroupType =
      activeChat === "group" || rooms.some((r) => r._id === activeChat);
    const isSingleSticker =
      STICKERS.includes(trimmedText) || EMOJIS.includes(trimmedText);

    const payload = {
      recipient: isGroupType ? null : activeChat,
      chatRoom: isGroupType ? activeChat : "direct",
      ...(isSingleSticker
        ? { sticker: trimmedText, messageType: "sticker" }
        : { text: inputText, messageType: "text" }),
      replyTo: replyingToMessage?._id || null,
    };

    setInputText("");
    setReplyingToMessage(null);
    await dispatch(sendMessageAction(payload)).unwrap();
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

  const sortedDMs = filteredUsers
    ? [...filteredUsers].sort((a, b) => {
        const msgA = lastMessages[a._id];
        const msgB = lastMessages[b._id];
        const timeA = msgA ? new Date(msgA.createdAt).getTime() : 0;
        const timeB = msgB ? new Date(msgB.createdAt).getTime() : 0;
        return timeB - timeA;
      })
    : [];

  const sortedRooms = rooms
    ? [...rooms].sort((a, b) => {
        const msgA = lastMessages[a._id];
        const msgB = lastMessages[b._id];
        const timeA = msgA ? new Date(msgA.createdAt).getTime() : 0;
        const timeB = msgB ? new Date(msgB.createdAt).getTime() : 0;
        return timeB - timeA;
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
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs outline-none focus:border-blue-600 dark:focus:border-[#3b82f6] focus:ring-2 focus:ring-blue-600/20 dark:focus:ring-[#3b82f6]/20 transition-all theme-text-primary placeholder:theme-text-secondary"
              />
            </div>

            <div>
               <button
              onClick={() => setShowCreateModal(true)}
              className="w-7 h-7 rounded-lg bg-blue-600 text-white hover:bg-blue-700 dark:bg-[#3b82f6] dark:text-gray-900 flex items-center justify-center transition-all cursor-pointer shadow-sm"
              title="Create Custom Group"
            >
              <FiPlus size={16} />
            </button>

            </div>

           
          </div>

         
        </div>

        {/* DIRECTORY LIST */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 scrollbar-thin">
          {/* 1. Global Group Chat */}
          <div>
           
            <button
              onClick={() => {
                setActiveChat("group");
                setShowChatWindowMobile(true);
              }}
              className={`chat-sidebar-item ${
                activeChat === "group" ? "chat-sidebar-item-active" : ""
              }`}
            >
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold shrink-0 ${activeChat === "group" ? "bg-blue-600/10 text-blue-600 dark:bg-[#3b82f6]/10 dark:text-[#3b82f6]" : "bg-blue-600 text-white dark:bg-[#3b82f6] dark:text-black shadow-sm"}`}
              >
                <FiLayers size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="item-title truncate">Kerplunk Group Team chat</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {unreadCounts["group"] > 0 && (
                      <span className="bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full shrink-0 min-w-[16px] text-center shadow-sm">
                        {unreadCounts["group"]}
                      </span>
                    )}
                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      All
                    </span>
                  </div>
                </div>
                <p className="item-subtitle truncate mt-0.5">
                  {lastMessages["group"]
                    ? formatLastMessageText(lastMessages["group"])
                    : "All developers and admins"}
                </p>
              </div>
            </button>
          </div>

          {/* CUSTOM GROUP CHATS */}
          {sortedRooms.length > 0 && (
            <>
              <div className="h-px theme-border border-t my-2" />
              <p className="text-[10px] font-black uppercase tracking-wider  px-3 mb-1.5">
                Custom Groups
              </p>

              {sortedRooms.map((r) => (
                <button
                  key={r._id}
                  onClick={() => {
                    setActiveChat(r._id);
                    setShowChatWindowMobile(true);
                  }}
                  className={`chat-sidebar-item ${
                    activeChat === r._id ? "chat-sidebar-item-active" : ""
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold shrink-0 ${activeChat === r._id ? "bg-blue-600/10 text-blue-600 dark:bg-[#3b82f6]/10 dark:text-[#3b82f6]" : "bg-blue-600 text-white dark:bg-[#3b82f6] dark:text-black shadow-sm"}`}
                  >
                    <FiUsers size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="item-title truncate">{r.name}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {unreadCounts[r._id] > 0 && (
                          <span className="bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full shrink-0 min-w-[16px] text-center shadow-sm">
                            {unreadCounts[r._id]}
                          </span>
                        )}
                        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500">
                          {r.members.length} members
                        </span>
                      </div>
                    </div>
                    <p className="item-subtitle truncate mt-0.5">
                      {lastMessages[r._id]
                        ? formatLastMessageText(lastMessages[r._id])
                        : r.description || "No description"}
                    </p>
                  </div>
                </button>
              ))}
            </>
          )}

          <div className="h-px theme-border border-t my-2" />
          <div className="px-3 mb-2">
           
            {/* Scrollable Department Tabs */}
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

          {/* User List */}
          {sortedDMs.length === 0 ? (
            <p className="text-[10px] theme-text-secondary text-center py-6 font-semibold">
              No members found
            </p>
          ) : (
            sortedDMs.map((u) => (
              <div
                key={u._id}
                onClick={() => {
                  setActiveChat(u._id);
                  setShowChatWindowMobile(true);
                }}
                className={`chat-sidebar-item group relative flex items-center gap-3 cursor-pointer select-none ${
                  activeChat === u._id ? "chat-sidebar-item-active" : ""
                }`}
              >
                <div className="relative shrink-0">
                  {u.profile?.profileImage?.url ? (
                    <img
                      src={u.profile.profileImage.url}
                      alt="profile"
                      className={`w-10 h-10 rounded-2xl object-cover border ${activeChat === u._id ? "border-blue-600/30 dark:border-[#3b82f6]/30" : "theme-border"}`}
                    />
                  ) : (
                    <div
                      className={`w-10 h-10 rounded-2xl border flex items-center justify-center font-bold text-xs ${activeChat === u._id ? "bg-blue-600/10 border-blue-600/20 text-blue-600 dark:bg-[#3b82f6]/10 dark:border-[#3b82f6]/20 dark:text-[#3b82f6] font-bold" : "bg-indigo-100 dark:bg-indigo-900/40 border-indigo-200/80 dark:border-indigo-800/60 text-indigo-600 dark:text-indigo-400"}`}
                    >
                      {u.name.charAt(0)}
                    </div>
                  )}
                  <span
                    className={`absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 shadow-sm ${activeChat === u._id ? "border-blue-500 dark:border-slate-900" : "border-white dark:border-slate-900"}`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="item-title truncate block">{u.name}</span>
                  <p className="item-subtitle truncate mt-0.5">
                    {lastMessages[u._id]
                      ? formatLastMessageText(lastMessages[u._id])
                      : `${u.department ? `${u.department}` : ""}`}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-auto relative min-h-[32px] justify-end">
                  {/* Unread badge */}
                  {unreadCounts[u._id] > 0 && (
                    <span className="absolute right-0 bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full shrink-0 min-w-[16px] text-center shadow-sm group-hover:scale-0 group-hover:opacity-0 transition-all duration-200">
                      {unreadCounts[u._id]}
                    </span>
                  )}

                  {/* Action Group */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100 transition-all duration-200 origin-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setProfileModalUser(u);
                      }}
                      className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-indigo-650 dark:hover:text-[#3b82f6] transition-colors cursor-pointer"
                      title="View Profile"
                    >
                      <FiEye size={13} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClearChat(u._id, u.name);
                      }}
                      className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-rose-500 dark:hover:text-rose-450 transition-colors cursor-pointer"
                      title="Delete Conversation"
                    >
                      <FiTrash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
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
                  <FiLayers size={16} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-black theme-text-primary leading-tight truncate max-w-[120px] sm:max-w-xs">
                    Kerplunk Group Chat
                  </h3>
                  <p className="text-[9px] text-emerald-500 font-black uppercase tracking-wider leading-none mt-1 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />{" "}
                    Active Room
                  </p>
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
                  <button
                    onClick={handleOpenManageModal}
                    className="text-[9px] text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 font-bold uppercase tracking-wider leading-none mt-1 flex items-center gap-1 cursor-pointer"
                  >
                    <FiSettings size={10} /> Manage Members
                  </button>
                </div>
              </>
            ) : activeChatUser ? (
              <>
                {activeChatUser.profile?.profileImage?.url ? (
                  <img
                    src={activeChatUser.profile.profileImage.url}
                    alt="profile"
                    className="w-10 h-10 rounded-2xl object-cover border theme-border shrink-0 cursor-pointer hover:scale-105 active:scale-95 transition-transform"
                    onClick={() => setProfileModalUser(activeChatUser)}
                  />
                ) : (
                  <div
                    className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-900/40 border border-indigo-100 dark:border-indigo-800/60 flex items-center justify-center font-black text-indigo-600 dark:text-indigo-400 text-xs shrink-0 cursor-pointer hover:scale-105 active:scale-95 transition-transform"
                    onClick={() => setProfileModalUser(activeChatUser)}
                  >
                    {activeChatUser.name.charAt(0)}
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="text-xs font-black theme-text-primary leading-tight truncate max-w-[120px] sm:max-w-xs">
                    {activeChatUser.name}
                  </h3>
                  <p className="text-[9px] theme-text-secondary font-semibold capitalize mt-0.5 leading-none truncate max-w-[120px] sm:max-w-xs">
                  
                    {activeChatUser.department
                      ? `${activeChatUser.department}`
                      : ""}
                  </p>
                </div>
              </>
            ) : null}
          </div>

          {/* CALL TRIGGER BUTTONS */}
          <div className="flex items-center gap-1.5 shrink-0">
            {activeChatUser && (
              <button
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
        <div className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-2 sm:space-y-3.5 scrollbar-thin bg-chat-wallpaper">
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
            messages.map((m) => {
              const isMe = m.sender?._id === currentUserId;
              const senderInitial = m.sender?.name?.charAt(0) || "?";

              const renderReplyPreview = (replyTo) => (
                <div
                  className={`mb-2 p-2 rounded-lg border-l-[3px] text-[10px] text-left transition-all ${
                    isMe
                      ? "bg-black/15 dark:bg-black/30 border-white/60 dark:border-white/40"
                      : "bg-[var(--accent-light-bg-subtle)] dark:bg-[var(--accent-dark-bg-subtle)] border-[var(--accent-color)] dark:border-[var(--accent-color-dark)]"
                  }`}
                >
                  <div
                    className={`font-black text-[9px] mb-0.5 uppercase tracking-wider ${
                      isMe
                        ? "text-white/80 dark:text-white/70"
                        : "theme-text-accent"
                    }`}
                  >
                    ↩ Replying to {replyTo.sender?.name || "User"}
                  </div>
                  <div
                    className={`truncate font-semibold text-[10px] ${
                      isMe
                        ? "text-white/70 dark:text-white/60"
                        : "text-slate-600 dark:text-slate-300"
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

              // Check if Call message style
              if (m.messageType === "call") {
                return (
                  <div key={m._id} className="flex justify-center my-2">
                    <div className="theme-bg-main border theme-border rounded-full px-4 py-1.5 flex items-center gap-2 text-[10px] font-bold theme-text-secondary shadow-sm">
                      {m.text.includes("Video") ? (
                        <FiVideo size={12} />
                      ) : (
                        <FiPhone size={12} />
                      )}
                      <span>{m.text}</span>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={m._id}
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
                      <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mb-0.5 ml-1">
                        {m.sender?.name} ({m.sender?.role})
                      </span>
                    )}

                    {/* Content Display */}
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
                                {(m.file.size / 1024 / 1024).toFixed(2)} MB
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
                                {(m.file.size / 1024 / 1024).toFixed(2)} MB
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
                                {(m.file.size / 1024 / 1024).toFixed(2)} MB •
                                File
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
                            ? "chat-bubble-me rounded-tr-none"
                            : "theme-bg-card theme-text-primary theme-border rounded-tl-none"
                        }`}
                      >
                        {m.replyTo && renderReplyPreview(m.replyTo)}
                        {m.text.includes("Join my live") ? (
                          <div className="flex flex-col gap-2.5 p-0.5">
                            <span className="font-semibold">{m.text}</span>
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
                          m.text
                        )}
                      </div>
                    )}

                    {/* Timestamp */}
                    <span className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold mt-1 px-1">
                      {new Date(m.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  {/* Message Options Menu */}
                  <div
                    className={`flex items-center gap-1 transition-opacity self-center shrink-0 ${
                      isMe ? "flex-row-reverse" : ""
                    } ${
                      activeMessageMenu === m._id
                        ? "opacity-100"
                        : "opacity-0 md:group-hover:opacity-100"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setReplyingToMessage(m);
                        setActiveMessageMenu(null);
                      }}
                      className="p-1 rounded-lg theme-bg-main hover:theme-bg-card theme-text-secondary hover:theme-text-primary border theme-border cursor-pointer"
                      title="Reply"
                    >
                      <FiCornerUpLeft size={11} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setForwardingMessage(m);
                        setShowForwardModal(true);
                        setActiveMessageMenu(null);
                      }}
                      className="p-1 rounded-lg theme-bg-main hover:theme-bg-card theme-text-secondary hover:theme-text-primary border theme-border cursor-pointer"
                      title="Forward"
                    >
                      <FiArrowRight size={11} />
                    </button>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSharingMessage(m);
                          setShowShareMenu(
                            showShareMenu === m._id ? null : m._id,
                          );
                        }}
                        className="p-1 rounded-lg theme-bg-main hover:theme-bg-card theme-text-secondary hover:theme-text-primary border theme-border cursor-pointer"
                        title="Share"
                      >
                        <FiShare2 size={11} />
                      </button>
                      {showShareMenu === m._id && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className={`absolute bottom-7 ${isMe ? "right-0" : "left-0"} theme-bg-card border theme-border rounded-xl py-1 shadow-lg z-30 w-28`}
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleShareExternal(m, "whatsapp");
                              setActiveMessageMenu(null);
                            }}
                            className="w-full px-2.5 py-1.5 hover:theme-bg-main text-left text-[9px] font-bold theme-text-primary flex items-center gap-1.5 cursor-pointer"
                          >
                            WhatsApp
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleShareExternal(m, "email");
                              setActiveMessageMenu(null);
                            }}
                            className="w-full px-2.5 py-1.5 hover:theme-bg-main text-left text-[9px] font-bold theme-text-primary flex items-center gap-1.5 cursor-pointer"
                          >
                            Email
                          </button>
                        </div>
                      )}
                    </div>
                    {(isMe || user.role === "admin") && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteMessage(m._id);
                          setActiveMessageMenu(null);
                        }}
                        className="p-1 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 cursor-pointer"
                        title="Delete"
                      >
                        <FiTrash2 size={11} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* INPUT FORM CONTAINER */}
        <div className="px-2 sm:px-4 py-2.5 sm:py-3 theme-bg-card border-t theme-border relative shrink-0 transition-colors duration-300">
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
              type="text"
              placeholder="Type message or reply..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
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
    </div>
  );
};

export default ChatPage;
