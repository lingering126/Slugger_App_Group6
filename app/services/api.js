import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiUrl } from '../utils'; // Assuming getApiUrl exists in utils.js

// Function to dynamically determine the API base URL
const getBaseUrl = async () => {
  // Prioritize global working URL if already found and stored
  if (global.workingApiUrl) {
    console.log('Using cached API URL:', global.workingApiUrl);
    return global.workingApiUrl;
  }

  // Otherwise, try to determine it using getApiUrl utility
  try {
    const urls = await getApiUrl(); // Assuming getApiUrl returns an array of potential base URLs
    // You might need logic here to ping/test which URL is active
    // For now, let's default to the first one or a common localhost fallback
    const baseUrl = urls[0] || 'http://localhost:5001/api'; 
    console.log('Determined API Base URL:', baseUrl);
    global.workingApiUrl = baseUrl; // Cache it
    return baseUrl;
  } catch (error) {
    console.error("Error determining API base URL, falling back:", error);
    // Fallback if utility fails
    const fallbackUrl = 'http://localhost:5001/api'; 
    global.workingApiUrl = fallbackUrl; // Cache fallback
    return fallbackUrl;
  }
};

// Create an Axios instance
const api = axios.create({
  // baseURL will be set dynamically by the interceptor
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include the token and set baseURL
api.interceptors.request.use(
  async (config) => {
    // Set the baseURL dynamically before the request is sent
    config.baseURL = await getBaseUrl(); 
    
    // Get the token from AsyncStorage
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('Interceptor: Added token to request headers for URL:', config.url);
    } else {
       console.log('Interceptor: No token found in AsyncStorage for URL:', config.url);
    }
    return config;
  },
  (error) => {
    console.error('Interceptor Request Error:', error);
    return Promise.reject(error);
  }
);

// Optional: Add a response interceptor for handling errors globally
api.interceptors.response.use(
  (response) => {
    // Any status code that lie within the range of 2xx cause this function to trigger
    return response;
  },
  (error) => {
    // Any status codes that falls outside the range of 2xx cause this function to trigger
    console.error('API Response Error:', error.response?.data || error.message);
    // Potentially handle specific error statuses like 401 Unauthorized (e.g., redirect to login)
    // if (error.response && error.response.status === 401) {
    //   // Handle unauthorized error
    // }
    return Promise.reject(error);
  }
);

export default api; 