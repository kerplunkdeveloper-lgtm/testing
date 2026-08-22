const SMTask = require("../models/SMTask");
const Client = require("../models/Client");
const User = require("../models/User");

// Seed initial realistic Social Media Tasks matching reference image if DB is empty
const seedDefaultSMTasks = async (fallbackUserId) => {
  try {
    const existingCount = await SMTask.countDocuments();
    if (existingCount > 0) return;

    // Get or create clients for seeding
    let clients = await Client.find({ status: "Active" }).limit(10);
    if (!clients || clients.length === 0) {
      clients = await Client.find().limit(10);
    }

    const defaultClientNames = [
      { companyName: "Black Thunder", color: "#000000" },
      { companyName: "AYYA Restaurant", color: "#16a34a" },
      { companyName: "Cougar Restobar", color: "#0284c7" },
      { companyName: "Pout Pub", color: "#9333ea" },
      { companyName: "Living Room", color: "#e11d48" },
      { companyName: "Mangalam Mess", color: "#ea580c" },
      { companyName: "Flush Pub", color: "#4f46e5" },
    ];

    const clientMap = {};

    for (const dClient of defaultClientNames) {
      let found = clients.find((c) => c.companyName.toLowerCase().includes(dClient.companyName.toLowerCase()));
      if (!found) {
        found = await Client.create({
          companyName: dClient.companyName,
          industry: "Hospitality & Food",
          phoneNumber: "9876543210",
          color: dClient.color,
          service: ["Digital Marketing"],
          createdBy: fallbackUserId,
          assignedTo: fallbackUserId ? [fallbackUserId] : [],
        });
      }
      clientMap[dClient.companyName] = found._id;
    }

    // Default seed tasks matching the reference image
    const seedTasks = [
      {
        taskId: "SMTT-1251",
        client: clientMap["Black Thunder"] || clients[0]?._id,
        category: "Publishing",
        title: "Publish weekend offer poster",
        subType: "Post",
        platform: ["Instagram", "Facebook"],
        dueDate: new Date(2026, 7, 12),
        dueTime: "06:00 PM",
        priority: "High",
        status: "In Progress",
        blocker: "-",
        notes: "Review the poster and provide feedback before publishing.",
        subtasks: [
          { title: "Design poster", completed: true },
          { title: "Client approval", completed: true },
          { title: "Schedule posting", completed: false },
        ],
      },
      {
        taskId: "SMTT-1252",
        client: clientMap["AYYA Restaurant"] || clients[1]?._id || clients[0]?._id,
        category: "Community Mgmt",
        title: "Check DMs and reply",
        subType: "DMs Check",
        platform: ["Instagram", "Facebook"],
        dueDate: new Date(2026, 7, 12),
        dueTime: "11:00 AM",
        priority: "Medium",
        status: "Completed",
        blocker: "-",
        notes: "Respond to customer inquiries on Instagram and Facebook.",
        subtasks: [
          { title: "Check Instagram DMs", completed: true },
          { title: "Check Facebook DMs", completed: true },
        ],
      },
      {
        taskId: "SMTT-1253",
        client: clientMap["Cougar Restobar"] || clients[2]?._id || clients[0]?._id,
        category: "Review & Approval",
        title: "Follow up for post approval",
        subType: "Approval Follow-up",
        platform: ["Instagram", "Facebook"],
        dueDate: new Date(2026, 7, 12),
        dueTime: "07:00 PM",
        priority: "High",
        status: "Waiting",
        blocker: "Waiting for Client",
        notes: "Awaiting final approval from client SPOC.",
        subtasks: [{ title: "Send preview link", completed: true }],
      },
      {
        taskId: "SMTT-1254",
        client: clientMap["Pout Pub"] || clients[3]?._id || clients[0]?._id,
        category: "Content Planning",
        title: "Update content calendar",
        subType: "Planning",
        platform: ["Instagram"],
        dueDate: new Date(2026, 7, 12),
        dueTime: "06:00 PM",
        priority: "Medium",
        status: "Completed",
        blocker: "-",
        notes: "Plan content schedule for next 2 weeks.",
        subtasks: [{ title: "Draft content ideas", completed: true }],
      },
      {
        taskId: "SMTT-1255",
        client: clientMap["Living Room"] || clients[4]?._id || clients[0]?._id,
        category: "Coordination",
        title: "Designer follow-up (poster)",
        subType: "Designer Follow-up",
        platform: ["Instagram"],
        dueDate: new Date(2026, 7, 12),
        dueTime: "02:00 PM",
        priority: "Medium",
        status: "In Progress",
        blocker: "Waiting for Designer",
        notes: "Check progress of graphic asset for campaign.",
        subtasks: [{ title: "Request raw PSDs", completed: false }],
      },
      {
        taskId: "SMTT-1256",
        client: clientMap["Mangalam Mess"] || clients[5]?._id || clients[0]?._id,
        category: "Reporting",
        title: "EOD report submission",
        subType: "EOD Report",
        platform: ["Instagram"],
        dueDate: new Date(2026, 7, 12),
        dueTime: "06:30 PM",
        priority: "Low",
        status: "To Do",
        blocker: "-",
        notes: "Compile daily metrics report.",
        subtasks: [{ title: "Gather engagement stats", completed: false }],
      },
      {
        taskId: "SMTT-1257",
        client: clientMap["Black Thunder"] || clients[0]?._id,
        category: "Publishing",
        title: "Publish story - water park",
        subType: "Story",
        platform: ["Instagram"],
        dueDate: new Date(2026, 7, 13),
        dueTime: "10:00 AM",
        priority: "High",
        status: "Scheduled",
        blocker: "-",
        notes: "Water park promo story.",
        subtasks: [{ title: "Upload story stickers", completed: false }],
      },
      {
        taskId: "SMTT-1258",
        client: clientMap["AYYA Restaurant"] || clients[1]?._id || clients[0]?._id,
        category: "Shoot Management",
        title: "Shoot discussion call",
        subType: "Shoot Discussion",
        platform: ["Instagram"],
        dueDate: new Date(2026, 7, 13),
        dueTime: "12:30 PM",
        priority: "Medium",
        status: "Waiting",
        blocker: "-",
        notes: "Prepare shot list for upcoming food photoshoot.",
        subtasks: [{ title: "Prepare shot list", completed: true }],
      },
      {
        taskId: "SMTT-1259",
        client: clientMap["Cougar Restobar"] || clients[2]?._id || clients[0]?._id,
        category: "Documentation",
        title: "Share live music video to editor",
        subType: "Footage Sharing",
        platform: ["Instagram", "Facebook"],
        dueDate: new Date(2026, 7, 13),
        dueTime: "05:00 PM",
        priority: "Low",
        status: "To Do",
        blocker: "-",
        notes: "Upload raw concert footage to Drive.",
        subtasks: [{ title: "Upload to Google Drive", completed: false }],
      },
      {
        taskId: "SMTT-1260",
        client: clientMap["Flush Pub"] || clients[6]?._id || clients[0]?._id,
        category: "Performance Support",
        title: "Check ad performance",
        subType: "Ad Check",
        platform: ["Instagram", "Facebook"],
        dueDate: new Date(2026, 7, 14),
        dueTime: "03:00 PM",
        priority: "Medium",
        status: "To Do",
        blocker: "-",
        notes: "Review Meta Ads Manager campaign performance.",
        subtasks: [{ title: "Check ROAS & CPC", completed: false }],
      },
    ];

    for (const tData of seedTasks) {
      if (tData.client) {
        await SMTask.create({
          ...tData,
          assignee: fallbackUserId || null,
          createdBy: fallbackUserId || null,
        });
      }
    }
    console.log("[SMTask Controller] Auto-seeded default SMTT tasks successfully.");
  } catch (err) {
    console.error("[SMTask Controller] Error seeding SMTT tasks:", err);
  }
};

