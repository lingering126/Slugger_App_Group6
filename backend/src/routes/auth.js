const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');

// Signup
router.post('/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate verification token
    const crypto = require('crypto');
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create new user
    const user = new User({
      email,
      password: hashedPassword,
      name,
      isVerified: false,
      verificationToken,
      verificationTokenExpires
    });

    await user.save();
    console.log('User registered, verification required:', email);

    // Send verification email
    const os = require('os');
    const nodemailer = require('nodemailer');
    
    // Function to get server IPs
    const getServerIPs = () => {
      const networkInterfaces = os.networkInterfaces();
      const serverIPs = [];
      
      Object.keys(networkInterfaces).forEach((interfaceName) => {
        const addresses = networkInterfaces[interfaceName];
        
        addresses.forEach((addr) => {
          if (addr.family === 'IPv4' && !addr.internal) {
            if (addr.address.startsWith('192.168.')) {
              serverIPs.unshift(addr.address);
            } else if (addr.address.startsWith('10.') || 
                     (addr.address.startsWith('172.') && 
                      parseInt(addr.address.split('.')[1]) >= 16 && 
                      parseInt(addr.address.split('.')[1]) <= 31)) {
              serverIPs.push(addr.address);
            }
          }
        });
      });
      
      return serverIPs.length > 0 ? serverIPs : ['localhost'];
    };
    
    const serverIPs = getServerIPs();
    const primaryIP = serverIPs[0];
    const port = process.env.PORT || 5000;
    
    // Use the configured email service from server.js
    try {
      // Get the email configuration from environment variables
      const emailConfig = {
        host: process.env.MAIL_HOST,
        port: parseInt(process.env.MAIL_PORT),
        auth: {
          user: process.env.MAIL_USER,
          pass: process.env.MAIL_PASS
        },
        secure: process.env.MAIL_PORT === '465',
        tls: {
          rejectUnauthorized: false
        }
      };

      console.log(`Using email configuration: ${emailConfig.host}:${emailConfig.port} with user ${emailConfig.auth.user}`);
      
      // Create transporter with the configuration
      const transporter = nodemailer.createTransport(emailConfig);
      
      const mailOptions = {
        from: process.env.MAIL_FROM || '"Slugger App" <noreply@slugger.app>',
        to: email,
        subject: 'Verify your Slugger account',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
            <h1 style="text-align: center; color: #6c63ff;">Welcome to Slugger!</h1>
            <p style="font-size: 16px; line-height: 1.5; color: #444;">Thank you for signing up. Please verify your email address by clicking the button below:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/api/auth/verify-email?token=${verificationToken}&email=${email}" 
                 style="background-color: #6c63ff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold;">
                Verify Email
              </a>
            </div>
            
            <p style="font-size: 14px; color: #666;">If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="font-size: 14px; color: #666; word-break: break-all;">
              ${process.env.FRONTEND_URL}/api/auth/verify-email?token=${verificationToken}&email=${email}
            </p>
            
            <p style="font-size: 14px; color: #666; margin-top: 30px;">This link will expire in 24 hours.</p>
            <p style="font-size: 14px; color: #666;">If you did not sign up for Slugger, please ignore this email.</p>
          </div>
        `
      };
      
      console.log('Attempting to send email with Mailgun...');
      console.log('Mail options:', {
        from: mailOptions.from,
        to: mailOptions.to,
        subject: mailOptions.subject
      });
      
      // Verify transporter configuration before sending
      await transporter.verify();
      console.log('Transporter verification successful');
      
      const info = await transporter.sendMail(mailOptions);
      console.log('Email send result:', info);
      console.log('Verification email sent to:', email);
      console.log('Response:', info.response);
      console.log('Message ID:', info.messageId);
    } catch (emailError) {
      console.error('Error sending verification email:', emailError);
    }

    res.status(201).json({
      message: 'User registered successfully. Please check your email to verify your account.',
      requiresVerification: true,
      email: user.email
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check if user is verified
    if (user.isVerified === false) {
      return res.status(403).json({ 
        message: 'Please verify your email before logging in',
        requiresVerification: true,
        email: user.email
      });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Update last login time
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return user data including longTermGoal and activitySettings
    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        username: user.username,
        bio: user.bio,
        longTermGoal: user.longTermGoal,
        avatarUrl: user.avatarUrl,
        status: user.status,
        activitySettings: user.activitySettings || {
          physicalActivities: [],
          mentalActivities: [],
          bonusActivities: []
        },
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get user profile
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const userId = req.userData.userId;
    
    // Find user by ID
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Return user data without sensitive fields
    res.json({
      id: user._id,
      email: user.email,
      name: user.name,
      username: user.username,
      bio: user.bio,
      longTermGoal: user.longTermGoal,
      avatarUrl: user.avatarUrl,
      status: user.status,
      activitySettings: user.activitySettings || {
        physicalActivities: [],
        mentalActivities: [],
        bonusActivities: []
      },
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// NEW ENDPOINT: Get current user profile (/me)
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const userId = req.userData.userId;
    
    // Find user by ID
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Return user data without sensitive fields
    res.json({
      id: user._id,
      email: user.email,
      name: user.name,
      username: user.username,
      bio: user.bio,
      longTermGoal: user.longTermGoal,
      avatarUrl: user.avatarUrl,
      status: user.status,
      activitySettings: user.activitySettings || {
        physicalActivities: [],
        mentalActivities: [],
        bonusActivities: []
      },
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update user profile
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const userId = req.userData.userId;
    const { name, bio, longTermGoal, avatarUrl, activitySettings } = req.body;
    
    // Find user by ID
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Update fields if provided
    if (name) user.name = name;
    if (bio !== undefined) user.bio = bio;
    if (longTermGoal !== undefined) user.longTermGoal = longTermGoal;
    if (avatarUrl) user.avatarUrl = avatarUrl;
    if (activitySettings) user.activitySettings = activitySettings;
    
    // Save updated user
    await user.save();
    
    // Return updated user data
    res.json({
      id: user._id,
      email: user.email,
      name: user.name,
      username: user.username,
      bio: user.bio,
      longTermGoal: user.longTermGoal,
      avatarUrl: user.avatarUrl,
      status: user.status,
      activitySettings: user.activitySettings,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Email verification endpoint
router.get('/verify-email', async (req, res) => {
  try {
    const { token, email } = req.query;
    
    if (!token || !email) {
      return res.status(400).send('<h1>Invalid verification link</h1><p>The verification link is missing required parameters.</p>');
    }
    
    // Find user with matching token and email
    const user = await User.findOne({ 
      email, 
      verificationToken: token,
      verificationTokenExpires: { $gt: new Date() } // Token not expired
    });
    
    if (!user) {
      return res.status(400).send('<h1>Invalid or expired verification link</h1><p>The verification link is invalid or has expired. Please request a new verification email.</p>');
    }
    
    // Update user to verified status
    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();
    
    // Return success HTML page
    return res.status(200).send(`
      <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              text-align: center;
              padding: 40px;
              background-color: #f5f5f5;
            }
            .container {
              background-color: white;
              border-radius: 8px;
              padding: 30px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              max-width: 500px;
              margin: 0 auto;
            }
            h1 {
              color: #6c63ff;
            }
            .success-icon {
              font-size: 60px;
              color: #4CAF50;
              margin-bottom: 20px;
            }
            .button {
              background-color: #6c63ff;
              color: white;
              padding: 12px 30px;
              text-decoration: none;
              border-radius: 4px;
              font-weight: bold;
              display: inline-block;
              margin-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="success-icon">✓</div>
            <h1>Email Verified Successfully!</h1>
            <p>Your email has been verified. You can now log in to your Slugger account.</p>
            <a href="http://localhost:8081/" class="button">Go to Login</a>
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Email verification error:', error);
    return res.status(500).send('<h1>Server Error</h1><p>An error occurred during verification. Please try again later.</p>');
  }
});

