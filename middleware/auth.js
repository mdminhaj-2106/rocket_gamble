const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Adjust path as needed

const requireAuth = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '') || 
                  req.cookies.token || 
                  req.session.token;

    if (!token) {
      return res.status(401).redirect('/auth/login');
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Get user from database
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).redirect('/auth/login');
    }

    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).redirect('/auth/login');
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '') || 
                  req.cookies.token || 
                  req.session.token;

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      const user = await User.findById(decoded.userId).select('-password');
      if (user) {
        req.user = user;
      }
    }
    next();
  } catch (error) {
    // Continue without auth if token is invalid
    next();
  }
};

// Alternative session-based auth if you're using sessions instead of JWT
const requireAuthSession = (req, res, next) => {
  if (req.session && req.session.userId) {
    return next();
  } else {
    return res.status(401).redirect('/auth/login');
  }
};

module.exports = {
  requireAuth,
  optionalAuth,
  requireAuthSession
};