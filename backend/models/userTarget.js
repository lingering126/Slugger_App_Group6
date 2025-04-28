const mongoose = require('mongoose');

const userTargetSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  targetValue: {
    type: Number,
    required: true,
    default: 1,
    max: 7
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('UserTarget', userTargetSchema);