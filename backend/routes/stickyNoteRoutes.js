const express = require("express");
const router = express.Router();
const {
  getStickyNotes,
  createStickyNote,
  updateStickyNote,
  deleteStickyNote,
} = require("../controllers/stickyNoteController");
const { protect } = require("../middleware/auth");

router.route("/").get(protect, getStickyNotes).post(protect, createStickyNote);
router.route("/:id").put(protect, updateStickyNote).delete(protect, deleteStickyNote);

module.exports = router;
