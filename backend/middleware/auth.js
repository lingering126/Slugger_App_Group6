const jwt = require('jsonwebtoken');

/**
 * Authentication Middleware
 * 
 * Verifies JWT tokens from the Authorization header and sets the user object in the request.
 * Provides compatibility with different token formats by supporting both userId and id fields.
 * 
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next middleware function
 * @returns {void} Calls next() if authenticated or returns 401 response if not
 */
const authMiddleware = (req, res, next) => {
  // Check if Authorization header exists
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: 'No token provided' });
  }
  
  // Extract token from 'Bearer [token]' format
  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Invalid token format' });
  }
  
  try {
    // Verify token with JWT secret from environment or fallback
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key');
    
    // Add compatibility handling: ensure req.user contains id field
    req.user = {
      ...decoded,
      id: decoded.userId || decoded.id  // Support both possible id fields
    };
    
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

module.exports = authMiddleware;
