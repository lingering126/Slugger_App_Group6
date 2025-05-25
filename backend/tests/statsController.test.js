/**
 * This test file covers the user statistics functionality:
 * - GET /api/user: Retrieves user statistics including total points and completed activities
 * - PUT /api/user/target: Updates user's target points and calculates progress
 * 
 * Expected test results:
 * - User stats endpoint should return 200 status with user's personal statistics
 * - Target update endpoint should return 200 status with updated target and progress
 */

const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { setupTestDB, teardownTestDB, clearDatabase, createMockUserAndToken } = require('./testSetup');
const UserStats = require('../homepage/models/UserStats');
const User = require('../src/models/user');
const auth = require('../middleware/auth');

// Initialize Express app
const app = express();
app.use(express.json());

// Mock authentication middleware to simulate user authentication
jest.mock('../middleware/auth', () => (req, res, next) => {
  if (req.headers.authorization) {
    const token = req.headers.authorization.split(' ')[1];
    req.user = {
      id: token,
      _id: token
    };
    next();
  } else {
    res.status(401).json({ message: 'Please authenticate' });
  }
});

// Import and configure API routes
const routes = require('../homepage/routes/index');
const mockedAuth = require('../middleware/auth'); // Get the mocked auth

app.use('/api', mockedAuth, routes); // Apply mocked auth before routes

let server;

describe('Stats Controller Tests', () => {
  let mockUser;
  let authToken;

  // Set up test database and server before all tests
  beforeAll(async () => {
    await setupTestDB();
    server = app.listen(0);
  });

  // Clean up after all tests
  afterAll(async () => {
    await teardownTestDB();
    await server.close();
  });

  // Reset database and create new mock user before each test
  beforeEach(async () => {
    await clearDatabase();
    const mockData = await createMockUserAndToken();
    mockUser = mockData.user;
    authToken = mockData.token;
  });

  describe('GET /api/user', () => {
    it('should return user stats', async () => {
      const response = await request(app)
        .get('/api/user')
        .set('Authorization', `Bearer ${mockUser._id}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('personal');
      expect(response.body.data.personal).toHaveProperty('totalPoints');
      expect(response.body.data.personal).toHaveProperty('activitiesCompleted');
    }, 60000);
  });

  describe('PUT /api/user/target', () => {
    it('should update user target', async () => {
      const targetData = {
        targetPoints: 100
      };

      const response = await request(app)
        .put('/api/user/target')
        .set('Authorization', `Bearer ${mockUser._id}`)
        .send(targetData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('targetPoints', 100);
      expect(response.body.data).toHaveProperty('progress', 0);
    }, 60000);
  });
});
