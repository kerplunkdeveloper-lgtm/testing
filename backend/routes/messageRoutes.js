const express = require("express");
const {
  getDirectMessages,
  getGroupMessages,
  sendMessage,
  getRooms,
  createRoom,
  updateRoom,
  deleteRoom,
  uploadFile,
  deleteMessage,
  getLastMessages,
  clearDirectMessages,
  toggleReaction,
} = require("../controllers/messageController");
const { protect } = require("../middleware/auth");
const chatUpload = require("../middleware/chatUpload");

const router = express.Router();

router.use(protect);

router.post("/upload", chatUpload.single("file"), uploadFile);
router.post("/", sendMessage);
router.get("/last", getLastMessages);
router.get("/group/:roomId?", getGroupMessages);
router.get("/direct/:userId", getDirectMessages);
router.delete("/direct/:userId", clearDirectMessages);
router.post("/:messageId/reaction", toggleReaction);
router.delete("/:messageId", deleteMessage);

// Custom Group Chat Room Routes
router.get("/rooms", getRooms);
router.post("/rooms", createRoom);
router.put("/rooms/:id", updateRoom);
router.delete("/rooms/:id", deleteRoom);

module.exports = router;
