const Post = require('../models/Post');
const User = require('../../src/models/user');

// Create new post
exports.createPost = async (req, res) => {
  console.log('==== POST /api/homepage/posts (Create Post) START ====');
  try {
    const { content } = req.body;
    
    // Safely extract user ID with validation
    if (!req.user) {
      console.error('[createPost] req.user is missing - auth middleware may not be working properly');
      return res.status(401).json({ message: 'Authentication error: User not identified' });
    }
    
    const userId = req.user.id || req.user.userId || req.user._id;
    if (!userId) {
      console.error('[createPost] User ID not found in req.user:', req.user);
      return res.status(401).json({ message: 'Authentication error: User ID not found' });
    }
    
    console.log(`[createPost] Creating post for user: ${userId}`);

    // Get user information first
    const user = await User.findById(userId);
    if (!user) {
      console.error(`[createPost] User with ID ${userId} not found in database`);
      return res.status(404).json({ message: 'User not found' });
    }

    const postData = {
      userId,
      type: 'text',
      content
    };

    const post = await Post.create(postData);
    
    // Format the response
    const response = {
      id: post._id,
      author: user.name,
      content: post.content,
      likes: 0,
      comments: [],
      createdAt: post.createdAt
    };

    console.log('==== POST /api/homepage/posts (Create Post) END - SUCCESS ====');
    res.status(201).json(response);
  } catch (error) {
    console.error('==== POST /api/homepage/posts (Create Post) END - ERROR ====');
    console.error('Error creating post:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Error creating post' });
  }
};

// Get posts list
exports.getPosts = async (req, res) => {
  console.log('==== GET /api/homepage/posts START ====');
  try {
    // Safely extract user ID with validation for permissions checking if needed
    if (!req.user) {
      console.error('[getPosts] req.user is missing - auth middleware may not be working properly');
      return res.status(401).json({ message: 'Authentication error: User not identified' });
    }
    
    const userId = req.user.id || req.user.userId || req.user._id;
    if (!userId) {
      console.error('[getPosts] User ID not found in req.user:', req.user);
      return res.status(401).json({ message: 'Authentication error: User ID not found' });
    }
    
    console.log(`[getPosts] Retrieving posts for user: ${userId}`);
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const total = await Post.countDocuments();

    // Get all unique user IDs from posts and comments
    const userIds = new Set();
    posts.forEach(post => {
      userIds.add(post.userId.toString());
      post.comments.forEach(comment => {
        userIds.add(comment.userId.toString());
      });
    });

    // Get all users in one query
    const users = await User.find({ _id: { $in: Array.from(userIds) } }).lean();
    const userMap = new Map(users.map(user => [user._id.toString(), user]));

    const formattedPosts = posts.map(post => ({
      id: post._id,
      author: userMap.get(post.userId.toString())?.name || 'Unknown User',
      content: post.content,
      likes: post.likes.length,
      comments: post.comments.map(comment => ({
        id: comment._id,
        author: userMap.get(comment.userId.toString())?.name || 'Unknown User',
        content: comment.content,
        createdAt: comment.createdAt
      })),
      createdAt: post.createdAt
    }));

    res.json({
      posts: formattedPosts,
      pagination: {
        current: page,
        total: Math.ceil(total / limit),
        hasMore: page * limit < total
      }
    });
  } catch (error) {
    console.error('Error getting posts:', error);
    res.status(500).json({ message: 'Error getting posts' });
  }
};

// Like post
exports.likePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user._id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const isLiked = post.likes.includes(userId);
    if (isLiked) {
      // Unlike
      post.likes = post.likes.filter(id => !id.equals(userId));
    } else {
      // Add like
      post.likes.push(userId);
    }

    await post.save();
    res.json({ likes: post.likes.length, isLiked: !isLiked });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Add comment to post
exports.addComment = async (req, res) => {
  try {
    const { content } = req.body;
    const postId = req.params.postId;
    const userId = req.user._id || req.user.id;

    // Get user information first
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Create new comment
    const newComment = {
      userId: userId,
      content: content
    };

    // Add comment to post
    post.comments.push(newComment);
    await post.save();

    // Format the response
    const commentResponse = {
      id: post.comments[post.comments.length - 1]._id,
      author: user.name,
      content: content,
      createdAt: new Date()
    };

    res.status(201).json(commentResponse);
  } catch (error) {
    console.error('Error adding comment:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Error adding comment' });
  }
}; 