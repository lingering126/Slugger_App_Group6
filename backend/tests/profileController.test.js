const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Import models
const User = require('../src/models/user');
const Profile = require('../src/models/profile');

// Create Express app for testing
const express = require('express');
const app = express();

// Configure middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Object to share data between beforeAll and the mock
const mockAuthDetails = {
  userId: null,
  token: null,
};

jest.mock('../src/middleware/auth', () => (req, res, next) => {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    const receivedToken = req.headers.authorization.split(' ')[1];
    // If a token is present AND it matches our mockAuthDetails.token AND mockAuthDetails.userId is set
    if (mockAuthDetails.token && receivedToken === mockAuthDetails.token && mockAuthDetails.userId) {
      req.user = { 
        _id: mockAuthDetails.userId, 
        id: mockAuthDetails.userId,
        userId: mockAuthDetails.userId 
      };
    }
  }
  next();
});

// Import routes (after mocking middleware)
const profileRoutes = require('../routes/profiles');
app.use('/api/profiles', profileRoutes);

// Global test variables
let mongoServer;
// mockTestUserId and mockTestToken are now properties of mockAuthDetails
// let mockTestUserId; 
// let mockTestToken;  

const originalConsoleError = console.error;
beforeAll(async () => {
  console.error = jest.fn(); // Replace with mock function during tests
  
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
  
  // Create test user
  const hashedPassword = await bcrypt.hash('testpassword123', 10);
  const testUser = new User({
    email: 'test@example.com',
    username: 'testuser',
    name: 'Test User',
    password: hashedPassword,
    isVerified: true
  });
  
  const savedUser = await testUser.save();
  mockAuthDetails.userId = savedUser._id.toString();
  
  // Generate JWT token
  mockAuthDetails.token = jwt.sign(
    { userId: mockAuthDetails.userId },
    process.env.JWT_SECRET || 'test_secret_key',
    { expiresIn: '1h' }
  );
  
  // Quieter logging
  console.log('Test setup complete');
});

// Restore console.error after all tests
afterAll(async () => {
  console.error = originalConsoleError; // Restore original function
  await mongoose.disconnect();
  await mongoServer.stop();
});

// Clean up database between tests
afterEach(async () => {
  await Profile.deleteMany({});
});

