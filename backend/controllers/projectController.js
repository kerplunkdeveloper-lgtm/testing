const Project = require("../models/Project");
const User = require("../models/User");
const Task = require("../models/Task");

// @desc    Get all projects
// @route   GET /api/projects
// @access  Private
exports.getProjects = async (req, res) => {
  try {
    let query = {};
    if (req.user.role !== "admin" && req.user.role !== "operationmanager") {
      query = {
        $or: [
          { access: "Public" },
          { access: { $exists: false } },
          { createdBy: req.user._id }
        ]
      };
    }
    const projects = await Project.find(query)
      .populate("createdBy", "name department");

    res.status(200).json({
      success: true,
      count: projects.length,
      data: projects,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Create a new project
// @route   POST /api/projects
// @access  Private/Admin/OperationManager
exports.createProject = async (req, res) => {
  try {
    const project = await Project.create({
      ...req.body,
      createdBy: req.user._id,
    });

    const populatedProject = await Project.findById(project._id)
      .populate("createdBy", "name department");

    res.status(201).json({
      success: true,
      data: populatedProject,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// @desc    Update a project
// @route   PUT /api/projects/:id
// @access  Private/Admin/OperationManager
exports.updateProject = async (req, res) => {
  try {
    let project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    if (req.user.role !== "admin" && req.user.role !== "operationmanager" && project.access === "Private" && project.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "You are not authorized to edit this private project" });
    }

    project = await Project.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })
      .populate("createdBy", "name department");

    res.status(200).json({
      success: true,
      data: project,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// @desc    Delete a project
// @route   DELETE /api/projects/:id
// @access  Private/Admin/OperationManager
exports.deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    if (req.user.role !== "admin" && req.user.role !== "operationmanager" && project.access === "Private" && project.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "You are not authorized to delete this private project" });
    }

    await Task.deleteMany({ project: req.params.id });
    await project.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
