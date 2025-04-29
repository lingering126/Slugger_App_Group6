import { Alert } from 'react-native';
import API_CONFIG from '../config/api';
import IPConfig from '../config/ipConfig';
import { getApiUrl, pingServer, recordSuccessfulConnection, getPrioritizedUrls } from './networkUtils';

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

// Add a direct connection test function
export const testDirectConnection = async () => {
  // Using expo-constants to get server IP
  let serverIP = IPConfig.getServerIP();
  
  // If unable to get through expo-constants, try other methods
  if (!serverIP) {
    serverIP = global.serverIP;
    
    // If still unable to get, try to use the device's own IP address
    if (!serverIP) {
      try {
        const netInfo = await NetInfo.fetch();
        if (netInfo?.details?.ipAddress) {
          const deviceIP = netInfo.details.ipAddress;
          // Extract subnet from device IP
          const ipParts = deviceIP.split('.');
          if (ipParts.length === 4) {
            // Assume server and device are on the same subnet
            serverIP = deviceIP;
          }
        }
      } catch (error) {
        console.log('Error getting device IP:', error);
      }
    }
  }
  
  console.log('Test connection to server IP:', serverIP);
  
  // Create an array of URLs to test, prioritizing the user-specified IP
  const urls = [
    `http://${serverIP}:${API_CONFIG.PORT}/health`,
  ];
  
  const results = {};
  let foundWorkingUrl = false;
  
  // Test each URL with a longer timeout to avoid AbortError
  for (const url of urls) {
    try {
      console.log(`Testing direct connection to: ${url}`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // Increased timeout for more reliable testing
      
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
        
        // Store the working URL globally and convert to API endpoint
        global.workingApiUrl = url.replace('/health', '/api');
        recordSuccessfulConnection(global.workingApiUrl);
        foundWorkingUrl = true;
        
        // No need to continue testing if we found a working URL
        break;
      } else {
        console.log(`Failed with status ${response.status} for ${url}`);
        results[url] = { success: false, status: response.status };
      }
    } catch (error) {
      console.log(`Error connecting to ${url}:`, error.message);
      results[url] = { success: false, error: error.message };
    }
  }
  
  // If no working URL was found, try a few additional IPs but with lower priority
  if (!foundWorkingUrl) {
    // Try your specific network's addresses
    const additionalUrls = [
      `http://192.168.31.1:${API_CONFIG.PORT}/health`,  // Your router
      `http://192.168.31.252:${API_CONFIG.PORT}/health`, // Your laptop IP explicitly
      `http://10.0.2.2:${API_CONFIG.PORT}/health`,      // Android emulator
      `http://localhost:${API_CONFIG.PORT}/health`,     // iOS simulator
      `http://127.0.0.1:${API_CONFIG.PORT}/health`,     // Localhost
    ];
    
    for (const url of additionalUrls) {
      // Skip if we already tested this URL
      if (results[url]) continue;
      
      try {
        console.log(`Testing additional URL: ${url}`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // Increased timeout for more reliable testing
        
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
          
          // Store the working URL globally and convert to API endpoint
          global.workingApiUrl = url.replace('/health', '/api');
          recordSuccessfulConnection(global.workingApiUrl);
          foundWorkingUrl = true;
          break;
        } else {
          results[url] = { success: false, status: response.status };
        }
      } catch (error) {
        results[url] = { success: false, error: error.message };
      }
    }
  }
  
  if (!foundWorkingUrl) {
    Alert.alert(
      "Connection Failed",
      "Could not connect to any server. Your laptop IP (192.168.31.252) was used. Make sure your server is running and you're on the same network.",
      [
        { 
          text: "Set Server IP Manually", 
          onPress: () => {
            // Use the imported promptForServerIP from networkUtils later
          }
        },
        { text: "OK" }
      ]
    );
  }
  
  console.log('Connection test results:', results);
  return results;
};

// Helper function to check if the server is reachable
export const checkServerConnection = async (apiUrls) => {
  try {
    // Check if we're in a web environment
    const isWebEnvironment = typeof document !== 'undefined';
    
    // For web environment, simplify and prioritize localhost
    if (isWebEnvironment) {
      console.log('Web environment detected, checking localhost first');
      
      const localhostUrl = `http://localhost:${API_CONFIG.PORT}/api`;
      const pingResult = await pingServer(localhostUrl);
      
      if (pingResult) {
        console.log('Successfully connected to localhost in web environment');
        global.workingApiUrl = localhostUrl;
        recordSuccessfulConnection(localhostUrl);
        return {
          status: 'online',
          message: 'Server is reachable via localhost (web environment)',
          url: localhostUrl
        };
      }
    }
    
    // First check if the device has internet connection
    const netInfo = await NetInfo.fetch();
    
    if (!netInfo.isConnected) {
      return {
        status: 'offline',
        message: 'No internet connection. Please check your network settings.'
      };
    }
    
    // If we already have a working URL, try it first
    if (global.workingApiUrl) {
      try {
        // First try a ping which is faster
        const pingResult = await pingServer(global.workingApiUrl);
        if (pingResult) {
          console.log('Ping successful to cached URL');
          recordSuccessfulConnection(global.workingApiUrl);
          return {
            status: 'online',
            message: 'Server is reachable (ping)',
            url: global.workingApiUrl
          };
        }
        
        // If ping fails, try a full health check
        const healthUrl = global.workingApiUrl.replace('/api', '/health');
        console.log('Trying previously working URL:', healthUrl);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // Increased timeout
        
        const response = await fetch(healthUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          console.log('Successfully connected to cached URL');
          recordSuccessfulConnection(global.workingApiUrl);
          return {
            status: 'online',
            message: 'Server is reachable',
            url: global.workingApiUrl
          };
        }
      } catch (error) {
        console.log('Cached URL no longer working, will try alternatives');
        // Continue to try other URLs if the cached one fails
      }
    }
    
    // Make sure apiUrls is an array and prioritize based on past success
    let urlsToTry = Array.isArray(apiUrls) ? apiUrls : [apiUrls];
    urlsToTry = getPrioritizedUrls(urlsToTry);
    
    console.log('Trying to connect to these URLs:', urlsToTry);
    
    // Try each URL with a longer timeout to avoid AbortError
    for (const url of urlsToTry) {
      try {
        // First try a ping which is much faster
        const pingResult = await pingServer(url);
        if (pingResult) {
          console.log('Ping successful to:', url);
          // Store the working URL globally
          global.workingApiUrl = url;
          recordSuccessfulConnection(url);
          return {
            status: 'online',
            message: 'Server is reachable (ping)',
            url: url
          };
        }
        
        console.log('Ping failed, trying full health check for:', url);
        
        // Use a longer timeout for more reliable testing
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
          recordSuccessfulConnection(url);
          return {
            status: 'online',
            message: 'Server is reachable',
            url: url
          };
        } else {
          console.log('Server responded with status:', response.status, response.statusText);
        }
      } catch (error) {
        console.log('Failed to connect to:', url, 'Error:', error.message, 'Type:', error.name);
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

// Export all functions as default
export default {
  testDirectConnection,
  checkServerConnection
}; 