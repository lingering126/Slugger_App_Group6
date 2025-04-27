const UserStats = require('../models/UserStats');
const Activity = require('../../models/Activity');
const mongoose = require('mongoose');

// Get user statistics data
exports.getUserStats = async (req, res) => {
  try {
    console.log('\n=== Fetching User Stats ===');
    const userId = new mongoose.Types.ObjectId(req.user.id);
    console.log('User ID:', userId);
    
    if (!userId) {
      throw new Error('User ID is required but not found in request');
    }
    
    // Get or create user statistics data
    let userStats = await UserStats.findOne({ userId });
    if (!userStats) {
      console.log('Creating new UserStats record');
      userStats = await UserStats.create({ 
        userId,
        totalPoints: 0,
        pointsByType: new Map(),
        activitiesCompleted: 0,
        streak: 0,
        targetPoints: 1000
      });
    }

    // Calculate statistics for each activity type
    console.log('Calculating activity statistics...');
    const activityStats = await Activity.aggregate([
      { $match: { userId } },
      { $group: {
        _id: '$type',
        totalPoints: { $sum: '$points' },
        count: { $sum: 1 }
      }}
    ]);
    console.log('Activity stats calculated:', activityStats);

    // Format statistics data
    const stats = {
      personal: {
        totalPoints: userStats.totalPoints || 0,
        pointsByType: Object.fromEntries(userStats.pointsByType || new Map()),
        activitiesCompleted: userStats.activitiesCompleted || 0,
        streak: userStats.streak || 0,
        progress: userStats.calculateProgress() || 0
      },
      activityBreakdown: activityStats.reduce((acc, stat) => {
        acc[stat._id] = {
          points: stat.totalPoints || 0,
          count: stat.count || 0,
          progress: userStats.calculateTypeProgress(stat._id) || 0
        };
        return acc;
      }, {})
    };

    console.log('Stats prepared successfully');
    console.log('=== User Stats Fetch Complete ===\n');

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('\n=== User Stats Error ===');
    console.error('Error details:', error);
    console.error('Stack trace:', error.stack);
    console.error('Request user object:', req.user);
    console.error('=== Error End ===\n');
    
    res.status(500).json({ 
      success: false,
      message: 'Error fetching user statistics',
      error: error.message 
    });
  }
};

// Update user target
exports.updateUserTarget = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const { targetPoints } = req.body;

    if (!targetPoints || targetPoints <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid target points'
      });
    }

    const userStats = await UserStats.findOneAndUpdate(
      { userId },
      { targetPoints },
      { new: true, upsert: true }
    );

    res.json({
      success: true,
      data: {
      targetPoints: userStats.targetPoints,
      progress: userStats.calculateProgress()
      }
    });
  } catch (error) {
    console.error('Error updating user target:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating user target',
      error: error.message
    });
  }
}; 