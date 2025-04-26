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
import { userService } from '../path/to/api'; // Import the userService

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

  // Handle form submission - UPDATED to use API
  const handleSubmit = async () => {
    try {
      setSaving(true);
      
      // Validate form data
      if (!formData.name.trim()) {
        Alert.alert('Error', 'Name cannot be empty');
        setSaving(false);
        return;
      }
      
      // Update user data with new values including avatar
      const updatedUserData = {
        ...userData,
        name: formData.name,
        email: formData.email,
        bio: formData.bio,
        avatarUrl: avatarSource,
      };
      
      // Use the API service to update the profile on the server
      await userService.updateUserProfile(updatedUserData);
      
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
  headerContainer: {
    backgroundColor: '#3A8891',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#fff',
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
  avatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  userInfoContainer: {
    marginLeft: 20,
    flex: 1,
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  userStatus: {
    fontSize: 16,
    color: '#E8F0F2',
    marginBottom: 2,
  },
  userJoinDate: {
    fontSize: 14,
    color: '#E8F0F2',
    opacity: 0.8,
  },
  editButton: {
    marginTop: 15,
    backgroundColor: '#0E5E6F',
    alignSelf: 'flex-end',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  editButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0E5E6F',
    marginTop: 20,
    marginBottom: 10,
  },
  placeholder: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 15,
  },
  placeholderText: {
    color: '#999',
    fontSize: 16,
  },
  // Group styles
  groupsScrollView: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  groupCard: {
    width: 150,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginRight: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  selectedGroupCard: {
    borderWidth: 2,
    borderColor: '#3A8891',
  },
  groupCardIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#3A8891',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  groupCardIconText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  groupCardName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0E5E6F',
    marginBottom: 5,
    textAlign: 'center',
  },
  groupCardMembers: {
    fontSize: 14,
    color: '#666',
  },
  // Members styles
  membersContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    marginBottom: 15,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0E5E6F',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  memberAvatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  memberName: {
    fontSize: 16,
    color: '#333',
  },
  // Activities styles
  activitySection: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0E5E6F',
    marginBottom: 5,
  },
  activityDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  activitySelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f9f9f9',
  },
  activitySelectorText: {
    fontSize: 16,
    color: '#333',
  },
  dropdownIcon: {
    fontSize: 14,
    color: '#666',
  },
  selectedActivitiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  activityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3A8891',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 10,
    margin: 5,
  },
  activityChipIcon: {
    fontSize: 16,
    marginRight: 5,
  },
  activityChipText: {
    color: '#fff',
    fontSize: 14,
  },
  activityChipRemove: {
    marginLeft: 5,
    padding: 2,
  },
  activityChipRemoveText: {
    color: '#fff',
    fontSize: 12,
  },
  saveButton: {
    backgroundColor: '#0E5E6F',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderRadius: 10,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0E5E6F',
  },
  modalCloseButton: {
    padding: 5,
  },
  modalCloseText: {
    fontSize: 18,
    color: '#666',
  },
  modalList: {
    maxHeight: 400,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  activityItemIcon: {
    fontSize: 20,
    marginRight: 15,
  },
  activityItemText: {
    fontSize: 16,
    flex: 1,
  },
  activityItemSelected: {
    fontSize: 18,
    color: '#3A8891',
    fontWeight: 'bold',
  },
  modalDoneButton: {
    padding: 15,
    backgroundColor: '#3A8891',
    alignItems: 'center',
    margin: 15,
    borderRadius: 8,
  },
  modalDoneText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  devToolsSection: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  devToolsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0E5E6F',
    marginBottom: 5,
  },
  devToolsDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  resetButton: {
    backgroundColor: '#0E5E6F',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Added loading style
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
})
