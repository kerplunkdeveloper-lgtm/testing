const mongoose = require("mongoose");

const PortfolioSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please add a portfolio name"],
      trim: true,
    },
    color: {
      type: String,
      default: "#ff80bf",
    },
    isFavorite: {
      type: Boolean,
      default: false,
    },
    projectIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Project",
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Portfolio", PortfolioSchema);
