const mongoose = require('mongoose');

/**
 * Profile Schema
 * Stores user profile information separate from authentication data
 */
const profileSchema = new mongoose.Schema({
  // Reference to the User model
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  // Profile fields moved from User model
  name: {
    type: String,
    required: true,
    trim: true
  },
  avatarUrl: {
    type: String,
    default: null
  },
  bio: {
    type: String,
    default: '',
    trim: true,
    maxlength: 500
  },
  longTermGoal: {
    type: String,
    default: '',
    trim: true,
    maxlength: 500
  },
  // Activity settings (previously part of user model)
  activitySettings: {
    physicalActivities: [{
      type: Number
    }],
    mentalActivities: [{
      type: Number
    }],
    bonusActivities: [{
      type: Number
    }]
  },
  // Additional profile-specific fields could be added here
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'Away', 'Busy'],
    default: 'Active'
  }
}, {
  timestamps: true // Automatically add createdAt and updatedAt fields
});

// Create index for faster lookups by user ID
profileSchema.index({ user: 1 });

// Create a virtual property to get the username from the associated user
profileSchema.virtual('username', {
  ref: 'User',
  localField: 'user',
  foreignField: '_id',
  justOne: true,
  get: function(user) {
    return user ? user.username : null;
  }
});

// Instance methods
profileSchema.methods = {
  // Format the profile for API responses (removes sensitive data)
  toJSON: function() {
    const profile = this.toObject();
    return profile;
  }
};

// Static methods
profileSchema.statics = {
  /**
   * Get profile by user ID
   * @param {ObjectId} userId - The ID of the user
   * @returns {Promise<Profile>}
   */
  async getByUserId(userId) {
    try {
      return await this.findOne({ user: userId });
    } catch (error) {
      throw error;
    }
  },

  /**
   * Create or update a profile
   * @param {ObjectId} userId - The ID of the user
   * @param {Object} profileData - Profile data to update
   * @returns {Promise<Profile>}
   */
  async createOrUpdateProfile(userId, profileData) {
    try {
      const profile = await this.findOneAndUpdate(
        { user: userId },
        { ...profileData },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
      return profile;
    } catch (error) {
      throw error;
    }
  }
};

const Profile = mongoose.model('Profile', profileSchema);

module.exports = Profile;
