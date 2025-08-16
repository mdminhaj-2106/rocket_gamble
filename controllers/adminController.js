const User = require('../models/User');
const Bet = require('../models/Bet');
const Round = require('../models/Round');
const bcrypt = require('bcryptjs');

const adminController = {
  // Show admin login
  showAdminLogin: (req, res) => {
    if (req.session.isAdmin) {
      return res.redirect('/admin/dashboard');
    }
    res.render('admin/login', { 
      title: 'Admin Login',
      error: null 
    });
  },

  // Handle admin login
  adminLogin: async (req, res) => {
    try {
      const { password } = req.body;
      const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
      
      if (password === adminPassword) {
        req.session.isAdmin = true;
        res.redirect('/admin/dashboard');
      } else {
        res.render('admin/login', {
          title: 'Admin Login',
          error: 'Invalid password'
        });
      }
    } catch (error) {
      console.error('Admin login error:', error);
      res.render('admin/login', {
        title: 'Admin Login',
        error: 'Login failed'
      });
    }
  },

  // Admin dashboard
  showDashboard: async (req, res) => {
    try {
      const totalUsers = await User.countDocuments({ isActive: true });
      const totalBets = await Bet.countDocuments();
      
      // Get users by round
      const usersByRound = await User.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$currentRound', count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]);

      // Get recent bets
      const recentBets = await Bet.find()
        .populate('userId', 'name')
        .sort({ createdAt: -1 })
        .limit(20);

      // Get top players
      const topPlayers = await User.find({ isActive: true })
        .sort({ credits: -1 })
        .limit(10)
        .select('name credits currentRound totalWinnings');

      res.render('admin/dashboard', {
        title: 'Admin Dashboard',
        totalUsers,
        totalBets,
        usersByRound,
        recentBets,
        topPlayers,
        scripts: ['/js/admin.js']
      });
    } catch (error) {
      console.error('Dashboard error:', error);
      res.render('admin/dashboard', {
        title: 'Admin Dashboard',
        error: 'Failed to load dashboard data'
      });
    }
  },

  // Results management
  showResults: async (req, res) => {
    try {
      const rounds = await Round.find().sort({ roundNumber: 1 });
      
      res.render('admin/results', {
        title: 'Manage Results',
        rounds,
        scripts: ['/js/admin.js']
      });
    } catch (error) {
      console.error('Results error:', error);
      res.render('admin/results', {
        title: 'Manage Results',
        error: 'Failed to load results'
      });
    }
  },

  // Set Round 1 result
  setRound1Result: async (req, res) => {
    try {
      const { winningRocket } = req.body;
      
      if (!winningRocket || winningRocket < 1 || winningRocket > 5) {
        return res.status(400).json({ error: 'Invalid rocket selection' });
      }

      // Process results
      const result = await Bet.processRoundResults(1, winningRocket);
      
      // Update round
      const round = await Round.findOneAndUpdate(
        { roundNumber: 1 },
        { 
          $push: { results: { correctAnswer: winningRocket } },
          isCompleted: true 
        },
        { new: true }
      );

      // Emit real-time update
      req.io.emit('round-completed', {
        round: 1,
        result: winningRocket,
        winners: result.winners,
        losers: result.losers
      });

      res.json({ 
        success: true, 
        message: `Round 1 completed. ${result.winners} winners, ${result.losers} losers.`
      });
    } catch (error) {
      console.error('Round 1 result error:', error);
      res.status(500).json({ error: 'Failed to set result' });
    }
  },

  // Set Round 2 result
  setRound2Result: async (req, res) => {
    try {
      const { actualRange } = req.body;
      
      if (actualRange < 0 || actualRange > 1000) {
        return res.status(400).json({ error: 'Range must be between 0-1000 meters' });
      }

      const result = await Bet.processRoundResults(2, actualRange);
      
      const round = await Round.findOneAndUpdate(
        { roundNumber: 2 },
        { 
          $push: { results: { correctAnswer: actualRange } },
          isCompleted: true 
        },
        { new: true }
      );

      req.io.emit('round-completed', {
        round: 2,
        result: actualRange,
        winners: result.winners,
        losers: result.losers
      });

      res.json({ 
        success: true, 
        message: `Round 2 completed. ${result.winners} winners, ${result.losers} losers.`
      });
    } catch (error) {
      console.error('Round 2 result error:', error);
      res.status(500).json({ error: 'Failed to set result' });
    }
  },

  // Set Round 3 results (multiple sub-rounds)
  setRound3Results: async (req, res) => {
    try {
      const { fightResults } = req.body; // Array of 20 results
      
      if (!Array.isArray(fightResults) || fightResults.length !== 20) {
        return res.status(400).json({ error: 'Must provide exactly 20 fight results' });
      }

      let totalWinners = 0;
      let totalLosers = 0;

      // Process each sub-round
      for (let i = 0; i < 20; i++) {
        const result = await Bet.processRoundResults(3, fightResults[i], i + 1);
        totalWinners += result.winners;
        totalLosers += result.losers;
      }

      const round = await Round.findOneAndUpdate(
        { roundNumber: 3 },
        { 
          results: fightResults.map((result, index) => ({
            subRound: index + 1,
            correctAnswer: result
          })),
          isCompleted: true 
        },
        { new: true }
      );

      req.io.emit('round-completed', {
        round: 3,
        results: fightResults,
        winners: totalWinners,
        losers: totalLosers
      });

      res.json({ 
        success: true, 
        message: `Round 3 completed. ${totalWinners} total winners, ${totalLosers} total losers.`
      });
    } catch (error) {
      console.error('Round 3 result error:', error);
      res.status(500).json({ error: 'Failed to set results' });
    }
  },

  // User management
  getUsers: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = 20;
      
      const users = await User.find({ isActive: true })
        .sort({ credits: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select('name credits currentRound ipAddress totalWinnings createdAt');
      
      const total = await User.countDocuments({ isActive: true });
      
      res.json({
        users,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          total
        }
      });
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  },

  // Edit user credits
  editUserCredits: async (req, res) => {
    try {
      const { userId, newCredits } = req.body;
      
      if (newCredits < 0) {
        return res.status(400).json({ error: 'Credits cannot be negative' });
      }

      const user = await User.findByIdAndUpdate(
        userId,
        { credits: newCredits },
        { new: true }
      );

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      req.io.emit('credits-updated', {
        userId: user._id,
        newCredits: user.credits
      });

      res.json({ success: true, user: { name: user.name, credits: user.credits } });
    } catch (error) {
      console.error('Edit credits error:', error);
      res.status(500).json({ error: 'Failed to update credits' });
    }
  },

  // Reset game
  resetGame: async (req, res) => {
    try {
      // Reset all users
      await User.updateMany({}, {
        credits: 1000,
        currentRound: 1,
        totalWinnings: 0,
        bets: []
      });

      // Clear all bets
      await Bet.deleteMany({});

      // Reset rounds
      await Round.updateMany({}, {
        isActive: false,
        isCompleted: false,
        results: []
      });

      req.io.emit('game-reset');

      res.json({ success: true, message: 'Game reset successfully' });
    } catch (error) {
      console.error('Reset game error:', error);
      res.status(500).json({ error: 'Failed to reset game' });
    }
  },

  // Logout admin
  adminLogout: (req, res) => {
    req.session.isAdmin = false;
    res.redirect('/admin/login');
  }
};

module.exports = adminController;
