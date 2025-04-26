import axios from 'axios';
import { API_URL } from '../config';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Get auth token
const getAuthToken = async () => {
  try {
    const token = await AsyncStorage.getItem('userToken');
    console.log('Auth token retrieved:', token ? 'Token exists' : 'No token found');
    return token;
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request interceptor
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

// Helper function to get the API base URL
const getApiBaseUrl = () => {
  return global.workingApiUrl || API_URL;
};

// Helper to determine which endpoint to use
const getEndpoint = (path) => {
  // This allows flexibility to use either /teams or /groups
  // Default to /teams for new code
  return path;
};

const teamService = {
  async getAllTeams() {
    try {
      const response = await api.get(getEndpoint('/teams/all'));
      console.log('Teams response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching teams:', error.response?.data || error.message);
      throw error;
    }
  },

  async createTeam(teamData) {
    try {
      const response = await api.post(getEndpoint('/teams'), teamData);
      return response.data;
    } catch (error) {
      console.error('Error creating team:', error);
      if (error.response) {
        throw new Error(error.response.data.message || 'Failed to create team');
      }
      throw error;
    }
  },

  async getTeamById(teamId) {
    try {
      const response = await api.get(getEndpoint(`/teams/${teamId}`));
      return response.data;
    } catch (error) {
      console.error('Error fetching team:', error);
      throw error;
    }
  },

  async joinTeam(teamId) {
    try {
      console.log('Joining team:', teamId);
      const response = await api.post(getEndpoint(`/teams/join`), { teamId });
      console.log('Join team response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error joining team:', error.response?.data || error.message);
      throw error;
    }
  },

  async joinTeamById(teamId) {
    try {
      console.log('Joining team by ID:', teamId);
      const response = await api.post(getEndpoint('/teams/join-by-id'), { teamId });
      console.log('Join team by ID response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error joining team by ID:', error.response?.data || error.message);
      throw error;
    }
  },

  async leaveTeam(teamId) {
    try {
      console.log('Attempting to leave team with ID:', teamId);
      // Use native fetch for compatibility with both endpoints
      const token = await getAuthToken();
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      const apiUrl = getApiBaseUrl();
      console.log(`Using API URL: ${apiUrl}/teams/leave`);
      
      const response = await fetch(`${apiUrl}/teams/leave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ teamId: teamId })
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
      const response = await api.post(getEndpoint(`/teams/${teamId}/goals`), goalData);
      return response.data;
    } catch (error) {
      console.error('Error adding goal:', error);
      throw error;
    }
  },

  async updateGoalProgress(teamId, goalId, progress) {
    try {
      const response = await api.patch(getEndpoint(`/teams/${teamId}/goals/${goalId}`), {
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
      const response = await api.post(getEndpoint(`/teams/${teamId}/forfeits`), forfeitData);
      return response.data;
    } catch (error) {
      console.error('Error adding forfeit:', error);
      throw error;
    }
  },

  async updateMemberPoints(teamId, memberId, points) {
    try {
      const response = await api.patch(getEndpoint(`/teams/${teamId}/members/${memberId}/points`), {
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
      const response = await api.patch(getEndpoint(`/teams/${teamId}/goals/${goalId}`), goalData);
      return response.data;
    } catch (error) {
      console.error('Error updating goal:', error.response?.data || error.message);
      throw error;
    }
  },

  async deleteGoal(teamId, goalId) {
    try {
      console.log('Attempting to delete goal:', { teamId, goalId });
      const response = await api.delete(getEndpoint(`/teams/${teamId}/goals/${goalId}`));
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
      const response = await api.patch(getEndpoint(`/teams/${teamId}/forfeits/${forfeitId}`), forfeitData);
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
      const response = await api.delete(getEndpoint(`/teams/${teamId}/forfeits/${forfeitId}`));
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
      const response = await api.delete(getEndpoint(`/teams/${teamId}`));
      return response.data;
    } catch (error) {
      console.error('Error deleting team:', error);
      if (error.response) {
        throw new Error(error.response.data.message || 'Failed to delete team');
      }
      throw error;
    }
  },
  
  // Add method to update team information
  async updateTeamInfo(teamId, teamData) {
    try {
      const response = await api.put(getEndpoint(`/teams/${teamId}`), teamData);
      return response.data;
    } catch (error) {
      console.error('Error updating team info:', error);
      if (error.response) {
        throw new Error(error.response.data.message || 'Failed to update team information');
      }
      throw error;
    }
  },
  
  // Add method to update team targets
  async updateTeamTargets(teamId, targetsData) {
    try {
      const response = await api.put(getEndpoint(`/teams/${teamId}/targets`), targetsData);
      return response.data;
    } catch (error) {
      console.error('Error updating team targets:', error);
      if (error.response) {
        throw new Error(error.response.data.message || 'Failed to update team targets');
      }
      throw error;
    }
  }
};

export default teamService; 