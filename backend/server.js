const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

// Load environment variables
dotenv.config();

// Create Express app
const app = express();

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
    default: true // Auto-verify for testing
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
        isVerified: true // Auto-verify for testing
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
        isVerified: true
      };
      
      inMemoryUsers.push(newUser);
      console.log('User registered in memory:', email);
    }
    
    console.log('Signup successful for:', email);
    res.status(201).json({ message: 'User registered successfully. You can now log in.' });
  } catch (error) {
    console.error('Signup error:', error);
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