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

// Get the API URL from utils.js
const getDeployedApiUrl = async () => {
  try {
    const { getApiUrl } = await import('../utils');
    const apiUrls = getApiUrl();
    console.log('API URLs from utils:', apiUrls);
    return apiUrls[0]; // Use the first URL which should be the deployed one
  } catch (error) {
    console.error('Error getting API URL from utils:', error);
    return API_URL; // Fallback to config API_URL
  }
};

// Create axios instance - we'll update the baseURL before each request
const api = axios.create({
  baseURL: API_URL, // Initial value, will be updated
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request interceptor
api.interceptors.request.use(
  async (config) => {
    // Update baseURL to use the deployed URL
    const deployedUrl = await getDeployedApiUrl();
    config.baseURL = deployedUrl;
    console.log('Using API URL for team request:', deployedUrl);
    
    // Add auth token
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

// Helper to determine which endpoint to use
const getEndpoint = (path) => {
  // This uses the team routes consistently
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

  async getUserTeams() {
    try {
      const response = await api.get(getEndpoint('/teams'));
      console.log('User teams response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching user teams:', error.response?.data || error.message);
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
      const response = await api.post(getEndpoint('/teams/leave'), { teamId });
      console.log('Leave team response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error leaving team:', error);
      throw error;
    }
  },

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
  },

  async getTeamTarget(teamId, recalculate = false) {
    try {
      const url = recalculate 
        ? getEndpoint(`/teams/${teamId}/target?recalculate=true`)
        : getEndpoint(`/teams/${teamId}/target`);
      
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      console.error('Error getting team target:', error);
      throw error;
    }
  },

  async recalculateTeamTarget(teamId) {
    try {
      const response = await api.post(getEndpoint(`/teams/${teamId}/recalculate-target`));
      return response.data;
    } catch (error) {
      console.error('Error recalculating team target:', error);
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
  }
};

export default teamService;