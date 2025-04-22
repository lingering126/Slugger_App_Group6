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
  content: {
    type: String,
    required: true,
    trim: true
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  comments: [commentSchema],
  visibility: {
    type: String,
    enum: ['public', 'private'],
    default: 'public'
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
postSchema.index({ userId: 1 });

// Format post data for response
postSchema.methods.toResponseFormat = function(currentUserId) {
  return {
    id: this._id,
    content: this.content,
    userId: this.userId,
    likes: this.likes,
    likesCount: this.likes.length,
    isLikedByUser: currentUserId ? this.isLikedByUser(currentUserId) : false,
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

// Check if a user has liked the post
postSchema.methods.isLikedByUser = function(userId) {
  console.log('\n=== Checking Like Status ===');
  console.log('Post ID:', this._id);
  console.log('Checking for User ID:', userId);
  console.log('Likes array:', this.likes);
  
  const result = this.likes.some(likeId => {
    // Handle case where likeId might be an object with _id property
    const actualLikeId = likeId._id ? likeId._id : likeId;
    const comparison = actualLikeId.toString() === userId.toString();
    console.log('Comparing:');
    console.log('- Like ID (processed):', actualLikeId);
    console.log('- User ID:', userId);
    console.log('- toString() comparison:', comparison);
    return comparison;
  });
  
  console.log('Final result:', result);
  console.log('=== Check Complete ===\n');
  return result;
};

// Toggle like status for a user
postSchema.methods.toggleLike = async function(userId) {
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

// Get post likes data
postSchema.methods.getLikesData = async function() {
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

const Post = mongoose.model('Post', postSchema);

module.exports = Post; 