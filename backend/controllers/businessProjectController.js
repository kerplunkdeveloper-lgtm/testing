const BusinessProject = require("../models/BusinessProject");

// @desc    Get all business projects
// @route   GET /api/v1/business-projects
// @access  Private/Admin
exports.getBusinessProjects = async (req, res, next) => {
  try {
    const projects = await BusinessProject.find()
      .populate("employees", "name email department role salary overheadPercent capacity")
      .populate("client", "companyName industry primaryContact color icon");

    res.status(200).json({
      success: true,
      count: projects.length,
      data: projects,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @desc    Create a new business project
// @route   POST /api/v1/business-projects
// @access  Private/Admin
exports.createBusinessProject = async (req, res, next) => {
  try {
    const project = await BusinessProject.create(req.body);

    const populatedProject = await BusinessProject.findById(project._id)
      .populate("employees", "name email department role salary overheadPercent capacity")
      .populate("client", "companyName industry primaryContact color icon");

    res.status(201).json({
      success: true,
      data: populatedProject,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// @desc    Update a business project
// @route   PUT /api/v1/business-projects/:id
// @access  Private/Admin
exports.updateBusinessProject = async (
  req,
  res,
  next
) => {
  try {
    let project = await BusinessProject.findById(
      req.params.id
    );

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    project.name =
      req.body.name || project.name;

    project.client =
      req.body.client || project.client;

    project.type =
      req.body.type || project.type;

    project.status =
      req.body.status || project.status;

    project.revenue =
      req.body.revenue || project.revenue;

    project.cost =
      req.body.cost !== undefined ? req.body.cost : project.cost;

    project.duration =
      req.body.duration || project.duration;

    project.employees =
      req.body.employees || project.employees;

    await project.save();

    project = await BusinessProject.findById(
      project._id
    )
      .populate(
        "employees",
        "name email department role salary overheadPercent capacity"
      )
      .populate(
        "client",
        "companyName industry primaryContact"
      );

    res.status(200).json({
      success: true,
      data: project,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

// @desc    Delete a business project
// @route   DELETE /api/v1/business-projects/:id
// @access  Private/Admin
exports.deleteBusinessProject = async (req, res, next) => {
  try {
    const project = await BusinessProject.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    await project.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @desc    Assign an employee to a business project
// @route   POST /api/v1/business-projects/:id/assign
// @access  Private/Admin
exports.assignEmployee = async (req, res, next) => {
  try {
    const { employeeId } = req.body;
    
    let project = await BusinessProject.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    if (!project.employees.includes(employeeId)) {
      project.employees.push(employeeId);
      await project.save();
    }

    project = await BusinessProject.findById(req.params.id)
      .populate("employees", "name email department role salary overheadPercent capacity")
      .populate("client", "companyName industry primaryContact color icon");

    res.status(200).json({
      success: true,
      data: project,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};
