/**
 * This test file covers the activity management functionality:
 * - GET /api/activities/types: Retrieves available activity types
 * - GET /api/activities: Retrieves user's activity history
 * - POST /api/activities: Creates a new activity record
 * 
 * Expected test results:
 * - Activity types endpoint should return 200 status with categorized activity types
 * - User activities endpoint should return 200 status with user's activity history
 * - Activity creation endpoint should return 201 status with created activity details
 */

const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { setupTestDB, teardownTestDB, clearDatabase, createMockUserAndToken } = require('./testSetup');
const Activity = require('../models/Activity');
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
app.use('/api', routes);

let server;

describe('Activity Controller Tests', () => {
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

  describe('GET /api/activities/types', () => {
    it('should return activity types', async () => {
      const response = await request(app)
        .get('/api/activities/types');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('Physical');
      expect(response.body).toHaveProperty('Mental');
      expect(response.body).toHaveProperty('Bonus');
      expect(Array.isArray(response.body.Physical)).toBe(true);
      expect(Array.isArray(response.body.Mental)).toBe(true);
      expect(Array.isArray(response.body.Bonus)).toBe(true);
    }, 60000);
  });

  describe('GET /api/activities', () => {
    it('should return user activities', async () => {
      const response = await request(app)
        .get('/api/activities')
        .set('Authorization', `Bearer ${mockUser._id}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('activities');
      expect(response.body.data).toHaveProperty('stats');
      expect(Array.isArray(response.body.data.activities)).toBe(true);
    }, 60000);
  });

  describe('POST /api/activities', () => {
    it('should create a new activity', async () => {
      const activityData = {
        name: 'New Test Activity',
        type: 'Physical',
        duration: 45,
        description: 'New test activity'
      };

      const response = await request(app)
        .post('/api/activities')
        .set('Authorization', `Bearer ${mockUser._id}`)
        .send(activityData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('name', 'New Test Activity');
      expect(response.body.data).toHaveProperty('type', 'Physical');
      expect(response.body.data).toHaveProperty('duration', 45);
    }, 60000);
  });
});
