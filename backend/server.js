const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const os = require('os');
const User = require('./src/models/user');
const postsRouter = require('./homepage/routes/posts');
const { router: authRoutes } = require('./routes/auth');
const authMiddleware = require('./middleware/auth');
const activityRoutes = require('./routes/activities');
const statsRoutes = require('./homepage/routes/index');
const teamRoutes = require('./routes/team');
// Add this line to import the new profiles routes
const profileRoutes = require('./routes/profiles');
const userTeamTargetRoutes = require('./routes/userTeamTarget');
const { analyticsRouter } = require('./routes/analytics'); // Import the analytics router


// Function to get all server IP addresses
const getServerIPs = () => {
  // Always include the deployed URL first for verification links
  const deployedUrl = 'https://slugger-app-group6.onrender.com';
  const networkInterfaces = os.networkInterfaces();
  const serverIPs = [];
  
  console.log('=== Network Interface Scanning Started ===');
  console.log('Available interfaces:', Object.keys(networkInterfaces));
  console.log('Deployed URL:', deployedUrl);
  
  // First pass: Look for preferred IPs (192.168.x.x)
  Object.keys(networkInterfaces).forEach((interfaceName) => {
    const addresses = networkInterfaces[interfaceName];
    console.log(`\nScanning interface "${interfaceName}":`);
    
    addresses.forEach((addr) => {
      // Only collect IPv4, non-internal, and non-APIPA addresses
      if (addr.family === 'IPv4' && !addr.internal) {
        console.log(`Found address: ${addr.address} (${addr.family})`);
        
        // Check if it's a valid local network IP
        if (addr.address.startsWith('192.168.')) {
          console.log(`✓ Found preferred local IP: ${addr.address}`);
          // Add 192.168.x.x addresses first as they're most likely to work
          serverIPs.unshift(addr.address);
        } else if (addr.address.startsWith('10.') || 
                  (addr.address.startsWith('172.') && 
                   parseInt(addr.address.split('.')[1]) >= 16 && 
                   parseInt(addr.address.split('.')[1]) <= 31)) {
          // Add other private network IPs (10.x.x.x and 172.16-31.x.x)
          console.log(`✓ Found alternative local IP: ${addr.address}`);
          serverIPs.push(addr.address);
        } else if (addr.address.startsWith('169.254.')) {
          console.log(`✗ Skipping APIPA address: ${addr.address}`);
        } else {
          console.log(`? Unknown address type: ${addr.address}`);
        }
      }
    });
  });
  
  // Fallback handling
  if (serverIPs.length === 0) {
    console.warn('⚠ No valid local IPs found, adding fallback options');
    // Try to add common local IPs as fallback
    const commonIPs = [
      '192.168.1.1',
      '192.168.0.1',
      '10.0.0.1',
      'localhost'
    ];
    serverIPs.push(...commonIPs);
  }
  
  console.log('\n=== Final IP Configuration ===');
  console.log('Primary IP (first in list):', serverIPs[0]);
  console.log('All available IPs:', serverIPs);
  console.log('=============================\n');
  
  return serverIPs;
};

// Load environment variables
dotenv.config();

// Create Express app
const app = express();

// Configure Nodemailer based on environment
const emailConfig = {
  host: process.env.MAIL_HOST || 'smtp.mailgun.org',
  port: parseInt(process.env.MAIL_PORT || '587'),
  auth: {
    user: process.env.MAIL_USER || 'postmaster@slugger4health.site',
    pass: process.env.MAIL_PASS
  },
  // Add secure option for TLS connections
  secure: process.env.MAIL_PORT === '465',
  // Add additional options for better deliverability
  tls: {
    // Do not fail on invalid certs
    rejectUnauthorized: false
  }
};

// Log email configuration (without sensitive data)
console.log(`Email configuration: Using ${emailConfig.host}:${emailConfig.port} with user ${emailConfig.auth.user}`);

// Create transporter with the configuration
const transporter = nodemailer.createTransport(emailConfig);

// Verify the transporter configuration
transporter.verify()
  .then(() => console.log('Email service is ready to send emails'))
  .catch(err => {
    console.error('Error with email configuration:', err);
    console.error('Error message:', err.message);
    console.error('Please check your email credentials and settings in .env file');
    
    // Print detailed error information
    if (err.code) {
      console.error('Error code:', err.code);
    }
    if (err.command) {
      console.error('SMTP command:', err.command);
    }
    if (err.response) {
      console.error('SMTP response:', err.response);
    }
  });

// CORS configuration - 合并了第二个文件中的更完整配置
const corsOptions = {
  origin: '*', // Allow all origins in development
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// 增加JSON大小限制，从第二个文件合并过来
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware
app.use(cors(corsOptions));

// Add OPTIONS handling for preflight requests
app.options('*', cors(corsOptions));

// Connect to MongoDB Atlas
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
})
.then(() => {
  console.log('Successfully connected to MongoDB Atlas');
  console.log('Database connection string:', process.env.MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//<credentials>@'));
})
.catch(err => {
  console.error('MongoDB connection error:', err);
  console.error('Error code:', err.code);
  console.error('Error name:', err.name);
  console.error('Full error:', err);
  // Continue with in-memory storage as fallback
  console.log('Falling back to in-memory storage');
});

// Add MongoDB connection error handlers
mongoose.connection.on('error', err => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  console.log('MongoDB reconnected');
});

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
app.use('/api/auth', authRoutes);
app.use('/api/teams', authMiddleware, teamRoutes);
app.use('/api/posts', authMiddleware, postsRouter);
app.use('/api/activities', authMiddleware, activityRoutes);
app.use('/api/stats', authMiddleware, statsRoutes);
// Add this line to register the profiles routes
app.use('/api/profiles', authMiddleware, profileRoutes);
app.use('/api/user-team-targets', authMiddleware, userTeamTargetRoutes);
app.use('/api/analytics', authMiddleware, analyticsRouter); // Mount the analytics router, ensure authMiddleware if all routes under it are protected

