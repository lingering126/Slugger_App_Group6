const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true
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
    required: true
  },
  type: {
    type: String,
    enum: ['text', 'activity', 'image'],
    required: true
  },
  content: String,
  activityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Activity'
  },
  imageUrl: String,
  channel: {
    type: String,
    enum: ['public', 'team'],
    required: true
  },
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  comments: [commentSchema],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// 添加获取点赞数的虚拟字段
postSchema.virtual('likeCount').get(function() {
  return this.likes.length;
});

// 添加获取评论数的虚拟字段
postSchema.virtual('commentCount').get(function() {
  return this.comments.length;
});

const Post = mongoose.model('Post', postSchema);

module.exports = Post; 