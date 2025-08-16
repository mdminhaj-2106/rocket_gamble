// routes/auth.js - Fixed to work with simple name-based login

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { optionalAuth } = require('../middleware/auth');

// Apply optional auth middleware
router.use(optionalAuth);

// Login routes
router.get('/login', authController.showLogin);
router.post('/login', authController.login);

// Logout routes
router.get('/logout', authController.logout);
router.post('/logout', authController.logout);

// Profile route (optional)
router.get('/profile', authController.showProfile);

// Redirect register to login (since we only use names)
router.get('/register', authController.showRegister);

module.exports = router;