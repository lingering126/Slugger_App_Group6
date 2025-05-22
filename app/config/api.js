// API Configuration
const API_CONFIG = {
  API_URL: 'https://slugger-app-group6.onrender.com/api',
  BASE_URL: 'https://slugger-app-group6.onrender.com',
  PORT: 5001,
  ENDPOINTS: {
    AUTH: {
      LOGIN: '/auth/login',
      REGISTER: '/auth/register',
      VERIFY_EMAIL: '/auth/verify-email',
      FORGOT_PASSWORD: '/auth/forgot-password',
      RESET_PASSWORD: '/auth/reset-password'
    },
    ACTIVITIES: {
      CREATE: '/activities',
      LIST: '/activities',
      UPDATE: '/activities/:id',
      DELETE: '/activities/:id',
      LIKE: '/activities/:id/like',
      COMMENT: '/activities/:id/comment',
      SHARE: '/activities/:id/share'
    },
    USER: {
      STATS: '/user',
      PROFILE: '/users/profile',
      UPDATE_PROFILE: '/users/profile',
      RESET_WEEKLY_STATS: '/user/reset-weekly'
    },
    POSTS: {
      CREATE: '/posts',
      LIST: '/posts',
      DETAIL: '/posts/:id',
      LIKE: '/posts/:id/like',
      COMMENT: '/posts/:id/comments',
      SHARE: '/posts/:id/share'
    },
    TEAMS: {
      CREATE: '/teams',
      LIST: '/teams',
      DETAIL: '/teams/:id',
      JOIN: '/teams/:id/join',
      LEAVE: '/teams/:id/leave',
      MEMBERS: '/teams/:id/members'
    }
  }
};

// Log this to help debug
console.log('API_CONFIG loaded from app/config/api.js', { 
  API_URL: API_CONFIG.API_URL,
  USER_STATS_ENDPOINT: API_CONFIG.ENDPOINTS.USER.STATS 
});

export { API_CONFIG };

// Add default export for Expo Router
export default function APIConfig() {
  return null; // This is just a placeholder to satisfy Expo Router's default export requirement
}
