/**
 * This test file covers the team management functionality:
 * - POST /api/teams: Creates a new team
 * - GET /api/teams: Gets all teams the user is a member of
 * - GET /api/teams/all: Gets all teams
 * - GET /api/teams/:teamId: Gets a specific team by ID
 * - PUT /api/teams/:teamId: Updates team information
 * - POST /api/teams/join: Joins an existing team
 * - POST /api/teams/leave: Leaves a team
 * - DELETE /api/teams/:teamId: Deletes a team
 */

const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { setupTestDB, teardownTestDB, clearDatabase, createMockUserAndToken } = require('./testSetup');
const Team = require('../models/team');
const User = require('../src/models/user');
const auth = require('../middleware/auth');

// Initialize Express app
const app = express();
app.use(express.json());

// Mock authentication middleware
jest.mock('../middleware/auth', () => (req, res, next) => {
  if (req.headers.authorization) {
    const token = req.headers.authorization.split(' ')[1];
    req.user = {
      id: token,
      userId: token,
      _id: token
    };
    next();
  } else {
    res.status(401).json({ message: 'Please authenticate' });
  }
});

// Import and configure API routes
const teamRoutes = require('../routes/team');
app.use('/api/teams', teamRoutes);

let server;

describe('Team Controller Tests', () => {
  let mockUser;
  let authToken;
  let createdTeam;

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

  describe('POST /api/teams', () => {
    it('should create a new team', async () => {
      const teamData = {
        name: 'Test Team',
        description: 'A test team',
        targetName: 'Target 1',
        weeklyLimitPhysical: 5,
        weeklyLimitMental: 3
      };

      const response = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${mockUser._id}`)
        .send(teamData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('name', teamData.name);
      expect(response.body).toHaveProperty('description', teamData.description);
      expect(response.body).toHaveProperty('targetName', teamData.targetName);
      expect(response.body.members).toContain(mockUser._id.toString());
      
      createdTeam = response.body;
    }, 60000);
  });

  describe('GET /api/teams', () => {
    it('should get all teams the user is a member of', async () => {
      // First create a team
      const teamData = {
        name: 'Test Team',
        description: 'A test team',
        targetName: 'Target 1'
      };

      const createResponse = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${mockUser._id}`)
        .send(teamData);

      expect(createResponse.status).toBe(201);

      const response = await request(app)
        .get('/api/teams')
        .set('Authorization', `Bearer ${mockUser._id}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('name', teamData.name);
    }, 60000);
  });

  describe('GET /api/teams/all', () => {
    it('should get all teams', async () => {
      // First create a team
      const teamData = {
        name: 'Test Team',
        description: 'A test team',
        targetName: 'Target 1'
      };

      const createResponse = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${mockUser._id}`)
        .send(teamData);

      expect(createResponse.status).toBe(201);

      const response = await request(app)
        .get('/api/teams/all')
        .set('Authorization', `Bearer ${mockUser._id}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    }, 60000);
  });

  describe('GET /api/teams/:teamId', () => {
    it('should get a specific team by ID', async () => {
      // First create a team
      const teamData = {
        name: 'Test Team',
        description: 'A test team',
        targetName: 'Target 1'
      };

      const createResponse = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${mockUser._id}`)
        .send(teamData);

      expect(createResponse.status).toBe(201);
      const teamId = createResponse.body._id;

      const response = await request(app)
        .get(`/api/teams/${teamId}`)
        .set('Authorization', `Bearer ${mockUser._id}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('_id', teamId);
      expect(response.body).toHaveProperty('name', teamData.name);
    }, 60000);
  });

  describe('PUT /api/teams/:teamId', () => {
    it('should update team information', async () => {
      // First create a team
      const teamData = {
        name: 'Test Team',
        description: 'A test team',
        targetName: 'Target 1'
      };

      const createResponse = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${mockUser._id}`)
        .send(teamData);

      expect(createResponse.status).toBe(201);
      const teamId = createResponse.body._id;

      const updateData = {
        name: 'Updated Team Name',
        description: 'Updated description'
      };

      const response = await request(app)
        .put(`/api/teams/${teamId}`)
        .set('Authorization', `Bearer ${mockUser._id}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('name', updateData.name);
      expect(response.body).toHaveProperty('description', updateData.description);
    }, 60000);
  });

  describe('POST /api/teams/join', () => {
    it('should join an existing team', async () => {
      // First create a team with a different user
      const otherUser = await User.create({
        email: 'other@test.com',
        password: 'password123',
        name: 'Other User',
        username: 'otheruser'
      });

      const teamData = {
        name: 'Test Team',
        description: 'A test team',
        targetName: 'Target 1'
      };

      const createResponse = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${otherUser._id}`)
        .send(teamData);

      expect(createResponse.status).toBe(201);
      const teamId = createResponse.body._id;

      const response = await request(app)
        .post('/api/teams/join')
        .set('Authorization', `Bearer ${mockUser._id}`)
        .send({ teamId });

      expect(response.status).toBe(200);
      expect(response.body.members).toContain(mockUser._id.toString());
    }, 60000);
  });

  describe('POST /api/teams/leave', () => {
    it('should leave a team', async () => {
      // First create a team
      const teamData = {
        name: 'Test Team',
        description: 'A test team',
        targetName: 'Target 1'
      };

      const createResponse = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${mockUser._id}`)
        .send(teamData);

      expect(createResponse.status).toBe(201);
      const teamId = createResponse.body._id;

      const response = await request(app)
        .post('/api/teams/leave')
        .set('Authorization', `Bearer ${mockUser._id}`)
        .send({ teamId });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Successfully left team');

      // Verify user is no longer a member
      const teamResponse = await request(app)
        .get(`/api/teams/${teamId}`)
        .set('Authorization', `Bearer ${mockUser._id}`);

      expect(teamResponse.status).toBe(200);
      expect(teamResponse.body.members).not.toContain(mockUser._id.toString());
    }, 60000);
  });

  describe('DELETE /api/teams/:teamId', () => {
    it('should delete a team', async () => {
      // First create a team
      const teamData = {
        name: 'Test Team',
        description: 'A test team',
        targetName: 'Target 1'
      };

      const createResponse = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${mockUser._id}`)
        .send(teamData);

      expect(createResponse.status).toBe(201);
      const teamId = createResponse.body._id;

      const response = await request(app)
        .delete(`/api/teams/${teamId}`)
        .set('Authorization', `Bearer ${mockUser._id}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Team deleted successfully');

      // Verify team no longer exists
      const teamResponse = await request(app)
        .get(`/api/teams/${teamId}`)
        .set('Authorization', `Bearer ${mockUser._id}`);

      expect(teamResponse.status).toBe(404);
    }, 60000);
  });
}); 