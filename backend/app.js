const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { errorHandler } = require('./middleware/errorHandler');
const auth = require('./middleware/auth');

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
  console.log('Body:', req.body);
  console.log('======================\n');
  next();
});

// Routes
const authRoutes = require('./routes/auth');
const postRoutes = require('./homepage/routes/posts');

// Public routes
app.use('/api/auth', authRoutes);

// Protected routes
app.use('/api/posts', auth, postRoutes);

// Error handling middleware
app.use(errorHandler);

module.exports = app; 