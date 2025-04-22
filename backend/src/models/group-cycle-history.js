const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const groupCycleHistorySchema = new Schema({
  groupId: {
    type: Schema.Types.ObjectId,
    ref: 'Group',
    required: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  targetValue: {
    type: Number,
    required: true,
  },
  // Consider adding fields like finalScore to record the score at the end of the cycle
  // finalScore: Number,
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.model('GroupCycleHistory', groupCycleHistorySchema); 