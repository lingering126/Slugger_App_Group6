const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { setupTestDB, teardownTestDB, clearDatabase } = require('../testSetup');
const User = require('../../src/models/user');
const Activity = require('../../models/Activity'); // Activity model
const { router: authRoutes } = require('../../routes/auth');
const homepageRoutes = require('../../homepage/routes/index');
const { errorHandler } = require('../../middleware/errorHandler');
const authMiddleware = require('../../middleware/auth'); // Corrected import

// Create a test app that mirrors the main app's routing structure
const app = express();
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/homepage', authMiddleware, homepageRoutes); // Activities routes are here

app.use(errorHandler);

let server;

// Helper function to register and login a user, returning their token and ID
async function registerAndLoginUser(appInstance) {
  const uniqueEmail = `activityuser-${Date.now()}@example.com`;
  const uniqueUsername = `activityuser-${Date.now()}`;
  const password = 'password123';

  // 1. Register
  const registerResponse = await request(appInstance)
    .post('/api/auth/signup')
    .send({ name: uniqueUsername, email: uniqueEmail, password: password }); // Changed username to name
  if (registerResponse.status !== 201) throw new Error('Failed to register user for test setup');
  const userId = registerResponse.body.user.id;

  // 2. Manually verify user for simplicity in this test helper
  await User.findByIdAndUpdate(userId, { $set: { isVerified: true, verificationToken: null } });
  
  // 3. Login
  const loginResponse = await request(appInstance)
    .post('/api/auth/login')
    .send({ email: uniqueEmail, password: password });
  if (loginResponse.status !== 200) throw new Error('Failed to login user for test setup');
  
  return { authToken: loginResponse.body.token, userId: userId };
}


describe('Acceptance Test: Activity Management Flow', () => {
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

  it('should allow a logged-in user to create an activity and see it in their list', async () => {
    // Suppress console messages for this test
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    // 1. Setup: Register and Login User
    const { authToken, userId } = await registerAndLoginUser(app);

    // 2. (Optional) Get Activity Types - just to ensure endpoint is okay
    const typesResponse = await request(app)
      .get('/api/homepage/activities/types') // This route is not auth protected in homepage/routes/index.js
      .set('Authorization', `Bearer ${authToken}`); // Though auth not strictly needed if public
    expect(typesResponse.status).toBe(200);
    expect(typesResponse.body).toHaveProperty('Physical');

    // 3. Create a New Activity
    const activityDetails = {
      name: 'Morning Run',
      type: 'Physical', // Ensure this is a valid type from getActivityTypes
      duration: 30,
      description: 'A refreshing 30-minute run.',
    };
    const createActivityResponse = await request(app)
      .post('/api/homepage/activities')
      .set('Authorization', `Bearer ${authToken}`)
      .send(activityDetails);
    
    expect(createActivityResponse.status).toBe(201);
    expect(createActivityResponse.body.success).toBe(true);
    expect(createActivityResponse.body.data.name).toBe(activityDetails.name);
    const createdActivityId = createActivityResponse.body.data._id; // Assuming _id is returned

    // 4. Retrieve User's Activities
    const getActivitiesResponse = await request(app)
      .get('/api/homepage/activities')
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(getActivitiesResponse.status).toBe(200);
    expect(getActivitiesResponse.body.success).toBe(true);
    const userActivities = getActivitiesResponse.body.data.activities; // Path based on activityController.test.js fix
    expect(Array.isArray(userActivities)).toBe(true);

    // 5. Verify the created activity is in the list
    const foundActivity = userActivities.find(act => act._id === createdActivityId);
    expect(foundActivity).toBeDefined();
    expect(foundActivity.name).toBe(activityDetails.name);
    expect(foundActivity.type).toBe(activityDetails.type);
    expect(foundActivity.duration).toBe(activityDetails.duration);

    // Restore console spies
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });
});
