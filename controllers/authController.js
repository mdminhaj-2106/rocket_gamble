// controllers/authController.js - Fixed to work with simple session auth

const User = require('../models/User');
const { validationResult } = require('express-validator');

const authController = {
  // Show login page
  showLogin: (req, res) => {
    try {
      // If user is already logged in, redirect to game
      if (req.session && req.session.userId) {
        return res.redirect('/game/landing');
      }
      
      res.render('auth/login', { 
        title: 'Login - Rocket Betting Game',
        error: req.query.error || null 
      });
    } catch (error) {
      console.error('Show login error:', error);
      res.status(500).send('Server error');
    }
  },

  // Handle login (simplified version for name-only login)
  login: async (req, res) => {
    try {
      const { name } = req.body;
      
      // Basic validation
      if (!name || name.trim().length < 2) {
        return res.render('auth/login', {
          title: 'Login - Rocket Betting Game',
          error: 'Name must be at least 2 characters long'
        });
      }

      if (name.length > 50) {
        return res.render('auth/login', {
          title: 'Login - Rocket Betting Game', 
          error: 'Name must be less than 50 characters'
        });
      }

      // Check for valid characters
      const allowedPattern = /^[a-zA-Z0-9\s]+$/;
      if (!allowedPattern.test(name)) {
        return res.render('auth/login', {
          title: 'Login - Rocket Betting Game',
          error: 'Name can only contain letters, numbers, and spaces'
        });
      }

      const ipAddress = req.ip || req.connection.remoteAddress;
      
      // Check if user already exists
      let user = await User.findOne({ name: name.trim() });
      
      if (!user) {
        // Create new user
        user = new User({
          name: name.trim(),
          username: name.trim(), // For compatibility with existing model
          email: `${name.trim().replace(/\s+/g, '')}@temp.com`, // Temp email
          ipAddress,
          credits: 1000,
          currentRound: 1,
          isActive: true
        });
        await user.save();
        console.log('New user created:', user.name);
      } else {
        // Check IP restriction (one user per IP)
        if (user.ipAddress !== ipAddress && user.isActive) {
          return res.render('auth/login', {
            title: 'Login - Rocket Betting Game',
            error: 'This name is already taken by an active player'
          });
        }
        
        // Reactivate existing user
        user.isActive = true;
        user.ipAddress = ipAddress;
        await user.save();
        console.log('User reactivated:', user.name);
      }

      // Set session
      req.session.userId = user._id;
      req.session.userName = user.name;
      
      console.log('User logged in:', user.name);
      res.redirect('/game/landing');
      
    } catch (error) {
      console.error('Login error:', error);
      res.render('auth/login', {
        title: 'Login - Rocket Betting Game',
        error: 'Server error. Please try again.'
      });
    }
  },

  // Handle logout
  logout: async (req, res) => {
    try {
      // Mark user as inactive if they exist
      if (req.session.userId) {
        await User.findByIdAndUpdate(req.session.userId, { 
          isActive: false 
        }).catch(console.error);
      }
      
      // Destroy session
      req.session.destroy((err) => {
        if (err) {
          console.error('Session destroy error:', err);
        }
        res.redirect('/auth/login');
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.redirect('/auth/login');
    }
  },

  // Show profile (if needed)
  showProfile: async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.redirect('/auth/login');
      }

      const user = await User.findById(req.session.userId);
      if (!user) {
        return res.redirect('/auth/login');
      }
      
      res.render('auth/profile', {
        title: 'Your Profile',
        user,
        userName: user.name,
        userCredits: user.credits
      });
      
    } catch (error) {
      console.error('Profile error:', error);
      res.redirect('/auth/login');
    }
  },

  // For compatibility with existing code
  processLogin: async (req, res) => {
    return authController.login(req, res);
  },

  // Simple registration (name-only)
  register: async (req, res) => {
    return authController.login(req, res); // Same as login for this simple system
  },

  // Show registration page
  showRegister: (req, res) => {
    res.redirect('/auth/login'); // Redirect to login since we only use names
  }
};

module.exports = authController;