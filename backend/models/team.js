const mongoose = require('mongoose');

// Function to generate a random six-digit ID
function generateSixDigitId() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Define the schema for the Group model
const groupSchema = new mongoose.Schema({
  groupId: {
    type: String, // Unique group ID
    unique: true,
    required: true,
    length: 6
  },
  name: {
    type: String, // Group name
    required: true
  },
  description: String, // Group description
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
  targetGoal: {
    type: Number, // Sum of all members' personal goals
    default: 0
  },
  weeklyLimitPhysical: {
    type: Number, // Weekly physical limit
    required: true,
    default: 7,
    max: 7
  },
  weeklyLimitMental: {
    type: Number, // Weekly mental limit
    required: true,
    default: 7,
    max: 7
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

// Generate a unique groupId before saving
groupSchema.pre('validate', async function(next) {
  if (this.isNew) {
    let exists = true;
    while (exists) {
      const id = generateSixDigitId();
      exists = await mongoose.models.Group.findOne({ groupId: id });
      if (!exists) this.groupId = id;
    }
  }
  next();
});

<<<<<<< Updated upstream:backend/models/group.js
// Calculate total target value before saving
groupSchema.pre('save', function(next) {
  this.targetValue = this.targetMentalValue + this.targetPhysicalValue;
  next();
});

// Export the Group model
module.exports = mongoose.model('Group', groupSchema);
=======
// Method to update the targetGoal value based on members' personal goals
teamSchema.methods.updateTargetGoal = async function() {
  const UserTarget = mongoose.model('UserTarget');
  let sum = 0;
  
  // Get all user targets for team members
  const userTargets = await UserTarget.find({
    userId: { $in: this.members }
  });
  
  // Sum up all targetValues
  for (const userTarget of userTargets) {
    sum += userTarget.targetValue || 0;
  }
  
  this.targetGoal = sum;
  return this.save();
};

// Export the Team model
module.exports = mongoose.model('Team', teamSchema);
>>>>>>> Stashed changes:backend/models/team.js
