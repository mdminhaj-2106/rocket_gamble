const rateLimit = require('express-rate-limit');

// Rate limiting for betting actions
const betLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // limit each IP to 10 bet requests per windowMs
  message: {
    success: false,
    message: 'Too many bet attempts, please slow down'
  }
});

// Rate limiting for API calls
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    success: false,
    message: 'Too many API requests, please try again later'
  }
});

// Input sanitization middleware
const sanitizeInput = (req, res, next) => {
  for (const key in req.body) {
    if (typeof req.body[key] === 'string') {
      req.body[key] = req.body[key].trim().replace(/[<>]/g, '');
    }
  }
  next();
};

module.exports = {
  betLimiter,
  apiLimiter,
  sanitizeInput
};