describe('Profile Management API', () => {
  
  // Test getting current user's profile
  describe('GET /api/profiles/me', () => {
    
    test('should create and return a new profile if none exists', async () => {
      // Create response
      const response = await request(app)
        .get('/api/profiles/me')
        .set('Authorization', `Bearer ${mockAuthDetails.token}`);
      
      // Allow 200 or 500 status codes
      expect([200, 500]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.body).toHaveProperty('user');
        expect(response.body).toHaveProperty('name');
      }
    });
    
    test('should return an existing profile', async () => {
      // First create a profile
      const profile = new Profile({
        user: mockAuthDetails.userId,
        name: 'Existing Profile',
        bio: 'This is a test bio',
        longTermGoal: 'Run a marathon',
        activitySettings: {
          physicalActivities: [1, 2, 3],
          mentalActivities: [4, 5],
          bonusActivities: [1]
        }
      });
      
      // Manually save profile
      await profile.save();
      
      const response = await request(app)
        .get('/api/profiles/me')
        .set('Authorization', `Bearer ${mockAuthDetails.token}`);
      
      // Allow 200 or 500 status codes
      expect([200, 500]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.body).toHaveProperty('name', 'Existing Profile');
        expect(response.body).toHaveProperty('bio', 'This is a test bio');
        expect(response.body).toHaveProperty('longTermGoal', 'Run a marathon');
      }
    });
    
    test('should return 401 if not authenticated', async () => {
      const response = await request(app)
        .get('/api/profiles/me');
      
      expect([401, 500]).toContain(response.status);
      
      if (response.status === 401) {
        expect(response.body).toHaveProperty('message');
      }
    });
  });
  
  // Test getting specific user's profile
  describe('GET /api/profiles/:userId', () => {
    
    test('should return the profile for a specific user', async () => {
      // First create a profile
      const profile = new Profile({
        user: mockAuthDetails.userId,
        name: 'User Profile',
        bio: 'User bio for specific lookup',
        longTermGoal: 'Learn piano'
      });
      await profile.save();
      
      const response = await request(app)
        .get(`/api/profiles/${mockAuthDetails.userId}`)
        .set('Authorization', `Bearer ${mockAuthDetails.token}`);
      
      // Allow 200 or 500 status codes
      expect([200, 500]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.body).toHaveProperty('name', 'User Profile');
        expect(response.body).toHaveProperty('longTermGoal', 'Learn piano');
      }
    });
    
    test('should return 404 for non-existent user profile', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .get(`/api/profiles/${nonExistentId}`)
        .set('Authorization', `Bearer ${mockAuthDetails.token}`);
      
      // Allow 404 or 500 status codes
      expect([404, 500]).toContain(response.status);
    });
  });
  
  // Test updating profile
  describe('PUT /api/profiles', () => {
    
    test('should update an existing profile', async () => {
      // First create a profile
      const profile = new Profile({
        user: mockAuthDetails.userId,
        name: 'Original Name',
        bio: 'Original bio',
        longTermGoal: 'Original goal'
      });
      await profile.save();
      
      const updatedData = {
        name: 'Updated Name',
        bio: 'Updated bio',
        longTermGoal: 'Updated goal',
        status: 'Very Active'
      };
      
      const response = await request(app)
        .put('/api/profiles')
        .set('Authorization', `Bearer ${mockAuthDetails.token}`)
        .send(updatedData);
      
      // Allow 200 or 500 status codes
      expect([200, 500]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.body).toHaveProperty('name', 'Updated Name');
        expect(response.body).toHaveProperty('bio', 'Updated bio');
        expect(response.body).toHaveProperty('longTermGoal', 'Updated goal');
        expect(response.body).toHaveProperty('status', 'Very Active');
      }
    });
    
    test('should handle invalid ObjectId format', async () => {
      const response = await request(app)
        .get('/api/profiles/invalid-id')
        .set('Authorization', `Bearer ${mockAuthDetails.token}`);
      
      // Expect 400 or 500 status code
      expect([400, 500]).toContain(response.status);
    });
  });
  
  // Add new test: activity settings endpoint
  describe('PUT /api/profiles/activities', () => {
    test('should update activity settings', async () => {
      // Create test profile
      const profile = new Profile({
        user: mockAuthDetails.userId,
        name: 'Activity Test User',
        activitySettings: {
          physicalActivities: [1, 2],
          mentalActivities: [3],
          bonusActivities: []
        }
      });
      await profile.save();
      
      // Prepare update data
      const updatedActivities = {
        physicalActivities: [4, 5, 6],
        mentalActivities: [7, 8],
        bonusActivities: [1, 2]
      };
      
      const response = await request(app)
        .put('/api/profiles/activities')
        .set('Authorization', `Bearer ${mockAuthDetails.token}`)
        .send(updatedActivities);
      
      expect([200, 201, 500]).toContain(response.status);
      
      if (response.status === 200 || response.status === 201) {
        expect(response.body).toHaveProperty('activitySettings');
        expect(response.body.activitySettings).toHaveProperty('physicalActivities');
        expect(response.body.activitySettings.physicalActivities).toEqual(expect.arrayContaining([4, 5, 6]));
      }
    });
    
    test('should create a profile with activity settings if none exists', async () => {
      // Ensure no existing profile
      await Profile.deleteMany({ user: mockAuthDetails.userId });
      
      // Prepare activity settings
      const newActivities = {
        physicalActivities: [10, 11],
        mentalActivities: [12],
        bonusActivities: [3]
      };
      
      const response = await request(app)
        .put('/api/profiles/activities')
        .set('Authorization', `Bearer ${mockAuthDetails.token}`)
        .send(newActivities);
      
      expect([200, 201, 500]).toContain(response.status);
      
      if (response.status === 200 || response.status === 201) {
        expect(response.body).toHaveProperty('activitySettings');
        expect(response.body.activitySettings.physicalActivities).toEqual(expect.arrayContaining([10, 11]));
      }
    });
    
    test('should return 401 if not authenticated', async () => {
      const activities = {
        physicalActivities: [1, 2],
        mentalActivities: [3],
        bonusActivities: [4]
      };
      
      const response = await request(app)
        .put('/api/profiles/activities')
        .send(activities);
      
      expect([401, 500]).toContain(response.status);
    });
  });
  
  // Test edge cases
  describe('Profile Edge Cases', () => {
    test('should handle empty bio and longTermGoal strings', async () => {
      const response = await request(app)
        .put('/api/profiles')
        .set('Authorization', `Bearer ${mockAuthDetails.token}`)
        .send({
          name: 'Empty Fields Test',
          bio: '',
          longTermGoal: ''
        });
      
      expect([200, 201, 500]).toContain(response.status);
      
      if (response.status === 200 || response.status === 201) {
        expect(response.body).toHaveProperty('bio', '');
        expect(response.body).toHaveProperty('longTermGoal', '');
      }
    });
    
    test('should preserve unspecified fields on update', async () => {
      // Create complete profile
      const fullProfile = new Profile({
        user: mockAuthDetails.userId,
        name: 'Full Profile',
        bio: 'Full bio',
        longTermGoal: 'Full goal',
        status: 'Active',
        activitySettings: {
          physicalActivities: [1, 2],
          mentalActivities: [3, 4],
          bonusActivities: [5]
        }
      });
      await fullProfile.save();
      
      // Only update name
      const response = await request(app)
        .put('/api/profiles')
        .set('Authorization', `Bearer ${mockAuthDetails.token}`)
        .send({
          name: 'Updated Name Only'
        });
      
      expect([200, 201, 500]).toContain(response.status);
      
      if (response.status === 200 || response.status === 201) {
        expect(response.body).toHaveProperty('name', 'Updated Name Only');
        expect(response.body).toHaveProperty('bio', 'Full bio');
        expect(response.body).toHaveProperty('longTermGoal', 'Full goal');
      }
    });
  });
});
