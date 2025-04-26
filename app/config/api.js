// API Configuration
const API_CONFIG = {
  API_URL: 'http://localhost:5001/api',
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
    },
    USER_TARGET: {
      GET: '/user-targets',
      CREATE: '/user-targets',
      UPDATE: '/user-targets'
    }
  }
};

export default API_CONFIG;