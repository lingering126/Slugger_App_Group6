const mongoose = require('mongoose');

const userTeamTargetSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  targetValue: {
    type: Number,
    required: true,
    default: 3
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Create a compound index on userId and teamId for faster lookups
userTeamTargetSchema.index({ userId: 1, teamId: 1 }, { unique: true });

module.exports = mongoose.model('UserTeamTarget', userTeamTargetSchema); 