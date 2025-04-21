const jwt = require('jsonwebtoken');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxIiwiaWF0IjoxNzQ1MjQyMDQ3fQ.DZDnvAGF18E4MnqLe6zBJy5ZUNTNIRdSwwCvhLYcqhw';

try {
  const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key');
  console.log('Token is valid!');
  console.log('Decoded data:', decoded);
} catch (error) {
  console.error('Token verification failed:', error.message);
} 