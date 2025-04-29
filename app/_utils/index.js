// Import everything from our utility modules
import * as NetworkUtils from './networkUtils';
import * as ConnectionUtils from './connectionUtils';
import API_CONFIG from '../config/api';

// Re-export all the individual utilities
export const {
  getApiUrl,
  pingServer,
  promptForServerIP,
  recordSuccessfulConnection,
  getPrioritizedUrls,
  clearConnectionCache,
  getConnectionStats,
  resetConnectionStats,
  scanNetworkForServer
} = NetworkUtils;

export const {
  testDirectConnection,
  checkServerConnection
} = ConnectionUtils;

// Create a unified utility object for backward compatibility
const Utils = {
  // Network utilities
  getApiUrl: NetworkUtils.getApiUrl,
  pingServer: NetworkUtils.pingServer,
  promptForServerIP: NetworkUtils.promptForServerIP,
  recordSuccessfulConnection: NetworkUtils.recordSuccessfulConnection,
  getPrioritizedUrls: NetworkUtils.getPrioritizedUrls,
  clearConnectionCache: NetworkUtils.clearConnectionCache,
  getConnectionStats: NetworkUtils.getConnectionStats,
  resetConnectionStats: NetworkUtils.resetConnectionStats,
  
  // Connection utilities
  testDirectConnection: ConnectionUtils.testDirectConnection,
  checkServerConnection: ConnectionUtils.checkServerConnection,
  
  // Add a specific function to find best server URL
  findBestServerUrl: async () => {
    try {
      console.log('Checking server connection...');
      
      // Check if we're in a web environment
      const isWebEnvironment = typeof document !== 'undefined';
      
      // For web environment, prioritize localhost
      if (isWebEnvironment) {
        console.log('Web environment detected, trying localhost first');
        
        try {
          const localhostUrl = `http://localhost:${API_CONFIG.PORT}/api`;
          const pingResult = await NetworkUtils.pingServer(localhostUrl);
          
          if (pingResult) {
            console.log('Successfully connected to localhost in web environment');
            global.workingApiUrl = localhostUrl;
            NetworkUtils.recordSuccessfulConnection(localhostUrl);
            return {
              status: 'online',
              message: 'Server is reachable via localhost (web environment)',
              url: localhostUrl
            };
          }
        } catch (error) {
          console.log('Failed to connect to localhost:', error.message);
        }
      }
      
      // First try to scan network for server if we don't have a working API URL
      if (!global.workingApiUrl) {
        console.log('No cached server connection, trying to scan network...');
        const scanResult = await NetworkUtils.scanNetworkForServer();
        
        if (scanResult.status === 'online') {
          console.log('Found server via network scan:', scanResult.url);
          return {
            status: 'online',
            message: 'Server found via network scan',
            url: scanResult.url
          };
        }
      }
      
      // Then try the regular connection check with our list of possible URLs
      const apiUrls = NetworkUtils.getApiUrl();
      const result = await ConnectionUtils.checkServerConnection(apiUrls);
      return result;
    } catch (error) {
      console.error('Error finding best server URL:', error);
      return {
        status: 'error',
        message: 'Error finding server URL',
        error: error.message
      };
    }
  }
};

// Export Utils as the default export for backward compatibility
export default Utils; 