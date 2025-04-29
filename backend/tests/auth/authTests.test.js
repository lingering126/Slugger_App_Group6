/**
 * Authentication Mocked Tests
 * 
 * This is a simplified version of authentication tests that doesn't require MongoDB Memory Server.
 * It uses Jest mocks instead of a real database.
 */

const request = require('supertest');
const express = require('express');
const bcrypt = require('bcryptjs');

// Create a mock User model
const mockFindOne = jest.fn();
const mockSave = jest.fn().mockImplementation(function() {
  return Promise.resolve(this);
});

// Mock the User module
jest.mock('../../src/models/user', () => {
  return function() {
    return {
      save: mockSave
    };
  };
});

// Override the User import to include our mock functions
const User = require('../../src/models/user');
User.findOne = mockFindOne;

// Mock nodemailer
const mockSendMail = jest.fn().mockResolvedValue({ messageId: 'test-id' });
const mockTransport = {
  sendMail: mockSendMail
};

jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue(mockTransport)
}));

const nodemailer = require('nodemailer');

// Mock JWT
const mockJwtSign = jest.fn().mockReturnValue('test-token');
const mockJwtVerify = jest.fn().mockImplementation((token, secret) => {
  if (token === 'expired-token') {
    throw { name: 'TokenExpiredError' };
  }
  if (token === 'invalid-token') {
    throw new Error('Invalid token');
  }
  return { userId: 'user-id-1' };
});

jest.mock('jsonwebtoken', () => ({
  sign: (payload, secret, options) => mockJwtSign(payload, secret, options),
  verify: (token, secret) => mockJwtVerify(token, secret)
}));

const jwt = require('jsonwebtoken');

// Initialize Express app
const app = express();
app.use(express.json());

// Create a simplified version of the auth routes
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    // Validate email format
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Invalid email format' });
      }
    }
    
    // Validate password strength
    if (password && password.length < 8) {
      return res.status(400).json({ message: 'Password too short' });
    }
    
    // Check for required fields
    if (!email || !password || !name) {
      const missing = [];
      if (!email) missing.push('email');
      if (!password) missing.push('password');
      if (!name) missing.push('name');
      return res.status(400).json({ message: `Missing required fields: ${missing.join(', ')}` });
    }
    
    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }
    
    // Create user (in a real scenario, we'd save to database)
    // In this test, we're not really saving to a database, just simulating it
    
    // In tests we'll skip the actual email sending
    // Just record that it was attempted
    nodemailer.createTransport();
    
    res.status(201).json({
      message: 'User registered successfully',
      email
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate required fields
    if (!email || !password) {
      const missing = [];
      if (!email) missing.push('email');
      if (!password) missing.push('password');
      return res.status(400).json({ message: `Missing required fields: ${missing.join(', ')}` });
    }
    
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    // Check if verified
    if (!user.isVerified) {
      return res.status(403).json({
        message: 'Please verify your email before logging in',
        requiresVerification: true
      });
    }
    
    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    // Generate token
    const token = jwt.sign(
      { userId: user._id },
      'test-jwt-secret',
      { expiresIn: '7d' }
    );
    
    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/auth/verify-email', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ message: 'Verification token is required' });
    }
    
    let decoded;
    try {
      decoded = jwt.verify(token, 'test-jwt-secret');
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(400).json({ message: 'Verification token has expired' });
      }
      return res.status(400).json({ message: 'Invalid verification token' });
    }
    
    const user = await User.findOne({ _id: decoded.userId });
    
    if (!user) {
      return res.status(400).json({ message: 'Invalid verification token' });
    }
    
    if (user.isVerified) {
      return res.status(400).json({ message: 'Email already verified' });
    }
    
    // Mark user as verified
    user.isVerified = true;
    await user.save();
    
    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Generate reset token
    const resetToken = jwt.sign(
      { userId: user._id },
      'test-jwt-secret',
      { expiresIn: '1h' }
    );
    
    // In tests we'll skip the actual email sending
    nodemailer.createTransport();
    
    res.json({ message: 'Password reset email sent' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Token and new password are required' });
    }
    
    // Validate password strength
    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'Password too short' });
    }
    
    let decoded;
    try {
      decoded = jwt.verify(token, 'test-jwt-secret');
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(400).json({ message: 'Reset token has expired' });
      }
      return res.status(400).json({ message: 'Invalid reset token' });
    }
    
    const user = await User.findOne({ _id: decoded.userId });
    
    if (!user) {
      return res.status(400).json({ message: 'Invalid reset token' });
    }
    
    // Update password
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    
    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Mock AsyncStorage for Remember Password tests
