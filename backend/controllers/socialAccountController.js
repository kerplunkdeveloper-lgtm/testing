const SocialAccount = require("../models/SocialAccount");
const Client = require("../models/Client");

// @desc    Get all social media accounts
// @route   GET /api/social-accounts
// @access  Private
exports.getSocialAccounts = async (req, res) => {
  try {
    const { search, status } = req.query;
    let queryConditions = [];

    if (status && status !== "All") {
      queryConditions.push({ status });
    }

    if (search && search.trim() !== "") {
      const searchRegex = new RegExp(search.trim(), "i");
      queryConditions.push({
        $or: [
          { clientName: searchRegex },
          { registeredEmail: searchRegex },
          { registeredPhone: searchRegex },
          { "instagram.username": searchRegex },
          { "instagram.email": searchRegex },
          { "instagram.phoneNumber": searchRegex },
          { "facebook.username": searchRegex },
          { "facebook.email": searchRegex },
          { "facebook.phoneNumber": searchRegex },
          { "googleMyBusiness.username": searchRegex },
          { "googleMyBusiness.email": searchRegex },
          { "googleMyBusiness.phoneNumber": searchRegex },
          { "tiktok.username": searchRegex },
          { "tiktok.email": searchRegex },
          { "tiktok.phoneNumber": searchRegex },
          { "otherPlatforms.username": searchRegex },
          { "otherPlatforms.platformName": searchRegex },
        ],
      });
    }

    // Role-based access control:
    // Team members (e.g. Social Media Manager) can only view social credentials of assigned clients or accounts they created
    if (req.user && req.user.role !== "admin" && req.user.role !== "operationmanager") {
      const assignedClients = await Client.find({ assignedTo: req.user._id }).select("_id companyName");
      const assignedClientIds = assignedClients.map((c) => c._id);
      const assignedClientNames = assignedClients.map((c) => c.companyName);

      queryConditions.push({
        $or: [
          { client: { $in: assignedClientIds } },
          { clientName: { $in: assignedClientNames } },
          { createdBy: req.user._id },
        ],
      });
    }

    const finalQuery = queryConditions.length > 0 ? { $and: queryConditions } : {};

    const socialAccounts = await SocialAccount.find(finalQuery)
      .populate({
        path: "client",
        select: "companyName industry phoneNumber color icon status assignedTo spoc designation",
        populate: {
          path: "assignedTo",
          select: "name email profileImage profilePic avatar role department profile",
        },
      })
      .populate("accountManager", "name email profileImage profilePic avatar role department profile")
      .populate("createdBy", "name email profileImage profilePic avatar role department profile")
      .populate("updatedBy", "name email")
      .sort({ updatedAt: -1, createdAt: -1 });

    res.status(200).json({
      success: true,
      count: socialAccounts.length,
      data: socialAccounts,
    });
  } catch (error) {
    console.error("Error fetching social accounts:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching social accounts",
      error: error.message,
    });
  }
};

// @desc    Get single social media account by ID
// @route   GET /api/social-accounts/:id
// @access  Private
exports.getSocialAccountById = async (req, res) => {
  try {
    const socialAccount = await SocialAccount.findById(req.params.id)
      .populate({
        path: "client",
        select: "companyName industry phoneNumber color icon status assignedTo spoc designation",
        populate: {
          path: "assignedTo",
          select: "name email profileImage profilePic avatar role department profile",
        },
      })
      .populate("accountManager", "name email profileImage profilePic avatar role department profile")
      .populate("createdBy", "name email profileImage profilePic avatar role department profile")
      .populate("updatedBy", "name email");

    if (!socialAccount) {
      return res.status(404).json({
        success: false,
        message: "Social media account record not found",
      });
    }

    // Check authorization for team role
    if (req.user && req.user.role !== "admin" && req.user.role !== "operationmanager") {
      const isCreator = socialAccount.createdBy?._id?.toString() === req.user._id.toString();
      let isAssigned = false;
      if (socialAccount.client) {
        const clientDoc = await Client.findOne({ _id: socialAccount.client, assignedTo: req.user._id });
        if (clientDoc) isAssigned = true;
      } else if (socialAccount.clientName) {
        const clientDoc = await Client.findOne({ companyName: socialAccount.clientName, assignedTo: req.user._id });
        if (clientDoc) isAssigned = true;
      }
      if (!isCreator && !isAssigned) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to access credentials for this client",
        });
      }
    }

    res.status(200).json({
      success: true,
      data: socialAccount,
    });
  } catch (error) {
    console.error("Error fetching social account by ID:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching social account",
      error: error.message,
    });
  }
};

