const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['leader', 'member'],
      default: 'member'
    },
    points: {
      type: Number,
      default: 0
    }
  }],
  goals: [{
    title: {
      type: String,
      required: true
    },
    target: {
      type: Number,
      required: true
    },
    current: {
      type: Number,
      default: 0
    },
    type: {
      type: String,
      enum: ['physical', 'mental', 'social'],
      default: 'physical'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  forfeits: [{
    description: {
      type: String,
      required: true
    },
    points: {
      type: Number,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Team', teamSchema); 