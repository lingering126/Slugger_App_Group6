const Activity = require('../models/Activity');
const UserStats = require('../models/UserStats');
const Team = require('../models/Team');

// 获取活动类型列表
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

// 创建新活动
exports.createActivity = async (req, res) => {
  try {
    const { type, name, duration, description } = req.body;
    const userId = req.user._id;

    // 验证活动类型
    const activityTypes = await Activity.getActivityTypes();
    if (!activityTypes[type]?.some(t => t.name === name)) {
      return res.status(400).json({ message: 'Invalid activity type or name' });
    }

    // 创建活动并更新统计
    const activity = await Activity.createActivity({
      userId,
      type,
      name,
      duration,
      description
    });

    res.status(201).json(activity);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// 获取用户活动列表
exports.getUserActivities = async (req, res) => {
  try {
    const userId = req.user._id;
    const { type, startDate, endDate } = req.query;

    // 构建查询条件
    const query = { userId };
    if (type) query.type = type;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    // 获取活动列表
    const activities = await Activity.find(query)
      .sort({ date: -1 })
      .limit(50);

    // 获取活动统计
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

// 获取活动详情
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

// 更新活动状态
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

    // 如果活动状态改变，更新统计
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