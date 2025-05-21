const express = require('express');
const router = express.Router();
const Profile = require('../src/models/profile');
const User = require('../src/models/user');
// Removed internal authMiddleware import, will rely on router-level auth

/**
 * @route GET /api/profiles/me
 * @desc Get current user's profile
 * @access Private
 */
router.get('/me', async (req, res) => {
  console.log('==== GET /api/profiles/me START ====');
  try {
    // Safely extract user ID with validation
    if (!req.user) {
      console.error('req.user is missing - auth middleware may not be working properly');
      return res.status(401).json({ message: 'Authentication error: User not identified' });
    }
    
    const userId = req.user.id || req.user.userId || req.user._id;
    if (!userId) {
      console.error('User ID not found in req.user:', req.user);
      return res.status(401).json({ message: 'Authentication error: User ID not found' });
    }
    
    console.log(`Looking up profile for user: ${userId}`);
    
    // Find profile by user ID, populate with username from user
    let profile = await Profile.findOne({ user: userId }).populate('user', 'email username');
    
    // If profile doesn't exist, create a new one
    if (!profile) {
      console.log(`No profile found for user ${userId}, creating new profile`);
      
      // Get user data to initialize profile
      const user = await User.findById(userId);
      if (!user) {
        console.error(`User ${userId} not found in database`);
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
      console.log(`New profile created for user ${userId}`);
      
      // Re-fetch and populate the newly created profile to ensure 'user' field is populated
      profile = await Profile.findById(profile._id).populate('user', 'email username');
    }
    
    console.log('==== GET /api/profiles/me END - SUCCESS ====');
    res.json(profile);
  } catch (error) {
    console.error('==== GET /api/profiles/me END - ERROR ====');
    console.error('Error fetching profile:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route GET /api/profiles/:userId
 * @desc Get profile by user ID
 * @access Private
 */
router.get('/:userId', async (req, res) => {
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
router.put('/', async (req, res) => {
  console.log('==== PUT /api/profiles START ====');
  console.log('PUT /api/profiles req.body:', JSON.stringify(req.body, null, 2)); 
  console.log('PUT /api/profiles req.user:', JSON.stringify(req.user, null, 2));
  
  try {
    // Safely extract user ID with validation
    if (!req.user) {
      console.error('req.user is missing - auth middleware may not be working properly');
      return res.status(401).json({ message: 'Authentication error: User not identified' });
    }
    
    const userId = req.user.id || req.user.userId || req.user._id;
    if (!userId) {
      console.error('User ID not found in req.user:', req.user);
      return res.status(401).json({ message: 'Authentication error: User ID not found' });
    }
    
    console.log(`Processing profile update for user: ${userId}`);
    
    // Verify userId is valid
    console.log(`Validating user ID: ${userId}`);
    const userExists = await User.findById(userId);
    if (!userExists) {
      console.error(`User with ID ${userId} not found in database`);
      return res.status(404).json({ message: 'User not found' });
    }
    console.log(`User found: ${userExists.name} (${userExists._id})`);

    const { name, bio, longTermGoal, avatarUrl, activitySettings, status } = req.body;
    
    // Build profile object with submitted fields
    const profileFields = {};
    if (name) profileFields.name = name;
    if (bio !== undefined) profileFields.bio = bio;
    if (longTermGoal !== undefined) profileFields.longTermGoal = longTermGoal;
    if (avatarUrl) {
      // Only log a partial sample of the avatar data to keep logs manageable
      console.log(`Avatar data provided: ${typeof avatarUrl === 'string' ? 'String data of length ' + avatarUrl.length : 'No avatar data'}`);
      profileFields.avatarUrl = avatarUrl;
    }
    if (activitySettings) profileFields.activitySettings = activitySettings;
    if (status) profileFields.status = status;
    
    // Update or create profile
    let profile;
    try {
      profile = await Profile.findOne({ user: userId });
      console.log(`Profile lookup result: ${profile ? 'Found existing profile' : 'No profile found, will create new one'}`);
    
      if (profile) {
        // Update existing profile
        try {
          profile = await Profile.findOneAndUpdate(
            { user: userId },
            { $set: profileFields },
            { new: true }
          ).populate('user', 'email username');
          console.log(`Profile updated successfully for user ${userId}`);
        } catch (updateError) {
          console.error(`Error updating profile for user ${userId}:`, updateError);
          throw updateError;
        }
      } else {
        // Create new profile
        try {
          profile = new Profile({
            user: userId,
            ...profileFields
          });
          
          await profile.save();
          console.log(`New profile created for user ${userId}`);
          profile = await Profile.findOne({ user: userId }).populate('user', 'email username');
        } catch (createError) {
          console.error(`Error creating new profile for user ${userId}:`, createError);
          throw createError;
        }
      }
    } catch (profileError) {
      console.error(`Profile operation error for user ${userId}:`, profileError);
      return res.status(500).json({ 
        message: 'Error in profile operation', 
        error: profileError.message 
      });
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
      try {
        profile = await Profile.findById(profile._id).populate('user', 'email username name');
        console.log(`Final profile object fetched for response: ${profile ? 'Success' : 'Failed'}`);
      } catch (populateError) {
        console.error(`Error re-fetching profile with populated data: ${populateError.message}`);
        // Continue with the current profile object
      }
    }

    console.log('==== END PUT /api/profiles - SUCCESS ====');
    res.json(profile);
  } catch (error) {
    console.error('==== END PUT /api/profiles - ERROR ====');
    console.error('Error updating profile:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route PUT /api/profiles/activities
 * @desc Update user's activity settings
 * @access Private
 */
router.put('/activities', async (req, res) => {
  console.log('==== PUT /api/profiles/activities START ====');
  console.log('Request body:', JSON.stringify(req.body, null, 2));
  
  try {
    // Safely extract user ID with validation
    if (!req.user) {
      console.error('req.user is missing - auth middleware may not be working properly');
      return res.status(401).json({ message: 'Authentication error: User not identified' });
    }
    
    const userId = req.user.id || req.user.userId || req.user._id;
    if (!userId) {
      console.error('User ID not found in req.user:', req.user);
      return res.status(401).json({ message: 'Authentication error: User ID not found' });
    }
    
    console.log(`Processing activity settings update for user: ${userId}`);
    
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
    
    console.log('==== PUT /api/profiles/activities END - SUCCESS ====');
    res.json(profile);
  } catch (error) {
    console.error('==== PUT /api/profiles/activities END - ERROR ====');
    console.error('Error updating activity settings:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
