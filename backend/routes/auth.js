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

// Signup route (renamed from /register and added email verification)
router.post('/signup', async (req, res, next) => {
  try {
    const { name, password, email } = req.body; // Changed username to name to match frontend

    // Validate input: ensure name is not empty or just whitespace
    if (!name || name.trim() === '') {
      throw new AppError('Name is required and cannot be empty.', 400);
    }
    if (!email || !password) { // Existing check for email/password
        throw new AppError('Email and password are required', 400);
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      // If user exists but is not verified, allow signup to proceed to resend verification
      if (!existingUser.isVerified) {
        // Trigger resend logic or inform frontend to switch to "needs verification" state
        // For now, we'll let the frontend handle this based on a specific status/message
        // Or, we can directly call the send verification logic here for an existing unverified user.
        // Let's send a new verification email.
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationTokenExpires = Date.now() + 24 * 3600000; // 24 hours

        existingUser.verificationToken = verificationToken;
        existingUser.verificationTokenExpires = verificationTokenExpires;
        await existingUser.save();

        // Send verification email (logic adapted from /resend-verification)
        let emailSent = false;
        let testModeData = {};
        try {
          if (process.env.MAIL_HOST && process.env.MAIL_PORT && process.env.MAIL_USER && process.env.MAIL_PASS) {
            const transporter = nodemailer.createTransport({
              host: process.env.MAIL_HOST,
              port: process.env.MAIL_PORT,
              secure: false,
              auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS },
            });
            const appUrl = process.env.FRONTEND_URL || 'http://localhost:8081';
            const verificationUrl = `${appUrl}/verify-email?token=${verificationToken}`;
            const mailOptions = {
              from: process.env.MAIL_FROM || 'noreply@slugger4health.site',
              to: existingUser.email,
              subject: 'Welcome to Slugger! Please Verify Your Email',
              html: `
                <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
                  <h1 style="font-size: 24px; color: #6c63ff; text-align: center;">Welcome to Slugger!</h1>
                  <p>You recently attempted to sign up, or someone tried to use your email. We've sent a new verification link.</p>
                  <p>Please verify your email address by clicking the button below:</p>
                  <div style="text-align: center; margin: 20px 0;">
                    <a href="${verificationUrl}" style="background-color: #6c63ff; color: white; padding: 12px 25px; text-decoration: none; border-radius: 25px; font-size: 16px; display: inline-block;">Verify Email</a>
                  </div>
                  <p>If the button above doesn't work, you can try clicking this alternative link:</p>
                  <p style="text-align: center;"><a href="${verificationUrl}" style="color: #6c63ff;">${verificationUrl}</a></p>
                  <p style="font-size: 0.9em; color: #777;">This link will expire in 24 hours.</p>
                  <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                  <p style="font-size: 0.8em; color: #aaa;">If you did not attempt to sign up, please ignore this email.</p>
                </div>
              `,
            };
            if (process.env.MAILGUN_TEST_MODE === 'true') {
              testModeData = { testMode: true, previewUrl: verificationUrl };
              emailSent = true;
            } else {
              await transporter.sendMail(mailOptions);
              emailSent = true;
            }
          }
        } catch (emailError) {
          console.error('Failed to send verification email during signup for existing unverified user:', emailError);
        }
        // Inform frontend that user exists and needs verification
        return res.status(409).json({ 
          message: 'Email already registered but not verified. A new verification email has been sent.',
          requiresVerification: true, // Signal to frontend
          email: existingUser.email,
          ...(emailSent && testModeData) 
        });
      }
      // If user exists and is verified
      throw new AppError('Email already registered and verified.', 409); // Changed status to 409 for conflict
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpires = Date.now() + 24 * 3600000; // 24 hours

    // Create new user
    const newUser = new User({
      name, // Use name from request body
      username: name, // Also use name for username as it's required
      password: hashedPassword,
      email,
      isVerified: false,
      verificationToken,
      verificationTokenExpires
    });

    await newUser.save();

    // Send verification email (logic adapted from /resend-verification)
    let emailSent = false;
    let testModeDataForNewUser = {};
    try {
      if (process.env.MAIL_HOST && process.env.MAIL_PORT && process.env.MAIL_USER && process.env.MAIL_PASS) {
        const transporter = nodemailer.createTransport({
          host: process.env.MAIL_HOST,
          port: process.env.MAIL_PORT,
          secure: false, 
          auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS },
        });
        const appUrl = process.env.FRONTEND_URL || 'http://localhost:8081';
        const verificationUrl = `${appUrl}/verify-email?token=${verificationToken}`;
        console.log('New user verification URL:', verificationUrl);
        const mailOptions = {
          from: process.env.MAIL_FROM || 'noreply@slugger4health.site',
          to: newUser.email,
          subject: 'Welcome to Slugger! Please Verify Your Email',
          html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
              <h1 style="font-size: 24px; color: #6c63ff; text-align: center;">Welcome to Slugger!</h1>
              <p>Thank you for signing up. Please verify your email address by clicking the button below:</p>
              <div style="text-align: center; margin: 20px 0;">
                <a href="${verificationUrl}" style="background-color: #6c63ff; color: white; padding: 12px 25px; text-decoration: none; border-radius: 25px; font-size: 16px; display: inline-block;">Verify Email</a>
              </div>
              <p>If the button above doesn't work, you can try clicking this alternative link:</p>
              <p style="text-align: center;"><a href="${verificationUrl}" style="color: #6c63ff;">${verificationUrl}</a></p>
              <p style="font-size: 0.9em; color: #777;">This link will expire in 24 hours.</p>
              <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
              <p style="font-size: 0.8em; color: #aaa;">If you did not sign up for Slugger, please ignore this email.</p>
            </div>
          `,
        };
        if (process.env.MAILGUN_TEST_MODE === 'true') {
          console.log(`MAILGUN_TEST_MODE active. Email to ${newUser.email} with token ${verificationToken} would be sent.`);
          console.log(`Preview URL (simulated for Mailgun sandbox): ${verificationUrl}`);
          testModeDataForNewUser = { testMode: true, previewUrl: verificationUrl };
          emailSent = true;
        } else {
          await transporter.sendMail(mailOptions);
          console.log('Verification email sent successfully to new user:', newUser.email);
          emailSent = true;
        }
      } else {
        console.warn('Email configuration missing for new user signup. Required: MAIL_HOST, MAIL_PORT, MAIL_USER, MAIL_PASS');
      }
    } catch (emailError) {
      console.error('Failed to send verification email for new user:', emailError);
      // Don't let email failure stop the signup, but log it.
      // The user can use "resend verification" later.
    }

    // Create token for immediate login if desired, though user is not verified yet.
    // Typically, you might not issue a JWT until verification, or issue one with limited scope.
    // For now, let's return a message indicating verification is needed.
    
    res.status(201).json({
      message: 'Signup successful. Please check your email to verify your account.',
      user: { // Send back minimal user info, not a token until verified
        id: newUser._id,
        name: newUser.name,
        email: newUser.email
      },
      ...(emailSent && testModeDataForNewUser) // Include testMode and previewUrl if applicable
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
    const apiUrl = process.env.APP_PUBLIC_URL || 'http://localhost:3000';
    
    // Use the direct web-based reset page on the server
    const resetUrl = `${apiUrl}/reset-password?token=${resetToken}`;
    
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
    
    // Send verification email
    let emailSent = false;
    let testModeData = {};

    try {
      if (process.env.MAIL_HOST && process.env.MAIL_PORT && process.env.MAIL_USER && process.env.MAIL_PASS) {
        const transporter = nodemailer.createTransport({
          host: process.env.MAIL_HOST,
          port: process.env.MAIL_PORT,
          secure: false, // true for 465, false for other ports
          auth: {
            user: process.env.MAIL_USER,
            pass: process.env.MAIL_PASS,
          },
        });

        const appUrl = process.env.FRONTEND_URL || 'http://localhost:8081'; // Fallback to common Expo Go URL
        const verificationUrl = `${appUrl}/verify-email?token=${verificationToken}`;
        
        console.log('Verification URL:', verificationUrl);

        const mailOptions = {
          from: process.env.MAIL_FROM || 'noreply@slugger4health.site',
          to: user.email,
          subject: 'Welcome to Slugger! Please Verify Your Email',
          html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
              <h1 style="font-size: 24px; color: #6c63ff; text-align: center;">Welcome to Slugger!</h1>
              <p>Thank you for signing up. Please verify your email address by clicking the button below:</p>
              <div style="text-align: center; margin: 20px 0;">
                <a href="${verificationUrl}" style="background-color: #6c63ff; color: white; padding: 12px 25px; text-decoration: none; border-radius: 25px; font-size: 16px; display: inline-block;">Verify Email</a>
              </div>
              <p>If the button above doesn't work, you can try clicking this alternative link:</p>
              <p style="text-align: center;"><a href="${verificationUrl}" style="color: #6c63ff;">${verificationUrl}</a></p>
              <p style="font-size: 0.9em; color: #777;">This link will expire in 24 hours.</p>
              <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
              <p style="font-size: 0.8em; color: #aaa;">If you did not sign up for Slugger, please ignore this email.</p>
            </div>
          `,
        };

        // Special handling for Mailgun test mode (e.g., sandbox domains)
        if (process.env.MAILGUN_TEST_MODE === 'true') {
          // In Mailgun test mode, emails are not actually sent but can be retrieved via API
          // or seen in the Mailgun dashboard. We'll simulate this by providing a preview URL.
          // This requires Mailgun's `nodemailer-mailgun-transport` or similar for actual preview URLs.
          // For now, we'll just indicate test mode.
          console.log(`MAILGUN_TEST_MODE active. Email to ${user.email} with token ${verificationToken} would be sent.`);
          console.log(`Preview URL (simulated for Mailgun sandbox): ${verificationUrl}`);
          // For the frontend to display a message about checking logs or a preview URL
          testModeData = { 
            testMode: true, 
            previewUrl: verificationUrl // Send the actual link for testing
          };
          emailSent = true; // Mark as sent for logic flow, even if only logged
        } else {
          await transporter.sendMail(mailOptions);
          console.log('Verification email sent successfully to:', user.email);
          emailSent = true;
        }
      } else {
        console.warn('Email configuration missing for resend-verification. Required: MAIL_HOST, MAIL_PORT, MAIL_USER, MAIL_PASS');
      }
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // If Mailgun sandbox domain and recipient not authorized
      if (emailError.responseCode === 550 && emailError.message.includes('Sandbox subdomains are for test purposes only')) {
        // This specific error indicates the recipient email is not on Mailgun's authorized list for the sandbox.
        return res.status(400).json({ 
          message: 'Failed to send email. The recipient is not authorized for this sandbox domain.',
          error: 'unauthorized_recipient' // Custom error code for frontend to handle
        });
      }
      // Don't throw, let the response below handle it
    }

    if (emailSent) {
      res.status(200).json({
        message: 'Verification email sent',
        ...testModeData // Include testMode and previewUrl if applicable
      });
    } else {
      // If email config is missing or another non-Mailgun specific error occurred
      res.status(500).json({
        message: 'Verification email could not be sent due to a server error or missing email configuration. For testing, token: ' + verificationToken,
        verificationToken: verificationToken, // Only for non-production
        verificationUrl: `${process.env.FRONTEND_URL || 'http://localhost:8081'}/verify-email?token=${verificationToken}`
      });
    }
  } catch (error) {
    next(error);
  }
});

// Export router and middleware separately
module.exports.router = router;
module.exports.authMiddleware = authMiddleware;
