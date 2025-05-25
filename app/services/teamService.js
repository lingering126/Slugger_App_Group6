import axios from 'axios';
import { API_URL } from '../config';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Get auth token with refresh check
const getAuthToken = async () => {
  try {
    const token = await AsyncStorage.getItem('userToken');
    console.log('Auth token retrieved:', token ? 'Token exists' : 'No token found');
    
    if (!token) {
      return null;
    }
    
    // Simple check for token expiration
    try {
      // Decode JWT payload to check expiration
      const tokenParts = token.split('.');
      if (tokenParts.length === 3) {
        const payload = JSON.parse(atob(tokenParts[1]));
        if (payload.exp && payload.exp * 1000 < Date.now()) {
          console.warn('Token is expired, attempting to refresh');
          
          // Try to refresh the token - implementation depends on your auth flow
          const refreshToken = await AsyncStorage.getItem('refreshToken');
          if (refreshToken) {
            try {
              const apiUrl = await getApiBaseUrl();
              const refreshResponse = await fetch(`${apiUrl}/auth/refresh`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ refreshToken })
              });
              
              if (refreshResponse.ok) {
                const refreshData = await refreshResponse.json();
                if (refreshData.token) {
                  // Save new token
                  await AsyncStorage.setItem('userToken', refreshData.token);
                  console.log('Token refreshed successfully');
                  return refreshData.token;
                }
              }
            } catch (refreshError) {
              console.error('Error refreshing token:', refreshError);
            }
          }
        }
      }
    } catch (tokenCheckError) {
      console.warn('Error checking token expiration:', tokenCheckError);
    }
    
    return token;
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

// Helper function to get the API base URL
const getApiBaseUrl = async () => {
  try {
    // Try to get a custom API URL from AsyncStorage
    const customUrl = await AsyncStorage.getItem('apiBaseUrl');
    if (customUrl) {
      return customUrl;
    }
    // Use global.workingApiUrl if available (set by the connection checker)
    if (global.workingApiUrl) {
      return global.workingApiUrl;
    }
    // Default to the deployed URL
    return 'https://slugger-app-group6-qrpk.onrender.com/api';
  } catch (error) {
    console.error('Error getting API base URL:', error);
    // Default to the deployed URL in case of error
    return 'https://slugger-app-group6-qrpk.onrender.com/api';
  }
};

// Create axios instance with dynamic base URL
const api = axios.create({
  baseURL: API_URL, // Will be updated in the interceptor
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request interceptor to dynamically set baseURL
api.interceptors.request.use(
  async (config) => {
    // Update baseURL for each request
    config.baseURL = await getApiBaseUrl();
    
    // Add authentication token if available
    const token = await getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      console.warn('No auth token available for request to:', config.url);
    }
    
    console.log(`Making ${config.method.toUpperCase()} request to: ${config.baseURL}${config.url}`);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // If the error is 401 Unauthorized and we haven't tried to refresh the token yet
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      console.log('Received 401 Unauthorized, attempting to refresh token...');
      originalRequest._retry = true;
      
      try {
        // Try to refresh the token
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        if (!refreshToken) {
          console.error('No refresh token available');
          // Clear tokens and redirect to login in the app
          await AsyncStorage.removeItem('userToken');
          // We can't redirect from here, but we'll handle this in the components
          return Promise.reject(error);
        }
        
        const apiUrl = await getApiBaseUrl();
        const response = await fetch(`${apiUrl}/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ refreshToken })
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.token) {
            // Save the new token
            await AsyncStorage.setItem('userToken', data.token);
            console.log('Token refreshed successfully, retrying original request');
            
            // Update the Authorization header with the new token
            api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
            originalRequest.headers['Authorization'] = `Bearer ${data.token}`;
            
            // Retry the original request
            return api(originalRequest);
          }
        }
        
        // If refresh failed, clear tokens
        console.error('Token refresh failed');
        await AsyncStorage.removeItem('userToken');
        await AsyncStorage.removeItem('refreshToken');
      } catch (refreshError) {
        console.error('Error during token refresh:', refreshError);
      }
    }
    
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