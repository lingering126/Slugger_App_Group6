const jwt = require('jsonwebtoken');
const User = require('../models/user');

/**
 * Authentication middleware for the main API routes
 * 
 * Verifies JWT token from Authorization header and attaches user to the request.
 * Performs database lookup to verify the user still exists.
 */
const auth = async (req, res, next) => {
  try {
    // Extract and validate token from Authorization header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Decode token and find corresponding user
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Attach user to request for use in route handlers
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
};

module.exports = auth; 