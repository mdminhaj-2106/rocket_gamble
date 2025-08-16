// routes/game.js - Fixed to use correct middleware

const express = require('express');
const router = express.Router();
const gameController = require('../controllers/gameController');
const { requireAuth } = require('../middleware/auth');

// Apply auth middleware to all game routes
router.use(requireAuth);

// Landing page
router.get('/landing', gameController.showLanding);

// Round 1 routes
router.get('/round1', gameController.showRound1);
router.post('/round1/bet', gameController.placeBetRound1);

// Round 2 routes
router.get('/round2', gameController.showRound2);
router.post('/round2/bet', gameController.placeBetRound2);

// Round 3 routes
router.get('/round3', gameController.showRound3);
router.post('/round3/bet', gameController.placeBetRound3);

// Leaderboard and winners
router.get('/leaderboard', gameController.showLeaderboard);
router.get('/winners', gameController.showWinners);

// API endpoints
router.get('/api/leaderboard', gameController.getLeaderboardData);

// Advance round
router.post('/advance', gameController.advanceRound);

module.exports = router;