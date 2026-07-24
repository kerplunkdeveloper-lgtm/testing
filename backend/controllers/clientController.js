const Client = require("../models/Client");
const Notification = require("../models/Notification");


// @desc    Create Client
// @route   POST /api/clients
// @access  Private
exports.createClient = async (req, res) => {
  try {
    // Removed admin check to allow other authorized roles to create clients

    const {
      companyName,
      industry,
      onboardingDate,
      phoneNumber,
      spoc,
      designation,
      budget,
      gst,
      service,
      reels,
      posts,
      story,
      needDslr,
      pages,
      onpage,
      offpage,
      assignedTo,
      color,
      icon,
    } = req.body;

    const totalBudget =
      Number(budget) +
      (Number(budget) * Number(gst)) / 100;

    const client = await Client.create({
      companyName,
      industry,
      onboardingDate,
      phoneNumber,
      spoc,
      designation,
      budget,
      gst,
      totalBudget,
      service,
      reels,
      posts,
      story,
      needDslr,
      pages,
      onpage,
      offpage,
      color,
      icon,
      createdBy: req.user._id,
      assignedTo: (req.user.role !== "admin" && req.user.role !== "operationmanager")
        ? [req.user._id]
        : (Array.isArray(assignedTo) ? assignedTo.map(id => id._id || id) : (assignedTo ? [assignedTo._id || assignedTo] : [])),
    });

    const populatedClient = await Client.findById(client._id)
      .populate("createdBy", "name email role")
      .populate("assignedTo", "name email role");

    // Real-time Notification to assigned users
    if (populatedClient.assignedTo && populatedClient.assignedTo.length > 0) {
      const io = req.app.get("io");
      for (const member of populatedClient.assignedTo) {
        if (member._id.toString() !== req.user._id.toString()) {
          const notification = await Notification.create({
            recipient: member._id,
            sender: req.user._id,
            type: "client_assigned",
            message: `You have been assigned to Client: "${populatedClient.companyName}"`,
          });
          if (io) {
            const populatedNotification = await Notification.findById(notification._id).populate("sender", "name");
            io.to(member._id.toString()).emit("notification", populatedNotification);
          }
        }
      }
    }

    res.status(201).json({
      success: true,
      data: populatedClient,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// @desc    Get All Clients
// @route   GET /api/clients
// @access  Private
// @desc    Get All Clients
// @route   GET /api/clients
// @access  Private
exports.getClients = async (req, res) => {
  try {
    let query = {};
    if (req.user.role !== "admin" && req.user.role !== "operationmanager") {
      query.assignedTo = req.user._id;
    }

    const clients = await Client.find(query)
      .populate(
        "createdBy",
        "name email role"
      )
      .populate(
        "assignedTo",
        "name email role"
      )
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: clients.length,
      data: clients,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// @desc    Get Single Client
// @route   GET /api/clients/:id
// @access  Private
exports.getClient = async (req, res) => {
  try {
    const client = await Client.findById(
      req.params.id
    )
      .populate("createdBy", "name email role")
      .populate("assignedTo", "name email role");

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found",
      });
    }

    const isAssigned = client.assignedTo && (
      Array.isArray(client.assignedTo)
        ? client.assignedTo.some(item => (item._id ? item._id.toString() : item.toString()) === req.user._id.toString())
        : (client.assignedTo._id ? client.assignedTo._id.toString() : client.assignedTo.toString()) === req.user._id.toString()
    );

    if (req.user.role !== "admin" && req.user.role !== "operationmanager" && !isAssigned) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view this client",
      });
    }

    res.status(200).json({
      success: true,
      data: client,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// @desc    Update Client
// @route   PUT /api/clients/:id
// @access  Private
exports.updateClient = async (req, res) => {
  try {
    const clientToCheck = await Client.findById(req.params.id);
    if (!clientToCheck) {
      return res.status(404).json({
        success: false,
        message: "Client not found",
      });
    }

    const isAssigned = clientToCheck.assignedTo && (
      Array.isArray(clientToCheck.assignedTo)
        ? clientToCheck.assignedTo.some(id => id.toString() === req.user._id.toString())
        : clientToCheck.assignedTo.toString() === req.user._id.toString()
    );

    if (req.user.role !== "admin" && req.user.role !== "operationmanager" && !isAssigned) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to perform CRUD operations on this client",
      });
    }

    const budget = Number(req.body.budget);
    const gst = Number(req.body.gst);

    req.body.totalBudget =
      budget + (budget * gst) / 100;

    if (req.body.assignedTo) {
      req.body.assignedTo = Array.isArray(req.body.assignedTo)
        ? req.body.assignedTo.map(id => id._id || id)
        : [req.body.assignedTo._id || req.body.assignedTo];
    }

    const previousAssignees = clientToCheck.assignedTo ? clientToCheck.assignedTo.map(id => id.toString()) : [];

    const client =
      await Client.findByIdAndUpdate(
        req.params.id,
        req.body,
        {
          new: true,
          runValidators: true,
        }
      )
        .populate("createdBy", "name email role")
        .populate("assignedTo", "name email role");

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found",
      });
    }

    // Identify newly assigned members
    const currentAssignees = client.assignedTo ? client.assignedTo.map(u => (u._id || u).toString()) : [];
    const newAssignees = currentAssignees.filter(id => !previousAssignees.includes(id));

    if (newAssignees.length > 0) {
      const io = req.app.get("io");
      for (const memberId of newAssignees) {
        if (memberId !== req.user._id.toString()) {
          const notification = await Notification.create({
            recipient: memberId,
            sender: req.user._id,
            type: "client_assigned",
            message: `You have been assigned to Client: "${client.companyName}"`,
          });
          if (io) {
            const populatedNotification = await Notification.findById(notification._id).populate("sender", "name");
            io.to(memberId).emit("notification", populatedNotification);
          }
        }
      }
    }

    res.status(200).json({
      success: true,
      data: client,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// @desc    Delete Client
// @route   DELETE /api/clients/:id
// @access  Private
exports.deleteClient = async (req, res) => {
  try {
    const client = await Client.findById(
      req.params.id
    );

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found",
      });
    }

    const isAssigned = client.assignedTo && (
      Array.isArray(client.assignedTo)
        ? client.assignedTo.some(id => id.toString() === req.user._id.toString())
        : client.assignedTo.toString() === req.user._id.toString()
    );

    if (req.user.role !== "admin" && req.user.role !== "operationmanager" && !isAssigned) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to perform CRUD operations on this client",
      });
    }

    await client.deleteOne();

    res.status(200).json({
      success: true,
      message: "Client deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};