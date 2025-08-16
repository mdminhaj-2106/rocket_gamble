const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  ipAddress: {
    type: String,
    required: true,
    unique: true
  },
  credits: {
    type: Number,
    default: 1000,
    min: 0
  },
  currentRound: {
    type: Number,
    default: 1,
    min: 1,
    max: 3
  },
  isActive: {
    type: Boolean,
    default: true
  },
  bets: [{
    round: Number,
    subRound: { type: Number, default: 1 },
    amount: Number,
    choice: mongoose.Schema.Types.Mixed,
    result: {
      type: String,
      enum: ['pending', 'won', 'lost'],
      default: 'pending'
    },
    timestamp: { type: Date, default: Date.now }
  }],
  totalWinnings: {
    type: Number,
    default: 0
  },
  gamesPlayed: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for faster queries
userSchema.index({ ipAddress: 1 });
userSchema.index({ credits: -1 });
userSchema.index({ isActive: 1 });

// Virtual for current bet in round
userSchema.virtual('currentBet').get(function() {
  return this.bets.find(bet => bet.round === this.currentRound && bet.result === 'pending');
});

// Method to place bet
userSchema.methods.placeBet = function(round, amount, choice, subRound = 1) {
  if (this.credits < amount) {
    throw new Error('Insufficient credits');
  }
  
  this.credits -= amount;
  this.bets.push({
    round,
    subRound,
    amount,
    choice,
    result: 'pending'
  });
  
  return this.save();
};

// Method to update bet result
userSchema.methods.updateBetResult = function(round, result, winAmount = 0, subRound = 1) {
  const bet = this.bets.find(b => b.round === round && b.subRound === subRound && b.result === 'pending');
  if (bet) {
    bet.result = result;
    if (result === 'won') {
      this.credits += winAmount;
      this.totalWinnings += winAmount;
    }
  }
  return this.save();
};

// Static method to get leaderboard
userSchema.statics.getLeaderboard = function() {
  return this.find({ isActive: true })
    .sort({ credits: -1 })
    .select('name credits totalWinnings currentRound')
    .limit(50);
};

module.exports = mongoose.model('User', userSchema);
