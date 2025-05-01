/**
 * Profile Model Unit Tests
 * 
 * Tests the validation rules, methods, and behavior of the Profile model
 */

const mongoose = require('mongoose');
const Profile = require('../src/models/profile');

// Use in-memory database for testing
const { MongoMemoryServer } = require('mongodb-memory-server');
let mongoServer;

describe('Profile Model Tests', () => {
  // Connect to in-memory database before tests
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  // Clean up after tests
  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  // Clean the database between tests
  afterEach(async () => {
    await Profile.deleteMany({});
  });

  test('should create a valid profile', async () => {
    const profileData = {
      user: new mongoose.Types.ObjectId(),
      name: 'Test User',
      bio: 'Test bio',
      longTermGoal: 'Test goal',
      activitySettings: {
        physicalActivities: [1, 2, 3],
        mentalActivities: [4, 5],
        bonusActivities: [1]
      }
    };

    const profile = new Profile(profileData);
    const savedProfile = await profile.save();

    expect(savedProfile._id).toBeDefined();
    expect(savedProfile.name).toBe(profileData.name);
    expect(savedProfile.bio).toBe(profileData.bio);
    expect(savedProfile.longTermGoal).toBe(profileData.longTermGoal);
    expect(savedProfile.activitySettings.physicalActivities).toEqual(
      expect.arrayContaining(profileData.activitySettings.physicalActivities)
    );
  });

  test('should require a name', async () => {
    const profileWithoutName = new Profile({
      user: new mongoose.Types.ObjectId()
      // name is missing
    });

    let error;
    try {
      await profileWithoutName.save();
    } catch (e) {
      error = e;
    }

    expect(error).toBeDefined();
    expect(error.errors.name).toBeDefined();
  });

  test('should require a user reference', async () => {
    const profileWithoutUser = new Profile({
      name: 'Test User'
      // user is missing
    });

    let error;
    try {
      await profileWithoutUser.save();
    } catch (e) {
      error = e;
    }

    expect(error).toBeDefined();
    expect(error.errors.user).toBeDefined();
  });

  test('should enforce bio length limit', async () => {
    // Create a bio that exceeds the max length (assuming 500 is the limit)
    const longBio = 'A'.repeat(501);
    
    const profileWithLongBio = new Profile({
      user: new mongoose.Types.ObjectId(),
      name: 'Test User',
      bio: longBio
    });

    let error;
    try {
      await profileWithLongBio.save();
    } catch (e) {
      error = e;
    }

    expect(error).toBeDefined();
    expect(error.errors.bio).toBeDefined();
  });

  test('should set default status to Active', async () => {
    const profile = new Profile({
      user: new mongoose.Types.ObjectId(),
      name: 'Test User'
      // status not specified
    });

    const savedProfile = await profile.save();
    expect(savedProfile.status).toBe('Active');
  });

  test('should initialize empty activity settings when not provided', async () => {
    const profile = new Profile({
      user: new mongoose.Types.ObjectId(),
      name: 'Test User'
      // activitySettings not provided
    });

    const savedProfile = await profile.save();
    expect(savedProfile.activitySettings).toBeDefined();
    expect(savedProfile.activitySettings.physicalActivities).toEqual([]);
    expect(savedProfile.activitySettings.mentalActivities).toEqual([]);
    expect(savedProfile.activitySettings.bonusActivities).toEqual([]);
  });

  test('should enforce uniqueness of user ID', async () => {
    // Create a user ID to reuse
    const userId = new mongoose.Types.ObjectId();
    
    // Create first profile
    const profile1 = new Profile({
      user: userId,
      name: 'Profile 1'
    });
    await profile1.save();
    
    // Try to create a second profile with the same user ID
    const profile2 = new Profile({
      user: userId,
      name: 'Profile 2'
    });
    
    let error;
    try {
      await profile2.save();
    } catch (e) {
      error = e;
    }
    
    expect(error).toBeDefined();
    expect(error.code).toBe(11000); // MongoDB duplicate key error code
  });

  test('should generate createdAt and updatedAt timestamps', async () => {
    const profile = new Profile({
      user: new mongoose.Types.ObjectId(),
      name: 'Test User'
    });

    const savedProfile = await profile.save();
    expect(savedProfile.createdAt).toBeDefined();
    expect(savedProfile.updatedAt).toBeDefined();
  });

  // Test static methods if they exist
  test('getByUserId method should find a profile by user ID', async () => {
    const userId = new mongoose.Types.ObjectId();
    
    // Create a profile
    const profile = new Profile({
      user: userId,
      name: 'Test User'
    });
    await profile.save();
    
    // Use the static method to find the profile
    const foundProfile = await Profile.getByUserId(userId);
    
    expect(foundProfile).toBeDefined();
    expect(foundProfile.name).toBe('Test User');
    expect(foundProfile.user.toString()).toBe(userId.toString());
  });
});