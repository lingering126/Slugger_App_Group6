const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

/**
 * Authentication middleware
 * Verifies the JWT token and sets user information in the request object
 */
const authMiddleware = async (req, res, next) => {
  console.log('==== Auth Middleware START ====');

  try {
    // Check if authorization header exists
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      console.error('No authorization header provided');
      return res.status(401).json({ message: 'No token provided' });
    }

    // Extract token from Bearer format
    const token = authHeader.split(' ')[1];
    if (!token) {
      console.error('Invalid token format in header:', authHeader);
      return res.status(401).json({ message: 'Invalid token format' });
    }

    let decoded;
    try {
      // Verify token
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key');
      console.log('Decoded token:', JSON.stringify(decoded, null, 2));
    } catch (jwtError) {
      console.error('JWT verification error:', jwtError.message);
      return res.status(401).json({ message: 'Invalid token: ' + jwtError.message });
    }

    // Look for user identifier in various locations
    const possibleIds = [
      decoded.userId,
      decoded._id,
      decoded.id,
      decoded.sub
    ].filter(id => id); // Filter out undefined/null values

    if (possibleIds.length === 0) {
      console.error('No user ID found in token:', JSON.stringify(decoded, null, 2));
      return res.status(401).json({ message: 'Invalid token: No user ID found' });
    }

    // Use the first valid ID found
    const userId = possibleIds[0];
    console.log('Using user ID:', userId);

    // Set user object with ID for mongoose operations
    req.user = {
      id: userId,
      userId: userId, // For backwards compatibility
      _id: userId,    // For backwards compatibility
      ...decoded      // Include all other token payload properties
    };

    // Explicitly ensure string format for Mongoose
    if (mongoose.Types.ObjectId.isValid(userId)) {
      req.user.mongoId = mongoose.Types.ObjectId(userId);
    } else {
      console.warn('User ID is not a valid MongoDB ObjectId:', userId);
    }

    console.log('User set in request:', JSON.stringify(req.user, null, 2));
    console.log('==== Auth Middleware END - SUCCESS ====');
    next();
  } catch (error) {
    console.error('==== Auth Middleware END - ERROR ====');
    console.error('Unhandled error in auth middleware:', error);
    return res.status(401).json({ message: 'Authentication failed: ' + error.message });
  }
};

module.exports = authMiddleware;
