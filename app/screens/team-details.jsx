import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import teamService from '../services/teamService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function TeamDetailsScreen({ route, navigation }) {
  const { teamId } = route.params;
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (!userData) {
        Alert.alert('Error', 'Please log in first');
        navigation.navigate('Login');
        return;
      }

      const parsedUser = JSON.parse(userData);
      setUserId(parsedUser.id);
      await loadTeamDetails();
    } catch (error) {
      console.error('Error loading user data:', error);
      Alert.alert('Error', 'Failed to load user data');
    }
  };

  const loadTeamDetails = async () => {
    try {
      setLoading(true);
      const teamData = await teamService.getTeamById(teamId);
      console.log('Team details:', teamData);
      setTeam(teamData);
    } catch (error) {
      console.error('Error loading team details:', error);
      Alert.alert('Error', 'Failed to load team details');
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveTeam = async () => {
    try {
      setLoading(true);
      await teamService.leaveTeam(teamId);
      Alert.alert('Success', 'Successfully left the team');
      navigation.goBack();
    } catch (error) {
      console.error('Error leaving team:', error);
      Alert.alert('Error', 'Failed to leave team');
    } finally {
      setLoading(false);
    }
  };

  const calculateProgress = () => {
    if (!team || !team.goals || !team.goals.length) return 0;
    
    const totalProgress = team.goals.reduce((sum, goal) => {
      return sum + (goal.current / goal.target) * 100;
    }, 0);
    
    return Math.round(totalProgress / team.goals.length);
  };

  // Member item renderer for FlatList
  const renderMember = ({ item }) => (
    <View key={item._id} style={styles.memberCard}>
      <Image 
        source={{ uri: item.avatar || 'https://via.placeholder.com/50' }} 
        style={styles.avatar} 
      />
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>{item.name}</Text>
        <Text style={styles.memberRole}>{item.role}</Text>
        <Text style={styles.memberPoints}>{item.points} points</Text>
      </View>
    </View>
  );

  // Goal item renderer for FlatList
  const renderGoal = ({ item }) => (
    <View key={item._id} style={styles.goalCard}>
      <Text style={styles.goalTitle}>{item.title}</Text>
      <View style={styles.goalProgress}>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${(item.current / item.target) * 100}%` }
            ]} 
          />
        </View>
        <Text style={styles.progressText}>
          {item.current} / {item.target}
        </Text>
      </View>
    </View>
  );

  // Main content renderer - now divided into sections to avoid the VirtualizedList warning
  const renderContent = () => {
    if (!team) {
      return (
        <View style={styles.container}>
          <Text>Team not found</Text>
        </View>
      );
    }

    return (
      <View style={styles.container}>
        {/* Team Header */}
        <View style={styles.header}>
          <Text style={styles.teamName}>{team.name}</Text>
          <Text style={styles.teamDescription}>{team.description}</Text>
        </View>

        {/* Progress Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Team Progress</Text>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${calculateProgress()}%` }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>{calculateProgress()}% Complete</Text>
        </View>

        {/* Target Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Team Target</Text>
          <View style={styles.targetContainer}>
            <View style={styles.targetItem}>
              <Text style={styles.targetLabel}>Mental Target</Text>
              <Text style={styles.targetValue}>{team.targetMentalValue}</Text>
            </View>
            <View style={styles.targetItem}>
              <Text style={styles.targetLabel}>Physical Target</Text>
              <Text style={styles.targetValue}>{team.targetPhysicalValue}</Text>
            </View>
          </View>
        </View>

        {/* Members Section - Using FlatList */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Team Members</Text>
          <FlatList
            data={team.members}
            renderItem={renderMember}
            keyExtractor={item => item._id || item.id}
            scrollEnabled={false} // Disable scrolling to avoid nesting issues
          />
        </View>

        {/* Goals Section - Using FlatList */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Team Goals</Text>
          <FlatList
            data={team.goals || []}
            renderItem={renderGoal}
            keyExtractor={item => item._id || item.id}
            scrollEnabled={false} // Disable scrolling to avoid nesting issues
          />
        </View>

        {/* Leave Team Button */}
        <TouchableOpacity 
          style={styles.leaveButton}
          onPress={handleLeaveTeam}
        >
          <Text style={styles.leaveButtonText}>Leave Team</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  // Wrap the main content in a ScrollView
  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      {renderContent()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: 24,
  },
  teamName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 8,
  },
  teamDescription: {
    fontSize: 16,
    color: '#666',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 16,
  },
  progressBar: {
    height: 10,
    backgroundColor: '#E8F0F2',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4A90E2',
  },
  progressText: {
    textAlign: 'center',
    marginTop: 8,
    color: '#666',
  },
  targetContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  targetItem: {
    flex: 1,
    alignItems: 'center',
  },
  targetLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  targetValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    marginBottom: 8,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  memberRole: {
    fontSize: 14,
    color: '#666',
  },
  memberPoints: {
    fontSize: 14,
    color: '#4A90E2',
  },
  goalCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 8,
  },
  goalProgress: {
    marginTop: 8,
  },
  leaveButton: {
    backgroundColor: '#E74C3C',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 32,
  },
  leaveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  scrollContainer: {
    padding: 16,
  },
}); 