const mongoose = require("mongoose");

const stickyNoteSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    content: {
      type: String,
      required: true,
    },
    color: {
      type: String,  
      default: "yellow",
      enum: ["yellow", "green", "blue", "pink", "purple", "gray"],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("StickyNote", stickyNoteSchema);
