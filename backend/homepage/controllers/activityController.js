const Activity = require('../../models/Activity');
const User = require('../../src/models/user');
const UserStats = require('../models/UserStats');

// Get activity types list
exports.getActivityTypes = async (req, res) => {
  try {
    const types = {
      Physical: [
        { name: 'Running', basePoints: 10 },
        { name: 'Cycling', basePoints: 12 },
        { name: 'Swimming', basePoints: 15 },
        { name: 'Walking', basePoints: 8 },
        { name: 'Gym', basePoints: 10 }
      ],
      Mental: [
        { name: 'Reading', basePoints: 15 },
        { name: 'Meditation', basePoints: 20 },
        { name: 'Learning', basePoints: 15 },
        { name: 'Writing', basePoints: 12 }
      ],
      Bonus: [
        { name: 'Team Activity', basePoints: 20 },
        { name: 'Special Event', basePoints: 25 }
      ]
    };
    res.json(types);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create new activity
exports.createActivity = async (req, res) => {
  try {
    console.log('\n=== Creating New Activity ===');
    const { type, name, duration } = req.body;
    const userId = req.user.id;

    console.log('Request body:', { type, name, duration });
    console.log('User ID from auth:', userId);

    if (!userId) {
      throw new Error('User ID is required but not found in request');
    }

    // Calculate points
    console.log('\n=== Calculating Activity Points ===');
    console.log('Activity type:', type);
    console.log('Duration:', duration);
    const points = Activity.calculatePoints(type, duration);
    console.log('Points calculated:', points);
    console.log('=== Points Calculation Complete ===\n');

    // Create activity
    const activity = new Activity({
      userId,
      type,
      name,
      duration,
      points,
      status: 'completed' // Default set to completed
    });

    await activity.save();

    // Get or create user stats data
    let userStats = await UserStats.findOne({ userId });
    if (!userStats) {
      userStats = new UserStats({ 
        userId,
        totalPoints: 0,
        pointsByType: new Map(),
        activitiesCompleted: 0,
        streak: 0,
        targetPoints: 1000
      });
    }

    // Update user stats
    await userStats.updateActivityStats(activity);

    console.log('\nActivity created successfully');
    console.log('Activity details:', activity.toResponseFormat());
    console.log('User stats updated:', {
      totalPoints: userStats.totalPoints,
      activitiesCompleted: userStats.activitiesCompleted,
      streak: userStats.streak
    });
    console.log('=== Activity Creation Complete ===\n');

    res.status(201).json({
      success: true,
      data: activity.toResponseFormat()
    });
  } catch (error) {
    console.error('\n=== Activity Creation Error ===');
    console.error('Error details:', error);
    console.error('Stack trace:', error.stack);
    console.error('Request user object:', req.user);
    console.error('=== Error End ===\n');
    res.status(400).json({ 
      success: false,
      message: error.message 
    });
  }
};

// Get activities list
exports.getActivities = async (req, res) => {
  try {
    const activities = await Activity.find()
      .populate('userId', 'username')
      .sort({ date: -1 })
      .limit(20);

    const formattedActivities = activities.map(activity => ({
      id: activity._id,
      username: activity.userId.username,
      activityType: activity.type,
      name: activity.name,
      duration: activity.duration,
      points: activity.points,
      timestamp: activity.date,
      likes: activity.likes.length,
      comments: activity.comments.length,
      shares: activity.shares.length
    }));

    res.json(formattedActivities);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Like activity
exports.likeActivity = async (req, res) => {
  try {
    const activity = await Activity.findById(req.params.id);
    if (!activity) {
      return res.status(404).json({ message: 'Activity not found' });
    }

    const isLiked = await activity.toggleLike(req.user._id);
    res.json({ liked: isLiked, likesCount: activity.likes.length });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Comment on activity
exports.commentActivity = async (req, res) => {
  try {
    const activity = await Activity.findById(req.params.id);
    if (!activity) {
      return res.status(404).json({ message: 'Activity not found' });
    }

    const comment = await activity.addComment(req.user._id, req.body.content);
    const user = await User.findById(req.user._id);

    res.json({
      id: comment._id,
      content: comment.content,
      username: user.username,
      createdAt: comment.createdAt
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Share activity
exports.shareActivity = async (req, res) => {
  try {
    const activity = await Activity.findById(req.params.id);
    if (!activity) {
      return res.status(404).json({ message: 'Activity not found' });
    }

    const sharesCount = await activity.addShare(req.user._id);
    res.json({ sharesCount });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get user activities list
exports.getUserActivities = async (req, res) => {
  try {
    const userId = req.user._id;
    const { type, startDate, endDate } = req.query;

    // Build query conditions
    const query = { userId };
    if (type) query.type = type;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    // Get activities list
    const activities = await Activity.find(query)
      .sort({ date: -1 })
      .limit(50);

    // Get activity statistics
    const stats = await Activity.aggregate([
      { $match: query },
      { $group: {
        _id: '$type',
        totalPoints: { $sum: '$points' },
        totalDuration: { $sum: '$duration' },
        count: { $sum: 1 }
      }}
    ]);

    res.json({
      activities,
      stats: stats.reduce((acc, stat) => {
        acc[stat._id] = {
          totalPoints: stat.totalPoints,
          totalDuration: stat.totalDuration,
          count: stat.count
        };
        return acc;
      }, {})
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get activity details
exports.getActivityById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const activity = await Activity.findOne({
      _id: id,
      userId
    });

    if (!activity) {
      return res.status(404).json({ message: 'Activity not found' });
    }

    res.json(activity);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update activity status
exports.updateActivityStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user._id;

    const activity = await Activity.findOne({
      _id: id,
      userId
    });

    if (!activity) {
      return res.status(404).json({ message: 'Activity not found' });
    }

    activity.status = status;
    await activity.save();

    // If activity status changes, update stats
    if (status === 'completed' && activity.status !== 'completed') {
      const userStats = await UserStats.findOne({ userId });
      if (userStats) {
        await userStats.updateActivityStats(activity);
      }
    }

    res.json(activity);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}; 