const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const UserTarget = require('../models/UserTarget');
const Team = require('../models/team');
const { authMiddleware } = require('./auth');

// Get the current user's target value
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Find user's target value, if not exists, create a record with default value 1
    let userTarget = await UserTarget.findOne({ userId });
    
    if (!userTarget) {
      userTarget = await UserTarget.create({
        userId,
        targetValue: 1 // Default value is 1
      });
    }
    
    res.status(200).json(userTarget);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user target', error: error.message });
  }
});

// Update user's target value and synchronize the team's totalGoal
router.put('/me', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { targetValue } = req.body;
    
    if (targetValue === undefined || targetValue < 1) {
      return res.status(400).json({ message: 'Target value must be at least 1' });
    }
    
    // Find user's current target value
    const oldUserTarget = await UserTarget.findOne({ userId });
    const oldValue = oldUserTarget ? oldUserTarget.targetValue : 1;
    
    // Use upsert option to create a new record if it doesn't exist
    const userTarget = await UserTarget.findOneAndUpdate(
      { userId },
      { targetValue, updatedAt: Date.now() },
      { new: true, upsert: true, runValidators: true }
    );
    
    // Find all teams the user is a member of
    const teams = await Team.find({ members: userId });
    
    // Calculate the target value difference
    const valueDifference = targetValue - oldValue;
    
    // Update totalGoal for all teams the user is a member of
    for (const team of teams) {
      // Ensure totalGoal is not negative
      team.totalGoal = Math.max(0, team.totalGoal + valueDifference);
      await team.save();
    }
    
    res.status(200).json({
      userTarget,
      updatedTeams: teams.map(team => ({
        id: team._id,
        name: team.name,
        totalGoal: team.totalGoal
      }))
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update user target', error: error.message });
  }
});

// Reset user's target value to default and synchronize team's totalGoal
router.post('/reset', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Find user's current target value
    const oldUserTarget = await UserTarget.findOne({ userId });
    if (!oldUserTarget) {
      return res.status(404).json({ message: 'User target not found' });
    }
    const oldValue = oldUserTarget.targetValue;
    
    const userTarget = await UserTarget.findOneAndUpdate(
      { userId },
      { targetValue: 1, updatedAt: Date.now() }, // Reset to default value 1
      { new: true }
    );
    
    // Find all teams the user is a member of
    const teams = await Team.find({ members: userId });
    
    // Calculate the target value difference
    const valueDifference = 1 - oldValue; // New value(1) - old value
    
    // Update totalGoal for all teams the user is a member of
    for (const team of teams) {
      // Ensure totalGoal is not negative
      team.totalGoal = Math.max(0, team.totalGoal + valueDifference);
      await team.save();
    }
    
    res.status(200).json({
      userTarget,
      updatedTeams: teams.map(team => ({
        id: team._id,
        name: team.name,
        totalGoal: team.totalGoal
      }))
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to reset user target', error: error.message });
  }
});

// Get a specific user's target value (admin only)
router.get('/:userId', authMiddleware, async (req, res) => {
  try {
    // Additional permission checks can be added here to ensure requester is an admin
    
    const { userId } = req.params;
    const userTarget = await UserTarget.findOne({ userId });
    
    if (!userTarget) {
      return res.status(404).json({ message: 'User target not found' });
    }
    
    res.status(200).json(userTarget);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user target', error: error.message });
  }
});

module.exports = router;