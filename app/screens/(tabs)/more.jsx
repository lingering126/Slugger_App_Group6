import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { useRouter } from "expo-router";
import { FontAwesome } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function MoreScreen() {
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      // Show confirmation alert before signing out
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
    } catch (error) {
      console.error('Error signing out:', error);
      Alert.alert('Error', 'Failed to sign out. Please try again.');
    }
  };
  
  // Function to reset welcome flow for testing
  const resetWelcomeFlow = async () => {
    try {
      Alert.alert(
        "Reset Welcome Flow",
        "This will reset the welcome tutorial. You'll see it next time you log in. Continue?",
        [
          {
            text: "Cancel",
            style: "cancel"
          },
          {
            text: "Reset",
            onPress: async () => {
              await AsyncStorage.removeItem('welcomeCompleted');
              Alert.alert(
                "Success",
                "Welcome flow has been reset. You'll see the welcome tutorial after your next login.",
                [{ text: "OK" }]
              );
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error resetting welcome flow:', error);
      Alert.alert('Error', 'Failed to reset welcome flow. Please try again.');
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
        
        <TouchableOpacity 
          style={styles.resetButton} 
          onPress={resetWelcomeFlow}
        >
          <FontAwesome name="refresh" size={24} color="#004085" style={styles.buttonIcon} />
          <Text style={styles.resetButtonText}>Reset Welcome Tutorial</Text>
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
    gap: 20, // Add space between buttons
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
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: "#cce5ff",
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
  resetButtonText: {
    color: "#004085",
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