const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const os = require('os');

// Function to get all server IP addresses
const getServerIPs = () => {
  // Check if an APP_PUBLIC_URL environment variable is set
  // This should be set to the public domain or IP where the app is accessible
  if (process.env.APP_PUBLIC_URL) {
    console.log(`=== Using configured public URL ===`);
    console.log(`Public URL: ${process.env.APP_PUBLIC_URL}`);
    // Return the configured public URL as the first (and only) option
    return [process.env.APP_PUBLIC_URL];
  }
  
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

// Absolute simplest route for diagnostics
app.get('/test', (req, res) => {
  res.setHeader('Content-Type', 'text/plain');
  res.send('Slugger server is running. 🚀');
});

// Add a simple debug route
app.get('/debug', (req, res) => {
  try {
    const debugInfo = {
      timestamp: new Date().toISOString(),
      node_env: process.env.NODE_ENV || 'not set',
      port: process.env.PORT || '5000',
      app_public_url: process.env.APP_PUBLIC_URL || 'not set',
      mongodb_status: mongoose.connection.readyState,
      headers: req.headers,
      routes: app._router.stack
        .filter(r => r.route && r.route.path)
        .map(r => ({
          path: r.route.path,
          methods: Object.keys(r.route.methods).filter(m => r.route.methods[m])
        }))
    };
    
    res.status(200).json(debugInfo);
  } catch (error) {
    res.status(500).json({
      error: error.message,
      stack: error.stack
    });
  }
});

// Add a root route handler (moved to top priority)
app.get('/', (req, res) => {
  // Check if the request accepts HTML
  const acceptsHtml = req.accepts('html');
  
  if (!acceptsHtml) {
    return res.status(200).send('Slugger API Server is running.');
  }
  
  res.status(200).send(`
    <html>
      <head>
        <title>Slugger API Server</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            max-width: 800px; 
            margin: 0 auto; 
            padding: 20px;
          }
          h1 { color: #6c63ff; }
          .card {
            background: #f9f9f9;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .endpoint {
            background: #f0f0f0;
            padding: 10px;
            border-radius: 4px;
            margin: 10px 0;
            font-family: monospace;
          }
          .status {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            margin-left: 10px;
            font-size: 14px;
            font-weight: bold;
          }
          .status.active {
            background: #4CAF50;
            color: white;
          }
          .method {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 3px;
            margin-right: 8px;
            font-size: 12px;
            font-weight: bold;
          }
          .get { background: #61affe; color: white; }
          .post { background: #49cc90; color: white; }
        </style>
      </head>
      <body>
        <h1>✓ Slugger API Server</h1>
        <div class="card">
          <h2>Server Status <span class="status active">ONLINE</span></h2>
          <p>The server is running correctly. This is the API backend for the Slugger health tracking application.</p>
        </div>
        
        <div class="card">
          <h2>Available Endpoints</h2>
          
          <div class="endpoint">
            <span class="method post">POST</span> /api/auth/signup
            <p>Register a new user account</p>
          </div>
          
          <div class="endpoint">
            <span class="method get">GET</span> /api/auth/verify-email
            <p>Verify user email address</p>
          </div>
          
          <div class="endpoint">
            <span class="method post">POST</span> /api/auth/login
            <p>Authenticate and get access token</p>
          </div>
          
          <div class="endpoint">
            <span class="method post">POST</span> /api/auth/resend-verification
            <p>Resend verification email</p>
          </div>
        </div>
        
        <div class="card">
          <h2>Documentation</h2>
          <p>For more information on how to use these endpoints, please refer to the project documentation.</p>
        </div>
      </body>
    </html>
  `);
});

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
  .then(() => {
    console.log('Connected to MongoDB Atlas');
    // Create test account after successful connection
    createTestAccount();
  })
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

// Function to create a test account
async function createTestAccount() {
  try {
    if (mongoose.connection.readyState === 1) {
      // Check if test account already exists
      const testEmail = '1@slugger.com';
      const existingUser = await User.findOne({ email: testEmail });
      
      if (!existingUser) {
        console.log('Creating test account...');
        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('316316', salt);
        
        // Create new test user
        const testUser = new User({
          email: testEmail,
          password: hashedPassword,
          isVerified: true, // Already verified
          verificationToken: null,
          verificationTokenExpires: null
        });
        
        await testUser.save();
        console.log('Test account created successfully');
      } else {
        console.log('Test account already exists');
      }
    }
  } catch (error) {
    console.error('Error creating test account:', error);
  }
}

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
    console.log('Port being used:', process.env.PORT || 5000);
    console.log('Full verification link:', `http://${primaryIP}:${process.env.PORT || 5000}/api/auth/verify-email?token=${verificationToken}&email=${email}`);
    console.log('===============================');
    
    const mailOptions = {
      from: process.env.MAIL_FROM,
      to: email,
      subject: 'Verify your Slugger account',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
          <h1 style="text-align: center; color: #6c63ff;">Welcome to Slugger!</h1>
          <p style="font-size: 16px; line-height: 1.5; color: #444;">Thank you for signing up. Please verify your email address by clicking the button below:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.APP_PUBLIC_URL ? `http://${process.env.APP_PUBLIC_URL}` : `http://${primaryIP}:${process.env.PORT || 5000}`}/api/auth/verify-email?token=${verificationToken}&email=${encodeURIComponent(email)}" 
               style="background-color: #6c63ff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold;">
              Verify Email
            </a>
          </div>
          
          <p style="font-size: 14px; color: #666;">If you're using a mobile device and the button doesn't work, try copying and pasting this link into your browser:</p>
          
          <div style="margin: 15px 0; padding: 10px; background-color: #f5f5f5; border-radius: 4px; word-break: break-all; font-family: monospace; font-size: 12px;">
            ${process.env.APP_PUBLIC_URL ? `http://${process.env.APP_PUBLIC_URL}` : `http://${primaryIP}:${process.env.PORT || 5000}`}/api/auth/verify-email?token=${verificationToken}&email=${encodeURIComponent(email)}
          </div>
          
          <p style="font-size: 14px; color: #666;">If the links above don't work, you can try clicking one of these alternative links:</p>
          
          <ul style="font-size: 14px; color: #666;">
            ${serverIPs.map((ip, index) => `<li><a href="http://${ip}:${process.env.PORT || 5000}/api/auth/verify-email?token=${verificationToken}&email=${encodeURIComponent(email)}">Alternative Link ${index + 1} (${ip})</a></li>`).join('')}
            <li><a href="http://localhost:${process.env.PORT || 5000}/api/auth/verify-email?token=${verificationToken}&email=${encodeURIComponent(email)}">Local Link (localhost)</a></li>
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
      console.log('Using from address:', process.env.MAIL_FROM);
      
      const info = await transporter.sendMail(mailOptions);
      console.log('Verification email sent to:', email);
      console.log('Email response:', info.response);
      console.log('Message ID:', info.messageId);
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

// Email verification endpoint
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
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 20px; background-color: #f9f9f9; }
              .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
              h1 { color: #e74c3c; }
              p { font-size: 18px; line-height: 1.6; color: #555; }
              .error-icon {
                font-size: 64px;
                color: #e74c3c;
                margin-bottom: 20px;
              }
              .note {
                margin-top: 20px;
                font-size: 14px;
                color: #777;
              }
              /* Mobile styles */
              @media (max-width: 600px) {
                .container { padding: 20px; }
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="error-icon">✗</div>
              <h1>Verification Failed</h1>
              <p>The verification link is invalid or has expired.</p>
              <p>Please try logging in or request a new verification email.</p>
              
              <p class="note">Please open the Slugger app on your device to log in or request a new verification email.</p>
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
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 20px; background-color: #f9f9f9; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h1 { color: #2ecc71; }
            p { font-size: 18px; line-height: 1.6; color: #555; }
            .success-icon {
              font-size: 64px;
              color: #2ecc71;
              margin-bottom: 20px;
            }
            .note {
              margin-top: 20px;
              font-size: 14px;
              color: #777;
            }
            /* Mobile styles */
            @media (max-width: 600px) {
              .container { padding: 20px; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="success-icon">✓</div>
            <h1>Email Verified Successfully!</h1>
            <p>Your email has been verified. You can now log in to your account.</p>
            
            <p class="note">Please open the Slugger app on your device and log in with your credentials.</p>
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
            .error-icon {
              font-size: 64px;
              color: #e74c3c;
              margin-bottom: 20px;
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
            
            <p class="note">Please open the Slugger app on your device and try to log in or request a new verification email.</p>
          </div>
        </body>
      </html>
    `);
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
    const serverIPs = getServerIPs();
    const primaryIP = serverIPs.length > 0 ? serverIPs[0] : 'localhost'; // Use first IP, or localhost as fallback
    const port = process.env.PORT || 5000;
    
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
            <a href="${process.env.APP_PUBLIC_URL ? `http://${process.env.APP_PUBLIC_URL}` : `http://${primaryIP}:${port}`}/api/auth/verify-email?token=${user.verificationToken}&email=${encodeURIComponent(email)}" 
               style="background-color: #6c63ff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold;">
              Verify Email
            </a>
          </div>
          
          <p style="font-size: 14px; color: #666;">If you're using a mobile device and the button doesn't work, try copying and pasting this link into your browser:</p>
          
          <div style="margin: 15px 0; padding: 10px; background-color: #f5f5f5; border-radius: 4px; word-break: break-all; font-family: monospace; font-size: 12px;">
            ${process.env.APP_PUBLIC_URL ? `http://${process.env.APP_PUBLIC_URL}` : `http://${primaryIP}:${port}`}/api/auth/verify-email?token=${user.verificationToken}&email=${encodeURIComponent(email)}
          </div>
          
          <p style="font-size: 14px; color: #666;">If the links above don't work, you can try clicking one of these alternative links:</p>
          
          <ul style="font-size: 14px; color: #666;">
            ${serverIPs.map((ip, index) => `<li><a href="http://${ip}:${port}/api/auth/verify-email?token=${user.verificationToken}&email=${encodeURIComponent(email)}">Alternative Link ${index + 1} (${ip})</a></li>`).join('')}
            <li><a href="http://localhost:${port}/api/auth/verify-email?token=${user.verificationToken}&email=${encodeURIComponent(email)}">Local Link (localhost)</a></li>
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
        email: user.email
      }
    });
  } catch (error) {
    console.error('Login error:', error);
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
        port: process.env.PORT || 5000
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
      port: process.env.PORT || 5000,
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

// Add a test account login endpoint
app.get('/api/test-account', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({ message: 'MongoDB not connected' });
    }
    
    const testEmail = '1@slugger.com';
    // Check if the test account exists
    const testUser = await User.findOne({ email: testEmail });
    
    if (!testUser) {
      // Create the test account if it doesn't exist
      console.log('Test account not found, creating it now...');
      
      // Hash the password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('316316', salt);
      
      // Create new test user
      const newTestUser = new User({
        email: testEmail,
        password: hashedPassword,
        isVerified: true, // Already verified
        verificationToken: null,
        verificationTokenExpires: null
      });
      
      await newTestUser.save();
      console.log('Test account created successfully');
      
      return res.status(200).json({ 
        message: 'Test account created successfully', 
        credentials: {
          email: testEmail,
          password: '316316'
        }
      });
    }
    
    return res.status(200).json({ 
      message: 'Test account exists', 
      credentials: {
        email: testEmail,
        password: '316316'
      }
    });
  } catch (error) {
    console.error('Error with test account:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add a debug endpoint to list all users
app.get('/api/debug/users', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({ message: 'MongoDB not connected' });
    }
    
    // Get all users (limit to last 10 for security)
    const users = await User.find({})
      .select('email isVerified createdAt')
      .sort('-createdAt')
      .limit(10);
    
    return res.status(200).json({ 
      message: 'List of users (limited to 10)',
      users,
      count: users.length,
      testAccountInfo: {
        email: '1@slugger.com',
        password: '316316'
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add a catch-all route handler for undefined routes
app.use('*', (req, res) => {
  res.status(404).send(`
    <html>
      <head>
        <title>404 - Not Found</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            max-width: 800px; 
            margin: 0 auto; 
            padding: 20px;
            text-align: center;
          }
          h1 { color: #e74c3c; }
          .back { 
            margin-top: 20px;
            color: #6c63ff;
          }
          .container {
            background: #f9f9f9;
            border-radius: 8px;
            padding: 30px;
            margin: 40px auto;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .error-code {
            font-size: 72px;
            color: #e74c3c;
            margin: 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <p class="error-code">404</p>
          <h1>Page Not Found</h1>
          <p>The requested URL ${req.originalUrl} was not found on this server.</p>
          <p class="back"><a href="/">Go to the homepage</a></p>
        </div>
      </body>
    </html>
  `);
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
  
  // Try to create test account on server start
  if (mongoose.connection.readyState === 1) {
    console.log('Creating test account on server start...');
    createTestAccount().then(() => {
      console.log('Test account creation attempt completed');
    }).catch(err => {
      console.error('Error creating test account on server start:', err);
    });
  }
  
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
  console.log(`MongoDB connection string: ${process.env.MONGODB_URI ? process.env.MONGODB_URI.replace(/\/\/(.+?)@/, '//***@') : 'Not configured'}`);
  
  console.log("\n=== NETWORK DISCOVERY INFO ===");
  console.log("The server can be auto-discovered on these IPs:");
  ipAddresses.forEach(ip => {
    console.log(`- ${ip}`);
  });
  console.log("================================\n");
});
