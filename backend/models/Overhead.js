const mongoose = require("mongoose");

const overheadSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Overhead name is required"],
    trim: true,
  },
  amount: {
    type: Number,
    required: [true, "Amount is required"],
    default: 0,
  },
}, { timestamps: true });

module.exports = mongoose.model("Overhead", overheadSchema);
