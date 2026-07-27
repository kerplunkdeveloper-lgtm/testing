import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../../services/axiosInstance";

export const fetchLastMessages = createAsyncThunk(
  "chat/fetchLastMessages",
  async (_, thunkAPI) => {
    try {
      const response = await axiosInstance.get("/messages/last");
      return response.data.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || "Failed to load last messages");
    }
  }
);

export const fetchDirectMessages = createAsyncThunk(
  "chat/fetchDirectMessages",
  async (userId, thunkAPI) => {
    try {
      const response = await axiosInstance.get(`/messages/direct/${userId}`);
      return response.data.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || "Failed to load direct messages");
    }
  }
);

export const fetchGroupMessages = createAsyncThunk(
  "chat/fetchGroupMessages",
  async (roomId, thunkAPI) => {
    try {
      const url = roomId && roomId !== "group" ? `/messages/group/${roomId}` : "/messages/group";
      const response = await axiosInstance.get(url);
      return response.data.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || "Failed to load group messages");
    }
  }
);

export const sendMessageAction = createAsyncThunk(
  "chat/sendMessageAction",
  async (messageData, thunkAPI) => {
    try {
      const response = await axiosInstance.post("/messages", messageData);
      return response.data.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || "Failed to send message");
    }
  }
);

// Get all custom groups the user belongs to
export const fetchRooms = createAsyncThunk(
  "chat/fetchRooms",
  async (_, thunkAPI) => {
    try {
      const response = await axiosInstance.get("/messages/rooms");
      return response.data.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || "Failed to fetch custom groups");
    }
  }
);

// Create a custom group room
export const createRoomAction = createAsyncThunk(
  "chat/createRoomAction",
  async (roomData, thunkAPI) => {
    try {
      const response = await axiosInstance.post("/messages/rooms", roomData);
      return response.data.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || "Failed to create group");
    }
  }
);

// Update custom group room details (name, description, or members)
export const updateRoomAction = createAsyncThunk(
  "chat/updateRoomAction",
  async ({ id, roomData }, thunkAPI) => {
    try {
      const response = await axiosInstance.put(`/messages/rooms/${id}`, roomData);
      return response.data.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || "Failed to update group");
    }
  }
);

// Delete custom group room
export const deleteRoomAction = createAsyncThunk(
  "chat/deleteRoomAction",
  async (id, thunkAPI) => {
    try {
      await axiosInstance.delete(`/messages/rooms/${id}`);
      return id;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || "Failed to delete group");
    }
  }
);

export const deleteMessageAction = createAsyncThunk(
  "chat/deleteMessageAction",
  async (messageId, thunkAPI) => {
    try {
      await axiosInstance.delete(`/messages/${messageId}`);
      return messageId;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || "Failed to delete message");
    }
  }
);

export const clearChatAction = createAsyncThunk(
  "chat/clearChatAction",
  async (userId, thunkAPI) => {
    try {
      await axiosInstance.delete(`/messages/direct/${userId}`);
      return userId;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || "Failed to clear chat");
    }
  }
);

// Helper to safely get a string ID from a field that could be an object or string
const getIdString = (field) => {
  if (!field) return "";
  if (typeof field === "string") return field;
  if (field._id) return field._id.toString();
  return field.toString();
};

