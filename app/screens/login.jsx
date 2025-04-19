import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, Keyboard } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getApiUrl, checkServerConnection } from '../utils';
import { FontAwesome } from '@expo/vector-icons';
import platformHelpers from '../utils/platformHelpers';

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

  // Web-specific fixes for input focus and cursor issues
  useEffect(() => {
    if (platformHelpers.isWeb) {
      // Create a style element to add CSS rules for proper cursor behavior
      const style = document.createElement('style');
      style.textContent = `
        /* Global reset for inputs */
        input, textarea {
          box-sizing: border-box !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        
        /* Make single inputs look good */
        .form-input {
          display: block !important;
          width: 100% !important;
          height: 50px !important; 
          padding: 0 20px !important;
          margin-bottom: 15px !important;
          border: 1px solid #ddd !important;
          border-radius: 25px !important;
          font-size: 16px !important;
          color: #000 !important;
          background-color: #fff !important;
          box-shadow: none !important;
          cursor: text !important;
          outline: none !important;
        }
        
        /* Fix password container */
        .password-container {
          display: flex !important;
          align-items: center !important;
          width: 100% !important;
          height: 50px !important;
          margin-bottom: 15px !important;
          padding: 0 !important;
          border: 1px solid #ddd !important;
          border-radius: 25px !important;
          background-color: #fff !important;
          position: relative !important;
        }
        
        /* Password input inside container */
        .password-input {
          flex: 1 !important;
          height: 100% !important;
          padding: 0 50px 0 20px !important;
          border: none !important;
          background: transparent !important;
          font-size: 16px !important;
          color: #000 !important;
          outline: none !important;
        }
        
        /* Eye icon - IMPORTANT STYLES */
        .eye-icon {
          position: absolute !important;
          right: 0 !important;
          top: 0 !important;
          width: 50px !important;
          height: 50px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          background: transparent !important;
          border: none !important;
          cursor: pointer !important;
          z-index: 10 !important;
          pointer-events: auto !important;
        }
        
        /* More direct eye icon target */
        .password-container > [role="button"],
        .passwordContainer > [role="button"] {
          position: absolute !important;
          right: 0 !important;
          top: 0 !important;
          width: 50px !important;
          height: 50px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          background: transparent !important;
          z-index: 10 !important;
        }
        
        /* Fix placeholder color */
        ::placeholder {
          color: #bbbbbb !important;
          opacity: 1 !important;
        }

        /* Fix for double inputs in React Native Web */
        input[type="email"], input[type="text"], input[type="password"] {
          display: block !important;
          opacity: 1 !important;
          position: static !important;
        }

        /* Even more specific eye icon targeting */
        [data-testid="password-toggle-button"],
        button svg,
        div[role="button"] svg,
        .eye-icon svg,
        .eye-icon-btn svg,
        svg[class*="FontAwesome"],
        .passwordContainer svg {
          position: absolute !important;
          top: 50% !important;
          left: 50% !important;
          transform: translate(-50%, -50%) !important;
          color: #666 !important;
          z-index: 20 !important;
          pointer-events: none !important;
          width: 20px !important;
      `;
      document.head.appendChild(style);
      
      // Function to apply our custom styling
      const applyCustomStyling = () => {
        // Clean up any mess that might have been caused by multiple renders
        document.querySelectorAll('input').forEach(input => {
          // Make sure siblings are properly stacked
          const parent = input.parentElement;
          if (parent) {
            Array.from(parent.children).forEach(child => {
              if (child !== input && child.tagName === 'INPUT') {
                child.style.display = 'none';
              }
            });
          }
        });
        
        // Single inputs (like email)
        const singleInputs = document.querySelectorAll('input[type="email"], input[type="text"]');
        singleInputs.forEach(input => {
          input.classList.add('form-input');
        });
        
        // Password containers - more forceful approach
        const passwordContainers = document.querySelectorAll('.passwordContainer');
        passwordContainers.forEach(container => {
          container.classList.add('password-container');
          
          // Find password input inside container
          const input = container.querySelector('input');
          if (input) {
            input.classList.add('password-input');
            input.style.paddingRight = '50px';
          }
          
          // Direct eye icon handling - MORE RELIABLE APPROACH
          const eyeIconElements = container.querySelectorAll('[role="button"], div[role="button"], button');
          eyeIconElements.forEach(icon => {
            icon.className = 'eye-icon'; // Replace any classes
            icon.style.position = 'absolute';
            icon.style.right = '0';
            icon.style.top = '0';
            icon.style.width = '50px';
            icon.style.height = '50px';
            icon.style.display = 'flex';
            icon.style.alignItems = 'center';
            icon.style.justifyContent = 'center';
            icon.style.background = 'transparent';
            icon.style.zIndex = '10'; 
            icon.style.cursor = 'pointer';
            icon.style.border = 'none';
          });
        });
      };
      
      // Apply initially with a delay to ensure DOM is ready
      setTimeout(applyCustomStyling, 100);
      
      // And set up a bigger delay for any race conditions
      setTimeout(applyCustomStyling, 500);
      
      // Run it on resize/orientation change
      window.addEventListener('resize', applyCustomStyling);
      
      // Apply on window load as well
      window.addEventListener('load', applyCustomStyling);
      
      // Clean up
      return () => {
        window.removeEventListener('load', applyCustomStyling);
        window.removeEventListener('resize', applyCustomStyling);
      };
    }
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
          <Text style={[styles.title, { className: 'formTitle' }]}>Log in with your email</Text>
          
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
          
          <View style={[styles.inputContainer, { className: 'formContainer' }]}>
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              {...platformHelpers.isWeb && { type: "email" }}
              {...platformHelpers.getInputProps()}
            />
            
            <View style={[styles.passwordContainer, { className: 'passwordContainer' }]}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                {...platformHelpers.isWeb && { type: showPassword ? "text" : "password" }}
                {...platformHelpers.getInputProps()}
              />
              <TouchableOpacity 
                style={styles.eyeIcon}
                onPress={togglePasswordVisibility}
                {...platformHelpers.isWeb && { 
                  role: "button", 
                  ariaLabel: "Toggle password visibility",
                  className: "eye-icon-btn"
                }}
              >
                <FontAwesome 
                  name={showPassword ? 'eye' : 'eye-slash'} 
                  size={20} 
                  color="#666"
                  style={platformHelpers.isWeb ? {
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)'
                  } : undefined}
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
            {platformHelpers.isWeb ? (
              <button 
                onClick={handleLogin}
                disabled={loading || serverStatus === 'offline'}
                className="login-button"
                style={{
                  width: '100%',
                  height: 50,
                  backgroundColor: '#6c63ff',
                  borderRadius: 25,
                  border: 'none',
                  cursor: 'pointer',
                  color: '#fff',
                  fontSize: 18,
                  fontWeight: 600,
                  marginBottom: 20,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  outline: 'none',
                  position: 'relative',
                  zIndex: 1
                }}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  "Log in"
                )}
              </button>
            ) : (
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
            )}
            
            <View style={[styles.signupContainer, { className: 'linkContainer' }]}>
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
    ...(platformHelpers.isWeb && {
      maxWidth: '100%',
      alignItems: 'center',
      justifyContent: 'center',
    }),
  },
  keyboardAvoidingView: {
    flex: 1,
    ...(platformHelpers.isWeb && {
      maxWidth: 450,
      width: '100%',
    }),
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    ...(platformHelpers.isWeb && {
      width: '100%',
      maxWidth: 450,
      padding: 40,
      boxShadow: 'none',
      borderRadius: 0,
      backgroundColor: '#fff',
    }),
  },
  title: {
    fontSize: 24,
    fontWeight: '500',
    marginBottom: 40,
    color: '#666',
    textAlign: 'center',
  },
  inputContainer: {
    width: '100%',
    marginBottom: 30,
    maxWidth: platformHelpers.isWeb ? 400 : '100%',
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
    backgroundColor: '#fff',
    ...(platformHelpers.isWeb && {
      display: 'block',
      position: 'static',
      zIndex: 'auto'
    })
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
    backgroundColor: '#fff',
    ...(platformHelpers.isWeb && {
      display: 'flex',
      position: 'relative',
      zIndex: 'auto',
      overflow: 'visible'
    })
  },
  passwordInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 20,
    fontSize: 16,
    ...(platformHelpers.isWeb && {
      display: 'block',
      position: 'static',
      zIndex: 'auto',
      backgroundColor: 'transparent',
      border: 'none'
    })
  },
  eyeIcon: {
    padding: 10,
    marginRight: 5,
    zIndex: 2,
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
    backgroundColor: '#fff',
  },
  rememberText: {
    fontSize: 14,
    color: '#666',
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    maxWidth: platformHelpers.getPlatformStyleValue(400, '100%'),
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