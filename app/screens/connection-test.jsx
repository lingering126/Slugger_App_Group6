import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { getApiUrl, checkServerConnection, testDirectConnection } from '../_utils';
import { Stack } from 'expo-router';

export default function ConnectionTestScreen() {
  const [testResults, setTestResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [serverStatus, setServerStatus] = useState(null);
  const [workingUrl, setWorkingUrl] = useState(null);

  const runConnectionTest = async () => {
    setLoading(true);
    try {
      // Test direct connections
      const results = await testDirectConnection();
      setTestResults(results);
      
      // Check if any connection was successful
      const successfulUrl = Object.entries(results).find(([url, result]) => result.success);
      if (successfulUrl) {
        setWorkingUrl(successfulUrl[0].replace('/ip', '/api'));
      }
      
      // Check server connection using standard method
      const apiUrls = getApiUrl();
      const status = await checkServerConnection(apiUrls);
      setServerStatus(status);
      
      if (status.status === 'online') {
        setWorkingUrl(status.url);
      }
    } catch (error) {
      console.error('Test error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runConnectionTest();
  }, []);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Connection Test' }} />
      
      <ScrollView style={styles.scrollView}>
        <Text style={styles.title}>Server Connection Test</Text>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0000ff" />
            <Text style={styles.loadingText}>Testing connections...</Text>
          </View>
        ) : (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Server Status:</Text>
              {serverStatus ? (
                <View style={styles.statusContainer}>
                  <Text style={[
                    styles.statusText, 
                    { color: serverStatus.status === 'online' ? 'green' : 'red' }
                  ]}>
                    {serverStatus.status === 'online' ? 'ONLINE' : 'OFFLINE'}
                  </Text>
                  <Text style={styles.messageText}>{serverStatus.message}</Text>
                  {serverStatus.url && (
                    <Text style={styles.urlText}>Working URL: {serverStatus.url}</Text>
                  )}
                </View>
              ) : (
                <Text>No status information available</Text>
              )}
            </View>
            
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Working URL:</Text>
              <Text style={styles.urlText}>
                {workingUrl || 'No working URL found'}
              </Text>
            </View>
            
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Direct Connection Tests:</Text>
              {testResults ? (
                Object.entries(testResults).map(([url, result]) => (
                  <View key={url} style={styles.resultItem}>
                    <Text style={styles.urlLabel}>{url}</Text>
                    <Text style={[
                      styles.resultStatus,
                      { color: result.success ? 'green' : 'red' }
                    ]}>
                      {result.success ? 'SUCCESS' : 'FAILED'}
                    </Text>
                    {result.error && (
                      <Text style={styles.errorText}>Error: {result.error}</Text>
                    )}
                  </View>
                ))
              ) : (
                <Text>No test results available</Text>
              )}
            </View>
            
            <TouchableOpacity 
              style={styles.button} 
              onPress={runConnectionTest}
              disabled={loading}
            >
              <Text style={styles.buttonText}>Run Test Again</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  statusContainer: {
    alignItems: 'center',
    padding: 10,
  },
  statusText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  messageText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
  },
  urlText: {
    fontSize: 14,
    color: '#0066cc',
    marginTop: 8,
  },
  resultItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 12,
  },
  urlLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  resultStatus: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    color: '#ff6b6b',
    marginTop: 4,
    fontSize: 12,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#007bff',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 