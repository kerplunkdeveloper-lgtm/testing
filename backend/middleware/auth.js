const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes
exports.protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    // Set token from Bearer token in header
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.token) {
    // Set token from cookie
    token = req.cookies.token;
  }

  // Make sure token exists
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route',
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = await User.findById(decoded.id);

    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route',
    });
  }
};

// Grant access to specific roles or users with appropriate permissions
exports.authorize = (...roles) => {
  return (req, res, next) => {
    // Admin always has full access
    if (req.user.role === 'admin') {
      return next();
    }

    // Check if user has explicit role access
    if (roles.includes(req.user.role)) {
      return next();
    }

    // Check permission based on the endpoint
    const url = req.originalUrl || '';
    const permissions = req.user.permissions || {};

    let hasPermission = false;
    if (url.includes('/projects') || url.includes('/business-projects')) {
      const perm = permissions.manage_projects;
      hasPermission = perm === true || perm?.read || perm?.write;
    } else if (url.includes('/tasks')) {
      const perm = permissions.manage_tasks;
      hasPermission = perm === true || perm?.read || perm?.write;
    } else if (url.includes('/portfolios') || url.includes('/templates') || url.includes('/overheads')) {
      const perm = permissions.manage_settings;
      hasPermission = perm === true || perm?.read || perm?.write;
    } else if (url.includes('/clients')) {
      const perm = permissions.manage_clients;
      hasPermission = perm === true || perm?.read || perm?.write;
    } else if (url.includes('/users')) {
      const perm = permissions.manage_users;
      hasPermission = perm === true || perm?.read || perm?.write;
    } else if (url.includes('/eod-reports')) {
      const perm = permissions.view_reports;
      hasPermission = perm === true || perm?.read || perm?.write;
    }

    if (hasPermission) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: `User role ${req.user.role} is not authorized to access this route`,
    });
  };
};