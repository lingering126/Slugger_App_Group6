const UserStats = require('../models/UserStats');
const Team = require('../models/Team');
const Activity = require('../../models/Activity');
const mongoose = require('mongoose');

// 获取用户统计数据
exports.getUserStats = async (req, res) => {
  try {
    console.log('\n=== Fetching User Stats ===');
    const userId = new mongoose.Types.ObjectId(req.user.id);
    console.log('User ID:', userId);
    
    if (!userId) {
      throw new Error('User ID is required but not found in request');
    }
    
    // 获取或创建用户统计数据
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

    // 获取用户所在的团队
    const teams = await Team.find({ 'members.userId': userId });
    console.log('Found teams:', teams.length);

    // 计算各类型活动的统计
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

    // 格式化统计数据
    const stats = {
      personal: {
        totalPoints: userStats.totalPoints || 0,
        pointsByType: Object.fromEntries(userStats.pointsByType || new Map()),
        activitiesCompleted: userStats.activitiesCompleted || 0,
        streak: userStats.streak || 0,
        progress: userStats.calculateProgress() || 0
      },
      teams: await Promise.all(teams.map(async team => ({
        teamId: team._id,
        teamName: team.name,
        progress: team.calculateProgress(),
        currentPoints: team.currentPoints || 0,
        targetPoints: team.targetPoints || 1000
      }))),
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

// 获取团队统计数据
exports.getTeamStats = async (req, res) => {
  try {
    const { teamId } = req.params;
    const userId = new mongoose.Types.ObjectId(req.user.id);

    // 验证用户是否在团队中
    const team = await Team.findOne({
      _id: teamId,
      'members.userId': userId
    });

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found or user not in team'
      });
    }

    // 获取团队成员的统计数据
    const memberStats = await Promise.all(team.members.map(async member => {
      const userStats = await UserStats.findOne({ userId: member.userId });
      return {
        userId: member.userId,
        totalPoints: userStats ? userStats.totalPoints : 0,
        joinDate: member.joinDate
      };
    }));

    // 获取团队活动统计
    const teamActivities = await Activity.aggregate([
      { 
        $match: { 
          userId: { 
            $in: team.members.map(m => m.userId) 
          }
        } 
      },
      {
        $group: {
          _id: '$type',
          totalPoints: { $sum: '$points' },
          count: { $sum: 1 }
        }
      }
    ]);

    const stats = {
      teamInfo: {
        name: team.name,
        progress: team.calculateProgress(),
        currentPoints: team.currentPoints || 0,
        targetPoints: team.targetPoints || 1000
      },
      memberStats: memberStats,
      activityStats: teamActivities.reduce((acc, stat) => {
        acc[stat._id] = {
          points: stat.totalPoints || 0,
          count: stat.count || 0
        };
        return acc;
      }, {})
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('\n=== Team Stats Error ===');
    console.error('Error details:', error);
    console.error('Stack trace:', error.stack);
    console.error('=== Error End ===\n');
    
    res.status(500).json({ 
      success: false,
      message: 'Error fetching team statistics',
      error: error.message 
    });
  }
};

// 更新用户目标
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
    console.error('\n=== Update Target Error ===');
    console.error('Error details:', error);
    console.error('Stack trace:', error.stack);
    console.error('=== Error End ===\n');
    
    res.status(400).json({
      success: false,
      message: 'Error updating target points',
      error: error.message
    });
  }
}; 