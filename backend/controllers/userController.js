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

    // Security check: non-admins/operationmanagers cannot update other users
    if (req.user.role !== 'admin' && req.user.role !== 'operationmanager' && targetId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this user',
      });
    }

    const userToUpdate = await User.findById(targetId);
    if (!userToUpdate) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Operation managers cannot update admin users
    if (req.user.role === 'operationmanager' && userToUpdate.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Operation managers cannot update admin accounts',
      });
    }

    const user = await User.findByIdAndUpdate(
      targetId,
      updateData,
      {
        returnDocument: 'after',
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

    const userToFind = await User.findById(req.params.id);

    if (!userToFind) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Operation managers cannot delete admin users
    if (req.user.role === 'operationmanager' && userToFind.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Operation managers cannot delete admin accounts',
      });
    }

    const user = await User.findByIdAndDelete(req.params.id);

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

// .....................................................relieve user.................................

exports.relieveUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (user.role === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Admin accounts cannot be relieved',
      });
    }

    user.employmentStatus = 'relieved';
    user.accountStatus = 'inactive';
    user.relievedAt = new Date();
    user.relievedBy = req.user._id;
    user.relievedReason = req.body.reason || '';
    await user.save();

    // Force logout active session via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.to(req.params.id.toString()).emit('account_deactivated', {
        userId: req.params.id,
        message: 'Your account has been deactivated. Please contact your administrator.',
      });
    }

    res.status(200).json({
      success: true,
      data: user,
      message: 'User has been successfully relieved.',
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// .....................................................reactivate user.................................

exports.reactivateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    user.employmentStatus = 'active';
    user.accountStatus = 'active';
    user.relievedAt = null;
    user.relievedBy = null;
    user.relievedReason = '';
    await user.save();

    res.status(200).json({
      success: true,
      data: user,
      message: 'User has been successfully reactivated.',
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};