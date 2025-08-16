// middleware/auth.js - Updated to work with sessions

const User = require('../models/User');

// Session-based authentication middleware
const requireAuth = async (req, res, next) => {
  try {
    // Check if user is logged in via session
    if (!req.session || !req.session.userId) {
      return res.redirect('/auth/login?error=Please log in first');
    }

    // Get user from database and attach to request
    const user = await User.findById(req.session.userId);
    
    if (!user) {
      // Clear invalid session
      req.session.destroy();
      return res.redirect('/auth/login?error=User not found');
    }

    // Attach user to request object for controllers
    req.user = user;
    next();
    
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.redirect('/auth/login?error=Authentication error');
  }
};

// Optional auth - doesn't redirect if not authenticated
const optionalAuth = async (req, res, next) => {
  try {
    if (req.session && req.session.userId) {
      const user = await User.findById(req.session.userId);
      if (user) {
        req.user = user;
      }
    }
    next();
  } catch (error) {
    console.error('Optional auth error:', error);
    next(); // Continue without auth
  }
};

// Admin authentication middleware
const requireAdmin = async (req, res, next) => {
  try {
    // Check admin session flag
    if (!req.session || !req.session.isAdmin) {
      return res.redirect('/admin/login?error=Admin access required');
    }

    next();
    
  } catch (error) {
    console.error('Admin auth error:', error);
    return res.redirect('/admin/login?error=Authentication error');
  }
};

// Alternative session-based auth (keeping for compatibility)
const requireAuthSession = (req, res, next) => {
  if (req.session && req.session.userId) {
    return next();
  } else {
    return res.redirect('/auth/login?error=Please log in first');
  }
};

module.exports = {
  requireAuth,
  optionalAuth,
  requireAdmin,
  requireAuthSession
};