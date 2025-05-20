const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../src/models/user');
const { AppError } = require('../middleware/errorHandler');
const authMiddleware = require('../middleware/auth');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Temporary user storage (replace with database in production)
const users = [
  {
    id: '1',
    email: 'test@example.com',
    password: 'test123',
    name: 'Test User'
  }
];

// Login route
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      throw new AppError('Email and password are required', 400);
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    // Check if user is verified
    if (!user.isVerified) {
      throw new AppError('Please verify your email before logging in', 403);
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new AppError('Invalid email or password', 401);
    }

    // Create token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'fallback_secret_key',
      { expiresIn: '7d' }
    );

    // Send response
    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        avatar: user.avatar
      }
    });
  } catch (error) {
    next(error);
  }
});

// Register route
router.post('/register', async (req, res, next) => {
  try {
    const { username, password, email } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new AppError('Email already registered', 400);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = new User({
      username,
      password: hashedPassword,
      email,
      name: username,
      isVerified: false
    });

    await newUser.save();

    // Create token
    const token = jwt.sign(
      { userId: newUser._id, username: newUser.name },
      process.env.JWT_SECRET || 'fallback_secret_key',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      token,
      user: {
        id: newUser._id,
        username: newUser.name,
        email: newUser.email
      }
    });
  } catch (error) {
    next(error);
  }
});

// Forgot password route - send password reset email
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body;

    // Validate input
    if (!email) {
      throw new AppError('Email is required', 400);
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      // For security reasons, don't reveal that the email doesn't exist
      return res.status(200).json({
        message: 'If your email is registered, you will receive a password reset link'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = Date.now() + 3600000; // 1 hour from now

    // Update user with reset token
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetTokenExpires;
    await user.save();

    // Create reset URL - use FRONTEND_URL from environment variables
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:19006';
    const resetUrl = `${frontendUrl}/screens/reset-password?token=${resetToken}`;

    // Debug - console log the URL
    console.log('Password reset URL:', resetUrl);

    // Try to send email but don't fail if email configuration is missing
    let emailSent = false;
    try {
      // Check if Mailgun configuration exists
      if (process.env.MAIL_HOST && process.env.MAIL_PORT && 
          process.env.MAIL_USER && process.env.MAIL_PASS) {
        
        console.log('Email configuration found, attempting to send email...');
        
        const transporter = nodemailer.createTransport({
          host: process.env.MAIL_HOST,         // smtp.mailgun.org
          port: process.env.MAIL_PORT,         // 587
          secure: false,                       // true for 465, false for other ports
          auth: {
            user: process.env.MAIL_USER,       // postmaster@slugger4health.site
            pass: process.env.MAIL_PASS        // your Mailgun SMTP password
          }
        });

        const mailOptions = {
          from: process.env.MAIL_FROM || 'noreply@slugger4health.site',
          to: user.email,
          subject: 'Password Reset Request',
          html: `
            <p>You requested a password reset</p>
            <p>Click <a href="${resetUrl}">here</a> to reset your password</p>
            <p>This link will expire in 1 hour</p>
          `
        };

        await transporter.sendMail(mailOptions);
        console.log('Password reset email sent successfully to:', user.email);
        emailSent = true;
      } else {
        console.warn('Email configuration missing. Required environment variables: MAIL_HOST, MAIL_PORT, MAIL_USER, MAIL_PASS');
      }
    } catch (emailError) {
      console.error('Failed to send reset email:', emailError);
      // We won't throw here - we'll handle this below
    }

    // Send appropriate response
    if (emailSent) {
      res.status(200).json({
        message: 'Password reset email sent'
      });
    } else {
      // For development/testing, return the token directly if email wasn't sent
      res.status(200).json({
        message: 'Password reset initiated. For testing purposes, use this token: ' + resetToken,
        resetToken: resetToken, // Only include in non-production environments
        resetUrl: resetUrl
      });
    }
  } catch (error) {
    next(error);
  }
});

// Reset password route - verify token and update password
router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, password } = req.body;

    // Validate input
    if (!token || !password) {
      throw new AppError('Token and password are required', 400);
    }

    // Find user with valid reset token
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      throw new AppError('Invalid or expired reset token', 400);
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user password and clear reset token
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    // Return success message
    res.status(200).json({
      message: 'Password reset successful. You can now log in with your new password.'
    });
  } catch (error) {
    next(error);
  }
});

// Verify token from email
router.get('/verify-email', async (req, res, next) => {
  try {
    const { token } = req.query;
    
    if (!token) {
      throw new AppError('Verification token is required', 400);
    }
    
    // Find user with this verification token
    const user = await User.findOne({ 
      verificationToken: token,
      verificationTokenExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      throw new AppError('Invalid or expired verification token', 400);
    }
    
    // Update user status
    user.isVerified = true;
    user.verificationToken = null;
    user.verificationTokenExpires = null;
    await user.save();
    
    res.status(200).json({
      message: 'Email verification successful'
    });
  } catch (error) {
    next(error);
  }
});

// Resend verification email
router.post('/resend-verification', async (req, res, next) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      throw new AppError('Email is required', 400);
    }
    
    const user = await User.findOne({ email });
    
    if (!user) {
      throw new AppError('User not found', 404);
    }
    
    if (user.isVerified) {
      return res.status(200).json({
        message: 'Email is already verified'
      });
    }
    
    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpires = Date.now() + 24 * 3600000; // 24 hours
    
    // Update user with new verification token
    user.verificationToken = verificationToken;
    user.verificationTokenExpires = verificationTokenExpires;
    await user.save();
    
    // TODO: Send verification email
    
    res.status(200).json({
      message: 'Verification email sent'
    });
  } catch (error) {
    next(error);
  }
});

// Export router and middleware separately
module.exports.router = router;
module.exports.authMiddleware = authMiddleware; 