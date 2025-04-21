const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  username: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  avatar: {
    type: String
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: {
    type: String,
    default: null
  },
  verificationTokenExpires: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Virtual field for public profile
userSchema.virtual('profile').get(function() {
  return {
    id: this._id,
    username: this.username,
    name: this.name,
    email: this.email,
    avatar: this.avatar
  };
});

// Method to check if password matches
userSchema.methods.checkPassword = function(password) {
  return this.password === password; // In production, use proper password hashing
};

const User = mongoose.model('User', userSchema);

module.exports = User; 