const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { errorHandler } = require('./middleware/errorHandler');
const auth = require('./middleware/auth');
const activityRoutes = require('./routes/activities');
const homepageRoutes = require('./homepage/routes');
const userTargetRoutes = require('./routes/userTarget');
const teamRoutes = require('./routes/team'); // Added team routes
const profileRoutes = require('./routes/profiles'); // Added profile routes

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// 添加详细的请求日志中间件
app.use((req, res, next) => {
  console.log('\n=== Incoming Request ===');
  console.log(`Time: ${new Date().toISOString()}`);
  console.log(`Method: ${req.method}`);
  console.log(`URL: ${req.url}`);
  console.log('Headers:', req.headers);
  if (req.method !== 'GET') {
    console.log('Body:', req.body);
  }
  console.log('======================\n');
  next();
});

// Routes
const authRoutes = require('./routes/auth').router;
const postRoutes = require('./homepage/routes/posts');

// Public routes
app.use('/api/auth', authRoutes);

// Protected routes
app.use('/api/posts', auth, postRoutes);
app.use('/api/activities', auth, activityRoutes);
app.use('/api/homepage', auth, homepageRoutes);
app.use('/api/user-target', auth, userTargetRoutes);
app.use('/api/teams', auth, teamRoutes); // Added team routes usage
app.use('/api/profiles', auth, profileRoutes); // Added profile routes usage

// Error handling middleware
app.use(errorHandler);

module.exports = app;
