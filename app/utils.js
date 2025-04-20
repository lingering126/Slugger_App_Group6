import { Platform, Alert } from 'react-native';
import IPConfig from './config/ipConfig';
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
global.workingApiUrl = null;

// Create a connection success counter to track which servers work most reliably
if (!global.connectionStats) {
  global.connectionStats = {};
}

// Prioritize connection attempts based on past success
const getPrioritizedUrls = (urls) => {
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
const recordSuccessfulConnection = (url) => {
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
    console.log('Detected web environment, prioritizing localhost');
    return ['http://localhost:5001/api'];
  }

  // Define the backend server IP here - update this to match your actual server IP
  // This can be your computer's IP address on the same network as your phone
  // Using expo-constants to get the server IP
  const serverUrl = IPConfig.getServerUrl();
  if (serverUrl) {
    console.log('Using Expo Constants server URL:', serverUrl);
    return [serverUrl];
  }

  // Get the server IP from environment or use auto-discovery
  const serverIP = process.env.REACT_NATIVE_SERVER_IP || global.serverIP;
  console.log('Server IP configuration:', serverIP || 'Using auto-discovery');
  
  // Only include the most likely IPs to avoid unnecessary connection attempts
  // Initialize an empty array and only add valid IPs
  const possibleIPs = [];
  
  // Add serverIP only if it exists
  if (serverIP) {
    possibleIPs.push(serverIP);
  }
  
  // Add common fallbacks, but with less priority
  const additionalIPs = [
    // Local network addresses (including your specific subnet)
    '192.168.31.1',    // Common router IP in your subnet
    '192.168.31.252',  // Your laptop IP explicitly
    
    // Emulator addresses
    '10.0.2.2',        // Android emulator
    'localhost',       // iOS simulator
    '127.0.0.1',       // Localhost
  ];
  
  // Add IP ranges to scan if we're on a typical home network
  // This helps find the server even if the IP changed
  try {
    // Check the device's own IP to determine network subnet
    const netInfo = global.lastNetworkInfo;
    if (netInfo && netInfo.details && netInfo.details.ipAddress) {
      const deviceIP = netInfo.details.ipAddress;
      console.log('Device IP:', deviceIP);
      
      // Extract subnet from device IP (e.g., from 192.168.1.5 get 192.168.1)
      const ipParts = deviceIP.split('.');
      if (ipParts.length === 4) {
        const subnet = `${ipParts[0]}.${ipParts[1]}.${ipParts[2]}`;
        console.log('Detected subnet:', subnet);
        
        // Add common server ports on this subnet
        const commonLastOctets = ['1', '2', '100', '101', '102', '200', '250', '251', '252', '253', '254'];
        commonLastOctets.forEach(lastOctet => {
          const potentialIP = `${subnet}.${lastOctet}`;
          // Don't add duplicates - with null check
          if (potentialIP && possibleIPs && additionalIPs && 
              !possibleIPs.includes(potentialIP) && 
              !additionalIPs.includes(potentialIP)) {
            additionalIPs.push(potentialIP);
          }
        });
      }
    }
  } catch (error) {
    console.warn('Error detecting network subnet:', error);
  }
  
  // Add additional IPs if they haven't been added already
  additionalIPs.forEach(ip => {
    // Only add valid IPs and avoid duplicates - with null check
    if (ip && possibleIPs && !possibleIPs.includes(ip)) {
      possibleIPs.push(ip);
    }
  });
  
  // Create URLs for all possible IPs, handling those that already have port or protocol
  const allUrls = possibleIPs.map(ip => {
    // Skip undefined or null values
    if (!ip) {
      return null;
    }
    
    if (ip.includes('://')) {
      return `${ip}/api`;
    } else if (ip.includes(':')) {
      return `http://${ip}/api`;
    } else {
      return `http://${ip}:5001/api`;
    }
  }).filter(Boolean); // Filter out any null/undefined values
  
  console.log('Generated API URLs to try:', allUrls);
  
  // Return all URLs to try, prioritized by past success
  return getPrioritizedUrls(allUrls);
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
    `http://${serverIP}:5001/health`,
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
      `http://192.168.31.1:5001/health`,  // Your router
      `http://192.168.31.252:5001/health`, // Your laptop IP explicitly
      `http://10.0.2.2:5001/health`,      // Android emulator
      `http://localhost:5001/health`,     // iOS simulator
      `http://127.0.0.1:5001/health`,     // Localhost
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
            promptForServerIP();
          }
        },
        { text: "OK" }
      ]
    );
  }
  
  console.log('Connection test results:', results);
  return results;
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

