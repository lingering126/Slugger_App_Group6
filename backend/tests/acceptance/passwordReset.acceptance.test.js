const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { setupTestDB, teardownTestDB, clearDatabase } = require('../testSetup');
const User = require('../../src/models/user');
const { router: authRoutes } = require('../../routes/auth');
const { errorHandler } = require('../../middleware/errorHandler');

// Create a test app
const app = express();
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use(errorHandler);

let server;

// Helper to register a user (email verification not strictly needed for forgot password initiation)
async function registerUser(appInstance, email, username, password) {
  const registerResponse = await request(appInstance)
    .post('/api/auth/signup')
    .send({ name: username, email, password }); // Changed username to name
  if (registerResponse.status !== 201) {
    throw new Error(`Failed to register user for password reset test. Status: ${registerResponse.status}, Body: ${JSON.stringify(registerResponse.body)}`);
  }
  // Manually mark as verified if needed by login, though forgot password itself doesn't require it.
  // For this test, we'll verify to ensure login attempts are valid.
  await User.findOneAndUpdate({ email }, { $set: { isVerified: true, verificationToken: null } });
  return registerResponse.body.user;
}

describe('Acceptance Test: Password Reset Flow', () => {
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

  it('should allow a user to reset their password and log in with the new password', async () => {
    const uniqueEmail = `reset-${Date.now()}@example.com`;
    const uniqueUsername = `resetuser-${Date.now()}`;
    const oldPassword = 'oldPassword123';
    const newPassword = 'newPassword456';

    // Suppress console messages for this test (especially the email config warning)
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    // 1. Register User
    await registerUser(app, uniqueEmail, uniqueUsername, oldPassword);

    // 2. Initiate Forgot Password
    const forgotResponse = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: uniqueEmail });
    
    expect(forgotResponse.status).toBe(200);
    // The route returns the token if email sending fails/not configured, which is test-friendly
    const resetToken = forgotResponse.body.resetToken;
    expect(resetToken).toBeDefined();
    expect(resetToken).not.toBeNull();

    // 3. Reset Password using the token
    const resetResponse = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: resetToken, password: newPassword });
    expect(resetResponse.status).toBe(200);
    expect(resetResponse.body.message).toBe('Password reset successful. You can now log in with your new password.');

    // 4. Attempt to log in with the NEW password
    const loginNewPassResponse = await request(app)
      .post('/api/auth/login')
      .send({ email: uniqueEmail, password: newPassword });
    expect(loginNewPassResponse.status).toBe(200);
    expect(loginNewPassResponse.body.token).toBeDefined();

    // 5. Attempt to log in with the OLD password (should fail)
    const loginOldPassResponse = await request(app)
      .post('/api/auth/login')
      .send({ email: uniqueEmail, password: oldPassword });
    expect(loginOldPassResponse.status).toBe(401); // Invalid credentials

    // Restore console spies
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });
});
