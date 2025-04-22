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

// Calculate overall progress
userStatsSchema.methods.calculateProgress = function() {
  return Math.min((this.totalPoints / this.targetPoints) * 100, 100);
};

// Calculate progress for specific activity type
userStatsSchema.methods.calculateTypeProgress = function(type) {
  const typePoints = this.pointsByType.get(type) || 0;
  const typeTarget = this.targetPoints / 3; // Assuming target for each type is 1/3 of total target
  return Math.min((typePoints / typeTarget) * 100, 100);
};

// Update activity statistics
userStatsSchema.methods.updateActivityStats = async function(activity) {
  // Update total points
  this.totalPoints += activity.points;
  
  // Update type points
  const type = activity.type;
  this.pointsByType.set(type, (this.pointsByType.get(type) || 0) + activity.points);
  
  // Update completed activities count
  this.activitiesCompleted += 1;
  
  // Update consecutive check-in days
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