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
    // Try all common subnet patterns
    '192.168.31.251', // Current IP address
    '192.168.31.250', // Previous IP address
    '10.0.2.2',       // Android emulator
    'localhost',      // iOS simulator
    '127.0.0.1',      // Localhost alternative
    '192.168.1.100',  // Common home network IP
    '192.168.0.100',  // Common home network IP
    '172.20.10.2',    // Common hotspot IP
    '172.20.10.3',    // Common hotspot IP
    // Additional IPs to try
    '192.168.31.1',   // Common router IP
    '192.168.1.1',    // Common router IP
    '192.168.0.1',    // Common router IP
    '192.168.43.1',   // Common Android hotspot IP
    '172.20.10.1',    // Common iPhone hotspot IP
    // Try direct IP with different ports
    '192.168.31.251:5000',
    '192.168.31.250:5000',
    // Try with explicit protocol
    'http://192.168.31.251:5000',
    'http://192.168.31.250:5000',
  ];
  
  // Create URLs for all possible IPs, handling those that already have port or protocol
  const allUrls = possibleIPs.map(ip => {
    if (ip.includes('://')) {
      return `${ip}/api`;
    } else if (ip.includes(':')) {
      return `http://${ip}/api`;
    } else {
      return `http://${ip}:5000/api`;
    }
  });
  
  console.log('Generated API URLs to try:', allUrls);
  
  // Return all URLs to try
  return allUrls;
};

// Add a direct connection test function
export const testDirectConnection = async () => {
  const urls = [
    'http://192.168.31.251:5000/ip',
    'http://192.168.31.250:5000/ip',
    'http://192.168.31.1:5000/ip',
    'http://192.168.1.1:5000/ip',
    'http://172.20.10.1:5000/ip',
    'http://172.20.10.2:5000/ip',
    'http://172.20.10.3:5000/ip',
  ];
  
  const results = {};
  
  for (const url of urls) {
    try {
      console.log(`Testing direct connection to: ${url}`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`Success connecting to ${url}:`, data);
        results[url] = { success: true, data };
        // If we found a working URL, store it globally
        global.workingApiUrl = url.replace('/ip', '/api');
      } else {
        console.log(`Failed with status ${response.status} for ${url}`);
        results[url] = { success: false, status: response.status };
      }
    } catch (error) {
      console.log(`Error connecting to ${url}:`, error.message);
      results[url] = { success: false, error: error.message };
    }
  }
  
  console.log('Connection test results:', results);
  return results;
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
        
        // Use a longer timeout for better chances of connection
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // Increased from 2000ms to 5000ms
        
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
        } else {
          console.log('Server responded with status:', response.status, response.statusText);
        }
      } catch (error) {
        console.log('Failed to connect to:', url, 'Error:', error.message, 'Type:', error.name, 'Stack:', error.stack);
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