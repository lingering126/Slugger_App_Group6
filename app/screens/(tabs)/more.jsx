import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform } from "react-native";
import { useRouter } from "expo-router";
import { FontAwesome } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function MoreScreen() {
  const router = useRouter();

  const handleSignOut = async () => {
    const performSignOut = async () => {
      try {
        console.log('Signing out and clearing user data...');
        // Keys to remove that were set during login or are user-specific
        const keysToRemove = [
          'userToken', 
          'userId', 
          'username', 
          'user', 
          'userTeam',         // If you store team info per user
          'savedPassword',    // Clearing saved password for security
          'userIsNew',        // Clear the new user flag
          // 'savedEmail'    // Decide if you want to keep savedEmail for convenience
          // 'welcomeCompleted' is intentionally not cleared to prevent welcome screen on next login
        ];
        await AsyncStorage.multiRemove(keysToRemove);
        
        // Clear any cached global variables if necessary
        global.workingApiUrl = null; 
        console.log('User data cleared from AsyncStorage.');
        
        router.replace('/screens/login');
      } catch (e) {
        console.error('Error during sign out process:', e);
        if (Platform.OS === 'web') {
          alert('Failed to sign out completely. Please try again.');
        } else {
          Alert.alert('Error', 'Failed to sign out completely. Please try again.');
        }
      }
    };

    try {
      if (Platform.OS === 'web') {
        if (confirm("Are you sure you want to sign out?")) {
          await performSignOut();
        }
      } else {
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
              onPress: performSignOut
            }
          ]
        );
      }
    } catch (error) {
      // This top-level catch is mostly for unexpected errors in Alert/confirm logic itself
      console.error('Error initiating sign out:', error);
      if (Platform.OS === 'web') {
        alert('An unexpected error occurred while trying to sign out.');
      } else {
        Alert.alert('Error', 'An unexpected error occurred while trying to sign out.');
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