// Add web route handler for email verification that redirects to the app
app.get('/verify-email', async (req, res) => {
  try {
    const { token, email } = req.query;
    
    if (!token) {
      return res.status(400).send(`
        <html>
          <head>
            <title>Verification Failed</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background-color: #f9f9f9; }
              .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
              h1 { color: #e74c3c; }
              p { font-size: 18px; line-height: 1.6; color: #555; }
              .error-icon {
                font-size: 64px;
                color: #e74c3c;
                margin-bottom: 20px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="error-icon">✗</div>
              <h1>Verification Failed</h1>
              <p>The verification link is missing required parameters.</p>
            </div>
          </body>
        </html>
      `);
    }
    
    // Find user with matching token (no longer requiring email parameter)
    let user = null;
    
    // Check if MongoDB is connected
    if (mongoose.connection.readyState === 1) {
      // First try to find by token and email if provided
      if (email) {
        user = await User.findOne({ 
          email,
          verificationToken: token,
          verificationTokenExpires: { $gt: new Date() } // Token not expired
        });
      }
      
      // If not found and email was provided, try just by token
      if (!user) {
        user = await User.findOne({ 
          verificationToken: token,
          verificationTokenExpires: { $gt: new Date() } // Token not expired
        });
      }
      
      if (!user) {
        return res.status(400).send(`
          <html>
            <head>
              <title>Verification Failed</title>
              <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background-color: #f9f9f9; }
                .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                h1 { color: #e74c3c; }
                p { font-size: 18px; line-height: 1.6; color: #555; }
                .error-icon {
                  font-size: 64px;
                  color: #e74c3c;
                  margin-bottom: 20px;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="error-icon">✗</div>
                <h1>Verification Failed</h1>
                <p>The verification link is invalid or has expired. Please request a new verification email.</p>
              </div>
            </body>
          </html>
        `);
      }
      
      // Update user to verified status
      user.isVerified = true;
      user.verificationToken = undefined;
      user.verificationTokenExpires = undefined;
      await user.save();
    } else {
      // Fallback to in-memory storage
      // First try with email if provided
      let userIndex = -1;
      
      if (email) {
        userIndex = inMemoryUsers.findIndex(u => u.email === email && u.verificationToken === token);
      }
      
      // If not found, try just by token
      if (userIndex === -1) {
        userIndex = inMemoryUsers.findIndex(u => u.verificationToken === token);
      }
      
      if (userIndex === -1 || inMemoryUsers[userIndex].verificationTokenExpires < new Date()) {
        return res.status(400).send(`
          <html>
            <head>
              <title>Verification Failed</title>
              <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background-color: #f9f9f9; }
                .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                h1 { color: #e74c3c; }
                p { font-size: 18px; line-height: 1.6; color: #555; }
                .error-icon {
                  font-size: 64px;
                  color: #e74c3c;
                  margin-bottom: 20px;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="error-icon">✗</div>
                <h1>Verification Failed</h1>
                <p>The verification link is invalid or has expired. Please request a new verification email.</p>
              </div>
            </body>
          </html>
        `);
      }
      
      // Update in-memory user to verified status
      inMemoryUsers[userIndex].isVerified = true;
      inMemoryUsers[userIndex].verificationToken = undefined;
      inMemoryUsers[userIndex].verificationTokenExpires = undefined;
      user = inMemoryUsers[userIndex];
    }
    
    // Send HTML response with success message and redirect button
    res.status(200).send(`
      <html>
        <head>
          <title>Email Verified</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background-color: #f9f9f9; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h1 { color: #2ecc71; }
            p { font-size: 18px; line-height: 1.6; color: #555; }
            .button { 
              display: inline-block; 
              background-color: #6c63ff; 
              color: white; 
              padding: 12px 30px; 
              text-decoration: none; 
              border-radius: 4px; 
              margin-top: 20px; 
              font-size: 16px;
              font-weight: bold;
              transition: background-color 0.3s;
            }
            .button:hover {
              background-color: #5a52d5;
            }
            .success-icon {
              font-size: 64px;
              color: #2ecc71;
              margin-bottom: 20px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="success-icon">✓</div>
            <h1>Email Verified Successfully!</h1>
            <p>Your email has been verified. You can now log in to your account.</p>
            <p>Please open the Slugger app on your device to log in.</p>
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).send(`
      <html>
        <head>
          <title>Verification Error</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background-color: #f9f9f9; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h1 { color: #e74c3c; }
            p { font-size: 18px; line-height: 1.6; color: #555; }
            .error-icon {
              font-size: 64px;
              color: #e74c3c;
              margin-bottom: 20px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="error-icon">✗</div>
            <h1>Verification Error</h1>
            <p>An error occurred during email verification. Please try again later or contact support.</p>
          </div>
        </body>
      </html>
    `);
  }
});

// ADD THIS NEW ENDPOINT: GET user profile - Updated to include longTermGoal
app.get('/api/user/profile', authMiddleware, async (req, res) => {
  try {
    const userId = req.userData.userId;
    console.log(`Fetching profile for user ID: ${userId}`);
    
    // Find user in database
    if (mongoose.connection.readyState === 1) {
      const user = await User.findById(userId);
      
      if (!user) {
        console.log(`User not found with ID: ${userId}`);
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Return user data excluding password
      const userResponse = {
        id: user._id,
        name: user.name,
        email: user.email,
        bio: user.bio || '',
        longTermGoal: user.longTermGoal || '', // Added longTermGoal
        avatarUrl: user.avatarUrl || null,
        activitySettings: user.activitySettings || {  // Added activitySettings
          physicalActivities: [],
          mentalActivities: [],
          bonusActivities: []
        },
        status: user.status || 'Active',
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };
      
      console.log(`Successfully retrieved profile for user: ${user.name}`);
      return res.status(200).json(userResponse);
    } else {
      // Fallback to in-memory storage
      const user = inMemoryUsers.find(u => u.id === userId);
      
      if (!user) {
        console.log(`User not found in memory with ID: ${userId}`);
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Return user data excluding password
      const userResponse = {
        id: user.id,
        name: user.name || '',
        email: user.email,
        bio: user.bio || '',
        longTermGoal: user.longTermGoal || '', // Added longTermGoal
        avatarUrl: user.avatarUrl || null,
        activitySettings: user.activitySettings || {  // Added activitySettings
          physicalActivities: [],
          mentalActivities: [],
          bonusActivities: []
        },
        status: user.status || 'Active',
        createdAt: user.createdAt || new Date(),
        updatedAt: user.updatedAt || new Date()
      };
      
      console.log(`Successfully retrieved in-memory profile for: ${user.email}`);
      return res.status(200).json(userResponse);
    }
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ADD THIS NEW ENDPOINT: GET user by ID - Updated to include longTermGoal
app.get('/api/users/:userId', authMiddleware, async (req, res) => {
  try {
    const userId = req.params.userId;
    console.log(`Fetching user by ID: ${userId}`);
    
    // Find user in database
    if (mongoose.connection.readyState === 1) {
      const user = await User.findById(userId);
      
      if (!user) {
        console.log(`User not found with ID: ${userId}`);
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Return user data excluding password
      const userResponse = {
        id: user._id,
        name: user.name,
        email: user.email,
        bio: user.bio || '',
        longTermGoal: user.longTermGoal || '', // Added longTermGoal
        avatarUrl: user.avatarUrl || null,
        status: user.status || 'Active'
      };
      
      console.log(`Successfully retrieved user: ${user.name}`);
      return res.status(200).json(userResponse);
    } else {
      // Fallback to in-memory storage
      const user = inMemoryUsers.find(u => u.id === userId);
      
      if (!user) {
        console.log(`User not found in memory with ID: ${userId}`);
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Return user data excluding password
      const userResponse = {
        id: user.id,
        name: user.name || '',
        email: user.email,
        bio: user.bio || '',
        longTermGoal: user.longTermGoal || '', // Added longTermGoal
        avatarUrl: user.avatarUrl || null,
        status: user.status || 'Active'
      };
      
      console.log(`Successfully retrieved in-memory user: ${user.email}`);
      return res.status(200).json(userResponse);
    }
  } catch (error) {
    console.error('Error fetching user by ID:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});


app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    console.log('Signup attempt for:', email);
    
    if (!email || !password || !name) {
      console.log('Missing required fields');
      return res.status(400).json({ message: 'Email, password, and name are required' });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log('Invalid email format');
      return res.status(400).json({ message: 'Please enter a valid email address' });
    }
    
    // Validate password strength
    if (password.length < 6) {
      console.log('Password too short');
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }
    
    // Check if password contains at least one letter (can't be all numbers)
    if (!/[a-zA-Z]/.test(password)) {
      console.log('Password must contain at least one letter');
      return res.status(400).json({ message: 'Password must contain at least one letter' });
    }
    
    // Generate verification token - do this BEFORE user creation to ensure it's available in all branches
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    // Check if MongoDB is connected
    if (mongoose.connection.readyState === 1) {
      // Check if user already exists in MongoDB
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        // If the user exists but is not verified, offer to resend verification email
        if (!existingUser.isVerified) {
          console.log('Email exists but not verified');
          return res.status(409).json({ 
            message: 'This email is registered but not verified yet',
            requiresVerification: true,
            email: email
          });
        }
        console.log('Email already in use');
        return res.status(400).json({ message: 'Email already in use' });
      }
      
      // Hash the password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      
      // Create new user in MongoDB
      const newUser = new User({
        email,
        password: hashedPassword, // Store the hashed password
        name, // Store the user's name
        username: name, // Set username same as name
        isVerified: false,
        verificationToken,
        verificationTokenExpires
      });
      
      await newUser.save();
      console.log('User registered in MongoDB:', email, 'with name:', name);
    } else {
      // Fallback to in-memory storage
      const existingUser = inMemoryUsers.find(user => user.email === email);
      if (existingUser) {
        // If the user exists but is not verified, offer to resend verification email
        if (!existingUser.isVerified) {
          console.log('Email exists but not verified');
          return res.status(409).json({ 
            message: 'This email is registered but not verified yet',
            requiresVerification: true,
            email: email
          });
        }
        console.log('Email already in use');
        return res.status(400).json({ message: 'Email already in use' });
      }
      
      // Hash the password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      
      const newUser = {
        id: Date.now().toString(),
        email,
        password: hashedPassword, // Store the hashed password
        name,
        username: name,
        isVerified: false,
        verificationToken,
        verificationTokenExpires
      };
      
      inMemoryUsers.push(newUser);
      console.log('User registered in memory:', email);
    }
    
    // Send verification email
    const serverIPs = getServerIPs();
    
    // Always use the deployed URL as the primary verification link
    const deployedUrl = 'https://slugger-app-group6.onrender.com';
    const verificationLink = `${deployedUrl}/verify-email?token=${verificationToken}`;
    
    console.log('=== Signup Email Link Details ===');
    console.log('Available server IPs:', serverIPs);
    console.log('Using deployed URL:', deployedUrl);
    console.log('Generated verification link:', verificationLink);
    
    // Create transporter for email sending
    let currentTransporter = transporter;
    
    // If no email configuration, create a test account
    if (!process.env.MAIL_FROM || !process.env.MAIL_USER || !process.env.MAIL_PASS) {
      console.warn('Email configuration missing. Setting up a default transporter for development.');
      // Create a test account with Ethereal for development/testing
      const testAccount = await nodemailer.createTestAccount();
      currentTransporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      console.log('Using Ethereal test account:', testAccount.user);
    }
    
    const mailOptions = {
      from: process.env.MAIL_FROM || 'noreply@slugger4health.site',
      to: email,
      subject: 'Verify your Slugger account',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
          <h1 style="text-align: center; color: #6c63ff;">Welcome to Slugger!</h1>
          <p style="font-size: 16px; line-height: 1.5; color: #444;">Thank you for signing up. Please verify your email address by clicking the button below:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationLink}" 
               style="background-color: #6c63ff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold;">
              Verify Email
            </a>
          </div>
          
          <p style="font-size: 14px; color: #666;">If the button above doesn't work, you can try clicking the link below:</p>
          
          <p style="text-align: center; margin: 15px 0;">
            <a href="${verificationLink}" style="color: #6c63ff; text-decoration: underline;">
              ${verificationLink}
            </a>
          </p>
          
          <p style="font-size: 14px; color: #666; margin-top: 30px;">This link will expire in 24 hours.</p>
          <p style="font-size: 14px; color: #666;">If you did not sign up for Slugger, please ignore this email.</p>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #999; font-size: 12px;">
            &copy; ${new Date().getFullYear()} Slugger Health. All rights reserved.
          </div>
        </div>
      `
    };
    
    try {
      console.log('==== EMAIL SENDING DETAILS ====');
      console.log('Attempting to send verification email to:', email);
      console.log('Using from address:', process.env.MAIL_FROM || 'noreply@slugger4health.site');
      console.log('Using SMTP settings:', {
        host: process.env.MAIL_HOST || 'smtp.mailgun.org',
        port: process.env.MAIL_PORT || '587',
        user: process.env.MAIL_USER || 'postmaster@slugger4health.site',
        secure: process.env.MAIL_PORT === '465'
      });
      console.log('Verification token:', verificationToken);
      
      // Check if using Mailgun sandbox domain
      const isSandboxDomain = (process.env.MAIL_FROM || '').includes('sandbox') || 
                              (process.env.MAIL_USER || '').includes('sandbox');
      
      if (isSandboxDomain) {
        console.log('⚠️ WARNING: Using Mailgun sandbox domain');
        console.log('Sandbox domains have restrictions: https://help.mailgun.com/hc/en-us/articles/217531258-Authorized-Recipients');
        console.log('You need to authorize recipient emails in the Mailgun dashboard first');
      }
      
      // Verify transporter configuration before sending
      try {
        await currentTransporter.verify();
        console.log('Transporter verification successful');
      } catch (verifyError) {
        console.error('Transporter verification failed:', verifyError);
        console.error('Mail configuration error details:', verifyError.message);
      }
      
      const info = await currentTransporter.sendMail(mailOptions);
      console.log('Verification email sent to:', email);
      console.log('Email response:', info.response);
      console.log('Message ID:', info.messageId);
      
      // Check if we're using Ethereal for testing
      if (currentTransporter !== transporter) {
        const previewURL = nodemailer.getTestMessageUrl(info);
        console.log('Ethereal Email Preview URL:', previewURL);
        
        console.log('==== EMAIL SENDING COMPLETE ====');
        
        // Return success with preview URL for testing
        return res.status(201).json({
          message: 'User registered successfully. Please check the preview URL for verification.',
          previewUrl: previewURL,
          testMode: true,
          email: email
        });
      }
      
      console.log('==== EMAIL SENDING COMPLETE ====');
      
      // Standard success response
      res.status(201).json({
        message: 'User registered successfully. Please check your email to verify your account.',
        requiresVerification: true,
        email: email
      });
    } catch (emailError) {
      console.error('Error sending verification email:', emailError);
      console.error('Error details:', emailError.message);
      
      // Try using Ethereal as fallback if Mailgun fails
      try {
        console.log('Attempting to use Ethereal email service as fallback...');
        
        // Create a test account on ethereal.email
        const testAccount = await nodemailer.createTestAccount();
        console.log('Created Ethereal test account:', testAccount.user);
        
        // Create a new transporter with Ethereal credentials
        const etherealTransporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });
        
        // Send mail with ethereal transporter
        const info = await etherealTransporter.sendMail(mailOptions);
        console.log('Test email sent via Ethereal!');
        console.log('Message ID:', info.messageId);
        
        // Generate preview URL
        const previewURL = nodemailer.getTestMessageUrl(info);
        console.log('Preview URL:', previewURL);
        
        // Return success with a message to check the preview URL
        return res.status(201).json({ 
          message: 'Email sent via test service. Access verification link via preview URL (check server logs).',
          previewUrl: previewURL,
          testMode: true,
          email: email
        });
      } catch (etherealError) {
        console.error('Ethereal fallback also failed:', etherealError);
      }
      
      if (emailError.message.includes('authorized')) {
        console.error('IMPORTANT: With Mailgun sandbox domains, you can only send to authorized recipients.');
        console.error('Please authorize the recipient email in your Mailgun dashboard or use a different email service.');
        
        res.status(201).json({ 
          message: 'User registered, but failed to send verification email. With Mailgun sandbox domains, you can only send to authorized recipients. Please add your email to authorized recipients in Mailgun.',
          error: 'unauthorized_recipient',
          requiresVerification: true,
          email: email
        });
      } else {
        // Still return success for the user creation part, but indicate email sending failed
        res.status(201).json({ 
          message: 'User registered, but failed to send verification email. Please try using the resend verification option.',
          requiresVerification: true, 
          email: email,
          error: emailError.message
        });
      }
    }
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    // Set proper content type header to ensure JSON response
    res.setHeader('Content-Type', 'application/json');
    
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
    
    // Check password using bcrypt to compare the hashed password
    const isPasswordValid = await bcrypt.compare(password, user.password);
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
    
    // Updated to include longTermGoal
    res.status(200).json({
      token,
      user: {
        id: user.id || user._id,
        email: user.email,
        name: user.name,
        username: user.name, // Adding username for backward compatibility
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        longTermGoal: user.longTermGoal || '', // Added longTermGoal
        activitySettings: user.activitySettings || {  // Added activitySettings
          physicalActivities: [],
          mentalActivities: [],
          bonusActivities: []
        },
        status: user.status || 'Active'
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.post('/api/auth/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    
    let user;
    let verificationToken;
    
    // Check if MongoDB is connected
    if (mongoose.connection.readyState === 1) {
      // Find user in MongoDB
      user = await User.findOne({ email });
      
      if (!user) {
        return res.status(404).json({ message: 'User not found. Please sign up first.' });
      }
      
      if (user.isVerified) {
        return res.status(400).json({ 
          message: 'Email is already verified. You can log in now.',
          alreadyVerified: true 
        });
      }
      
      if (user && !user.isVerified) {
        // Generate new verification token
        verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        
        user.verificationToken = verificationToken;
        user.verificationTokenExpires = verificationTokenExpires;
        await user.save();
      }
    } else {
      // Fallback to in-memory storage
      const userIndex = inMemoryUsers.findIndex(u => u.email === email);
      
      if (userIndex === -1) {
        return res.status(404).json({ message: 'User not found. Please sign up first.' });
      }
      
      if (inMemoryUsers[userIndex].isVerified) {
        return res.status(400).json({ 
          message: 'Email is already verified. You can log in now.',
          alreadyVerified: true 
        });
      }
      
      // Generate new verification token
      verificationToken = crypto.randomBytes(32).toString('hex');
      const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      
      inMemoryUsers[userIndex].verificationToken = verificationToken;
      inMemoryUsers[userIndex].verificationTokenExpires = verificationTokenExpires;
      user = inMemoryUsers[userIndex];
    }
    
    if (!user) {
      return res.status(404).json({ message: 'User not found or already verified' });
    }
    
    // Send verification email
    const serverIPs = getServerIPs();
    
    // Always use the deployed URL as the primary verification link
    const deployedUrl = 'https://slugger-app-group6.onrender.com';
    const verificationLink = `${deployedUrl}/verify-email?token=${user.verificationToken}`;
    
    console.log('=== Resend Email Link Details ===');
    console.log('Available server IPs:', serverIPs);
    console.log('Using deployed URL:', deployedUrl);
    console.log('Generated verification link:', verificationLink);
    
    // Create transporter for email sending
    let currentTransporter = transporter;
    
    // If no email configuration, create a test account
    if (!process.env.MAIL_FROM || !process.env.MAIL_USER || !process.env.MAIL_PASS) {
      console.warn('Email configuration missing. Setting up a default transporter for development.');
      // Create a test account with Ethereal for development/testing
      const testAccount = await nodemailer.createTestAccount();
      currentTransporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      console.log('Using Ethereal test account:', testAccount.user);
    }
    
    const mailOptions = {
      from: process.env.MAIL_FROM || 'noreply@slugger4health.site',
      to: email,
      subject: 'Verify your Slugger account',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
          <h1 style="text-align: center; color: #6c63ff;">Welcome to Slugger!</h1>
          <p style="font-size: 16px; line-height: 1.5; color: #444;">Thank you for signing up. Please verify your email address by clicking the button below:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationLink}" 
               style="background-color: #6c63ff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold;">
              Verify Email
            </a>
          </div>
          
          <p style="font-size: 14px; color: #666;">If the button above doesn't work, you can try clicking the link below:</p>
          
          <p style="text-align: center; margin: 15px 0;">
            <a href="${verificationLink}" style="color: #6c63ff; text-decoration: underline;">
              ${verificationLink}
            </a>
          </p>
          
          <p style="font-size: 14px; color: #666; margin-top: 30px;">This link will expire in 24 hours.</p>
          <p style="font-size: 14px; color: #666;">If you did not sign up for Slugger, please ignore this email.</p>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #999; font-size: 12px;">
            &copy; ${new Date().getFullYear()} Slugger Health. All rights reserved.
          </div>
        </div>
      `
    };
    
    try {
      console.log('==== EMAIL SENDING DETAILS ====');
      console.log('Attempting to send verification email to:', email);
      console.log('Using from address:', process.env.MAIL_FROM || 'noreply@slugger4health.site');
      console.log('Using SMTP settings:', {
        host: process.env.MAIL_HOST || 'smtp.mailgun.org',
        port: process.env.MAIL_PORT || '587',
        user: process.env.MAIL_USER || 'postmaster@slugger4health.site',
        secure: process.env.MAIL_PORT === '465'
      });
      console.log('Verification token:', user.verificationToken);
      
      // Check if using Mailgun sandbox domain
      const isSandboxDomain = (process.env.MAIL_FROM || '').includes('sandbox') || 
                              (process.env.MAIL_USER || '').includes('sandbox');
      
      if (isSandboxDomain) {
        console.log('⚠️ WARNING: Using Mailgun sandbox domain');
        console.log('Sandbox domains have restrictions: https://help.mailgun.com/hc/en-us/articles/217531258-Authorized-Recipients');
        console.log('You need to authorize recipient emails in the Mailgun dashboard first');
      }
      
      // Verify transporter configuration before sending
      try {
        await currentTransporter.verify();
        console.log('Transporter verification successful');
      } catch (verifyError) {
        console.error('Transporter verification failed:', verifyError);
        console.error('Mail configuration error details:', verifyError.message);
      }
      
      const info = await currentTransporter.sendMail(mailOptions);
      console.log('Verification email sent to:', email);
      console.log('Email response:', info.response);
      console.log('Message ID:', info.messageId);
      console.log('==== EMAIL SENDING COMPLETE ====');
      
      res.status(200).json({
        message: 'Verification email sent. Please check your inbox.',
        email: email
      });
    } catch (emailError) {
      console.error('Error sending verification email:', emailError);
      console.error('Error details:', emailError.message);
      
      // Try using Ethereal as fallback if Mailgun fails
      try {
        console.log('Attempting to use Ethereal email service as fallback...');
        
        // Create a test account on ethereal.email
        const testAccount = await nodemailer.createTestAccount();
        console.log('Created Ethereal test account:', testAccount.user);
        
        // Create a new transporter with Ethereal credentials
        const etherealTransporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });
        
        // Send mail with ethereal transporter
        const info = await etherealTransporter.sendMail(mailOptions);
        console.log('Test email sent via Ethereal!');
        console.log('Message ID:', info.messageId);
        
        // Generate preview URL
        const previewURL = nodemailer.getTestMessageUrl(info);
        console.log('Preview URL:', previewURL);
        
        // Return success with a message to check the preview URL
        return res.status(200).json({ 
          message: 'Email sent via test service. Access verification link via preview URL (check server logs).',
          previewUrl: previewURL,
          testMode: true
        });
      } catch (etherealError) {
        console.error('Ethereal fallback also failed:', etherealError);
      }
      
      if (emailError.message.includes('authorized')) {
        console.error('IMPORTANT: With Mailgun sandbox domains, you can only send to authorized recipients.');
        console.error('Please authorize the recipient email in your Mailgun dashboard or use a different email service.');
        
        res.status(500).json({ 
          message: 'Failed to send verification email. With Mailgun sandbox domains, you can only send to authorized recipients. Please add your email to authorized recipients in Mailgun.',
          error: 'unauthorized_recipient'
        });
      } else {
        res.status(500).json({ message: 'Failed to send verification email. Please try again later.', error: emailError.message });
      }
    }
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Updated PUT endpoint to include longTermGoal
app.put('/api/user/profile', authMiddleware, async (req, res) => {
  try {
    // Get the user ID from the JWT token
    const token = req.headers.authorization.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;
    
    console.log(`Updating profile for user ID: ${userId}`);
    console.log('Update data:', JSON.stringify({
      ...req.body,
      avatarUrl: req.body.avatarUrl ? '[AVATAR DATA PRESENT]' : null
    }));
    
    // Update user in database
    if (mongoose.connection.readyState === 1) {
      // MongoDB update
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { 
          $set: {
            name: req.body.name,
            bio: req.body.bio,
            longTermGoal: req.body.longTermGoal, // Added longTermGoal
            avatarUrl: req.body.avatarUrl,
            activitySettings: req.body.activitySettings, // Added activitySettings
            status: req.body.status,
            updatedAt: new Date()
          } 
        },
        { new: true } // Return the updated document
      );
      
      if (!updatedUser) {
        console.log(`User not found with ID: ${userId}`);
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Return updated user data (excluding password)
      const userResponse = {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        bio: updatedUser.bio,
        longTermGoal: updatedUser.longTermGoal, // Added longTermGoal
        avatarUrl: updatedUser.avatarUrl,
        activitySettings: updatedUser.activitySettings, // Added activitySettings
        status: updatedUser.status,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt
      };
      
      console.log(`Successfully updated profile for user: ${updatedUser.name}`);
      return res.status(200).json(userResponse);
    } else {
      // In-memory update (for development)
      const userIndex = inMemoryUsers.findIndex(u => u.id === userId);
      
      if (userIndex === -1) {
        console.log(`User not found in memory with ID: ${userId}`);
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Update user
      inMemoryUsers[userIndex] = {
        ...inMemoryUsers[userIndex],
        name: req.body.name,
        bio: req.body.bio,
        longTermGoal: req.body.longTermGoal, // Added longTermGoal
        avatarUrl: req.body.avatarUrl,
        activitySettings: req.body.activitySettings, // Added activitySettings
        status: req.body.status,
        updatedAt: new Date()
      };
      
      // Return updated user (excluding password)
      const userResponse = {
        id: inMemoryUsers[userIndex].id,
        name: inMemoryUsers[userIndex].name,
        email: inMemoryUsers[userIndex].email,
        bio: inMemoryUsers[userIndex].bio,
        longTermGoal: inMemoryUsers[userIndex].longTermGoal, // Added longTermGoal
        avatarUrl: inMemoryUsers[userIndex].avatarUrl,
        activitySettings: inMemoryUsers[userIndex].activitySettings, // Added activitySettings
        status: inMemoryUsers[userIndex].status,
        createdAt: inMemoryUsers[userIndex].createdAt,
        updatedAt: inMemoryUsers[userIndex].updatedAt
      };
      
      console.log(`Successfully updated in-memory profile for: ${inMemoryUsers[userIndex].email}`);
      return res.status(200).json(userResponse);
    }
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Health check route
app.get('/health', (req, res) => {
  try {
    // Return basic server info and network information
    const networkInterfaces = require('os').networkInterfaces();
    const ipAddresses = Object.keys(networkInterfaces)
      .reduce((ips, iface) => {
        const validIps = networkInterfaces[iface]
          .filter(details => details.family === 'IPv4' && !details.internal)
          .map(details => details.address);
        return [...ips, ...validIps];
      }, []);

    res.status(200).json({
      status: 'up',
      timestamp: new Date().toISOString(),
      ipAddresses,
      serverInfo: {
        hostname: require('os').hostname(),
        platform: process.platform,
        nodeVersion: process.version,
        port: process.env.PORT || 5001
      },
      // Add extra fields to help identify this as the Slugger server
      serverType: 'Slugger Backend',
      version: '1.0.0'
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Server error during health check', 
      error: error.message 
    });
  }
});

// Add a lightweight ping endpoint for quick connectivity checks
app.get('/ping', (req, res) => {
  // This is an ultra-lightweight endpoint for connectivity testing
  // No JSON parsing overhead, just a simple text response
  res.setHeader('Content-Type', 'text/plain');
  res.send('PONG');
});

// Add server discovery endpoint for network scanning
app.get('/discover', (req, res) => {
  try {
    // Get all network interfaces
    const networkInterfaces = require('os').networkInterfaces();
    const ipAddresses = Object.keys(networkInterfaces)
      .reduce((ips, iface) => {
        const validIps = networkInterfaces[iface]
          .filter(details => details.family === 'IPv4' && !details.internal)
          .map(details => details.address);
        return [...ips, ...validIps];
      }, []);
      
    res.status(200).json({
      server: 'Slugger Backend',
      version: '1.0.0',
      status: 'online',
      interfaces: ipAddresses,
      port: process.env.PORT || 5001,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Discovery endpoint error:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Server error during discovery', 
      error: error.message 
    });
  }
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

// Add a test email endpoint
app.post('/api/test/email', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    
    console.log('Test email requested for:', email);
    
    const mailOptions = {
      from: process.env.MAIL_FROM,
      to: email,
      subject: 'Slugger Email Test',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
          <h1 style="text-align: center; color: #6c63ff;">Email Test Successful!</h1>
          <p style="font-size: 16px; line-height: 1.5; color: #444;">If you're seeing this, your email configuration is working correctly.</p>
          
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="font-size: 14px; color: #666; margin: 5px 0;"><strong>Email configuration details:</strong></p>
            <ul style="font-size: 14px; color: #666; margin: 10px 0;">
              <li>Host: ${process.env.MAIL_HOST}</li>
              <li>Port: ${process.env.MAIL_PORT}</li>
              <li>From: ${process.env.MAIL_FROM}</li>
              <li>To: ${email}</li>
              <li>Time: ${new Date().toISOString()}</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #999; font-size: 12px;">
            &copy; ${new Date().getFullYear()} Slugger Health. All rights reserved.
          </div>
        </div>
      `
    };
    
    try {
      console.log('Attempting to send test email to:', email);
      const info = await transporter.sendMail(mailOptions);
      console.log('Test email sent successfully');
      console.log('Email response:', info.response);
      console.log('Message ID:', info.messageId);
      
      res.status(200).json({ 
        message: 'Test email sent successfully', 
        details: {
          messageId: info.messageId,
          response: info.response
        }
      });
    } catch (emailError) {
      console.error('Error sending test email:', emailError);
      console.error('Error details:', emailError.message);
      
      // Try using Ethereal as fallback if Mailgun fails
      try {
        console.log('Attempting to use Ethereal email service as fallback...');
        
        // Create a test account on ethereal.email
        const testAccount = await nodemailer.createTestAccount();
        console.log('Created Ethereal test account:', testAccount.user);
        
        // Create a new transporter with Ethereal credentials
        const etherealTransporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });
        
        // Send mail with ethereal transporter
        const info = await etherealTransporter.sendMail(mailOptions);
        console.log('Test email sent via Ethereal!');
        console.log('Message ID:', info.messageId);
        
        // Generate preview URL
        const previewURL = nodemailer.getTestMessageUrl(info);
        console.log('Preview URL:', previewURL);
        
        // Return success with a message to check the preview URL
        return res.status(200).json({ 
          message: 'Email sent via test service. Access verification link via preview URL (check server logs).',
          previewUrl: previewURL,
          testMode: true
        });
      } catch (etherealError) {
        console.error('Ethereal fallback also failed:', etherealError);
      }
      
      if (emailError.message.includes('authorized')) {
        console.error('IMPORTANT: With Mailgun sandbox domains, you can only send to authorized recipients.');
        console.error('Please authorize the recipient email in your Mailgun dashboard or use a different email service.');
        
        res.status(500).json({ 
          message: 'Failed to send test email. With Mailgun sandbox domains, you can only send to authorized recipients.',
          error: 'unauthorized_recipient',
          solution: 'Authorize this recipient in your Mailgun dashboard or use a different email service.'
        });
      } else {
        res.status(500).json({ 
          message: 'Failed to send test email', 
          error: emailError.message,
          config: {
            host: process.env.MAIL_HOST,
            port: process.env.MAIL_PORT,
            user: process.env.MAIL_USER,
            from: process.env.MAIL_FROM
          }
        });
      }
    }
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Note: PORT is set to 5001 in the .env file, which overrides this default
const PORT = process.env.PORT || 5001;

// Listen on all available network interfaces
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Access the server at http://localhost:${PORT}`);
  console.log('Available on your network at:');
  
  // Print out all available IP addresses
  const networkInterfaces = require('os').networkInterfaces();
  const ipAddresses = [];
  
  Object.keys(networkInterfaces).forEach(iface => {
    networkInterfaces[iface].forEach(details => {
      if (details.family === 'IPv4' && !details.internal) {
        ipAddresses.push(details.address);
        console.log(`Server available at: http://${details.address}:${PORT}/api`);
      }
    });
  });
  
  console.log(`Server also available at http://0.0.0.0:${PORT}/api (all interfaces)`);
  console.log(`MongoDB connection string: ${process.env.MONGODB_URI.replace(/\/\/(.+?)@/, '//***@')}`);
  
  console.log("\n=== NETWORK DISCOVERY INFO ===");
  console.log("The server can be auto-discovered on these IPs:");
  ipAddresses.forEach(ip => {
    console.log(`- ${ip}`);
  });
  console.log("================================\n");
});

app.get('/api/auth/me', async (req, res) => {
  try {
    // Extract the token from the Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key');
    
    // Get user from database
    let user;
    
    // Check if MongoDB is connected
    if (mongoose.connection.readyState === 1) {
      // Find user in MongoDB
      user = await User.findById(decoded.userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
    } else {
      // Fallback to in-memory storage
      user = inMemoryUsers.find(u => u.id === decoded.userId || u._id === decoded.userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
    }
    
    // Return user data (excluding password)
    res.status(200).json({
      id: user.id || user._id,
      email: user.email,
      name: user.name,
      username: user.name, // Using name as username for backward compatibility
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      longTermGoal: user.longTermGoal || '',
      activitySettings: user.activitySettings || {
        physicalActivities: [],
        mentalActivities: [],
        bonusActivities: []
      },
      status: user.status || 'Active'
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
    
    console.error('Error in /api/auth/me endpoint:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add middleware to ensure all API responses have the correct Content-Type
app.use('/api', (req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  next();
});

// Global error handler to ensure JSON responses for API routes
app.use((err, req, res, next) => {
  console.error('Global error:', err);
  
  // Only handle API routes
  if (req.path.startsWith('/api')) {
    res.setHeader('Content-Type', 'application/json');
    const statusCode = err.statusCode || 500;
    return res.status(statusCode).json({
      message: err.message || 'Internal Server Error',
      error: process.env.NODE_ENV === 'production' ? {} : err
    });
  }
  
  next(err);
});

// Add a route for handling web-based password reset
app.get('/reset-password', (req, res) => {
  const token = req.query.token;
  if (!token) {
    return res.status(400).send('Missing reset token');
  }
  
  // Serve a simple HTML form for resetting password
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Reset Password - Slugger App</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 500px;
          margin: 0 auto;
          padding: 20px;
        }
        h1 {
          color: #6c63ff;
          text-align: center;
        }
        .container {
          background: #f9f9f9;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        input {
          width: 100%;
          padding: 10px;
          margin-bottom: 15px;
          border: 1px solid #ddd;
          border-radius: 4px;
          box-sizing: border-box;
        }
        button {
          background: #6c63ff;
          color: white;
          border: none;
          padding: 12px 20px;
          border-radius: 25px;
          cursor: pointer;
          width: 100%;
          font-size: 16px;
        }
        .error {
          color: red;
          margin-bottom: 15px;
        }
        .success {
          color: green;
          margin-bottom: 15px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Reset Your Password</h1>
        <div id="errorMessage" class="error" style="display: none;"></div>
        <div id="successMessage" class="success" style="display: none;"></div>
        
        <div id="resetForm">
          <div>
            <label for="password">New Password</label>
            <input type="password" id="password" placeholder="Enter new password" minlength="6" required>
          </div>
          
          <div>
            <label for="confirmPassword">Confirm Password</label>
            <input type="password" id="confirmPassword" placeholder="Confirm new password" minlength="6" required>
          </div>
          
          <button type="button" onclick="resetPassword()">Reset Password</button>
        </div>
        
        <div id="successScreen" style="display: none; text-align: center;">
          <p>Your password has been reset successfully.</p>
          <p style="margin-top: 15px; color: #666;">You can now close this window and login to the app with your new password.</p>
        </div>
      </div>
      
      <script>
        const token = "${token}";
        
        async function resetPassword() {
          const password = document.getElementById('password').value;
          const confirmPassword = document.getElementById('confirmPassword').value;
          const errorMessage = document.getElementById('errorMessage');
          
          errorMessage.style.display = 'none';
          
          if (!password || password.length < 6) {
            errorMessage.textContent = 'Password must be at least 6 characters long';
            errorMessage.style.display = 'block';
            return;
          }
          
          if (password !== confirmPassword) {
            errorMessage.textContent = 'Passwords do not match';
            errorMessage.style.display = 'block';
            return;
          }
          
          try {
            const response = await fetch('/api/auth/reset-password', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                token: token,
                password: password
              })
            });
            
            // Check if response is JSON
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
              throw new Error('Server returned non-JSON response. Please try again later.');
            }
            
            const data = await response.json();
            
            if (!response.ok) {
              throw new Error(data.message || 'Failed to reset password');
            }
            
            // Show success screen
            document.getElementById('resetForm').style.display = 'none';
            document.getElementById('successMessage').textContent = data.message;
            document.getElementById('successMessage').style.display = 'block';
            document.getElementById('successScreen').style.display = 'block';
          } catch (error) {
            console.error('Password reset error:', error);
            errorMessage.textContent = error.message || 'An unexpected error occurred. Please try again.';
            errorMessage.style.display = 'block';
          }
        }
      </script>
    </body>
    </html>
  `);
});
