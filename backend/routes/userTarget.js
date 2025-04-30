const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const UserTarget = require('./models/userTarget');

// @route   GET api/user-target
// @desc    Get user target
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const userTarget = await UserTarget.findOne({ userId });
    
    if (!userTarget) {
      return res.status(404).json({ msg: 'User target not found' });
    }
    
    res.json(userTarget);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/user-target
// @desc    Create or update user target
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const { targetValue } = req.body;
    const userId = req.user.id;
    
    // 验证目标值范围
    if (targetValue < 1 || targetValue > 7) {
      return res.status(400).json({ msg: 'Target value must be between 1 and 7' });
    }
    
    // 查找并更新用户目标，如果不存在则创建新的
    let userTarget = await UserTarget.findOne({ userId });
    
    if (userTarget) {
      // 更新现有目标
      userTarget.targetValue = targetValue;
      await userTarget.save();
    } else {
      // 创建新目标
      userTarget = new UserTarget({
        userId,
        targetValue
      });
      await userTarget.save();
    }
    
    res.json(userTarget);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   DELETE api/user-target
// @desc    Delete user target
// @access  Private
router.delete('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const userTarget = await UserTarget.findOneAndDelete({ userId });
    
    if (!userTarget) {
      return res.status(404).json({ msg: 'User target not found' });
    }
    
    res.json({ msg: 'User target removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;