// Helper function to check if the server is reachable
export const checkServerConnection = async (apiUrls) => {
  try {
    // Check if we're in a web environment
    const isWebEnvironment = typeof document !== 'undefined';
    
    // For web environment, simplify and prioritize localhost
    if (isWebEnvironment) {
      console.log('Web environment detected, checking localhost first');
      
      const localhostUrl = 'http://localhost:5001/api';
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

// Add a method to scan network for server
export const scanNetworkForServer = async () => {
  console.log('Scanning network for server...');
  
  try {
    // Check if we're in a web environment
    const isWebEnvironment = typeof document !== 'undefined';
    
    // For web environment, simplify and just check localhost
    if (isWebEnvironment) {
      console.log('Web environment detected, checking localhost only');
      
      try {
        const pingUrl = 'http://localhost:5001/ping';
        console.log(`Testing connection to: ${pingUrl}`);
        
        const response = await fetch(pingUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        if (response.ok && await response.text() === 'PONG') {
          console.log('Server found at localhost');
          const apiUrl = 'http://localhost:5001/api';
          
          // Store as global server IP
          global.serverIP = 'localhost';
          global.workingApiUrl = apiUrl;
          recordSuccessfulConnection(apiUrl);
          
          return {
            status: 'online',
            message: 'Server found on localhost',
            ip: 'localhost',
            url: apiUrl
          };
        }
      } catch (error) {
        console.log('Failed to connect to localhost:', error.message);
      }
      
      return {
        status: 'not_found',
        message: 'Server not found on localhost'
      };
    }
    
    // Get the device's own network info
    const netInfo = await NetInfo.fetch();
    global.lastNetworkInfo = netInfo;
    
    if (!netInfo.isConnected) {
      console.log('Device is not connected to any network');
      return {
        status: 'offline',
        message: 'No network connection available'
      };
    }
    
    console.log('Network info:', netInfo);
    
    if (netInfo.details && netInfo.details.ipAddress) {
      const deviceIP = netInfo.details.ipAddress;
      console.log('Device IP:', deviceIP);
      
      // Extract subnet from device IP (e.g., from 192.168.1.5 get 192.168.1)
      const ipParts = deviceIP.split('.');
      if (ipParts.length === 4) {
        const subnet = `${ipParts[0]}.${ipParts[1]}.${ipParts[2]}`;
        console.log('Scanning subnet:', subnet);
        
        // Prepare a list of IPs to scan
        const ipsToScan = [];
        
        // Add common server ports on this subnet
        const commonLastOctets = ['1', '2', '100', '101', '102', '200', '250', '251', '252', '253', '254'];
        commonLastOctets.forEach(lastOctet => {
          ipsToScan.push(`${subnet}.${lastOctet}`);
        });
        
        console.log('IPs to scan:', ipsToScan);
        
        // Create URLs for all IPs to scan
        const urlsToScan = ipsToScan.map(ip => `http://${ip}:5001/ping`);
        
        // Try pinging each IP in parallel with a short timeout
        const pingPromises = urlsToScan.map(url => {
          return new Promise(async (resolve) => {
            try {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 500); // Very short timeout for ping
              
              const response = await fetch(url, {
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json',
                },
                signal: controller.signal
              });
              
              clearTimeout(timeoutId);
              
              if (response.ok && await response.text() === 'PONG') {
                console.log(`Server found at: ${url}`);
                resolve({
                  ip: url.replace('http://', '').replace(':5001/ping', ''),
                  success: true,
                  url: url
                });
              } else {
                resolve({ success: false, url: url });
              }
            } catch (error) {
              // Silent failure for scan
              resolve({ success: false, url: url });
            }
          });
        });
        
        // Wait for all ping attempts
        const results = await Promise.all(pingPromises);
        
        // Filter successful pings
        const successfulPings = results.filter(result => result.success);
        console.log('Successful pings:', successfulPings);
        
        if (successfulPings.length > 0) {
          // Found at least one server!
          const bestServer = successfulPings[0];
          const apiUrl = `http://${bestServer.ip}:5001/api`;
          
          // Store as global server IP
          global.serverIP = bestServer.ip;
          global.workingApiUrl = apiUrl;
          recordSuccessfulConnection(apiUrl);
          
          return {
            status: 'online',
            message: `Server found on network at ${bestServer.ip}`,
            ip: bestServer.ip,
            url: apiUrl
          };
        }
      }
    }
    
    return {
      status: 'not_found',
      message: 'Server not found on local network'
    };
  } catch (error) {
    console.error('Error scanning network:', error);
    return {
      status: 'error',
      message: `Error scanning network: ${error.message}`
    };
  }
};

// Create a utility service object to satisfy the default export requirement
const Utils = {
  getApiUrl,
  testDirectConnection,
  promptForServerIP,
  checkServerConnection,
  recordSuccessfulConnection,
  pingServer,
  scanNetworkForServer,
  
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
          const localhostUrl = 'http://localhost:5001/api';
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
        } catch (error) {
          console.log('Failed to connect to localhost:', error.message);
        }
      }
      
      // First try to scan network for server if we don't have a working API URL
      if (!global.workingApiUrl) {
        console.log('No cached server connection, trying to scan network...');
        const scanResult = await scanNetworkForServer();
        
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
      const apiUrls = getApiUrl();
      const result = await checkServerConnection(apiUrls);
      return result;
    } catch (error) {
      console.error('Error finding best server URL:', error);
      return {
        status: 'error',
        message: 'Error finding server URL',
        error: error.message
      };
    }
  },
  
  // Add a method to clear cached connection
  clearConnectionCache: () => {
    global.workingApiUrl = null;
    console.log('Connection cache cleared');
    return true;
  },
  
  // Add a method to get the current connection stats
  getConnectionStats: () => {
    return global.connectionStats || {};
  },
  
  // Add a method to reset connection stats
  resetConnectionStats: () => {
    global.connectionStats = {};
    console.log('Connection stats reset');
    return true;
  }
};

// Export the Utils object as the default export
export default Utils; 