const chatSlice = createSlice({
  name: "chat",
  initialState: {
    messages: [],
    rooms: [],
    loading: false,
    error: null,
    activeChatId: null, // Track the current active chat for proper message routing
    unreadCounts: {},
    lastMessages: {},
  },
  reducers: {
    setActiveChatId: (state, action) => {
      state.activeChatId = action.payload;
    },
    receiveMessage: (state, action) => {
      const { message, currentUserId } = action.payload;
      if (!message) return;

      const senderId = getIdString(message.sender);
      const recipientId = getIdString(message.recipient);

      // Determine which chat this message belongs to
      let chatId;
      if (message.chatRoom === "direct") {
        // Security guard: if current user is neither sender nor recipient of this direct message, ignore it!
        if (senderId !== currentUserId && recipientId !== currentUserId) {
          return;
        }
        // For direct messages, chatId is the OTHER person's ID
        chatId = senderId === currentUserId ? recipientId : senderId;
      } else {
        // For group/custom room messages, chatId is the room identifier
        chatId = message.chatRoom;
      }

      // Don't add duplicate messages
      const exists = state.messages.some((m) => m._id === message._id);
      if (!exists) {
        // Only add to messages array if this message belongs to the active chat
        if (chatId === state.activeChatId) {
          state.messages.push(message);
        }
      }

      // Always update last message for this chat (for sidebar preview)
      state.lastMessages[chatId] = message;

      // Increment unread count if:
      // 1. It's not the currently active/open chat
      // 2. The sender is not the current user (don't count own messages)
      if (chatId !== state.activeChatId && senderId !== currentUserId) {
        state.unreadCounts[chatId] = (state.unreadCounts[chatId] || 0) + 1;
      }
    },
    markChatAsRead: (state, action) => {
      const chatId = action.payload;
      state.unreadCounts[chatId] = 0;
    },
    clearAllUnreadCounts: (state) => {
      state.unreadCounts = {};
    },
    incrementUnreadCount: (state, action) => {
      const chatId = action.payload;
      // If we are currently active on this chat, do not increment
      if (state.activeChatId === chatId) return;
      state.unreadCounts[chatId] = (state.unreadCounts[chatId] || 0) + 1;
    },
    removeMessage: (state, action) => {
      state.messages = state.messages.filter((m) => m._id !== action.payload);
    },
    clearMessages: (state) => {
      state.messages = [];
    },
    clearChatLocal: (state, action) => {
      const otherUserId = action.payload;
      if (state.activeChatId === otherUserId) {
        state.messages = [];
      }
      delete state.lastMessages[otherUserId];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(clearChatAction.fulfilled, (state, action) => {
        const otherUserId = action.payload;
        if (state.activeChatId === otherUserId) {
          state.messages = [];
        }
        delete state.lastMessages[otherUserId];
      })
      .addCase(fetchDirectMessages.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.messages = []; // Clear old messages immediately to prevent cross-chat bleed
      })
      .addCase(fetchDirectMessages.fulfilled, (state, action) => {
        // Race condition guard: only apply if this response matches the active chat
        const requestedUserId = action.meta.arg;
        if (state.activeChatId === requestedUserId) {
          state.loading = false;
          state.messages = action.payload;
        } else {
          state.loading = false;
        }
      })
      .addCase(fetchDirectMessages.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchGroupMessages.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.messages = []; // Clear old messages immediately to prevent cross-chat bleed
      })
      .addCase(fetchGroupMessages.fulfilled, (state, action) => {
        // Race condition guard: only apply if this response matches the active chat
        const requestedRoomId = action.meta.arg || "group";
        if (state.activeChatId === requestedRoomId) {
          state.loading = false;
          state.messages = action.payload;
        } else {
          state.loading = false;
        }
      })
      .addCase(fetchGroupMessages.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(sendMessageAction.fulfilled, (state, action) => {
        const message = action.payload;
        
        // Compute which chat this message belongs to
        const senderId = getIdString(message.sender);
        const recipientId = getIdString(message.recipient);
        let chatId;
        if (message.chatRoom === "direct") {
          chatId = recipientId; // Sender is always the current user when sending
        } else {
          chatId = message.chatRoom;
        }

        // Only add to messages array if this message belongs to the active chat
        const exists = state.messages.some((m) => m._id === message._id);
        if (!exists && chatId === state.activeChatId) {
          state.messages.push(message);
        }
        
        // Always update lastMessages for sidebar preview
        state.lastMessages[chatId] = message;
      })
      // Rooms/Groups Reducers
      .addCase(fetchRooms.fulfilled, (state, action) => {
        state.rooms = action.payload;
      })
      .addCase(fetchLastMessages.fulfilled, (state, action) => {
        state.lastMessages = action.payload || {};
      })
      .addCase(createRoomAction.fulfilled, (state, action) => {
        state.rooms.push(action.payload);
      })
      .addCase(updateRoomAction.fulfilled, (state, action) => {
        state.rooms = state.rooms.map((r) =>
          r._id === action.payload._id ? action.payload : r
        );
      })
      .addCase(deleteRoomAction.fulfilled, (state, action) => {
        state.rooms = state.rooms.filter((r) => r._id !== action.payload);
      })
      .addCase(deleteMessageAction.fulfilled, (state, action) => {
        state.messages = state.messages.filter((m) => m._id !== action.payload);
      });
  },
});

export const { receiveMessage, removeMessage, clearMessages, markChatAsRead, clearAllUnreadCounts, setActiveChatId, clearChatLocal, incrementUnreadCount } = chatSlice.actions;
export default chatSlice.reducer;
