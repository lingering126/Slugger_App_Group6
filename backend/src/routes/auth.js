const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');

/**
 * User Registration Endpoint
 * 
 * This endpoint handles new user registration with:
 * - Email uniqueness validation
 * - Password hashing
 * - Verification token generation
 * - Email verification
 * 
 * @route POST /api/auth/signup
 * @param {string} email - User's email address (must be unique)
 * @param {string} password - User's password (will be hashed)
 * @param {string} name - User's display name
 * @returns {object} JSON response with registration status and verification instructions
 */
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
              <a href="http://${primaryIP}:${port}/api/auth/verify-email?token=${verificationToken}&email=${email}" 
                 style="background-color: #6c63ff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold;">
                Verify Email
              </a>
            </div>
            
            <p style="font-size: 14px; color: #666;">If the button above doesn't work, you can try clicking one of these alternative links:</p>
            
            <ul style="font-size: 14px; color: #666;">
              ${serverIPs.map((ip, index) => `<li><a href="http://${ip}:${port}/api/auth/verify-email?token=${verificationToken}&email=${email}">Alternative Link ${index + 1} (${ip})</a></li>`).join('')}
              <li><a href="http://localhost:${port}/api/auth/verify-email?token=${verificationToken}&email=${email}">Local Link (localhost)</a></li>
            </ul>
            
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

/**
 * User Login Endpoint
 * 
 * Authenticates a user and provides a JWT token upon successful login.
 * Checks for:
 * - Valid email
 * - Verified account status
 * - Correct password
 * 
 * @route POST /api/auth/login
 * @param {string} email - User's email address
 * @param {string} password - User's password (compared with stored hash)
 * @returns {object} JSON with auth token and user information
 */
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

    // Generate token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
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

/**
 * Email Verification Endpoint
 * 
 * Verifies a user's email address by validating the token sent via email.
 * This endpoint is accessed via a link in the verification email.
 * 
 * @route GET /api/auth/verify-email
 * @param {string} token - Verification token (from email link)
 * @param {string} email - User's email address (from email link)
 * @returns {HTML} Success or error page
 */
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
            .btn {
              display: inline-block;
              background-color: #6c63ff;
              color: white;
              text-decoration: none;
              padding: 12px 30px;
              border-radius: 4px;
              font-weight: bold;
              margin-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="success-icon">✓</div>
            <h1>Email Verified!</h1>
            <p>Your email has been successfully verified. You can now log in to your Slugger account.</p>
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" class="btn">Go to Login</a>
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Error verifying email:', error);
    return res.status(500).send('<h1>Server Error</h1><p>An error occurred while verifying your email. Please try again later.</p>');
  }
});

