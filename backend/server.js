const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

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
    const backendUrl = `http://localhost:${process.env.PORT || 5000}`;
    const verificationUrl = `${backendUrl}/api/auth/verify-email?token=${verificationToken}&email=${email}`;
    
    const mailOptions = {
      from: process.env.MAIL_FROM,
      to: email,
      subject: 'Verify your Slugger account',
      html: `
        <h1>Welcome to Slugger!</h1>
        <p>Thank you for signing up. Please verify your email address by clicking the link below:</p>
        <p>If the link below doesn't work, try one of these alternative links:</p>
        <ul>
          <li><a href="http://192.168.31.251:${process.env.PORT || 5000}/api/auth/verify-email?token=${verificationToken}&email=${email}">Link 1</a></li>
          <li><a href="http://192.168.31.250:${process.env.PORT || 5000}/api/auth/verify-email?token=${verificationToken}&email=${email}">Link 2</a></li>
          <li><a href="http://192.168.1.100:${process.env.PORT || 5000}/api/auth/verify-email?token=${verificationToken}&email=${email}">Link 3</a></li>
          <li><a href="http://192.168.0.100:${process.env.PORT || 5000}/api/auth/verify-email?token=${verificationToken}&email=${email}">Link 4</a></li>
          <li><a href="http://172.20.10.2:${process.env.PORT || 5000}/api/auth/verify-email?token=${verificationToken}&email=${email}">Link 5</a></li>
          <li><a href="http://172.20.10.3:${process.env.PORT || 5000}/api/auth/verify-email?token=${verificationToken}&email=${email}">Link 6</a></li>
          <li><a href="${verificationUrl}">Original Link</a></li>
        </ul>
        <p>This link will expire in 24 hours.</p>
        <p>If you did not sign up for Slugger, please ignore this email.</p>
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
              }
              .button:hover {
                background-color: #5a52d5;
              }
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
              <p>The verification link is invalid or has expired.</p>
              <p>Please try logging in or request a new verification email.</p>
              <a href="${process.env.FRONTEND_URL}/screens/login" class="button">Go to Login</a>
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
          <script>
            // Try to redirect after 3 seconds
            setTimeout(function() {
              window.location.href = "${process.env.FRONTEND_URL}/screens/login?verified=true";
            }, 3000);
          </script>
        </head>
        <body>
          <div class="container">
            <div class="success-icon">✓</div>
            <h1>Email Verified Successfully!</h1>
            <p>Your email has been verified. You can now log in to your account.</p>
            <p>You will be redirected to the login page in 3 seconds...</p>
            <a href="${process.env.FRONTEND_URL}/screens/login?verified=true" class="button">Go to Login</a>
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
            }
            .button:hover {
              background-color: #5a52d5;
            }
            .error-icon {
              font-size: 64px;
              color: #e74c3c;
              margin-bottom: 20px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="error-icon">⚠</div>
            <h1>Verification Error</h1>
            <p>An error occurred during the verification process.</p>
            <div class="error">${error.message}</div>
            <a href="${process.env.FRONTEND_URL}/screens/login" class="button">Go to Login</a>
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
    const backendUrl = `http://localhost:${process.env.PORT || 5000}`;
    const verificationUrl = `${backendUrl}/api/auth/verify-email?token=${user.verificationToken}&email=${email}`;
    
    const mailOptions = {
      from: process.env.MAIL_FROM,
      to: email,
      subject: 'Verify your Slugger account',
      html: `
        <h1 style="text-align: center;">Welcome to Slugger!</h1>
        <p>Thank you for signing up. Please verify your email address by clicking the link below:</p>
        <ul>
          <li><a href="http://192.168.31.251:${process.env.PORT || 5000}/api/auth/verify-email?token=${user.verificationToken}&email=${email}">Verify your email</a></li>
        </ul>
        <p>This link will expire in 24 hours.</p>
        <p>If you did not sign up for Slugger, please ignore this email.</p>
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
        <h1>Email Test Successful!</h1>
        <p>If you're seeing this, your email configuration is working correctly.</p>
        <p>Email configuration details:</p>
        <ul>
          <li>Host: ${process.env.MAIL_HOST}</li>
          <li>Port: ${process.env.MAIL_PORT}</li>
          <li>From: ${process.env.MAIL_FROM}</li>
          <li>To: ${email}</li>
          <li>Time: ${new Date().toISOString()}</li>
        </ul>
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
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
  console.log(`Server also available at http://0.0.0.0:${PORT}/api (all interfaces)`);
  console.log(`MongoDB connection string: ${process.env.MONGODB_URI.replace(/\/\/(.+?)@/, '//***@')}`);
});