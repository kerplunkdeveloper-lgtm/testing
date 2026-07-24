const Overhead = require("../models/Overhead");

// @desc    Get all overheads
// @route   GET /api/v1/overheads
// @access  Private/Admin
exports.getOverheads = async (req, res, next) => {
  try {
    const overheads = await Overhead.find();
    res.status(200).json({
      success: true,
      count: overheads.length,
      data: overheads,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @desc    Update overheads in bulk
// @route   POST /api/v1/overheads/bulk
// @access  Private/Admin
exports.updateOverheadsBulk = async (req, res, next) => {
  try {
    const { overheads } = req.body; // array of { _id, name, amount }
    
    // Simplest way is to clear and re-insert, or iterate and upsert
    // Let's clear and re-insert to handle deletions easily
    await Overhead.deleteMany({});
    
    // Remove any items that are empty
    const validOverheads = overheads.filter(o => o.name && o.amount !== "");
    
    const created = await Overhead.insertMany(validOverheads);

    res.status(200).json({
      success: true,
      data: created,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};
