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

- `app/`: Frontend React Native application (Expo)
  - `screens/`: Main application screens, including:
    - `(tabs)/`: Screens accessible via the main tab navigator.
    - Standalone screens.
    - `activity/[id].jsx`: Dynamic route for activity details.
  - `components/`: Reusable UI components.
  - `services/`: Application-level services (e.g., `api.js` for backend communication, `teamService.js`).
  - `config/`: Configuration files (e.g., `api.js` (likely base URL config), `ipConfig.ts`).
  - `constants/`: Application constants.
  - `navigation/`: Navigation-related setup (if not fully covered by Expo Router file-based routing).
  - `utils/`: Utility functions and helpers for the frontend.
  - `tests/`: Frontend tests.
  - `_layout.jsx`: Root layout for the app (Expo Router).
  - `index.jsx`: Entry point for the app (Expo Router).

- `backend/`: Node.js backend server (Express.js)
  - `controllers/`: Business logic for API endpoints.
  - `models/`: MongoDB data models/schemas.
  - `routes/`: API route definitions.
  - `middleware/`: Express middleware .
  - `utils/`: Utility functions for the backend.
  - `homepage/`: Seems to be a distinct module, possibly for homepage-specific features.
    - `controllers/`, `middleware/`, `models/`, `routes/`: Structure similar to the main backend.
  - `src/`: Another source directory, potentially for core logic or a different module structure.
    - `analytics/`, `middleware/`, `models/`, `routes/`: Structure similar to the main backend.
  - `tests/`: Backend tests, including unit and acceptance tests.
    - `acceptance/`: Acceptance tests for various features.
  - `server.js`: Main server setup and entry point.
  - `app.js`: Express application setup (often imported by `server.js`).
  - `.env`: Environment variables (not committed, an example should be provided).
  - `jest.config.js`: Jest test runner configuration.
  - `package.json`: Backend dependencies and scripts.

- `assets/`: Static assets for the app (images, icons, fonts).
- `lib/`: Potentially shared library code or older modules.
  - `components/`, `config/`, `services/`, `utils/`: Subdirectories suggesting a structured library.

- **Root Directory Files:**
  - `.gitignore`: Specifies intentionally untracked files that Git should ignore.
  - `App.js`: Potentially an older entry point or unused file with Expo's file-based routing.
  - `app.json`: Expo application configuration file (name, version, icon, splash screen, etc.).
  - `babel.config.js`: Babel transpiler configuration.
  - `deploy.sh`: Deployment script.
  - `index.js`: Often the main entry point for React Native projects (might be superseded by `app/index.jsx` with Expo Router).
  - `metro.config.js`: Metro bundler configuration for React Native.
  - `package.json`: Project dependencies and scripts for the frontend/root.
  - `package-lock.json`: Records exact versions of dependencies.
  - `README.md`: This file.
  - `render.yaml`: Configuration file for deployment on Render.com.
  - `start-backend.bat`: Windows batch file to start the backend server.
  - `tsconfig.json`: TypeScript configuration file (indicates TypeScript usage in parts of the project).

- `.expo/`: Directory generated by Expo for its internal workings (usually not modified directly).

## Setup Instructions

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or later)
- npm or yarn
- MongoDB (local or Atlas)
- Expo Go app installed on your mobile device for testing
- Mailgun account (for production email sending) or use Ethereal for testing

### Frontend Setup

1. Navigate to the project root directory (e.g., `cd Slugger_App_Group6` if you cloned the repository).

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the Expo development server:
   ```bash
   npm start
   # or for a clean start
   npx expo start --clear
   ```

4. Use the Expo Go app on your mobile device to scan the QR code displayed in the terminal. Alternatively, you can press:
   - 'a' to open the app in an Android emulator.
   - 'i' to open the app in an iOS simulator (macOS only).
   - 'w' to open the app in the web browser.

### Backend Setup

The Slugger backend is deployed on Render and is publicly accessible. The frontend application is configured by default to connect to this deployed backend, **so you typically do not need to set up or run the backend locally to use the app.**

**Important Note on Performance (Render Free Plan):**
Our current hosting on Render uses a free plan. This can lead to "cold starts" if the backend has been inactive. The first request (e.g., login) might take 50 seconds or more while the service instance spins up. You can simply wait for a while then refresh the page to try again. This issue can be referred to:https://github.com/lingering126/Slugger_App_Group6/issues/79.


## Running Tests

The project includes a suite of tests for the backend. To run these tests:

1.  Navigate to the backend directory:
    ```bash
    cd backend
    ```

2. Install dependencies:
   ```bash
   npm install
   ```

3.  Run the test script:
    ```bash
    npm test
    ```
    This will execute all Jest tests defined in the backend.

    Details can be referred to:

    https://github.com/lingering126/Slugger_App_Group6/blob/main/backend/tests/Unit_Test.md
   
    https://github.com/lingering126/Slugger_App_Group6/blob/main/backend/tests/acceptance/ACCEPTANCE_TESTS_README.md 

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

## Deployment to Render.com

### Backend Deployment

1. Create a free account at [Render.com](https://render.com)

2. Click on "New +" and select "Web Service"

3. Connect your GitHub repository or deploy from a public Git repository

4. Configure your service:
   - Name: slugger-backend
   - Root Directory: backend
   - Runtime: Node
   - Build Command: `npm install`
   - Start Command: `npm start`

5. Add the following environment variables:
   - MONGODB_URI: your MongoDB Atlas connection string
   - JWT_SECRET: a secure random string for JWT tokens
   - PORT: 5001
   - MAIL_HOST: your email host
   - MAIL_PORT: your email port
   - MAIL_USER: your email username
   - MAIL_PASS: your email password
   - MAIL_FROM: the email address used as sender

6. Click "Create Web Service"

Your backend will be deployed to a URL like: https://slugger-app-group6.onrender.com

### Frontend Updates for Deployment

The frontend React Native app must be configured to use the deployed backend URL. The default configuration now points to the Render.com deployment URL.

If you need to use a different URL, you can update it in `app/services/api.js` or use the server settings in the app to configure a custom server URL.

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

**Optional Local Backend Setup**

If you intend to develop or test the backend locally, follow these steps:

1. Navigate to the backend directory:
   ```
   cd Slugger_App_Group6/backend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the `backend` directory. You can copy `backend/.env.example` (if available) or create it manually.
   Populate it with your local MongoDB connection string, a JWT secret, desired port, and email service credentials (e.g., Ethereal for testing). Example:
   ```ini
   MONGODB_URI=your_local_mongodb_connection_string
   JWT_SECRET=a_strong_secret_for_local_dev
   PORT=5001
   MAIL_HOST=smtp.ethereal.email
   MAIL_PORT=587
   MAIL_USER=your_ethereal_username
   MAIL_PASS=your_ethereal_password
   MAIL_FROM="Your App Name" <noreply@example.com>
   ```


4. Start the local backend server:
   ```
   npm run dev
   # or
   node server.js
   # On Windows, you can also use the batch file from the project root:
   # ..\start-backend.bat (ensure it points to the correct backend directory and command)
   ```

