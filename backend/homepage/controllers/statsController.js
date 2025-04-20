const UserStats = require('../models/UserStats');
const Team = require('../models/Team');
const Activity = require('../models/Activity');

// 获取用户统计数据
exports.getUserStats = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // 获取或创建用户统计数据
    let userStats = await UserStats.findOne({ userId });
    if (!userStats) {
      userStats = await UserStats.create({ userId });
    }

    // 获取用户所在的团队
    const teams = await Team.find({ 'members.userId': userId });

    // 计算各类型活动的统计
    const activityStats = await Activity.aggregate([
      { $match: { userId: userId } },
      { $group: {
        _id: '$type',
        totalPoints: { $sum: '$points' },
        count: { $sum: 1 }
      }}
    ]);

    // 格式化统计数据
    const stats = {
      personal: {
        totalPoints: userStats.totalPoints,
        pointsByType: userStats.pointsByType,
        activitiesCompleted: userStats.activitiesCompleted,
        streak: userStats.streak,
        progress: userStats.calculateProgress()
      },
      teams: await Promise.all(teams.map(async team => ({
        teamId: team._id,
        teamName: team.name,
        progress: team.calculateProgress(),
        currentPoints: team.currentPoints,
        targetPoints: team.targetPoints
      }))),
      activityBreakdown: activityStats.reduce((acc, stat) => {
        acc[stat._id] = {
          points: stat.totalPoints,
          count: stat.count,
          progress: userStats.calculateTypeProgress(stat._id)
        };
        return acc;
      }, {})
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 获取团队统计数据
exports.getTeamStats = async (req, res) => {
  try {
    const { teamId } = req.params;
    const userId = req.user._id;

    // 验证用户是否在团队中
    const team = await Team.findOne({
      _id: teamId,
      'members.userId': userId
    });

    if (!team) {
      return res.status(404).json({ message: 'Team not found or user not in team' });
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
        currentPoints: team.currentPoints,
        targetPoints: team.targetPoints
      },
      memberStats: memberStats,
      activityStats: teamActivities.reduce((acc, stat) => {
        acc[stat._id] = {
          points: stat.totalPoints,
          count: stat.count
        };
        return acc;
      }, {})
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 更新用户目标
exports.updateUserTarget = async (req, res) => {
  try {
    const userId = req.user._id;
    const { targetPoints } = req.body;

    if (!targetPoints || targetPoints <= 0) {
      return res.status(400).json({ message: 'Invalid target points' });
    }

    const userStats = await UserStats.findOneAndUpdate(
      { userId },
      { targetPoints },
      { new: true, upsert: true }
    );

    res.json({
      targetPoints: userStats.targetPoints,
      progress: userStats.calculateProgress()
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}; 