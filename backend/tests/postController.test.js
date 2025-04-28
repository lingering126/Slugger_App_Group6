/**
 * This test file covers the post and comment functionality:
 * - GET /api/posts: Retrieves all posts
 * - POST /api/posts: Creates a new post
 * - POST /api/posts/:postId/comments: Adds a comment to a post
 * 
 * Expected test results:
 * - Posts endpoint should return 200 status with array of posts
 * - Post creation endpoint should return 201 status with created post details
 * - Comment creation endpoint should return 201 status with created comment details
 */

const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { setupTestDB, teardownTestDB, clearDatabase, createMockUserAndToken } = require('./testSetup');
const Post = require('../homepage/models/Post');
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

describe('Post Controller Tests', () => {
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

  describe('GET /api/posts', () => {
    it('should return posts', async () => {
      const response = await request(app)
        .get('/api/posts')
        .set('Authorization', `Bearer ${mockUser._id}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('posts');
      expect(Array.isArray(response.body.posts)).toBe(true);
    }, 60000);
  });

  describe('POST /api/posts', () => {
    it('should create a new post', async () => {
      const postData = {
        content: 'New test content'
      };

      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${mockUser._id}`)
        .send(postData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('content', 'New test content');
      expect(response.body).toHaveProperty('author', 'Test User');
    }, 60000);
  });

  describe('POST /api/posts/:postId/comments', () => {
    it('should add a comment to a post', async () => {
      // First create a post
      const postResponse = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${mockUser._id}`)
        .send({ content: 'Test post' });

      const postId = postResponse.body.id;
      const commentData = {
        content: 'Test comment'
      };

      const response = await request(app)
        .post(`/api/posts/${postId}/comments`)
        .set('Authorization', `Bearer ${mockUser._id}`)
        .send(commentData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('content', 'Test comment');
      expect(response.body).toHaveProperty('author', 'Test User');
    }, 60000);
  });
}); 