// @desc    Create new social media account credentials
// @route   POST /api/social-accounts
// @access  Private
exports.createSocialAccount = async (req, res) => {
  try {
    const {
      client,
      clientName,
      spoc,
      designation,
      accountManager,
      registeredEmail,
      registeredPhone,
      instagram,
      facebook,
      googleMyBusiness,
      tiktok,
      otherPlatforms,
      twoFactorNotes,
      generalNotes,
      status,
    } = req.body;

    let finalClientName = clientName;
    let finalSpoc = spoc !== undefined ? spoc.trim() : "";
    let finalDesignation = designation !== undefined ? designation.trim() : "";
    let finalAccountManager = accountManager || null;

    // If client ID was provided but clientName was not, find the client
    if (client) {
      const clientDoc = await Client.findById(client);
      if (clientDoc) {
        if (!finalClientName || finalClientName.trim() === "") {
          finalClientName = clientDoc.companyName;
        }
        if (!finalSpoc && clientDoc.spoc) {
          finalSpoc = clientDoc.spoc;
        }
        if (!finalDesignation && clientDoc.designation) {
          finalDesignation = clientDoc.designation;
        }
        if (!finalAccountManager) {
          finalAccountManager = req.user ? req.user._id : (clientDoc.assignedTo && clientDoc.assignedTo.length > 0 ? clientDoc.assignedTo[0] : null);
        }
      }
    }

    if (!finalClientName || finalClientName.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Client name is required",
      });
    }

    const newAccount = await SocialAccount.create({
      client: client || null,
      clientName: finalClientName.trim(),
      spoc: finalSpoc,
      designation: finalDesignation,
      accountManager: finalAccountManager || null,
      registeredEmail: registeredEmail !== undefined ? registeredEmail.trim() : "",
      registeredPhone: registeredPhone !== undefined ? registeredPhone.trim() : "",
      instagram: instagram || {},
      facebook: facebook || {},
      googleMyBusiness: googleMyBusiness || {},
      tiktok: tiktok || {},
      otherPlatforms: Array.isArray(otherPlatforms) ? otherPlatforms : [],
      twoFactorNotes: twoFactorNotes || "",
      generalNotes: generalNotes || "",
      status: status || "Active",
      createdBy: req.user ? req.user._id : null,
      updatedBy: req.user ? req.user._id : null,
    });

    const populatedAccount = await SocialAccount.findById(newAccount._id)
      .populate({
        path: "client",
        select: "companyName industry phoneNumber color icon status assignedTo spoc designation",
        populate: {
          path: "assignedTo",
          select: "name email profileImage profilePic avatar role department profile",
        },
      })
      .populate("accountManager", "name email profileImage profilePic avatar role department profile")
      .populate("createdBy", "name email profileImage profilePic avatar role department profile")
      .populate("updatedBy", "name email");

    res.status(201).json({
      success: true,
      message: "Social media credentials added successfully",
      data: populatedAccount,
    });
  } catch (error) {
    console.error("Error creating social account:", error);
    res.status(500).json({
      success: false,
      message: "Server error while creating social account",
      error: error.message,
    });
  }
};

