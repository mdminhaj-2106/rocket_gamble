const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { requireAdmin } = require('../middleware/auth');

// Admin login routes (no auth required)
router.get('/login', adminController.showAdminLogin);
router.post('/login', adminController.adminLogin);

// Protected admin routes
router.use(requireAdmin);

// Dashboard and management
router.get('/dashboard', adminController.showDashboard);
router.get('/results', adminController.showResults);

// Result setting
router.post('/results/round1', adminController.setRound1Result);
router.post('/results/round2', adminController.setRound2Result);
router.post('/results/round3', adminController.setRound3Results);

// User management
router.get('/users', adminController.getUsers);
router.post('/users/edit-credits', adminController.editUserCredits);

// Game management
router.post('/reset-game', adminController.resetGame);
router.get('/logout', adminController.adminLogout);

module.exports = router;
