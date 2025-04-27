const jwt = require('jsonwebtoken');

const token = jwt.sign(
  { userId: '1' },
  process.env.JWT_SECRET || 'fallback_secret_key'
);

console.log('Generated token:', token); 