// @desc    Update social media account credentials
// @route   PUT /api/social-accounts/:id
// @access  Private
exports.updateSocialAccount = async (req, res) => {
  try {
    let socialAccount = await SocialAccount.findById(req.params.id);

    if (!socialAccount) {
      return res.status(404).json({
        success: false,
        message: "Social media account record not found",
      });
    }

    // Check authorization for team role
    if (req.user && req.user.role !== "admin" && req.user.role !== "operationmanager") {
      const isCreator = socialAccount.createdBy?.toString() === req.user._id.toString();
      let isAssigned = false;
      if (socialAccount.client) {
        const clientDoc = await Client.findOne({ _id: socialAccount.client, assignedTo: req.user._id });
        if (clientDoc) isAssigned = true;
      } else if (socialAccount.clientName) {
        const clientDoc = await Client.findOne({ companyName: socialAccount.clientName, assignedTo: req.user._id });
        if (clientDoc) isAssigned = true;
      }
      if (!isCreator && !isAssigned) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to update credentials for this client",
        });
      }
    }

    const {
      client,
      clientName,
      spoc,
      designation,
      accountManager,
      registeredEmail,
      registeredPhone,
      instagram,
      facebook,
      googleMyBusiness,
      tiktok,
      otherPlatforms,
      twoFactorNotes,
      generalNotes,
      status,
    } = req.body;

    let finalClientName = clientName !== undefined ? clientName : socialAccount.clientName;
    if (client && (!finalClientName || finalClientName.trim() === "")) {
      const clientDoc = await Client.findById(client);
      if (clientDoc) {
        finalClientName = clientDoc.companyName;
      }
    }

    socialAccount.client = client !== undefined ? client : socialAccount.client;
    socialAccount.clientName = finalClientName ? finalClientName.trim() : socialAccount.clientName;
    if (spoc !== undefined) socialAccount.spoc = spoc.trim();
    if (designation !== undefined) socialAccount.designation = designation.trim();
    if (accountManager !== undefined) socialAccount.accountManager = accountManager || null;
    if (registeredEmail !== undefined) socialAccount.registeredEmail = registeredEmail.trim();
    if (registeredPhone !== undefined) socialAccount.registeredPhone = registeredPhone.trim();
    
    if (instagram !== undefined) socialAccount.instagram = instagram;
    if (facebook !== undefined) socialAccount.facebook = facebook;
    if (googleMyBusiness !== undefined) socialAccount.googleMyBusiness = googleMyBusiness;
    if (tiktok !== undefined) socialAccount.tiktok = tiktok;
    if (otherPlatforms !== undefined) socialAccount.otherPlatforms = otherPlatforms;
    if (twoFactorNotes !== undefined) socialAccount.twoFactorNotes = twoFactorNotes;
    if (generalNotes !== undefined) socialAccount.generalNotes = generalNotes;
    if (status !== undefined) socialAccount.status = status;
    
    if (req.user) {
      socialAccount.updatedBy = req.user._id;
    }

    await socialAccount.save();

    const populatedAccount = await SocialAccount.findById(socialAccount._id)
      .populate({
        path: "client",
        select: "companyName industry phoneNumber color icon status assignedTo spoc designation",
        populate: {
          path: "assignedTo",
          select: "name email profileImage profilePic avatar role department profile",
        },
      })
      .populate("accountManager", "name email profileImage profilePic avatar role department profile")
      .populate("createdBy", "name email profileImage profilePic avatar role department profile")
      .populate("updatedBy", "name email");

    res.status(200).json({
      success: true,
      message: "Social media credentials updated successfully",
      data: populatedAccount,
    });
  } catch (error) {
    console.error("Error updating social account:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating social account",
      error: error.message,
    });
  }
};

// @desc    Delete social media account record
// @route   DELETE /api/social-accounts/:id
// @access  Private
exports.deleteSocialAccount = async (req, res) => {
  try {
    const socialAccount = await SocialAccount.findById(req.params.id);

    if (!socialAccount) {
      return res.status(404).json({
        success: false,
        message: "Social media account record not found",
      });
    }

    // Check authorization for team role
    if (req.user && req.user.role !== "admin" && req.user.role !== "operationmanager") {
      const isCreator = socialAccount.createdBy?.toString() === req.user._id.toString();
      let isAssigned = false;
      if (socialAccount.client) {
        const clientDoc = await Client.findOne({ _id: socialAccount.client, assignedTo: req.user._id });
        if (clientDoc) isAssigned = true;
      } else if (socialAccount.clientName) {
        const clientDoc = await Client.findOne({ companyName: socialAccount.clientName, assignedTo: req.user._id });
        if (clientDoc) isAssigned = true;
      }
      if (!isCreator && !isAssigned) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to delete credentials for this client",
        });
      }
    }

    await SocialAccount.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Social media account record deleted successfully",
      data: { id: req.params.id },
    });
  } catch (error) {
    console.error("Error deleting social account:", error);
    res.status(500).json({
      success: false,
      message: "Server error while deleting social account",
      error: error.message,
    });
  }
};
