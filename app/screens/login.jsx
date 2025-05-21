import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, Keyboard } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getApiUrl, checkServerConnection } from '../utils';
import { FontAwesome } from '@expo/vector-icons';
import CustomTextInput from '../components/CustomTextInput';

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
  const [showVerificationPrompt, setShowVerificationPrompt] = useState(false);
  const [verificationPromptEmail, setVerificationPromptEmail] = useState('');
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
        setError('Cannot connect to server. Please check your network connection and server status.\n Mostly it is because the server has cold start delay. Please wait around 30 seconds then refresh the page and try again.');
      }
    };
    
    checkServer();
  }, []);

  const handleLogin = async () => {
    try {
      setLoading(true);
      setError('');
      
      if (!email || !password) {
        setError('Please enter both email and password');
        setLoading(false);
        return;
      }

      if (!email.includes('@')) {
        setError('Please enter a valid email address');
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
        setError('Request timed out. Server might be unavailable.\n Mostly it is because the server has cold start delay. Please wait around 30 seconds then refresh the page and try again.');
        setLoading(false);
      }, 15000);
      
      let response, data;
      
      try {
        response = await fetch(`${apiUrl}/auth/login`, {
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
        
        // Check if response might be HTML instead of JSON
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('text/html')) {
          console.error('Server returned HTML instead of JSON');
          setError('Server error. Please try again later.\n Mostly it is because the server has cold start delay. Please wait around 30 seconds then refresh the page and try again.');
          setLoading(false);
          return;
        }
        
        try {
          // Now try to parse JSON
          data = await response.json();
          console.log('Login response:', {
            status: response.status,
            data: data
          });
          
          // Default error message for auth failures
          if (!response.ok) {
            if (response.status === 403 && data.requiresVerification) {
              setNeedsVerification(true);
              setVerificationEmail(data.email || email);
              setError('');
            } else if (response.status === 400 || response.status === 401) {
              // Authentication error
              setError('Invalid email or password');
            } else {
              setError(data.message || 'An error occurred during login. Please try again.\n Mostly it is because the server has cold start delay. Please wait around 30 seconds then refresh the page and try again.');
            }
            setLoading(false);
            return;
          }
          
          // Clear any error message on success
          setError('');
          
          // Process successful login
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
          
          // Store user data
          await AsyncStorage.setItem('userToken', data.token);
          await AsyncStorage.setItem('userId', data.user.id);
          
          // Only store username if it exists in the response
          if (data.user.username) {
            await AsyncStorage.setItem('username', data.user.username);
          } else if (data.user.name) {
            // Use name as fallback for username if username is not provided
            await AsyncStorage.setItem('username', data.user.name);
          }
          
          await AsyncStorage.setItem('user', JSON.stringify(data.user));
          
          console.log('User data stored in AsyncStorage');
          
          // Check if the user has completed the welcome flow
          const welcomeCompleted = await AsyncStorage.getItem('welcomeCompleted');
          console.log('Welcome completed status:', welcomeCompleted);
          
          // If the user is logging in for the first time or welcomeCompleted is not set, redirect to welcome page
          if (welcomeCompleted !== 'true') {
            console.log('First time login detected, redirecting to welcome page');
            
            // Set a userIsNew flag in AsyncStorage to mark this as a new user
            await AsyncStorage.setItem('userIsNew', 'true');
            
            try {
              // Verify that the welcome route exists and navigate to it
              router.replace('/screens/welcome');
              console.log('Navigation to welcome page initiated');
            } catch (navError) {
              console.error('Error navigating to welcome page:', navError);
              // Fallback to home if welcome page navigation fails
              await AsyncStorage.setItem('welcomeCompleted', 'true'); // Mark as completed if we can't show welcome page
              router.replace('/screens/(tabs)/home');
            }
          } else {
            console.log('Welcome already completed, redirecting to home page');
            // Navigate to home screen after successful login
            router.replace('/screens/(tabs)/home');
          }
        } catch (parseError) {
          console.error('Error parsing response:', parseError);
          setError('Error processing server response. Please try again.\n Mostly it is because the server has cold start delay. Please wait around 30 seconds then refresh the page and try again.');
          setLoading(false);
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        console.log('Fetch error details:', fetchError);
        
        // Only show connection errors for actual network issues
        if (fetchError.name === 'AbortError') {
          setError('Connection timed out. Please check your internet connection and try again.\n Mostly it is because the server has cold start delay. Please wait around 30 seconds then refresh the page and try again.');
        } else if (fetchError.name === 'TypeError' && fetchError.message.includes('Network request failed')) {
          setError('Network error. Please check your connection and try again.\n Mostly it is because the server has cold start delay. Please wait around 30 seconds then refresh the page and try again.');
        } else {
          setError('An error occurred during login. Please try again.\n Mostly it is because the server has cold start delay. Please wait around 30 seconds then refresh the page and try again.');
        }
        
        setLoading(false);
      }
    } catch (error) {
      console.log('General error in login:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        type: typeof error
      });
      setLoading(false);
      // Only show this message if all other error handlers failed
      setError('An unexpected error occurred. Please try again later.\n Mostly it is because the server has cold start delay. Please wait around 30 seconds then refresh the page and try again.');
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
        // Handle test mode where we need to show preview URL
        if (data.testMode && data.previewUrl) {
          Alert.alert(
            'Test Email Sent',
            'The email service is in test mode. Please check the server logs for the verification link preview URL.',
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert(
            'Verification Email Sent',
            'Please check your inbox for the verification link.',
            [{ text: 'OK' }]
          );
        }
      } else {
        // Special handling for Mailgun sandbox domains
        if (data.error === 'unauthorized_recipient') {
          Alert.alert(
            'Email Authorization Required',
            'The email service requires you to authorize your email address first. Please contact the administrator.',
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert(
            'Error',
            data.message || 'Failed to resend verification email',
            [{ text: 'OK' }]
          );
        }
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

  // If showing verification prompt
  if (showVerificationPrompt) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.contentContainer}>
          <Text style={styles.title}>Resend Verification Email</Text>
          
          <View style={styles.verificationContainer}>
            <Text style={styles.verificationText}>
              Enter your email address to receive a new verification link:
            </Text>
            
            <CustomTextInput
              style={styles.input}
              placeholder="Email"
              value={verificationPromptEmail}
              onChangeText={setVerificationPromptEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            
            <TouchableOpacity 
              style={styles.resendButton} 
              onPress={handleVerificationPromptSubmit}
              disabled={resendingEmail}
            >
              {resendingEmail ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.resendButtonText}>Send Verification Email</Text>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => setShowVerificationPrompt(false)}
            >
              <Text style={styles.backButtonText}>Back to Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // If user needs to verify email, show verification screen
  if (needsVerification) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.contentContainer}>
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
        </View>
      </SafeAreaView>
    );
  }

  // Handle resend verification from prompt
  const handleVerificationPromptSubmit = async () => {
    if (!verificationPromptEmail) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(verificationPromptEmail)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }
    
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
          email: verificationPromptEmail
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Handle test mode where we need to show preview URL
        if (data.testMode && data.previewUrl) {
          Alert.alert(
            'Test Email Sent',
            'The email service is in test mode. Please check the server logs for the verification link preview URL.',
            [{ text: 'OK' }]
          );
          setShowVerificationPrompt(false);
          setVerificationPromptEmail('');
        } else {
          Alert.alert(
            'Verification Email Sent',
            'Please check your inbox for the verification link.',
            [{ text: 'OK' }]
          );
          setShowVerificationPrompt(false);
          setVerificationPromptEmail('');
        }
      } else {
        // Special handling for Mailgun sandbox domains
        if (data.error === 'unauthorized_recipient') {
          Alert.alert(
            'Email Authorization Required',
            'The email service requires you to authorize your email address first. Please contact the administrator.',
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert(
            'Error',
            data.message || 'Failed to resend verification email',
            [{ text: 'OK' }]
          );
        }
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

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
      >
        <View style={styles.contentContainer} onStartShouldSetResponder={() => false}>
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
            <CustomTextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            
            <View style={styles.passwordContainer}>
              <CustomTextInput
                style={styles.passwordInput}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                showPassword={showPassword}
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
            
            <TouchableOpacity 
              style={styles.forgotPasswordContainer}
              onPress={() => router.push('/screens/forgot-password')}
            >
              <Text style={styles.forgotPasswordText}>Forgot password?</Text>
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
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 25,
    marginBottom: 15,
    position: 'relative',
  },
  passwordInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 20,
    fontSize: 16,
    paddingRight: 40,
  },
  eyeIcon: {
    padding: 10,
    position: 'absolute',
    right: 5,
    height: '100%',
    justifyContent: 'center',
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
  },
  forgotPasswordContainer: {
    paddingVertical: 10,
  },
  forgotPasswordText: {
    color: '#6c63ff',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
}); 
