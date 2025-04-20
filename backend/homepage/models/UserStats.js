const mongoose = require('mongoose');

const userStatsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  totalPoints: {
    type: Number,
    default: 0
  },
  pointsByType: {
    type: Map,
    of: Number,
    default: new Map()
  },
  activitiesCompleted: {
    type: Number,
    default: 0
  },
  streak: {
    type: Number,
    default: 0
  },
  targetPoints: {
    type: Number,
    default: 1000
  },
  lastActivityDate: {
    type: Date
  }
}, {
  timestamps: true
});

// 计算总体进度
userStatsSchema.methods.calculateProgress = function() {
  return Math.min(100, (this.totalPoints / this.targetPoints) * 100);
};

// 计算特定类型活动的进度
userStatsSchema.methods.calculateTypeProgress = function(type) {
  const typePoints = this.pointsByType.get(type) || 0;
  const typeTarget = this.targetPoints / 3; // 假设每种类型的目标是总目标的1/3
  return Math.min(100, (typePoints / typeTarget) * 100);
};

// 更新活动统计
userStatsSchema.methods.updateActivityStats = async function(activity) {
  // 更新总积分
  this.totalPoints += activity.points;
  
  // 更新类型积分
  const currentTypePoints = this.pointsByType.get(activity.type) || 0;
  this.pointsByType.set(activity.type, currentTypePoints + activity.points);
  
  // 更新活动完成数
  this.activitiesCompleted += 1;
  
  // 更新连续打卡天数
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (this.lastActivityDate) {
    const lastDate = new Date(this.lastActivityDate);
    lastDate.setHours(0, 0, 0, 0);
    
    const diffDays = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      this.streak += 1;
    } else if (diffDays > 1) {
      this.streak = 1;
    }
  } else {
    this.streak = 1;
  }
  
  this.lastActivityDate = today;
  
  return this.save();
};

const UserStats = mongoose.model('UserStats', userStatsSchema);

module.exports = UserStats; 