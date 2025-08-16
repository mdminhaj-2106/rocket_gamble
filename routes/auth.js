const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { optionalAuth } = require('../middleware/auth'); // Use optionalAuth for auth routes
const { body } = require('express-validator');

// Apply optional auth middleware (allows both authenticated and non-authenticated users)
router.use(optionalAuth);

// Registration routes
router.get('/register', authController.showRegister);
router.post('/register', [
  body('username')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3-30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
], authController.register);

// Login routes
router.get('/login', authController.showLogin);
router.post('/login', [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
], authController.login);

// Logout route
router.post('/logout', authController.logout);
router.get('/logout', authController.logout); // Support GET for logout links

// Profile routes (these might need requireAuth instead of optionalAuth)
router.get('/profile', authController.showProfile);
router.post('/profile', [
  body('username')
    .optional()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3-30 characters'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email')
], authController.updateProfile);

// Password reset routes
router.get('/forgot-password', authController.showForgotPassword);
router.post('/forgot-password', [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
], authController.forgotPassword);

router.get('/reset-password/:token', authController.showResetPassword);
router.post('/reset-password/:token', [
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    })
], authController.resetPassword);

module.exports = router;