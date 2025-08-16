const User = require('../models/User');
const Bet = require('../models/Bet');
const Round = require('../models/Round');
const { validationResult } = require('express-validator');

const gameController = {
  // Landing page
  showLanding: async (req, res) => {
    try {
      const user = await User.findById(req.session.userId);
      if (!user) {
        return res.redirect('/auth/login');
      }
      
      // Get current round info
      const currentRound = await Round.findOne({ roundNumber: user.currentRound });
      const leaderboard = await User.getLeaderboard();
      const userRank = leaderboard.findIndex(u => u._id.toString() === user._id.toString()) + 1;
      
      res.render('game/landing', {
        title: `Welcome ${user.name}!`,
        user,
        currentRound,
        userRank,
        totalPlayers: leaderboard.length,
        userName: user.name,
        userCredits: user.credits
      });
    } catch (error) {
      console.error('Landing error:', error);
      res.redirect('/auth/login');
    }
  },

  // Round 1: Rocket Distance Gamble
  showRound1: async (req, res) => {
    try {
      const user = await User.findById(req.session.userId);
      if (!user || user.currentRound !== 1) {
        return res.redirect('/game/landing');
      }
      
      // Check if user already bet in this round
      const existingBet = user.bets.find(bet => bet.round === 1 && bet.result === 'pending');
      if (existingBet) {
        return res.redirect('/game/leaderboard');
      }
      
      const rockets = [
        { id: 1, name: 'Thunder Bolt', icon: 'fas fa-rocket', description: 'Speed focused rocket' },
        { id: 2, name: 'Sky Piercer', icon: 'fas fa-rocket', description: 'High altitude specialist' },
        { id: 3, name: 'Star Chaser', icon: 'fas fa-rocket', description: 'Long range cruiser' },
        { id: 4, name: 'Fire Storm', icon: 'fas fa-rocket', description: 'Power packed beast' },
        { id: 5, name: 'Wind Rider', icon: 'fas fa-rocket', description: 'Lightweight speedster' }
      ];
      
      res.render('game/round1', {
        title: 'Round 1 - Rocket Distance Gamble',
        user,
        rockets,
        userName: user.name,
        userCredits: user.credits,
        scripts: ['/js/game.js']
      });
    } catch (error) {
      console.error('Round 1 error:', error);
      res.redirect('/game/landing');
    }
  },

  // Handle Round 1 bet
  placeBetRound1: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg });
      }

      const user = await User.findById(req.session.userId);
      const { rocketId, betAmount } = req.body;

      // Validation
      if (!user || user.currentRound !== 1) {
        return res.status(400).json({ error: 'Invalid round access' });
      }

      if (betAmount > user.credits) {
        return res.status(400).json({ error: 'Insufficient credits' });
      }

      if (betAmount < 10 || betAmount > 500) {
        return res.status(400).json({ error: 'Bet must be between 10-500 credits' });
      }

      // Place bet
      await user.placeBet(1, betAmount, rocketId);
      
      // Create bet record
      const bet = new Bet({
        userId: user._id,
        round: 1,
        amount: betAmount,
        choice: rocketId
      });
      await bet.save();

      // Emit real-time update
      req.io.emit('bet-placed', {
        userId: user._id,
        userName: user.name,
        round: 1,
        amount: betAmount,
        choice: rocketId
      });

      res.json({ success: true, remainingCredits: user.credits });
    } catch (error) {
      console.error('Round 1 bet error:', error);
      res.status(500).json({ error: 'Failed to place bet' });
    }
  },

  // Round 2: Projectile Range Prediction
  showRound2: async (req, res) => {
    try {
      const user = await User.findById(req.session.userId);
      if (!user || user.currentRound !== 2) {
        return res.redirect('/game/landing');
      }
      
      const existingBet = user.bets.find(bet => bet.round === 2 && bet.result === 'pending');
      if (existingBet) {
        return res.redirect('/game/leaderboard');
      }
      
      res.render('game/round2', {
        title: 'Round 2 - Range Prediction',
        user,
        userName: user.name,
        userCredits: user.credits,
        scripts: ['/js/game.js']
      });
    } catch (error) {
      console.error('Round 2 error:', error);
      res.redirect('/game/landing');
    }
  },

  // Handle Round 2 bet
  placeBetRound2: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg });
      }

      const user = await User.findById(req.session.userId);
      const { rangeGuess, betAmount } = req.body;

      if (!user || user.currentRound !== 2) {
        return res.status(400).json({ error: 'Invalid round access' });
      }

      if (betAmount > user.credits || betAmount < 10 || betAmount > 500) {
        return res.status(400).json({ error: 'Invalid bet amount' });
      }

      if (rangeGuess < 0 || rangeGuess > 1000) {
        return res.status(400).json({ error: 'Range must be between 0-1000 meters' });
      }

      await user.placeBet(2, betAmount, rangeGuess);
      
      const bet = new Bet({
        userId: user._id,
        round: 2,
        amount: betAmount,
        choice: rangeGuess
      });
      await bet.save();

      req.io.emit('bet-placed', {
        userId: user._id,
        userName: user.name,
        round: 2,
        amount: betAmount,
        choice: rangeGuess
      });

      res.json({ success: true, remainingCredits: user.credits });
    } catch (error) {
      console.error('Round 2 bet error:', error);
      res.status(500).json({ error: 'Failed to place bet' });
    }
  },

  // Round 3: Dog Fights
  showRound3: async (req, res) => {
    try {
      const user = await User.findById(req.session.userId);
      if (!user || user.currentRound !== 3) {
        return res.redirect('/game/landing');
      }

      // Get current sub-round
      const currentSubRound = user.bets.filter(bet => bet.round === 3).length + 1;
      
      if (currentSubRound > 20) {
        return res.redirect('/game/leaderboard');
      }

      // Generate dog fight matchup
      const fighters = [
        'German Shepherd', 'Rottweiler', 'Pitbull', 'Doberman', 'Bulldog',
        'Mastiff', 'Husky', 'Wolf', 'Great Dane', 'Belgian Malinois',
        'Cane Corso', 'American Bully', 'Staffordshire Terrier', 'Boxer',
        'Akita', 'Rhodesian Ridgeback', 'Dogo Argentino', 'Bull Terrier'
      ];

      const fighterA = fighters[Math.floor(Math.random() * fighters.length)];
      let fighterB = fighters[Math.floor(Math.random() * fighters.length)];
      while (fighterB === fighterA) {
        fighterB = fighters[Math.floor(Math.random() * fighters.length)];
      }

      res.render('game/round3', {
        title: `Round 3 - Fight ${currentSubRound}/20`,
        user,
        currentSubRound,
        totalSubRounds: 20,
        fighterA,
        fighterB,
        userName: user.name,
        userCredits: user.credits,
        scripts: ['/js/game.js']
      });
    } catch (error) {
      console.error('Round 3 error:', error);
      res.redirect('/game/landing');
    }
  },

  // Handle Round 3 bet
  placeBetRound3: async (req, res) => {
    try {
      const user = await User.findById(req.session.userId);
      const { fighter, betAmount } = req.body;
      const currentSubRound = user.bets.filter(bet => bet.round === 3).length + 1;

      if (!user || user.currentRound !== 3) {
        return res.status(400).json({ error: 'Invalid round access' });
      }

      if (currentSubRound > 20) {
        return res.status(400).json({ error: 'All fights completed' });
      }

      if (betAmount > user.credits || betAmount < 10 || betAmount > 200) {
        return res.status(400).json({ error: 'Invalid bet amount for Round 3' });
      }

      await user.placeBet(3, betAmount, fighter, currentSubRound);
      
      const bet = new Bet({
        userId: user._id,
        round: 3,
        subRound: currentSubRound,
        amount: betAmount,
        choice: fighter
      });
      await bet.save();

      req.io.emit('bet-placed', {
        userId: user._id,
        userName: user.name,
        round: 3,
        subRound: currentSubRound,
        amount: betAmount,
        choice: fighter
      });

      res.json({ 
        success: true, 
        remainingCredits: user.credits,
        nextSubRound: currentSubRound + 1,
        isLastFight: currentSubRound === 20
      });
    } catch (error) {
      console.error('Round 3 bet error:', error);
      res.status(500).json({ error: 'Failed to place bet' });
    }
  },

  // Leaderboard
  showLeaderboard: async (req, res) => {
    try {
      const user = await User.findById(req.session.userId);
      if (!user) {
        return res.redirect('/auth/login');
      }

      const leaderboard = await User.find({ isActive: true })
        .sort({ credits: -1 })
        .select('name credits totalWinnings currentRound')
        .limit(50);

      const currentRound = user.currentRound;
      const userRank = leaderboard.findIndex(u => u._id.toString() === user._id.toString()) + 1;

      // Get round statistics
      const roundStats = await Bet.getRoundStats(currentRound);
      
      res.render('game/leaderboard', {
        title: `Round ${currentRound} Leaderboard`,
        user,
        leaderboard,
        userRank,
        currentRound,
        roundStats,
        userName: user.name,
        userCredits: user.credits,
        scripts: ['/js/game.js']
      });
    } catch (error) {
      console.error('Leaderboard error:', error);
      res.redirect('/game/landing');
    }
  },

  // Final Winners
  showWinners: async (req, res) => {
    try {
      const winners = await User.find({ isActive: true })
        .sort({ credits: -1 })
        .select('name credits totalWinnings')
        .limit(7);

      res.render('game/winners', {
        title: 'Final Winners',
        winners,
        scripts: ['/js/game.js']
      });
    } catch (error) {
      console.error('Winners error:', error);
      res.redirect('/game/landing');
    }
  },

  // Advance to next round
  advanceRound: async (req, res) => {
    try {
      const user = await User.findById(req.session.userId);
      if (!user) {
        return res.status(400).json({ error: 'User not found' });
      }

      if (user.currentRound < 3) {
        user.currentRound += 1;
        await user.save();
      }

      res.json({ success: true, currentRound: user.currentRound });
    } catch (error) {
      console.error('Advance round error:', error);
      res.status(500).json({ error: 'Failed to advance round' });
    }
  }
};

module.exports = gameController;
