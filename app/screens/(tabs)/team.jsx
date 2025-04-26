import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList, Modal, StyleSheet, Image, ScrollView, Alert, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import teamService from "../../services/teamService";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { Dropdown } from 'react-native-element-dropdown';

export default function TeamsScreen() {
  const [teams, setTeams] = useState([]);
  const [userTeam, setUserTeam] = useState(null);
  const [search, setSearch] = useState("");
  const [teamIdToJoin, setTeamIdToJoin] = useState("");
  const [newTeam, setNewTeam] = useState({
    name: '',
    description: '',
    targetName: '',
    targetMentalValue: 0,
    targetPhysicalValue: 0,
    dailyLimitPhysical: 7,
    dailyLimitMental: 7
  });
  const [modalVisible, setModalVisible] = useState(false);
  const [goalsModalVisible, setGoalsModalVisible] = useState(false);
  const [forfeitsModalVisible, setForfeitsModalVisible] = useState(false);
  const [newGoal, setNewGoal] = useState({ title: "", target: "", type: "physical" });
  const [newForfeit, setNewForfeit] = useState({ description: "", points: 0 });
  const [teamGoals, setTeamGoals] = useState([]);
  const [teamForfeits, setTeamForfeits] = useState([]);
  const [teamProgress, setTeamProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(null);
  const navigation = useNavigation();

  const targetData = [
    { label: 'Select a category', value: '' },
    { label: 'Target 1', value: 'Target 1' },
    { label: 'Target 2', value: 'Target 2' },
    { label: 'Target 3', value: 'Target 3' },
    { label: 'Target 4', value: 'Target 4' },
    { label: 'Target 5', value: 'Target 5' },
    { label: 'Target 6', value: 'Target 6' },
    { label: 'Target 7', value: 'Target 7' },
    { label: 'Target 8', value: 'Target 8' },
    { label: 'Target 9', value: 'Target 9' },
    { label: 'Target 10', value: 'Target 10' },
  ];

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadTeams();
    });

    return unsubscribe;
  }, [navigation]);

  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const parsedUser = JSON.parse(userData);
        setUserId(parsedUser.id);
        await loadTeams();
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadTeams = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        console.log('No token found');
        return;
      }

      // Check for saved userTeam data in AsyncStorage
      const savedUserTeam = await AsyncStorage.getItem('userTeam');
      if (savedUserTeam) {
        try {
          const parsedTeam = JSON.parse(savedUserTeam);
          console.log('Found saved user team in AsyncStorage:', parsedTeam);
          setUserTeam(parsedTeam);
        } catch (error) {
          console.error('Error parsing saved team data:', error);
        }
      }

      console.log('Loading teams...');
      const teamsData = await teamService.getAllTeams();
      console.log('Teams data:', teamsData);

      if (!Array.isArray(teamsData)) {
        console.error('Teams data is not an array:', teamsData);
        setTeams([]);
        return;
      }

      // Filter out teams with no members
      const activeTeams = teamsData.filter(team => team.members && team.members.length > 0);
      setTeams(activeTeams);

      // Find the team that the user belongs to
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const parsedUser = JSON.parse(userData);
        console.log('Current user ID:', parsedUser.id);
        
        const userTeam = activeTeams.find(team => {
          console.log('Checking team:', team._id);
          console.log('Team members:', team.members);
          return team.members && team.members.some(member => {
            console.log('Member user:', member.user);
            return member.user && (member.user._id === parsedUser.id || member.user.id === parsedUser.id);
          });
        });
        
        console.log('Found user team:', userTeam);
        if (userTeam) {
          setUserTeam(userTeam);
          // Save the team data to AsyncStorage for persistence
          await AsyncStorage.setItem('userTeam', JSON.stringify(userTeam));
        }
      }
    } catch (error) {
      console.error('Error loading teams:', error);
      Alert.alert('Error', error.message || 'Failed to load teams');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = async () => {
    if (!newTeam.name.trim()) {
      Alert.alert('Error', 'Please enter a team name');
      return;
    }

    if (!newTeam.targetName) {
      Alert.alert('Error', 'Please select a target category');
      return;
    }

    try {
      setLoading(true);
      const teamData = {
        name: newTeam.name,
        description: newTeam.description,
        targetName: newTeam.targetName,
        targetMentalValue: parseInt(newTeam.targetMentalValue),
        targetPhysicalValue: parseInt(newTeam.targetPhysicalValue),
        dailyLimitPhysical: parseInt(newTeam.dailyLimitPhysical),
        dailyLimitMental: parseInt(newTeam.dailyLimitMental)
      };
      
      await teamService.createTeam(teamData);
      
      setModalVisible(false);
      setNewTeam({
        name: '',
        description: '',
        targetName: '',
        targetMentalValue: 0,
        targetPhysicalValue: 0,
        dailyLimitPhysical: 7,
        dailyLimitMental: 7
      });
      Alert.alert('Success', 'Team created successfully');
      await loadTeams();
    } catch (error) {
      console.error('Error creating team:', error);
      Alert.alert('Error', error.message || 'Failed to create team');
    } finally {
      setLoading(false);
    }
  };

  // Join a team by team ID
  const handleJoinTeamById = async () => {
    if (!teamIdToJoin.trim()) {
      Alert.alert('Error', 'Please enter a team ID');
      return;
    }

    try {
      setLoading(true);
      await teamService.joinTeamById(teamIdToJoin);
      
      Alert.alert('Success', 'Joined team successfully');
      setTeamIdToJoin('');
      await loadTeams();
    } catch (error) {
      console.error('Error joining team by ID:', error);
      Alert.alert('Error', error.message || 'Failed to join team');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinTeam = async (teamId) => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert('Error', 'Please log in first');
        return;
      }

      const apiUrl = global.workingApiUrl || 'http://localhost:5001/api';
      console.log('Joining team:', teamId);
      
      const response = await fetch(`${apiUrl}/groups/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          groupId: teamId
        })
      });

      console.log('Join response status:', response.status);
      const data = await response.json();
      console.log('Join response data:', data);

      if (response.status === 400 && data.message === 'Already a member') {
        // If already a member, just update the state
        const team = teams.find(t => t._id === teamId);
        if (team) {
          setUserTeam(team);
          Alert.alert('Info', 'You are already a member of this team');
          return;
        }
      }

      if (!response.ok) {
        throw new Error(data.message || 'Failed to join team');
      }

      // Update user team status
      const team = teams.find(t => t._id === teamId);
      if (team) {
        // Initialize edit state
        setIsEditingTeam(false);
        setEditedTeam({
          name: team.name || '',
          description: team.description || ''
        });
        setUserTeam(team);
      }

      Alert.alert('Success', 'Successfully joined the team');
      await loadTeams(); // Reload team list
    } catch (error) {
      console.error('Error joining team:', error);
      Alert.alert('Error', error.message || 'Failed to join team');
    } finally {
      setLoading(false);
    }
  };

  // Enhanced leave team functionality to ensure state refresh after leaving
  const handleLeaveTeam = () => {
    if (!userTeam) {
      console.log('No team to leave');
      return;
    }
    
    console.log('Preparing to leave team:', userTeam._id);
    
    // Save team ID for later use
    const teamIdToLeave = userTeam._id;
    
    // Immediately clear user team state and return to team list
    setUserTeam(null);
    
    // Immediately reload team list
    loadTeams();
    
    // Set a timer to delay refresh of team list to ensure state update
    setTimeout(() => {
      console.log('Refreshing team list after delay');
      loadTeams();
    }, 1000);
    
    // Delay refresh again to ensure backend data is updated
    setTimeout(() => {
      console.log('Final refresh of team list');
      loadTeams();
    }, 2000);
    
    // Attempt to call API to leave team in the background
    try {
      // Get token
      AsyncStorage.getItem('userToken').then(token => {
        if (!token) return;
        
        const apiUrl = global.workingApiUrl || 'http://localhost:5001/api';
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${apiUrl}/groups/leave`);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        
        xhr.onload = function() {
          console.log('Leave team API response status:', xhr.status);
          if (xhr.status >= 200 && xhr.status < 300) {
            console.log('Successfully left team, refreshing team list');
            // Refresh team list after successful API call
            loadTeams();
          } else {
            console.error('Error leaving team:', xhr.responseText);
          }
        };
        
        xhr.onerror = function() {
          console.error('Network error when leaving team');
        };
        
        xhr.send(JSON.stringify({ groupId: teamIdToLeave }));
      }).catch(err => {
        console.error('Error getting token:', err);
      });
    } catch (error) {
      console.error('Error in leave team process:', error);
    }
  };
  
  // Separate function to handle "Back" button in team list
  const handleBackToTeamList = () => {
    console.log('Returning to team list without leaving');
    setUserTeam(null);
  };

  const handleAddGoal = async () => {
    if (!newGoal.title || !newGoal.target) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    try {
      let updatedTeam;
      if (newGoal._id) {
        // Update existing goal
        updatedTeam = await teamService.updateGoal(userTeam._id, newGoal._id, newGoal);
        Alert.alert("Success", "Goal updated successfully!");
      } else {
        // Add new goal
        updatedTeam = await teamService.addGoal(userTeam._id, newGoal);
        Alert.alert("Success", "Goal added successfully!");
      }
      
      setUserTeam(updatedTeam);
      setNewGoal({ title: "", target: "", type: "physical" });
      setGoalsModalVisible(false);
      calculateTeamProgress(updatedTeam);
    } catch (error) {
      console.error('Error adding/updating goal:', error);
      Alert.alert("Error", "Failed to add/update goal");
    }
  };

  const handleAddForfeit = async () => {
    if (!newForfeit.description || !newForfeit.points) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    try {
      let updatedTeam;
      if (newForfeit._id) {
        // Update existing forfeit
        updatedTeam = await teamService.updateForfeit(userTeam._id, newForfeit._id, newForfeit);
      } else {
        // Add new forfeit
        updatedTeam = await teamService.addForfeit(userTeam._id, newForfeit);
      }
      
      setUserTeam(updatedTeam);
      setNewForfeit({ description: "", points: 0 });
      setForfeitsModalVisible(false);
      Alert.alert("Success", `Forfeit ${newForfeit._id ? 'updated' : 'added'} successfully!`);
    } catch (error) {
      console.error('Error adding/updating forfeit:', error);
      Alert.alert("Error", "Failed to add/update forfeit");
    }
  };

  const handleUpdateGoalProgress = async (goalId, progress) => {
    try {
      const updatedTeam = await teamService.updateGoalProgress(userTeam._id, goalId, progress);
      setUserTeam(updatedTeam);
      calculateTeamProgress(updatedTeam);
    } catch (error) {
      Alert.alert("Error", "Failed to update goal progress");
    }
  };

  const handleUpdateMemberPoints = async (memberId, points) => {
    try {
      const updatedTeam = await teamService.updateMemberPoints(userTeam._id, memberId, points);
      setUserTeam(updatedTeam);
    } catch (error) {
      Alert.alert("Error", "Failed to update member points");
    }
  };

  const handleUpdateGoal = async (goalId, updatedGoal) => {
    try {
      const updatedTeam = await teamService.updateGoal(userTeam._id, goalId, updatedGoal);
      setUserTeam(updatedTeam);
      calculateTeamProgress(updatedTeam);
      Alert.alert("Success", "Goal updated successfully!");
    } catch (error) {
      console.error('Error updating goal:', error);
      Alert.alert("Error", "Failed to update goal");
    }
  };

  const handleDeleteGoal = async (goalId) => {
    try {
      console.log('Deleting goal:', goalId);
      const updatedTeam = await teamService.deleteGoal(userTeam._id, goalId);
      console.log('Goal deleted successfully:', updatedTeam);
      setUserTeam(updatedTeam);
      calculateTeamProgress(updatedTeam);
      Alert.alert("Success", "Goal deleted successfully!");
    } catch (error) {
      console.error('Error deleting goal:', error);
      Alert.alert("Error", "Failed to delete goal");
    }
  };

  const handleUpdateForfeit = async (forfeitId, updatedForfeit) => {
    try {
      const updatedTeam = await teamService.updateForfeit(userTeam._id, forfeitId, updatedForfeit);
      setUserTeam(updatedTeam);
      Alert.alert("Success", "Forfeit updated successfully!");
    } catch (error) {
      console.error('Error updating forfeit:', error);
      Alert.alert("Error", "Failed to update forfeit");
    }
  };

  const handleDeleteForfeit = async (forfeitId) => {
    try {
      console.log('Deleting forfeit:', forfeitId);
      const updatedTeam = await teamService.deleteForfeit(userTeam._id, forfeitId);
      console.log('Forfeit deleted successfully:', updatedTeam);
      setUserTeam(updatedTeam);
      Alert.alert("Success", "Forfeit deleted successfully!");
    } catch (error) {
      console.error('Error deleting forfeit:', error);
      Alert.alert("Error", "Failed to delete forfeit");
    }
  };

  const handleDeleteTeam = async () => {
    if (!userTeam) return;
    
    try {
      await teamService.deleteTeam(userTeam._id);
      setUserTeam(null);
      loadTeams();
      Alert.alert('Success', 'Team deleted successfully');
    } catch (error) {
      console.error('Error deleting team:', error);
      Alert.alert('Error', error.message || 'Failed to delete team');
    }
  };

  const calculateTeamProgress = (team) => {
    if (!team.goals.length) return;
    const totalProgress = team.goals.reduce((sum, goal) => {
      return sum + (parseInt(goal.current) / parseInt(goal.target)) * 100;
    }, 0);
    setTeamProgress(Math.round(totalProgress / team.goals.length));
  };

  // Enter team instead of joining (already a member)
  const handleEnterTeam = (team) => {
    // Initialize edit state
    setIsEditingTeam(false);
    setEditedTeam({
      name: team.name || '',
      description: team.description || ''
    });
    setUserTeam(team);
  };
  
  const renderTeamCard = ({ item }) => {
    // Check if user is a team member, simplified logic to accommodate different data structures
    const isTeamMember = item.members && Array.isArray(item.members) && item.members.some(member => {
      // If member is an object and has user property
      if (typeof member === 'object' && member.user) {
        return member.user._id === userId || member.user.id === userId;
      }
      // If member is a string ID
      if (typeof member === 'string') {
        return member === userId;
      }
      // If member is an object but has no user property (possibly direct ID)
      if (typeof member === 'object' && member._id) {
        return member._id === userId;
      }
      return false;
    });
    
    console.log(`Checking if user ${userId} is member of team ${item.name}: ${isTeamMember}`);
    
    return (
      <View style={styles.teamCard}>
        <View style={styles.teamCardHeader}>
          <View style={styles.teamCardHeaderLeft}>
            <View style={styles.teamIconContainer}>
              <Ionicons name="people" size={24} color="#FFFFFF" />
            </View>
            <Text style={styles.teamName}>{item.name}</Text>
          </View>
          <View style={styles.teamIdBadge}>
            <Text style={styles.teamIdBadgeText}>ID: {item.teamId || item.groupId || 'N/A'}</Text>
          </View>
        </View>
        <View style={styles.teamCardBody}>
          <Text style={styles.description}>
            {item.description || 'No description provided'}
          </Text>
          <View style={styles.teamMetaInfo}>
            <View style={styles.metaItem}>
              <Ionicons name="people-outline" size={16} color="#7F8C8D" />
              <Text style={styles.metaText}>
                {item.members?.length || 0} members
              </Text>
            </View>
            {item.targetName && (
              <View style={styles.metaItem}>
                <Ionicons name="flag-outline" size={16} color="#7F8C8D" />
                <Text style={styles.metaText}>
                  {item.targetName}
                </Text>
              </View>
            )}
          </View>
        </View>
        {!userTeam && (
          <TouchableOpacity 
            style={[styles.teamActionButton, isTeamMember ? styles.enterButton : styles.joinButton]} 
            onPress={() => isTeamMember ? handleEnterTeam(item) : handleJoinTeam(item._id)}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons 
                  name={isTeamMember ? "enter-outline" : "add-circle-outline"} 
                  size={18} 
                  color="#FFFFFF" 
                  style={{marginRight: 5}} 
                />
                <Text style={styles.teamActionButtonText}>
                  {isTeamMember ? 'Enter' : 'Join'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="people-outline" size={64} color="#4A90E2" />
      <Text style={styles.emptyStateTitle}>No Teams Found</Text>
      <Text style={styles.emptyStateText}>
        Create a new team or join an existing one to get started!
      </Text>
    </View>
  );

  // Add state for editing team information
  const [editingTeamInfo, setEditingTeamInfo] = useState(false);
  const [editingTargets, setEditingTargets] = useState(false);
  const [isEditingTeam, setIsEditingTeam] = useState(false);
  const [editedTeam, setEditedTeam] = useState({
    name: '',
    description: ''
  });
  const [editedTeamInfo, setEditedTeamInfo] = useState({
    name: '',
    description: '',
    targetName: '',
    targetMentalValue: 0,
    targetPhysicalValue: 0
  });

  // Handle editing team information
  const handleEditTeamInfo = () => {
    setEditedTeamInfo({
      name: userTeam.name,
      description: userTeam.description,
      targetName: userTeam.targetName,
      targetMentalValue: userTeam.targetMentalValue,
      targetPhysicalValue: userTeam.targetPhysicalValue
    });
    setEditingTeamInfo(true);
  };

  // Handle editing team targets
  const handleEditTargets = () => {
    setEditedTeamInfo({
      ...editedTeamInfo,
      targetName: userTeam.targetName,
      targetMentalValue: userTeam.targetMentalValue,
      targetPhysicalValue: userTeam.targetPhysicalValue
    });
    setEditingTargets(true);
  };

  // Handle updating team information
  const handleUpdateTeam = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert('Error', 'Please log in first');
        return;
      }

      const apiUrl = global.workingApiUrl || 'http://localhost:5001/api';
      console.log('Updating team:', userTeam._id, editedTeam);
      
      const response = await fetch(`${apiUrl}/groups/${userTeam._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editedTeam.name,
          description: editedTeam.description
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to update team');
      }

      // Update local team information
      setUserTeam({
        ...userTeam,
        name: editedTeam.name,
        description: editedTeam.description
      });
      
      setIsEditingTeam(false);
      Alert.alert('Success', 'Team information updated successfully');
    } catch (error) {
      console.error('Error updating team:', error);
      Alert.alert('Error', error.message || 'Failed to update team');
    } finally {
      setLoading(false);
    }
  };

  // Save team information
  const handleSaveTeamInfo = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert('Error', 'Please log in first');
        return;
      }

      const apiUrl = global.workingApiUrl || 'http://localhost:5001/api';
      const response = await fetch(`${apiUrl}/groups/${userTeam._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editedTeamInfo.name,
          description: editedTeamInfo.description
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to update team info');
      }

      setUserTeam({...userTeam, name: editedTeamInfo.name, description: editedTeamInfo.description});
      setEditingTeamInfo(false);
      Alert.alert('Success', 'Team information updated successfully');
    } catch (error) {
      console.error('Error updating team info:', error);
      Alert.alert('Error', error.message || 'Failed to update team info');
    } finally {
      setLoading(false);
    }
  };

  // Save team targets
  const handleSaveTargets = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert('Error', 'Please log in first');
        return;
      }

      const apiUrl = global.workingApiUrl || 'http://localhost:5001/api';
      const response = await fetch(`${apiUrl}/groups/${userTeam._id}/targets`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          targetName: editedTeamInfo.targetName,
          targetMentalValue: parseInt(editedTeamInfo.targetMentalValue),
          targetPhysicalValue: parseInt(editedTeamInfo.targetPhysicalValue)
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to update targets');
      }

      setUserTeam({
        ...userTeam, 
        targetName: editedTeamInfo.targetName,
        targetMentalValue: parseInt(editedTeamInfo.targetMentalValue),
        targetPhysicalValue: parseInt(editedTeamInfo.targetPhysicalValue)
      });
      setEditingTargets(false);
      Alert.alert('Success', 'Team targets updated successfully');
    } catch (error) {
      console.error('Error updating targets:', error);
      Alert.alert('Error', error.message || 'Failed to update targets');
    } finally {
      setLoading(false);
    }
  };

  // Use the previously defined handleBackToTeamList function

  const renderTeamDashboard = () => (
    <ScrollView style={styles.teamDashboard}>
      <View style={styles.headerActions}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleBackToTeamList}
        >
          <Ionicons name="arrow-back" size={24} color="#4A90E2" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.dashboardCard}>
        <View style={styles.teamHeaderContainer}>
          <View style={styles.teamHeader}>
            <Text style={styles.teamName}>{userTeam.name}</Text>
            <TouchableOpacity 
              style={styles.editIconButton} 
              onPress={() => setIsEditingTeam(true)}
            >
              <Ionicons name="create-outline" size={24} color="#4A90E2" />
            </TouchableOpacity>
          </View>

          {isEditingTeam ? (
            <View style={styles.editContainer}>
              <TextInput
                style={styles.editInput}
                value={editedTeam.name}
                onChangeText={(text) => setEditedTeam({...editedTeam, name: text})}
                placeholder="Team Name"
              />
              <TextInput
                style={[styles.editInput, styles.multilineInput]}
                value={editedTeam.description}
                onChangeText={(text) => setEditedTeam({...editedTeam, description: text})}
                placeholder="Team Description"
                multiline
              />
              <View style={styles.editActions}>
                <TouchableOpacity 
                  style={[styles.editButton, styles.cancelButton]}
                  onPress={() => {
                    setIsEditingTeam(false);
                    setEditedTeam({
                      name: userTeam.name,
                      description: userTeam.description
                    });
                  }}
                >
                  <Text style={styles.editButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.editButton, styles.saveButton]}
                  onPress={handleUpdateTeam}
                >
                  <Text style={styles.editButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View>
              <Text style={styles.teamDescription}>{userTeam.description}</Text>
            </View>
          )}

          <View style={styles.teamIdContainer}>
            <View style={styles.teamIdInner}>
              <Text style={styles.teamIdLabel}>Team ID:</Text>
              <Text style={styles.teamId}>{userTeam.teamId || userTeam.groupId || 'N/A'}</Text>
            </View>
            <TouchableOpacity 
              style={styles.copyButton}
              onPress={async () => {
                try {
                  // Use the newly installed expo-clipboard package
                  const teamId = userTeam.teamId || userTeam.groupId;
                  if (teamId) {
                    await Clipboard.setStringAsync(teamId.toString());
                    Alert.alert('Copied', 'Team ID copied to clipboard');
                  } else {
                    Alert.alert('Error', 'No team ID available to copy');
                  }
                } catch (error) {
                  console.error('Error copying to clipboard:', error);
                  Alert.alert('Error', 'Failed to copy to clipboard');
                }
              }}
            >
              <Ionicons name="copy-outline" size={20} color="#4A90E2" />
              <Text style={styles.copyText}>Copy</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.progressContainer}>
        <Text style={styles.sectionTitle}>Team Progress</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${teamProgress}%` }]} />
        </View>
        <Text style={styles.progressText}>{teamProgress}% Complete</Text>
      </View>

      <View style={styles.membersContainer}>
        <Text style={styles.sectionTitle}>Team Members ({userTeam.members?.length || 0})</Text>
        {userTeam.members?.map((member, index) => (
          <View key={index} style={styles.memberCard}>
            <Ionicons name="person-circle" size={40} color="#4A90E2" />
            <View style={styles.memberInfo}>
              <Text style={styles.memberName}>
                {member.name || // Directly access name property
                 (member.email ? member.email.split('@')[0] : // If email exists but no name
                  (member.user?.name || // Compatible with old data structure
                   (member.user?.email ? member.user.email.split('@')[0] : // Compatible with old data structure
                    'Anonymous')))}
              </Text>
              <Text style={styles.memberRole}>{member.role || 'Member'}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Team targets section */}
      <View style={styles.targetsContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Team Targets</Text>
          <TouchableOpacity onPress={handleEditTargets}>
            <Ionicons name="create-outline" size={24} color="#4A90E2" />
          </TouchableOpacity>
        </View>
        
        {!editingTargets ? (
          <View style={styles.targetCard}>
            <Text style={styles.targetName}>{userTeam.targetName}</Text>
            <View style={styles.targetValues}>
              <Text style={styles.targetValue}>Mental: {userTeam.targetMentalValue}</Text>
              <Text style={styles.targetValue}>Physical: {userTeam.targetPhysicalValue}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.editTargetsContainer}>
            <Text style={styles.editSectionTitle}>Edit Team Targets</Text>
            <View style={styles.editTargetField}>
              <Text style={styles.editTargetLabel}>Target Name:</Text>
              <Dropdown
                style={styles.dropdown}
                placeholderStyle={styles.placeholderStyle}
                selectedTextStyle={styles.selectedTextStyle}
                data={targetData}
                maxHeight={300}
                labelField="label"
                valueField="value"
                placeholder="Select a category"
                value={editedTeamInfo.targetName}
                onChange={item => {
                  setEditedTeamInfo({...editedTeamInfo, targetName: item.value});
                }}
              />
            </View>
            <View style={styles.editTargetField}>
              <Text style={styles.editTargetLabel}>Mental Value:</Text>
              <TextInput
                style={styles.targetInput}
                value={String(editedTeamInfo.targetMentalValue)}
                onChangeText={(text) => {
                  const intValue = text.replace(/[^0-9]/g, '');
                  setEditedTeamInfo({...editedTeamInfo, targetMentalValue: intValue});
                }}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.editTargetField}>
              <Text style={styles.editTargetLabel}>Physical Value:</Text>
              <TextInput
                style={styles.targetInput}
                value={String(editedTeamInfo.targetPhysicalValue)}
                onChangeText={(text) => {
                  const intValue = text.replace(/[^0-9]/g, '');
                  setEditedTeamInfo({...editedTeamInfo, targetPhysicalValue: intValue});
                }}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.editActions}>
              <TouchableOpacity 
                style={[styles.editButton, styles.cancelButton]}
                onPress={() => setEditingTargets(false)}
              >
                <Text style={styles.editButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.editButton, styles.saveButton]}
                onPress={handleSaveTargets}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.editButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      <View style={styles.teamActions}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.leaveButton]}
          onPress={handleLeaveTeam}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.actionButtonText}>Leave Team</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderGoals = () => (
    <View style={styles.goalsContainer}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Team Goals</Text>
        <TouchableOpacity onPress={() => setGoalsModalVisible(true)}>
          <Ionicons name="add-circle" size={24} color="#4A90E2" />
        </TouchableOpacity>
      </View>
      <FlatList
        data={userTeam.goals}
        keyExtractor={(item) => item._id}
        renderItem={renderGoalCard}
      />
    </View>
  );

  const renderForfeits = () => (
    <View style={styles.forfeitsContainer}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Team Forfeits</Text>
        <TouchableOpacity onPress={() => setForfeitsModalVisible(true)}>
          <Ionicons name="add-circle" size={24} color="#4A90E2" />
        </TouchableOpacity>
      </View>
      <FlatList
        data={userTeam.forfeits}
        keyExtractor={(item) => item._id}
        renderItem={renderForfeitCard}
      />
    </View>
  );

  const renderGoalCard = ({ item }) => (
    <View style={styles.goalCard}>
      <View style={styles.goalHeader}>
        <Text style={styles.goalTitle}>{item.title}</Text>
        <View style={styles.goalActions}>
          <TouchableOpacity
            onPress={() => {
              setNewGoal(item);
              setGoalsModalVisible(true);
            }}
          >
            <Ionicons name="create-outline" size={24} color="#4A90E2" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleDeleteGoal(item._id)}
          >
            <Ionicons name="trash-outline" size={24} color="#E74C3C" />
          </TouchableOpacity>
        </View>
      </View>
      <Text style={styles.goalTarget}>Target: {item.target}</Text>
      <Text style={styles.goalCurrent}>Current: {item.current}</Text>
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            { width: `${(item.current / item.target) * 100}%` }
          ]}
        />
      </View>
    </View>
  );

  const renderForfeitCard = ({ item }) => (
    <View style={styles.forfeitCard}>
      <View style={styles.forfeitHeader}>
        <Text style={styles.forfeitDescription}>{item.description}</Text>
        <View style={styles.forfeitActions}>
          <TouchableOpacity 
            onPress={() => {
              setNewForfeit(item);
              setForfeitsModalVisible(true);
            }}
          >
            <Ionicons name="create-outline" size={24} color="#4A90E2" />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => handleDeleteForfeit(item._id)}
          >
            <Ionicons name="trash-outline" size={24} color="#E74C3C" />
          </TouchableOpacity>
        </View>
      </View>
      <Text style={styles.forfeitPoints}>{item.points} points</Text>
    </View>
  );

  const renderGoalModal = () => (
    <Modal
      visible={goalsModalVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setGoalsModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>
            {newGoal._id ? "Edit Goal" : "Add New Goal"}
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Goal Title"
            value={newGoal.title}
            onChangeText={(text) => setNewGoal({ ...newGoal, title: text })}
          />
          <TextInput
            style={styles.input}
            placeholder="Target Value"
            value={newGoal.target}
            onChangeText={(text) => setNewGoal({ ...newGoal, target: text })}
            keyboardType="numeric"
          />
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => {
                setNewGoal({ title: "", target: "", type: "physical" });
                setGoalsModalVisible(false);
              }}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.saveButton]}
              onPress={handleAddGoal}
            >
              <Text style={styles.buttonText}>
                {newGoal._id ? "Update" : "Add"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderForfeitModal = () => (
    <Modal
      visible={forfeitsModalVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setForfeitsModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>
            {newForfeit._id ? "Edit Forfeit" : "Add New Forfeit"}
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Forfeit Description"
            value={newForfeit.description}
            onChangeText={(text) => setNewForfeit({ ...newForfeit, description: text })}
          />
          <TextInput
            style={styles.input}
            placeholder="Points"
            value={String(newForfeit.points)}
            onChangeText={(text) => setNewForfeit({ ...newForfeit, points: parseInt(text) || 0 })}
            keyboardType="numeric"
          />
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => {
                setNewForfeit({ description: "", points: 0 });
                setForfeitsModalVisible(false);
              }}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.saveButton]}
              onPress={handleAddForfeit}
            >
              <Text style={styles.buttonText}>
                {newForfeit._id ? "Update" : "Add"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderCreateTeamModal = () => (
    <Modal
      visible={modalVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Create a New Team</Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Team Name *</Text>
            <TextInput
              style={styles.input}
              value={newTeam.name}
              onChangeText={(text) => setNewTeam({ ...newTeam, name: text })}
              placeholder="Enter a name for your team"
              maxLength={30}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Team Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={newTeam.description}
              onChangeText={(text) => setNewTeam({ ...newTeam, description: text })}
              placeholder="Describe your team's purpose or goals"
              multiline
              numberOfLines={4}
              maxLength={200}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Target Name</Text>
            <Dropdown
              style={styles.dropdown}
              placeholderStyle={styles.placeholderStyle}
              selectedTextStyle={styles.selectedTextStyle}
              data={targetData}
              maxHeight={300}
              labelField="label"
              valueField="value"
              placeholder="Select a category"
              value={newTeam.targetName}
              onChange={item => {
                setNewTeam({...newTeam, targetName: item.value});
              }}
            />
          </View>

          <View style={[styles.formGroup, styles.row]}>
            <View style={styles.halfWidth}>
              <Text style={styles.label}>Mental Target Value</Text>
              <TextInput
                style={styles.input}
                value={String(newTeam.targetMentalValue)}
                onChangeText={(text) => {
                  const intValue = text.replace(/[^0-9]/g, '');
                  setNewTeam({ ...newTeam, targetMentalValue: intValue });
                }}
                placeholder="e.g., 50, 100"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.halfWidth}>
              <Text style={styles.label}>Daily Mental Limit</Text>
              <Dropdown
                style={styles.dropdown}
                placeholderStyle={styles.placeholderStyle}
                selectedTextStyle={styles.selectedTextStyle}
                data={[
                  { label: '0', value: 0 },
                  { label: '1', value: 1 },
                  { label: '2', value: 2 },
                  { label: '3', value: 3 },
                  { label: '4', value: 4 },
                  { label: '5', value: 5 },
                  { label: '6', value: 6 },
                  { label: '7', value: 7 },
                ]}
                maxHeight={300}
                labelField="label"
                valueField="value"
                placeholder="Select limit"
                value={newTeam.dailyLimitMental}
                onChange={item => {
                  setNewTeam({...newTeam, dailyLimitMental: item.value});
                }}
              />
            </View>
          </View>

          <View style={[styles.formGroup, styles.row]}>
            <View style={styles.halfWidth}>
              <Text style={styles.label}>Physical Target Value</Text>
              <TextInput
                style={styles.input}
                value={String(newTeam.targetPhysicalValue)}
                onChangeText={(text) => {
                  const intValue = text.replace(/[^0-9]/g, '');
                  setNewTeam({ ...newTeam, targetPhysicalValue: intValue });
                }}
                placeholder="e.g., 200, 300"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.halfWidth}>
              <Text style={styles.label}>Daily Physical Limit</Text>
              <Dropdown
                style={styles.dropdown}
                placeholderStyle={styles.placeholderStyle}
                selectedTextStyle={styles.selectedTextStyle}
                data={[
                  { label: '0', value: 0 },
                  { label: '1', value: 1 },
                  { label: '2', value: 2 },
                  { label: '3', value: 3 },
                  { label: '4', value: 4 },
                  { label: '5', value: 5 },
                  { label: '6', value: 6 },
                  { label: '7', value: 7 },
                ]}
                maxHeight={300}
                labelField="label"
                valueField="value"
                placeholder="Select limit"
                value={newTeam.dailyLimitPhysical}
                onChange={item => {
                  setNewTeam({...newTeam, dailyLimitPhysical: item.value});
                }}
              />
            </View>
          </View>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.saveButton]}
              onPress={handleCreateTeam}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Create Team</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderTeamList = () => (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.header}>Teams</Text>
        <TouchableOpacity 
          style={styles.createButton}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="add-circle" size={20} color="#fff" />
          <Text style={styles.createButtonText}>Create</Text>
        </TouchableOpacity>
      </View>

      {/* Join team by ID */}
      <View style={styles.joinByIdCard}>
        <Text style={styles.joinByIdTitle}>Join a Team</Text>
        <Text style={styles.joinByIdSubtitle}>Enter a team ID to join an existing team</Text>
        <View style={styles.joinByIdContainer}>
          <TextInput
            style={styles.joinByIdInput}
            placeholder="Enter 6-digit Team ID..."
            value={teamIdToJoin}
            onChangeText={setTeamIdToJoin}
            maxLength={6}
            keyboardType="number-pad"
          />
          <TouchableOpacity 
            style={styles.joinByIdButton}
            onPress={handleJoinTeamById}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.joinByIdButtonText}>Join</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search teams..."
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={teams.filter(team => team.name.toLowerCase().includes(search.toLowerCase()))}
        keyExtractor={(item) => item._id}
        renderItem={renderTeamCard}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={styles.teamList}
        refreshing={loading}
        onRefresh={loadTeams}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      {userTeam ? (
        <ScrollView style={styles.scrollView}>
          {renderTeamDashboard()}
          {renderGoals()}
          {renderForfeits()}
        </ScrollView>
      ) : (
        renderTeamList()
      )}

      {renderCreateTeamModal()}

      {renderGoalModal()}
      {renderForfeitModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
    padding: 16,
  },
  // Join team by ID styles
  joinByIdCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  joinByIdTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 6,
  },
  joinByIdSubtitle: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 16,
  },
  joinByIdContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  joinByIdInput: {
    flex: 1,
    height: 50,
    paddingHorizontal: 15,
    backgroundColor: '#F8F9FA',
    fontSize: 16,
    color: '#2C3E50',
  },
  joinByIdButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  joinByIdButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  
  // Team info card styles
  dashboardCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  teamHeaderContainer: {
    marginBottom: 15,
  },
  teamHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  teamName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  editIconButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
  },
  teamDescription: {
    fontSize: 16,
    color: '#7F8C8D',
    marginBottom: 20,
    lineHeight: 22,
  },
  teamIdContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    marginTop: 15,
  },
  teamIdInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  teamIdLabel: {
    fontSize: 14,
    color: '#7F8C8D',
    marginRight: 8,
  },
  teamId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    letterSpacing: 1,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECF0F1',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  copyText: {
    fontSize: 14,
    color: '#4A90E2',
    marginLeft: 4,
    fontWeight: '500',
  },
  // Team card styles
  teamCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    padding: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  teamCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  teamCardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  teamIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  teamName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  teamIdBadge: {
    backgroundColor: '#F8F9FA',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  teamIdBadgeText: {
    fontSize: 12,
    color: '#7F8C8D',
    fontWeight: '500',
  },
  teamCardBody: {
    padding: 16,
  },
  description: {
    fontSize: 14,
    color: '#34495E',
    marginBottom: 12,
    lineHeight: 20,
  },
  teamMetaInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 8,
  },
  metaText: {
    fontSize: 13,
    color: '#7F8C8D',
    marginLeft: 4,
  },
  teamActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  teamActionButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  enterButton: {
    backgroundColor: "#2ECC71",
  },
  joinButton: {
    backgroundColor: "#4A90E2",
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    marginRight: 15,
  },
  leaveButton: {
    backgroundColor: '#FFEEEE',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  backButtonText: {
    marginLeft: 5,
    fontSize: 16,
    color: "#4A90E2",
    fontWeight: "bold",
  },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    width: '100%',
    marginBottom: 10,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  header: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#2C3E50",
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: "#4A90E2",
    padding: 10,
    borderRadius: 8,
  },
  createButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 5,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
  },
  teamList: {
    paddingBottom: 20,
  },
  teamCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  teamCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  teamName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2C3E50",
    marginLeft: 8,
  },
  teamCardBody: {
    marginBottom: 12,
  },
  memberCount: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  targetInfo: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  description: {
    fontSize: 14,
    color: "#666",
  },
  joinButton: {
    backgroundColor: "#4A90E2",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  joinButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2C3E50",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: "#666",
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "#fff",
    padding: 24,
    borderRadius: 16,
    width: "90%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2C3E50",
    marginBottom: 16,
  },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: "#F5F7FA",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  modalButton: {
    backgroundColor: "#4A90E2",
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
    alignItems: "center",
  },
  closeButton: {
    backgroundColor: "#E74C3C",
  },
  disabledButton: {
    opacity: 0.7,
  },
  scrollView: { padding: 16 },
  teamDashboard: { marginBottom: 20 },
  teamHeader: {
    marginBottom: 20,
  },
  teamTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 8,
  },
  teamDescription: {
    fontSize: 16,
    color: '#666',
  },
  progressContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  progressBar: {
    height: 10,
    backgroundColor: '#E8F0F2',
    borderRadius: 5,
    marginVertical: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4A90E2',
  },
  progressText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
  },
  membersContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E8F0F2',
  },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
  memberInfo: {
    marginLeft: 10,
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
  goalsContainer: { backgroundColor: "#fff", padding: 15, borderRadius: 10, marginBottom: 15 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  goalCard: { backgroundColor: "#F8F9FA", padding: 15, borderRadius: 10, marginBottom: 10 },
  goalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 5 },
  goalTitle: { fontSize: 16, fontWeight: "bold" },
  goalTarget: { fontSize: 14, color: "#666", marginTop: 5 },
  goalCurrent: { fontSize: 14, color: "#4A90E2", marginTop: 5 },
  goalActions: { flexDirection: "row", alignItems: "center" },
  forfeitsContainer: { backgroundColor: "#fff", padding: 15, borderRadius: 10, marginBottom: 15 },
  forfeitCard: { backgroundColor: "#F8F9FA", padding: 15, borderRadius: 10, marginBottom: 10 },
  forfeitHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 5 },
  forfeitDescription: { fontSize: 16 },
  forfeitPoints: { fontSize: 14, color: "#E74C3C", marginTop: 5 },
  forfeitActions: { flexDirection: "row", alignItems: "center" },
  teamActions: {
    marginTop: 20,
  },
  actionButton: {
    backgroundColor: '#4A90E2',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  leaveButton: {
    backgroundColor: '#E74C3C',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  targetsContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  targetCard: {
    backgroundColor: '#F8F9FA',
    padding: 15,
    borderRadius: 10,
  },
  targetName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 10,
  },
  targetValues: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  targetValue: {
    fontSize: 14,
    color: '#666',
  },
  picker: {
    width: "100%",
    height: 50,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#F5F7FA",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  halfWidth: {
    width: "48%",
  },
  dropdown: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#F5F7FA",
  },
  placeholderStyle: {
    fontSize: 16,
    color: "#7F8C8D",
  },
  selectedTextStyle: {
    fontSize: 16,
    color: "#2C3E50",
  },
  editTargetsContainer: {
    backgroundColor: '#F8F9FA',
    padding: 15,
    borderRadius: 10,
  },
  editSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 15,
  },
  editTargetField: {
    marginBottom: 12,
  },
  editTargetLabel: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 6,
  },
  targetInput: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#F5F7FA",
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  editButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#E0E0E0',
    marginRight: 8,
  },
  saveButton: {
    backgroundColor: '#4A90E2',
    marginLeft: 8,
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  editContainer: {
    marginTop: 10,
  },
  editInput: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
    backgroundColor: "#F5F7FA",
  },
  multilineInput: {
    height: 100,
    textAlignVertical: "top",
  }
});