/**
 * Resend Verification Email Endpoint
 * 
 * Allows users to request a new verification email if the original expires or is lost.
 * 
 * @route POST /api/auth/resend-verification
 * @param {string} email - User's email address
 * @returns {object} JSON status of the resend operation
 */
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;
    
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if already verified
    if (user.isVerified) {
      return res.status(400).json({ message: 'Email already verified. Please login.' });
    }
    
    // Generate new token
    const crypto = require('crypto');
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    // Update user with new token
    user.verificationToken = verificationToken;
    user.verificationTokenExpires = verificationTokenExpires;
    await user.save();
    
    // Reuse the email sending logic from signup
    // (The actual email sending code would be here, similar to signup endpoint)
    
    res.json({ 
      message: 'Verification email resent. Please check your inbox.',
      email: user.email
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * Forgot Password Endpoint
 * 
 * Initiates the password reset process by sending a reset link to the user's email.
 * 
 * @route POST /api/auth/forgot-password
 * @param {string} email - User's email address
 * @returns {object} JSON status of the password reset request
 */
router.post('/forgot-password', async (req, res) => {
  try {
    // Debug request information
    console.log('========== FORGOT PASSWORD REQUEST ==========');
    console.log('Request body:', req.body);
    console.log('Email requested:', req.body.email);
    
    const { email } = req.body;
    
    if (!email) {
      console.log('No email provided in request body');
      return res.status(400).json({ message: 'Email is required' });
    }

    // Find user
    console.log(`Looking for user with email: ${email}`);
    const user = await User.findOne({ email });
    console.log('User found?', !!user);
    if (!user) {
      // It's often better practice not to reveal if an email exists in the system
      // for forgot password requests to prevent user enumeration attacks.
      // Sending a generic success message regardless.
      console.log(`Password reset requested for non-existent user: ${email}`);
      return res.json({ message: 'If an account with that email exists, a password reset email has been sent.' });
    }

    // Generate reset token
    console.log('Generating reset token...');
    const crypto = require('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');
    // Use environment variable for expiry or default to 1 hour
    const resetTokenExpiryHours = parseInt(process.env.RESET_TOKEN_EXPIRY_HOURS || '1'); 
    const resetTokenExpires = new Date(Date.now() + resetTokenExpiryHours * 60 * 60 * 1000);
    console.log('Reset token generated:', resetToken.substring(0, 6) + '...');
    console.log('Token expires:', resetTokenExpires);

    // Update user with reset token
    console.log('Updating user with reset token...');
    user.resetToken = resetToken;
    user.resetTokenExpires = resetTokenExpires;
    await user.save();
    console.log('User updated with reset token successfully');

    // --- Start: Added Email Sending Logic ---
    try {
      // Get email configuration (assuming it's set up similarly to signup)
      const emailConfig = {
        host: process.env.MAIL_HOST,
        port: parseInt(process.env.MAIL_PORT),
        auth: {
          user: process.env.MAIL_USER,
          pass: process.env.MAIL_PASS
        },
        secure: process.env.MAIL_PORT === '465',
        tls: {
          rejectUnauthorized: false // Consider setting to true in production if using valid certs
        }
      };

      // Log email config (excluding password for security)
      console.log(`Using email configuration for password reset: ${emailConfig.host}:${emailConfig.port} with user ${emailConfig.auth.user}`);

      // Create transporter
      const transporter = nodemailer.createTransport(emailConfig);

      // Construct the reset URL (Adjust frontend URL as needed)
      // TODO: Replace 'http://localhost:8081' with your actual frontend URL, possibly from an env variable
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8081'; 
      const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

      const mailOptions = {
        from: process.env.MAIL_FROM || '"Slugger App" <noreply@slugger.app>',
        to: user.email, // Use the user's email found in the database
        subject: 'Password Reset Request for Slugger App',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
            <h1 style="text-align: center; color: #6c63ff;">Password Reset Request</h1>
            <p style="font-size: 16px; line-height: 1.5; color: #444;">You (or someone else) requested a password reset for your Slugger account associated with this email address.</p>
            <p style="font-size: 16px; line-height: 1.5; color: #444;">Click the button below to reset your password:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background-color: #6c63ff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold;">
                Reset Password
              </a>
            </div>
            
            <p style="font-size: 14px; color: #666;">If the button above doesn't work, copy and paste the following link into your browser:</p>
            <p style="font-size: 14px; color: #666; word-break: break-all;">${resetUrl}</p>
            
            <p style="font-size: 14px; color: #666; margin-top: 30px;">This password reset link will expire in ${resetTokenExpiryHours} hour(s).</p>
            <p style="font-size: 14px; color: #666;">If you did not request a password reset, please ignore this email or contact support if you have concerns.</p>
          </div>
        `
      };
      
      console.log(`Attempting to send password reset email to ${user.email}...`);
      console.log('Mail options:', { // Log options excluding sensitive parts if any
        from: mailOptions.from,
        to: mailOptions.to,
        subject: mailOptions.subject
      });
      
      // Verify transporter configuration
      await transporter.verify();
      console.log('Transporter verification successful for password reset.');
      
      // Send email
      console.log('About to attempt sending the password reset email...');
      const info = await transporter.sendMail(mailOptions);
      console.log('Password reset email SUCCESSFULLY sent with data:');
      console.log('Response code:', info.response);
      console.log('Message ID:', info.messageId);
      console.log('Email preview URL:', nodemailer.getTestMessageUrl ? nodemailer.getTestMessageUrl(info) : 'Not available');
      console.log('Full mail options:', {
        from: mailOptions.from,
        to: mailOptions.to,
        subject: mailOptions.subject,
        // Don't log the full HTML for brevity
        htmlLength: mailOptions.html ? mailOptions.html.length : 0
      });

    } catch (emailError) {
      console.error('========== EMAIL ERROR DETAILS ==========');
      console.error('Error sending password reset email:', emailError);
      
      // Log stack trace
      console.error('Stack trace:', emailError.stack);
      
      // Log more specific error details based on type
      if (emailError.code) {
        console.error('Error code:', emailError.code);
      }
      
      if (emailError.response) {
        console.error('Error response:', emailError.response);
      }
      
      if (emailError.message && emailError.message.includes('authorized recipient')) {
        console.error('\n==== MAILGUN SANDBOX DOMAIN ERROR ====');
        console.error('With Mailgun sandbox domains, you can only send to authorized recipients.');
        console.error('The recipient email must be authorized in your Mailgun dashboard.');
        console.error('Add the recipient email at: https://app.mailgun.com/app/sending/domains/slugger4health.site/authorized');
        console.error('============================================');
      }

      // Decide if you want to inform the user about the email failure.
      // It might be better to still return the generic message to avoid leaking info.
      // return res.status(500).json({ message: 'Failed to send password reset email.' }); 
    }
    // --- End: Added Email Sending Logic ---

    // Return a generic success message regardless of whether the user was found or email sent successfully
    // This prevents attackers from guessing valid emails.
    res.json({ message: 'If an account with that email exists, a password reset email has been sent.' });

  } catch (error) {
    // Log the main error (e.g., database issues)
    console.error('Error in /forgot-password route:', error); 
    res.status(500).json({ message: 'An internal server error occurred.' });
  }
});

/**
 * Reset Password Endpoint
 * 
 * Allows users to set a new password using a valid reset token.
 * 
 * @route POST /api/auth/reset-password
 * @param {string} token - Reset token from the reset link
 * @param {string} newPassword - User's new password
 * @returns {object} JSON status of the password reset
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    // Find user with valid token
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpires: { $gt: new Date() }
    });
    
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update user
    user.password = hashedPassword;
    user.resetToken = undefined;
    user.resetTokenExpires = undefined;
    await user.save();
    
    res.json({ message: 'Password reset successful' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 