const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const activitySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  type: {
    type: String,
    required: [true, 'Activity type is required'],
    enum: {
      values: ['Physical', 'Mental', 'Bonus'],
      message: '{VALUE} is not a valid activity type'
    }
  },
  name: {
    type: String,
    required: [true, 'Activity name is required'],
    trim: true,
    minlength: [2, 'Activity name must be at least 2 characters long'],
    maxlength: [100, 'Activity name cannot exceed 100 characters']
  },
  duration: {
    type: Number,
    required: [true, 'Duration is required'],
    min: [1, 'Duration must be at least 1 minute'],
    max: [1440, 'Duration cannot exceed 24 hours (1440 minutes)']
  },
  icon: {
    type: String,
    default: '📝'
  },
  points: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: {
      values: ['completed', 'cancelled'],
      message: '{VALUE} is not a valid status'
    },
    default: 'completed'
  },
  // Add social features
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  comments: [commentSchema],
  shares: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    platform: {
      type: String,
      enum: ['team', 'public']
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Calculate points based on activity type and duration
activitySchema.pre('save', function(next) {
  try {
    console.log('\n=== Calculating Activity Points ===');
    console.log('Activity type:', this.type);
    console.log('Duration:', this.duration);

    let pointsPerMinute = 0;
    switch (this.type) {
      case 'Physical':
        pointsPerMinute = 2;
        break;
      case 'Mental':
        pointsPerMinute = 1.5;
        break;
      case 'Bonus':
        pointsPerMinute = 3;
        break;
      default:
        pointsPerMinute = 1;
    }

    this.points = Math.round(this.duration * pointsPerMinute);
    console.log('Points calculated:', this.points);
    console.log('=== Points Calculation Complete ===\n');
    next();
  } catch (error) {
    console.error('\n=== Points Calculation Error ===');
    console.error('Error details:', error);
    console.error('=== Error End ===\n');
    next(error);
  }
});

// Add index for efficient querying
activitySchema.index({ userId: 1, createdAt: -1 });

// Static method to calculate points
activitySchema.statics.calculatePoints = function(type, duration) {
  let pointsPerMinute = 0;
  switch (type) {
    case 'Physical':
      pointsPerMinute = 2;
      break;
    case 'Mental':
      pointsPerMinute = 1.5;
      break;
    case 'Bonus':
      pointsPerMinute = 3;
      break;
    default:
      pointsPerMinute = 1;
  }
  return Math.round(duration * pointsPerMinute);
};

// Static method to get user's total points
activitySchema.statics.getUserTotalPoints = async function(userId) {
  try {
    console.log('\n=== Calculating Total Points ===');
    console.log('User ID:', userId);
    
    // 确保 userId 是 ObjectId
    const userIdObj = mongoose.Types.ObjectId.isValid(userId) ? 
      (typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId) :
      null;
    
    if (!userIdObj) {
      console.error('Invalid user ID format');
      return 0;
    }

    console.log('Converted User ID:', userIdObj);
    
    const result = await this.aggregate([
      { 
        $match: { 
          userId: userIdObj,
          status: 'completed'
        }
      },
      { 
        $group: { 
          _id: '$userId',
          totalPoints: { $sum: '$points' }
        }
      }
    ]);

    console.log('Aggregation result:', result);
    const totalPoints = result.length > 0 ? result[0].totalPoints : 0;
    console.log('Total points calculated:', totalPoints);
    console.log('=== Total Points Calculation Complete ===\n');
    
    return totalPoints;
  } catch (error) {
    console.error('\n=== Total Points Calculation Error ===');
    console.error('Error details:', error);
    console.error('Stack trace:', error.stack);
    console.error('=== Error End ===\n');
    return 0;
  }
};

// Instance method to format activity data
activitySchema.methods.toResponseFormat = function() {
  return {
    id: this._id,
    type: this.type,
    name: this.name,
    duration: this.duration,
    points: this.points,
    status: this.status,
    userId: this.userId,
    icon: this.icon,
    likes: this.likes,
    comments: this.comments.map(comment => ({
      id: comment._id,
      author: comment.userId?.name || 'Anonymous',
      content: comment.content,
      createdAt: comment.createdAt
    })),
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

// Toggle like status for a user
activitySchema.methods.toggleLike = async function(userId) {
  const userIdStr = userId.toString();
  const likeIndex = this.likes.findIndex(id => id.toString() === userIdStr);
  
  if (likeIndex === -1) {
    this.likes.push(userId);
    await this.save();
    return true; // Liked
  } else {
    this.likes.splice(likeIndex, 1);
    await this.save();
    return false; // Unliked
  }
};

// Add a comment to the activity
activitySchema.methods.addComment = async function(userId, content) {
  const comment = {
    userId,
    content,
    createdAt: new Date()
  };
  
  this.comments.push(comment);
  await this.save();
  return this.comments[this.comments.length - 1];
};

// Instance method to add share
activitySchema.methods.addShare = async function(userId, platform) {
  const share = { userId, platform };
  this.shares.push(share);
  await this.save();
  return this.shares.length;
};

// Get activity likes data
activitySchema.methods.getLikesData = async function() {
  await this.populate('likes', 'name avatar');
  return {
    count: this.likes.length,
    users: this.likes.map(user => ({
      id: user._id,
      name: user.name,
      avatar: user.avatar
    }))
  };
};

// Get activity comments with user data
activitySchema.methods.getCommentsData = async function() {
  await this.populate('comments.userId', 'name avatar');
  return {
    count: this.comments.length,
    comments: this.comments.map(comment => ({
      id: comment._id,
      user: {
        id: comment.userId._id,
        name: comment.userId.name,
        avatar: comment.userId.avatar
      },
      content: comment.content,
      createdAt: comment.createdAt
    }))
  };
};

const Activity = mongoose.model('Activity', activitySchema);

module.exports = Activity; 