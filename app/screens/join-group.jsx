import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiUrl } from '../utils';

// Get the appropriate API URL based on the environment
const API_URLS = getApiUrl();

export default function JoinGroupScreen() {
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const router = useRouter();

  // Function to search for groups
  const searchGroups = async () => {
    if (!groupName.trim()) {
      setError('Please enter a group name to search');
      return;
    }

    try {
      setSearching(true);
      setError('');
      
      // Use the working URL if available, otherwise try all URLs
      const apiUrl = global.workingApiUrl || API_URLS[0];
      
      const response = await fetch(`${apiUrl}/groups/search?name=${encodeURIComponent(groupName)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await AsyncStorage.getItem('token')}`
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setError(data.message || 'Failed to search for groups');
        setSearchResults([]);
      } else {
        setSearchResults(data.groups || []);
        if (data.groups.length === 0) {
          setError('No groups found with that name');
        }
      }
    } catch (error) {
      console.error('Error searching for groups:', error);
      setError('An error occurred while searching for groups');
    } finally {
      setSearching(false);
    }
  };

  // Function to join a group
  const joinGroup = async (groupId) => {
    try {
      setLoading(true);
      setError('');
      
      // Use the working URL if available, otherwise try all URLs
      const apiUrl = global.workingApiUrl || API_URLS[0];
      
      const response = await fetch(`${apiUrl}/groups/join/${groupId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await AsyncStorage.getItem('token')}`
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setError(data.message || 'Failed to join group');
      } else {
        Alert.alert(
          'Success',
          'You have successfully joined the group!',
          [
            { 
              text: 'OK', 
              onPress: () => router.replace('/screens/(tabs)/home')
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error joining group:', error);
      setError('An error occurred while joining the group');
    } finally {
      setLoading(false);
    }
  };

  // Function to go back to welcome page
  const goBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <TouchableOpacity style={styles.backButton} onPress={goBack}>
            <FontAwesome name="arrow-left" size={24} color="#333" />
          </TouchableOpacity>
          
          <View style={styles.header}>
            <Text style={styles.title}>Join a Group</Text>
            <Text style={styles.subtitle}>
              Enter the name of the group you want to join
            </Text>
          </View>
          
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.input}
              placeholder="Enter group name"
              value={groupName}
              onChangeText={setGroupName}
              autoCapitalize="none"
            />
            
            <TouchableOpacity 
              style={styles.searchButton} 
              onPress={searchGroups}
              disabled={searching}
            >
              {searching ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Search</Text>
              )}
            </TouchableOpacity>
          </View>
          
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          
          {searchResults.length > 0 && (
            <View style={styles.resultsContainer}>
              <Text style={styles.resultsTitle}>Search Results:</Text>
              
              {searchResults.map((group) => (
                <View key={group.id} style={styles.groupItem}>
                  <View style={styles.groupInfo}>
                    <Text style={styles.groupName}>{group.name}</Text>
                    <Text style={styles.groupMembers}>
                      {group.memberCount || 0} members
                    </Text>
                  </View>
                  
                  <TouchableOpacity
                    style={styles.joinButton}
                    onPress={() => joinGroup(group.id)}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.joinButtonText}>Join</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
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
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
  },
  backButton: {
    marginTop: 20,
    marginBottom: 20,
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  searchContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  input: {
    flex: 1,
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 15,
    marginRight: 10,
    fontSize: 16,
  },
  searchButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    color: 'red',
    marginBottom: 20,
  },
  resultsContainer: {
    marginTop: 20,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  groupItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  groupMembers: {
    fontSize: 14,
    color: '#666',
  },
  joinButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  joinButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
}); 