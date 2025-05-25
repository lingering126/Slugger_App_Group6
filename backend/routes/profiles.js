const express = require('express');
const router = express.Router();
const Profile = require('../src/models/profile');
const User = require('../src/models/user');
// Removed internal authMiddleware import, will rely on router-level auth
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

async function uploadAvatarToCDN(base64Data, contentType) {
  const filename = `${uuidv4()}.${contentType.split('/')[1] || 'jpg'}`;
  const buffer = Buffer.from(base64Data, 'base64');
  const url = `https://avatar-worker.slugger4health-avatar.workers.dev/${filename}`;

  const res = await axios.post(url, buffer, {
    headers: {
      'Content-Type': contentType
    }
  });

  if (res.status === 200 && res.data && res.data.url) {
    return res.data.url;
  } else {
    throw new Error('Failed to upload avatar to CDN');
  }
}

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
    if (avatarUrl && avatarUrl.startsWith('data:')) {
      try {
        const matches = avatarUrl.match(/^data:(.+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
          throw new Error('Invalid base64 image format');
        }
    
        const contentType = matches[1];
        const base64Data = matches[2];
    
        // Check image type
        const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
        if (!allowedTypes.includes(contentType)) {
          return res.status(400).json({
            message: `Invalid image type. Only PNG, JPEG, and WebP are allowed. Received: ${contentType}`
          });
        }
    
        // Check image size
        const MAX_SIZE = 3 * 1024 * 1024;
        const byteSize = Buffer.byteLength(base64Data, 'base64');
        if (byteSize > MAX_SIZE) {
          return res.status(400).json({
            message: `Image too large. Max allowed size is 3MB. Your image is ${(byteSize / 1024).toFixed(2)}KB`
          });
        }
    
        // Check if avatar content actually changed
        const existingProfile = await Profile.findOne({ user: userId });
        const oldAvatarUrl = existingProfile?.avatarUrl;
    
        let isNewAvatar = true;
        if (oldAvatarUrl && oldAvatarUrl.startsWith('https://avatar-worker.slugger4health-avatar.workers.dev/')) {
          const oldFileName = oldAvatarUrl.split('/').pop();
          const newHashStub = require('crypto').createHash('md5').update(base64Data).digest('hex').slice(0, 8);
    
          if (oldFileName && oldFileName.startsWith(newHashStub)) {
            console.log('Uploaded avatar is the same as existing one, skipping update.');
            isNewAvatar = false;
          }
        }
    
        if (isNewAvatar) {
          // Delete old avatar
          if (oldAvatarUrl && oldAvatarUrl.includes('.workers.dev/')) {
            try {
              const fileName = oldAvatarUrl.split('/').pop();
              const deleteUrl = `https://avatar-worker.slugger4health-avatar.workers.dev/${fileName}`;
              await axios.delete(deleteUrl);
              console.log(`Old avatar deleted from CDN: ${fileName}`);
            } catch (deleteError) {
              console.warn(`Failed to delete old avatar from CDN: ${oldAvatarUrl}`, deleteError.message);
            }
          }
    
          // Upload new avatar
          const cdnUrl = await uploadAvatarToCDN(base64Data, contentType);
          profileFields.avatarUrl = cdnUrl;
          console.log(`New avatar uploaded to CDN: ${cdnUrl}`);
        } else {
          // No changes needed
          console.log('No avatar change detected, skipping CDN update.');
        }
    
      } catch (err) {
        console.error('Failed to upload avatar to CDN:', err);
        return res.status(500).json({ message: 'Failed to upload avatar', error: err.message });
      }
    } else if (avatarUrl && avatarUrl.startsWith('file://')) {
      // From local path, do not process
      console.log('Skipping avatar update because avatarUrl is a local file path.');
      // Do NOT set profileFields.avatarUrl = avatarUrl
    } else if (avatarUrl === null) {
      // Explicitly request clearing avatar
      profileFields.avatarUrl = null;
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
    // And sync avatarUrl from profile to user.avatar
    const userToUpdate = await User.findById(userId);

    if (userToUpdate) {
      console.log(`Found user ${userId} to update. Current name: ${userToUpdate.name}, username: ${userToUpdate.username}. New name from profile: ${name}`);
      let userNeedsSave = false;
      if (name) {
        console.log(`Syncing name for user ${userId}. Old: ${userToUpdate.name}, New: ${name}`);
        userToUpdate.name = name;
        userToUpdate.username = name; // Sync username with the profile name
        userNeedsSave = true;
      }

      // Sync avatarUrl from profile to user.avatar
      if (profileFields.avatarUrl) {
        console.log(`Syncing avatar for user ${userId}.`);
        userToUpdate.avatar = profileFields.avatarUrl;
        userNeedsSave = true;
      } else if (avatarUrl === null && profileFields.hasOwnProperty('avatarUrl')) {
        // If avatarUrl was explicitly set to null in the request, also set user.avatar to null
        console.log(`Syncing avatar for user ${userId} to null.`);
        userToUpdate.avatar = null;
        userNeedsSave = true;
      }

      if (userNeedsSave) {
        try {
          await userToUpdate.save();
          console.log(`User model for ${userId} successfully updated with name and/or avatar.`);
        } catch (userUpdateError) {
          console.error(`Error updating User model (name/avatar) for ${userId}:`, userUpdateError);
          // Decide if this is a critical error. For now, we'll log and continue,
          // as the profile itself was saved.
          // Consider if you want to throw an error to make the entire PUT fail.
          throw new Error(`Profile saved, but failed to sync name/avatar to User record: ${userUpdateError.message}`);
        }
      }
    } else {
      console.warn(`User ${userId} not found in User collection during profile field synchronization.`);
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
