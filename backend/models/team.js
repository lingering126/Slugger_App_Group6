const mongoose = require('mongoose');
const UserTarget = require('./userTarget');

// Function to generate a random six-digit ID
function generateSixDigitId() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Helper function to calculate target value from member userTargets
async function calculateTeamTargetValue(members) {
  let targetValue = 0;
  
  // Get all userTargets for team members
  const userTargets = await UserTarget.find({ userId: { $in: members } });
  
  // Sum up the weeklyTarget values
  userTargets.forEach(target => {
    targetValue += target.weeklyTarget;
  });
  
  return targetValue;
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
    type: Number, // Total target value
    required: true,
    default: 0
  },
  weeklyLimitPhysical: {
    type: Number, // Weekly physical limit
    required: true,
    default: 700
  },
  weeklyLimitMental: {
    type: Number, // Weekly mental limit
    required: true,
    default: 700
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId, // List of user IDs
    ref: 'User'
  }],
  createdAt: {
    type: Date, // Creation timestamp
    default: Date.now
  }
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

// Update targetValue before saving by summing all member userTargets
teamSchema.pre('save', async function(next) {
  try {
    // Only recalculate if members have changed or document is new
    if (this.isNew || this.isModified('members')) {
      this.targetValue = await calculateTeamTargetValue(this.members);
    }
    next();
  } catch (error) {
    next(error);
  }
});

// Export the Team model
module.exports = mongoose.model('Team', teamSchema);