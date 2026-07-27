const Task = require("../models/Task");
const Notification = require("../models/Notification");
const User = require("../models/User");
const Project = require("../models/Project");

// @desc    Get all tasks
// @route   GET /api/tasks
// @access  Private
exports.getTasks = async (req, res) => {
  try {
    let query = {};
    if (req.user.role !== "admin" && req.user.role !== "operationmanager") {
      const Client = require("../models/Client");
      const assignedClients = await Client.find({ assignedTo: req.user._id }).select("_id");
      const clientIds = assignedClients.map(c => c._id);

      // Projects of assigned clients
      const assignedProjects = await Project.find({ client: { $in: clientIds } }).select("_id");
      let projectIds = assignedProjects.map(p => p._id);

      // Add projects in department
      if (req.user.department) {
        const usersInSameDept = await User.find({ department: req.user.department }).select("_id");
        const userIds = usersInSameDept.map(u => u._id);
        const projectsInDept = await Project.find({ createdBy: { $in: userIds } }).select("_id");
        const deptProjIds = projectsInDept.map(p => p._id.toString());
        
        // Merge projectIds avoiding duplicates
        const projectIdsSet = new Set([...projectIds.map(id => id.toString()), ...deptProjIds]);
        projectIds = Array.from(projectIdsSet);
      }

      query.$or = [
        { createdBy: req.user._id },
        { assignedTo: req.user._id },
        { "subtasks.assignedTo": req.user._id },
        { project: { $in: projectIds } }
      ];
    }
    const tasks = await Task.find(query)
      .populate({
        path: "project",
        select: "name client",
        populate: {
          path: "client",
          select: "companyName color icon"
        }
      })
      .populate({
        path: "assignedTo",
        select: "name email department profile",
        populate: { path: "profile", select: "profileImage" }
      })
      .populate({
        path: "createdBy",
        select: "name email department profile",
        populate: { path: "profile", select: "profileImage" }
      })
      .populate({
        path: "subtasks.assignedTo",
        select: "name email department profile",
        populate: { path: "profile", select: "profileImage" }
      })
      .populate({
        path: "comments.user",
        select: "name email profile",
        populate: { path: "profile", select: "profileImage" }
      })
      .populate({
        path: "attachments.uploadedBy",
        select: "name email profile",
        populate: { path: "profile", select: "profileImage" }
      });

    res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Create a new task
// @route   POST /api/tasks
// @access  Private/Admin/OperationManager
exports.createTask = async (req, res) => {
  try {
    req.body.createdBy = req.user._id;
    const task = await Task.create(req.body);

    const populatedTask = await Task.findById(task._id)
      .populate({
        path: "project",
        select: "name client",
        populate: {
          path: "client",
          select: "companyName color icon"
        }
      })
      .populate({
        path: "assignedTo",
        select: "name email department profile",
        populate: { path: "profile", select: "profileImage" }
      })
      .populate({
        path: "createdBy",
        select: "name email department profile",
        populate: { path: "profile", select: "profileImage" }
      })
      .populate({
        path: "subtasks.assignedTo",
        select: "name email department profile",
        populate: { path: "profile", select: "profileImage" }
      })
      .populate({
        path: "comments.user",
        select: "name email profile",
        populate: { path: "profile", select: "profileImage" }
      })
      .populate({
        path: "attachments.uploadedBy",
        select: "name email profile",
        populate: { path: "profile", select: "profileImage" }
      });

    // Real-time Notification
    if (task.assignedTo) {
      const notification = await Notification.create({
        recipient: task.assignedTo,
        sender: req.user._id,
        type: "task_assigned",
        message: `You have been assigned a new task: "${task.title}"`,
        task: task._id,
        project: task.project,
      });

      const io = req.app.get("io");
      if (io) {
        const populatedNotification = await Notification.findById(notification._id).populate("sender", "name");
        io.to(task.assignedTo.toString()).emit("notification", populatedNotification);
      }
    }

    res.status(201).json({
      success: true,
      data: populatedTask,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// @desc    Update a task (including status or adding subtasks)
// @route   PUT /api/tasks/:id
// @access  Private
exports.updateTask = async (req, res) => {
  try {
    const currentUserId = req.user._id ? req.user._id.toString() : req.user.id;
    
    // .........................................Prevent overriding read-only fields on update..........................................      
    delete req.body.createdBy;
    delete req.body.project;

    let task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    const previousStatus = task.status;
    const previousAssignee = task.assignedTo;
    const previousSubtasks = task.subtasks ? JSON.parse(JSON.stringify(task.subtasks)) : [];

   
   // .........................................Time tracking logic for parent task...........................................
if (req.body.status && req.body.status !== previousStatus) {

  if (req.body.status === "In Progress") {
    const otherFilter = {
      _id: { $ne: task._id },
      status: { $in: ["In Progress", "In-Progress"] },
    };
    if (task.assignedTo) {
      otherFilter.assignedTo = task.assignedTo;
    } else if (task.project) {
      otherFilter.project = task.project;
    }
    await Task.updateMany(otherFilter, {
      $set: {
        status: "On Hold",
        pausedAt: Date.now(),
      },
    });
  }

  switch (req.body.status) {

    case "Pending":
      req.body.actualStartTime = null;
      req.body.actualEndTime = null;
      req.body.pausedAt = null;
      break;

 case "In Progress":
  if (!task.actualStartTime) {
    req.body.actualStartTime = Date.now();
  }

  if (task.pausedAt) {
    req.body.totalPausedMs =
      (task.totalPausedMs || 0) +
      (Date.now() - new Date(task.pausedAt).getTime());
  }

  req.body.pausedAt = null;
  break;

    case "Completed":
      if (!task.actualEndTime) {
        req.body.actualEndTime = Date.now();
      }
      req.body.pausedAt = null;
      break;

    case "On Hold":
    case "In Review":
    case "IN-REVIEW":
    case "IN-Review":
    case "Rejected":
      if (!task.pausedAt) {
        req.body.pausedAt = Date.now();
      }
      break;
  }

  if (req.body.status === "Rejected" && previousStatus !== "Rejected") {
    req.body.revisions = (task.revisions || 0) + 1;
  }
}
    // .........................................Time tracking logic for subtasks...........................................    
   // .........................................Time tracking logic for subtasks...........................................
if (req.body.subtasks) {
  req.body.subtasks = req.body.subtasks.map((sub) => {

    const prevSub = previousSubtasks.find(
      (p) => p._id && sub._id && p._id.toString() === sub._id.toString()
    );

    if (prevSub && sub.status && sub.status !== prevSub.status) {

      switch (sub.status) {

        case "Pending":
          sub.actualStartTime = null;
          sub.actualEndTime = null;
          sub.pausedAt = null;
          break;

       case "In Progress":
  if (!prevSub.actualStartTime && !sub.actualStartTime) {
    sub.actualStartTime = Date.now();
  }

  if (prevSub.pausedAt) {
    sub.totalPausedMs =
      (prevSub.totalPausedMs || 0) +
      (Date.now() - new Date(prevSub.pausedAt).getTime());
  }

  sub.pausedAt = null;
  break;

        case "Completed":
          if (!prevSub.actualEndTime && !sub.actualEndTime) {
            sub.actualEndTime = Date.now();
          }
          sub.pausedAt = null;
          break;

        case "On Hold":
        case "In Review":
        case "IN-REVIEW":
        case "IN-Review":
        case "In Review":
        case "Rejected":
          if (!prevSub.pausedAt) {
            sub.pausedAt = Date.now();
          }
          break;
      }
    }

    return sub;
  });
}

    task = await Task.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })
      .populate({
        path: "project",
        select: "name client",
        populate: {
          path: "client",
          select: "companyName color icon"
        }
      })
      .populate({
        path: "assignedTo",
        select: "name email department profile",
        populate: { path: "profile", select: "profileImage" }
      })
      .populate({
        path: "createdBy",
        select: "name email department profile",
        populate: { path: "profile", select: "profileImage" }
      })
      .populate({
        path: "subtasks.assignedTo",
        select: "name email department profile",
        populate: { path: "profile", select: "profileImage" }
      })
      .populate({
        path: "comments.user",
        select: "name email profile",
        populate: { path: "profile", select: "profileImage" }
      })
      .populate({
        path: "attachments.uploadedBy",
        select: "name email profile",
        populate: { path: "profile", select: "profileImage" }
      });

    // Check if task status has been updated (e.g. marked completed)
    if (req.body.status && req.body.status !== previousStatus) {
      const io = req.app.get("io");
      const isAssignee = (task.assignedTo?._id || task.assignedTo)?.toString() === currentUserId;

      if (isAssignee) {
        // A member updated their own task status. Notify all admins, operation managers, and the task creator!
        const managers = await User.find({ role: { $in: ["admin", "operationmanager"] } });
        const recipientIds = new Set(managers.map(m => m._id.toString()));
        
        const creatorId = task.createdBy?._id || task.createdBy;
        if (creatorId && creatorId.toString() !== currentUserId) {
          recipientIds.add(creatorId.toString());
        }

        // Notify creator is handled above. Only the creator (the particular SMM who created it) will be notified, along with admins and operation managers.

        for (const recipientId of recipientIds) {
          const notification = await Notification.create({
            recipient: recipientId,
            sender: req.user._id,
            type: "task_updated",
            message: `${req.user.department || 'Member'} - ${req.user.name} updated task "${task.title}" to: ${task.status}`,
            task: task._id,
            project: task.project?._id || task.project,
          });

          if (io) {
            const populatedNotification = await Notification.findById(notification._id).populate("sender", "name");
            io.to(recipientId).emit("notification", populatedNotification);
          }
        }
      } else {
        // An admin/manager or creator updated the task status. Notify assignee and creator!
        const recipientIds = new Set();
        
        const recipient = task.assignedTo?._id || task.assignedTo;
        if (recipient && recipient.toString() !== currentUserId) {
          recipientIds.add(recipient.toString());
        }

        const creatorId = task.createdBy?._id || task.createdBy;
        if (creatorId && creatorId.toString() !== currentUserId) {
          recipientIds.add(creatorId.toString());
        }

        for (const recipientId of recipientIds) {
          const notification = await Notification.create({
            recipient: recipientId,
            sender: req.user._id,
            type: "task_updated",
            message: `Task "${task.title}" status updated to: ${task.status}`,
            task: task._id,
            project: task.project?._id || task.project,
          });

          if (io) {
            const populatedNotification = await Notification.findById(notification._id).populate("sender", "name");
            io.to(recipientId).emit("notification", populatedNotification);
          }
        }
      }
    }

    // Check if task has been assigned to a different user
    if (req.body.assignedTo && req.body.assignedTo.toString() !== previousAssignee?.toString()) {
      const notification = await Notification.create({
        recipient: req.body.assignedTo,
        sender: req.user._id,
        type: "task_assigned",
        message: `You have been assigned the task: "${task.title}" , Assigned by : "${req.user.name}" `,
        task: task._id,
        project: task.project?._id || task.project,
      });

      const io = req.app.get("io");
      if (io) {
        const populatedNotification = await Notification.findById(notification._id).populate("sender", "name");
        io.to(req.body.assignedTo.toString()).emit("notification", populatedNotification);
      }
    }

    // Check subtask updates
    if (req.body.subtasks) {
      const io = req.app.get("io");
      for (const sub of (task.subtasks || [])) {
        // Find previous subtask state
        const prevSub = previousSubtasks.find(p => p._id && sub._id && p._id.toString() === sub._id.toString());
        
        if (!prevSub) {
          // New subtask added! If assigned, send notification
          const subAssignee = sub.assignedTo?._id || sub.assignedTo;
          if (subAssignee) {
            const notification = await Notification.create({
              recipient: subAssignee,
              sender: req.user._id,
              type: "task_assigned",
              message: `You have been assigned a new subtask: "${sub.title || 'Untitled'}" in task "${task.title}"`,
              task: task._id,
              project: task.project?._id || task.project,
            });

            if (io) {
              const populatedNotification = await Notification.findById(notification._id).populate("sender", "name");
              io.to(subAssignee.toString()).emit("notification", populatedNotification);
            }
          }
        } else {
          // Existing subtask. Check for assignee change
          const prevSubAssignee = prevSub.assignedTo?._id || prevSub.assignedTo;
          const currSubAssignee = sub.assignedTo?._id || sub.assignedTo;

          if (currSubAssignee && currSubAssignee.toString() !== prevSubAssignee?.toString()) {
            // Assigned to someone else
            const notification = await Notification.create({
              recipient: currSubAssignee,
              sender: req.user._id,
              type: "task_assigned",
              message: `You have been assigned the subtask: "${sub.title}" in task "${task.title}"`,
              task: task._id,
              project: task.project?._id || task.project,
            });

            if (io) {
              const populatedNotification = await Notification.findById(notification._id).populate("sender", "name");
              io.to(currSubAssignee.toString()).emit("notification", populatedNotification);
            }
          }

          // Check for status change
          if (sub.status && sub.status !== prevSub.status) {
            const isSubAssignee = currSubAssignee?.toString() === currentUserId || prevSubAssignee?.toString() === currentUserId;
            if (isSubAssignee) {
              // Member updated their own subtask status. Notify all admins, operation managers, and the task creator!
              const managers = await User.find({ role: { $in: ["admin", "operationmanager"] } });
              const recipientIds = new Set(managers.map(m => m._id.toString()));
              
              const creatorId = task.createdBy?._id || task.createdBy;
              if (creatorId && creatorId.toString() !== currentUserId) {
                recipientIds.add(creatorId.toString());
              }

              for (const recipientId of recipientIds) {
                const notification = await Notification.create({
                  recipient: recipientId,
                  sender: req.user._id,
                  type: "task_updated",
                  message: `Member ${req.user.name} updated subtask "${sub.title}" to: ${sub.status} (in task "${task.title}")`,
                  task: task._id,
                  project: task.project?._id || task.project,
                });

                if (io) {
                  const populatedNotification = await Notification.findById(notification._id).populate("sender", "name");
                  io.to(recipientId).emit("notification", populatedNotification);
                }
              }
            } else {
              // Admin/manager/creator updated the subtask status. Notify assignee and creator!
              const recipientIds = new Set();
              if (currSubAssignee && currSubAssignee.toString() !== currentUserId) {
                recipientIds.add(currSubAssignee.toString());
              }
              const creatorId = task.createdBy?._id || task.createdBy;
              if (creatorId && creatorId.toString() !== currentUserId) {
                recipientIds.add(creatorId.toString());
              }

              for (const recipientId of recipientIds) {
                const notification = await Notification.create({
                  recipient: recipientId,
                  sender: req.user._id,
                  type: "task_updated",
                  message: `Subtask "${sub.title}" status updated to: ${sub.status} (in task "${task.title}")`,
                  task: task._id,
                  project: task.project?._id || task.project,
                });

                if (io) {
                  const populatedNotification = await Notification.findById(notification._id).populate("sender", "name");
                  io.to(recipientId).emit("notification", populatedNotification);
                }
              }
            }
          }
        }
      }
    }

    const io = req.app.get("io");
    if (io) {
      io.emit("task_updated", { taskId: task._id });
    }

    res.status(200).json({
      success: true,
      data: task,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// @desc    Delete a task
// @route   DELETE /api/tasks/:id
// @access  Private/Admin/OperationManager
exports.deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    await task.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
