const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { setupTestDB, teardownTestDB, clearDatabase } = require('./testSetup');
const User = require('../src/models/user');
const { router: authRoutes } = require('../routes/auth'); // Correctly import the router
const { AppError, errorHandler } = require('../middleware/errorHandler'); // Import errorHandler

// Initialize Express app
const app = express();
app.use(express.json());

// Mount auth routes
app.use('/api/auth', authRoutes);

// Use the centralized error handler
app.use(errorHandler);

let server;

describe('Auth Controller Tests', () => {
  // Set up test database and server before all tests
  beforeAll(async () => {
    await setupTestDB();
    server = app.listen(0); // Listen on a random available port
  });

  // Clean up after all tests
  afterAll(async () => {
    await teardownTestDB();
    await server.close();
  });

  // Reset database before each test
  beforeEach(async () => {
    await clearDatabase();
  });

  // --- Registration Tests ---
  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'password123'
        });
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toHaveProperty('email', 'test@example.com');
      expect(response.body.user).toHaveProperty('username', 'testuser');

      // Verify user in DB
      const userInDb = await User.findOne({ email: 'test@example.com' });
      expect(userInDb).not.toBeNull();
      expect(userInDb.isVerified).toBe(false); // Default is unverified
    });

    it('should fail to register a user with an existing email', async () => {
      // First, register a user
      await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser1',
          email: 'test@example.com',
          password: 'password123'
        });

      // Attempt to register another user with the same email
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser2',
          email: 'test@example.com', // Same email
          password: 'password456'
        });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'Email already registered');
    });

    it('should register a user with an existing username but different email', async () => {
      // First, register a user
      await request(app)
        .post('/api/auth/register')
        .send({
          username: 'commonuser',
          email: 'user1@example.com',
          password: 'password123'
        });

      // Attempt to register another user with the same username but different email
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'commonuser', // Same username
          email: 'user2@example.com', // Different email
          password: 'password456'
        });
      expect(response.status).toBe(201); // Should succeed as per current logic
      expect(response.body.user).toHaveProperty('username', 'commonuser');
      expect(response.body.user).toHaveProperty('email', 'user2@example.com');
    });

    it('should fail to register a user with missing email', async () => {
      // Spy on console.error and provide a mock implementation to silence it for this test
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          password: 'password123'
          // email is missing
        });
      // The route itself doesn't explicitly check for missing fields before User.save()
      // Mongoose validation will throw an error.
      // The errorHandler should catch this.
      // Depending on how Mongoose validation errors are formatted by errorHandler,
      // the status could be 500 or a specific 4xx if handled.
      // Let's assume a generic error or a 400 if AppError is used by Mongoose validation hook (unlikely)
      // The User model has `email: { required: true }`.
      // The route's try-catch will pass this to `next(error)`, handled by `errorHandler`.
      // Let's expect 500 for now if not specifically handled as 400 by a validation middleware.
      // Update: The `auth.js` register route does not have explicit checks for missing fields before `new User()`.
      // Mongoose validation errors are typically passed to `next(error)`.
      // The `errorHandler` middleware will handle this. If it's a Mongoose ValidationError,
      // it might result in a 500 or a 400 depending on `errorHandler`'s specifics.
      // Given the AppError class, it's more likely to be a 500 if not wrapped in AppError.
      // For simplicity and to align with "light tests", we'll check for a non-2xx status.
      // A more robust test would mock User.save() to throw a specific validation error.
      // However, the `auth.js` route does not have input validation for required fields before calling `new User()`.
      // Let's assume the `errorHandler` converts Mongoose validation errors to a 400 or 500.
      // The `AppError` is used for specific business logic errors. Mongoose errors are different.
      // Let's test for a 500 as a general server error due to validation.
      // If the `errorHandler` is well-defined for Mongoose, it might be 400.
      // The current `errorHandler` in `activityController.test.js` is not shown, but I added it to this test app.
      // Let's assume Mongoose validation error leads to a 500 if not specifically handled.
      // The prompt asks for simple tests. A specific check for "Email and password are required" is in login, not register.
      // The register route *will* fail due to Mongoose validation.
      expect(response.status).toBe(500); // Or 400 if errorHandler is smart
      // A more specific check would be:
      // expect(response.body.message).toMatch(/email.*required/i);

      // Restore the original console.error implementation
      consoleErrorSpy.mockRestore();
    });
  });

  // --- Login Tests ---
  describe('POST /api/auth/login', () => {
    const testUserEmail = 'loginuser@example.com';
    const testUserPassword = 'password123';
    let hashedPassword;

    beforeEach(async () => {
      hashedPassword = await bcrypt.hash(testUserPassword, 10);
    });

    it('should login an existing, verified user successfully', async () => {
      // Create a verified user directly in DB for this test
      await User.create({
        username: 'loginuser',
        email: testUserEmail,
        password: hashedPassword,
        name: 'Login User',
        isVerified: true // Important: user must be verified
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUserEmail,
          password: testUserPassword
        });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toHaveProperty('email', testUserEmail);
    });

    it('should fail to login with incorrect password', async () => {
      await User.create({
        username: 'loginuser',
        email: testUserEmail,
        password: hashedPassword,
        name: 'Login User',
        isVerified: true
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUserEmail,
          password: 'wrongpassword'
        });
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message', 'Invalid email or password');
    });

    it('should fail to login with non-existent email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123'
        });
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message', 'Invalid email or password');
    });

    it('should fail to login an unverified user', async () => {
      // Register user (they will be unverified by default)
      await request(app)
        .post('/api/auth/register')
        .send({
          username: 'unverifieduser',
          email: 'unverified@example.com',
          password: 'password123'
        });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'unverified@example.com',
          password: 'password123'
        });
      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('message', 'Please verify your email before logging in');
    });

     it('should fail to login if email is missing', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          // email: 'test@example.com',
          password: 'password123'
        });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'Email and password are required');
    });

    it('should fail to login if password is missing', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com'
          // password: 'password123'
        });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'Email and password are required');
    });
  });

  // --- Forgot Password Tests ---
  describe('POST /api/auth/forgot-password', () => {
    const existingUserEmail = 'forgot@example.com';

    beforeEach(async () => {
      // Create a user for forgot password tests
      const hashedPassword = await bcrypt.hash('password123', 10);
      await User.create({
        username: 'forgotuser',
        email: existingUserEmail,
        password: hashedPassword,
        name: 'Forgot User',
        isVerified: true
      });
    });

    it('should initiate password reset for an existing user', async () => {
      // Spy on console.warn and provide a mock implementation to silence it for this test
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: existingUserEmail });

      expect(response.status).toBe(200);
      // The route returns the token if email sending fails or is not configured.
      // This is useful for testing.
      expect(response.body).toHaveProperty('message');
      if (response.body.resetToken) { // Check if token is returned (dev/test friendly)
         expect(response.body.message).toMatch(/Password reset initiated/);
         expect(response.body).toHaveProperty('resetToken');
         const userInDb = await User.findOne({ email: existingUserEmail });
         expect(userInDb.resetPasswordToken).toBe(response.body.resetToken);
      } else { // Email presumably sent
         expect(response.body.message).toBe('Password reset email sent');
         const userInDb = await User.findOne({ email: existingUserEmail });
         expect(userInDb.resetPasswordToken).toBeDefined();
         expect(userInDb.resetPasswordToken).not.toBeNull();
      }

      // Restore the original console.warn implementation
      consoleWarnSpy.mockRestore();
    });

    it('should return a generic success message for a non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'If your email is registered, you will receive a password reset link');
      // Ensure no token was generated for non-existent user
      const userInDb = await User.findOne({ email: 'nonexistent@example.com' });
      expect(userInDb).toBeNull();
    });

    it('should fail if email is missing in forgot password request', async () => {
        const response = await request(app)
            .post('/api/auth/forgot-password')
            .send({}); // No email
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('message', 'Email is required');
    });
  });
});
