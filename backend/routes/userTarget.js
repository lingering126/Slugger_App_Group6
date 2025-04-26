const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const UserTarget = require('../models/userTarget');
const Team = require('../models/team');

/**
 * 处理用户ID的帮助函数，尝试将字符串ID转换为ObjectId
 * @param {string} id 用户ID字符串
 * @returns {mongoose.Types.ObjectId|string} 转换后的ObjectId或原始字符串
 */
const handleUserId = (id) => {
  try {
    return mongoose.Types.ObjectId(id);
  } catch (error) {
    // 如果转换失败，返回原始字符串
    return id;
  }
};

/**
 * 更新用户所在团队的目标值
 * @param {string} userId 用户ID
 * @returns {Promise<number>} 已更新的团队数量
 */
async function updateTeamTargetValues(userId) {
  try {
    const objectId = handleUserId(userId);
    // 查找用户所在的所有团队
    const teams = await Team.find({ members: objectId });
    
    // 触发每个团队的保存，以重新计算目标值
    for (const team of teams) {
      await team.save();
    }
    
    return teams.length;
  } catch (error) {
    console.error('更新团队目标值时出错:', error);
    throw error;
  }
}

/**
 * @route GET /
 * @desc 获取所有用户目标
 * @access Private/Admin (可根据需要设置权限)
 */
router.get('/all', async (req, res) => {
  try {
    const userTargets = await UserTarget.find().populate('userId', 'name email');
    res.status(200).json(userTargets);
  } catch (error) {
    console.error('获取所有用户目标时出错:', error);
    res.status(500).json({ message: '获取用户目标失败', error: error.message });
  }
});

/**
 * @route GET /
 * @desc 获取单个用户目标
 * @access Private
 */
router.get('/', async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ message: '用户ID是必需的' });
    }
    
    const objectId = handleUserId(userId);
    const userTarget = await UserTarget.findOne({ userId: objectId });
    
    if (!userTarget) {
      return res.status(404).json({ message: '未找到用户目标' });
    }
    
    res.status(200).json(userTarget);
  } catch (error) {
    console.error('获取用户目标时出错:', error);
    res.status(500).json({ message: '获取用户目标失败', error: error.message });
  }
});

/**
 * @route POST /
 * @desc 创建新用户目标
 * @access Private
 */
router.post('/', async (req, res) => {
  try {
    const { userId, weeklyTarget } = req.body;

    // 验证输入
    if (!userId) {
      return res.status(400).json({ message: '用户ID是必需的' });
    }
    
    if (weeklyTarget === undefined || isNaN(weeklyTarget) || weeklyTarget < 0 || weeklyTarget > 7) {
      return res.status(400).json({ message: '需要有效的每周目标值(0-7)' });
    }

    const objectId = handleUserId(userId);
    
    // 检查用户目标是否已存在
    let userTarget = await UserTarget.findOne({ userId: objectId });

    if (userTarget) {
      return res.status(400).json({ message: '用户目标已存在，请使用PUT请求更新' });
    }

    // 创建新用户目标
    userTarget = new UserTarget({
      userId: objectId,
      weeklyTarget
    });

    // 保存用户目标
    await userTarget.save();
    
    // 更新相关团队的目标值
    const teamsUpdated = await updateTeamTargetValues(userId);
    console.log(`已更新${teamsUpdated}个团队的目标值`);

    res.status(201).json({
      message: '用户目标创建成功',
      userTarget,
      teamsUpdated
    });
  } catch (error) {
    console.error('创建用户目标时出错:', error);
    res.status(500).json({ message: '创建用户目标失败', error: error.message });
  }
});

/**
 * @route PUT /
 * @desc 更新用户目标
 * @access Private
 */
router.put('/', async (req, res) => {
  try {
    const { userId, weeklyTarget } = req.body;
    
    // 验证输入
    if (!userId) {
      return res.status(400).json({ message: '用户ID是必需的' });
    }
    
    if (weeklyTarget === undefined || isNaN(weeklyTarget) || weeklyTarget < 0 || weeklyTarget > 7) {
      return res.status(400).json({ message: '需要有效的每周目标值(0-7)' });
    }
    
    const objectId = handleUserId(userId);
    
    // 查找并更新用户目标，如果不存在则创建新的
    let userTarget = await UserTarget.findOne({ userId: objectId });
    
    if (!userTarget) {
      // 创建新用户目标
      userTarget = new UserTarget({
        userId: objectId,
        weeklyTarget
      });
    } else {
      // 更新现有用户目标
      userTarget.weeklyTarget = weeklyTarget;
    }
    
    // 保存用户目标
    await userTarget.save();
    
    // 更新相关团队的目标值
    const teamsUpdated = await updateTeamTargetValues(userId);
    console.log(`已更新${teamsUpdated}个团队的目标值`);
    
    res.status(200).json({
      message: '用户目标更新成功',
      userTarget,
      teamsUpdated
    });
  } catch (error) {
    console.error('更新用户目标时出错:', error);
    res.status(500).json({ message: '更新用户目标失败', error: error.message });
  }
});

/**
 * @route DELETE /
 * @desc 删除用户目标
 * @access Private
 */
router.delete('/', async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ message: '用户ID是必需的' });
    }
    
    const objectId = handleUserId(userId);
    
    // 查找并删除用户目标
    const userTarget = await UserTarget.findOneAndDelete({ userId: objectId });
    
    if (!userTarget) {
      return res.status(404).json({ message: '未找到用户目标' });
    }
    
    // 更新相关团队的目标值
    await updateTeamTargetValues(userId);
    
    res.status(200).json({ message: '用户目标删除成功', userTarget });
  } catch (error) {
    console.error('删除用户目标时出错:', error);
    res.status(500).json({ message: '删除用户目标失败', error: error.message });
  }
});

module.exports = router;