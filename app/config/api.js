// API Configuration
const API_CONFIG = {
  API_URL: 'https://slugger-app-group6.onrender.com/api',
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
      STATS: '/stats/user',
      PROFILE: '/users/profile',
      UPDATE_PROFILE: '/users/profile'
    }
  }
};

export default API_CONFIG; 