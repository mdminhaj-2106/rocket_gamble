const mongoose = require('mongoose');

const roundSchema = new mongoose.Schema({
  roundNumber: {
    type: Number,
    required: true,
    unique: true,
    min: 1,
    max: 3
  },
  name: {
    type: String,
    required: true
  },
  description: String,
  isActive: {
    type: Boolean,
    default: false
  },
  isCompleted: {
    type: Boolean,
    default: false
  },
  startTime: Date,
  endTime: Date,
  results: [{
    subRound: { type: Number, default: 1 },
    correctAnswer: mongoose.Schema.Types.Mixed,
    timestamp: { type: Date, default: Date.now }
  }],
  participants: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    joinedAt: { type: Date, default: Date.now }
  }],
  settings: {
    maxBet: { type: Number, default: 500 },
    minBet: { type: Number, default: 10 },
    timeLimit: { type: Number, default: 300 }, // seconds
    subRounds: { type: Number, default: 1 } // for round 3
  }
}, {
  timestamps: true
});

// Static method to get current active round
roundSchema.statics.getCurrentRound = function() {
  return this.findOne({ isActive: true });
};

// Static method to initialize rounds
roundSchema.statics.initializeRounds = async function() {
  const rounds = [
    {
      roundNumber: 1,
      name: "Rocket Distance Gamble",
      description: "Choose which rocket will go the farthest",
      settings: { maxBet: 500, minBet: 10, timeLimit: 300, subRounds: 1 }
    },
    {
      roundNumber: 2,
      name: "Projectile Range Prediction",
      description: "Predict the range of the syringe rocket",
      settings: { maxBet: 500, minBet: 10, timeLimit: 300, subRounds: 1 }
    },
    {
      roundNumber: 3,
      name: "Nexus Dog Fights",
      description: "20 rounds of epic dog fight predictions",
      settings: { maxBet: 200, minBet: 10, timeLimit: 600, subRounds: 20 }
    }
  ];
  
  for (const roundData of rounds) {
    await this.findOneAndUpdate(
      { roundNumber: roundData.roundNumber },
      roundData,
      { upsert: true, new: true }
    );
  }
};

// Method to add result
roundSchema.methods.addResult = function(correctAnswer, subRound = 1) {
  this.results.push({
    subRound,
    correctAnswer,
    timestamp: new Date()
  });
  return this.save();
};

// Method to complete round
roundSchema.methods.complete = function() {
  this.isActive = false;
  this.isCompleted = true;
  this.endTime = new Date();
  return this.save();
};

module.exports = mongoose.model('Round', roundSchema);
