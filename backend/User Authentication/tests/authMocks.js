/**
 * Authentication Test Mocks
 * 
 * This file provides mock functions and data for authentication tests
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../../src/models/user');

/**
 * Create a verified user in the test database
 * @param {Object} userData Optional user data to override defaults
 * @returns {Promise<Object>} User object and auth token
 */
const createVerifiedUser = async (userData = {}) => {
  const defaultUserData = {
    email: 'verified@example.com',
    password: 'Password123!',
    name: 'Verified User',
    username: 'verifieduser',
  };

  const mergedData = { ...defaultUserData, ...userData };
  const hashedPassword = await bcrypt.hash(mergedData.password, 10);
  
  const user = new User({
    email: mergedData.email,
    password: hashedPassword,
    name: mergedData.name,
    username: mergedData.username,
    isVerified: true
  });
  
  await user.save();
  
  const token = jwt.sign(
    { userId: user._id },
    process.env.JWT_SECRET || 'test-jwt-secret',
    { expiresIn: '1h' }
  );
  
  return { user, token, rawPassword: mergedData.password };
};

/**
 * Create an unverified user in the test database
 * @param {Object} userData Optional user data to override defaults
 * @returns {Promise<Object>} User object with verification token
 */
const createUnverifiedUser = async (userData = {}) => {
  const defaultUserData = {
    email: 'unverified@example.com',
    password: 'Password123!',
    name: 'Unverified User',
    username: 'unverifieduser',
  };
  
  const mergedData = { ...defaultUserData, ...userData };
  const hashedPassword = await bcrypt.hash(mergedData.password, 10);
  
  // Generate verification token
  const crypto = require('crypto');
  const verificationToken = crypto.randomBytes(16).toString('hex');
  
  const user = new User({
    email: mergedData.email,
    password: hashedPassword,
    name: mergedData.name,
    username: mergedData.username,
    isVerified: false,
    verificationToken,
    verificationTokenExpires: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
  });
  
  await user.save();
  
  return { 
    user, 
    verificationToken,
    rawPassword: mergedData.password 
  };
};

/**
 * Generate sample user data
 * @returns {Object} Sample user registration data
 */
const getSampleUserData = () => ({
  email: `user-${Date.now()}@example.com`,
  password: 'StrongP@ssw0rd123',
  name: 'Sample User',
  username: `user-${Date.now()}`
});

/**
 * Mock nodemailer transport
 * @returns {Object} Mock nodemailer transport
 */
const getMockMailTransport = () => ({
  sendMail: jest.fn().mockImplementation((mailOptions) => {
    return Promise.resolve({
      messageId: 'mock-message-id',
      envelope: {
        from: mailOptions.from,
        to: [mailOptions.to]
      }
    });
  })
});

// Mock email validation regex (common regex for email validation)
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// Mock password validation (at least 8 chars, with uppercase, lowercase, number, special character)
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

module.exports = {
  createVerifiedUser,
  createUnverifiedUser,
  getSampleUserData,
  getMockMailTransport,
  EMAIL_REGEX,
  PASSWORD_REGEX
}; 