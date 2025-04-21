const jwt = require('jsonwebtoken');
const { AppError } = require('./errorHandler');

const auth = async (req, res, next) => {
  try {
    // 获取并检查 Authorization header
    const authHeader = req.header('Authorization');
    if (!authHeader) {
      throw new AppError('No Authorization header', 401);
    }

    // 确保 header 格式正确
    if (!authHeader.startsWith('Bearer ')) {
      throw new AppError('Invalid Authorization format', 401);
    }

    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      throw new AppError('No token provided', 401);
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key');
      
      // 确保解码后的数据包含必要信息
      if (!decoded.userId) {
        throw new AppError('Invalid token format', 401);
      }

      // Map userId to id for consistency
      req.user = {
        ...decoded,
        id: decoded.userId
      };

      console.log('Authentication successful:', {
        userId: req.user.id,
        token: token.substring(0, 10) + '...' // 只记录 token 的前10个字符
      });

      next();
    } catch (jwtError) {
      console.error('JWT verification failed:', jwtError.message);
      throw new AppError('Invalid or expired token', 401);
    }
  } catch (error) {
    console.error('Authentication error:', error.message);
    next(error);
  }
};

module.exports = auth; 