// Generate next sequential task ID (e.g. SMTT-1261)
const generateNextTaskId = async () => {
  const tasks = await SMTask.find({ taskId: /^SMTT-/ }).select("taskId");
  let maxNum = 1250;
  tasks.forEach((t) => {
    if (t.taskId) {
      const parts = t.taskId.split("SMTT-");
      if (parts[1] && !isNaN(parts[1])) {
        const num = parseInt(parts[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
  });
  return `SMTT-${maxNum + 1}`;
};

// @desc    Get All SM Tasks
// @route   GET /api/sm-tasks
// @access  Private
exports.getSMTasks = async (req, res) => {
  try {
    // Auto-seeding disabled to maintain clean workspace
    // await seedDefaultSMTasks(req.user._id);

    let query = {};

    // Filter by client
    if (req.query.client) {
      query.client = req.query.client;
    }

    // Filter by status
    if (req.query.status && req.query.status !== "All") {
      query.status = req.query.status;
    }

    // Filter by assignee
    if (req.query.assignee) {
      query.assignee = req.query.assignee;
    }

    // Filter by createdBy
    if (req.query.createdBy) {
      query.createdBy = req.query.createdBy;
    }

    const andConditions = [];

    // Privacy & Access Control:
    // Non-admin / non-operationmanager users only see tasks they created or are assigned to
    if (req.user.role !== "admin" && req.user.role !== "operationmanager") {
      andConditions.push({
        $or: [{ createdBy: req.user._id }, { assignee: req.user._id }],
      });
    }

    // Search query
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, "i");
      andConditions.push({
        $or: [
          { taskId: searchRegex },
          { title: searchRegex },
          { category: searchRegex },
          { subType: searchRegex },
          { notes: searchRegex },
        ],
      });
    }

    if (andConditions.length > 0) {
      query.$and = andConditions;
    }

    const tasks = await SMTask.find(query)
      .populate("client", "companyName color icon logo status assignedTo")
      .populate("assignee", "name email role department profileImage avatar profile accentColor")
      .populate("createdBy", "name email role department profileImage avatar")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get Single SM Task
// @route   GET /api/sm-tasks/:id
// @access  Private
exports.getSMTaskById = async (req, res) => {
  try {
    const task = await SMTask.findById(req.params.id)
      .populate("client", "companyName color icon logo status assignedTo")
      .populate("assignee", "name email role department profileImage avatar profile accentColor")
      .populate("createdBy", "name email role department profileImage avatar");

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Social Media Task not found",
      });
    }

    if (req.user.role !== "admin" && req.user.role !== "operationmanager") {
      const isCreator = task.createdBy && task.createdBy._id.toString() === req.user._id.toString();
      const isAssignee = task.assignee && task.assignee._id.toString() === req.user._id.toString();

      if (!isCreator && !isAssignee) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to access this Social Media Task",
        });
      }
    }

    res.status(200).json({
      success: true,
      data: task,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Create SM Task
// @route   POST /api/sm-tasks
// @access  Private
exports.createSMTask = async (req, res) => {
  try {
    const {
      client,
      category,
      title,
      subType,
      platform,
      dueDate,
      dueTime,
      priority,
      status,
      blocker,
      assignee,
      notes,
      subtasks,
    } = req.body;

    if (!client || !title || !dueDate) {
      return res.status(400).json({
        success: false,
        message: "Client, title, and due date are required",
      });
    }

    const taskId = await generateNextTaskId();

    const smTask = await SMTask.create({
      taskId,
      client,
      category: category || "Publishing",
      title,
      subType: subType || "Post",
      platform: platform && platform.length > 0 ? platform : ["Instagram"],
      dueDate: new Date(dueDate),
      dueTime: dueTime || "06:00 PM",
      priority: priority || "Medium",
      status: status || "To Do",
      blocker: blocker || "-",
      assignee: assignee || req.user._id,
      createdBy: req.user._id,
      notes: notes || "",
      subtasks: Array.isArray(subtasks) ? subtasks : [],
    });

    const populatedTask = await SMTask.findById(smTask._id)
      .populate("client", "companyName color icon logo status assignedTo")
      .populate("assignee", "name email role department profileImage avatar profile accentColor")
      .populate("createdBy", "name email role department profileImage avatar");

    res.status(201).json({
      success: true,
      data: populatedTask,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update SM Task
// @route   PUT /api/sm-tasks/:id
// @access  Private
exports.updateSMTask = async (req, res) => {
  try {
    let task = await SMTask.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Social Media Task not found",
      });
    }

    if (req.user.role !== "admin" && req.user.role !== "operationmanager") {
      const isCreator = task.createdBy && task.createdBy.toString() === req.user._id.toString();
      const isAssignee = task.assignee && task.assignee.toString() === req.user._id.toString();

      if (!isCreator && !isAssignee) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to update this Social Media Task",
        });
      }
    }

    task = await SMTask.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })
      .populate("client", "companyName color icon logo status assignedTo")
      .populate("assignee", "name email role department profileImage avatar profile accentColor")
      .populate("createdBy", "name email role department profileImage avatar");

    res.status(200).json({
      success: true,
      data: task,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Delete SM Task
// @route   DELETE /api/sm-tasks/:id
// @access  Private
exports.deleteSMTask = async (req, res) => {
  try {
    const task = await SMTask.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Social Media Task not found",
      });
    }

    if (req.user.role !== "admin" && req.user.role !== "operationmanager") {
      const isCreator = task.createdBy && task.createdBy.toString() === req.user._id.toString();
      const isAssignee = task.assignee && task.assignee.toString() === req.user._id.toString();

      if (!isCreator && !isAssignee) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to delete this Social Media Task",
        });
      }
    }

    await task.deleteOne();

    res.status(200).json({
      success: true,
      message: "Social Media Task deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Toggle Subtask
// @route   PATCH /api/sm-tasks/:id/subtasks/:subtaskId
// @access  Private
exports.toggleSubtask = async (req, res) => {
  try {
    const task = await SMTask.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Social Media Task not found",
      });
    }

    const subtask = task.subtasks.id(req.params.subtaskId);
    if (!subtask) {
      return res.status(404).json({
        success: false,
        message: "Subtask not found",
      });
    }

    subtask.completed = !subtask.completed;
    await task.save();

    const updatedTask = await SMTask.findById(req.params.id)
      .populate("client", "companyName color icon logo status assignedTo")
      .populate("assignee", "name email role profile accentColor")
      .populate("createdBy", "name email role");

    res.status(200).json({
      success: true,
      data: updatedTask,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Clear All SM Tasks
// @route   DELETE /api/sm-tasks/clear-all
// @access  Private
exports.clearAllSMTasks = async (req, res) => {
  try {
    await SMTask.deleteMany({});
    res.status(200).json({
      success: true,
      message: "All Social Media tasks deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
