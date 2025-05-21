/**
 * This script sets up email configuration for testing the password reset functionality.
 * 
 * IMPORTANT: This is for development/testing purposes only.
 * In production, use proper environment variables or a secure configuration method.
 * 
 * To use this script:
 * 1. Replace the placeholder values with your actual Gmail credentials
 * 2. Run the script: node set-email-config.js
 * 3. Test the forgot password feature
 */

const fs = require('fs');
const path = require('path');

// Email configuration - REPLACE THESE WITH YOUR ACTUAL GMAIL CREDENTIALS
const EMAIL_USER = 'your.email@gmail.com';  // Your Gmail address
const EMAIL_PASS = 'your-app-password';     // Your Gmail app password (not your regular password)

// For Gmail, you need to create an "App Password":
// 1. Enable 2-Step Verification on your Google account
// 2. Go to https://myaccount.google.com/apppasswords
// 3. Generate a new app password for "Mail" and "Other (Custom name)"
// 4. Use that password here

// Create .env file with email configuration
const envFilePath = path.join(__dirname, '.env');
const envContent = `
# Existing environment variables will be preserved

# Email configuration for password reset
EMAIL_USER=${EMAIL_USER}
EMAIL_PASS=${EMAIL_PASS}

# Add this to specify your frontend URL (for reset links)
FRONTEND_URL=http://localhost:19006
`;

// Check if .env file exists and append the email config
if (fs.existsSync(envFilePath)) {
  console.log('.env file exists. Appending email configuration...');
  
  // Read existing .env content
  const existingContent = fs.readFileSync(envFilePath, 'utf8');
  
  // Check if EMAIL_USER is already defined
  if (existingContent.includes('EMAIL_USER=')) {
    console.log('Email configuration already exists in .env file.');
    console.log('To update it, edit the .env file directly or delete those lines and run this script again.');
  } else {
    // Append email config to existing .env file
    fs.appendFileSync(envFilePath, envContent);
    console.log('Email configuration added to .env file successfully!');
  }
} else {
  // Create new .env file with email config
  fs.writeFileSync(envFilePath, envContent.trim());
  console.log('.env file created with email configuration!');
}

console.log('\nIMPORTANT:');
console.log('1. Replace the placeholder values in .env with your actual Gmail credentials');
console.log('2. For Gmail, use an App Password, not your regular password');
console.log('3. Restart your server after making these changes');
console.log('\nTo test:');
console.log('1. Try the forgot password feature in your app');
console.log('2. Check your server logs to see the reset password URL if email sending is not configured');

console.log('\nDone!'); 