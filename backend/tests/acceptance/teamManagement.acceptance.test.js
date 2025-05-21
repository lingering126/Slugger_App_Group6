const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { setupTestDB, teardownTestDB, clearDatabase } = require('../testSetup');
const User = require('../../src/models/user');
const Team = require('../../models/team');
const { router: authRoutes } = require('../../routes/auth');
const teamRoutes = require('../../routes/team'); // Actual team router
const { errorHandler } = require('../../middleware/errorHandler');
const authMiddleware = require('../../middleware/auth'); // The main auth middleware from app.js

// Create a test app that mirrors the main app's routing structure
const app = express();
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/teams', authMiddleware, teamRoutes); // Team routes protected by main auth

app.use(errorHandler);

let server;

// Helper function to register and login a user
async function registerAndLoginUser(appInstance, { email, username, password }) {
  const registerResponse = await request(appInstance)
    .post('/api/auth/register')
    .send({ username, email, password });
  if (registerResponse.status !== 201) throw new Error(`User registration failed: ${registerResponse.status} ${JSON.stringify(registerResponse.body)}`);
  const userId = registerResponse.body.user.id;

  await User.findByIdAndUpdate(userId, { $set: { isVerified: true, verificationToken: null } });
  
  const loginResponse = await request(appInstance)
    .post('/api/auth/login')
    .send({ email, password });
  if (loginResponse.status !== 200) throw new Error(`User login failed: ${loginResponse.status} ${JSON.stringify(loginResponse.body)}`);
  
  return { authToken: loginResponse.body.token, userId: userId, username: username };
}

describe('Acceptance Test: Team Management Flow', () => {
  let userA, userB;

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

    userA = await registerAndLoginUser(app, {
      email: `usera-${Date.now()}@example.com`,
      username: `usera-${Date.now()}`,
      password: 'password123'
    });
    userB = await registerAndLoginUser(app, {
      email: `userb-${Date.now()}@example.com`,
      username: `userb-${Date.now()}`,
      password: 'password456'
    });
  });

  afterEach(() => {
    // Restore console spies
    jest.restoreAllMocks();
  });

  it('should allow a user to create a team, another user to join, and view team details', async () => {
    // 1. User A creates a new team
    const teamName = 'The Champions';
    const teamDescription = 'We aim for the top!';
    const createTeamResponse = await request(app)
      .post('/api/teams')
      .set('Authorization', `Bearer ${userA.authToken}`)
      .send({
        name: teamName,
        description: teamDescription,
        targetName: 'Target 1', // Valid enum from Team model
        weeklyLimitPhysical: 5,
        weeklyLimitMental: 5
      });
    
    expect(createTeamResponse.status).toBe(201);
    const createdTeam = createTeamResponse.body;
    expect(createdTeam.name).toBe(teamName);
    expect(createdTeam.members).toContain(userA.userId);
    expect(createdTeam.teamId).toBeDefined(); // 6-digit ID
    const teamMongoId = createdTeam._id;
    const teamSixDigitId = createdTeam.teamId;

    // 2. User A fetches their teams
    const userATeamsResponse = await request(app)
      .get('/api/teams') // Gets teams user is a member of
      .set('Authorization', `Bearer ${userA.authToken}`);
    expect(userATeamsResponse.status).toBe(200);
    expect(userATeamsResponse.body.length).toBe(1);
    expect(userATeamsResponse.body[0]._id).toBe(teamMongoId);

    // 3. User B joins the team using the 6-digit teamId
    const joinTeamResponse = await request(app)
      .post('/api/teams/join-by-id')
      .set('Authorization', `Bearer ${userB.authToken}`)
      .send({ teamId: teamSixDigitId }); // Use the 6-digit ID
    
    expect(joinTeamResponse.status).toBe(200);
    expect(joinTeamResponse.body.members).toContain(userB.userId);
    expect(joinTeamResponse.body.members.length).toBe(2);

    // 4. User B fetches details of that specific team
    const teamDetailsResponse = await request(app)
      .get(`/api/teams/${teamMongoId}`)
      .set('Authorization', `Bearer ${userB.authToken}`);
    
    expect(teamDetailsResponse.status).toBe(200);
    const teamDetails = teamDetailsResponse.body;
    expect(teamDetails.name).toBe(teamName);
    const memberIds = teamDetails.members.map(m => m._id); // members are populated
    expect(memberIds).toContain(userA.userId);
    expect(memberIds).toContain(userB.userId);
  });
});
