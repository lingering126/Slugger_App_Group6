import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { MaterialIcons, FontAwesome } from '@expo/vector-icons';
import Utils, { getApiUrl, testDirectConnection, checkServerConnection, pingServer, scanNetworkForServer } from '../_utils';
import ServerIPModal from './ServerIPModal';
import NetInfo from '@react-native-community/netinfo';
import IPConfig from '../config/ipConfig';

const ServerSettings = ({ onClose, navigation }) => {
  const [serverIP, setServerIP] = useState('');
  const [customIP, setCustomIP] = useState('');
  const [testResults, setTestResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('unknown');
  const [modalVisible, setModalVisible] = useState(false);
  const [connectionStats, setConnectionStats] = useState({});
  const [localNetworkInfo, setLocalNetworkInfo] = useState(null);

  useEffect(() => {
    // Get the current server IP from global state if available
    if (global.serverIP) {
      setServerIP(global.serverIP);
      setCustomIP(global.serverIP);
    }

    // Check current connection status
    checkCurrentConnection();

    // Get connection statistics
    setConnectionStats(Utils.getConnectionStats());
    
    // Get device network information
    fetchNetworkInfo();
  }, []);
  
  const fetchNetworkInfo = async () => {
    try {
      const netInfo = await NetInfo.fetch();
      console.log('Network Info:', netInfo);
      setLocalNetworkInfo(netInfo);
    } catch (error) {
      console.error('Error fetching network info:', error);
    }
  };

  const checkCurrentConnection = async () => {
    setLoading(true);
    try {
      const apiUrls = getApiUrl();
      const result = await checkServerConnection(apiUrls);
      
      setConnectionStatus(result.status);
      
      if (result.status === 'online' && result.url) {
        // Extract the IP from the URL
        const ip = result.url.replace(/https?:\/\//, '').split(':')[0].replace('/api', '');
        setServerIP(ip);
        if (global.workingApiUrl) {
          console.log('Working API URL found:', global.workingApiUrl);
        }
      }

      // Update connection stats display
      setConnectionStats(Utils.getConnectionStats());
    } catch (error) {
      console.error('Error checking connection:', error);
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    setLoading(true);
    setTestResults(null);
    
    try {
      const results = await testDirectConnection();
      setTestResults(results);
      
      // Check if any connection was successful
      const anySuccess = Object.values(results).some(result => result.success);
      setConnectionStatus(anySuccess ? 'online' : 'offline');
      
      // Update connection stats display
      setConnectionStats(Utils.getConnectionStats());
      
      if (!anySuccess) {
        Alert.alert(
          'Connection Failed',
          'Could not connect to any server. Please check that your server is running and you\'re on the same network.',
          [
            { text: 'OK' },
            {
              text: 'Set IP Manually',
              onPress: () => setModalVisible(true)
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      Alert.alert('Error', `Connection test failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Quick test with an extremely short timeout for faster testing
  const testQuickConnection = async () => {
    setLoading(true);
    setTestResults(null);
    
    try {
      // Prioritize getting server IP from expo-constants
      let serverIP = IPConfig.getServerIP();
      
      // If not obtained through expo-constants, try using the set server IP
      if (!serverIP) {
        serverIP = global.serverIP;
        
        // If still not available, try using the device's own IP
        if (!serverIP) {
          const netInfo = await NetInfo.fetch();
          if (netInfo?.details?.ipAddress) {
            serverIP = netInfo.details.ipAddress;
          }
        }
      }
      
      if (!serverIP) {
        Alert.alert('Error', 'Unable to get server IP address. Please set it manually or use network scanning.');
        setLoading(false);
        return;
      }
      
      const url = `http://${serverIP}:5001/api`;
      
      // First try ping which is much faster
      console.log(`Quick connection test using ping to: ${url}`);
      const pingResult = await pingServer(url);
      
      if (pingResult) {
        console.log('Ping test successful!');
        global.workingApiUrl = url;
        Utils.recordSuccessfulConnection(global.workingApiUrl);
        setConnectionStatus('online');
        Alert.alert('Success', `Successfully connected to ${url}!`);
        
        // Update connection stats
        setConnectionStats(Utils.getConnectionStats());
        setLoading(false);
        return;
      }
      
      console.log('Ping test failed, trying full health check...');
      const healthUrl = url.replace('/api', '/health');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3-second timeout for quick test
      
      try {
        const response = await fetch(healthUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Quick health check successful:', data);
          // Store the working URL globally
          global.workingApiUrl = url;
          Utils.recordSuccessfulConnection(global.workingApiUrl);
          setConnectionStatus('online');
          Alert.alert('Success', `Successfully connected to ${url}!`);
        } else {
          console.log(`Failed with status ${response.status}`);
          setConnectionStatus('offline');
          Alert.alert('Connection Failed', `Server returned status code: ${response.status}`);
        }
      } catch (error) {
        console.log('Error in quick test:', error.message);
        setConnectionStatus('offline');
        Alert.alert('Connection Failed', `Could not connect to ${healthUrl}: ${error.message}`);
      }
      
      // Update connection stats
      setConnectionStats(Utils.getConnectionStats());
    } catch (error) {
      console.error('Error in quick test:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Specific test for ping only - ultra lightweight
  const testPingOnly = async () => {
    setLoading(true);
    
    try {
      // Prioritize getting server IP from expo-constants
      let serverIP = IPConfig.getServerIP();
      
      // If not obtained through expo-constants, try using the set server IP
      if (!serverIP) {
        serverIP = global.serverIP;
        
        // If still not available, try using the device's own IP
        if (!serverIP) {
          const netInfo = await NetInfo.fetch();
          if (netInfo?.details?.ipAddress) {
            serverIP = netInfo.details.ipAddress;
          }
        }
      }
      
      if (!serverIP) {
        Alert.alert('Error', 'Unable to get server IP address. Please set it manually or use network scanning.');
        setLoading(false);
        return;
      }
      
      const url = `http://${serverIP}:5001/api`;
      
      console.log(`Testing ping to: ${url}`);
      const pingResult = await pingServer(url);
      
      if (pingResult) {
        console.log('Ping successful!');
        global.workingApiUrl = url;
        Utils.recordSuccessfulConnection(global.workingApiUrl);
        setConnectionStatus('online');
        Alert.alert('Ping Successful', `Server at ${serverIP} responded to ping!`);
      } else {
        console.log('Ping failed');
        setConnectionStatus('offline');
        Alert.alert('Ping Failed', `Server at ${serverIP} did not respond to ping`);
      }
      
      // Update connection stats
      setConnectionStats(Utils.getConnectionStats());
    } catch (error) {
      console.error('Error in ping test:', error);
      Alert.alert('Error', `Ping test error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Specific test for direct laptop connection
  const testLaptopConnection = async () => {
    setLoading(true);
    setTestResults(null);
    
    try {
      // Using expo-constants to get server IP
      const laptopIP = IPConfig.getServerIP();
      if (!laptopIP) {
        Alert.alert('Error', 'Could not get server IP from Expo Constants. Please try another method.');
        setLoading(false);
        return;
      }
      
      const apiUrl = `http://${laptopIP}:5001/api`;
      
      // First try ping which is faster
      console.log(`Testing ping to laptop: ${apiUrl}`);
      const pingResult = await pingServer(apiUrl);
      
      if (pingResult) {
        console.log('Laptop ping successful!');
        global.workingApiUrl = apiUrl;
        global.serverIP = laptopIP;
        Utils.recordSuccessfulConnection(global.workingApiUrl);
        setServerIP(laptopIP);
        setCustomIP(laptopIP);
        setConnectionStatus('online');
        Alert.alert('Success', `Connected to laptop (${apiUrl}) successfully with ping!`);
        
        // Update connection stats
        setConnectionStats(Utils.getConnectionStats());
        setLoading(false);
        return;
      }
      
      console.log('Ping failed, trying full health check to laptop...');
      const url = `http://${laptopIP}:5001/health`;
      
      console.log(`Testing connection to laptop: ${url}`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5-second timeout
      
      try {
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
          console.log('Laptop connection successful:', data);
          // Store the working URL globally
          global.workingApiUrl = url.replace('/health', '/api');
          global.serverIP = laptopIP;
          Utils.recordSuccessfulConnection(global.workingApiUrl);
          setServerIP(laptopIP);
          setCustomIP(laptopIP);
          setConnectionStatus('online');
          Alert.alert('Success', `Connected to laptop (${url}) successfully!`);
        } else {
          console.log(`Failed with status ${response.status}`);
          setConnectionStatus('offline');
          Alert.alert('Connection Failed', `Laptop responded with status: ${response.status}`);
        }
      } catch (error) {
        console.log('Error connecting to laptop:', error.message);
        setConnectionStatus('offline');
        Alert.alert('Connection Failed', `Could not connect to laptop (${url}): ${error.message}`);
      }
      
      // Update connection stats
      setConnectionStats(Utils.getConnectionStats());
    } catch (error) {
      console.error('Error testing laptop connection:', error);
    } finally {
      setLoading(false);
    }
  };

  // Add network scanning functionality
  const scanForServer = async () => {
    setLoading(true);
    setTestResults(null);
    
    try {
      Alert.alert(
        "Scanning Network",
        "Scanning local network for the server. This may take a few moments...",
        [{ text: "OK" }]
      );
      
      const scanResult = await scanNetworkForServer();
      
      if (scanResult.status === 'online') {
        console.log('Server found:', scanResult);
        setServerIP(scanResult.ip);
        setCustomIP(scanResult.ip);
        setConnectionStatus('online');
        
        // Update connection stats
        setConnectionStats(Utils.getConnectionStats());
        
        Alert.alert(
          "Server Found!",
          `Successfully found server at IP ${scanResult.ip}. The app is now connected to this server.`,
          [{ text: "Great!" }]
        );
      } else {
        console.log('Server scan result:', scanResult);
        setConnectionStatus('offline');
        
        Alert.alert(
          "Server Not Found",
          "Could not find the server on your local network. Make sure your phone and laptop are connected to the same WiFi network and the server is running.",
          [
            { text: "OK" },
            {
              text: "Set IP Manually",
              onPress: () => setModalVisible(true)
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error scanning for server:', error);
      Alert.alert('Error', `Could not scan network: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const saveCustomIP = (ip) => {
    // Save the IP globally
    global.serverIP = ip;
    setServerIP(ip);
    setCustomIP(ip);
    
    // Clear any cached working URL
    Utils.clearConnectionCache();
    
    Alert.alert(
      'IP Saved',
      `Server IP set to ${ip}. The app will now try to connect to this server.`,
      [
        { text: 'OK' },
        { 
          text: 'Test Connection',
          onPress: testConnection
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Server Connection Settings</Text>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color="#666" />
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.statusContainer}>
        <Text style={styles.statusLabel}>Connection Status:</Text>
        <View style={styles.statusIndicatorContainer}>
          {loading ? (
            <ActivityIndicator size="small" color="#6C63FF" />
          ) : (
            <>
              <View 
                style={[
                  styles.statusIndicator, 
                  connectionStatus === 'online' 
                    ? styles.statusOnline 
                    : connectionStatus === 'offline' 
                      ? styles.statusOffline 
                      : styles.statusUnknown
                ]} 
              />
              <Text style={styles.statusText}>
                {connectionStatus === 'online' 
                  ? 'Connected' 
                  : connectionStatus === 'offline' 
                    ? 'Disconnected' 
                    : 'Unknown'}
              </Text>
            </>
          )}
        </View>
      </View>
      
      {/* Network Information Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Network Information</Text>
        {localNetworkInfo ? (
          <>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Network Type:</Text>
              <Text style={styles.infoValue}>{localNetworkInfo.type}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Connected:</Text>
              <Text style={styles.infoValue}>
                {localNetworkInfo.isConnected ? 'Yes' : 'No'}
              </Text>
            </View>
            {localNetworkInfo.details?.ipAddress && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Your IP:</Text>
                <Text style={styles.infoValue}>{localNetworkInfo.details.ipAddress}</Text>
              </View>
            )}
            <TouchableOpacity 
              style={[styles.button, styles.primaryButton, {marginTop: 12}]} 
              onPress={fetchNetworkInfo} 
              disabled={loading}
            >
              <FontAwesome name="refresh" size={16} color="white" style={styles.buttonIcon} />
              <Text style={styles.buttonText}>Refresh Network Info</Text>
            </TouchableOpacity>
          </>
        ) : (
          <Text style={styles.description}>Loading network information...</Text>
        )}
      </View>
      
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Current Server</Text>
        <View style={styles.serverInfoContainer}>
          <FontAwesome name="server" size={18} color="#6C63FF" style={styles.icon} />
          <Text style={styles.serverIP}>{serverIP || 'Not set'}</Text>
        </View>
        
        {global.workingApiUrl && (
          <View style={styles.serverInfoContainer}>
            <FontAwesome name="check-circle" size={18} color="green" style={styles.icon} />
            <Text style={styles.serverInfo}>Working URL: {global.workingApiUrl}</Text>
          </View>
        )}
        
        {/* Add Network Scan button - make this prominent */}
        <TouchableOpacity 
          style={[styles.button, styles.scanButton, {marginBottom: 10}]} 
          onPress={scanForServer} 
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              <FontAwesome name="wifi" size={16} color="white" style={styles.buttonIcon} />
              <Text style={styles.buttonText}>Scan Network for Server</Text>
            </>
          )}
        </TouchableOpacity>
        
        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={[styles.button, styles.primaryButton]} 
            onPress={testConnection} 
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <FontAwesome name="refresh" size={16} color="white" style={styles.buttonIcon} />
                <Text style={styles.buttonText}>Test Connection</Text>
              </>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, styles.quickButton]} 
            onPress={testQuickConnection} 
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <FontAwesome name="bolt" size={16} color="white" style={styles.buttonIcon} />
                <Text style={styles.buttonText}>Quick Test</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
        
        {/* New Row for Ping and Laptop buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={[styles.button, styles.pingButton]} 
            onPress={testPingOnly} 
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <FontAwesome name="signal" size={16} color="white" style={styles.buttonIcon} />
                <Text style={styles.buttonText}>Ping Only</Text>
              </>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, styles.laptopButton]} 
            onPress={testLaptopConnection} 
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <FontAwesome name="laptop" size={16} color="white" style={styles.buttonIcon} />
                <Text style={styles.buttonText}>Connect to Laptop</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Manual IP Configuration</Text>
        <Text style={styles.description}>
          If the app can't connect to the server automatically, you can manually set the server IP address here.
        </Text>
        
        <TouchableOpacity 
          style={styles.ipButton} 
          onPress={() => setModalVisible(true)}
        >
          <View style={styles.ipButtonContent}>
            <FontAwesome name="server" size={16} color="#6C63FF" style={styles.buttonIcon} />
            <Text style={styles.ipButtonText}>
              {customIP ? customIP : "Tap to set server IP address"}
            </Text>
          </View>
          <MaterialIcons name="edit" size={20} color="#6C63FF" />
        </TouchableOpacity>
        
        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={[styles.button, styles.secondaryButton]} 
            onPress={() => Utils.clearConnectionCache()} 
            disabled={loading || !global.workingApiUrl}
          >
            <FontAwesome name="eraser" size={16} color="white" style={styles.buttonIcon} />
            <Text style={styles.buttonText}>Clear Cache</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, styles.warningButton]} 
            onPress={() => {
              Utils.resetConnectionStats();
              setConnectionStats({});
            }} 
            disabled={loading}
          >
            <FontAwesome name="trash" size={16} color="white" style={styles.buttonIcon} />
            <Text style={styles.buttonText}>Reset Stats</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Connection Statistics Card */}
      {Object.keys(connectionStats).length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Connection Statistics</Text>
          <Text style={styles.description}>
            URLs with higher counts have been more reliable in past connection attempts.
          </Text>
          
          {Object.entries(connectionStats).map(([url, count], index) => (
            <View key={index} style={styles.statItem}>
              <View style={styles.statLeftContent}>
                <FontAwesome 
                  name="check-circle" 
                  size={14} 
                  color="green" 
                  style={styles.statIcon} 
                />
                <Text style={styles.statUrl} numberOfLines={1} ellipsizeMode="middle">
                  {url}
                </Text>
              </View>
              <View style={styles.statBadge}>
                <Text style={styles.statCount}>{count}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
      
      {testResults && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Connection Test Results</Text>
          {Object.entries(testResults).map(([url, result], index) => (
            <View key={index} style={styles.resultItem}>
              <View style={styles.resultHeader}>
                <FontAwesome 
                  name={result.success ? "check-circle" : "times-circle"} 
                  size={16} 
                  color={result.success ? "green" : "red"} 
                  style={styles.resultIcon} 
                />
                <Text 
                  style={[
                    styles.resultUrl, 
                    result.success ? styles.successText : styles.failureText
                  ]}
                >
                  {url}
                </Text>
              </View>
              
              {result.success ? (
                <Text style={styles.successDetail}>Connected successfully</Text>
              ) : (
                <Text style={styles.failureDetail}>
                  {result.error || `Failed with status ${result.status || 'unknown'}`}
                </Text>
              )}
            </View>
          ))}
        </View>
      )}
      
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Troubleshooting Tips</Text>
        <View style={styles.tipContainer}>
          <FontAwesome name="info-circle" size={16} color="#6C63FF" style={styles.tipIcon} />
          <Text style={styles.tip}>
            If your laptop's IP address changes, use the "Scan Network" button to automatically find it again.
          </Text>
        </View>
        <View style={styles.tipContainer}>
          <FontAwesome name="info-circle" size={16} color="#6C63FF" style={styles.tipIcon} />
          <Text style={styles.tip}>
            Your phone IP: {localNetworkInfo?.details?.ipAddress || 'Unknown'}
          </Text>
        </View>
        <View style={styles.tipContainer}>
          <FontAwesome name="info-circle" size={16} color="#6C63FF" style={styles.tipIcon} />
          <Text style={styles.tip}>
            Laptop IP: {IPConfig.getServerIP() || 'Unknown'} - Make sure your phone and laptop are on the same network.
          </Text>
        </View>
        <View style={styles.tipContainer}>
          <FontAwesome name="info-circle" size={16} color="#6C63FF" style={styles.tipIcon} />
          <Text style={styles.tip}>
            Check that the server is running and listening on port 5001.
          </Text>
        </View>
        <View style={styles.tipContainer}>
          <FontAwesome name="info-circle" size={16} color="#6C63FF" style={styles.tipIcon} />
          <Text style={styles.tip}>
            If using a custom IP, make sure it's entered correctly in the format xxx.xxx.xxx.xxx.
          </Text>
        </View>
        <View style={styles.tipContainer}>
          <FontAwesome name="info-circle" size={16} color="#6C63FF" style={styles.tipIcon} />
          <Text style={styles.tip}>
            If you're experiencing "Aborted" errors, try the "Quick Test" button which uses a shorter timeout.
          </Text>
        </View>
      </View>
      
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.footerButton} 
          onPress={() => {
            if (onClose) onClose();
            if (navigation) navigation.goBack();
          }}
        >
          <Text style={styles.footerButtonText}>Done</Text>
        </TouchableOpacity>
      </View>

      {/* IP Address Input Modal */}
      <ServerIPModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSave={saveCustomIP}
        currentIP={customIP}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginRight: 10,
  },
  statusIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusOnline: {
    backgroundColor: '#4caf50',
  },
  statusOffline: {
    backgroundColor: '#f44336',
  },
  statusUnknown: {
    backgroundColor: '#ffeb3b',
  },
  statusText: {
    fontSize: 16,
    fontWeight: '500',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  serverInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  icon: {
    marginRight: 10,
  },
  serverIP: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  serverInfo: {
    fontSize: 14,
    color: '#666',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  ipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  ipButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ipButtonText: {
    fontSize: 16,
    color: '#333',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  button: {
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    flex: 1,
  },
  primaryButton: {
    backgroundColor: '#6C63FF',
    marginRight: 8,
  },
  quickButton: {
    backgroundColor: '#ff9800',
    marginLeft: 8,
  },
  pingButton: {
    backgroundColor: '#4CAF50',
    marginRight: 8,
  },
  laptopButton: {
    backgroundColor: '#2196f3',
    marginLeft: 8,
  },
  secondaryButton: {
    backgroundColor: '#78909c',
    marginRight: 8,
  },
  warningButton: {
    backgroundColor: '#f44336',
    marginLeft: 8,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  resultItem: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 4,
    padding: 12,
    marginBottom: 8,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  resultIcon: {
    marginRight: 8,
  },
  resultUrl: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  successText: {
    color: 'green',
  },
  failureText: {
    color: 'red',
  },
  successDetail: {
    fontSize: 13,
    color: 'green',
    marginLeft: 24,
  },
  failureDetail: {
    fontSize: 13,
    color: '#666',
    marginLeft: 24,
  },
  tipContainer: {
    flexDirection: 'row',
    marginBottom: 10,
    alignItems: 'flex-start',
  },
  tipIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  tip: {
    fontSize: 14,
    color: '#555',
    flex: 1,
    lineHeight: 20,
  },
  footer: {
    marginTop: 10,
    marginBottom: 30,
    alignItems: 'center',
  },
  footerButton: {
    backgroundColor: '#6C63FF',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  footerButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  // Stats items
  statItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingVertical: 8,
  },
  statLeftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statIcon: {
    marginRight: 8,
  },
  statUrl: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  statBadge: {
    backgroundColor: '#e0f2f1',
    borderRadius: 12,
    paddingVertical: 3,
    paddingHorizontal: 8,
    marginLeft: 8,
  },
  statCount: {
    color: '#00897b',
    fontWeight: 'bold',
    fontSize: 12,
  },
  // Network info styles
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#555',
    fontWeight: '600',
    width: 100,
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  scanButton: {
    backgroundColor: '#009688',
    marginVertical: 10,
    paddingVertical: 15,
  },
});

export default ServerSettings; 