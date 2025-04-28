const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const activityLogSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  groupId: {
    type: Schema.Types.ObjectId,
    ref: 'Group',
    required: true,
  },
  activityType: {
    type: String,
    enum: ['Mental', 'Physical', 'Bonus'],
    required: true,
  },
  points: {
    type: Number,
    required: true,
  },
  activityName: {
    type: String,
  },
  duration: {
    type: Number, // Duration in minutes, optional
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.model('ActivityLog', activityLogSchema); 