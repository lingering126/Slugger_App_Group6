import { Platform } from 'react-native';
// Try to import NetInfo, but don't fail if it's not available
let NetInfo;
try {
  NetInfo = require('@react-native-community/netinfo').default;
} catch (error) {
  console.warn('NetInfo package not available, network checks will be skipped');
  // Create a mock NetInfo that always returns connected
  NetInfo = {
    fetch: async () => ({ isConnected: true, isInternetReachable: true })
  };
}

// Helper function to get the appropriate API URL based on the environment
export const getApiUrl = () => {
  // For development on physical device, try multiple IP addresses
  const possibleIPs = [
    '192.168.31.250', // Your actual IP address
    '10.0.2.2',       // Android emulator
    'localhost',      // iOS simulator
    '127.0.0.1',      // Localhost alternative
    '192.168.1.100',  // Common home network IP
    '192.168.0.100',  // Common home network IP
    '172.20.10.2',    // Common hotspot IP
    '172.20.10.3',    // Common hotspot IP
  ];
  
  // Create URLs for all possible IPs
  const allUrls = possibleIPs.map(ip => `http://${ip}:5000/api`);
  
  console.log('Generated API URLs to try:', allUrls);
  
  // Return all URLs to try
  return allUrls;
};

// Helper function to check if the server is reachable
export const checkServerConnection = async (apiUrls) => {
  try {
    // First check if the device has internet connection
    const netInfo = await NetInfo.fetch();
    
    if (!netInfo.isConnected) {
      return {
        status: 'offline',
        message: 'No internet connection. Please check your network settings.'
      };
    }
    
    // Make sure apiUrls is an array
    const urlsToTry = Array.isArray(apiUrls) ? apiUrls : [apiUrls];
    console.log('Trying to connect to these URLs:', urlsToTry);
    
    // Try each URL with a short timeout
    for (const url of urlsToTry) {
      try {
        console.log('Trying to connect to:', url);
        
        // Use a shorter timeout for faster checking
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        
        const response = await fetch(url.replace('/api', '/health'), {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          console.log('Successfully connected to:', url);
          // Store the working URL globally
          global.workingApiUrl = url;
          return {
            status: 'online',
            message: 'Server is reachable',
            url: url
          };
        }
      } catch (error) {
        console.log('Failed to connect to:', url, error.message);
        // Continue to the next URL
      }
    }
    
    // If we get here, none of the URLs worked
    return {
      status: 'offline',
      message: 'Cannot connect to any server. Please check your network connection and server status.'
    };
  } catch (error) {
    console.error('Connection check error:', error);
    return {
      status: 'offline',
      message: 'Cannot connect to server. Please check your network connection and server status.'
    };
  }
}; 