const express = require('express');
const router = express.Router();
const Profile = require('../src/models/profile');
const User = require('../src/models/user');
const authMiddleware = require('../src/middleware/auth');

/**
 * @route GET /api/profiles/me
 * @desc Get current user's profile
 * @access Private
 */
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id; // Corrected from req.userData.userId
    
    // Find profile by user ID, populate with username from user
    let profile = await Profile.findOne({ user: userId }).populate('user', 'email username');
    
    // If profile doesn't exist, create a new one
    if (!profile) {
      // Get user data to initialize profile
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Create new profile with user data
      profile = new Profile({
        user: userId,
        name: user.name || user.username || '',
        bio: user.bio || '',
        longTermGoal: user.longTermGoal || '',
        avatarUrl: user.avatarUrl || null,
        activitySettings: user.activitySettings || {
          physicalActivities: [],
          mentalActivities: [],
          bonusActivities: []
        }
      });
      
      await profile.save();
    }
    
    res.json(profile);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route GET /api/profiles/:userId
 * @desc Get profile by user ID
 * @access Private
 */
router.get('/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const profile = await Profile.findOne({ user: userId }).populate('user', 'email username');
    
    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }
    
    res.json(profile);
  } catch (error) {
    console.error('Error fetching profile by user ID:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route PUT /api/profiles
 * @desc Update current user's profile
 * @access Private
 */
router.put('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id; // Corrected from req.userData.userId
    const { name, bio, longTermGoal, avatarUrl, activitySettings, status } = req.body;
    
    // Build profile object with submitted fields
    const profileFields = {};
    if (name) profileFields.name = name;
    if (bio !== undefined) profileFields.bio = bio;
    if (longTermGoal !== undefined) profileFields.longTermGoal = longTermGoal;
    if (avatarUrl) profileFields.avatarUrl = avatarUrl;
    if (activitySettings) profileFields.activitySettings = activitySettings;
    if (status) profileFields.status = status;
    
    // Update or create profile
    let profile = await Profile.findOne({ user: userId });
    
    if (profile) {
      // Update existing profile
      profile = await Profile.findOneAndUpdate(
        { user: userId },
        { $set: profileFields },
        { new: true }
      ).populate('user', 'email username');
    } else {
      // Create new profile
      profile = new Profile({
        user: userId,
        ...profileFields
      });
      
      await profile.save();
      profile = await Profile.findOne({ user: userId }).populate('user', 'email username');
    }

    // Also update the User model's name and username for consistency
    if (name) {
      try {
        const userToUpdate = await User.findById(userId);
        if (userToUpdate) {
          console.log(`Found user ${userId} to update. Current name: ${userToUpdate.name}, username: ${userToUpdate.username}. New name from profile: ${name}`);
          userToUpdate.name = name;
          userToUpdate.username = name; // Sync username with the profile name
          await userToUpdate.save();
          console.log(`User model for ${userId} successfully updated. New name: ${userToUpdate.name}, username: ${userToUpdate.username}`);
        } else {
          console.warn(`User ${userId} not found in User collection during profile update.`);
        }
      } catch (userUpdateError) {
        console.error(`Error updating User model for ${userId} during profile save:`, userUpdateError);
        // This error IS critical for name consistency.
        // If User model update fails, we should inform the client.
        // Throw an error to be caught by the main catch block, or return a specific error response.
        // For now, let's make it part of the main error handling.
        throw new Error(`Profile saved, but failed to sync name to User record: ${userUpdateError.message}`);
      }
    }
    
    // Re-fetch profile to ensure populated user reflects any changes if User model was updated
    // This is important if the populated 'user' in the profile response is used immediately by client
    if (profile) {
        profile = await Profile.findById(profile._id).populate('user', 'email username name');
    }

    res.json(profile);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route PUT /api/profiles/activities
 * @desc Update user's activity settings
 * @access Private
 */
router.put('/activities', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id; // Corrected from req.userData.userId
    const activitySettings = req.body;
    
    if (!activitySettings) {
      return res.status(400).json({ message: 'Activity settings are required' });
    }
    
    // Update profile's activity settings
    const profile = await Profile.findOneAndUpdate(
      { user: userId },
      { $set: { activitySettings } },
      { new: true, upsert: true }
    ).populate('user', 'email username');
    
    res.json(profile);
  } catch (error) {
    console.error('Error updating activity settings:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
