const mongoose = require("mongoose");

const profileSchema = new mongoose.Schema({

  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },

  bio: {
    type: String,
    default: "",
  },

  phone: {
    type: String,
    default: "",
  },


  profileImage: {
    public_id: {
      type: String,
      default: "",
    },

    url: {
      type: String,
      default: "",
    },
  },

}, {
  timestamps: true,
});

module.exports = mongoose.model("Profile", profileSchema);