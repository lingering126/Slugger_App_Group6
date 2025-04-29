/**
 * This test file covers the team functionality:
 * - GET /api/teams/all: Retrieves all teams
 * - GET /api/teams: Retrieves user's teams
 * - POST /api/teams: Creates a new team
 * - POST /api/teams/join: Joins a team by ID
 * - POST /api/teams/join-by-id: Joins a team by 6-digit teamId
 * - POST /api/teams/leave: Leaves a team
 * - PUT /api/teams/:teamId: Updates team information
 * - PUT /api/teams/:teamId/targets: Updates team targets
 * - DELETE /api/teams/:teamId: Deletes a team
 * 
 * Expected test results:
 * - Teams endpoints should return appropriate status codes and data
 * - Team operations should correctly modify the database
 * - Error handling should work as expected
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

// Mock authentication middleware to simulate user authentication
jest.mock('../middleware/auth', () => (req, res, next) => {
  if (req.headers.authorization) {
    const token = req.headers.authorization.split(' ')[1];
    // Extract user ID from token (in real app this would be decoded from JWT)
    req.user = {
      userId: token, // Use userId to match the actual middleware
      id: token,
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
  let secondUser;
  let authToken;
  let secondUserToken;
  let createdTeamId;
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

  // Reset database and create new mock users before each test
  beforeEach(async () => {
    await clearDatabase();
    
    // Create first mock user
    const mockData = await createMockUserAndToken();
    mockUser = mockData.user;
    authToken = mockData.token;
    
    // Create second mock user for testing team interactions
    const secondUser = new User({
      name: 'Second User',
      username: 'seconduser',
      email: 'second@example.com',
      password: 'password123'
    });
    await secondUser.save();
    secondUserToken = secondUser._id.toString();
  });

  describe('POST /api/teams', () => {
    it('should create a new team', async () => {
      const teamData = {
        name: 'Test Team',
        description: 'A team for testing',
        targetName: 'Target 1',
        weeklyLimitPhysical: 5,
        weeklyLimitMental: 5
      };

      const response = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${mockUser._id}`)
        .send(teamData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('_id');
      expect(response.body).toHaveProperty('name', 'Test Team');
      expect(response.body).toHaveProperty('description', 'A team for testing');
      expect(response.body).toHaveProperty('teamId');
      expect(response.body.teamId).toHaveLength(6); // 6-digit team ID
      expect(response.body.members).toContain(mockUser._id.toString());
      
      // Save created team ID for later tests
      createdTeamId = response.body._id;
      createdTeam = response.body;
    }, 60000);

    it('should return error if required fields are missing', async () => {
      const incompleteTeamData = {
        name: 'Incomplete Team'
        // Missing required targetName
      };

      const response = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${mockUser._id}`)
        .send(incompleteTeamData);

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('message');
    }, 60000);
  });

  describe('GET /api/teams/all', () => {
    it('should return all teams', async () => {
      // First create a team
      const teamData = {
        name: 'Test Team',
        description: 'A team for testing',
        targetName: 'Target 1'
      };

      await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${mockUser._id}`)
        .send(teamData);

      const response = await request(app)
        .get('/api/teams/all')
        .set('Authorization', `Bearer ${mockUser._id}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('name', 'Test Team');
    }, 60000);
  });

  describe('GET /api/teams', () => {
    it('should return teams the user is a member of', async () => {
      // First create a team
      const teamData = {
        name: 'User Team',
        description: 'A team for the user',
        targetName: 'Target 1'
      };

      await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${mockUser._id}`)
        .send(teamData);

      const response = await request(app)
        .get('/api/teams')
        .set('Authorization', `Bearer ${mockUser._id}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('name', 'User Team');
      expect(response.body[0].members).toContainEqual(expect.objectContaining({
        _id: mockUser._id.toString()
      }));
    }, 60000);
  });

  describe('POST /api/teams/join', () => {
    it('should allow a user to join a team', async () => {
      // First create a team with the first user
      const teamData = {
        name: 'Join Test Team',
        description: 'A team to test joining',
        targetName: 'Target 1'
      };

      const createResponse = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${mockUser._id}`)
        .send(teamData);

      const teamId = createResponse.body._id;

      // Now have the second user join the team
      const joinResponse = await request(app)
        .post('/api/teams/join')
        .set('Authorization', `Bearer ${secondUserToken}`)
        .send({ teamId });

      expect(joinResponse.status).toBe(200);
      expect(joinResponse.body.members).toContain(secondUserToken);
    }, 60000);

    it('should return error if user is already a member', async () => {
      // First create a team
      const teamData = {
        name: 'Already Member Team',
        description: 'A team to test already member error',
        targetName: 'Target 1'
      };

      const createResponse = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${mockUser._id}`)
        .send(teamData);

      const teamId = createResponse.body._id;

      // Try to join again
      const joinResponse = await request(app)
        .post('/api/teams/join')
        .set('Authorization', `Bearer ${mockUser._id}`)
        .send({ teamId });

      expect(joinResponse.status).toBe(400);
      expect(joinResponse.body).toHaveProperty('message', 'Already a member');
    }, 60000);
  });

  describe('POST /api/teams/join-by-id', () => {
    it('should allow a user to join a team by 6-digit ID', async () => {
      // First create a team with the first user
      const teamData = {
        name: 'Join By ID Team',
        description: 'A team to test joining by ID',
        targetName: 'Target 1'
      };

      const createResponse = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${mockUser._id}`)
        .send(teamData);

      const teamId = createResponse.body.teamId; // 6-digit ID

      // Now have the second user join the team by 6-digit ID
      const joinResponse = await request(app)
        .post('/api/teams/join-by-id')
        .set('Authorization', `Bearer ${secondUserToken}`)
        .send({ teamId });

      expect(joinResponse.status).toBe(200);
      expect(joinResponse.body.members).toContain(secondUserToken);
    }, 60000);
  });

  describe('PUT /api/teams/:teamId', () => {
    it('should update team information', async () => {
      // First create a team
      const teamData = {
        name: 'Update Test Team',
        description: 'A team to test updating',
        targetName: 'Target 1'
      };

      const createResponse = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${mockUser._id}`)
        .send(teamData);

      const teamId = createResponse.body._id;

      // Update the team
      const updateData = {
        name: 'Updated Team Name',
        description: 'Updated team description'
      };

      const updateResponse = await request(app)
        .put(`/api/teams/${teamId}`)
        .set('Authorization', `Bearer ${mockUser._id}`)
        .send(updateData);

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body).toHaveProperty('name', 'Updated Team Name');
      expect(updateResponse.body).toHaveProperty('description', 'Updated team description');
    }, 60000);

    it('should not allow non-members to update team', async () => {
      // First create a team with the first user
      const teamData = {
        name: 'Non-Member Update Team',
        description: 'A team to test non-member update',
        targetName: 'Target 1'
      };

      const createResponse = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${mockUser._id}`)
        .send(teamData);

      const teamId = createResponse.body._id;

      // Try to update with second user who is not a member
      const updateData = {
        name: 'Unauthorized Update'
      };

      const updateResponse = await request(app)
        .put(`/api/teams/${teamId}`)
        .set('Authorization', `Bearer ${secondUserToken}`)
        .send(updateData);

      expect(updateResponse.status).toBe(403);
    }, 60000);
  });

  describe('PUT /api/teams/:teamId/targets', () => {
    it('should update team targets', async () => {
      // First create a team
      const teamData = {
        name: 'Target Update Team',
        description: 'A team to test target updating',
        targetName: 'Target 1',
        weeklyLimitPhysical: 5,
        weeklyLimitMental: 5
      };

      const createResponse = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${mockUser._id}`)
        .send(teamData);

      const teamId = createResponse.body._id;

      // Update the team targets
      const updateData = {
        targetName: 'Target 2',
        weeklyLimitPhysical: 3,
        weeklyLimitMental: 4
      };

      const updateResponse = await request(app)
        .put(`/api/teams/${teamId}/targets`)
        .set('Authorization', `Bearer ${mockUser._id}`)
        .send(updateData);

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body).toHaveProperty('targetName', 'Target 2');
      expect(updateResponse.body).toHaveProperty('weeklyLimitPhysical', 3);
      expect(updateResponse.body).toHaveProperty('weeklyLimitMental', 4);
    }, 60000);
  });

  describe('POST /api/teams/leave', () => {
    it('should allow a user to leave a team', async () => {
      // First create a team
      const teamData = {
        name: 'Leave Test Team',
        description: 'A team to test leaving',
        targetName: 'Target 1'
      };

      const createResponse = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${mockUser._id}`)
        .send(teamData);

      const teamId = createResponse.body._id;

      // Have second user join the team
      await request(app)
        .post('/api/teams/join')
        .set('Authorization', `Bearer ${secondUserToken}`)
        .send({ teamId });

      // Now have the second user leave the team
      const leaveResponse = await request(app)
        .post('/api/teams/leave')
        .set('Authorization', `Bearer ${secondUserToken}`)
        .send({ teamId });

      expect(leaveResponse.status).toBe(200);
      expect(leaveResponse.body).toHaveProperty('message', 'Successfully left team');

      // Verify the user is no longer in the team
      const team = await Team.findById(teamId);
      expect(team.members).not.toContain(secondUserToken);
    }, 60000);

    it('should return error if user is not a member', async () => {
      // First create a team
      const teamData = {
        name: 'Non-Member Leave Team',
        description: 'A team to test non-member leave',
        targetName: 'Target 1'
      };

      const createResponse = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${mockUser._id}`)
        .send(teamData);

      const teamId = createResponse.body._id;

      // Try to leave with second user who is not a member
      const leaveResponse = await request(app)
        .post('/api/teams/leave')
        .set('Authorization', `Bearer ${secondUserToken}`)
        .send({ teamId });

      expect(leaveResponse.status).toBe(400);
      expect(leaveResponse.body).toHaveProperty('message', 'Not a member of this team');
    }, 60000);
  });

  describe('DELETE /api/teams/:teamId', () => {
    it('should delete a team', async () => {
      // First create a team
      const teamData = {
        name: 'Delete Test Team',
        description: 'A team to test deletion',
        targetName: 'Target 1'
      };

      const createResponse = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${mockUser._id}`)
        .send(teamData);

      const teamId = createResponse.body._id;

      // Delete the team
      const deleteResponse = await request(app)
        .delete(`/api/teams/${teamId}`)
        .set('Authorization', `Bearer ${mockUser._id}`);

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body).toHaveProperty('message', 'Team deleted successfully');

      // Verify the team is deleted
      const team = await Team.findById(teamId);
      expect(team).toBeNull();
    }, 60000);

    it('should not allow non-members to delete team', async () => {
      // First create a team with the first user
      const teamData = {
        name: 'Non-Member Delete Team',
        description: 'A team to test non-member delete',
        targetName: 'Target 1'
      };

      const createResponse = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${mockUser._id}`)
        .send(teamData);

      const teamId = createResponse.body._id;

      // Try to delete with second user who is not a member
      const deleteResponse = await request(app)
        .delete(`/api/teams/${teamId}`)
        .set('Authorization', `Bearer ${secondUserToken}`);

      expect(deleteResponse.status).toBe(403);
      expect(deleteResponse.body).toHaveProperty('message', 'Not authorized to delete this team');

      // Verify the team still exists
      const team = await Team.findById(teamId);
      expect(team).not.toBeNull();
    }, 60000);
  });
});
