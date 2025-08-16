const express = require('express');
const router = express.Router();
const gameController = require('../controllers/gameController');
const { requireAuth } = require('../middleware/auth'); // Destructured import
const { body } = require('express-validator');

// Apply auth middleware to all game routes
router.use(requireAuth); // Now using the destructured middleware function

// Landing page
router.get('/landing', gameController.showLanding);

// Round 1 routes
router.get('/round1', gameController.showRound1);
router.post('/round1/bet', [
  body('rocketId').isInt({ min: 1, max: 5 }).withMessage('Invalid rocket selection'),
  body('betAmount').isInt({ min: 10, max: 500 }).withMessage('Bet must be between 10-500 credits')
], gameController.placeBetRound1);

// Round 2 routes
router.get('/round2', gameController.showRound2);
router.post('/round2/bet', [
  body('rangeGuess').isInt({ min: 0, max: 1000 }).withMessage('Range must be between 0-1000 meters'),
  body('betAmount').isInt({ min: 10, max: 500 }).withMessage('Bet must be between 10-500 credits')
], gameController.placeBetRound2);

// Round 3 routes
router.get('/round3', gameController.showRound3);
router.post('/round3/bet', [
  body('fighter').isLength({ min: 1, max: 50 }).withMessage('Invalid fighter selection'),
  body('betAmount').isInt({ min: 10, max: 200 }).withMessage('Bet must be between 10-200 credits for Round 3')
], gameController.placeBetRound3);

// Leaderboard and winners
router.get('/leaderboard', gameController.showLeaderboard);
router.get('/winners', gameController.showWinners);

// API endpoints
router.get('/api/leaderboard', gameController.getLeaderboardData);

// Advance round
router.post('/advance', gameController.advanceRound);

module.exports = router;