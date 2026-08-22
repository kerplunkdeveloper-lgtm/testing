const ClientCall = require('../models/ClientCall');
const Notification = require('../models/Notification');
const User = require('../models/User');

// @desc    Create a new client call
// @route   POST /api/client-calls
// @access  Private
exports.createCall = async (req, res) => {
  try {
    const { date, client, discussionPoints, startTime, endTime, duration } = req.body;

    // Optional: Validation
    if (!client || !startTime || !endTime || !duration) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields',
      });
    }

    const clientCall = await ClientCall.create({
      date: date || Date.now(),
      client,
      discussionPoints,
      startTime,
      endTime,
      duration,
      createdBy: req.user ? req.user._id : null,
    });

    const populatedCall = await ClientCall.findById(clientCall._id)
      .populate('client', 'companyName')
      .populate('createdBy', 'name');

    // Notify Operation Managers
    if (req.user) {
      const opsManagers = await User.find({ role: 'operationmanager' });
      if (opsManagers.length > 0) {
        const notificationPromises = opsManagers.map(manager => {
          return Notification.create({
            recipient: manager._id,
            sender: req.user._id,
            type: 'client_call_created',
            message: `${req.user.name} logged a new client call for ${populatedCall.client?.companyName || 'Client'}.`,
          });
        });

        const createdNotifications = await Promise.all(notificationPromises);

        const io = req.app.get('io');
        if (io) {
          for (let i = 0; i < opsManagers.length; i++) {
            const manager = opsManagers[i];
            const notif = createdNotifications[i];
            const populatedNotification = await Notification.findById(notif._id).populate({ path: 'sender', select: 'name profile', populate: { path: 'profile', select: 'profileImage' } });
            io.to(manager._id.toString()).emit('notification', populatedNotification);
          }
        }
      }
    }

    res.status(201).json({
      success: true,
      data: populatedCall,
    });
  } catch (error) {
    console.error('Error creating client call:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
};

// @desc    Get all client calls
// @route   GET /api/client-calls
// @access  Private
exports.getCalls = async (req, res) => {
  try {
    const calls = await ClientCall.find()
      .populate('client', 'companyName status')
      .populate('createdBy', 'name')
      .sort({ date: -1, createdAt: -1 });

    res.status(200).json({
      success: true,
      count: calls.length,
      data: calls,
    });
  } catch (error) {
    console.error('Error fetching client calls:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
};

// @desc    Delete a client call
// @route   DELETE /api/client-calls/:id
// @access  Private
exports.deleteCall = async (req, res) => {
  try {
    const call = await ClientCall.findById(req.params.id);

    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Call record not found',
      });
    }

    await call.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    console.error('Error deleting client call:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
};

// @desc    Update a client call
// @route   PUT /api/client-calls/:id
// @access  Private
exports.updateCall = async (req, res) => {
  try {
    let call = await ClientCall.findById(req.params.id);

    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Call record not found',
      });
    }

    call = await ClientCall.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('client', 'companyName')
      .populate('createdBy', 'name');

    res.status(200).json({
      success: true,
      data: call,
    });
  } catch (error) {
    console.error('Error updating client call:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
};