// Resend verification email endpoint
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (user.isVerified) {
      return res.status(400).json({ message: 'Email is already verified' });
    }
    
    // Generate new verification token
    const crypto = require('crypto');
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    // Update user with new token
    user.verificationToken = verificationToken;
    user.verificationTokenExpires = verificationTokenExpires;
    await user.save();
    
    // Send verification email (similar to signup)
    const os = require('os');
    const nodemailer = require('nodemailer');
    
    // Function to get server IPs (same as in signup)
    const getServerIPs = () => {
      const networkInterfaces = os.networkInterfaces();
      const serverIPs = [];
      
      Object.keys(networkInterfaces).forEach((interfaceName) => {
        const addresses = networkInterfaces[interfaceName];
        
        addresses.forEach((addr) => {
          if (addr.family === 'IPv4' && !addr.internal) {
            if (addr.address.startsWith('192.168.')) {
              serverIPs.unshift(addr.address);
            } else if (addr.address.startsWith('10.') || 
                     (addr.address.startsWith('172.') && 
                      parseInt(addr.address.split('.')[1]) >= 16 && 
                      parseInt(addr.address.split('.')[1]) <= 31)) {
              serverIPs.push(addr.address);
            }
          }
        });
      });
      
      return serverIPs.length > 0 ? serverIPs : ['localhost'];
    };
    
    const serverIPs = getServerIPs();
    const primaryIP = serverIPs[0];
    const port = process.env.PORT || 5000;
    
    // Use the configured email service from server.js
    try {
      // Get the email configuration from environment variables
      const emailConfig = {
        host: process.env.MAIL_HOST,
        port: parseInt(process.env.MAIL_PORT),
        auth: {
          user: process.env.MAIL_USER,
          pass: process.env.MAIL_PASS
        },
        secure: process.env.MAIL_PORT === '465',
        tls: {
          rejectUnauthorized: false
        }
      };

      console.log(`Using email configuration: ${emailConfig.host}:${emailConfig.port} with user ${emailConfig.auth.user}`);
      
      // Create transporter with the configuration
      const transporter = nodemailer.createTransport(emailConfig);
      
      const mailOptions = {
        from: process.env.MAIL_FROM || '"Slugger App" <noreply@slugger.app>',
        to: email,
        subject: 'Verify your Slugger account',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
            <h1 style="text-align: center; color: #6c63ff;">Welcome to Slugger!</h1>
            <p style="font-size: 16px; line-height: 1.5; color: #444;">Thank you for signing up. Please verify your email address by clicking the button below:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/api/auth/verify-email?token=${verificationToken}&email=${email}" 
                 style="background-color: #6c63ff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold;">
                Verify Email
              </a>
            </div>
            
            <p style="font-size: 14px; color: #666;">If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="font-size: 14px; color: #666; word-break: break-all;">
              ${process.env.FRONTEND_URL}/api/auth/verify-email?token=${verificationToken}&email=${email}
            </p>
            
            <p style="font-size: 14px; color: #666; margin-top: 30px;">This link will expire in 24 hours.</p>
            <p style="font-size: 14px; color: #666;">If you did not sign up for Slugger, please ignore this email.</p>
          </div>
        `
      };
      
      console.log('Attempting to send email with Mailgun...');
      console.log('Mail options:', {
        from: mailOptions.from,
        to: mailOptions.to,
        subject: mailOptions.subject
      });
      
      // Verify transporter configuration before sending
      await transporter.verify();
      console.log('Transporter verification successful');
      
      const info = await transporter.sendMail(mailOptions);
      console.log('Email send result:', info);
      console.log('Verification email sent to:', email);
      console.log('Response:', info.response);
      console.log('Message ID:', info.messageId);
      
      res.status(200).json({ 
        message: 'Verification email has been sent. Please check your email.',
        success: true,
        messageId: info.messageId
      });
    } catch (emailError) {
      console.error('Error sending verification email:', emailError);
      res.status(500).json({ message: 'Failed to send verification email' });
    }
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Authentication middleware
const authMiddleware = (req, res, next) => {
  try {
    // Get authorization header
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'Authentication failed. No token provided.' });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Add user ID to request object
    req.userData = { userId: decoded.userId };
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Authentication failed. Invalid token.' });
  }
};

module.exports = { router, authMiddleware };
