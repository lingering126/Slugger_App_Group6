import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator,
  Alert,
  Platform,
  Image
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { userService } from '../../../services/api';

export default function EditProfile() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userData, setUserData] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    bio: '',
    longTermGoal: '', // Added longTermGoal field
  });
  // State for avatar image
  const [avatarSource, setAvatarSource] = useState(null);
  // State to track if we're in offline mode
  const [offlineMode, setOfflineMode] = useState(false);

  // Load user data when component mounts
  useEffect(() => {
    const checkLoginAndLoadData = async () => {
      try {
        setLoading(true);
        
        // Check if user is logged in
        const token = await AsyncStorage.getItem('userToken');
        if (!token) {
          Alert.alert(
            'Login Required', 
            'You need to log in to edit your profile.',
            [{ 
              text: 'Login', 
              onPress: () => router.push('/login')
            }]
          );
          return;
        }
        
        // Try to refresh token if needed
        try {
          // This will import the refreshAuthToken function from the api service
          const { refreshAuthToken } = require('../../../services/api');
          const refreshResult = await refreshAuthToken();
          console.log('Token refresh result:', refreshResult);
          
          // Check if we still have a token after refresh attempt
          const currentToken = await AsyncStorage.getItem('userToken');
          if (!currentToken) {
            throw new Error('Token is missing after refresh attempt');
          }
        } catch (refreshError) {
          console.warn('Failed to refresh token:', refreshError);
          // Might be offline
          setOfflineMode(true);
        }
        
        // Get user data using the API service
        const user = await userService.getUserProfile();
        
        if (!user) {
          throw new Error('User data not found');
        }
        
        // Check if this was loaded from local storage only
        if (user.loadedFromLocalOnly) {
          setOfflineMode(true);
        }
        
        setUserData(user);
        setFormData({
          name: user.name || '',
          email: user.email || '',
          bio: user.bio || '',
          longTermGoal: user.longTermGoal || '', // Load longTermGoal
        });

        // Set avatar source if it exists in user data
        if (user.avatarUrl) {
          setAvatarSource(user.avatarUrl);
        }
      } catch (err) {
        console.error('Error loading user data:', err);
        
        // Try to get any user data from local storage as a fallback
        try {
          const userJson = await AsyncStorage.getItem('user');
          if (userJson) {
            const user = JSON.parse(userJson);
            setUserData(user);
            setFormData({
              name: user.name || '',
              email: user.email || '',
              bio: user.bio || '',
              longTermGoal: user.longTermGoal || '',
            });
            if (user.avatarUrl) {
              setAvatarSource(user.avatarUrl);
            }
            setOfflineMode(true);
          } else {
            Alert.alert('Error', 'Failed to load profile data');
          }
        } catch (localError) {
          Alert.alert('Error', 'Failed to load profile data');
        }
      } finally {
        setLoading(false);
      }
    };
    
    checkLoginAndLoadData();
  }, []);

  // Handle form input changes
  const handleChange = (field, value) => {
    setFormData({
      ...formData,
      [field]: value
    });
  };

  // Handle avatar selection
  const handleChooseAvatar = async () => {
    // For mobile platforms, show a selection menu
    if (Platform.OS !== 'web') {
      const options = ['Take Photo', 'Choose from Library', 'Cancel'];
      Alert.alert(
        'Change Profile Photo',
        'How would you like to update your photo?',
        [
          {
            text: options[0],
            onPress: () => takePhoto(),
          },
          {
            text: options[1],
            onPress: () => pickImage(),
          },
          {
            text: options[2],
            style: 'cancel',
          },
        ]
      );
    } else {
      // For web platform, directly open file picker
      pickImage();
    }
  };

  // Take a photo using camera (mobile only)
  const takePhoto = async () => {
    try {
      // Request camera permission
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow camera access to take a photo');
        return;
      }

      // Launch camera with base64 option
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true, // Request base64 data
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        console.log("Selected image URI:", asset.uri);
        
        const MAX_SIZE_BYTES = 3 * 1024 * 1024; // 3MB

        // Validate file size (max 3MB)
        if (asset.fileSize && asset.fileSize > MAX_SIZE_BYTES) {
          Alert.alert(
            "The image you selected is too large", 
            `Please select an image smaller than ${MAX_SIZE_BYTES / (1024 * 1024)}MB (actual size: ${(asset.fileSize / (1024*1024)).toFixed(2)}MB).`
          );
          return;
        } else if (!asset.fileSize && asset.base64 && (asset.base64.length * 0.75) > MAX_SIZE_BYTES) {
          Alert.alert(
            "The image you selected is too large", 
            `Please select an image smaller than ${MAX_SIZE_BYTES / (1024 * 1024)}MB (estimated size: ${(asset.base64.length * 0.75 / (1024*1024)).toFixed(2)}MB).`
          );
          return;
        }

        // Validate file type (PNG, JPEG, WebP)
        const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
        const fileExtension = asset.uri ? asset.uri.split('.').pop()?.toLowerCase() : '';
        const isAllowedExtension = ['jpg', 'jpeg', 'png', 'webp'].includes(fileExtension);

        if (asset.mimeType && !allowedMimeTypes.includes(asset.mimeType.toLowerCase())) {
          Alert.alert("Unsupported image format", "Please select a PNG, JPEG, or WebP image.");
          return;
        } else if (!asset.mimeType && !isAllowedExtension) {
          Alert.alert("Unsupported image format", "Please select a PNG, JPEG, or WebP image.");
          return;
        }

        if (asset.base64) {
          // Create proper data URI with MIME type
          const dataUriMimeType = asset.mimeType || (isAllowedExtension ? `image/${fileExtension === 'jpg' ? 'jpeg' : fileExtension}` : 'image/jpeg');
          const base64Uri = `data:${dataUriMimeType};base64,${asset.base64}`;
          console.log("Generated base64Uri (first 100 chars):", base64Uri.substring(0, 100) + "...");
          setAvatarSource(base64Uri);
          console.log("New avatar set from camera (converted to base64)");
        } else {
          console.log("Error: asset.base64 is missing.");
          Alert.alert("Error", "Failed to read image data (base64).");
        }
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  // Select image from library (works on all platforms)
  const pickImage = async () => {
    try {
      // Request permission on mobile
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission needed', 'Please allow access to your photo library');
          return;
        }
      }

      // Open image picker with base64 option for mobile
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: Platform.OS !== 'web', // Request base64 for mobile platforms
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        console.log("Selected image URI:", asset.uri);
        
        // For Web/macOS, we need to convert the image to base64
        if (Platform.OS === 'web') {
          try {
            // Get blob from URI
            const response = await fetch(asset.uri);
            const blob = await response.blob();
            
            // Convert blob to base64 using FileReader
            const reader = new FileReader();
            reader.onload = () => {
              const base64data = reader.result;
              console.log("Converted to base64:", base64data.substring(0, 50) + "...");
              setAvatarSource(base64data);
            };
            reader.readAsDataURL(blob);
          } catch (error) {
            console.error("Error converting image:", error);
            Alert.alert("Error", "Failed to process the image");
          }
        } else {
          // For mobile devices, use the base64 data from ImagePicker
          const MAX_SIZE_BYTES = 3 * 1024 * 1024; // 3MB

          // Validate file size (max 3MB)
          if (asset.fileSize && asset.fileSize > MAX_SIZE_BYTES) {
            Alert.alert(
              "The image you selected is too large", 
              `Please select an image smaller than ${MAX_SIZE_BYTES / (1024 * 1024)}MB (actual size: ${(asset.fileSize / (1024*1024)).toFixed(2)}MB).`
            );
            return;
          } else if (!asset.fileSize && asset.base64 && (asset.base64.length * 0.75) > MAX_SIZE_BYTES) {
            Alert.alert(
              "The image you selected is too large", 
              `Please select an image smaller than ${MAX_SIZE_BYTES / (1024 * 1024)}MB (estimated size: ${(asset.base64.length * 0.75 / (1024*1024)).toFixed(2)}MB).`
            );
            return;
          }

          // Validate file type (PNG, JPEG, WebP)
          const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
          const fileExtension = asset.uri ? asset.uri.split('.').pop()?.toLowerCase() : '';
          const isAllowedExtension = ['jpg', 'jpeg', 'png', 'webp'].includes(fileExtension);

          if (asset.mimeType && !allowedMimeTypes.includes(asset.mimeType.toLowerCase())) {
            Alert.alert("Unsupported image format", "Please select a PNG, JPEG, or WebP image.");
            return;
          } else if (!asset.mimeType && !isAllowedExtension) {
            Alert.alert("Unsupported image format", "Please select a PNG, JPEG, or WebP image.");
            return;
          }

          if (asset.base64) {
            // Create proper data URI with MIME type
            const dataUriMimeType = asset.mimeType || (isAllowedExtension ? `image/${fileExtension === 'jpg' ? 'jpeg' : fileExtension}` : 'image/jpeg');
            const base64Uri = `data:${dataUriMimeType};base64,${asset.base64}`;
            console.log("Generated base64Uri (first 100 chars):", base64Uri.substring(0, 100) + "...");
            setAvatarSource(base64Uri);
            console.log("New avatar set from gallery (converted to base64)");
          } else {
            console.log("Error: asset.base64 is missing.");
            Alert.alert("Error", "Failed to read image data (base64).");
          }
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image');
    }
  };

  // Handle form submission - UPDATED to use API and handle fallback success
  const handleSubmit = async () => {
    console.log("handleSubmit triggered"); // Add this log
    try {
      setSaving(true);
      
      // Validate form data
      if (!formData.name.trim()) {
        Alert.alert('Error', 'Name cannot be empty');
        setSaving(false);
        return;
      }
      
      // Add debug logs
      console.log("Avatar source before saving:", typeof avatarSource === 'string' ? 
        (avatarSource.length > 50 ? avatarSource.substring(0, 50) + '...' : avatarSource) : 'null');
      
      // Check token first - if we're in offline mode but have a token, try online update
      const token = await AsyncStorage.getItem('userToken');
      let forcedOfflineMode = false;
      
      if (!token) {
        if (!offlineMode) {
          // We thought we were online but don't have a token - prompt login
          Alert.alert(
            'Login Required', 
            'Your session has expired. Please log in again to update your profile.',
            [{ 
              text: 'Login', 
              onPress: () => router.push('/login')
            }]
          );
          setSaving(false);
          return;
        }
        // If we already know we're offline, force offline mode
        forcedOfflineMode = true;
      }
      
      // Ensure userData has an ID field
      if (!userData || (!userData.id && !userData._id)) {
        console.error("User data is missing ID field:", userData);
        Alert.alert('Error', 'User data is incomplete. Please try logging in again.');
        setSaving(false);
        return;
      }
      
      // Update user data with new values including avatar and longTermGoal
      const updatedUserData = {
        ...userData, // Keep all original fields
        id: userData.id || userData._id, // Ensure ID is preserved
        name: formData.name,
        email: formData.email || userData.email,
        bio: formData.bio,
        longTermGoal: formData.longTermGoal,
        avatarUrl: avatarSource
      };
      
      // Add debug log for complete update data
      console.log("Complete update data being sent:", JSON.stringify({
        ...updatedUserData,
        avatarUrl: updatedUserData.avatarUrl ? '[AVATAR DATA PRESENT]' : null
      }));
      
      // If we're in forced offline mode, skip the API call and go straight to local storage
      if (forcedOfflineMode) {
        console.log("Forced offline mode - skipping API call");
        throw new Error("No authentication token available");
      }
      
      console.log("Calling API to update profile...");
      let result = null;
      let isOnlineUpdate = false;

      // Get token again to ensure it's still there
      const currentToken = await AsyncStorage.getItem('userToken');
      if (!currentToken && !offlineMode) {
        // If token disappeared, handle like other auth errors
        Alert.alert(
          'Session Expired', 
          'Your login session has expired. Please log in again to update your profile.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Login', 
              onPress: () => {
                // Navigate to login screen
                router.push('/login');
              }
            }
          ]
        );
        setSaving(false);
        return;
      }
      
      // Save current token in case it gets overwritten during API operations
      const savedToken = currentToken;
      
      try {
        result = await userService.updateUserProfile(updatedUserData);
        isOnlineUpdate = true;
        console.log("API call completed successfully", JSON.stringify({
          id: result.id,
          name: result.name,
          email: result.email
        }));
        
        // Verify token is still in AsyncStorage after update
        const tokenAfterUpdate = await AsyncStorage.getItem('userToken');
        if (!tokenAfterUpdate && savedToken) {
          console.warn('Token was lost during profile update, restoring it');
          await AsyncStorage.setItem('userToken', savedToken);
        }
        
        // Show success message that indicates whether it was saved to server or just locally
        if (result.fallbackOnly) {
          Alert.alert(
            'Profile Updated Locally', 
            'Your profile has been updated on this device only. The server could not be reached or returned an error. Your changes will be visible on this device but not synchronized with the server.',
            [{ text: 'OK', onPress: () => router.back() }]
          );
        } else {
          Alert.alert(
            'Success', 
            'Profile updated successfully on the server and locally',
            [{ text: 'OK', onPress: () => router.back() }]
          );
        }
      } catch (apiError) {
        if (apiError.fallbackSuccess && apiError.data) {
          console.log("API error, but local storage fallback succeeded");
          result = apiError.data;
          
          // Show success message with fallback note
          Alert.alert(
            'Profile Updated Locally', 
            'Your profile has been updated on this device. Changes may not be visible to other users until you reconnect to the server.',
            [{ text: 'OK', onPress: () => router.back() }]
          );
        } else {
          console.error('API error during profile update:', apiError);
          
          // Check if we need to refresh login
          if (apiError.message && (
            apiError.message.includes('Authentication required') || 
            apiError.message.includes('Authentication error') ||
            apiError.message.includes('token') ||
            apiError.message.includes('Token')
          )) {
            Alert.alert(
              'Session Expired', 
              'Your login session has expired. Please log in again to update your profile.',
              [
                { text: 'Cancel', style: 'cancel' },
                { 
                  text: 'Login', 
                  onPress: () => {
                    // Navigate to login screen
                    router.push('/login');
                  }
                }
              ]
            );
          } else {
            // Attempt local save as fallback
            try {
              // Get current user data first
              const userJson = await AsyncStorage.getItem('user');
              const currentUser = userJson ? JSON.parse(userJson) : {};
              
              // Merge with new data and add updatedAt timestamp
              const updatedLocalData = {
                ...currentUser,
                ...updatedUserData,
                updatedAt: new Date().toISOString()
              };
              
              // Save to AsyncStorage
              await AsyncStorage.setItem('user', JSON.stringify(updatedLocalData));
              
              Alert.alert(
                'Profile Updated Locally Only', 
                'There was an error communicating with the server, but your profile has been updated on this device.',
                [{ text: 'OK', onPress: () => router.back() }]
              );
              
              // Successfully used the fallback
              return;
              
            } catch (localSaveError) {
              // General error
              Alert.alert('Error', apiError.message || 'Failed to save profile changes. Please try again.');
            }
          }
        }
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      
      // Try to save locally if any other error occurs
      try {
        // Get current user data first
        const userJson = await AsyncStorage.getItem('user');
        const currentUser = userJson ? JSON.parse(userJson) : {};
        
        // Make sure we have a base user object to work with
        if (!currentUser || Object.keys(currentUser).length === 0) {
          const fallbackUser = {
            id: userData?.id || 'local-user',
            name: formData.name,
            email: formData.email || '',
            updatedAt: new Date().toISOString()
          };
          await AsyncStorage.setItem('user', JSON.stringify(fallbackUser));
          
          Alert.alert(
            'Profile Saved Locally', 
            'Your profile has been saved on this device only. Server connection was not available.',
            [{ text: 'OK', onPress: () => router.back() }]
          );
          return;
        }
        
        // Merge with new data and add updatedAt timestamp
        const updatedUserData = {
          ...currentUser,
          name: formData.name,
          email: formData.email || currentUser.email,
          bio: formData.bio,
          longTermGoal: formData.longTermGoal,
          avatarUrl: avatarSource,
          updatedAt: new Date().toISOString()
        };
        
        // Save to AsyncStorage
        await AsyncStorage.setItem('user', JSON.stringify(updatedUserData));
        
        Alert.alert(
          'Profile Saved Locally', 
          'Your profile has been saved on this device only. Server connection was not available.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } catch (localError) {
        Alert.alert('Error', error.message || 'Failed to save profile changes. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  // Show loading screen while fetching data
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3A8891" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with back button */}
      <View style={styles.headerContainer}>
        <Text style={styles.headerText}>Edit Profile</Text>
        {offlineMode && (
          <View style={styles.offlineBadge}>
            <Text style={styles.offlineBadgeText}>Offline Mode</Text>
          </View>
        )}
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.push('/screens/(tabs)/profile')}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Profile Avatar Section */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            {avatarSource ? (
              <Image 
                source={{ uri: avatarSource }} 
                style={styles.avatar} 
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {formData.name ? formData.name.substring(0, 2).toUpperCase() : "??"}
                </Text>
              </View>
            )}
          </View>
          <TouchableOpacity 
            style={styles.changeAvatarButton}
            onPress={handleChooseAvatar}
          >
            <Text style={styles.changeAvatarText}>Change Avatar</Text>
          </TouchableOpacity>
        </View>

        {/* Form Fields */}
        <View style={styles.formSection}>
          <Text style={styles.fieldLabel}>Name</Text>
          <TextInput
            style={styles.input}
            value={formData.name}
            onChangeText={(text) => handleChange('name', text)}
            placeholder="Your name"
          />
          
          <Text style={styles.fieldLabel}>Email</Text>
          <TextInput
            style={styles.input}
            value={formData.email}
            onChangeText={(text) => handleChange('email', text)}
            placeholder="Your email"
            keyboardType="email-address"
            editable={false} // Email usually can't be changed
          />
          
          <Text style={styles.fieldLabel}>Bio</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.bio}
            onChangeText={(text) => handleChange('bio', text)}
            placeholder="About yourself"
            multiline={true}
            numberOfLines={4}
          />
          
          {/* New Long-term Goal Section */}
          <Text style={styles.fieldLabel}>Long-term Goal</Text>
          <View style={styles.goalContainer}>
            <Text style={styles.goalDescription}>
              Set a meaningful long-term goal that you want to achieve. 
            </Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.longTermGoal}
              onChangeText={(text) => handleChange('longTermGoal', text)}
              placeholder="Example: Run a marathon, Learn to play piano, Write a book..."
              multiline={true}
              numberOfLines={3}
            />
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity 
          style={styles.saveButton}
          onPress={handleSubmit}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.saveButtonText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8F0F2',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E8F0F2',
  },
  headerContainer: {
    backgroundColor: '#3A8891',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  headerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  backButton: {
    position: 'absolute',
    left: 20,
    bottom: 20,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  avatarSection: {
    alignItems: 'center',
    marginVertical: 20,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#3A8891',
    overflow: 'hidden',
    backgroundColor: '#ccc',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#0E5E6F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    color: '#fff',
    fontSize: 36,
    fontWeight: 'bold',
  },
  changeAvatarButton: {
    marginTop: 10,
    padding: 8,
  },
  changeAvatarText: {
    color: '#0E5E6F',
    fontSize: 16,
    fontWeight: '600',
  },
  formSection: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0E5E6F',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  goalContainer: {
    marginBottom: 10,
  },
  goalDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  saveButton: {
    backgroundColor: '#0E5E6F',
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 10,
    alignItems: 'center',
    marginVertical: 20,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  offlineBadge: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: '#FF3B30',
    padding: 5,
    borderRadius: 5,
  },
  offlineBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
