const express = require('express');
const router = express.Router();
const AnalyticsService = require('./analytics.service');
const authMiddleware = require('../middleware/auth');

// Instantiate Service
const analyticsService = new AnalyticsService();

// GET /api/analytics/overview/:groupId
router.get('/overview/:groupId', authMiddleware, async (req, res, next) => {
  try {
    const { groupId } = req.params;
    // @ts-ignore - req.user is attached by auth middleware
    const userId = req.user._id; // Use _id

    // Verify whether the user is a member of the group
    const isMember = await analyticsService.isUserGroupMember(userId, groupId);
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Forbidden: User is not a member of this group.' });
    }

    // Call the summary-specific service method
    const overviewSummaryData = await analyticsService.getGroupOverviewSummary(groupId);
    res.json({ success: true, data: overviewSummaryData, message: 'Group overview summary fetched successfully.' });
  } catch (error) {
    console.error('Error fetching group overview summary:', error);
    if (error.message.includes('not found')) {
      res.status(404).json({ success: false, message: error.message });
    } else {
      res.status(500).json({ success: false, message: 'Failed to fetch group overview summary.' });
    }
    // next(error); // or pass to global error handling
  }
});

// GET /api/analytics/member-progress/:groupId
router.get('/member-progress/:groupId', authMiddleware, async (req, res, next) => {
  try {
    const { groupId } = req.params;
    // @ts-ignore - req.user is attached by auth middleware
    const userId = req.user._id; // Use _id

    // Verify whether the user is a member of the group
    const isMember = await analyticsService.isUserGroupMember(userId, groupId);
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Forbidden: User is not a member of this group.' });
    }

    // Call the member progress-specific service method
    const memberProgressData = await analyticsService.getMemberProgress(groupId);
    res.json({ success: true, data: memberProgressData, message: 'Member progress fetched successfully.' });
  } catch (error) {
    console.error('Error fetching member progress:', error);
    if (error.message.includes('not found')) {
      res.status(404).json({ success: false, message: error.message });
    } else {
      res.status(500).json({ success: false, message: 'Failed to fetch member progress.' });
    }
  }
});

// GET /api/analytics/timeline/:groupId?range=<range>
router.get('/timeline/:groupId', authMiddleware, async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { range } = req.query; // Get range from query parameters
    // @ts-ignore - req.user is attached by auth middleware
    const userId = req.user._id;

    // Validate range parameter
    const validRanges = ['24H', '1W', '1M', '1Y'];
    if (!range || !validRanges.includes(range)) {
      return res.status(400).json({ success: false, message: 'Invalid or missing time range parameter. Use one of: 24H, 1W, 1M, 1Y' });
    }

    // Verify whether the user is a member of the group (optional but good practice)
    const isMember = await analyticsService.isUserGroupMember(userId, groupId);
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Forbidden: User is not a member of this group.' });
    }

    const timelineData = await analyticsService.getTimeline(groupId, range);
    res.json({ success: true, data: timelineData, message: 'Timeline data fetched successfully.' });

  } catch (error) {
    console.error('Error fetching group timeline:', error);
    if (error.message.includes('not found')) {
      res.status(404).json({ success: false, message: error.message });
    } else if (error.message.includes('Invalid time range')) {
       res.status(400).json({ success: false, message: error.message });
    } else {
      res.status(500).json({ success: false, message: 'Failed to fetch group timeline.' });
    }
    // next(error);
  }
});

module.exports = router; 