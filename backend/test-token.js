/**
 * JWT Token Generation Utility
 * 
 * Creates a JWT token for testing authentication.
 * Run this script to generate a token that can be used for API testing.
 */
const jwt = require('jsonwebtoken');

const token = jwt.sign(
  { userId: '1' },
  process.env.JWT_SECRET || 'fallback_secret_key'
);

console.log('Generated token:', token); 