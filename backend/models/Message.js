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
    callDuration: {
      type: String, // Call duration if ended (e.g., "02:14")
    },
  },
  {
    timestamps: true,
  }
);

// Indexes to speed up direct/group message loading and sorting by date
MessageSchema.index({ sender: 1, recipient: 1 });
MessageSchema.index({ createdAt: 1 });

module.exports = mongoose.model("Message", MessageSchema);
