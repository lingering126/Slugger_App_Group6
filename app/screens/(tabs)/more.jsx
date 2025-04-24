import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform } from "react-native";
import { useRouter } from "expo-router";
import { FontAwesome } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function MoreScreen() {
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      // Different handling for web vs native platforms
      if (Platform.OS === 'web') {
        // Use standard web alert for web platform
        if (confirm("Are you sure you want to sign out?")) {
          // Clear authentication tokens
          await AsyncStorage.removeItem('token');
          await AsyncStorage.removeItem('user');
          
          // Optionally keep saved email for convenience but clear password
          await AsyncStorage.removeItem('savedPassword');
          
          // Clear any cached connection URLs (optional)
          global.workingApiUrl = null;
          
          // Navigate to login screen
          router.replace('/screens/login');
        }
      } else {
        // Show confirmation alert before signing out (for native platforms)
        Alert.alert(
          "Sign Out",
          "Are you sure you want to sign out?",
          [
            {
              text: "Cancel",
              style: "cancel"
            },
            {
              text: "Sign Out",
              onPress: async () => {
                // Clear authentication tokens
                await AsyncStorage.removeItem('token');
                await AsyncStorage.removeItem('user');
                
                // Optionally keep saved email for convenience but clear password
                await AsyncStorage.removeItem('savedPassword');
                
                // Clear any cached connection URLs (optional)
                global.workingApiUrl = null;
                
                // Navigate to login screen
                router.replace('/screens/login');
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error signing out:', error);
      if (Platform.OS === 'web') {
        alert('Failed to sign out. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to sign out. Please try again.');
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>More</Text>
      </View>
      
      <View style={styles.content}>
        <TouchableOpacity 
          style={styles.signOutButton} 
          onPress={handleSignOut}
        >
          <FontAwesome name="sign-out" size={24} color="#721c24" style={styles.buttonIcon} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.footer}>
        <Text style={styles.version}>Version 1.0.0</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: "#f8d7da",
    paddingVertical: 16,
    paddingHorizontal: 30,
    borderRadius: 8,
    width: '100%',
    maxWidth: 300,
  },
  buttonIcon: {
    marginRight: 12,
  },
  signOutText: {
    color: "#721c24",
    fontWeight: "600",
    fontSize: 18,
  },
  footer: {
    padding: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  version: {
    color: "#888",
    fontSize: 14,
  },
}); 