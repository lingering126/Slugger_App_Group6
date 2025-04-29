import { Platform, Alert } from 'react-native';
import API_CONFIG from '../config/api';
import IPConfig from '../config/ipConfig';

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

// Save the working URL globally so we don't have to discover it each time
if (!global.workingApiUrl) {
  global.workingApiUrl = null;
}

// Create a connection success counter to track which servers work most reliably
if (!global.connectionStats) {
  global.connectionStats = {};
}

// Prioritize connection attempts based on past success
export const getPrioritizedUrls = (urls) => {
  // Make a copy so we don't modify the original array
  const prioritizedUrls = [...urls];
  
  // Sort by success count (higher count first)
  prioritizedUrls.sort((a, b) => {
    const aCount = global.connectionStats[a] || 0;
    const bCount = global.connectionStats[b] || 0;
    return bCount - aCount;
  });
  
  return prioritizedUrls;
};

// Record a successful connection
export const recordSuccessfulConnection = (url) => {
  if (!global.connectionStats[url]) {
    global.connectionStats[url] = 0;
  }
  global.connectionStats[url]++;
  console.log(`Connection stats updated for ${url}: ${global.connectionStats[url]} successful connections`);
};

// Helper function to get the appropriate API URL based on the environment
export const getApiUrl = () => {
  // If we already found a working URL, return it
  if (global.workingApiUrl) {
    console.log('Using previously discovered working API URL:', global.workingApiUrl);
    return [global.workingApiUrl];
  }

  // Check if we're running in a web browser environment
  const isWebEnvironment = typeof document !== 'undefined';
  
  // In web browser environment, prioritize localhost
  if (isWebEnvironment) {
    console.log('Detected web environment, using API config URL');
    return [API_CONFIG.API_URL];
  }
  
  // Get the server URL from config
  return [API_CONFIG.API_URL];
};

// Simple ping function to test connectivity with minimal overhead
export const pingServer = async (url) => {
  try {
    // Skip ping check for web debug environment
    if (typeof document !== 'undefined' && url.includes('10.0.2.2')) {
      console.log(`Skipping ping to emulator address ${url} in web debug mode`);
      return false; // Skip Android emulator IPs in web debug mode
    }
    
    const pingUrl = url.replace('/api', '/ping');
    console.log(`Pinging server at: ${pingUrl}`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500); // Short timeout for ping
    
    const response = await fetch(pingUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const data = await response.text();
      if (data === 'PONG') {
        console.log(`Ping successful to ${pingUrl}`);
        return true;
      }
    }
    return false;
  } catch (error) {
    console.log(`Ping failed to ${url}: ${error.message}`);
    return false;
  }
};

// Helper function to prompt the user for a server IP
export const promptForServerIP = () => {
  // This is now handled by the ServerIPModal component
  // This function is kept for compatibility
  console.log("promptForServerIP called - use ServerIPModal instead");
  
  // In the next version, we can use a navigation approach to display the modal
  // or server settings screen, but for now we'll keep this simple
  Alert.alert(
    "Server Connection",
    "Would you like to open server settings to configure the connection?",
    [
      { text: "Cancel" },
      {
        text: "Open Settings",
        onPress: () => {
          // We'd navigate to the settings screen here if we had access to navigation
          // For now, direct the user to do this manually
          Alert.alert(
            "Server Settings",
            "Please go to the More tab and select Server Connection to configure your server."
          );
        }
      }
    ]
  );
};

// Add a method to clear cached connection
export const clearConnectionCache = () => {
  global.workingApiUrl = null;
  console.log('Connection cache cleared');
  return true;
};

// Add a method to get the current connection stats
export const getConnectionStats = () => {
  return global.connectionStats || {};
};

// Add a method to reset connection stats
export const resetConnectionStats = () => {
  global.connectionStats = {};
  console.log('Connection stats reset');
  return true;
};

// Add scan network for server function
export const scanNetworkForServer = async () => {
  console.log('Scanning network for server...');
  
  try {
    // Get server IP
    const serverIP = IPConfig.getServerIP();
    
    if (!serverIP) {
      console.log('No server IP found from Expo Constants');
      return { status: 'offline', message: 'No server IP found' };
    }
    
    // Try different ports if the server port is not specified
    const portsToTry = [API_CONFIG.PORT, 5000, 3000];
    
    for (const port of portsToTry) {
      const apiUrl = `http://${serverIP}:${port}/api`;
      const pingUrl = `http://${serverIP}:${port}/ping`;
      
      console.log(`Trying to ping server at: ${pingUrl}`);
      
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        
        const response = await fetch(pingUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          console.log(`Server found at ${apiUrl}`);
          global.workingApiUrl = apiUrl;
          recordSuccessfulConnection(apiUrl);
          return { status: 'online', message: 'Server found', url: apiUrl };
        }
      } catch (error) {
        console.log(`Error connecting to ${pingUrl}:`, error.message);
      }
    }
    
    return { status: 'offline', message: 'No server found on network' };
  } catch (error) {
    console.error('Error scanning network:', error);
    return { status: 'error', message: 'Error scanning network', error: error.message };
  }
};

// Export all functions as default
export default {
  getPrioritizedUrls,
  recordSuccessfulConnection,
  getApiUrl,
  pingServer,
  promptForServerIP,
  clearConnectionCache,
  getConnectionStats,
  resetConnectionStats,
  scanNetworkForServer
}; 