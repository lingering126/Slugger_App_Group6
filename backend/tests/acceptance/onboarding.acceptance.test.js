const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { setupTestDB, teardownTestDB, clearDatabase } = require('../testSetup');
const User = require('../../src/models/user'); // Adjusted path
const { router: authRoutes } = require('../../routes/auth'); // Actual auth router
const homepageRoutes = require('../../homepage/routes/index'); // Actual homepage router
const { errorHandler } = require('../../middleware/errorHandler');
const authMiddleware = require('../../middleware/auth'); // Corrected import

// Create a test app that mirrors the main app's routing structure
const app = express();
app.use(express.json());

// Mount routes as in the main app.js
app.use('/api/auth', authRoutes);
// For homepage routes (like stats, activities), they are protected by authMiddleware in app.js
app.use('/api/homepage', authMiddleware, homepageRoutes);
// Add other route groups if needed for scenarios, e.g., posts
// const postRoutes = require('../../homepage/routes/posts');
// app.use('/api/posts', authMiddleware, postRoutes);


// Central error handler
app.use(errorHandler);

let server;

describe('Acceptance Test: User Onboarding Flow', () => {
  beforeAll(async () => {
    await setupTestDB();
    server = app.listen(0);
  });

  afterAll(async () => {
    await teardownTestDB();
    if (server) {
      await server.close();
    }
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  it('should allow a new user to register, verify email, log in, and access a protected route', async () => {
    const uniqueEmail = `onboarding-${Date.now()}@example.com`;
    const uniqueUsername = `onboarduser-${Date.now()}`;
    const password = 'password123';

    // Suppress console messages for expected errors/warnings during this test
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    // 1. Register a new user
    const registerResponse = await request(app)
      .post('/api/auth/signup')
      .send({
        name: uniqueUsername, // Changed username to name
        email: uniqueEmail,
        password: password,
      });
    expect(registerResponse.status).toBe(201);
    expect(registerResponse.body.user.email).toBe(uniqueEmail);
    const userId = registerResponse.body.user.id;

    // 2. Call resend-verification to generate the token
    const resendResponse = await request(app)
      .post('/api/auth/resend-verification')
      .send({ email: uniqueEmail });

    let verificationToken;
    if (resendResponse.status === 200) {
      // Email sent successfully (or MAILGUN_TEST_MODE=true), token won't be in this response body.
      // Fetch from DB.
      const userInDbForToken = await User.findOne({ email: uniqueEmail });
      expect(userInDbForToken).not.toBeNull();
      verificationToken = userInDbForToken.verificationToken;
    } else if (resendResponse.status === 500 && resendResponse.body.verificationToken) {
      // Email config missing, token provided in response for testing
      verificationToken = resendResponse.body.verificationToken;
    } else {
      // Unexpected status
      throw new Error(`Resend verification failed with status ${resendResponse.status}: ${JSON.stringify(resendResponse.body)}`);
    }
    
    expect(verificationToken).toBeDefined();
    expect(verificationToken).not.toBeNull();

    // 3. Fetch user from DB to check other details (like isVerified still false)
    const userInDbAfterResend = await User.findById(userId);
    expect(userInDbAfterResend).not.toBeNull();
    expect(userInDbAfterResend.isVerified).toBe(false);
    expect(userInDbAfterResend.verificationToken).toBe(verificationToken); // Ensure token in DB matches

    // 4. Verify Email
    const verifyResponse = await request(app)
      .get(`/api/auth/verify-email?token=${verificationToken}`);
    expect(verifyResponse.status).toBe(200);
    expect(verifyResponse.body.message).toBe('Email verification successful');

    const verifiedUserInDb = await User.findById(userId);
    expect(verifiedUserInDb.isVerified).toBe(true);

    // 5. Log in
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: uniqueEmail,
        password: password,
      });
    expect(loginResponse.status).toBe(200);
    const authToken = loginResponse.body.token;
    expect(authToken).toBeDefined();

    // 6. Access a protected route (e.g., user stats)
    // Note: The actual path for user stats is /api/homepage/stats/user
    const statsResponse = await request(app)
      .get('/api/homepage/stats/user') // Corrected path based on app.js structure
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(statsResponse.status).toBe(200);
    expect(statsResponse.body.success).toBe(true);
    expect(statsResponse.body.data).toBeDefined();
    expect(statsResponse.body.data.personal).toHaveProperty('totalPoints');

    // Restore console spies
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });
});
