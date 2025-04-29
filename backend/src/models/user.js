const mongoose = require('mongoose');

/**
 * User Schema
 * 
 * Defines the structure for user accounts in the application.
 * Includes authentication fields, profile information, and verification data.
 */
const userSchema = new mongoose.Schema({
  // Authentication fields
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
  
  // Profile information
  name: {
    type: String,
    required: true
  },
  username: {
    type: String,
    required: true
  },
  avatar: {
    type: String,
    default: null
  },
  
  // Account verification fields
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
  },
  
  // Password reset fields
  resetToken: {
    type: String,
    default: null
  },
  resetTokenExpires: {
    type: Date,
    default: null
  }
}, {
  timestamps: true  // Automatically add createdAt and updatedAt fields
});

// Export the model
module.exports = mongoose.model('User', userSchema); 