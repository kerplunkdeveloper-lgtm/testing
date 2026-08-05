const Template = require("../models/Template");



// CREATE TEMPLATE
exports.createTemplate = async (req, res) => {
  try {
    const {
      title,
      type,
      description,
      services,
      totalTasks,
    } = req.body;

    const template = await Template.create({
      title,
      type,
      description,
      services,
      totalTasks,
    });

    res.status(201).json({
      success: true,
      message: "Template created successfully",
      data: template,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};



// GET ALL TEMPLATES
exports.getTemplates = async (req, res) => {
  try {
    const templates = await Template.find().sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      count: templates.length,
      data: templates,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};



// GET SINGLE TEMPLATE
exports.getTemplate = async (req, res) => {
  try {
    const template = await Template.findById(
      req.params.id
    );

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Template not found",
      });
    }

    res.status(200).json({
      success: true,
      data: template,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};



// UPDATE TEMPLATE
exports.updateTemplate = async (req, res) => {
  try {
    const updatedTemplate =
      await Template.findByIdAndUpdate(
        req.params.id,
        req.body,
        {
          returnDocument: 'after',
          runValidators: true,
        }
      );

    if (!updatedTemplate) {
      return res.status(404).json({
        success: false,
        message: "Template not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Template updated successfully",
      data: updatedTemplate,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};



// DELETE TEMPLATE
exports.deleteTemplate = async (req, res) => {
  try {
    const template = await Template.findById(
      req.params.id
    );

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Template not found",
      });
    }

    await template.deleteOne();

    res.status(200).json({
      success: true,
      message: "Template deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};



// TOGGLE ACTIVE STATUS
exports.toggleTemplateStatus = async (
  req,
  res
) => {
  try {
    const template = await Template.findById(
      req.params.id
    );

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Template not found",
      });
    }

    template.isActive = !template.isActive;

    await template.save();

    res.status(200).json({
      success: true,
      message: "Template status updated",
      data: template,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};