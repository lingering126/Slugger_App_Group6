# Slugger App

A mobile application built with React Native and Expo.

## Project Structure

- `app/`: Frontend React Native application
  - `screens/`: All application screens
    - `(tabs)/`: Main app screens using tab navigation
    - `login.jsx`: Login screen
    - `signup.jsx`: Signup screen
  - `components/`: Reusable UI components

- `backend/`: Node.js backend server
  - `models/`: MongoDB models
  - `routes/`: API routes
  - `server.js`: Main server file

## Setup Instructions

### Prerequisites

- Node.js (v14 or later)
- npm or yarn
- MongoDB (local or Atlas)
- Expo CLI (`npm install -g expo-cli`)

### Frontend Setup

1. Install dependencies:
   ```
   cd Slugger_App_Group6
   npm install
   ```

2. Start the Expo development server:
   ```
   npm start
   ```

3. Use the Expo Go app on your mobile device to scan the QR code, or press 'a' to open in an Android emulator or 'i' for iOS simulator.

### Backend Setup

1. Navigate to the backend directory:
   ```
   cd Slugger_App_Group6/backend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file based on `.env.example`:
   ```
   cp .env.example .env
   ```

4. Update the `.env` file with your MongoDB connection string, JWT secret, and email configuration.

5. Start the backend server:
   ```
   npm run dev
   ```

## Authentication Flow

1. **Signup**: Users register with email and password
2. **Email Verification**: A verification link is sent to the user's email
3. **Login**: After verification, users can log in with their credentials
4. **Password Reset**: Users can request a password reset if forgotten

## API Endpoints

- `POST /api/auth/signup`: Register a new user
- `GET /api/auth/verify-email`: Verify user's email
- `POST /api/auth/login`: Authenticate user
- `POST /api/auth/forgot-password`: Request password reset
- `POST /api/auth/reset-password`: Reset password with token

## Development Notes

- The frontend uses Expo Router for navigation
- Authentication state is managed with AsyncStorage
- The backend uses MongoDB for data storage
- Passwords are hashed using bcrypt
- JWT is used for authentication tokens

## Project Description:
**To improve the mental and physical health, as well as the overall happiness, by creating inclusive, purpose-driven communities where individuals can contribute meaningfully, regardless of their circumstances or background (S1)**
Slugger is a lifestyle app designed to enhance physical and mental health while fostering a sense of community and shared accountability. Through setting weekly personal and group targets, tracking progress, and incorporating peer responsibility, Slugger helps users build lasting, positive habits for a balanced and fulfilling life.
Key Features:

1. Customised Goals: Users define weekly personal targets across three domains: physical health (e.g., running, yoga, or rehabilitation), mental wellness (e.g., journaling, meditation, learning a skill), and long-term aspirations.
2. Community and Peer Responsibility: Join or create communities that work together toward combined weekly targets. Success is celebrated with group-designed positive reinforcements, while unmet goals lead to fun, motivational challenges that reinforce shared responsibility.
3. Activity Tracking with Rewards: Earn points for physical and mental activities, with bonus points awarded for contributing to community goals, family involvement, personal bests, and progress toward long-term objectives.
4. Holistic Approach to Wellness: Encourage a well-rounded lifestyle by integrating physical, mental, and social dimensions into a cohesive tracking system that reflects your growth in every area.
5. Gamified Motivation: Community-designed incentives and playful consequences keep progress engaging and foster a supportive network where everyone is accountable for one another's success.

## Flow Chart
![image](https://github.com/user-attachments/assets/316bcd5e-0195-4650-91d4-9f7e2c8b5d7a)

## How to run

This project was bootstrapped with [Expo](https://expo.dev/).

## 🚀 Getting Started

### Install dependencies:
Navigate to the project root directory and install dependencies:

```bash
npm install
# or
yarn install
# or
pnpm install
```

### Start the Development Server

```bash
npx expo start --clear
```

### Run on a Device or Emulator

- **Android:** Press `a` in the terminal to open on an Android emulator.
- **iOS:** Press `i` to open in an iOS simulator (macOS only).
- **Web:** Press `w` to open in a web browser.
