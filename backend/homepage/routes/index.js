const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activityController');
const postController = require('../controllers/postController');
const statsController = require('../controllers/statsController');
const auth = require('../../middleware/auth');

// Middleware: Check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  next();
};

// Activity-related routes
router.get('/activities/types', activityController.getActivityTypes);
router.post('/activities', auth, activityController.createActivity);
router.get('/activities', auth, activityController.getUserActivities);
router.get('/activities/:id', auth, activityController.getActivityById);
router.put('/activities/:id/status', auth, activityController.updateActivityStatus);

// Post-related routes
router.post('/posts', auth, postController.createPost);
router.get('/posts', auth, postController.getPosts);
router.post('/posts/:postId/comments', auth, postController.addComment);

// Statistics-related routes
router.get('/test-stats', (req, res) => {
  res.status(200).json({ message: 'Stats test route is working!' });
});
// Rely on authMiddleware applied at the group level in server.js
router.get('/user', statsController.getUserStats); 
router.put('/user/target', statsController.updateUserTarget); 
router.post('/user/reset-weekly', statsController.resetWeeklyStats);

module.exports = router;
