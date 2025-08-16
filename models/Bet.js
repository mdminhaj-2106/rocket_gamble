const mongoose = require('mongoose');

const betSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  round: {
    type: Number,
    required: true,
    min: 1,
    max: 3
  },
  subRound: {
    type: Number,
    default: 1
  },
  amount: {
    type: Number,
    required: true,
    min: 1
  },
  choice: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  result: {
    type: String,
    enum: ['pending', 'won', 'lost'],
    default: 'pending'
  },
  winAmount: {
    type: Number,
    default: 0
  },
  processed: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for faster queries
betSchema.index({ userId: 1, round: 1 });
betSchema.index({ round: 1, result: 1 });
betSchema.index({ processed: 1 });

// Static method to get round statistics
betSchema.statics.getRoundStats = function(round) {
  return this.aggregate([
    { $match: { round } },
    {
      $group: {
        _id: '$choice',
        totalBets: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        users: { $push: '$userId' }
      }
    },
    { $sort: { totalAmount: -1 } }
  ]);
};

// Static method to process round results
betSchema.statics.processRoundResults = async function(round, correctAnswer, subRound = 1) {
  const bets = await this.find({ 
    round, 
    subRound, 
    result: 'pending' 
  }).populate('userId');
  
  const winners = [];
  const losers = [];
  let totalLosingAmount = 0;
  
  // Categorize bets
  bets.forEach(bet => {
    if (this.isWinningChoice(bet.choice, correctAnswer, round)) {
      winners.push(bet);
    } else {
      losers.push(bet);
      totalLosingAmount += bet.amount;
    }
  });
  
  // Calculate winnings distribution
  if (winners.length > 0 && totalLosingAmount > 0) {
    const totalWinningBets = winners.reduce((sum, bet) => sum + bet.amount, 0);
    
    for (const winnerBet of winners) {
      const winRatio = winnerBet.amount / totalWinningBets;
      const winAmount = winnerBet.amount + (totalLosingAmount * winRatio);
      
      winnerBet.result = 'won';
      winnerBet.winAmount = Math.floor(winAmount);
      winnerBet.processed = true;
      await winnerBet.save();
      
      // Update user credits
      await winnerBet.userId.updateBetResult(round, 'won', Math.floor(winAmount), subRound);
    }
  }
  
  // Mark losers
  for (const loserBet of losers) {
    loserBet.result = 'lost';
    loserBet.processed = true;
    await loserBet.save();
    
    await loserBet.userId.updateBetResult(round, 'lost', 0, subRound);
  }
  
  return { winners: winners.length, losers: losers.length, totalPayout: totalLosingAmount };
};

// Helper method to determine winning choice
betSchema.statics.isWinningChoice = function(userChoice, correctAnswer, round) {
  switch(round) {
    case 1: // Rocket distance
      return parseInt(userChoice) === parseInt(correctAnswer);
    case 2: // Projectile range
      return Math.abs(parseInt(userChoice) - parseInt(correctAnswer)) <= 50;
    case 3: // Dog fights
      return userChoice === correctAnswer;
    default:
      return false;
  }
};

module.exports = mongoose.model('Bet', betSchema);
