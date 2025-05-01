import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, Keyboard } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getApiUrl, checkServerConnection } from '../utils';
import { FontAwesome } from '@expo/vector-icons';
import axios from 'axios';

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
  const [showVerification, setShowVerification] = useState(false);
  const [verificationToken, setVerificationToken] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
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
        setError('Request timed out. Server might be unavailable.');
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
        
        try {
          // First check if the response is actually JSON by checking the Content-Type header
          const contentType = response.headers.get('Content-Type');
          if (!contentType || !contentType.includes('application/json')) {
            console.error('Response is not JSON. Content-Type:', contentType);
            const responseText = await response.text();
            console.log('Raw response text:', responseText.substring(0, 200)); // Log first 200 chars
            
            if (responseText.includes('please verify your email')) {
              setNeedsVerification(true);
              setVerificationEmail(email);
              setError('');
              setLoading(false);
              return;
            } else {
              throw new Error('Server returned non-JSON response');
            }
          }
          
          data = await response.json();
          console.log('Login response:', {
            status: response.status,
            data: data
          });
          
          if (response.status === 403 && data.requiresVerification) {
            setNeedsVerification(true);
            setVerificationEmail(data.email || email);
            setError('');
            setLoading(false);
            return;
          } else if (!response.ok) {
            // Only set error for failed login attempts
            if (response.status === 400 || response.status === 401) {
              setError('Invalid email or password');
            } else {
              setError(data.message || 'An error occurred during login. Please try again.');
            }
            setLoading(false);
            return;
          }
          
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
          
          // Only store username if it exists
          if (data.user.username) {
            await AsyncStorage.setItem('username', data.user.username);
          }
          
          await AsyncStorage.setItem('user', JSON.stringify(data.user));

          
          console.log('User data stored in AsyncStorage');
          
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
        } catch (parseError) {
          console.error('Error parsing response:', parseError);
          
          try {
            // Try to get the raw text to see what's actually being returned
            const responseText = await response.text();
            console.log('Raw response text for error diagnosis:', responseText.substring(0, 200));
            
            // Check if it's an HTML error page with verification message
            if (responseText.includes('verify your email')) {
              setNeedsVerification(true);
              setVerificationEmail(email);
              setError('');
              setLoading(false);
              return;
            }
          } catch (textError) {
            console.error('Error getting response text:', textError);
          }
          
          if (response.status === 400 || response.status === 401) {
            // Keep the default "Invalid email or password" for auth errors
            setError('Invalid email or password');
          } else if (response.status === 403) {
            setNeedsVerification(true);
            setVerificationEmail(email);
            setError('');
          } else {
            setError('An error occurred during login. Please try again.');
          }
          setLoading(false);
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        console.log('Fetch error details:', fetchError);
        
        // Only show connection errors for actual network issues
        if (fetchError.name === 'AbortError') {
          setError('Connection timed out. Please check your internet connection and try again.');
        } else if (fetchError.name === 'TypeError' && fetchError.message.includes('Network request failed')) {
          setError('Network error. Please check your connection and try again.');
        } else {
          setError('An error occurred during login. Please try again.');
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
      setError('An unexpected error occurred. Please try again later.');
    }
  };

  const resendVerificationEmail = async () => {
    try {
      setResendingEmail(true);
      
      // Use the working URL if available, otherwise try all URLs
      const apiUrl = WORKING_URL || global.workingApiUrl || API_URLS[0];
      console.log('Resending verification email to:', verificationEmail || email);
      console.log('Using API URL:', apiUrl);
      
      // Create an abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.log('Resend request timed out after 15 seconds');
        Alert.alert(
          'Error',
          'Request timed out. Server might be unavailable.',
          [{ text: 'OK' }]
        );
        setResendingEmail(false);
      }, 15000);
      
      const response = await fetch(`${apiUrl}/auth/resend-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: verificationEmail || email
        }),
        signal: controller.signal
      });
      
      // Clear the timeout since we got a response
      clearTimeout(timeoutId);
      
      try {
        // Check if the response is actually JSON
        const contentType = response.headers.get('Content-Type');
        if (!contentType || !contentType.includes('application/json')) {
          console.error('Response is not JSON. Content-Type:', contentType);
          const responseText = await response.text();
          console.log('Raw response text:', responseText.substring(0, 200));
          
          // If we got any kind of response, assume it worked
          if (response.ok) {
            Alert.alert(
              'Verification Email Sent',
              'Please check your inbox for the verification link.\n\nNote: If the link in the email doesn\'t work directly, copy and paste it into your browser.\n\nIMPORTANT: If the link contains "http://10.210.216.34:5001", replace it with "https://slugger-app-group6.onrender.com"',
              [{ text: 'OK' }]
            );
          } else {
            throw new Error('Server returned non-JSON response');
          }
        } else {
          const data = await response.json();
          
          if (response.ok) {
            Alert.alert(
              'Verification Email Sent',
              'Please check your inbox for the verification link.\n\nNote: If the link in the email doesn\'t work directly, copy and paste it into your browser.\n\nIMPORTANT: If the link contains "http://10.210.216.34:5001", replace it with "https://slugger-app-group6.onrender.com"',
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
      } catch (parseError) {
        console.error('Error parsing response:', parseError);
        
        if (response.ok) {
          // If response was OK but we couldn't parse JSON, still consider it successful
          Alert.alert(
            'Verification Email Sent',
            'Please check your inbox for the verification link.\n\nNote: If the link in the email doesn\'t work directly, copy and paste it into your browser.\n\nIMPORTANT: If the link contains "http://10.210.216.34:5001", replace it with "https://slugger-app-group6.onrender.com"',
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert(
            'Error',
            'Failed to resend verification email. Please try again later.',
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

  // Function to handle manual verification
  const handleManualVerification = async () => {
    if (!verificationEmail || !verificationToken) {
      Alert.alert('Error', 'Please enter both email and verification token');
      return;
    }

    try {
      setVerifying(true);
      
      // Make a direct API call to verify the email
      console.log(`Manually verifying: ${verificationEmail} with token: ${verificationToken}`);
      const response = await axios.get(`${API_URL}/auth/verify-manual`, {
        params: {
          email: verificationEmail,
          token: verificationToken
        }
      });
      
      console.log('Verification response:', response.data);
      setVerificationResult({
        success: true,
        message: 'Email verified successfully! You can now log in.'
      });
      
      // Clear the form
      setVerificationEmail('');
      setVerificationToken('');
      
    } catch (error) {
      console.error('Manual verification failed:', error);
      
      let errorMessage = 'Verification failed. Please check your token and try again.';
      
      if (error.response) {
        errorMessage = error.response.data.message || errorMessage;
      }
      
      setVerificationResult({
        success: false,
        message: errorMessage
      });
    } finally {
      setVerifying(false);
    }
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
            
            <Text style={styles.verificationText}>
              <Text style={{fontWeight: 'bold'}}>Important:</Text> If clicking the link in your email doesn't work, the link might contain a local IP address. Please copy the link and manually edit it to use our deployed server URL:
            </Text>
            
            <Text style={[styles.emailText, {fontSize: 14}]}>
              Replace the "http://10.210.216.34:5001" part{'\n'}
              with "https://slugger-app-group6.onrender.com"
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
          
          {/* Manual Email Verification Section */}
          <TouchableOpacity 
            style={styles.verificationToggle}
            onPress={() => setShowVerification(!showVerification)}
          >
            <Text style={styles.verificationToggleText}>
              {showVerification ? 'Hide Email Verification' : 'Need to Verify Your Email?'}
            </Text>
          </TouchableOpacity>
          
          {showVerification && (
            <View style={styles.verificationContainer}>
              <Text style={styles.verificationTitle}>Email Verification</Text>
              <Text style={styles.verificationText}>
                Enter the verification details from your email to activate your account.
              </Text>
              
              <TextInput
                style={styles.input}
                placeholder="Email Address"
                value={verificationEmail}
                onChangeText={setVerificationEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              
              <TextInput
                style={styles.input}
                placeholder="Verification Token"
                value={verificationToken}
                onChangeText={setVerificationToken}
                autoCapitalize="none"
              />
              
              {verificationResult && (
                <Text style={[
                  styles.verificationResultText,
                  verificationResult.success ? styles.verificationSuccess : styles.verificationError
                ]}>
                  {verificationResult.message}
                </Text>
              )}
              
              <TouchableOpacity 
                style={[styles.button, verifying && styles.buttonDisabled]}
                onPress={handleManualVerification}
                disabled={verifying}
              >
                {verifying ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Verify Email</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
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
  },
  verificationToggle: {
    marginTop: 20,
    paddingVertical: 10,
  },
  verificationToggleText: {
    color: '#6A4BFF',
    textAlign: 'center',
    fontWeight: '500',
  },
  verificationContainer: {
    width: '100%',
    backgroundColor: '#f8f8f8',
    padding: 15,
    borderRadius: 8,
    marginVertical: 10,
  },
  verificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  verificationResultText: {
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 10,
    padding: 10,
    borderRadius: 5,
  },
  verificationSuccess: {
    backgroundColor: '#e6f7e6',
    color: '#2e7d32',
  },
  verificationError: {
    backgroundColor: '#ffebee',
    color: '#c62828',
  },
  buttonDisabled: {
    backgroundColor: '#B0B0B0',
  },
}); 
