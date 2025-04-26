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

export default function EditProfile() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userData, setUserData] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    bio: '',
  });
  // State for avatar image
  const [avatarSource, setAvatarSource] = useState(null);

  // Load user data when component mounts
  useEffect(() => {
    const loadUserData = async () => {
      try {
        setLoading(true);
        
        // Get user data from AsyncStorage
        const userJson = await AsyncStorage.getItem('user');
        const user = userJson ? JSON.parse(userJson) : null;
        
        if (!user) {
          throw new Error('User data not found');
        }
        
        setUserData(user);
        setFormData({
          name: user.name || '',
          email: user.email || '',
          bio: user.bio || '',
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
    
    loadUserData();
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
        const newAvatarUri = result.assets[0].uri;
        setAvatarSource(newAvatarUri);
        
        console.log("New avatar set from camera:", newAvatarUri);
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

      // Open image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newAvatarUri = result.assets[0].uri;
        setAvatarSource(newAvatarUri);
        
        console.log("New avatar set from gallery:", newAvatarUri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image');
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    try {
      setSaving(true);
      
      // Validate form data
      if (!formData.name.trim()) {
        Alert.alert('Error', 'Name cannot be empty');
        setSaving(false);
        return;
      }
      
      console.log("Current avatar source:", avatarSource);
      
      // Update user data with new values including avatar
      const updatedUserData = {
        ...userData,
        name: formData.name,
        email: formData.email,
        bio: formData.bio,
        avatarUrl: avatarSource, // Save the avatar source
        updatedAt: new Date().toISOString()
      };
      
      console.log("Saving user data with avatar:", updatedUserData.avatarUrl);
      
      // Save to AsyncStorage
      await AsyncStorage.setItem('user', JSON.stringify(updatedUserData));
      
      // Show success message and navigate back
      Alert.alert(
        'Success', 
        'Profile updated successfully',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to save profile changes');
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
          onPress={() => router.back()}
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
        </View>

        {/* Save Button - Full width now */}
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
