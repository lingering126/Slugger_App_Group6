import Constants from 'expo-constants';

// Automatically get development server IP address
export const getServerIP = (): string | null => {
  try {
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
export const getServerUrl = (port: number = 5001, path: string = '/api'): string | null => {
  const ip = getServerIP();
  if (ip) {
    return `http://${ip}:${port}${path}`;
  }
  
  // If unable to get IP address, return null
  return null;
};

// Build health check URL
export const getHealthUrl = (port: number = 5001): string | null => {
  const ip = getServerIP();
  if (ip) {
    return `http://${ip}:${port}/health`;
  }
  return null;
};

// Build ping URL
export const getPingUrl = (port: number = 5001): string | null => {
  const ip = getServerIP();
  if (ip) {
    return `http://${ip}:${port}/ping`;
  }
  return null;
};

export default {
  getServerIP,
  getServerUrl,
  getHealthUrl,
  getPingUrl
}; 