const Message = require("../models/Message");
const Notification = require("../models/Notification");
const User = require("../models/User");
const ChatRoom = require("../models/ChatRoom");
const cloudinary = require("../config/cloudinary");

// @desc    Get direct messages between logged in user and another user
// @route   GET /api/messages/direct/:userId
// @access  Private
exports.getDirectMessages = async (req, res) => {
  try {
    const otherUserId = req.params.userId;
    const messages = await Message.find({
      $or: [
        { sender: req.user.id, recipient: otherUserId, chatRoom: "direct" },
        { sender: otherUserId, recipient: req.user.id, chatRoom: "direct" },
      ],
    })
      .sort("createdAt")
      .populate({
        path: "sender",
        select: "name email role profile",
        populate: { path: "profile" }
      })
      .populate({
        path: "recipient",
        select: "name email role profile",
        populate: { path: "profile" }
      })
      .populate({
        path: "replyTo",
        populate: { path: "sender", select: "name" }
      });

    res.status(200).json({
      success: true,
      data: messages,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get group messages (accepts roomId parameter)
// @route   GET /api/messages/group/:roomId
// @access  Private
exports.getGroupMessages = async (req, res) => {
  try {
    const roomId = req.params.roomId || "group";

    // If it's a custom group room, verify user is a member
    if (roomId !== "group") {
      const room = await ChatRoom.findById(roomId);
      if (!room) {
        return res.status(404).json({ success: false, message: "Group room not found" });
      }
      const isMember = room.members.some(
        (memberId) => memberId.toString() === req.user.id.toString()
      );
      if (!isMember && req.user.role !== "admin") {
        return res.status(403).json({ success: false, message: "Not authorized to access this room" });
      }
    }

    const messages = await Message.find({ chatRoom: roomId })
      .sort("createdAt")
      .populate({
        path: "sender",
        select: "name email role profile",
        populate: { path: "profile" }
      })
      .populate({
        path: "replyTo",
        populate: { path: "sender", select: "name" }
      });

    res.status(200).json({
      success: true,
      data: messages,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Send a message (REST API)
// @route   POST /api/messages
// @access  Private
exports.sendMessage = async (req, res) => {
  try {
    const { recipient, chatRoom, text, sticker, messageType, file, callStatus, callDuration, replyTo } = req.body;

    // Check membership authorization if sending to custom room
    if (chatRoom && chatRoom !== "group" && chatRoom !== "direct") {
      const room = await ChatRoom.findById(chatRoom);
      if (!room) {
        return res.status(404).json({ success: false, message: "Group room not found" });
      }
      const isMember = room.members.some(
        (memberId) => memberId.toString() === req.user.id.toString()
      );
      if (!isMember && req.user.role !== "admin") {
        return res.status(403).json({ success: false, message: "Not authorized to post to this group room" });
      }
    }

    const message = await Message.create({
      sender: req.user.id,
      recipient: (chatRoom === "group" || chatRoom !== "direct") ? null : recipient,
      chatRoom: chatRoom || "direct",
      text,
      sticker,
      messageType: messageType || "text",
      file,
      callStatus,
      callDuration,
      replyTo,
    });

    const populatedMessage = await Message.findById(message._id)
      .populate({
        path: "sender",
        select: "name email role profile",
        populate: { path: "profile" }
      })
      .populate({
        path: "recipient",
        select: "name email role profile",
        populate: { path: "profile" }
      })
      .populate({
        path: "replyTo",
        populate: { path: "sender", select: "name" }
      });

    const io = req.app.get("io");

    if (chatRoom === "group") {
      // Emit to all users in group chat
      if (io) {
        io.to("group_chat").emit("group_message", populatedMessage);

        // Also send a real-time notification to all other users in the database
        const notificationText = text || (messageType === 'sticker' ? 'Sent a sticker' : messageType === 'file' ? `Sent a file: ${file?.filename || 'Attachment'}` : 'Call log');
        const allUsers = await User.find({ _id: { $ne: req.user.id } });
        
        for (const otherUser of allUsers) {
          const notification = await Notification.create({
            recipient: otherUser._id,
            sender: req.user.id,
            type: "message_received",
            message: `New message in General Group Chat from ${req.user.name}: "${notificationText}"`,
            chatRoomId: "group",
            chatRoomType: "group",
          });
          const populatedNotification = await Notification.findById(notification._id).populate({
            path: "sender",
            select: "name profile",
            populate: { path: "profile" }
          });
          io.to(otherUser._id.toString()).emit("notification", populatedNotification);
        }
      }
    } else if (chatRoom !== "direct") {
      // Custom Group Chat Room: Emit to all members of the group
      const room = await ChatRoom.findById(chatRoom);
      if (room && io) {
        const notificationText = text || (messageType === 'sticker' ? 'Sent a sticker' : messageType === 'file' ? `Sent a file: ${file?.filename || 'Attachment'}` : 'Call log');
        
        for (const memberId of room.members) {
          io.to(memberId.toString()).emit("group_message", populatedMessage);
          
          if (memberId.toString() !== req.user.id.toString()) {
            const notification = await Notification.create({
              recipient: memberId,
              sender: req.user.id,
              type: "message_received",
              message: `New message in ${room.name} from ${req.user.name}: "${notificationText}"`,
              chatRoomId: room._id.toString(),
              chatRoomType: "group",
            });
            const populatedNotification = await Notification.findById(notification._id).populate({
              path: "sender",
              select: "name profile",
              populate: { path: "profile" }
            });
            io.to(memberId.toString()).emit("notification", populatedNotification);
          }
        }
      }
    } else {
      // Emit to both sender and recipient rooms
      if (io) {
        io.to(req.user.id.toString()).emit("direct_message", populatedMessage);
        io.to(recipient.toString()).emit("direct_message", populatedMessage);
        
        // Also send a real-time notification to the recipient so they get a chime + toast immediately if on a different page!
        const notificationText = text || (messageType === 'sticker' ? 'Sent a sticker' : messageType === 'file' ? `Sent a file: ${file?.filename || 'Attachment'}` : 'Call log');
        const notification = await Notification.create({
          recipient,
          sender: req.user.id,
          type: "message_received",
          message: `New message from ${req.user.name}: "${notificationText}"`,
          chatRoomId: req.user.id.toString(),
          chatRoomType: "direct",
        });
        
        const populatedNotification = await Notification.findById(notification._id).populate({
          path: "sender",
          select: "name profile",
          populate: { path: "profile" }
        });
        io.to(recipient.toString()).emit("notification", populatedNotification);
      }
    }

    res.status(201).json({
      success: true,
      data: populatedMessage,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all custom groups the user is member of
// @route   GET /api/messages/rooms
// @access  Private
exports.getRooms = async (req, res) => {
  try {
    const rooms = await ChatRoom.find({ members: req.user.id })
      .populate("creator", "name email role")
      .populate({
        path: "members",
        select: "name email role profile",
        populate: { path: "profile" }
      });

    res.status(200).json({
      success: true,
      data: rooms,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create a custom group
// @route   POST /api/messages/rooms
// @access  Private
exports.createRoom = async (req, res) => {
  try {
    const { name, description, members } = req.body;
    
    // Always include creator as member
    const uniqueMembers = Array.from(new Set([...members, req.user.id]));

    const room = await ChatRoom.create({
      name,
      description,
      creator: req.user.id,
      members: uniqueMembers,
    });

    const populatedRoom = await ChatRoom.findById(room._id)
      .populate("creator", "name email role")
      .populate({
        path: "members",
        select: "name email role profile",
        populate: { path: "profile" }
      });

    res.status(201).json({
      success: true,
      data: populatedRoom,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update room details or members list
// @route   PUT /api/messages/rooms/:id
// @access  Private
exports.updateRoom = async (req, res) => {
  try {
    const { name, description, members } = req.body;
    const room = await ChatRoom.findById(req.params.id);

    if (!room) {
      return res.status(404).json({ success: false, message: "Group not found" });
    }

    // Update fields
    if (name) room.name = name;
    if (description !== undefined) room.description = description;
    if (members) {
      // Ensure creator is always in the room
      room.members = Array.from(new Set([...members, room.creator.toString()]));
    }

    await room.save();

    const populatedRoom = await ChatRoom.findById(room._id)
      .populate("creator", "name email role")
      .populate({
        path: "members",
        select: "name email role profile",
        populate: { path: "profile" }
      });

    res.status(200).json({
      success: true,
      data: populatedRoom,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete custom group
// @route   DELETE /api/messages/rooms/:id
// @access  Private
exports.deleteRoom = async (req, res) => {
  try {
    const room = await ChatRoom.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ success: false, message: "Group not found" });
    }

    // Only creator or admin can delete
    if (room.creator.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorized to delete this group" });
    }

    await room.deleteOne();

    res.status(200).json({
      success: true,
      data: req.params.id,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Upload file for chat attachment
// @route   POST /api/messages/upload
// @access  Private
exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file provided" });
    }

    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "chat_attachments",
      resource_type: "auto",
    });

    let fileType = "document";
    const mime = req.file.mimetype;
    if (mime.startsWith("image/")) {
      fileType = "image";
    } else if (mime.startsWith("video/")) {
      fileType = "video";
    } else if (mime.startsWith("audio/")) {
      fileType = "audio";
    }

    res.status(200).json({
      success: true,
      data: {
        url: result.secure_url,
        public_id: result.public_id,
        filename: req.file.originalname,
        fileType,
        size: req.file.size,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete a message
// @route   DELETE /api/messages/:messageId
// @access  Private
exports.deleteMessage = async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);
    if (!message) {
      return res.status(404).json({ success: false, message: "Message not found" });
    }

    // Only sender can delete their message
    if (message.sender.toString() !== req.user.id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorized to delete this message" });
    }

    const chatRoom = message.chatRoom;
    const senderId = message.sender;
    const recipientId = message.recipient;
    const messageId = message._id;

    await message.deleteOne();

    const io = req.app.get("io");
    if (io) {
      if (chatRoom === "group") {
        io.to("group_chat").emit("message_deleted", { messageId });
      } else if (chatRoom !== "direct") {
        const ChatRoom = require("../models/ChatRoom");
        const room = await ChatRoom.findById(chatRoom);
        if (room) {
          room.members.forEach((memberId) => {
            io.to(memberId.toString()).emit("message_deleted", { messageId });
          });
        }
      } else {
        io.to(senderId.toString()).emit("message_deleted", { messageId });
        if (recipientId) {
          io.to(recipientId.toString()).emit("message_deleted", { messageId });
        }
      }
    }

    res.status(200).json({ success: true, message: "Message deleted successfully", data: messageId });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get the last message for each direct chat and group room
// @route   GET /api/messages/last
// @access  Private
exports.getLastMessages = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Find all direct messages involving the logged-in user
    const directMessages = await Message.find({
      chatRoom: "direct",
      $or: [{ sender: userId }, { recipient: userId }]
    }).sort({ createdAt: -1 });

    // Find all custom rooms the user is a member of
    const userRooms = await ChatRoom.find({ members: userId });
    const userRoomIds = userRooms.map(r => r._id.toString());
    // Also include the global "group" room
    userRoomIds.push("group");

    // Find all group messages for rooms the user is a member of
    const groupMessages = await Message.find({
      chatRoom: { $in: userRoomIds }
    }).sort({ createdAt: -1 });

    const lastMessagesMap = {};

    // Group direct messages by the other user's ID and keep the newest
    for (const msg of directMessages) {
      if (!msg.sender || !msg.recipient) continue;
      const otherUserId = msg.sender.toString() === userId.toString()
        ? msg.recipient.toString()
        : msg.sender.toString();
      if (!lastMessagesMap[otherUserId]) {
        lastMessagesMap[otherUserId] = msg;
      }
    }

    // Group room messages by chatRoom (roomId) and keep the newest
    for (const msg of groupMessages) {
      if (!msg.chatRoom) continue;
      const roomId = msg.chatRoom.toString();
      if (!lastMessagesMap[roomId]) {
        lastMessagesMap[roomId] = msg;
      }
    }

    res.status(200).json({
      success: true,
      data: lastMessagesMap
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Clear all direct messages between logged-in user and another user
// @route   DELETE /api/messages/direct/:userId
// @access  Private
exports.clearDirectMessages = async (req, res) => {
  try {
    const otherUserId = req.params.userId;
    const userId = req.user.id;

    // Delete all messages between these two users
    await Message.deleteMany({
      chatRoom: "direct",
      $or: [
        { sender: userId, recipient: otherUserId },
        { sender: otherUserId, recipient: userId }
      ]
    });

    const io = req.app.get("io");
    if (io) {
      // Notify both users that the conversation has been cleared
      io.to(userId.toString()).emit("chat_cleared", { otherUserId });
      io.to(otherUserId.toString()).emit("chat_cleared", { otherUserId: userId });
    }

    res.status(200).json({ success: true, message: "Chat history cleared successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

