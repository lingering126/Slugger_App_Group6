const request = require('supertest');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const API_URL = 'http://localhost:5000/api/homepage';

// 生成测试用的JWT token
const generateTestToken = (userId = '123456789') => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1h' });
};

describe('Homepage API Tests', () => {
  let mongoServer;
  let token;
  let testActivityId;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    token = generateTestToken();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  // 活动相关测试
  describe('Activity Endpoints', () => {
    test('GET /activities/types should return activity types', async () => {
      const response = await request(API_URL)
        .get('/activities/types')
        .expect(200);
      expect(response.body).toHaveProperty('Physical');
      expect(response.body).toHaveProperty('Mental');
      expect(response.body).toHaveProperty('Bonus');
    });

    test('POST /activities should create new activity', async () => {
      const activity = {
        type: 'Physical',
        name: 'Running',
        duration: 30,
        description: 'Morning run'
      };
      const response = await request(API_URL)
        .post('/activities')
        .set('Authorization', `Bearer ${token}`)
        .send(activity)
        .expect(201);
      expect(response.body).toHaveProperty('type', 'Physical');
      expect(response.body).toHaveProperty('name', 'Running');
      testActivityId = response.body._id;
    });

    test('GET /activities should return activities with stats', async () => {
      const response = await request(API_URL)
        .get('/activities')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(response.body).toHaveProperty('activities');
      expect(response.body).toHaveProperty('stats');
      expect(Array.isArray(response.body.activities)).toBeTruthy();
    });

    test('GET /activities/:id should return activity details', async () => {
      const response = await request(API_URL)
        .get(`/activities/${testActivityId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(response.body).toHaveProperty('_id', testActivityId);
    });

    test('PUT /activities/:id/status should update activity status', async () => {
      const response = await request(API_URL)
        .put(`/activities/${testActivityId}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'completed' })
        .expect(200);
      expect(response.body).toHaveProperty('status', 'completed');
    });
  });

  // 帖子相关测试
  describe('Post Endpoints', () => {
    test('POST /posts should create new post', async () => {
      const post = {
        content: 'Test post',
        activityId: new mongoose.Types.ObjectId().toString(),
      };
      const response = await request(API_URL)
        .post('/posts')
        .set('Authorization', `Bearer ${token}`)
        .send(post)
        .expect(201);
      expect(response.body).toHaveProperty('content', 'Test post');
    });

    test('GET /posts should return posts list', async () => {
      const response = await request(API_URL)
        .get('/posts')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(Array.isArray(response.body)).toBeTruthy();
    });
  });

  // 统计相关测试
  describe('Stats Endpoints', () => {
    test('GET /stats/user should return user statistics', async () => {
      const response = await request(API_URL)
        .get('/stats/user')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(response.body).toHaveProperty('personal');
      expect(response.body.personal).toHaveProperty('totalPoints');
      expect(response.body.personal).toHaveProperty('progress');
    });

    test('GET /stats/team/:teamId should return team statistics', async () => {
      const teamId = new mongoose.Types.ObjectId().toString();
      const response = await request(API_URL)
        .get(`/stats/team/${teamId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(response.body).toHaveProperty('teamInfo');
      expect(response.body).toHaveProperty('memberStats');
      expect(response.body).toHaveProperty('activityStats');
    });

    test('PUT /stats/user/target should update user target', async () => {
      const newTarget = {
        targetPoints: 2000
      };
      const response = await request(API_URL)
        .put('/stats/user/target')
        .set('Authorization', `Bearer ${token}`)
        .send(newTarget)
        .expect(200);
      expect(response.body).toHaveProperty('targetPoints', 2000);
      expect(response.body).toHaveProperty('progress');
    });
  });

  // 错误处理测试
  describe('Error Handling', () => {
    test('POST /activities should validate activity type', async () => {
      const invalidActivity = {
        type: 'Invalid',
        name: 'Invalid Activity',
        duration: 30
      };
      const response = await request(API_URL)
        .post('/activities')
        .set('Authorization', `Bearer ${token}`)
        .send(invalidActivity)
        .expect(400);
      expect(response.body).toHaveProperty('message');
    });

    test('PUT /activities/:id/status should validate status', async () => {
      const response = await request(API_URL)
        .put(`/activities/${testActivityId}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'invalid_status' })
        .expect(400);
      expect(response.body).toHaveProperty('message');
    });

    test('GET /stats/team/:teamId should handle non-existent team', async () => {
      const nonExistentTeamId = new mongoose.Types.ObjectId().toString();
      const response = await request(API_URL)
        .get(`/stats/team/${nonExistentTeamId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
      expect(response.body).toHaveProperty('message');
    });
  });
}); 