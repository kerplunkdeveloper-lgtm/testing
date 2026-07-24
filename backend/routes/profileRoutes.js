const express = require("express");

const router = express.Router();

const {
  createProfile,
  getProfile,
  updateProfile,
  deleteProfileImage,
} = require("../controllers/profileController");

const { protect } = require("../middleware/auth");

const upload = require("../middleware/upload");



router.post(
  "/create",
  protect,
  upload.single("image"),
  createProfile
);


router.get(
  "/me",
  protect,
  getProfile
);


router.put(
  "/update",
  protect,
  upload.single("image"),
  updateProfile
);


router.delete(
  "/delete-image",
  protect,
  deleteProfileImage
);

module.exports = router;