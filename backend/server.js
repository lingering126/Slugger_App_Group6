const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Load environment variables
dotenv.config();

// Create Express app
const app = express();

// Configure Nodemailer with Mailtrap
const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: parseInt(process.env.MAIL_PORT),
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS
  }
});

// CORS configuration
const corsOptions = {
  origin: '*', // Allow all origins in development
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Middleware
app.use(cors(corsOptions));

// Add OPTIONS handling for preflight requests
app.options('*', cors(corsOptions));

app.use(express.json());

// Connect to MongoDB Atlas
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch(err => {
    console.error('Could not connect to MongoDB Atlas:', err.message);
    // Continue with in-memory storage as fallback
  });

// Define User Schema
const userSchema = new mongoose.Schema({
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
  isVerified: {
    type: Boolean,
    default: false // Changed to false to require verification
  },
  verificationToken: {
    type: String,
    default: null
  },
  verificationTokenExpires: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create User model
const User = mongoose.model('User', userSchema);

// In-memory user storage as fallback
const inMemoryUsers = [];

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} from ${req.ip}`);
  console.log('Headers:', JSON.stringify(req.headers));
  
  // Add CORS headers to every response
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  // Log response
  const originalSend = res.send;
  res.send = function(body) {
    console.log(`[${new Date().toISOString()}] Response: ${res.statusCode}`);
    return originalSend.call(this, body);
  };
  
  next();
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ message: 'Internal server error', error: err.message });
});

// Routes
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('Signup attempt for:', email);
    
    if (!email || !password) {
      console.log('Missing email or password');
      return res.status(400).json({ message: 'Email and password are required' });
    }
    
    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    // Check if MongoDB is connected
    if (mongoose.connection.readyState === 1) {
      // Check if user already exists in MongoDB
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        console.log('Email already in use');
        return res.status(400).json({ message: 'Email already in use' });
      }
      
      // Create new user in MongoDB
      const newUser = new User({
        email,
        password, // In production, hash the password
        isVerified: false,
        verificationToken,
        verificationTokenExpires
      });
      
      await newUser.save();
      console.log('User registered in MongoDB:', email);
    } else {
      // Fallback to in-memory storage
      const existingUser = inMemoryUsers.find(user => user.email === email);
      if (existingUser) {
        console.log('Email already in use');
        return res.status(400).json({ message: 'Email already in use' });
      }
      
      const newUser = {
        id: Date.now().toString(),
        email,
        password,
        isVerified: false,
        verificationToken,
        verificationTokenExpires
      };
      
      inMemoryUsers.push(newUser);
      console.log('User registered in memory:', email);
    }
    
    // Send verification email
    const verificationUrl = `${process.env.FRONTEND_URL}/api/auth/verify-email?token=${verificationToken}&email=${email}`;
    
    const mailOptions = {
      from: process.env.MAIL_FROM,
      to: email,
      subject: 'Verify your Slugger account',
      html: `
        <h1>Welcome to Slugger!</h1>
        <p>Thank you for signing up. Please verify your email address by clicking the link below:</p>
        <a href="${verificationUrl}">Verify Email</a>
        <p>This link will expire in 24 hours.</p>
        <p>If you did not sign up for Slugger, please ignore this email.</p>
      `
    };
    
    try {
      await transporter.sendMail(mailOptions);
      console.log('Verification email sent to:', email);
    } catch (emailError) {
      console.error('Error sending verification email:', emailError);
      // Continue with registration even if email fails
    }
    
    console.log('Signup successful for:', email);
    res.status(201).json({ 
      message: 'User registered successfully. Please check your email to verify your account.',
      requiresVerification: true
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Email verification endpoint
app.get('/api/auth/verify-email', async (req, res) => {
  try {
    const { token, email } = req.query;
    
    if (!token || !email) {
      return res.status(400).json({ message: 'Invalid verification link' });
    }
    
    let user;
    
    // Check if MongoDB is connected
    if (mongoose.connection.readyState === 1) {
      // Find user in MongoDB
      user = await User.findOne({ 
        email, 
        verificationToken: token,
        verificationTokenExpires: { $gt: new Date() }
      });
      
      if (user) {
        user.isVerified = true;
        user.verificationToken = null;
        user.verificationTokenExpires = null;
        await user.save();
      }
    } else {
      // Fallback to in-memory storage
      const userIndex = inMemoryUsers.findIndex(u => 
        u.email === email && 
        u.verificationToken === token && 
        new Date(u.verificationTokenExpires) > new Date()
      );
      
      if (userIndex !== -1) {
        inMemoryUsers[userIndex].isVerified = true;
        inMemoryUsers[userIndex].verificationToken = null;
        inMemoryUsers[userIndex].verificationTokenExpires = null;
        user = inMemoryUsers[userIndex];
      }
    }
    
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired verification link' });
    }
    
    // Redirect to frontend with success message
    res.redirect(`${process.env.FRONTEND_URL}/screens/login?verified=true`);
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Resend verification email
app.post('/api/auth/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    
    let user;
    
    // Check if MongoDB is connected
    if (mongoose.connection.readyState === 1) {
      // Find user in MongoDB
      user = await User.findOne({ email });
      
      if (user && !user.isVerified) {
        // Generate new verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        
        user.verificationToken = verificationToken;
        user.verificationTokenExpires = verificationTokenExpires;
        await user.save();
      }
    } else {
      // Fallback to in-memory storage
      const userIndex = inMemoryUsers.findIndex(u => u.email === email && !u.isVerified);
      
      if (userIndex !== -1) {
        // Generate new verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        
        inMemoryUsers[userIndex].verificationToken = verificationToken;
        inMemoryUsers[userIndex].verificationTokenExpires = verificationTokenExpires;
        user = inMemoryUsers[userIndex];
      }
    }
    
    if (!user) {
      return res.status(404).json({ message: 'User not found or already verified' });
    }
    
    // Send verification email
    const verificationUrl = `${process.env.FRONTEND_URL}/api/auth/verify-email?token=${user.verificationToken}&email=${email}`;
    
    const mailOptions = {
      from: process.env.MAIL_FROM, //link to .env
      to: email,
      subject: 'Verify your Slugger account',
      html: `
        <h1>Welcome to Slugger!</h1>
        <p>Thank you for signing up. Please verify your email address by clicking the link below:</p>
        <a href="${verificationUrl}">Verify Email</a>
        <p>This link will expire in 24 hours.</p>
        <p>If you did not sign up for Slugger, please ignore this email.</p>
      `
    };
    
    try {
      await transporter.sendMail(mailOptions);
      console.log('Verification email resent to:', email);
      res.status(200).json({ message: 'Verification email sent. Please check your inbox.' });
    } catch (emailError) {
      console.error('Error sending verification email:', emailError);
      res.status(500).json({ message: 'Failed to send verification email' });
    }
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('Login attempt for:', email);
    
    if (!email || !password) {
      console.log('Missing email or password');
      return res.status(400).json({ message: 'Email and password are required' });
    }
    
    let user;
    
    // Check if MongoDB is connected
    if (mongoose.connection.readyState === 1) {
      // Find user in MongoDB
      user = await User.findOne({ email });
      console.log('MongoDB user found:', !!user);
    } else {
      // Fallback to in-memory storage
      user = inMemoryUsers.find(user => user.email === email);
      console.log('In-memory user found:', !!user);
    }
    
    if (!user) {
      console.log('User not found');
      return res.status(400).json({ message: 'Invalid email or password' });
    }
    
    // Check if user is verified
    if (!user.isVerified) {
      console.log('User not verified');
      return res.status(403).json({ 
        message: 'Please verify your email before logging in',
        requiresVerification: true,
        email: email
      });
    }
    
    // Check password (in production, compare hashed passwords)
    const isPasswordValid = user.password === password;
    console.log('Password valid:', isPasswordValid);
    
    if (!isPasswordValid) {
      console.log('Invalid password');
      return res.status(400).json({ message: 'Invalid email or password' });
    }
    
    // Create JWT token
    const token = jwt.sign(
      { userId: user.id || user._id },
      process.env.JWT_SECRET || 'fallback_secret_key',
      { expiresIn: '7d' }
    );
    
    console.log('Login successful for:', email);
    
    res.status(200).json({
      token,
      user: {
        id: user.id || user._id,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Health check route
app.get('/health', async (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  const userCount = mongoose.connection.readyState === 1 
    ? await User.countDocuments() 
    : inMemoryUsers.length;
  
  // Log client information for debugging
  console.log('Health check request from:', req.ip);
  console.log('User-Agent:', req.headers['user-agent']);
  console.log('Origin:', req.headers.origin);
  
  res.status(200).json({ 
    status: 'ok', 
    database: dbStatus,
    users: userCount,
    server_time: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Add a more detailed API test endpoint
app.get('/api/test', (req, res) => {
  res.status(200).json({
    message: 'API is working correctly',
    request_info: {
      ip: req.ip,
      method: req.method,
      path: req.path,
      headers: {
        'user-agent': req.headers['user-agent'],
        'origin': req.headers.origin,
        'host': req.headers.host
      }
    }
  });
});

// Add a simple IP test endpoint
app.get('/ip', (req, res) => {
  const os = require('os');
  const networkInterfaces = os.networkInterfaces();
  const serverIPs = [];
  
  for (const [name, interfaces] of Object.entries(networkInterfaces)) {
    for (const iface of interfaces) {
      if (!iface.internal) {
        serverIPs.push({
          interface: name,
          ip: iface.address,
          family: `IPv${iface.family}`
        });
      }
    }
  }
  
  res.status(200).json({
    client: {
      ip: req.ip,
      headers: {
        'user-agent': req.headers['user-agent'],
        'host': req.headers.host
      }
    },
    server: {
      ips: serverIPs,
      timestamp: new Date().toISOString()
    }
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
  console.log(`Server also available at http://0.0.0.0:${PORT}/api (all interfaces)`);
  console.log(`MongoDB connection string: ${process.env.MONGODB_URI.replace(/\/\/(.+?)@/, '//***@')}`);
});