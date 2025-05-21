const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { setupTestDB, teardownTestDB, clearDatabase } = require('../testSetup');
const User = require('../../src/models/user');
const Profile = require('../../src/models/profile'); // Profile model
const { router: authRoutes } = require('../../routes/auth');
const profileRoutes = require('../../routes/profiles'); // Actual profile router
const { errorHandler } = require('../../middleware/errorHandler');
const authMiddleware = require('../../middleware/auth'); // The main auth middleware from app.js

// Create a test app that mirrors the main app's routing structure
const app = express();
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/profiles', authMiddleware, profileRoutes); // Profile routes protected by main auth

app.use(errorHandler);

let server;

// Helper function to register and login a user
async function registerAndLoginUser(appInstance, { email, username, password }) {
  const registerResponse = await request(appInstance)
    .post('/api/auth/signup')
    .send({ name: username, email, password }); // Changed username to name
  if (registerResponse.status !== 201) throw new Error(`User registration failed: ${registerResponse.status} ${JSON.stringify(registerResponse.body)}`);
  const userId = registerResponse.body.user.id;

  await User.findByIdAndUpdate(userId, { $set: { isVerified: true, verificationToken: null } });
  
  const loginResponse = await request(appInstance)
    .post('/api/auth/login')
    .send({ email, password });
  if (loginResponse.status !== 200) throw new Error(`User login failed: ${loginResponse.status} ${JSON.stringify(loginResponse.body)}`);
  
  return { authToken: loginResponse.body.token, userId: userId, username: username };
}

describe('Acceptance Test: Profile Management Flow', () => {
  let testUser;

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
    // Suppress console messages for expected errors/warnings during tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    testUser = await registerAndLoginUser(app, {
      email: `profileuser-${Date.now()}@example.com`,
      username: `profileuser-${Date.now()}`, // Initial username
      password: 'password123'
    });
  });

  afterEach(() => {
    // Restore console spies
    jest.restoreAllMocks();
  });

  it('should allow a user to fetch, update, and verify their profile information', async () => {
    // 1. Fetch initial profile (might be auto-created)
    const initialProfileResponse = await request(app)
      .get('/api/profiles/me')
      .set('Authorization', `Bearer ${testUser.authToken}`);
    
    expect(initialProfileResponse.status).toBe(200);
    const initialProfile = initialProfileResponse.body;
    // Name in profile should initially match the username from registration
    expect(initialProfile.name).toBe(testUser.username); 
    expect(initialProfile.user.username).toBe(testUser.username);

    // 2. Update the profile
    const newProfileData = {
      name: 'Updated Test User Name',
      bio: 'This is my updated bio.',
      longTermGoal: 'Conquer the world of testing!'
    };
    const updateProfileResponse = await request(app)
      .put('/api/profiles')
      .set('Authorization', `Bearer ${testUser.authToken}`)
      .send(newProfileData);

    expect(updateProfileResponse.status).toBe(200);
    const updatedProfile = updateProfileResponse.body;
    expect(updatedProfile.name).toBe(newProfileData.name);
    expect(updatedProfile.bio).toBe(newProfileData.bio);
    expect(updatedProfile.longTermGoal).toBe(newProfileData.longTermGoal);
    // Check if user object in profile response reflects updated name
    expect(updatedProfile.user.username).toBe(newProfileData.name); // because profile route syncs username to name

    // 3. Fetch profile again to verify persistence
    const fetchedProfileResponse = await request(app)
      .get('/api/profiles/me')
      .set('Authorization', `Bearer ${testUser.authToken}`);
    
    expect(fetchedProfileResponse.status).toBe(200);
    const fetchedProfile = fetchedProfileResponse.body;
    expect(fetchedProfile.name).toBe(newProfileData.name);
    expect(fetchedProfile.bio).toBe(newProfileData.bio);
    expect(fetchedProfile.longTermGoal).toBe(newProfileData.longTermGoal);

    // 4. Verify User model was updated (name and username sync)
    const userInDb = await User.findById(testUser.userId);
    expect(userInDb).not.toBeNull();
    expect(userInDb.name).toBe(newProfileData.name);
    expect(userInDb.username).toBe(newProfileData.name); // As per profile route logic
  });
});
