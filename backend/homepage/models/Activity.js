const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['Physical', 'Mental', 'Bonus'],
    required: true
  },
  name: {
    type: String,
    required: true
  },
  duration: {
    type: Number, // 以分钟为单位
    required: true
  },
  points: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  progress: {
    type: Number,
    default: 0
  }
});

// 添加用于计算积分的静态方法
activitySchema.statics.calculatePoints = function(type, duration) {
  // 基础分值
  const basePoints = {
    Physical: 2,
    Mental: 3,
    Bonus: 4
  };
  
  // 每30分钟的基础分值
  return Math.floor(duration / 30) * basePoints[type];
};

const Activity = mongoose.model('Activity', activitySchema);

module.exports = Activity; 