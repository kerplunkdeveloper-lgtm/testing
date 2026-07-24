const User = require('../models/User');
const bcrypt = require('bcryptjs');




// .....................................................get all user.................................


exports.getUsers = async (req, res) => {
  try {
    let query = {};
    const users = await User.find(query).populate('profile');

    res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};






// .....................................................get user.................................
exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate('profile');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};




// .....................................................create user.................................

exports.createUser = async (req, res) => {
  try {

    const {
      email,
      password,
    } = req.body;

    // Check existing user
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email',
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);

    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const userData = {
      ...req.body,
      password: hashedPassword,
    };

    const user = await User.create(userData);

    res.status(201).json({
      success: true,
      data: user,
    });

  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};




// .....................................................update user.................................

exports.updateUser = async (req, res) => {
  try {

    const updateData = {
      ...req.body,
    };

    // If password exists -> hash password
    if (req.body.password) {

      const salt = await bcrypt.genSalt(10);

      updateData.password = await bcrypt.hash(
        req.body.password,
        salt
      );
    }

    const targetId = (!req.params.id || req.params.id === 'me') ? req.user._id : req.params.id;

    // Security check: non-admins cannot update other users
    if (req.user.role !== 'admin' && targetId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this user',
      });
    }

    const user = await User.findByIdAndUpdate(
      targetId,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      data: user,
    });

  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};




// .....................................................delete user.................................

exports.deleteUser = async (req, res) => {
  try {
    console.log("DELETE USER CALLED WITH ID:", req.params.id);

    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};