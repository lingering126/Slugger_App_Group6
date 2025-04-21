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

const postSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['text', 'activity'],
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  activityType: {
    type: String,
    required: function() {
      return this.type === 'activity';
    }
  },
  duration: {
    type: Number,
    required: function() {
      return this.type === 'activity';
    },
    min: 0
  },
  points: {
    type: Number,
    default: 0,
    min: 0
  },
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  comments: [commentSchema],
  visibility: {
    type: String,
    enum: ['public', 'team', 'private'],
    default: 'public'
  },
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: function() {
      return this.visibility === 'team';
    }
  }
}, {
  timestamps: true
});

// Virtual fields
postSchema.virtual('likeCount').get(function() {
  return this.likes.length;
});

postSchema.virtual('commentCount').get(function() {
  return this.comments.length;
});

// Indexes for better query performance
postSchema.index({ createdAt: -1 });
postSchema.index({ teamId: 1, visibility: 1 });
postSchema.index({ userId: 1, type: 1 });

const Post = mongoose.model('Post', postSchema);

module.exports = Post; 