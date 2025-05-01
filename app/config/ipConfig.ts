import Constants from 'expo-constants';
import API_CONFIG from './api';

// Automatically get development server IP address
export const getServerIP = (): string | null => {
  try {
    // Check if we're using the deployed server
    if (API_CONFIG.API_URL.includes('slugger-app-group6.onrender.com')) {
      console.log('Using deployed server at slugger-app-group6.onrender.com');
      return 'slugger-app-group6.onrender.com';
    }
    
    // Get manifest information
    const { manifest2, manifest } = Constants;
    
    // Get hostUri or debuggerHost from manifest
    const hostUri = manifest2?.extra?.expoClient?.hostUri || manifest?.debuggerHost;
    
    // Split out IP address (remove port number)
    const baseIp = hostUri?.split(':')[0];
    
    // If IP address was successfully obtained, return it
    if (baseIp) {
      console.log('Automatically obtained server IP:', baseIp);
      return baseIp;
    }
    
    // If unable to get IP address, return null
    console.log('Unable to get IP address from Expo Constants');
    return null;
  } catch (error) {
    console.error('Error getting server IP:', error);
    return null;
  }
};

// Build complete server URL
export const getServerUrl = (path: string = '/api'): string => {
  // Always use the configured API_URL as the base
  return API_CONFIG.API_URL + (path.startsWith('/') ? path : '/' + path);
};

// Build health check URL
export const getHealthUrl = (): string => {
  // Use the base URL from API_CONFIG but trim the /api path if it exists
  const baseUrl = API_CONFIG.API_URL.replace(/\/api$/, '');
  return `${baseUrl}/health`;
};

// Build ping URL
export const getPingUrl = (): string => {
  // Use the base URL from API_CONFIG but trim the /api path if it exists
  const baseUrl = API_CONFIG.API_URL.replace(/\/api$/, '');
  return `${baseUrl}/ping`;
};

export default {
  getServerIP,
  getServerUrl,
  getHealthUrl,
  getPingUrl
}; 