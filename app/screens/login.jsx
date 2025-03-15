import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { getApiUrl, checkServerConnection } from '../utils';

// Get the appropriate API URL based on the environment
const API_URLS = getApiUrl();
let WORKING_URL = null;

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [serverStatus, setServerStatus] = useState('checking');
  const router = useRouter();

  // Check if the server is reachable
  useEffect(() => {
    const checkServer = async () => {
      try {
        console.log('Checking server connection...');
        
        // Use the utility function to check server connection
        const connectionStatus = await checkServerConnection(API_URLS);
        console.log('Server connection status:', connectionStatus);
        
        if (connectionStatus.status === 'online') {
          setServerStatus('online');
          // If we got a working URL back, use it
          if (connectionStatus.url) {
            console.log('Using working API URL:', connectionStatus.url);
            WORKING_URL = connectionStatus.url;
          }
        } else {
          setServerStatus('offline');
          setError(connectionStatus.message);
        }
      } catch (error) {
        console.error('Server check failed:', error.message);
        setServerStatus('offline');
        setError('Cannot connect to server. Please check your network connection and server status.');
      }
    };
    
    checkServer();
  }, []);

  const handleLogin = async () => {
    try {
      setLoading(true);
      setError('');
      
      if (!email || !password) {
        setError('Please fill in all fields');
        setLoading(false);
        return;
      }
      
      // Use the working URL if available, otherwise try all URLs
      const apiUrl = WORKING_URL || global.workingApiUrl || API_URLS[0];
      console.log('Attempting login with:', email);
      console.log('Using API URL:', apiUrl);
      
      // Create an abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.log('Login request timed out after 15 seconds');
        setError('Request timed out. Server might be unavailable.');
        setLoading(false);
      }, 15000);
      
      try {
        const response = await fetch(`${apiUrl}/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            password
          }),
          signal: controller.signal
        });
        
        // Clear the timeout since we got a response
        clearTimeout(timeoutId);
        
        console.log('Login response status:', response.status);
        
        if (!response.ok) {
          const errorData = await response.json();
          console.log('Login error data:', errorData);
          setError(errorData.message || 'Login failed');
          setLoading(false);
          return;
        }
        
        const data = await response.json();
        console.log('Login successful');
        
        // Store token
        await AsyncStorage.setItem('token', data.token);
        await AsyncStorage.setItem('user', JSON.stringify(data.user));
        
        setLoading(false);
        // Navigate to home screen after successful login
        router.replace('/screens/(tabs)/home');
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
    } catch (error) {
      console.log('Login error:', error.message);
      setLoading(false);
      
      if (error.name === 'AbortError') {
        setError('Request timed out. Please try again.');
      } else if (error.name === 'TypeError' && error.message.includes('Network request failed')) {
        setError('Network error. Please check your connection and try again.');
        // Try to find another working URL
        const connectionStatus = await checkServerConnection(API_URLS);
        if (connectionStatus.status === 'online' && connectionStatus.url) {
          WORKING_URL = connectionStatus.url;
          setError('Found a new server connection. Please try again.');
        } else {
          setServerStatus('offline');
        }
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
      
      console.log('Error details:', error);
    }
  };

  const navigateToSignup = () => {
    // Use replace instead of push to avoid animation
    router.replace('/screens/signup');
  };

  // Add navigation to connection test screen
  const goToConnectionTest = () => {
    router.push('/screens/connection-test');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <View style={styles.contentContainer}>
          <Text style={styles.title}>Log in with your email</Text>
          
          {serverStatus === 'offline' && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
          
          {serverStatus === 'offline' && (
            <TouchableOpacity style={styles.testButton} onPress={goToConnectionTest}>
              <Text style={styles.testButtonText}>Run Connection Test</Text>
            </TouchableOpacity>
          )}
          
          {error && serverStatus !== 'offline' && (
            <Text style={styles.errorText}>{error}</Text>
          )}
          
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            
            <TextInput
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.button} 
              onPress={handleLogin}
              disabled={loading || serverStatus === 'offline'}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Log in</Text>
              )}
            </TouchableOpacity>
            
            <View style={styles.signupContainer}>
              <Text style={styles.signupText}>No account? </Text>
              <TouchableOpacity onPress={navigateToSignup}>
                <Text style={styles.signupLink}>Sign up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '500',
    marginBottom: 40,
    color: '#666',
  },
  inputContainer: {
    width: '100%',
    marginBottom: 30,
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 25,
    marginBottom: 15,
    paddingHorizontal: 20,
    fontSize: 16,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
  },
  button: {
    width: '100%',
    height: 50,
    backgroundColor: '#6c63ff',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  signupText: {
    fontSize: 16,
    color: '#666',
  },
  signupLink: {
    fontSize: 16,
    color: '#6c63ff',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  errorText: {
    color: 'red',
    marginBottom: 10,
    textAlign: 'center'
  },
  errorContainer: {
    marginBottom: 10,
    padding: 10,
    backgroundColor: '#ffebee',
    borderRadius: 5,
  },
  testButton: {
    backgroundColor: '#6c63ff',
    padding: 12,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 20,
  },
  testButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  }
}); 