const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../src/models/user');
const UserTarget = require('../models/userTarget');
const { AppError } = require('../middleware/errorHandler');

// Temporary user storage (replace with database in production)
const users = [
  {
    id: '1',
    email: 'test@example.com',
    password: 'test123',
    name: 'Test User'
  }
];

// Login route
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      throw new AppError('Email and password are required', 400);
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    // Check if user is verified
    if (!user.isVerified) {
      throw new AppError('Please verify your email before logging in', 403);
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new AppError('Invalid email or password', 401);
    }

    // Create token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'fallback_secret_key',
      { expiresIn: '7d' }
    );

    // Send response
    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        avatar: user.avatar
      }
    });
  } catch (error) {
    next(error);
  }
});

// Register route
router.post('/register', async (req, res, next) => {
  try {
    const { username, password, email } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new AppError('Email already registered', 400);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = new User({
      username,
      password: hashedPassword,
      email,
      name: username,
      isVerified: false
    });

    await newUser.save();

    // Create UserTarget for the new user
    const newUserTarget = new UserTarget({
      userId: newUser._id,
      weeklyTarget: 1 // Default weekly target
    });
    
    await newUserTarget.save();

    // Create token
    const token = jwt.sign(
      { userId: newUser._id, username: newUser.name },
      process.env.JWT_SECRET || 'fallback_secret_key',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      token,
      user: {
        id: newUser._id,
        username: newUser.name,
        email: newUser.email
      }
    });
  } catch (error) {
    next(error);
  }
});

// Authentication middleware
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: 'No token provided' });
  }
  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Invalid token format' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key');
    console.log('Decoded token:', decoded);
    
    // 确保设置正确的用户ID
    req.user = {
      id: decoded.userId || decoded._id,  // 尝试两种可能的ID字段
      ...decoded
    };
    
    console.log('Set user in request:', req.user);
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// Export router and middleware separately
module.exports.router = router;
module.exports.authMiddleware = authMiddleware;