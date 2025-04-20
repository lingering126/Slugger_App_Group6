const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  members: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    joinDate: {
      type: Date,
      default: Date.now
    },
    role: {
      type: String,
      enum: ['leader', 'member'],
      default: 'member'
    }
  }],
  currentPoints: {
    type: Number,
    default: 0
  },
  targetPoints: {
    type: Number,
    default: 5000
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// 计算团队进度
teamSchema.methods.calculateProgress = function() {
  return Math.min(100, (this.currentPoints / this.targetPoints) * 100);
};

// 更新团队积分
teamSchema.methods.updatePoints = async function(points) {
  this.currentPoints += points;
  return this.save();
};

// 添加团队成员
teamSchema.methods.addMember = async function(userId, role = 'member') {
  if (!this.members.some(member => member.userId.toString() === userId.toString())) {
    this.members.push({
      userId,
      role,
      joinDate: new Date()
    });
    return this.save();
  }
  return this;
};

// 移除团队成员
teamSchema.methods.removeMember = async function(userId) {
  this.members = this.members.filter(member => 
    member.userId.toString() !== userId.toString()
  );
  return this.save();
};

const Team = mongoose.model('Team', teamSchema);

module.exports = Team; 