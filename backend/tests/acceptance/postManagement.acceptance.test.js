const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { setupTestDB, teardownTestDB, clearDatabase } = require('../testSetup');
const User = require('../../src/models/user');
const Post = require('../../homepage/models/Post'); // Post model
const { router: authRoutes } = require('../../routes/auth');
const postRoutes = require('../../homepage/routes/posts'); // Actual post router
const { errorHandler } = require('../../middleware/errorHandler');
const authMiddleware = require('../../middleware/auth');

// Create a test app that mirrors the main app's routing structure
const app = express();
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/posts', authMiddleware, postRoutes); // Posts routes are here

app.use(errorHandler);

let server;

// Helper function to register and login a user, returning their token and ID
async function registerAndLoginUser(appInstance) {
  const uniqueEmail = `postuser-${Date.now()}@example.com`;
  const uniqueUsername = `postuser-${Date.now()}`;
  const password = 'password123';

  const registerResponse = await request(appInstance)
    .post('/api/auth/signup')
    .send({ name: uniqueUsername, email: uniqueEmail, password: password }); // Changed username to name
  if (registerResponse.status !== 201) throw new Error('Failed to register user for test setup');
  const userId = registerResponse.body.user.id;

  await User.findByIdAndUpdate(userId, { $set: { isVerified: true, verificationToken: null } });
  
  const loginResponse = await request(appInstance)
    .post('/api/auth/login')
    .send({ email: uniqueEmail, password: password });
  if (loginResponse.status !== 200) throw new Error('Failed to login user for test setup');
  
  return { authToken: loginResponse.body.token, userId: userId, username: uniqueUsername };
}


describe('Acceptance Test: Post Management Flow', () => {
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

  it('should allow a logged-in user to create a post and see it in the posts list', async () => {
    // Suppress console messages for this test
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    // 1. Setup: Register and Login User
    const { authToken, userId, username } = await registerAndLoginUser(app);

    // 2. Create a New Post
    const postContent = 'This is my first post on Slugger!';
    const createPostResponse = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ content: postContent, visibility: 'public' });
    
    expect(createPostResponse.status).toBe(201);
    expect(createPostResponse.body.content).toBe(postContent);
    expect(createPostResponse.body.userId.username).toBe(username); // Check if populated user is correct
    const createdPostId = createPostResponse.body._id;

    // 3. Retrieve Posts
    const getPostsResponse = await request(app)
      .get('/api/posts') // Gets all public posts by default
      .set('Authorization', `Bearer ${authToken}`); // Auth token needed to determine isLikedByUser
    
    expect(getPostsResponse.status).toBe(200);
    expect(Array.isArray(getPostsResponse.body)).toBe(true);
    const postsList = getPostsResponse.body;

    // 4. Verify the created post is in the list
    const foundPost = postsList.find(post => post._id === createdPostId);
    expect(foundPost).toBeDefined();
    expect(foundPost.content).toBe(postContent);
    expect(foundPost.userId.username).toBe(username);
    expect(foundPost.isLikedByUser).toBe(false); // Assuming new post is not liked by creator by default
    expect(foundPost.likesCount).toBe(0);

    // Restore console spies
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });
});
