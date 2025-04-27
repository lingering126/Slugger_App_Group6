const mongoose = require('mongoose');

const userTargetSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  targetValue: {
    type: Number,
    default: 1,
    min: 0
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

// Middleware to update the updatedAt field
userTargetSchema.pre('save', function(next) {
  if (this.isModified('targetValue')) {
    this.updatedAt = Date.now();
  }
  next();
});

const UserTarget = mongoose.model('UserTarget', userTargetSchema);

module.exports = UserTarget;