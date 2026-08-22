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

// @desc    Get group messages (accepts roomId parameter with optional pagination)
// @route   GET /api/messages/group/:roomId
// @access  Private
exports.getGroupMessages = async (req, res) => {
  try {
    const roomId = req.params.roomId || "group";
    const limit = parseInt(req.query.limit) || 50;
    const before = req.query.before;

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

    const query = { chatRoom: roomId };
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const rawMessages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate({
        path: "sender",
        select: "name email role profile",
        populate: { path: "profile" }
      })
      .populate({
        path: "replyTo",
        populate: { path: "sender", select: "name" }
      })
      .populate({
        path: "seenBy.userId",
        select: "name email role profile",
        populate: { path: "profile" }
      })
      .populate({
        path: "mentions.userId",
        select: "name role"
      });

    // Reverse to chronological order (oldest to newest)
    const messages = rawMessages.reverse();

    res.status(200).json({
      success: true,
      data: messages,
      hasMore: rawMessages.length === limit,
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
    const { recipient, chatRoom, text, sticker, messageType, file, callStatus, callDuration, replyTo, mentions } = req.body;

    let validMentions = [];
    const isMentionAll =
      (typeof text === "string" && (/\B@all\b/i.test(text) || /\B@everyone\b/i.test(text))) ||
      (Array.isArray(mentions) && mentions.some((m) => m?.username === "all" || m?.userId === "all"));

    if (isMentionAll) {
      validMentions.push({
        username: "all",
      });
    }

    if (chatRoom !== "direct" && chatRoom !== "group") {
      const room = await ChatRoom.findById(chatRoom);
      if (!room || (!room.members.some((m) => m.toString() === req.user.id.toString()) && req.user.role !== "admin")) {
        return res.status(403).json({
          message: "You are not a member of this chat room",
        });
      }

      if (Array.isArray(mentions) && mentions.length > 0) {
        const memberIdSet = new Set(room.members.map((m) => m.toString()));
        const seenMentionIds = new Set();
        for (const m of mentions) {
          const mUserId = m?.userId?.toString() || m?.id?.toString() || m?._id?.toString();
          if (mUserId && mUserId !== "all" && memberIdSet.has(mUserId) && mUserId !== req.user.id.toString() && !seenMentionIds.has(mUserId)) {
            seenMentionIds.add(mUserId);
            validMentions.push({
              userId: mUserId,
              username: m.username || m.name || "User",
            });
          }
        }
      }
    } else if (chatRoom === "group") {
      // Validate mentions for general group chat
      if (Array.isArray(mentions) && mentions.length > 0) {
        const seenMentionIds = new Set();
        for (const m of mentions) {
          const mUserId = m?.userId?.toString() || m?.id?.toString() || m?._id?.toString();
          if (mUserId && mUserId !== "all" && mUserId !== req.user.id.toString() && !seenMentionIds.has(mUserId)) {
            seenMentionIds.add(mUserId);
            validMentions.push({
              userId: mUserId,
              username: m.username || m.name || "User",
            });
          }
        }
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
      mentions: validMentions,
      seenBy: [],
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
      })
      .populate({
        path: "seenBy.userId",
        select: "name email role profile",
        populate: { path: "profile" }
      })
      .populate({
        path: "mentions.userId",
        select: "name role"
      });

    const io = req.app.get("io");
    const mentionedUserIds = new Set(validMentions.filter((m) => m.userId).map((m) => m.userId.toString()));
    const notificationText = text || (messageType === 'sticker' ? 'Sent a sticker' : messageType === 'file' ? `Sent a file: ${file?.filename || 'Attachment'}` : 'Call log');

    if (chatRoom === "group") {
      if (io) {
        io.to("group_chat").emit("group_message", populatedMessage);

        const allUsers = await User.find({ _id: { $ne: req.user.id } });
        
        for (const otherUser of allUsers) {
          const otherUserIdStr = otherUser._id.toString();
          const isMentioned = isMentionAll || mentionedUserIds.has(otherUserIdStr);

          const notification = await Notification.create({
            recipient: otherUser._id,
            sender: req.user.id,
            type: isMentioned ? "mention_received" : "message_received",
            message: isMentionAll
              ? `📢 ${req.user.name} mentioned @all in Kerplunk Group: "${notificationText}"`
              : isMentioned
              ? `${req.user.name} mentioned you in Kerplunk Group: "${notificationText}"`
              : `New message in General Group Chat from ${req.user.name}: "${notificationText}"`,
            chatRoomId: "group",
            chatRoomType: "group",
            messageId: message._id,
          });

          const populatedNotification = await Notification.findById(notification._id).populate({
            path: "sender",
            select: "name profile",
            populate: { path: "profile" }
          });

          io.to(otherUserIdStr).emit("notification", populatedNotification);

          if (isMentioned) {
            io.to(otherUserIdStr).emit("mention:notification", {
              messageId: message._id,
              chatRoomId: "group",
              sender: { _id: req.user.id, name: req.user.name, profile: req.user.profile },
              groupName: "Kerplunk Group",
              text: notificationText,
              isAll: isMentionAll,
            });
          }
        }
      }
    } else if (chatRoom !== "direct") {
      // Custom Group Chat Room
      const room = await ChatRoom.findById(chatRoom);
      if (room && io) {
        for (const memberId of room.members) {
          const memberIdStr = memberId.toString();
          io.to(memberIdStr).emit("group_message", populatedMessage);
          
          if (memberIdStr !== req.user.id.toString()) {
            const isMentioned = isMentionAll || mentionedUserIds.has(memberIdStr);

            const notification = await Notification.create({
              recipient: memberId,
              sender: req.user.id,
              type: isMentioned ? "mention_received" : "message_received",
              message: isMentionAll
                ? `📢 ${req.user.name} mentioned @all in ${room.name}: "${notificationText}"`
                : isMentioned
                ? `${req.user.name} mentioned you in ${room.name}: "${notificationText}"`
                : `New message in ${room.name} from ${req.user.name}: "${notificationText}"`,
              chatRoomId: room._id.toString(),
              chatRoomType: "group",
              messageId: message._id,
            });

            const populatedNotification = await Notification.findById(notification._id).populate({
              path: "sender",
              select: "name profile",
              populate: { path: "profile" }
            });

            io.to(memberIdStr).emit("notification", populatedNotification);

            if (isMentioned) {
              io.to(memberIdStr).emit("mention:notification", {
                messageId: message._id,
                chatRoomId: room._id.toString(),
                sender: { _id: req.user.id, name: req.user.name, profile: req.user.profile },
                groupName: room.name,
                text: notificationText,
                isAll: isMentionAll,
              });
            }
          }
        }
      }
    } else {
      // Direct message
      if (io) {
        io.to(req.user.id.toString()).emit("direct_message", populatedMessage);
        io.to(recipient.toString()).emit("direct_message", populatedMessage);
        
        const notification = await Notification.create({
          recipient,
          sender: req.user.id,
          type: "message_received",
          message: `New message from ${req.user.name}: "${notificationText}"`,
          chatRoomId: req.user.id.toString(),
          chatRoomType: "direct",
          messageId: message._id,
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

// @desc    Add or toggle emoji reaction on a message
// @route   POST /api/messages/:messageId/reaction
// @access  Private
exports.toggleReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user.id;
    const userName = req.user.name;

    if (!emoji) {
      return res.status(400).json({ success: false, message: "Emoji is required" });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ success: false, message: "Message not found" });
    }

    if (!message.reactions) {
      message.reactions = [];
    }

    // Check if this emoji group already exists
    let emojiGroup = message.reactions.find((r) => r.emoji === emoji);

    let isAdded = false;

    if (!emojiGroup) {
      // User adds new reaction with this emoji
      message.reactions.push({
        emoji,
        users: [{ userId, name: userName }],
      });
      isAdded = true;
    } else {
      // Check if this user already reacted with this emoji
      const userIndex = emojiGroup.users.findIndex(
        (u) => u.userId && u.userId.toString() === userId.toString()
      );

      if (userIndex > -1) {
        // User already reacted -> remove reaction (toggle off)
        emojiGroup.users.splice(userIndex, 1);
        // If no users left for this emoji, remove the emojiGroup
        if (emojiGroup.users.length === 0) {
          message.reactions = message.reactions.filter((r) => r.emoji !== emoji);
        }
      } else {
        // User reacts with this emoji
        emojiGroup.users.push({ userId, name: userName });
        isAdded = true;
      }
    }

    await message.save();

    const io = req.app.get("io");
    if (io) {
      const payload = {
        messageId: message._id.toString(),
        reactions: message.reactions,
        chatRoom: message.chatRoom,
      };

      if (message.chatRoom === "group") {
        io.to("group_chat").emit("message:reaction", payload);
      } else if (message.chatRoom !== "direct") {
        const room = await ChatRoom.findById(message.chatRoom);
        if (room) {
          room.members.forEach((mId) => {
            io.to(mId.toString()).emit("message:reaction", payload);
          });
        }
      } else {
        io.to(message.sender.toString()).emit("message:reaction", payload);
        if (message.recipient) {
          io.to(message.recipient.toString()).emit("message:reaction", payload);
        }
      }

      // Send Notification to message owner if someone else reacted
      if (isAdded && message.sender && message.sender.toString() !== userId.toString()) {
        try {
          const messagePreview = message.text
            ? (message.text.length > 35 ? message.text.substring(0, 35) + "..." : message.text)
            : (message.messageType === "file" ? message.file?.filename || "Attachment" : message.sticker || "Message");

          let roomName = "";
          if (message.chatRoom === "group") {
            roomName = "Kerplunk Group";
          } else if (message.chatRoom !== "direct") {
            const roomObj = await ChatRoom.findById(message.chatRoom);
            roomName = roomObj?.name || "Group";
          }

          const notificationText = roomName
            ? `${req.user.name} reacted with ${emoji} in ${roomName}: "${messagePreview}"`
            : `${req.user.name} reacted with ${emoji} to your message: "${messagePreview}"`;

          const notification = await Notification.create({
            recipient: message.sender,
            sender: req.user.id,
            type: "reaction_received",
            message: notificationText,
            messageId: message._id,
            chatRoomId: message.chatRoom === "direct" ? req.user.id.toString() : message.chatRoom,
            chatRoomType: message.chatRoom === "direct" ? "direct" : "group",
          });

          const populatedNotification = await Notification.findById(notification._id).populate({
            path: "sender",
            select: "name profile",
            populate: { path: "profile" },
          });

          io.to(message.sender.toString()).emit("notification", populatedNotification);
        } catch (notifErr) {
          console.error("Failed to create reaction notification:", notifErr);
        }
      }
    }

    res.status(200).json({
      success: true,
      data: {
        messageId: message._id.toString(),
        reactions: message.reactions,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


