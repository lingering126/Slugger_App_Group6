const express = require('express');
const router = express.Router();
const UserTeamTarget = require('../models/userTeamTarget');
const authMiddleware = require('../middleware/auth');
const { recordUserTargetSnapshot, recordTeamTargetSnapshot } = require('./analytics');

// Get user's target for a specific team
router.get('/:teamId', authMiddleware, async (req, res) => {
  try {
    const { teamId } = req.params;
    const userId = req.user.id;
    
    const userTeamTarget = await UserTeamTarget.findOne({ userId, teamId });
    
    if (!userTeamTarget) {
      return res.status(404).json({ message: 'User target for this team not found' });
    }
    
    res.status(200).json(userTeamTarget);
  } catch (error) {
    console.error('Error fetching user team target:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Set or update user's target for a specific team
router.post('/:teamId', authMiddleware, async (req, res) => {
  try {
    const { teamId } = req.params;
    const { targetValue } = req.body;
    const userId = req.user.id;
    
    if (targetValue === undefined) {
      return res.status(400).json({ message: 'Target value is required' });
    }
    
    // Find and update or create new userTeamTarget
    let userTeamTarget = await UserTeamTarget.findOne({ userId, teamId });
    
    if (userTeamTarget) {
      // Update existing target
      userTeamTarget.targetValue = targetValue;
      userTeamTarget.updatedAt = Date.now();
      await userTeamTarget.save();
    } else {
      // Create new target
      userTeamTarget = new UserTeamTarget({
        userId,
        teamId,
        targetValue
      });
      await userTeamTarget.save();
    }
    
    // 记录快照
    await recordUserTargetSnapshot(userId, teamId, targetValue);
    await recordTeamTargetSnapshot(teamId);
    
    res.status(200).json(userTeamTarget);
  } catch (error) {
    console.error('Error updating user team target:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all team targets for a user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const userTeamTargets = await UserTeamTarget.find({ userId });
    
    res.status(200).json(userTeamTargets);
  } catch (error) {
    console.error('Error fetching user team targets:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router; 