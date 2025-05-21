const jwt = require('jsonwebtoken');

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
    console.log('Decoded token:', JSON.stringify(decoded, null, 2));
    
    // Find the user ID from multiple possible fields in the token
    const userId = decoded.userId || decoded._id || decoded.id || decoded.sub;
    
    if (!userId) {
      console.error('No user ID found in token:', JSON.stringify(decoded, null, 2));
      return res.status(401).json({ message: 'Invalid token: No user ID found' });
    }
    
    // Ensure user ID is set correctly
    req.user = {
      id: userId,  // Set the primary ID field
      // Add alternative ID fields for backward compatibility
      userId: userId,
      _id: userId,
      // Include all other token payload properties
      ...decoded
    };
    
    console.log('Set user in request:', JSON.stringify(req.user, null, 2));
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({ message: 'Invalid token' });
  }
};

module.exports = authMiddleware;
