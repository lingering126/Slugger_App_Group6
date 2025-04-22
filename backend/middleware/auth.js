const jwt = require('jsonwebtoken');

const auth = async (req, res, next) => {
  try {
    console.log('\n=== Auth Middleware ===');
    
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('No token provided or invalid format');
    }

    const token = authHeader.split(' ')[1];
    console.log('Token received');

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key');
    console.log('Token verified successfully');
    console.log('User data:', decoded);

    // Add user info to request with both id and userId for compatibility
    req.user = {
      ...decoded,
      id: decoded.userId  // Add id field for compatibility
    };
    
    console.log('Final user object:', req.user);
    console.log('=== Auth Complete ===\n');
    next();
  } catch (error) {
    console.error('\n=== Auth Error ===');
    console.error('Error:', error.message);
    console.error('=== Error End ===\n');
    res.status(401).json({ message: 'Authentication failed' });
  }
};

module.exports = auth; 