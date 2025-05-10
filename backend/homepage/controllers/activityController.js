const Activity = require('../../models/Activity');
const User = require('../../src/models/user');
const UserStats = require('../models/UserStats');
const Team = require('../../models/team'); // Added Team model
const mongoose = require('mongoose'); // Added mongoose for ObjectId validation

/**
 * Activity Controller
 * 
 * IMPORTANT NOTE ABOUT ACTIVITIES AND TEAMS:
 * 
 * 1. Activities can be created with or without a teamId
 * 2. When an activity is created with a specific teamId, it's used for team-specific features
 *    like weekly limits.
 * 3. When an activity is created without a teamId (from homepage), it will count toward progress
 *    for ALL teams the user belongs to.
 * 4. The team activities endpoint in /teams/:teamId/activities includes both:
 *    - Activities with the specific teamId
 *    - Activities without any teamId (applied to all teams)
 */

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
    const userIdString = req.user.id; // Keep string for logging, convert to ObjectId for DB
    const userId = new mongoose.Types.ObjectId(userIdString);

    console.log('Request body:', { type, name, duration, teamId });
    console.log('User ID from auth (string):', userIdString);
    console.log('User ID from auth (ObjectId):', userId);

    if (!userIdString) {
      return res.status(400).json({ success: false, message: 'User ID is required.' });
    }
    if (!type || !name || !duration) {
      return res.status(400).json({ success: false, message: 'Type, name, and duration are required.' });
    }

    // --- Daily Limit Check (Global) ---
    console.log("ALIVE CHECKPOINT 1 - Before DEBUG log for type"); // New simple log
    console.log(`[DEBUG] Value of 'type' before daily limit check: '${type}', typeof: ${typeof type}`); 
    console.log("ALIVE CHECKPOINT 2 - Before IF statement for daily limit"); // New simple log
    if (type === 'Physical' || type === 'Mental') {
      console.log("ALIVE CHECKPOINT 3 - INSIDE IF statement for daily limit"); // New simple log
      const todayStart = new Date();
      todayStart.setUTCHours(0, 0, 0, 0);
      const todayEnd = new Date(todayStart);
      todayEnd.setUTCDate(todayStart.getUTCDate() + 1);

      console.log(`Daily Limit Check: userId='${userId}', type='${type}', todayStart='${todayStart.toISOString()}', todayEnd='${todayEnd.toISOString()}'`);

      const dailyActivity = await Activity.findOne({
        userId: userId, // Already ObjectId
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
      const teamObjectId = new mongoose.Types.ObjectId(teamId);
      const team = await Team.findById(teamObjectId);
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
        userId: userId, // Already ObjectId
        teamId: teamObjectId,
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

      // If weekly limits are unlocked (both physical and mental limits reached),
      // allow additional activities beyond the limits
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
      } else {
        console.log('Weekly limits unlocked! User can log additional activities beyond the limits.');
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
      userId: userId, // Already ObjectId
      type,
      name,
      duration,
      points,
      status: 'completed' // Default set to completed
    };
    if (teamId && mongoose.Types.ObjectId.isValid(teamId)) { 
      activityData.teamId = new mongoose.Types.ObjectId(teamId);
      console.log(`Activity being created with specific teamId: ${teamId}`);
    } else {
      console.log('Activity being created without a teamId. It will count for all user teams.');
    }


    const activity = new Activity(activityData);
    await activity.save();
    
    // Get or create user stats data
    let userStats = await UserStats.findOne({ userId: userId }); // Use ObjectId
    if (!userStats) {
      userStats = new UserStats({ 
        userId: userId, // Use ObjectId
        totalPoints: 0,
        pointsByType: new Map(),
        activitiesCompleted: 0,
        streak: 0,
        targetPoints: 1000 // Example default
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
      message: 'Activity created successfully', // Added success message
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
  console.log('\n--- ENTERING GET USER ACTIVITIES (v2) ---');
  try {
    const rawUserIdFromAuth = req.user?.id || req.user?._id;
    console.log('[getUserActivities] Raw req.user.id from auth middleware:', rawUserIdFromAuth);

    if (!rawUserIdFromAuth) {
      console.error('[getUserActivities] User ID not found in req.user');
      return res.status(401).json({ success: false, message: 'Authentication required, user ID not found.' });
    }
    
    const userId = new mongoose.Types.ObjectId(rawUserIdFromAuth.toString());
    console.log(`[getUserActivities] Processing for userId (ObjectId): ${userId}`);

    const { type, startDate, endDate, page = 1, limit = 10 } = req.query;
    console.log(`[getUserActivities] Query Params: type=${type}, startDate=${startDate}, endDate=${endDate}, page=${page}, limit=${limit}`);

    // Construct query conditions directly and explicitly
    const queryConditions = { userId: userId };
    if (type) {
      queryConditions.type = type;
    }
    if (startDate && endDate) {
      queryConditions.createdAt = {
        $gte: new Date(startDate),
        $lt: new Date(endDate) // Using $lt for end date as is common (up to, but not including, the start of the next day)
      };
    } else if (startDate) {
      queryConditions.createdAt = { $gte: new Date(startDate) };
    } else if (endDate) {
      queryConditions.createdAt = { $lt: new Date(endDate) }; // Corrected from $lte to $lt for consistency if only endDate is provided
    }

    // CRITICAL LOG: What is being passed to Activity.find?
    console.log('[getUserActivities] EXACT MongoDB Query Conditions to be used:', JSON.stringify(queryConditions, null, 2));
    console.log('[getUserActivities] Data types in queryConditions.createdAt: $gte is a Date:', queryConditions.createdAt?.$gte instanceof Date, ', $lt is a Date:', queryConditions.createdAt?.$lt instanceof Date);

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const activitiesFound = await Activity.find(queryConditions)
      .populate('userId', 'username name avatar') 
      .sort({ createdAt: -1 }) 
      .skip(skip)
      .limit(parseInt(limit));

    console.log(`[getUserActivities] Found ${activitiesFound.length} activities for the query.`);
    if (activitiesFound.length > 0 && (type === 'Physical' || type === 'Mental') && (startDate && endDate)) {
        activitiesFound.forEach(act => {
            console.log(`[getUserActivities] Activity Found: ID=${act._id}, CreatedAt=${act.createdAt.toISOString()}, Type=${act.type}, User=${act.userId._id}`);
        });
    }

    const totalActivitiesInDBForQuery = await Activity.countDocuments(queryConditions);
    console.log(`[getUserActivities] Total documents in DB matching queryConditions: ${totalActivitiesInDBForQuery}`);
    const totalPages = Math.ceil(totalActivitiesInDBForQuery / parseInt(limit));

    // Stats aggregation should be for the specific user, but not necessarily filtered by type/date from query for overall stats
    const overallStatsMatch = { userId: userId };
    const statsAggregation = await Activity.aggregate([
      { $match: overallStatsMatch }, 
      { $group: {
        _id: '$type',
        totalPoints: { $sum: '$points' },
        totalDuration: { $sum: '$duration' },
        count: { $sum: 1 }
      }}
    ]);
    
    const userTotalPointsAggregation = await Activity.aggregate([
        { $match: overallStatsMatch },
        { $group: { _id: null, totalPoints: { $sum: '$points' } } }
    ]);
    const userTotalPoints = userTotalPointsAggregation.length > 0 ? userTotalPointsAggregation[0].totalPoints : 0;
    console.log(`[getUserActivities] User Total Points (all types): ${userTotalPoints}`);

    res.json({
      success: true,
      message: 'Activities fetched successfully',
      data: {
        activities: activitiesFound.map(act => act.toResponseFormat ? act.toResponseFormat() : act),
        pagination: {
          total: totalActivitiesInDBForQuery, // Use the countDocuments result here
          page: parseInt(page),
          pages: totalPages,
          limit: parseInt(limit),
          hasMore: parseInt(page) < totalPages
        },
        stats: {
          byType: statsAggregation.reduce((acc, stat) => {
            acc[stat._id] = {
              totalPoints: stat.totalPoints,
              totalDuration: stat.totalDuration,
              count: stat.count
            };
            return acc;
          }, {}),
          totalPoints: userTotalPoints
        }
      }
    });

  } catch (error) {
    console.error('\n=== Get User Activities Error (v2) ===');
    console.error('[getUserActivities] Error details:', error.message);
    console.error('[getUserActivities] Stack trace:', error.stack);
    res.status(500).json({ success: false, message: 'Server error fetching user activities.', error: error.message });
  }
  console.log('--- EXITING GET USER ACTIVITIES (v2) ---\n');
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
