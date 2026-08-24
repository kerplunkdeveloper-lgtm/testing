const Shoot = require('../models/Shoot');

// Helper to convert "hh:mm AM/PM" to comparable number (e.g. "09:00 AM" -> 900, "01:00 PM" -> 1300)
const parseTime = (timeStr) => {
  if (!timeStr) return 0;
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return 0;
  let [ , hours, minutes, period ] = match;
  hours = parseInt(hours, 10);
  minutes = parseInt(minutes, 10);
  if (period.toUpperCase() === 'PM' && hours < 12) hours += 12;
  if (period.toUpperCase() === 'AM' && hours === 12) hours = 0;
  return hours * 100 + minutes;
};

// @desc    Create new shoot
// @route   POST /api/shoot-calendar
// @access  Private
exports.createShoot = async (req, res) => {
  try {
    const { schedule } = req.body;
    
    // Validate end time > start time if schedule is provided
    if (schedule && schedule.startTime && schedule.endTime) {
      if (parseTime(schedule.endTime) <= parseTime(schedule.startTime)) {
        return res.status(400).json({
          success: false,
          message: 'End time must be after start time'
        });
      }
    }

    req.body.createdBy = req.user.id;
    req.body.status = 'Planned'; // Force default

    const shoot = await Shoot.create(req.body);

    res.status(201).json({
      success: true,
      data: shoot,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get all shoots
// @route   GET /api/shoot-calendar
// @access  Private
exports.getShoots = async (req, res) => {
  try {
    const { startDate, endDate, status, shootType, client } = req.query;
    let query = {};

    if (startDate || endDate) {
      query['schedule.shootDate'] = {};
      if (startDate) query['schedule.shootDate'].$gte = new Date(startDate);
      if (endDate) query['schedule.shootDate'].$lte = new Date(endDate);
    }
    
    if (status) query.status = status;
    if (shootType) query.shootType = shootType;
    if (client) query.client = client;

    const shoots = await Shoot.find(query)
      .populate('client', 'companyName color icon')
      .populate({
        path: 'assignedTo',
        select: 'name role',
        populate: {
          path: 'profile',
          select: 'profileImage'
        }
      })
      .populate({
        path: 'shootTeam',
        select: 'name role',
        populate: {
          path: 'profile',
          select: 'profileImage'
        }
      })
      .populate('createdBy', 'name')
      .sort({
      'schedule.shootDate': 1,
      'schedule.startTime': 1
    });

    res.status(200).json({
      success: true,
      count: shoots.length,
      data: shoots,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get single shoot
// @route   GET /api/shoot-calendar/:id
// @access  Private
exports.getShoot = async (req, res) => {
  try {
    const shoot = await Shoot.findById(req.params.id)
      .populate('client', 'companyName color icon')
      .populate({
        path: 'assignedTo',
        select: 'name role',
        populate: {
          path: 'profile',
          select: 'profileImage'
        }
      })
      .populate({
        path: 'shootTeam',
        select: 'name role',
        populate: {
          path: 'profile',
          select: 'profileImage'
        }
      });

    if (!shoot) {
      return res.status(404).json({
        success: false,
        message: 'Shoot not found',
      });
    }

    res.status(200).json({
      success: true,
      data: shoot,
    });
  } catch (error) {
    // Handle invalid ObjectId
    if (error.kind === 'ObjectId') {
      return res.status(400).json({
        success: false,
        message: 'Invalid Shoot ID format',
      });
    }
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update shoot
// @route   PUT /api/shoot-calendar/:id
// @access  Private
exports.updateShoot = async (req, res) => {
  try {
    let shoot = await Shoot.findById(req.params.id);

    if (!shoot) {
      return res.status(404).json({
        success: false,
        message: 'Shoot not found',
      });
    }

    // Only allow updating certain fields to avoid overwriting accidentally
    const { 
      client, shootTitle, shootType, description, schedule, status,
      location, assignedTo, shootTeam, purpose, contentUse, weather, transport,
      estimatedBudget, clientContact, shootSchedule, checklist, notes, specialInstructions, attachedFiles
    } = req.body;
    
    let updateData = { updatedBy: req.user.id };
    
    if (client !== undefined) updateData.client = client;
    if (shootTitle !== undefined) updateData.shootTitle = shootTitle;
    if (shootType !== undefined) updateData.shootType = shootType;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (location !== undefined) updateData.location = location;
    if (assignedTo !== undefined) updateData.assignedTo = assignedTo;
    if (shootTeam !== undefined) updateData.shootTeam = shootTeam;
    if (purpose !== undefined) updateData.purpose = purpose;
    if (contentUse !== undefined) updateData.contentUse = contentUse;
    if (weather !== undefined) updateData.weather = weather;
    if (transport !== undefined) updateData.transport = transport;
    if (estimatedBudget !== undefined) updateData.estimatedBudget = estimatedBudget;
    if (clientContact !== undefined) updateData.clientContact = clientContact;
    if (shootSchedule !== undefined) updateData.shootSchedule = shootSchedule;
    if (checklist !== undefined) updateData.checklist = checklist;
    if (notes !== undefined) updateData.notes = notes;
    if (specialInstructions !== undefined) updateData.specialInstructions = specialInstructions;
    if (attachedFiles !== undefined) updateData.attachedFiles = attachedFiles;

    if (schedule) {
      updateData.schedule = { ...shoot.schedule.toObject(), ...schedule };
      
      // Validate times if both are present in the final schedule
      if (updateData.schedule.startTime && updateData.schedule.endTime) {
        if (parseTime(updateData.schedule.endTime) <= parseTime(updateData.schedule.startTime)) {
          return res.status(400).json({
            success: false,
            message: 'End time must be after start time'
          });
        }
      }
    }

    shoot = await Shoot.findByIdAndUpdate(req.params.id, updateData, {
      returnDocument: 'after',
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      data: shoot,
    });
  } catch (error) {
    // Handle invalid ObjectId
    if (error.kind === 'ObjectId') {
      return res.status(400).json({
        success: false,
        message: 'Invalid Shoot ID format',
      });
    }
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update shoot status
// @route   PATCH /api/shoot-calendar/:id/status
// @access  Private
exports.updateShootStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    const validStatuses = [
      'Planned',
      'Confirmed',
      'In Progress',
      'Completed',
      'Pending Approval',
      'At Risk',
      'Cancelled'
    ];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }

    const shoot = await Shoot.findByIdAndUpdate(
      req.params.id,
      { status, updatedBy: req.user.id },
      { returnDocument: 'after', runValidators: true }
    );

    if (!shoot) {
      return res.status(404).json({
        success: false,
        message: 'Shoot not found',
      });
    }

    res.status(200).json({
      success: true,
      data: shoot,
    });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(400).json({
        success: false,
        message: 'Invalid Shoot ID format',
      });
    }
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Delete shoot
// @route   DELETE /api/shoot-calendar/:id
// @access  Private
exports.deleteShoot = async (req, res) => {
  try {
    const shoot = await Shoot.findById(req.params.id);

    if (!shoot) {
      return res.status(404).json({
        success: false,
        message: 'Shoot not found',
      });
    }

    await shoot.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
      message: 'Shoot removed'
    });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(400).json({
        success: false,
        message: 'Invalid Shoot ID format',
      });
    }
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
