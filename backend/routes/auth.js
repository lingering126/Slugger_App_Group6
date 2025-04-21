const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
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
router.post('/login', (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      throw new AppError('Email and password are required', 400);
    }

    // Find user
    const user = users.find(u => u.email === email);
    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    // Check password
    if (user.password !== password) {
      throw new AppError('Invalid email or password', 401);
    }

    // Create token
    const token = jwt.sign(
      { userId: user.id, username: user.name },
      process.env.JWT_SECRET || 'fallback_secret_key',
      { expiresIn: '24h' }
    );

    // Send response
    res.json({
      token,
      user: {
        id: user.id,
        username: user.name,
        email: user.email
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
    if (users.find(u => u.email === email)) {
      throw new AppError('Email already registered', 400);
    }

    // Create new user
    const newUser = {
      id: String(users.length + 1),
      username,
      password,
      email,
      name: username
    };

    users.push(newUser);

    // Create token
    const token = jwt.sign(
      { userId: newUser.id, username: newUser.name },
      process.env.JWT_SECRET || 'fallback_secret_key',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      token,
      user: {
        id: newUser.id,
        username: newUser.name,
        email: newUser.email
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router; 