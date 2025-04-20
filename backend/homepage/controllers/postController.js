const Post = require('../models/Post');
const Activity = require('../models/Activity');
const User = require('../models/User');

// 创建新帖子
exports.createPost = async (req, res) => {
  try {
    const { type, content, activityId, imageUrl, channel, teamId } = req.body;
    const userId = req.user._id;

    const postData = {
      userId,
      type,
      channel,
      content,
      imageUrl,
      teamId
    };

    if (type === 'activity' && activityId) {
      // 验证活动存在且属于当前用户
      const activity = await Activity.findOne({ _id: activityId, userId });
      if (!activity) {
        return res.status(404).json({ message: 'Activity not found or not owned by user' });
      }
      postData.activityId = activityId;
    }

    const post = await Post.create(postData);
    
    // 填充用户信息后返回
    const populatedPost = await Post.findById(post._id)
      .populate('userId', 'name avatar')
      .populate('activityId')
      .populate('comments.userId', 'name avatar');

    res.status(201).json(populatedPost);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// 获取帖子列表（支持公共和团队频道）
exports.getPosts = async (req, res) => {
  try {
    const { channel, teamId } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const query = { channel };
    if (channel === 'team' && teamId) {
      query.teamId = teamId;
    }

    const posts = await Post.find(query)
      .populate('userId', 'name avatar')
      .populate('activityId')
      .populate('comments.userId', 'name avatar')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Post.countDocuments(query);

    res.json({
      posts,
      pagination: {
        current: page,
        total: Math.ceil(total / limit),
        hasMore: page * limit < total
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 点赞帖子
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
      // 取消点赞
      post.likes = post.likes.filter(id => !id.equals(userId));
    } else {
      // 添加点赞
      post.likes.push(userId);
    }

    await post.save();
    res.json({ likes: post.likes.length, isLiked: !isLiked });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 评论帖子
exports.addComment = async (req, res) => {
  try {
    const { content } = req.body;
    const postId = req.params.postId;
    const userId = req.user.id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // 创建新评论
    const newComment = {
      userId: userId,
      content: content,
      createdAt: new Date()
    };

    // 添加评论到帖子
    post.comments.push(newComment);
    await post.save();

    // 获取用户信息
    const user = await User.findById(userId).select('name avatar');

    // 返回新评论信息，包含用户信息
    const commentResponse = {
      id: post.comments[post.comments.length - 1]._id,
      author: user.name,
      avatar: user.avatar,
      content: content,
      createdAt: newComment.createdAt
    };

    res.status(201).json(commentResponse);
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ message: 'Error adding comment' });
  }
}; 