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
        
        // Get user data using the API service
        const user = await userService.getUserProfile();
        
        if (!user) {
          throw new Error('User data not found');
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
        Alert.alert('Error', 'Failed to load profile data');
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

      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedImageUri = result.assets[0].uri;
        console.log("Selected image URI:", selectedImageUri);
        
        // For mobile devices, we need to convert the image to base64
        try {
          const base64 = await convertImageToBase64(selectedImageUri);
          setAvatarSource(base64);
          console.log("New avatar set from camera (converted to base64)");
        } catch (error) {
          console.error("Error converting camera image:", error);
          // Fallback to URI if conversion fails
          setAvatarSource(selectedImageUri);
          console.log("New avatar set from camera:", selectedImageUri);
        }
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  // Helper function to convert an image URI to base64
  const convertImageToBase64 = async (uri) => {
    try {
      // For web platform
      if (Platform.OS === 'web') {
        const response = await fetch(uri);
        const blob = await response.blob();
        
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } 
      // For mobile platforms, you'd need to implement a different method
      // This is a placeholder - you'd need a library like expo-file-system
      // Example: return await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
      
      // For now, just return the URI for mobile platforms as a fallback
      return uri;
    } catch (error) {
      console.error('Error converting image to base64:', error);
      throw error;
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

      // Open image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedImageUri = result.assets[0].uri;
        console.log("Selected image URI:", selectedImageUri);
        
        // For Web/macOS, we need to convert the image to base64
        if (Platform.OS === 'web') {
          try {
            // Get blob from URI
            const response = await fetch(selectedImageUri);
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
          // For mobile devices, try to convert to base64
          try {
            const base64 = await convertImageToBase64(selectedImageUri);
            setAvatarSource(base64);
            console.log("New avatar set from gallery (converted to base64)");
          } catch (error) {
            console.error("Error converting gallery image:", error);
            // Fallback to URI if conversion fails
            setAvatarSource(selectedImageUri);
            console.log("New avatar set from gallery:", selectedImageUri);
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
      
      console.log("Calling API to update profile...");
      let result = null;
      let isOnlineUpdate = false;

      try {
        result = await userService.updateUserProfile(updatedUserData);
        isOnlineUpdate = true;
        console.log("API call completed successfully", JSON.stringify({
          id: result.id,
          name: result.name,
          email: result.email
        }));
        
        // Show success message and navigate back
        Alert.alert(
          'Success', 
          'Profile updated successfully',
          [{ text: 'OK', onPress: () => router.back() }]
        );
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
            // General error
            Alert.alert('Error', apiError.message || 'Failed to save profile changes. Please try again.');
          }
        }
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', error.message || 'Failed to save profile changes. Please try again.');
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
    fontSize: 24,
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
    fontSize: 16,
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
});
