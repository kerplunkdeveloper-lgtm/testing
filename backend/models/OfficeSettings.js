const mongoose = require("mongoose");

const OfficeSettingsSchema = new mongoose.Schema({
  key: { type: String, default: "global", unique: true },
  startHour: { type: Number, default: 9 },
  endHour: { type: Number, default: 19 },
}, { timestamps: true });

module.exports = mongoose.model("OfficeSettings", OfficeSettingsSchema);
