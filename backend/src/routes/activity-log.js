const express = require('express');
const router = express.Router();
const ActivityLog = require('../models/activity-log');
const authMiddleware = require('../middleware/auth');

// POST /api/activity-log - Create new activity log
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { groupId, activityType, points = 1, activityName, duration, timestamp } = req.body;
    const userId = req.user._id; // Get user ID from authentication middleware

    // Validate required fields
    if (!groupId || !activityType) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields', 
        details: 'groupId and activityType are required' 
      });
    }

    // Validate if the activity type is valid
    const validActivityTypes = ['Mental', 'Physical', 'Bonus'];
    if (!validActivityTypes.includes(activityType)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid activity type', 
        details: `Activity type must be one of: ${validActivityTypes.join(', ')}` 
      });
    }

    const newLog = new ActivityLog({
      userId,
      groupId,
      activityType,
      points,
      activityName,
      duration,
      timestamp: timestamp ? new Date(timestamp) : new Date()
    });

    await newLog.save();
    res.status(201).json({ success: true, message: 'Activity log saved', data: newLog });
  } catch (error) {
    console.error('Error saving activity log:', error);
    res.status(500).json({ success: false, message: 'Failed to log activity', error: error.message });
  }
});

// Get user activity logs in a specific group
router.get('/user/:groupId', authMiddleware, async (req, res) => {
    try {
      const { groupId } = req.params;
      const userId = req.user._id;
      const limit = parseInt(req.query.limit) || 20;
      const skip = parseInt(req.query.skip) || 0;
  
      const logs = await ActivityLog.find({ userId, groupId })
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit);
  
      const totalCount = await ActivityLog.countDocuments({ userId, groupId });
  
      res.status(200).json({ 
        success: true, 
        data: logs,
        meta: {
          totalCount,
          limit,
          skip
        }
      });
    } catch (error) {
      console.error('Error fetching user activity logs:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch logs', error: error.message });
    }
  });

module.exports = router; 