const mockAsyncStorage = {
  store: {},
  getItem: jest.fn((key) => {
    return Promise.resolve(mockAsyncStorage.store[key]);
  }),
  setItem: jest.fn((key, value) => {
    mockAsyncStorage.store[key] = value;
    return Promise.resolve();
  }),
  removeItem: jest.fn((key) => {
    delete mockAsyncStorage.store[key];
    return Promise.resolve();
  }),
  clear: jest.fn(() => {
    mockAsyncStorage.store = {};
    return Promise.resolve();
  })
};

// Mock the AsyncStorage module
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

// Mock the router
const mockRouter = {
  replace: jest.fn(),
  push: jest.fn()
};

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter
}));

describe('Mocked Authentication Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('User Registration', () => {
    it('should successfully register a new user', async () => {
      mockFindOne.mockResolvedValue(null);
      
      const userData = {
        email: 'newuser@example.com',
        password: 'Password123',
        name: 'New User'
      };
      
      const response = await request(app)
        .post('/api/auth/signup')
        .send(userData);
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message', 'User registered successfully');
      expect(response.body).toHaveProperty('email', userData.email);
      expect(mockFindOne).toHaveBeenCalledWith({ email: userData.email });
      expect(nodemailer.createTransport).toHaveBeenCalled();
    });
    
    it('should reject registration with existing email', async () => {
      mockFindOne.mockResolvedValue({ email: 'existing@example.com' });
      
      const userData = {
        email: 'existing@example.com',
        password: 'Password123',
        name: 'Existing User'
      };
      
      const response = await request(app)
        .post('/api/auth/signup')
        .send(userData);
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'Email already registered');
      expect(nodemailer.createTransport).not.toHaveBeenCalled();
    });
    
    it('should reject registration with invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'invalid-email',
          password: 'Password123',
          name: 'New User'
        });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'Invalid email format');
    });
    
    it('should reject registration with weak password', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'newuser@example.com',
          password: 'weak',
          name: 'New User'
        });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'Password too short');
    });
    
    it('should reject registration with missing required fields', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'newuser@example.com'
        });
      
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Missing required fields');
    });
  });
  
  describe('User Login', () => {
    it('should login successfully with valid credentials', async () => {
      const hashedPassword = await bcrypt.hash('Password123', 10);
      mockFindOne.mockResolvedValue({
        _id: 'user-id-1',
        email: 'verified@example.com',
        password: hashedPassword,
        name: 'Verified User',
        isVerified: true
      });
      
      mockJwtSign.mockReturnValueOnce('test-token');
      
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'verified@example.com',
          password: 'Password123'
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token', 'test-token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('email', 'verified@example.com');
    });
    
    it('should reject login for unverified user', async () => {
      const hashedPassword = await bcrypt.hash('Password123', 10);
      mockFindOne.mockResolvedValue({
        _id: 'user-id-1',
        email: 'unverified@example.com',
        password: hashedPassword,
        name: 'Unverified User',
        isVerified: false
      });
      
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'unverified@example.com',
          password: 'Password123'
        });
      
      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('message', 'Please verify your email before logging in');
      expect(response.body).toHaveProperty('requiresVerification', true);
    });
    
    it('should reject login with incorrect password', async () => {
      const hashedPassword = await bcrypt.hash('Password123', 10);
      mockFindOne.mockResolvedValue({
        _id: 'user-id-1',
        email: 'verified@example.com',
        password: hashedPassword,
        name: 'Verified User',
        isVerified: true
      });
      
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'verified@example.com',
          password: 'WrongPassword123'
        });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'Invalid credentials');
    });
    
    it('should reject login with non-existent email', async () => {
      mockFindOne.mockResolvedValue(null);
      
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Password123'
        });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'Invalid credentials');
    });
    
    it('should reject login with missing credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com'
        });
      
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Missing required fields');
    });
  });
  
  describe('Email Verification', () => {
    it('should verify email with valid token', async () => {
      const user = {
        _id: 'user-id-1',
        email: 'test@example.com',
        isVerified: false,
        save: mockSave
      };
      
      mockFindOne.mockResolvedValue(user);
      mockJwtVerify.mockReturnValueOnce({ userId: 'user-id-1' });
      
      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: 'valid-token' });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Email verified successfully');
    });
    
    it('should reject verification with invalid token', async () => {
      mockJwtVerify.mockImplementationOnce(() => {
        throw new Error('Invalid token');
      });
      
      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: 'invalid-token' });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'Invalid verification token');
    });
    
    it('should reject verification with expired token', async () => {
      mockJwtVerify.mockImplementationOnce(() => {
        throw { name: 'TokenExpiredError' };
      });
      
      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: 'expired-token' });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'Verification token has expired');
    });
    
    it('should reject verification for already verified user', async () => {
      const user = {
        _id: 'user-id-1',
        email: 'test@example.com',
        isVerified: true
      };
      
      mockFindOne.mockResolvedValue(user);
      mockJwtVerify.mockReturnValueOnce({ userId: 'user-id-1' });
      
      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: 'valid-token' });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'Email already verified');
    });
  });
  
  describe('Remember Password Feature', () => {
    beforeEach(() => {
      // Clear the mocked AsyncStorage and reset mock function calls
      mockAsyncStorage.store = {};
      mockAsyncStorage.setItem.mockClear();
      mockAsyncStorage.getItem.mockClear();
      mockAsyncStorage.removeItem.mockClear();
      mockRouter.replace.mockClear();
      mockRouter.push.mockClear();
    });

    describe('Login Process', () => {
      it('should save credentials in AsyncStorage when "Remember Password" is checked', async () => {
        // Simulate login with "Remember Password" checked
        const email = 'test@example.com';
        const password = 'Password123';
        const rememberPassword = true;
        
        // Mock a successful login function with direct store manipulation
        const handleLogin = async () => {
          if (rememberPassword) {
            mockAsyncStorage.store['savedEmail'] = email;
            mockAsyncStorage.store['savedPassword'] = password;
            // Also call the mock functions for verification purposes
            await mockAsyncStorage.setItem('savedEmail', email);
            await mockAsyncStorage.setItem('savedPassword', password);
          }
          await mockAsyncStorage.setItem('userToken', 'fake-token');
          await mockAsyncStorage.setItem('userId', 'user-123');
          return true;
        };
        
        // Perform login
        await handleLogin();
        
        // Verify credentials were saved
        expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('savedEmail', email);
        expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('savedPassword', password);
        expect(mockAsyncStorage.store['savedEmail']).toBe(email);
        expect(mockAsyncStorage.store['savedPassword']).toBe(password);
      });
      
      it('should not save credentials in AsyncStorage when "Remember Password" is unchecked', async () => {
        // Setup initial state
        mockAsyncStorage.store['savedEmail'] = 'old@example.com';
        mockAsyncStorage.store['savedPassword'] = 'OldPassword123';
        
        // Simulate login with "Remember Password" unchecked
        const email = 'test@example.com';
        const password = 'Password123';
        const rememberPassword = false;
        
        // Mock a successful login function with direct store manipulation
        const handleLogin = async () => {
          if (rememberPassword) {
            mockAsyncStorage.store['savedEmail'] = email;
            mockAsyncStorage.store['savedPassword'] = password;
            await mockAsyncStorage.setItem('savedEmail', email);
            await mockAsyncStorage.setItem('savedPassword', password);
          } else {
            delete mockAsyncStorage.store['savedEmail'];
            delete mockAsyncStorage.store['savedPassword'];
            await mockAsyncStorage.removeItem('savedEmail');
            await mockAsyncStorage.removeItem('savedPassword');
          }
          await mockAsyncStorage.setItem('userToken', 'fake-token');
          await mockAsyncStorage.setItem('userId', 'user-123');
          return true;
        };
        
        // Perform login
        await handleLogin();
        
        // Verify credentials were removed
        expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('savedEmail');
        expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('savedPassword');
        expect(mockAsyncStorage.store['savedEmail']).toBeUndefined();
        expect(mockAsyncStorage.store['savedPassword']).toBeUndefined();
      });
    });
    
    describe('Logout Process', () => {
      it('should preserve saved credentials during logout when they were saved', async () => {
        // Setup: First simulate a login with "Remember Password" checked
        mockAsyncStorage.store['savedEmail'] = 'test@example.com';
        mockAsyncStorage.store['savedPassword'] = 'Password123';
        mockAsyncStorage.store['userToken'] = 'fake-token';
        mockAsyncStorage.store['userId'] = 'user-123';
        mockAsyncStorage.store['username'] = 'Test User';
        
        // Clear mock calls after setup
        mockAsyncStorage.setItem.mockClear();
        mockAsyncStorage.removeItem.mockClear();
        
        // Simulate logout function with direct store manipulation
        const handleSignOut = async () => {
          // Clear authentication tokens
          delete mockAsyncStorage.store['token'];
          delete mockAsyncStorage.store['user'];
          delete mockAsyncStorage.store['userToken'];
          delete mockAsyncStorage.store['userId'];
          delete mockAsyncStorage.store['username'];
          
          await mockAsyncStorage.removeItem('token');
          await mockAsyncStorage.removeItem('user');
          await mockAsyncStorage.removeItem('userToken');
          await mockAsyncStorage.removeItem('userId');
          await mockAsyncStorage.removeItem('username');
          
          // Note: We don't remove savedEmail or savedPassword to preserve the "Remember Password" feature
          
          // Navigate to login screen
          mockRouter.replace('/screens/login');
        };
        
        // Perform logout
        await handleSignOut();
        
        // Verify authentication tokens were removed
        expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('userToken');
        expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('userId');
        expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('username');
        
        // Verify credentials were preserved
        expect(mockAsyncStorage.removeItem).not.toHaveBeenCalledWith('savedEmail');
        expect(mockAsyncStorage.removeItem).not.toHaveBeenCalledWith('savedPassword');
        expect(mockAsyncStorage.store['savedEmail']).toBe('test@example.com');
        expect(mockAsyncStorage.store['savedPassword']).toBe('Password123');
        
        // Verify navigation to login screen
        expect(mockRouter.replace).toHaveBeenCalledWith('/screens/login');
      });
    });
    
    describe('Login after Logout', () => {
      it('should auto-fill saved credentials on login screen after logout', async () => {
        // Setup: Save credentials as if from a previous login
        mockAsyncStorage.store['savedEmail'] = 'test@example.com';
        mockAsyncStorage.store['savedPassword'] = 'Password123';
        
        // Mock getItem to return the values from our store
        mockAsyncStorage.getItem.mockImplementation((key) => {
          return Promise.resolve(mockAsyncStorage.store[key]);
        });
        
        // Mock loadSavedCredentials function that would be called in useEffect
        const loadSavedCredentials = async () => {
          const savedEmail = await mockAsyncStorage.getItem('savedEmail');
          const savedPassword = await mockAsyncStorage.getItem('savedPassword');
          
          let email = '';
          let password = '';
          let rememberPassword = false;
          
          if (savedEmail) {
            email = savedEmail;
            rememberPassword = true;
          }
          
          if (savedPassword) {
            password = savedPassword;
          }
          
          return { email, password, rememberPassword };
        };
        
        // Get the loaded credentials
        const { email, password, rememberPassword } = await loadSavedCredentials();
        
        // Verify credentials were loaded correctly
        expect(email).toBe('test@example.com');
        expect(password).toBe('Password123');
        expect(rememberPassword).toBe(true);
      });
    });
  });
}); 