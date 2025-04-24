const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

let mongoServer;

// Setup function to run before tests
const setupTestDB = async () => {
  try {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  } catch (error) {
    console.error('Error setting up test database:', error);
    throw error;
  }
};

// Cleanup function to run after tests
const teardownTestDB = async () => {
  try {
    await mongoose.disconnect();
    await mongoServer.stop();
  } catch (error) {
    console.error('Error tearing down test database:', error);
    throw error;
  }
};

// Clear all collections after each test
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

// Create a mock user and generate a valid JWT token
const createMockUserAndToken = () => {
  const mockUser = {
    _id: new mongoose.Types.ObjectId(),
    name: 'Test User',
    email: 'test@example.com'
  };

  const token = jwt.sign(
    { id: mockUser._id },
    process.env.JWT_SECRET || 'test-secret-key',
    { expiresIn: '1h' }
  );

  return { mockUser, token };
};

module.exports = {
  setupTestDB,
  teardownTestDB,
  clearDatabase,
  createMockUserAndToken
}; 