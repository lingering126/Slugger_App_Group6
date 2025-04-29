const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../src/models/user');

let mongoServer;

// 连接到测试数据库
const setupTestDB = async () => {
  try {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
  } catch (error) {
    console.error('Error connecting to test database:', error);
    throw error;
  }
};

// 断开数据库连接
const teardownTestDB = async () => {
  try {
    await mongoose.disconnect();
    await mongoServer.stop();
  } catch (error) {
    console.error('Error closing database connection:', error);
    throw error;
  }
};

// 清空数据库
const clearDatabase = async () => {
  try {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany();
    }
  } catch (error) {
    console.error('Error clearing database:', error);
    throw error;
  }
};

// 创建模拟用户和令牌
const createMockUserAndToken = async () => {
  const mockUser = new User({
    name: 'Test User',
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123'
  });
  await mockUser.save();
  
  const token = jwt.sign(
    { id: mockUser._id },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '1h' }
  );
  
  return { user: mockUser, token };
};

module.exports = {
  setupTestDB,
  teardownTestDB,
  clearDatabase,
  createMockUserAndToken
}; 