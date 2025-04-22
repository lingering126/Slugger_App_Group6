const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activityController');
const postController = require('../controllers/postController');
const statsController = require('../controllers/statsController');
const auth = require('../../middleware/auth');

// 中间件：检查用户是否已认证
const isAuthenticated = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  next();
};

// 活动相关路由
router.get('/activities/types', activityController.getActivityTypes);
router.post('/activities', auth, activityController.createActivity);
router.get('/activities', auth, activityController.getUserActivities);
router.get('/activities/:id', auth, activityController.getActivityById);
router.put('/activities/:id/status', auth, activityController.updateActivityStatus);

// 帖子相关路由
router.post('/posts', auth, postController.createPost);
router.get('/posts', auth, postController.getPosts);
router.post('/posts/:postId/comments', auth, postController.addComment);

// 统计相关路由
router.get('/user', auth, statsController.getUserStats);
router.get('/team/:teamId', auth, statsController.getTeamStats);
router.put('/user/target', auth, statsController.updateUserTarget);

module.exports = router; 