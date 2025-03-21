import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, Keyboard } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getApiUrl, checkServerConnection } from '../utils';
import { FontAwesome } from '@expo/vector-icons';

// Get the appropriate API URL based on the environment
const API_URLS = getApiUrl();
let WORKING_URL = null;

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [serverStatus, setServerStatus] = useState('checking');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberPassword, setRememberPassword] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [resendingEmail, setResendingEmail] = useState(false);
  const router = useRouter();
  const params = useLocalSearchParams();

  // Check if user was redirected after verification
  useEffect(() => {
    if (params.verified === 'true') {
      Alert.alert(
        'Email Verified',
        'Your email has been verified successfully. You can now log in.',
        [{ text: 'OK' }]
      );
    }
  }, [params]);

  // Load saved credentials if available
  useEffect(() => {
    const loadSavedCredentials = async () => {
      try {
        const savedEmail = await AsyncStorage.getItem('savedEmail');
        const savedPassword = await AsyncStorage.getItem('savedPassword');
        
        if (savedEmail) {
          setEmail(savedEmail);
          setRememberPassword(true);
        }
        
        if (savedPassword) {
          setPassword(savedPassword);
        }
      } catch (error) {
        console.error('Error loading saved credentials:', error);
      }
    };
    
    loadSavedCredentials();
  }, []);

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
        
        const data = await response.json();
        
        if (!response.ok) {
          console.log('Login error data:', data);
          
          // Check if the user needs to verify their email
          if (response.status === 403 && data.requiresVerification) {
            setNeedsVerification(true);
            setVerificationEmail(data.email || email);
            setError('');
          } else {
            setError(data.message || 'Login failed');
          }
          
          setLoading(false);
          return;
        }
        
        console.log('Login successful');
        
        // Save credentials if remember password is checked
        if (rememberPassword) {
          await AsyncStorage.setItem('savedEmail', email);
          await AsyncStorage.setItem('savedPassword', password);
        } else {
          // Clear saved credentials if not checked
          await AsyncStorage.removeItem('savedEmail');
          await AsyncStorage.removeItem('savedPassword');
        }
        
        // Store token
        await AsyncStorage.setItem('token', data.token);
        await AsyncStorage.setItem('user', JSON.stringify(data.user));
        
        setLoading(false);
        
        // Check if the user has completed the welcome flow
        const welcomeCompleted = await AsyncStorage.getItem('welcomeCompleted');
        console.log('Welcome completed status:', welcomeCompleted);
        
        // If the user is logging in for the first time, redirect to welcome page
        if (!welcomeCompleted) {
          console.log('First time login detected, redirecting to welcome page');
          
          try {
            // Verify that the welcome route exists
            router.replace('/screens/welcome');
            console.log('Navigation to welcome page initiated');
          } catch (navError) {
            console.error('Error navigating to welcome page:', navError);
            // Fallback to home if welcome page navigation fails
            router.replace('/screens/(tabs)/home');
          }
        } else {
          console.log('Welcome already completed, redirecting to home page');
          // Navigate to home screen after successful login
          router.replace('/screens/(tabs)/home');
        }
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

  const resendVerificationEmail = async () => {
    try {
      setResendingEmail(true);
      
      // Use the working URL if available, otherwise try all URLs
      const apiUrl = WORKING_URL || global.workingApiUrl || API_URLS[0];
      
      const response = await fetch(`${apiUrl}/auth/resend-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: verificationEmail || email
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        Alert.alert(
          'Verification Email Sent',
          'Please check your inbox for the verification link.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Error',
          data.message || 'Failed to resend verification email',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error resending verification email:', error);
      Alert.alert(
        'Error',
        'Failed to resend verification email. Please try again later.',
        [{ text: 'OK' }]
      );
    } finally {
      setResendingEmail(false);
    }
  };

  const navigateToSignup = () => {
    // Prevent multiple rapid taps
    if (loading) return;
    
    setLoading(true);
    
    // Dismiss keyboard first to prevent UI issues
    Keyboard.dismiss();
    
    // Add a delay after keyboard dismissal to ensure UI stability
    setTimeout(() => {
      // Use push with fade animation
      router.push('/screens/signup');
      
      // Reset loading state after navigation completes
      setTimeout(() => {
        setLoading(false);
      }, 300);
    }, 300);
  };

  // Add navigation to connection test screen
  const goToConnectionTest = () => {
    router.push('/screens/connection-test');
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleRememberPassword = () => {
    setRememberPassword(!rememberPassword);
  };

  // If user needs to verify email, show verification screen
  if (needsVerification) {
    return (
      <SafeAreaView style={styles.container}>
        <TouchableOpacity 
          activeOpacity={1} 
          style={styles.contentContainer} 
          onPress={Keyboard.dismiss}
        >
          <Text style={styles.title}>Email Verification Required</Text>
          
          <View style={styles.verificationContainer}>
            <Text style={styles.verificationText}>
              Please verify your email address before logging in. We've sent a verification link to:
            </Text>
            
            <Text style={styles.emailText}>{verificationEmail || email}</Text>
            
            <Text style={styles.verificationText}>
              Check your inbox and click the verification link to complete the signup process.
            </Text>
            
            <TouchableOpacity 
              style={styles.resendButton} 
              onPress={resendVerificationEmail}
              disabled={resendingEmail}
            >
              {resendingEmail ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.resendButtonText}>Resend Verification Email</Text>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => setNeedsVerification(false)}
            >
              <Text style={styles.backButtonText}>Back to Login</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
      >
        <TouchableOpacity 
          activeOpacity={1} 
          style={styles.contentContainer} 
          onPress={Keyboard.dismiss}
        >
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
            
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity 
                style={styles.eyeIcon} 
                onPress={togglePasswordVisibility}
              >
                <FontAwesome 
                  name={showPassword ? 'eye' : 'eye-slash'} 
                  size={20} 
                  color="#666" 
                />
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity 
              style={styles.rememberContainer} 
              onPress={toggleRememberPassword}
            >
              <View style={styles.checkbox}>
                {rememberPassword && (
                  <FontAwesome name="check" size={14} color="#6c63ff" />
                )}
              </View>
              <Text style={styles.rememberText}>Remember password</Text>
            </TouchableOpacity>
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
        </TouchableOpacity>
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
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 25,
    marginBottom: 15,
  },
  passwordInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 20,
    fontSize: 16,
  },
  eyeIcon: {
    padding: 10,
    marginRight: 5,
  },
  rememberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: '#6c63ff',
    borderRadius: 4,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rememberText: {
    fontSize: 14,
    color: '#666',
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
  },
  verificationContainer: {
    width: '100%',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
  },
  verificationText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 15,
  },
  emailText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6c63ff',
    marginBottom: 15,
  },
  resendButton: {
    backgroundColor: '#6c63ff',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginTop: 10,
    marginBottom: 15,
  },
  resendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    paddingVertical: 10,
  },
  backButtonText: {
    color: '#666',
    fontSize: 16,
    textDecorationLine: 'underline',
  }
}); 