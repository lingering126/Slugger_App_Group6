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
const { router: authRoutes, authMiddleware } = require('./routes/auth');
const activityRoutes = require('./routes/activities');
const statsRoutes = require('./homepage/routes/index');
<<<<<<< Updated upstream
const groupRoutes = require('./routes/group');
const teamRoutes = require('./src/routes/team');
=======
const teamRoutes = require('./routes/team');
const userTargetRoutes = require('./routes/userTarget');
<<<<<<< Updated upstream
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes

// Function to get all server IP addresses
const getServerIPs = () => {
  const networkInterfaces = os.networkInterfaces();
  const serverIPs = [];
  
  console.log('=== Network Interface Scanning Started ===');
  console.log('Available interfaces:', Object.keys(networkInterfaces));
  
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
  host: process.env.MAIL_HOST,
  port: parseInt(process.env.MAIL_PORT),
  auth: {
    user: process.env.MAIL_USER,
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
    console.error('Please check your email credentials and settings in .env file');
  });

// CORS configuration
const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware
app.use(cors(corsOptions));

app.use(express.json());

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
app.use('/api/teams', teamRoutes);
app.use('/api/posts', authMiddleware, postsRouter);
app.use('/api/activities', authMiddleware, activityRoutes);
app.use('/api/stats', authMiddleware, statsRoutes);
app.use('/api/groups', groupRoutes);

// Register userTarget routes - Fix path
app.use('/api/user-targets', userTargetRoutes);

