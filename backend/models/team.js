const mongoose = require('mongoose');
const UserTarget = require('./userTarget');

// Function to generate a random six-digit ID
function generateSixDigitId() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Define the schema for the Team model
const teamSchema = new mongoose.Schema({
  teamId: {
    type: String, // Unique team ID
    unique: true,
    required: true,
    length: 6
  },
  name: {
    type: String, // Team name
    required: true
  },
  description: String, // Team description
  targetName: {
    type: String, // Target category
    enum: [
      'Target 1',
      'Target 2',
      'Target 3',
      'Target 4',
      'Target 5',
      'Target 6',
      'Target 7',
      'Target 8',
      'Target 9',
      'Target 10'
    ],
    required: true
  },
  targetValue: {
    type: Number, // Total target value (sum of members' personal values)
    required: true,
    default: 0
  },
  weeklyLimitPhysical: {
    type: Number, // Weekly physical limit
    required: true,
    default: 7
  },
  weeklyLimitMental: {
    type: Number, // Weekly mental limit
    required: true,
    default: 7
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId, // List of user IDs
    ref: 'User'
  }],
  createdAt: {
    type: Date, // Stores the UTC 00:00:00.000 of the creation day
    required: true,
    default: function() {
      const now = new Date();
      return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
    }
  },
});

// Generate a unique teamId before saving
teamSchema.pre('validate', async function(next) {
  if (this.isNew) {
    let exists = true;
    while (exists) {
      const id = generateSixDigitId();
      exists = await mongoose.models.Team.findOne({ teamId: id });
      if (!exists) this.teamId = id;
    }
  }
  next();
});

// Pre-save hook for Team model
teamSchema.pre('save', async function(next) {
  // createdAt is now handled by schema default.
  try {
    // Update team targetValue if members array has changed or this is a new document
    if (this.isNew || this.isModified('members')) {
      const userTargets = await UserTarget.find({
        userId: { $in: this.members }
      });
      
      let totalValue = 0;
      if (userTargets && userTargets.length > 0) {
        totalValue = userTargets.reduce((sum, target) => sum + (target.targetValue || 1), 0);
      } else {
        // If no explicit targets are found, use default value (1) for each member
        totalValue = this.members.length; 
      }
      this.targetValue = totalValue;
    }
    next();
  } catch (error) {
    console.error('Error in team pre-save hook:', error);
    next(error);
  }
});

// Method to manually update the team's targetValue
teamSchema.methods.updateTargetValue = async function() {
  try {
    const userTargets = await UserTarget.find({
      userId: { $in: this.members }
    });
    
    let totalValue = 0;
    if (userTargets && userTargets.length > 0) {
      totalValue = userTargets.reduce((sum, target) => sum + (target.targetValue || 1), 0);
    } else {
      totalValue = this.members.length;
    }
    
    this.targetValue = totalValue;
    return this.save();
  } catch (error) {
    console.error('Error updating team targetValue:', error);
    throw error;
  }
};

// Export the Team model
module.exports = mongoose.model('Team', teamSchema);
