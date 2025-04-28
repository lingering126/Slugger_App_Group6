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
  targetMentalValue: {
    type: Number, // Mental target value
    required: true,
    default: 0
  },
  targetPhysicalValue: {
    type: Number, // Physical target value
    required: true,
    default: 0
  },
  targetValue: {
    type: Number, // Total target value
    required: true,
    default: 0
  },
  targetStartDate: {
    type: Date,
    required: true,
    default: Date.now // Set to the exact time of creation
  },
  targetEndDate: {
    type: Date,
    required: true,
    default: function() {
      // `this.targetStartDate` should be set by the default above
      const startDate = this.targetStartDate || new Date(); // Fallback just in case
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 7);
      endDate.setMilliseconds(endDate.getMilliseconds() - 1); // End exactly 7 days later
      return endDate;
    }
  },
  dailyLimitPhysical: {
    type: Number, // Daily physical limit
    required: true,
    default: 100
  },
  dailyLimitMental: {
    type: Number, // Daily mental limit
    required: true,
    default: 100
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

// Calculate total target value before saving
groupSchema.pre('save', function(next) {
  this.targetValue = this.targetMentalValue + this.targetPhysicalValue;
  next();
});

// Export the Group model
module.exports = mongoose.model('Group', groupSchema);