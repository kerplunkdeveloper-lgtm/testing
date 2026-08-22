const User = require("../models/User");
const Profile = require("../models/Profile");
const cloudinary = require("../config/cloudinary");


// CREATE PROFILE
exports.createProfile = async (req, res) => {

  try {

    const {
      bio,
      phone,
    } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    let imageData = {};

    if (req.file) {

      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "profiles",
      });

      imageData = {
        public_id: result.public_id,
        url: result.secure_url,
      };
    }

    const profile = await Profile.create({
      user: req.user._id,
      bio,
      phone,
      profileImage: imageData,
    });

    await User.findByIdAndUpdate(req.user._id, {
      profile: profile._id,
    });

    res.status(201).json({
      success: true,
      profile,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};



// GET PROFILE
exports.getProfile = async (req, res) => {

  try {

    const user = await User.findById(req.user._id)
      .populate("profile");

    res.status(200).json({
      success: true,
      profile: user.profile,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};




// UPDATE PROFILE
exports.updateProfile = async (req, res) => {
  try {
    const { bio, phone } = req.body;

    const user = await User.findById(req.user._id).populate("profile");

    if (!user.profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found",
      });
    }

    const profile = user.profile;

    if (bio !== undefined) profile.bio = bio;
    if (phone !== undefined) profile.phone = phone;

    // IMAGE UPDATE
    if (req.file) {
      // DELETE OLD IMAGE
      if (profile.profileImage && profile.profileImage.public_id) {
        try {
          await cloudinary.uploader.destroy(profile.profileImage.public_id);
        } catch (err) {
          console.error("Cloudinary destroy error:", err);
        }
      }

      // UPLOAD NEW IMAGE
      try {
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: "profiles",
        });

        profile.profileImage = {
          public_id: result.public_id,
          url: result.secure_url,
        };
      } catch (uploadErr) {
        console.error("CLOUDINARY UPLOAD REJECTED:", uploadErr);
        return res.status(400).json({
          success: false,
          message: "Cloudinary rejected the image: " + (uploadErr.message || JSON.stringify(uploadErr)),
        });
      }
    }

    await profile.save();

    res.status(200).json({
      success: true,
      profile,
    });

  } catch (error) {
    require('fs').writeFileSync('error.txt', error.stack || error.message);
    console.error("UPDATE PROFILE ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};




// DELETE PROFILE IMAGE
exports.deleteProfileImage = async (req, res) => {

  try {

    const user = await User.findById(req.user._id)
      .populate("profile");

    const profile = await Profile.findById(user.profile._id);

    if (profile.profileImage && profile.profileImage.public_id) {

      await cloudinary.uploader.destroy(
        profile.profileImage.public_id
      );

      profile.profileImage = {
        public_id: "",
        url: "",
      };

      await profile.save();
    }

    res.status(200).json({
      success: true,
      message: "Profile image deleted",
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};