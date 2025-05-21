const express = require('express');
const router = express.Router();
const Activity = require('../models/Activity');
const mongoose = require('mongoose');
const User = require('../src/models/user');
const Team = require('../models/team');

// Create a new activity
router.post('/', async (req, res) => {
  try {
    console.log('\n=== Creating New Activity ===');
    console.log('Request body:', req.body);
    console.log('User ID from auth:', req.user.id);

    // Find all teams the user is a member of
    const userTeams = await Team.find({ members: req.user.id }).select('_id');
    const userTeamIds = userTeams.map(t => t._id);

    // Create activity with user ID from auth and associated team IDs
    const activity = new Activity({
      ...req.body,
      userId: new mongoose.Types.ObjectId(req.user.id),
      teamsId: userTeamIds
    });

    // Save activity (points will be calculated in pre-save hook)
    await activity.save();
    
    console.log('Activity created successfully');
    console.log('Activity details:', activity.toResponseFormat());
    console.log('=== Activity Creation Complete ===\n');

    res.status(201).json({
      success: true,
      message: 'Activity created successfully',
      data: activity.toResponseFormat()
    });
  } catch (error) {
    console.error('\n=== Activity Creation Error ===');
    console.error('Error details:', error);
    console.error('=== Error End ===\n');

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: Object.values(error.errors).map(err => err.message)
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error creating activity',
      error: error.message
    });
  }
});

// Get user's activities
router.get('/', async (req, res) => {
  try {
    console.log('\n=== Fetching Activities ===');
    console.log('User ID from auth:', req.user.id);
    console.log('Query params:', req.query);
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // 确保 userId 是 ObjectId
    const userId = mongoose.Types.ObjectId.isValid(req.user.id) ? 
      new mongoose.Types.ObjectId(req.user.id) : null;

    if (!userId) {
      throw new Error('Invalid user ID format');
    }

    console.log('Converted User ID:', userId);
    console.log('Query parameters:', { page, limit, skip });

    // 构建查询
    const query = { userId };
    
    // Add type filter if provided
    if (req.query.type) {
      query.type = req.query.type;
    }
    
    // Add date range filter if provided
    if (req.query.startDate || req.query.endDate) {
      query.createdAt = {};
      if (req.query.startDate) {
        query.createdAt.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        query.createdAt.$lt = new Date(req.query.endDate);
      }
    }
    
    console.log('MongoDB query:', query);
    
    // More detailed logging for date parameters
    if (query.createdAt) {
      console.log('Date filter details:');
      if (query.createdAt.$gte) {
        console.log('- Start date (UTC):', query.createdAt.$gte.toISOString());
      }
      if (query.createdAt.$lt) {
        console.log('- End date (UTC):', query.createdAt.$lt.toISOString());
      }
    }

    // 执行查询
    const activities = await Activity.find(query)
      .populate('userId', 'name')
      .populate('comments.userId', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    console.log(`Found ${activities.length} activities`);
    if (activities.length > 0) {
      console.log('First activity:', activities[0]);
    }

    const total = await Activity.countDocuments(query);
    console.log('Total activities count:', total);

    const totalPoints = await Activity.getUserTotalPoints(userId);
    console.log('Total points:', totalPoints);

    // Format activity data, including comments
    const formattedActivities = activities.map(activity => {
      const formattedActivity = activity.toResponseFormat();
      formattedActivity.comments = activity.comments.map(comment => ({
        id: comment._id,
        author: comment.userId?.name || 'Anonymous',
        content: comment.content,
        createdAt: comment.createdAt
      }));
      return formattedActivity;
    });

    const response = {
      success: true,
      data: {
        activities: formattedActivities,
        pagination: {
          total,
          page,
          pages: Math.ceil(total / limit),
          hasMore: skip + activities.length < total
        },
        stats: {
          totalPoints
        }
      }
    };

    console.log('Response data structure:', {
      activitiesCount: response.data.activities.length,
      pagination: response.data.pagination,
      stats: response.data.stats
    });
    console.log('=== Activities Fetch Complete ===\n');

    res.json(response);
  } catch (error) {
    console.error('\n=== Activities Fetch Error ===');
    console.error('Error details:', error);
    console.error('Stack trace:', error.stack);
    console.error('=== Error End ===\n');

    res.status(500).json({
      success: false,
      message: 'Error fetching activities',
      error: error.message
    });
  }
});

// Update activity status
router.patch('/:id', async (req, res) => {
  try {
    console.log('\n=== Updating Activity ===');
    console.log('Activity ID:', req.params.id);
    console.log('Update data:', req.body);

    const activity = await Activity.findOne({
      _id: req.params.id,
      userId: new mongoose.Types.ObjectId(req.user.id)
    });

    if (!activity) {
      return res.status(404).json({
        success: false,
        message: 'Activity not found'
      });
    }

    if (req.body.status) {
      activity.status = req.body.status;
      await activity.save();
    }

    console.log('Activity updated successfully');
    console.log('=== Activity Update Complete ===\n');

    res.json({
      success: true,
      message: 'Activity updated successfully',
      data: activity.toResponseFormat()
    });
  } catch (error) {
    console.error('\n=== Activity Update Error ===');
    console.error('Error details:', error);
    console.error('Stack trace:', error.stack);
    console.error('=== Error End ===\n');

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: Object.values(error.errors).map(err => err.message)
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error updating activity',
      error: error.message
    });
  }
});

// Like activity
router.post('/:id/like', async (req, res) => {
  try {
    console.log('\n=== Liking Activity ===');
    console.log('Activity ID:', req.params.id);
    console.log('User ID:', req.user.id);

    const activity = await Activity.findById(req.params.id);
    if (!activity) {
      return res.status(404).json({
        success: false,
        message: 'Activity not found'
      });
    }

    const isLiked = await activity.toggleLike(req.user.id);
    console.log('Like status:', isLiked ? 'Liked' : 'Unliked');
    console.log('Total likes:', activity.likes.length);
    console.log('=== Like Operation Complete ===\n');

    res.json({
      success: true,
      liked: isLiked,
      likesCount: activity.likes.length
    });
  } catch (error) {
    console.error('\n=== Like Operation Error ===');
    console.error('Error details:', error);
    console.error('=== Error End ===\n');
    res.status(500).json({
      success: false,
      message: 'Error updating like status',
      error: error.message
    });
  }
});

// Add comment to activity
router.post('/:id/comment', async (req, res) => {
  try {
    console.log('\n=== Adding Comment ===');
    console.log('Activity ID:', req.params.id);
    console.log('User ID:', req.user.id);
    console.log('Comment content:', req.body.content);

    if (!req.body.content || !req.body.content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Comment content is required'
      });
    }

    const activity = await Activity.findById(req.params.id);
    if (!activity) {
      return res.status(404).json({
        success: false,
        message: 'Activity not found'
      });
    }

    const comment = await activity.addComment(req.user.id, req.body.content.trim());
    
    // 获取用户信息
    const user = await User.findById(req.user.id).select('name');
    
    console.log('Comment added:', comment);
    console.log('Total comments:', activity.comments.length);
    console.log('=== Comment Addition Complete ===\n');

    res.json({
      success: true,
      comment: {
        id: comment._id,
        author: user.name || 'Anonymous',
        content: comment.content,
        createdAt: comment.createdAt
      },
      commentsCount: activity.comments.length
    });
  } catch (error) {
    console.error('\n=== Comment Addition Error ===');
    console.error('Error details:', error);
    console.error('=== Error End ===\n');
    res.status(500).json({
      success: false,
      message: 'Error adding comment',
      error: error.message
    });
  }
});

module.exports = router;