// Register userTarget routes - Fix path
app.use('/api/user-targets', userTargetRoutes);

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
    
    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
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
        console.log('Email already in use');
        return res.status(400).json({ message: 'Email already in use' });
      }
      
      const newUser = {
        id: Date.now().toString(),
        email,
        password: hashedPassword, // Store the hashed password
        isVerified: false,
        verificationToken,
        verificationTokenExpires
      };
      
      inMemoryUsers.push(newUser);
      console.log('User registered in memory:', email);
    }
    
    // Send verification email
    const serverIPs = getServerIPs();
    const primaryIP = serverIPs.length > 0 ? serverIPs[0] : 'localhost'; // Use first IP, or localhost as fallback
    
    console.log('=== Signup Email Link Details ===');
    console.log('Available server IPs:', serverIPs);
    console.log('Primary IP being used:', primaryIP);
    console.log('Port being used:', process.env.PORT || 5001);
    console.log('Full verification link:', `http://${primaryIP}:${process.env.PORT || 5001}/api/auth/verify-email?token=${verificationToken}&email=${email}`);
    console.log('===============================');
    
    // Ensure email sending configuration exists
    if (!process.env.MAIL_FROM || !process.env.MAIL_USER || !process.env.MAIL_PASS) {
      console.warn('Email configuration missing. Setting up a default transporter for development.');
      // If email service is not configured, create a test transporter
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
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
      from: process.env.MAIL_FROM || 'test@example.com',
      to: email,
      subject: 'Verify your Slugger account',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
          <h1 style="text-align: center; color: #6c63ff;">Welcome to Slugger!</h1>
          <p style="font-size: 16px; line-height: 1.5; color: #444;">Thank you for signing up. Please verify your email address by clicking the button below:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="http://${primaryIP}:${process.env.PORT || 5001}/api/auth/verify-email?token=${verificationToken}&email=${email}" 
               style="background-color: #6c63ff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold;">
              Verify Email
            </a>
          </div>
          
          <p style="font-size: 14px; color: #666;">If the button above doesn't work, you can try clicking one of these alternative links:</p>
          
          <ul style="font-size: 14px; color: #666;">
            ${serverIPs.map((ip, index) => `<li><a href="http://${ip}:${process.env.PORT || 5001}/api/auth/verify-email?token=${verificationToken}&email=${email}">Alternative Link ${index + 1} (${ip})</a></li>`).join('')}
            <li><a href="http://localhost:${process.env.PORT || 5001}/api/auth/verify-email?token=${verificationToken}&email=${email}">Local Link (localhost)</a></li>
          </ul>
          
          <p style="font-size: 14px; color: #666; margin-top: 30px;">This link will expire in 24 hours.</p>
          <p style="font-size: 14px; color: #666;">If you did not sign up for Slugger, please ignore this email.</p>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #999; font-size: 12px;">
            &copy; ${new Date().getFullYear()} Slugger Health. All rights reserved.
          </div>
        </div>
      `
    };
    
    try {
      console.log('Attempting to send verification email to:', email);
      console.log('Using from address:', mailOptions.from);
      
      const info = await transporter.sendMail(mailOptions);
      console.log('Verification email sent to:', email);
      console.log('Email response:', info.response);
      console.log('Message ID:', info.messageId);
      
      // If using an Ethereal test account, provide a preview link
      if (info.messageId && info.messageId.includes('ethereal')) {
        console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
        console.log('IMPORTANT: This is a test email. Check the preview URL above to view it.');
      }
    } catch (emailError) {
      console.error('Error sending verification email:', emailError);
      console.error('Error details:', emailError.message);
      
      if (emailError.message.includes('authorized')) {
        console.error('IMPORTANT: With Mailgun sandbox domains, you can only send to authorized recipients.');
        console.error('Please authorize the recipient email in your Mailgun dashboard or use a different email service.');
      }
      
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
    
    res.status(200).json({
      token,
      user: {
        id: user.id || user._id,
        email: user.email,
        name: user.name,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.get('/api/auth/verify-email', async (req, res) => {
  try {
    const { token, email } = req.query;
    
    if (!token || !email) {
      return res.status(400).json({ message: 'Invalid verification link' });
    }
    
    // Get server IP addresses for building App links
    const serverIPs = getServerIPs();
    const primaryIP = serverIPs.length > 0 ? serverIPs[0] : 'localhost';
    
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
      return res.status(400).send(`
        <html>
          <head>
            <title>Verification Failed</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background-color: #f9f9f9; }
              .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
              h1 { color: #e74c3c; }
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
                margin: 10px;
              }
              .button:hover {
                background-color: #5a52d5;
              }
              .error-icon {
                font-size: 64px;
                color: #e74c3c;
                margin-bottom: 20px;
              }
              .button-container {
                margin-top: 20px;
              }
              .note {
                margin-top: 20px;
                font-size: 14px;
                color: #777;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="error-icon">✗</div>
              <h1>Verification Failed</h1>
              <p>The verification link is invalid or has expired.</p>
              <p>Please try logging in or request a new verification email.</p>
              
              <div class="button-container">
                <p>If you're using the app on this device, try one of these links:</p>
                <a href="exp://${primaryIP}:19000/screens/login" class="button">Open App</a>
                <a href="exp://${primaryIP}:19000/screens/login" class="button">Alternative Link</a>
              </div>
              
              <p class="note">Note: If the buttons above don't work, please manually open the Slugger app on your device.</p>
            </div>
          </body>
        </html>
      `);
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
              margin: 10px;
            }
            .button:hover {
              background-color: #5a52d5;
            }
            .success-icon {
              font-size: 64px;
              color: #2ecc71;
              margin-bottom: 20px;
            }
            .button-container {
              margin-top: 20px;
            }
            .note {
              margin-top: 20px;
              font-size: 14px;
              color: #777;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="success-icon">✓</div>
            <h1>Email Verified Successfully!</h1>
            <p>Your email has been verified. You can now log in to your account.</p>
            <p>Please open the Slugger app on your device and log in with your credentials.</p>
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).send(`
      <html>
        <head>
          <title>Verification Error</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background-color: #f9f9f9; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h1 { color: #e74c3c; }
            p { font-size: 18px; line-height: 1.6; color: #555; }
            .error { color: #e74c3c; font-family: monospace; margin: 20px 0; padding: 10px; background: #f8f8f8; border-radius: 4px; }
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
              margin: 10px;
            }
            .button:hover {
              background-color: #5a52d5;
            }
            .error-icon {
              font-size: 64px;
              color: #e74c3c;
              margin-bottom: 20px;
            }
            .button-container {
              margin-top: 20px;
            }
            .note {
              margin-top: 20px;
              font-size: 14px;
              color: #777;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="error-icon">⚠</div>
            <h1>Verification Error</h1>
            <p>An error occurred during the verification process.</p>
            <div class="error">${error.message}</div>
            
            <div class="button-container">
              <p>If you're using the app on this device, try one of these links:</p>
              <a href="exp://${primaryIP}:19000/screens/login" class="button">Open App</a>
              <a href="exp://${primaryIP}:19000/screens/login" class="button">Alternative Link</a>
            </div>
            
            <p class="note">Note: If the buttons above don't work, please manually open the Slugger app on your device.</p>
          </div>
        </body>
      </html>
    `);
  }
});

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
    const serverIPs = getServerIPs();
    const primaryIP = serverIPs.length > 0 ? serverIPs[0] : 'localhost'; // Use first IP, or localhost as fallback
    const port = process.env.PORT || 5001;
    
    console.log('=== Resend Email Link Details ===');
    console.log('Available server IPs:', serverIPs);
    console.log('Primary IP being used:', primaryIP);
    console.log('Port being used:', port);
    console.log('Generated verification links:');
    serverIPs.forEach((ip, index) => {
      console.log(`Link ${index + 1}: http://${ip}:${port}/api/auth/verify-email?token=${user.verificationToken}&email=${email}`);
    });
    console.log('Localhost link:', `http://localhost:${port}/api/auth/verify-email?token=${user.verificationToken}&email=${email}`);
    console.log('================================');
    
    const mailOptions = {
      from: process.env.MAIL_FROM,
      to: email,
      subject: 'Verify your Slugger account',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
          <h1 style="text-align: center; color: #6c63ff;">Welcome to Slugger!</h1>
          <p style="font-size: 16px; line-height: 1.5; color: #444;">Thank you for signing up. Please verify your email address by clicking the button below:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="http://${primaryIP}:${process.env.PORT || 5001}/api/auth/verify-email?token=${user.verificationToken}&email=${email}" 
               style="background-color: #6c63ff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold;">
              Verify Email
            </a>
          </div>
          
          <p style="font-size: 14px; color: #666;">If the button above doesn't work, you can try clicking one of these alternative links:</p>
          
          <ul style="font-size: 14px; color: #666;">
            ${serverIPs.map((ip, index) => `<li><a href="http://${ip}:${port}/api/auth/verify-email?token=${user.verificationToken}&email=${email}">Alternative Link ${index + 1} (${ip})</a></li>`).join('')}
            <li><a href="http://localhost:${port}/api/auth/verify-email?token=${user.verificationToken}&email=${email}">Local Link (localhost)</a></li>
          </ul>
          
          <p style="font-size: 14px; color: #666; margin-top: 30px;">This link will expire in 24 hours.</p>
          <p style="font-size: 14px; color: #666;">If you did not sign up for Slugger, please ignore this email.</p>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #999; font-size: 12px;">
            &copy; ${new Date().getFullYear()} Slugger Health. All rights reserved.
          </div>
        </div>
      `
    };
    
    try {
      console.log('Attempting to resend verification email to:', email);
      console.log('Using from address:', process.env.MAIL_FROM);
      
      const info = await transporter.sendMail(mailOptions);
      console.log('Verification email resent to:', email);
      console.log('Email response:', info.response);
      console.log('Message ID:', info.messageId);
      
      res.status(200).json({ message: 'Verification email sent. Please check your inbox.' });
    } catch (emailError) {
      console.error('Error sending verification email:', emailError);
      console.error('Error details:', emailError.message);
      
      if (emailError.message.includes('authorized')) {
        console.error('IMPORTANT: With Mailgun sandbox domains, you can only send to authorized recipients.');
        console.error('Please authorize the recipient email in your Mailgun dashboard or use a different email service.');
        
        res.status(500).json({ 
          message: 'Failed to send verification email. With Mailgun sandbox domains, you can only send to authorized recipients.',
          error: 'unauthorized_recipient'
        });
      } else {
        res.status(500).json({ message: 'Failed to send verification email', error: emailError.message });
      }
    }
  } catch (error) {
    console.error('Resend verification error:', error);
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
      
      if (emailError.message.includes('authorized')) {
        return res.status(500).json({ 
          message: 'Failed to send test email. With Mailgun sandbox domains, you can only send to authorized recipients.',
          error: 'unauthorized_recipient',
          solution: 'Authorize this recipient in your Mailgun dashboard or use a different email service.'
        });
      }
      
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
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Start server
// Note: PORT is set to 5001 in the .env file, which overrides this default
const PORT = process.env.PORT || 5001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
  
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
