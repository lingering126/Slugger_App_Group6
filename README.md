# Slugger App

## Why do we develop Slugger?
In today's fast-paced world, maintaining a healthy lifestyle—both physically and mentally—can be quite challenging. While accountability and community support help sustain positive habits, existing digital solutions lack the structure and engagement needed to make goal-setting truly effective. Take Samsung Health as an example, it does have community and group challenges, but the goal can only be a number of steps people walked, which is not diverse enough.

Currently, our client Ian and his friends use a **WhatsApp group chat** to set and track weekly fitness and mental wellness goals. They set a group goal weekly, and everyone can contribute to the goal by logging in the activities they did today (by sending a message in the group chat, each activity gets a point). Any group who fails to reach their group goal would have forfeits, like 500 push-ups.

They use this way to encourage every group member to be active every day. However, this approach has some downsides, it's:
- **Messy and unstructured** – Scrolling through chat messages makes it hard to track progress.
- **Difficult to analyze** – No clear way to measure contributions or visualize progress.
- **Lacks motivation** – No gamification elements to keep users engaged.

To solve these pain points, Ian envisions **Slugger**: an engaging lifestyle app that provides a centralized, gamified, and data-driven platform for individuals and teams to set, track, and complete weekly wellness challenges.

## What is Slugger
Slugger is a lifestyle mobile application designed to improve physical and mental health by fostering community engagement and shared accountability. It allows users to set weekly personal and group targets across physical health (e.g., running, yoga), mental wellness (e.g., meditation,writing journals), and long-term aspirations. The app tracks progress, incorporates gamified motivation, rewards contributions and forfeits to build lasting, positive habits. 

Unlike the current WhatsApp-based system, Slugger offers a structured, visually appealing, and engaging platform to replace the unstructured group chat method. 

**Key benefits:**

- **Custom Goals:** Users set and track personalized physical, mental, and long-term goals.
- **Team Collaboration:** Groups work together toward shared targets, reinforcing accountability.
- **Rewards & Forfeits to keep users engaged:** By logging in activities, users can earn points, unlock achievements and take fun challenges. However, if they fail to reach their goal, there will be some punishments.
- **Data-Driven Insights:** Visual progress tracking for motivation and analysis.
- **User-friendly interface:** Users can log activities seamlessly with a single button click and instantly see their contributions and team progress in a clear, organized display.

## Project Structure

- `app/`: Frontend React Native application
  - `screens/`: All application screens
    - `(tabs)/`: Main app screens using tab navigation
    - `login.jsx`: Login screen
    - `signup.jsx`: Signup screen
    - `verify-email.jsx`: Email verification screen
    - `server-settings.jsx`: Server configuration settings
    - `connection-test.jsx`: Connection testing utility
  - `components/`: Reusable UI components
  - `services/`: Application services including initialization
  - `utils.js`: Utility functions for networking, server discovery, etc.
  - `_layout.jsx`: App layout configuration

- `backend/`: Node.js backend server
  - `models/`: MongoDB data models
  - `routes/`: API routes handlers
  - `middleware/`: Express middleware functions
  - `utils/`: Utility functions for the backend
  - `server.js`: Main server file with API endpoints and configurations
  - `.env`: Environment variables (connection strings, ports, etc.)

- `assets/`: App images, icons, and other static assets
- `lib/`: Library files and shared code
- `.expo/`: Expo configuration files
- `babel.config.js`: Babel transpiler configuration
- `metro.config.js`: Metro bundler configuration
- `app.json`: Expo application configuration
- `start-backend.bat`: Windows batch file to start the backend server

## Setup Instructions

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or later)
- npm or yarn
- MongoDB (local or Atlas)
- Expo Go app installed on your mobile device for testing
- Mailgun account (for production email sending) or use Ethereal for testing

### Frontend Setup

1. Install dependencies:
   ```
   cd Slugger_App_Group6
   npm install
   ```

2. Install additional required packages:
   ```
   npm install expo-clipboard
   ```

3. Start the Expo development server:
   ```
   npm start
   # or 
   npx expo start --clear
   ```

3. Use the Expo Go app on your mobile device to scan the QR code, or press 'a' to open in an **Android** emulator or 'i' for **iOS** simulator.

### Backend Setup

1. Navigate to the backend directory:
   ```
   cd Slugger_App_Group6/backend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file based on `.env.example` or modify the existing `.env` file:
   ```
   # If you need to create a new .env file:
   cp .env.example .env
   ```

4. Update the `.env` file with your MongoDB connection string, JWT secret, email configuration, and port settings:
   ```
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   PORT=5001
   MAIL_HOST=your_email_host
   MAIL_PORT=your_email_port
   MAIL_USER=your_email_user
   MAIL_PASS=your_email_password
   MAIL_FROM=your_sender_email
   ```

5. Start the backend server:
   ```
   npm run dev
   # or
   node server.js
   # or on Windows, you can use
   ..\start-backend.bat
   ```

## Authentication Flow

1. **Signup**: Users register with email and password
2. **Email Verification**: A verification link is sent to the user's email
3. **Login**: After verification, users can log in with their credentials
4. **Session Management**: Authentication tokens stored in AsyncStorage

## API Endpoints

### Authentication
- `POST /api/auth/signup`: Register a new user
- `GET /api/auth/verify-email`: Verify user's email via token
- `POST /api/auth/login`: Authenticate user and receive token
- `POST /api/auth/resend-verification`: Resend verification email

### Server Status
- `GET /health`: Check server health and get server information
- `GET /ping`: Lightweight connectivity test (returns "PONG")
- `GET /discover`: Server discovery endpoint for network scanning
- `GET /ip`: Get server and client IP information

### Testing
- `GET /api/test`: Test API connectivity and get request info
- `POST /api/test/email`: Test email configuration

## Development Notes

- **Frontend Framework**: React Native with Expo
- **Navigation**: The app uses Expo Router for navigation with tab-based structure
- **State Management**: AsyncStorage for persistent storage and authentication
- **Server Discovery**: Network scanning capabilities to find the server on local network
- **Backend**: Express.js server with MongoDB for data storage
- **Authentication**: JWT-based with email verification
- **Security**: Passwords are hashed using bcrypt, all endpoints use proper validation
- **Email**: Nodemailer for sending verification emails
- **Networking**: Custom networking layer with automatic server discovery
- **Environment**: Configuration via .env files on backend


