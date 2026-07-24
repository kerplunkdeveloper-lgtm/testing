const EodReport = require("../models/EodReport");
const cloudinary = require("../config/cloudinary");

// ==========================================
// CREATE EOD REPORT
// ==========================================
exports.createEodReport = async (req, res) => {
  try {
    const report = await EodReport.create({
      ...req.body,
      user: req.user._id,
    });

    const populatedReport = await EodReport.findById(report._id).populate({
      path: "user",
      select: "name email role profile department",
      populate: { path: "profile", select: "profileImage" }
    });

    // Notify admins and operation managers
    try {
      const User = require("../models/User");
      const Notification = require("../models/Notification");
      const adminsAndManagers = await User.find({
        role: { $in: ["admin", "operationmanager"] }
      });
      
      const io = req.app.get("io");
      const senderName = req.user.name || "A team member";
      
      for (const recipient of adminsAndManagers) {
        if (recipient._id.toString() === req.user._id.toString()) continue;
        
        const notification = await Notification.create({
          recipient: recipient._id,
          sender: req.user._id,
          type: "report_submitted",
          message: `${senderName} submitted a new EOD Report`,
        });
        
        if (io) {
          const populatedNotification = await Notification.findById(notification._id).populate("sender", "name");
          io.to(recipient._id.toString()).emit("notification", populatedNotification);
        }
      }
    } catch (notifErr) {
      console.error("Failed to send EOD report notifications:", notifErr);
    }

    res.status(201).json({
      success: true,
      message: "EOD Report submitted successfully",
      data: populatedReport,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

// ==========================================
// GET EOD REPORTS
// ==========================================
exports.getEodReports = async (req, res) => {
  try {
    let query = {};

    // If role is team, only show their own reports
    if (req.user.role === "team") {
      query = { user: req.user._id };
    }

    // Admins and Operation Managers can see all reports
    const reports = await EodReport.find(query)
      .populate({
        path: "user",
        select: "name email role profile department",
        populate: { path: "profile", select: "profileImage" }
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: reports.length,
      data: reports,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ==========================================
// GET SINGLE EOD REPORT
// ==========================================
exports.getEodReport = async (req, res) => {
  try {
    const report = await EodReport.findById(req.params.id)
      .populate({
        path: "user",
        select: "name email role profile department",
        populate: { path: "profile", select: "profileImage" }
      });

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found",
      });
    }

    // Security check for team members
    if (req.user.role === "team" && report.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to access this report",
      });
    }

    res.status(200).json({
      success: true,
      data: report,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ==========================================
// UPDATE EOD REPORT
// ==========================================
exports.updateEodReport = async (req, res) => {
  try {
    let report = await EodReport.findById(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found",
      });
    }

    // Ensure only the user who created it can update it
    if (report.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this report",
      });
    }

    report = await EodReport.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate("user", "name email profile");

    res.status(200).json({
      success: true,
      message: "Report updated successfully",
      data: report,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

// ==========================================
// UPLOAD ATTACHMENT FOR EOD REPORT
// ==========================================
exports.uploadEodAttachment = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file provided" });
    }

    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "eod_attachments",
      resource_type: "auto",
    });

    let fileType = "document";
    const mime = req.file.mimetype;
    if (mime.startsWith("image/")) {
      fileType = "image";
    } else if (mime.startsWith("video/")) {
      fileType = "video";
    } else if (mime.startsWith("audio/")) {
      fileType = "audio";
    }

    res.status(200).json({
      success: true,
      data: {
        url: result.secure_url,
        filename: req.file.originalname,
        fileType,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// DELETE EOD REPORT
// ==========================================
exports.deleteEodReport = async (req, res) => {
  try {
    const report = await EodReport.findById(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found",
      });
    }

    // Ensure only the user who created it (or admin/operations) can delete it
    if (req.user.role === "team" && report.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this report",
      });
    }

    await report.deleteOne();

    res.status(200).json({
      success: true,
      message: "Report deleted successfully",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

