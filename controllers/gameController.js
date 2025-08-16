// controllers/gameController.js - Fixed to work with session auth

const User = require('../models/User');
const Bet = require('../models/Bet');
const Round = require('../models/Round');

const gameController = {
  // Landing page
  showLanding: async (req, res) => {
    try {
      // User is already attached by middleware
      const user = req.user;
      
      res.render('game/landing', {
        title: `Welcome ${user.name}!`,
        user,
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
      const user = req.user;
      
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
        userCredits: user.credits
      });
    } catch (error) {
      console.error('Round 1 error:', error);
      res.redirect('/game/landing');
    }
  },

  // Handle Round 1 bet
  placeBetRound1: async (req, res) => {
    try {
      const user = await User.findById(req.user._id); // Get fresh user data
      const { rocketId, betAmount } = req.body;

      // Validation
      if (betAmount > user.credits) {
        return res.status(400).json({ error: 'Insufficient credits' });
      }

      if (betAmount < 10 || betAmount > 500) {
        return res.status(400).json({ error: 'Bet must be between 10-500 credits' });
      }

      // Deduct credits
      user.credits -= parseInt(betAmount);
      await user.save();

      // Update session credits
      req.session.userCredits = user.credits;
      
      // Create bet record (if Bet model exists)
      try {
        const bet = new Bet({
          userId: user._id,
          round: 1,
          amount: parseInt(betAmount),
          choice: rocketId
        });
        await bet.save();
      } catch (betError) {
        console.log('Bet model not available, skipping bet record');
      }

      // Emit real-time update if socket available
      if (req.io) {
        req.io.emit('bet-placed', {
          userId: user._id,
          userName: user.name,
          round: 1,
          amount: betAmount,
          choice: rocketId
        });
      }

      res.json({ success: true, remainingCredits: user.credits });
    } catch (error) {
      console.error('Round 1 bet error:', error);
      res.status(500).json({ error: 'Failed to place bet' });
    }
  },

  // Round 2: Range Prediction
  showRound2: async (req, res) => {
    try {
      const user = req.user;
      
      res.render('game/round2', {
        title: 'Round 2 - Range Prediction',
        user,
        userName: user.name,
        userCredits: user.credits
      });
    } catch (error) {
      console.error('Round 2 error:', error);
      res.redirect('/game/landing');
    }
  },

  // Handle Round 2 bet
  placeBetRound2: async (req, res) => {
    try {
      const user = await User.findById(req.user._id);
      const { rangeGuess, betAmount } = req.body;

      if (betAmount > user.credits || betAmount < 10 || betAmount > 500) {
        return res.status(400).json({ error: 'Invalid bet amount' });
      }

      if (rangeGuess < 0 || rangeGuess > 1000) {
        return res.status(400).json({ error: 'Range must be between 0-1000 meters' });
      }

      user.credits -= parseInt(betAmount);
      await user.save();
      
      try {
        const bet = new Bet({
          userId: user._id,
          round: 2,
          amount: parseInt(betAmount),
          choice: rangeGuess
        });
        await bet.save();
      } catch (betError) {
        console.log('Bet model not available, skipping bet record');
      }

      if (req.io) {
        req.io.emit('bet-placed', {
          userId: user._id,
          userName: user.name,
          round: 2,
          amount: betAmount,
          choice: rangeGuess
        });
      }

      res.json({ success: true, remainingCredits: user.credits });
    } catch (error) {
      console.error('Round 2 bet error:', error);
      res.status(500).json({ error: 'Failed to place bet' });
    }
  },

  // Round 3: Dog Fights
  showRound3: async (req, res) => {
    try {
      const user = req.user;

      // Generate random fighters
      const fighters = [
        'German Shepherd', 'Rottweiler', 'Pitbull', 'Doberman', 'Bulldog',
        'Mastiff', 'Husky', 'Wolf', 'Great Dane', 'Belgian Malinois'
      ];

      const fighterA = fighters[Math.floor(Math.random() * fighters.length)];
      let fighterB = fighters[Math.floor(Math.random() * fighters.length)];
      while (fighterB === fighterA) {
        fighterB = fighters[Math.floor(Math.random() * fighters.length)];
      }

      res.render('game/round3', {
        title: 'Round 3 - Dog Fights',
        user,
        currentSubRound: 1,
        totalSubRounds: 20,
        fighterA,
        fighterB,
        userName: user.name,
        userCredits: user.credits
      });
    } catch (error) {
      console.error('Round 3 error:', error);
      res.redirect('/game/landing');
    }
  },

  // Handle Round 3 bet
  placeBetRound3: async (req, res) => {
    try {
      const user = await User.findById(req.user._id);
      const { fighter, betAmount } = req.body;

      if (betAmount > user.credits || betAmount < 10 || betAmount > 200) {
        return res.status(400).json({ error: 'Invalid bet amount for Round 3' });
      }

      user.credits -= parseInt(betAmount);
      await user.save();
      
      try {
        const bet = new Bet({
          userId: user._id,
          round: 3,
          subRound: 1,
          amount: parseInt(betAmount),
          choice: fighter
        });
        await bet.save();
      } catch (betError) {
        console.log('Bet model not available, skipping bet record');
      }

      if (req.io) {
        req.io.emit('bet-placed', {
          userId: user._id,
          userName: user.name,
          round: 3,
          subRound: 1,
          amount: betAmount,
          choice: fighter
        });
      }

      res.json({ 
        success: true, 
        remainingCredits: user.credits,
        nextSubRound: 2,
        isLastFight: false
      });
    } catch (error) {
      console.error('Round 3 bet error:', error);
      res.status(500).json({ error: 'Failed to place bet' });
    }
  },

  // Leaderboard
  showLeaderboard: async (req, res) => {
    try {
      const user = req.user;

      // Get all active users sorted by credits
      const leaderboard = await User.find({ isActive: true })
        .sort({ credits: -1 })
        .select('name credits totalWinnings currentRound')
        .limit(50);

      const userRank = leaderboard.findIndex(u => u._id.toString() === user._id.toString()) + 1;

      res.render('game/leaderboard', {
        title: 'Leaderboard',
        user,
        leaderboard,
        userRank,
        currentRound: user.currentRound,
        userName: user.name,
        userCredits: user.credits
      });
    } catch (error) {
      console.error('Leaderboard error:', error);
      res.redirect('/game/landing');
    }
  },

  // Winners page
  showWinners: async (req, res) => {
    try {
      const winners = await User.find({ isActive: true })
        .sort({ credits: -1 })
        .select('name credits totalWinnings')
        .limit(10);

      res.render('game/winners', {
        title: 'Final Winners',
        winners,
        userName: req.user.name,
        userCredits: req.user.credits
      });
    } catch (error) {
      console.error('Winners error:', error);
      res.redirect('/game/landing');
    }
  },

  // API endpoint for leaderboard data
  getLeaderboardData: async (req, res) => {
    try {
      const leaderboard = await User.find({ isActive: true })
        .sort({ credits: -1 })
        .select('name credits totalWinnings currentRound')
        .limit(50);

      const leaderboardWithRanks = leaderboard.map((user, index) => ({
        id: user._id,
        name: user.name,
        credits: user.credits,
        totalWinnings: user.totalWinnings || 0,
        currentRound: user.currentRound || 1,
        isCurrentUser: user._id.toString() === req.user._id.toString()
      }));

      res.json({
        success: true,
        leaderboard: leaderboardWithRanks,
        totalPlayers: leaderboard.length
      });
    } catch (error) {
      console.error('Leaderboard API error:', error);
      res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
  },

  // Advance round
  advanceRound: async (req, res) => {
    try {
      const user = await User.findById(req.user._id);
      
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