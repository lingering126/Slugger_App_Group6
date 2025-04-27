import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_CONFIG from '../config/api';

// 获取认证token
const getAuthToken = async () => {
  try {
    const token = await AsyncStorage.getItem('token');
    return token;
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

// 创建axios实例
const api = axios.create({
  baseURL: API_CONFIG.API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 添加请求拦截器
api.interceptors.request.use(
  async (config) => {
    const token = await getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

<<<<<<< Updated upstream
const teamService = {
  async getAllTeams() {
    try {
      const response = await api.get('/teams');
      console.log('Teams response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching teams:', error.response?.data || error.message);
      throw error;
    }
  },

  async createTeam(teamData) {
    try {
      const response = await api.post('/teams', teamData);
      return response.data;
    } catch (error) {
      console.error('Error creating team:', error);
      if (error.response) {
        // 如果有响应，显示服务器返回的错误信息
        throw new Error(error.response.data.message || 'Failed to create team');
      }
=======
// Helper function to get the API base URL
const getApiBaseUrl = () => {
  return global.workingApiUrl || API_CONFIG.API_URL;
};

const teamService = {
  /**
   * Create a new team
   * @param {Object} teamData - Team data (name, description, targetName, weeklyLimitPhysical, weeklyLimitMental)
   * @returns {Promise} - Promise that resolves to the created team
   */
  async createTeam(teamData) {
    try {
      const apiUrl = getApiBaseUrl();
      const response = await axios({
        method: 'POST',
        url: `${apiUrl}${API_CONFIG.ENDPOINTS.TEAMS.CREATE}`,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getAuthToken()}`
        },
        data: teamData
      });
      return response.data;
    } catch (error) {
      console.error('Error creating team:', error.response?.data || error.message);
>>>>>>> Stashed changes
      throw error;
    }
  },

  /**
   * Get all teams the current user is a member of
   * @returns {Promise} - Promise that resolves to an array of teams
   */
  async getMyTeams() {
    try {
      const apiUrl = getApiBaseUrl();
      const response = await axios({
        method: 'GET',
        url: `${apiUrl}${API_CONFIG.ENDPOINTS.TEAMS.LIST}`,
        headers: {
          'Authorization': `Bearer ${await getAuthToken()}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching user teams:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Get all teams (admin function)
   * @returns {Promise} - Promise that resolves to an array of all teams
   */
  async getAllTeams() {
    try {
      const apiUrl = getApiBaseUrl();
      console.log('API URL for getAllTeams:', apiUrl);
      
      // 尝试获取token，并记录token状态
      const token = await getAuthToken();
      console.log('Token available:', !!token);
      
      // 使用更详细的日志
      console.log('Fetching all teams...');
      
      try {
        // 尝试路径1: /teams/all
        console.log('Trying endpoint: /teams/all');
        const response = await axios({
          method: 'GET',
          url: `${apiUrl}${API_CONFIG.ENDPOINTS.TEAMS.ALL}`,
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'  // 显式要求JSON响应
          },
          validateStatus: false  // 不自动抛出错误，让我们手动处理
        });
        
        console.log('Teams API response status:', response.status);
        if (response.headers && response.headers['content-type']) {
          console.log('Response content type:', response.headers['content-type']);
        }
        
        // 检查是否收到HTML而不是JSON
        if (response.headers['content-type'] && 
            response.headers['content-type'].includes('text/html')) {
          console.error('Received HTML response instead of JSON. API server may be misconfigured.');
          throw new Error('API returned HTML instead of JSON');
        }
        
        if (response.status === 200 && Array.isArray(response.data)) {
          console.log(`Received ${response.data.length} teams from /teams/all`);
          return response.data;
        } 
        throw new Error(`Invalid response with status ${response.status}`);
      } catch (firstError) {
        console.error('Error with /teams/all endpoint:', firstError.message);
        
        // 尝试路径2: /teams
        console.log('Trying endpoint: /teams');
        try {
          const secondResponse = await axios({
            method: 'GET',
            url: `${apiUrl}${API_CONFIG.ENDPOINTS.TEAMS.LIST}`,
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json'
            },
            validateStatus: false
          });
          
          if (secondResponse.status === 200 && Array.isArray(secondResponse.data)) {
            console.log(`Received ${secondResponse.data.length} teams from /teams`);
            return secondResponse.data;
          }
          
          // 所有尝试都失败了，返回空数组
          console.error('All API endpoints failed, returning empty array');
          return [];
        } catch (secondError) {
          console.error('Error with /teams endpoint:', secondError.message);
          
          // 所有尝试都失败了，返回空数组
          console.error('All API endpoints failed, returning empty array');
          return [];
        }
      }
    } catch (error) {
      console.error('Fatal error fetching all teams:', error.message);
      console.error('Response data if available:', error.response?.data);
      // 返回一个空数组而不是抛出错误，以防止组件崩溃
      return [];
    }
  },

  /**
   * Get a specific team by ID
   * @param {string} teamId - MongoDB ObjectId of the team
   * @returns {Promise} - Promise that resolves to the team details
   */
  async getTeamById(teamId) {
    try {
<<<<<<< Updated upstream
      const response = await api.get(`/teams/${teamId}`);
=======
      const apiUrl = getApiBaseUrl();
      const endpoint = API_CONFIG.ENDPOINTS.TEAMS.DETAILS.replace(':id', teamId);
      const response = await axios({
        method: 'GET',
        url: `${apiUrl}${endpoint}`,
        headers: {
          'Authorization': `Bearer ${await getAuthToken()}`
        }
      });
>>>>>>> Stashed changes
      return response.data;
    } catch (error) {
      console.error('Error fetching team:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Join a team using MongoDB ObjectId
   * @param {string} teamId - MongoDB ObjectId of the team
   * @returns {Promise} - Promise that resolves to the joined team
   */
  async joinTeam(teamId) {
    try {
<<<<<<< Updated upstream
      console.log('Joining team:', teamId);
      const response = await api.post(`/teams/${teamId}/join`);
      console.log('Join team response:', response.data);
=======
      console.log('Joining team with ObjectId:', teamId);
      const apiUrl = getApiBaseUrl();
      const response = await axios({
        method: 'POST',
        url: `${apiUrl}${API_CONFIG.ENDPOINTS.TEAMS.JOIN}`,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getAuthToken()}`
        },
        data: { teamId }
      });
>>>>>>> Stashed changes
      return response.data;
    } catch (error) {
      console.error('Error joining team:', error.response?.data || error.message);
      throw error;
    }
  },

<<<<<<< Updated upstream
  async leaveTeam(teamId) {
    try {
      console.log('Attempting to leave team with ID:', teamId);
      // 使用完全原生的fetch调用，绕过可能的拦截器问题
      const token = await getAuthToken();
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      const apiUrl = global.workingApiUrl || API_URL;
      console.log(`Using API URL: ${apiUrl}/groups/leave`);
      
      const response = await fetch(`${apiUrl}/groups/leave`, {
=======
  /**
   * Join a team using 6-digit team ID
   * @param {string} teamId - 6-digit team ID
   * @returns {Promise} - Promise that resolves to the joined team
   */
  async joinTeamById(teamId) {
    try {
      console.log('Joining team by 6-digit ID:', teamId);
      const apiUrl = getApiBaseUrl();
      const response = await axios({
        method: 'POST',
        url: `${apiUrl}${API_CONFIG.ENDPOINTS.TEAMS.JOIN_BY_ID}`,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getAuthToken()}`
        },
        data: { teamId }
      });
      return response.data;
    } catch (error) {
      console.error('Error joining team by ID:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Leave a team
   * @param {string} teamId - MongoDB ObjectId of the team
   * @returns {Promise} - Promise that resolves to success message
   */
  async leaveTeam(teamId) {
    try {
      console.log('Leaving team:', teamId);
      const apiUrl = getApiBaseUrl();
      const response = await axios({
>>>>>>> Stashed changes
        method: 'POST',
        url: `${apiUrl}${API_CONFIG.ENDPOINTS.TEAMS.LEAVE}`,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getAuthToken()}`
        },
<<<<<<< Updated upstream
        body: JSON.stringify({ groupId: teamId })
      });
      
      console.log('Leave team response status:', response.status);
      const data = await response.json();
      console.log('Leave team response data:', data);
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to leave team');
      }
      
      return data;
    } catch (error) {
      console.error('Error leaving team:', error);
      throw error;
    }
  },

  async addGoal(teamId, goalData) {
    try {
      const response = await api.post(`/teams/${teamId}/goals`, goalData);
      return response.data;
    } catch (error) {
      console.error('Error adding goal:', error);
      throw error;
    }
  },

  async updateGoalProgress(teamId, goalId, progress) {
    try {
      const response = await api.patch(`/teams/${teamId}/goals/${goalId}`, {
        current: progress
=======
        data: { teamId }
>>>>>>> Stashed changes
      });
      return response.data;
    } catch (error) {
      console.error('Error leaving team:', error.response?.data || error.message);
      throw error;
    }
  },

<<<<<<< Updated upstream
  async addForfeit(teamId, forfeitData) {
    try {
      const response = await api.post(`/teams/${teamId}/forfeits`, forfeitData);
      return response.data;
    } catch (error) {
      console.error('Error adding forfeit:', error);
      throw error;
    }
  },

  async updateMemberPoints(teamId, memberId, points) {
    try {
      const response = await api.patch(`/teams/${teamId}/members/${memberId}/points`, {
        points
      });
      return response.data;
    } catch (error) {
      console.error('Error updating member points:', error);
=======
  /**
   * Update team information (name, description)
   * @param {string} teamId - MongoDB ObjectId of the team
   * @param {Object} teamData - Updated team data (name, description)
   * @returns {Promise} - Promise that resolves to the updated team
   */
  async updateTeamInfo(teamId, teamData) {
    try {
      const apiUrl = getApiBaseUrl();
      const endpoint = API_CONFIG.ENDPOINTS.TEAMS.UPDATE.replace(':id', teamId);
      const response = await axios({
        method: 'PUT',
        url: `${apiUrl}${endpoint}`,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getAuthToken()}`
        },
        data: teamData
      });
      return response.data;
    } catch (error) {
      console.error('Error updating team info:', error.response?.data || error.message);
>>>>>>> Stashed changes
      throw error;
    }
  },

<<<<<<< Updated upstream
  async updateGoal(teamId, goalId, goalData) {
    try {
      const response = await api.patch(`/teams/${teamId}/goals/${goalId}`, goalData);
      return response.data;
    } catch (error) {
      console.error('Error updating goal:', error.response?.data || error.message);
      throw error;
    }
  },

  async deleteGoal(teamId, goalId) {
    try {
      console.log('Attempting to delete goal:', { teamId, goalId });
      const response = await api.delete(`/teams/${teamId}/goals/${goalId}`);
      console.log('Delete goal response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error deleting goal:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      throw error;
    }
  },

  async updateForfeit(teamId, forfeitId, forfeitData) {
    try {
      console.log('Attempting to update forfeit:', { teamId, forfeitId, forfeitData });
      const response = await api.patch(`/teams/${teamId}/forfeits/${forfeitId}`, forfeitData);
      console.log('Update forfeit response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error updating forfeit:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
=======
  /**
   * Update team target category
   * @param {string} teamId - MongoDB ObjectId of the team
   * @param {string} targetName - New target category name
   * @returns {Promise} - Promise that resolves to the updated team
   */
  async updateTeamTargets(teamId, targetName) {
    try {
      const apiUrl = getApiBaseUrl();
      const endpoint = API_CONFIG.ENDPOINTS.TEAMS.UPDATE_TARGETS.replace(':id', teamId);
      const response = await axios({
        method: 'PUT',
        url: `${apiUrl}${endpoint}`,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getAuthToken()}`
        },
        data: { targetName }
      });
      return response.data;
    } catch (error) {
      console.error('Error updating team targets:', error.response?.data || error.message);
>>>>>>> Stashed changes
      throw error;
    }
  },

<<<<<<< Updated upstream
  async deleteForfeit(teamId, forfeitId) {
    try {
      console.log('Attempting to delete forfeit:', { teamId, forfeitId });
      const response = await api.delete(`/teams/${teamId}/forfeits/${forfeitId}`);
      console.log('Delete forfeit response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error deleting forfeit:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
=======
  /**
   * Update team weekly limits
   * @param {string} teamId - MongoDB ObjectId of the team
   * @param {Object} limitsData - Weekly limits data (weeklyLimitPhysical, weeklyLimitMental)
   * @returns {Promise} - Promise that resolves to the updated team
   */
  async updateWeeklyLimits(teamId, limitsData) {
    try {
      const apiUrl = getApiBaseUrl();
      const endpoint = API_CONFIG.ENDPOINTS.TEAMS.UPDATE_WEEKLY_LIMITS.replace(':id', teamId);
      const response = await axios({
        method: 'PUT',
        url: `${apiUrl}${endpoint}`,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getAuthToken()}`
        },
        data: limitsData
      });
      return response.data;
    } catch (error) {
      console.error('Error updating weekly limits:', error.response?.data || error.message);
>>>>>>> Stashed changes
      throw error;
    }
  },

<<<<<<< Updated upstream
  async deleteTeam(teamId) {
    try {
      const response = await api.delete(`/teams/${teamId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting team:', error);
      if (error.response) {
        throw new Error(error.response.data.message || 'Failed to delete team');
      }
=======
  /**
   * Update team target goal (sum of all members' personal goals)
   * @param {string} teamId - MongoDB ObjectId of the team
   * @returns {Promise} - Promise that resolves to success message
   */
  async updateTeamTargetGoal(teamId) {
    try {
      const apiUrl = getApiBaseUrl();
      const endpoint = API_CONFIG.ENDPOINTS.TEAMS.UPDATE_TARGET_GOAL.replace(':id', teamId);
      const response = await axios({
        method: 'POST',
        url: `${apiUrl}${endpoint}`,
        headers: {
          'Authorization': `Bearer ${await getAuthToken()}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error updating team target goal:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Delete a team
   * @param {string} teamId - MongoDB ObjectId of the team
   * @returns {Promise} - Promise that resolves to success message
   */
  async deleteTeam(teamId) {
    try {
      const apiUrl = getApiBaseUrl();
      const endpoint = API_CONFIG.ENDPOINTS.TEAMS.DELETE.replace(':id', teamId);
      const response = await axios({
        method: 'DELETE',
        url: `${apiUrl}${endpoint}`,
        headers: {
          'Authorization': `Bearer ${await getAuthToken()}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error deleting team:', error.response?.data || error.message);
>>>>>>> Stashed changes
      throw error;
    }
  }
};

export default teamService;