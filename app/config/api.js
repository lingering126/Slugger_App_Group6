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
    TEAMS: {
      LIST: '/teams',
      ALL: '/teams/all',
      CREATE: '/teams',
      JOIN: '/teams/join',
      JOIN_BY_ID: '/teams/join-by-id',
      LEAVE: '/teams/leave',
      DETAILS: '/teams/:id',
      UPDATE: '/teams/:id',
      UPDATE_TARGETS: '/teams/:id/targets',
      UPDATE_WEEKLY_LIMITS: '/teams/:id/weekly-limits',
      UPDATE_TARGET_GOAL: '/teams/:id/update-target-goal',
      DELETE: '/teams/:id'
    }
  }
};

export default API_CONFIG;