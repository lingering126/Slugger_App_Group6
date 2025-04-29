import axios from 'axios';
import { API_URL } from '../config';
import AsyncStorage from '@react-native-async-storage/async-storage';

// get token
const getAuthToken = async () => {
  try {
    const token = await AsyncStorage.getItem('userToken');
    return token;
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

// 创建axios实例
const api = axios.create({
  baseURL: API_URL,
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
      throw error;
    }
  },

  async getTeamById(teamId) {
    try {
      const response = await api.get(`/teams/${teamId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching team:', error);
      throw error;
    }
  },

  async joinTeam(teamId) {
    try {
      console.log('Joining team:', teamId);
      const response = await api.post(`/teams/${teamId}/join`);
      console.log('Join team response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error joining team:', error.response?.data || error.message);
      throw error;
    }
  },

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
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
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
      });
      return response.data;
    } catch (error) {
      console.error('Error updating goal progress:', error);
      throw error;
    }
  },

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
      throw error;
    }
  },

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
      throw error;
    }
  },

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
      throw error;
    }
  },

  async deleteTeam(teamId) {
    try {
      const response = await api.delete(`/teams/${teamId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting team:', error);
      if (error.response) {
        throw new Error(error.response.data.message || 'Failed to delete team');
      }
      throw error;
    }
  }
};

export default teamService; 