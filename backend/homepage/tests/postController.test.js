const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { setupTestDB, teardownTestDB, clearDatabase, createMockUserAndToken } = require('./testSetup');
const Post = require('../models/Post');
const User = require('../../models/User');

const app = express();
app.use(express.json());

// Mock auth middleware
jest.mock('../../middleware/auth', () => {
  return (req, res, next) => {
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
  };
});

// Import and use routes
const routes = require('../routes');
app.use('/api/homepage', routes);

describe('Post Controller Tests', () => {
  let mockUser;
  let token;

  beforeAll(async () => {
    await setupTestDB();
    const mockData = createMockUserAndToken();
    mockUser = mockData.mockUser;
    token = mockData.token;

    // Create mock user in database
    await User.create({
      _id: mockUser._id,
      name: mockUser.name,
      email: mockUser.email
    });
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  afterEach(async () => {
    await clearDatabase();
    // Recreate the user after each test
    await User.create({
      _id: mockUser._id,
      name: mockUser.name,
      email: mockUser.email
    });
  });

  describe('POST /api/homepage/posts', () => {
    it('should create a new text post', async () => {
      const postData = {
        type: 'text',
        content: 'Test post content'
      };

      const response = await request(app)
        .post('/api/homepage/posts')
        .set('Authorization', `Bearer ${mockUser._id}`)
        .send(postData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.type).toBe('text');
      expect(response.body.content).toBe('Test post content');
      expect(response.body.author).toBe(mockUser.name);
    });

    it('should create a new activity post', async () => {
      const postData = {
        type: 'activity',
        content: 'Test activity post',
        activityType: 'running',
        duration: '30 minutes',
        points: 5,
        progress: 75
      };

      const response = await request(app)
        .post('/api/homepage/posts')
        .set('Authorization', `Bearer ${mockUser._id}`)
        .send(postData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.type).toBe('activity');
      expect(response.body.activityType).toBe('running');
      expect(response.body.duration).toBe('30 minutes');
      expect(response.body.points).toBe(5);
      expect(response.body.progress).toBe(75);
    });

    it('should return 400 for invalid post data', async () => {
      const invalidPost = {
        type: 'invalid',
        content: 'Test content'
      };

      const response = await request(app)
        .post('/api/homepage/posts')
        .set('Authorization', `Bearer ${mockUser._id}`)
        .send(invalidPost);

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/homepage/posts/:postId/comments', () => {
    let testPost;

    beforeEach(async () => {
      testPost = await Post.create({
        userId: mockUser._id,
        type: 'text',
        content: 'Test post for comments'
      });
    });

    it('should add a comment to a post', async () => {
      const commentData = {
        content: 'Test comment'
      };

      const response = await request(app)
        .post(`/api/homepage/posts/${testPost._id}/comments`)
        .set('Authorization', `Bearer ${mockUser._id}`)
        .send(commentData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.content).toBe('Test comment');
      expect(response.body.author).toBe(mockUser.name);
    });

    it('should return 404 for non-existent post', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .post(`/api/homepage/posts/${nonExistentId}/comments`)
        .set('Authorization', `Bearer ${mockUser._id}`)
        .send({ content: 'Test comment' });

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/homepage/posts', () => {
    beforeEach(async () => {
      // Create some test posts
      await Post.create([
        {
          userId: mockUser._id,
          type: 'text',
          content: 'Test post 1'
        },
        {
          userId: mockUser._id,
          type: 'activity',
          content: 'Test post 2',
          activityType: 'running',
          duration: '30 minutes'
        }
      ]);
    });

    it('should get all posts', async () => {
      const response = await request(app)
        .get('/api/homepage/posts')
        .set('Authorization', `Bearer ${mockUser._id}`);

      expect(response.status).toBe(200);
      expect(response.body.posts).toBeInstanceOf(Array);
      expect(response.body.posts.length).toBe(2);
      expect(response.body.posts[0]).toHaveProperty('id');
      expect(response.body.posts[0]).toHaveProperty('content');
    });

    it('should return paginated results', async () => {
      const response = await request(app)
        .get('/api/homepage/posts?page=1&limit=1')
        .set('Authorization', `Bearer ${mockUser._id}`);

      expect(response.status).toBe(200);
      expect(response.body.posts).toHaveLength(1);
      expect(response.body.pagination).toHaveProperty('current', 1);
      expect(response.body.pagination).toHaveProperty('hasMore', true);
    });
  });
}); 