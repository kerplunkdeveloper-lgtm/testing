const StickyNote = require("../models/StickyNote");

// @desc    Get user sticky notes
// @route   GET /api/stickynotes
// @access  Private
const getStickyNotes = async (req, res) => {
  try {
    const stickyNotes = await StickyNote.find({ user: req.user._id })
      .populate("user", "name")
      .sort({ createdAt: -1 });
    res.status(200).json(stickyNotes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create sticky note
// @route   POST /api/stickynotes
// @access  Private
const createStickyNote = async (req, res) => {
  try {
    const { content, color } = req.body;

    if (!content) {
      return res.status(400).json({ message: "Content is required" });
    }

    let stickyNote = await StickyNote.create({
      user: req.user._id,
      content,
      color: color || "yellow",
    });

    stickyNote = await stickyNote.populate("user", "name");

    res.status(201).json(stickyNote);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update sticky note
// @route   PUT /api/stickynotes/:id
// @access  Private
const updateStickyNote = async (req, res) => {
  try {
    const stickyNote = await StickyNote.findById(req.params.id);

    if (!stickyNote) {
      return res.status(404).json({ message: "Sticky note not found" });
    }

    // Check for user
    if (stickyNote.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: "User not authorized" });
    }

    const updatedStickyNote = await StickyNote.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    ).populate("user", "name");

    res.status(200).json(updatedStickyNote);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete sticky note
// @route   DELETE /api/stickynotes/:id
// @access  Private
const deleteStickyNote = async (req, res) => {
  try {
    const stickyNote = await StickyNote.findById(req.params.id);

    if (!stickyNote) {
      return res.status(404).json({ message: "Sticky note not found" });
    }

    // Check for user
    if (stickyNote.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: "User not authorized" });
    }

    await stickyNote.deleteOne();

    res.status(200).json({ id: req.params.id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getStickyNotes,
  createStickyNote,
  updateStickyNote,
  deleteStickyNote,
};
