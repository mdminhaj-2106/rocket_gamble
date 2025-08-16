const User = require('../models/User');
const { validationResult } = require('express-validator');

const authController = {
  // Show registration page
  showRegister: (req, res) => {
    if (req.session.userId) {
      return res.redirect('/game/landing');
    }
    res.render('auth/register', { 
      title: 'Register for Rocket Betting Game',
      error: null 
    });
  },

  // Handle registration
  register: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.render('auth/register', {
          title: 'Register for Rocket Betting Game',
          error: errors.array()[0].msg
        });
      }

      const { username, email, password } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;
      
      // Check if user already exists
      const existingUser = await User.findOne({ 
        $or: [{ email }, { username }] 
      });
      
      if (existingUser) {
        return res.render('auth/register', {
          title: 'Register for Rocket Betting Game',
          error: 'User with this email or username already exists'
        });
      }

      // Create new user
      const user = new User({
        username: username.trim(),
        email: email.toLowerCase().trim(),
        password, // This should be hashed in the User model
        ipAddress,
        credits: 1000,
        currentRound: 1
      });
      await user.save();
      
      // Set session
      req.session.userId = user._id;
      req.session.userName = user.username;
      
      // Emit user joined event if socket available
      if (req.io) {
        req.io.emit('user-joined', {
          id: user._id,
          name: user.username,
          credits: user.credits
        });
      }
      
      res.redirect('/game/landing');
      
    } catch (error) {
      console.error('Registration error:', error);
      res.render('auth/register', {
        title: 'Register for Rocket Betting Game',
        error: 'Something went wrong. Please try again.'
      });
    }
  },

  // Show login page
  showLogin: (req, res) => {
    if (req.session.userId) {
      return res.redirect('/game/landing');
    }
    res.render('auth/login', { 
      title: 'Join the Rocket Betting Game',
      error: null 
    });
  },

  // Handle login
  login: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.render('auth/login', {
          title: 'Join the Rocket Betting Game',
          error: errors.array()[0].msg
        });
      }

      const { email, password } = req.body;
      
      // Find user by email
      const user = await User.findOne({ email: email.toLowerCase().trim() });
      
      if (!user) {
        return res.render('auth/login', {
          title: 'Join the Rocket Betting Game',
          error: 'Invalid email or password'
        });
      }

      // Check password (assuming you have a comparePassword method in User model)
      const isValidPassword = await user.comparePassword(password);
      if (!isValidPassword) {
        return res.render('auth/login', {
          title: 'Join the Rocket Betting Game',
          error: 'Invalid email or password'
        });
      }
      
      // Set session
      req.session.userId = user._id;
      req.session.userName = user.username;
      
      // Emit user joined event if socket available
      if (req.io) {
        req.io.emit('user-joined', {
          id: user._id,
          name: user.username,
          credits: user.credits
        });
      }
      
      res.redirect('/game/landing');
      
    } catch (error) {
      console.error('Login error:', error);
      res.render('auth/login', {
        title: 'Join the Rocket Betting Game',
        error: 'Something went wrong. Please try again.'
      });
    }
  },

  // Handle logout
  logout: (req, res) => {
    const userId = req.session.userId;
    
    req.session.destroy((err) => {
      if (err) {
        console.error('Logout error:', err);
      }
      
      // Emit user left event if socket available
      if (req.io && userId) {
        req.io.emit('user-left', { userId });
      }
      
      res.redirect('/');
    });
  },

  // Show profile page
  showProfile: async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.redirect('/auth/login');
      }

      const user = await User.findById(req.session.userId)
        .select('username email credits currentRound totalWinnings gamesPlayed bets');
      
      if (!user) {
        return res.redirect('/auth/login');
      }
      
      res.render('auth/profile', {
        title: 'Your Profile',
        user,
        userName: user.username,
        userCredits: user.credits
      });
      
    } catch (error) {
      console.error('Profile error:', error);
      res.redirect('/auth/login');
    }
  },

  // Update profile
  updateProfile: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const user = await User.findById(req.session.userId);
        return res.render('auth/profile', {
          title: 'Your Profile',
          user,
          error: errors.array()[0].msg
        });
      }

      if (!req.session.userId) {
        return res.redirect('/auth/login');
      }

      const { username, email } = req.body;
      const updateData = {};

      if (username) updateData.username = username.trim();
      if (email) updateData.email = email.toLowerCase().trim();

      // Check if email/username already taken by another user
      if (email || username) {
        const existingUser = await User.findOne({
          $and: [
            { _id: { $ne: req.session.userId } },
            {
              $or: [
                email ? { email: updateData.email } : {},
                username ? { username: updateData.username } : {}
              ]
            }
          ]
        });

        if (existingUser) {
          const user = await User.findById(req.session.userId);
          return res.render('auth/profile', {
            title: 'Your Profile',
            user,
            error: 'Email or username already taken'
          });
        }
      }

      const user = await User.findByIdAndUpdate(
        req.session.userId,
        updateData,
        { new: true }
      );

      if (username) {
        req.session.userName = user.username;
      }

      res.render('auth/profile', {
        title: 'Your Profile',
        user,
        success: 'Profile updated successfully',
        userName: user.username,
        userCredits: user.credits
      });

    } catch (error) {
      console.error('Update profile error:', error);
      const user = await User.findById(req.session.userId);
      res.render('auth/profile', {
        title: 'Your Profile',
        user,
        error: 'Failed to update profile'
      });
    }
  },

  // Show forgot password page
  showForgotPassword: (req, res) => {
    res.render('auth/forgot-password', {
      title: 'Forgot Password',
      error: null,
      success: null
    });
  },

  // Handle forgot password
  forgotPassword: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.render('auth/forgot-password', {
          title: 'Forgot Password',
          error: errors.array()[0].msg,
          success: null
        });
      }

      const { email } = req.body;
      const user = await User.findOne({ email: email.toLowerCase().trim() });

      // Always show success message for security reasons
      res.render('auth/forgot-password', {
        title: 'Forgot Password',
        error: null,
        success: 'If an account with that email exists, we\'ve sent a password reset link.'
      });

      // TODO: Implement actual email sending logic here
      if (user) {
        // Generate reset token and send email
        console.log(`Password reset requested for user: ${user.email}`);
        // You would implement actual email sending here
      }

    } catch (error) {
      console.error('Forgot password error:', error);
      res.render('auth/forgot-password', {
        title: 'Forgot Password',
        error: 'Something went wrong. Please try again.',
        success: null
      });
    }
  },

  // Show reset password page
  showResetPassword: async (req, res) => {
    try {
      const { token } = req.params;
      
      // TODO: Verify token validity
      // For now, just show the form
      res.render('auth/reset-password', {
        title: 'Reset Password',
        token,
        error: null
      });

    } catch (error) {
      console.error('Show reset password error:', error);
      res.redirect('/auth/login');
    }
  },

  // Handle reset password
  resetPassword: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.render('auth/reset-password', {
          title: 'Reset Password',
          token: req.params.token,
          error: errors.array()[0].msg
        });
      }

      const { token } = req.params;
      const { password } = req.body;

      // TODO: Implement actual password reset logic
      // Find user by reset token, verify token validity, update password
      
      res.render('auth/login', {
        title: 'Login',
        success: 'Password reset successful. Please log in with your new password.'
      });

    } catch (error) {
      console.error('Reset password error:', error);
      res.render('auth/reset-password', {
        title: 'Reset Password',
        token: req.params.token,
        error: 'Failed to reset password. Please try again.'
      });
    }
  },

  // Get user profile data (API endpoint)
  getProfile: async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const user = await User.findById(req.session.userId)
        .select('username email credits currentRound totalWinnings gamesPlayed bets');
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json({
        username: user.username,
        email: user.email,
        credits: user.credits,
        currentRound: user.currentRound,
        totalWinnings: user.totalWinnings,
        gamesPlayed: user.gamesPlayed,
        recentBets: user.bets.slice(-10)
      });
      
    } catch (error) {
      console.error('Profile error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
};

module.exports = authController;