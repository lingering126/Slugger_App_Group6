const Activity = require('../../models/Activity');
const User = require('../../src/models/user');
const UserStats = require('../models/UserStats');
const Team = require('../../models/team'); // Added Team model
const mongoose = require('mongoose'); // Added mongoose for ObjectId validation

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
    const { type, name, duration, teamId } = req.body; // Added teamId
    const userId = req.user.id;

    console.log('Request body:', { type, name, duration, teamId });
    console.log('User ID from auth:', userId);

    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required.' });
    }
    if (!type || !name || !duration) {
      return res.status(400).json({ success: false, message: 'Type, name, and duration are required.' });
    }

    // --- Daily Limit Check (Global) ---
    if (type === 'Physical' || type === 'Mental') {
      const todayStart = new Date();
      todayStart.setUTCHours(0, 0, 0, 0);
      const todayEnd = new Date(todayStart);
      todayEnd.setUTCDate(todayStart.getUTCDate() + 1);

      console.log(`Daily Limit Check: userId='${userId}', type='${type}', todayStart='${todayStart.toISOString()}', todayEnd='${todayEnd.toISOString()}'`);

      const dailyActivity = await Activity.findOne({
        userId,
        type,
        createdAt: { $gte: todayStart, $lt: todayEnd }
      });

      if (dailyActivity) {
        console.log('Daily limit reached. Found activity:', dailyActivity);
        return res.status(403).json({ 
          success: false, 
          message: `You can only log 1 point for ${type.toLowerCase()} activities per day. (Date range checked: ${todayStart.toUTCString()} to ${todayEnd.toUTCString()})`
        });
      } else {
        console.log('Daily limit not reached for this type and UTC day.');
      }
    }

    // --- Weekly Limit Check (Per Team) ---
    if ((type === 'Physical' || type === 'Mental') && teamId) {
      if (!mongoose.Types.ObjectId.isValid(teamId)) {
        return res.status(400).json({ success: false, message: 'Invalid team ID format.' });
      }
      const team = await Team.findById(teamId);
      if (!team) {
        return res.status(404).json({ success: false, message: 'Team not found.' });
      }

      // Calculate current week for the team
      const teamCreationDate = new Date(team.createdAt); // Already UTC 00:00:00
      const now = new Date();
      const msSinceCreation = now.getTime() - teamCreationDate.getTime();
      const daysSinceCreation = Math.floor(msSinceCreation / (1000 * 60 * 60 * 24));
      const currentWeekNumber = Math.floor(daysSinceCreation / 7);
      
      const weekStart = new Date(teamCreationDate);
      weekStart.setUTCDate(teamCreationDate.getUTCDate() + currentWeekNumber * 7);
      
      const weekEnd = new Date(weekStart);
      weekEnd.setUTCDate(weekStart.getUTCDate() + 7);

      // Query activities for the user in this team for the current week
      const weeklyActivities = await Activity.find({
        userId,
        teamId,
        type: { $in: ['Physical', 'Mental'] },
        createdAt: { $gte: weekStart, $lt: weekEnd }
      });

      let physicalLoggedThisWeek = 0;
      let mentalLoggedThisWeek = 0;
      weeklyActivities.forEach(act => {
        if (act.type === 'Physical') physicalLoggedThisWeek++;
        if (act.type === 'Mental') mentalLoggedThisWeek++;
      });

      const isPhysicalWeeklyLimitReached = physicalLoggedThisWeek >= team.weeklyLimitPhysical;
      const isMentalWeeklyLimitReached = mentalLoggedThisWeek >= team.weeklyLimitMental;
      const weeklyLimitsUnlocked = isPhysicalWeeklyLimitReached && isMentalWeeklyLimitReached;

      if (!weeklyLimitsUnlocked) {
        if (type === 'Physical' && isPhysicalWeeklyLimitReached) {
          return res.status(403).json({ 
            success: false, 
            message: 'Weekly physical activity limit reached for this team. Unlock by reaching the mental limit too.' 
          });
        }
        if (type === 'Mental' && isMentalWeeklyLimitReached) {
          return res.status(403).json({ 
            success: false, 
            message: 'Weekly mental activity limit reached for this team. Unlock by reaching the physical limit too.' 
          });
        }
      }
    } else if ((type === 'Physical' || type === 'Mental') && !teamId) {
      // If physical or mental, teamId is expected for weekly checks.
      // Depending on strictness, could return an error or allow logging without weekly check.
      // For now, let's assume teamId is required for these types if weekly limits are to be enforced.
      console.warn(`Activity of type ${type} logged without teamId. Weekly limits not checked.`);
    }

    // Calculate points (always 1 as per Activity model pre-save hook)
    const points = 1; 

    // Create activity
    const activityData = {
      userId,
      type,
      name,
      duration,
      points,
      status: 'completed' // Default set to completed
    };
    if (teamId && mongoose.Types.ObjectId.isValid(teamId)) { // Add teamId if provided and valid
      activityData.teamId = teamId;
    }


    const activity = new Activity(activityData);
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
