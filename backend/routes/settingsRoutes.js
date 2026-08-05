const express = require("express");
const router = express.Router();
const OfficeSettings = require("../models/OfficeSettings");

// GET current settings
router.get("/office-hours", async (req, res) => {
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

// PUT update settings
router.put("/office-hours", async (req, res) => {
  const { startHour, endHour } = req.body;
  try {
    const settings = await OfficeSettings.findOneAndUpdate(
      { key: "global" },
      { startHour: Number(startHour), endHour: Number(endHour) },
      { new: true, upsert: true }
    );
    res.json({ success: true, data: settings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
