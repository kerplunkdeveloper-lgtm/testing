const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // null for group chat messages
    },
    chatRoom: {
      type: String, // 'group' or 'direct'
      default: "direct",
    },
    text: {
      type: String,
      trim: true,
    },
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },
    sticker: {
      type: String, // Code/emoji/URL of the sticker
    },
    messageType: {
      type: String,
      enum: ["text", "sticker", "call", "file"],
      default: "text",
    },
    file: {
      url: { type: String },
      public_id: { type: String },
      filename: { type: String },
      fileType: { type: String }, // "image", "video", "audio", "document"
      size: { type: Number },
    },
    callStatus: {
      type: String, // 'started', 'missed', 'ended'
    },
    mentions: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        username: {
          type: String,
        },
      },
    ],
    seenBy: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        seenAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    reactions: [
      {
        emoji: {
          type: String,
          required: true,
        },
        users: [
          {
            userId: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "User",
            },
            name: {
              type: String,
            },
          },
        ],
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes to speed up direct/group message loading and sorting by date
MessageSchema.index({ sender: 1, recipient: 1 });
MessageSchema.index({ chatRoom: 1, createdAt: -1 });
MessageSchema.index({ createdAt: 1 });
MessageSchema.index({ "seenBy.userId": 1 });

module.exports = mongoose.model("Message", MessageSchema);
