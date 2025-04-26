const mongoose = require('mongoose');

const userTargetSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  weeklyTarget: {
    type: Number,
    required: true,
    default: 1
  }
});

module.exports = mongoose.model('UserTarget', userTargetSchema);