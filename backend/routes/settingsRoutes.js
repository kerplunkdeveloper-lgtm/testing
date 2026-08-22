const express = require("express");
const router = express.Router();
const OfficeSettings = require("../models/OfficeSettings");
const { protect, authorize } = require("../middleware/auth");

// GET current settings (protected to all authenticated users)
router.get("/office-hours", protect, async (req, res) => {
  try {
    let settings = await OfficeSettings.findOne({ key: "global" });
    if (!settings) {
      settings = await OfficeSettings.create({ key: "global", startHour: 9, endHour: 19 });
    }
    res.json({ success: true, data: settings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put("/office-hours", protect, authorize("admin", "operationmanager"), async (req, res) => {
  const { startHour, endHour, workingDays } = req.body;
  try {
    const updateData = {
      startHour: Number(startHour),
      endHour: Number(endHour),
    };
    if (Array.isArray(workingDays)) {
      updateData.workingDays = workingDays.map(Number);
    }
    const settings = await OfficeSettings.findOneAndUpdate(
      { key: "global" },
      updateData,
      { returnDocument: 'after', upsert: true }
    );
    res.json({ success: true, data: settings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
