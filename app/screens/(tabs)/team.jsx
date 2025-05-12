import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList, Modal, StyleSheet, Image, ScrollView, Alert, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import teamService from "../../services/teamService";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { Dropdown } from 'react-native-element-dropdown';
import { useRouter } from 'expo-router';

export default function TeamsScreen() {
  const [teams, setTeams] = useState([]);
  const [userTeam, setUserTeam] = useState(null);
  const [search, setSearch] = useState("");
  const [teamIdToJoin, setTeamIdToJoin] = useState("");
  const [newTeam, setNewTeam] = useState({
    name: '',
    description: '',
    targetName: '',
    weeklyLimitPhysical: 7,
    weeklyLimitMental: 7
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
  const [currentUtcTime, setCurrentUtcTime] = useState('');
  const navigation = useNavigation();
  const router = useRouter();
  const [personalTargetModal, setPersonalTargetModal] = useState(false);
  const [personalTargetValue, setPersonalTargetValue] = useState(3);
  const [teamToJoin, setTeamToJoin] = useState(null);
  const [updateTargetModal, setUpdateTargetModal] = useState(false);
  const [newPersonalTarget, setNewPersonalTarget] = useState(0);

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
      if (userTeam) {
        loadTeamMemberActivities();
      }
    });

    return unsubscribe;
  }, [navigation, userTeam]);

  useEffect(() => {
    const updateUtcTime = () => {
      setCurrentUtcTime(new Date().toUTCString());
    };
    updateUtcTime();
    const intervalId = setInterval(updateUtcTime, 1000); // Update every second
    return () => clearInterval(intervalId); // Cleanup interval on component unmount
  }, []);

  useEffect(() => {
    if (userTeam) {
      loadTeamMemberActivities();
    }
  }, [userTeam?._id]);

  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const parsedUser = JSON.parse(userData);
        setUserId(parsedUser.id);
        await loadTeams(false); // Don't load from storage by default
        await loadTeams(false); // Don't load from storage by default
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadTeams = async (loadFromStorage = false) => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        console.log('No token found');
        return;
      }

      // Only load from storage if explicitly asked to
      if (loadFromStorage) {
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
      }

      console.log('Loading teams...');
      const teamsData = await teamService.getAllTeams();
      console.log('Teams data:', teamsData);

      if (!Array.isArray(teamsData)) {
        console.error('Teams data is not an array:', teamsData);
        setTeams([]);
        return;
      }

      // Display all teams, not just those with members
      setTeams(teamsData);

      // Find the team that the user belongs to
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const parsedUser = JSON.parse(userData);
        console.log('Current user ID:', parsedUser.id);
        
        const userTeam = teamsData.find(team => {
          console.log('Checking team:', team._id);
          console.log('Team members:', team.members);
          return team.members && team.members.some(member => {
            console.log('Member user:', member.user);
            return member.user && (member.user._id === parsedUser.id || member.user.id === parsedUser.id);
          });
        });
        
        console.log('Found user team:', userTeam);
        if (userTeam && loadFromStorage) {
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
        weeklyLimitPhysical: parseInt(newTeam.weeklyLimitPhysical),
        weeklyLimitMental: parseInt(newTeam.weeklyLimitMental)
      };
      
      const createdTeam = await teamService.createTeam(teamData);
      
      // Store the newly created team data in AsyncStorage
      try {
        const userData = await AsyncStorage.getItem('user');
        if (userData) {
          await AsyncStorage.setItem('userTeam', JSON.stringify(createdTeam));
          console.log('Saved team data to AsyncStorage:', createdTeam);
        }
      } catch (storageError) {
        console.error('Error saving team data to AsyncStorage:', storageError);
      }
      
      setModalVisible(false);
      setNewTeam({
        name: '',
        description: '',
        targetName: '',
        weeklyLimitPhysical: 7,
        weeklyLimitMental: 7
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
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert('Error', 'Please log in first');
        return;
      }

      // Always use the deployed URL
      const apiUrl = 'https://slugger-app-group6.onrender.com/api';
      console.log('Finding team with ID:', teamIdToJoin);
      
      // First get the team by ID
      const response = await fetch(`${apiUrl}/teams/all`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch teams');
      }
      
      const teamsData = await response.json();
      const team = teamsData.find(t => t.teamId === teamIdToJoin || t.groupId === teamIdToJoin);
      
      if (!team) {
        throw new Error('Team not found with the provided ID');
      }
      
      // Show personal target modal instead of joining immediately
      setTeamToJoin(team);
      setPersonalTargetValue(3); // Default value
      setPersonalTargetModal(true);
      setLoading(false);
      
    } catch (error) {
      console.error('Error joining team by ID:', error);
      Alert.alert('Error', error.message || 'Failed to join team');
      setLoading(false);
    }
  };

  const handleJoinTeam = async (teamId) => {
    try {
      const team = teams.find(t => t._id === teamId);
      if (!team) {
        Alert.alert('Error', 'Team not found');
        return;
      }
      
      // Show personal target input modal
      setTeamToJoin(team);
      setPersonalTargetValue(3); // Default value
      setPersonalTargetModal(true);
      
    } catch (error) {
      console.error('Error preparing to join team:', error);
      Alert.alert('Error', error.message || 'Failed to prepare team join');
    }
  };

  // Enhanced leave team functionality to ensure state refresh after leaving
  const handleLeaveTeam = async () => {
    if (!userTeam) {
      console.log('No team to leave');
      return;
    }
    
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert('Error', 'Please log in first');
        return;
      }
      
      console.log('Preparing to leave team:', userTeam._id);
      
      // Save team ID for later use
      const teamIdToLeave = userTeam._id;
      
      // Always use the deployed URL
      const apiUrl = 'https://slugger-app-group6.onrender.com/api';
      
      // Call the leave team API endpoint
      const response = await fetch(`${apiUrl}/teams/leave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          teamId: teamIdToLeave
        })
      });
      
      if (response.ok) {
        console.log('Successfully left team');
        
        // Clear user team state and team data from AsyncStorage
        setUserTeam(null);
        await AsyncStorage.removeItem('userTeam');
        
        // Reload the team list
        await loadTeams();
        
        Alert.alert('Success', 'You left the team successfully');
      } else {
        const data = await response.json();
        throw new Error(data.message || 'Failed to leave team');
      }
    } catch (error) {
      console.error('Error leaving team:', error);
      Alert.alert('Error', error.message || 'Failed to leave team');
    } finally {
      setLoading(false);
    }
  };
  
  // Separate function to handle "Back" button in team list
  const handleBackToTeamList = async () => {
    console.log('Returning to team list without leaving');
    // Clear stored team data from AsyncStorage
    try {
      await AsyncStorage.removeItem('userTeam');
      console.log('Cleared team data from AsyncStorage');
    } catch (error) {
      console.error('Error clearing team data from AsyncStorage:', error);
    }
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

  // Load team member activities and update progress
  const loadTeamMemberActivities = async () => {
    if (!userTeam || !userTeam._id) return;
    
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;
      
      // Always use the deployed URL
      const apiUrl = 'https://slugger-app-group6.onrender.com/api';
      console.log('Loading team activities for team:', userTeam._id);
      
      // Get the current user ID
      const userData = await AsyncStorage.getItem('user');
      let userId = null;
      if (userData) {
        const user = JSON.parse(userData);
        userId = user.id;
        console.log('Current user ID:', userId);
      }
      
      // Fetch team activities
      const response = await fetch(`${apiUrl}/teams/${userTeam._id}/activities`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Team activities loaded:', data);
        
        // Update userTeam with the activity data
        const updatedTeam = {...userTeam};
        
        // Calculate the total target and completed activities
        let totalTarget = 0;
        let totalCompleted = 0;
        
        if (data.members && Array.isArray(data.members)) {
          console.log('Members data received:', data.members.length);
          
          // Update member activity counts
          updatedTeam.members = updatedTeam.members.map(member => {
            // Get the member ID in a reliable way
            const memberId = member._id || member.id || 
                            (member.user && (member.user._id || member.user.id));
            
            console.log(`Updating member ${memberId}`);
            
            // Find the matching member data
            const memberData = data.members.find(m => 
              m.userId === memberId || 
              m.userId === member._id || 
              m.userId === member.id ||
              (member.user && (m.userId === member.user._id || m.userId === member.user.id))
            );
            
            if (memberData) {
              console.log(`Found member data for ${memberId}:`, memberData);
              totalTarget += memberData.personalTarget || 0;
              totalCompleted += memberData.completedActivities || 0;
              
              return {
                ...member,
                personalTarget: memberData.personalTarget || 0,
                completedActivities: memberData.completedActivities || 0
              };
            } else {
              console.log(`No member data found for ${memberId}`);
              return member;
            }
          });
          
          console.log('Updated members:', updatedTeam.members);
          
          // Check if the current user has a personal target in the received data
          if (userId) {
            const currentUserData = data.members.find(m => 
              m.userId === userId || 
              m.userId.toString() === userId.toString()
            );
            
            if (currentUserData) {
              console.log('Current user personal target:', currentUserData.personalTarget);
              // Update the state for the modal
              setPersonalTargetValue(currentUserData.personalTarget);
            }
          }
          
          // Update the team target and progress
          updatedTeam.calculatedTargetValue = totalTarget;
          const progress = totalTarget > 0 ? Math.round((totalCompleted / totalTarget) * 100) : 0;
          
          console.log(`Team target: ${totalTarget}, Completed: ${totalCompleted}, Progress: ${progress}%`);
          
          // Store cycle information from the API
          if (data.cycleInfo) {
            console.log('Cycle info received:', data.cycleInfo);
            updatedTeam.cycleInfo = data.cycleInfo;
          }
          
          setUserTeam(updatedTeam);
          setTeamProgress(progress);
        }
      } else {
        console.error('Failed to load team activities');
        // Try fallback to fetch team target
        await fetchTeamTarget();
      }
    } catch (error) {
      console.error('Error loading team activities:', error);
      // Try fallback to fetch team target
      await fetchTeamTarget();
    }
  };
  
  // Fallback function to fetch just the team target
  const fetchTeamTarget = async () => {
    if (!userTeam || !userTeam._id) return;
    
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;
      
      // Always use the deployed URL
      const apiUrl = 'https://slugger-app-group6.onrender.com/api';
      
      const response = await fetch(`${apiUrl}/teams/${userTeam._id}/target?recalculate=true`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Team target loaded:', data);
        
        const updatedTeam = {...userTeam, 
          targetValue: data.targetValue,
          calculatedTargetValue: data.targetValue
        };
        
        setUserTeam(updatedTeam);
      }
    } catch (error) {
      console.error('Error fetching team target:', error);
    }
  };

  // Calculate total personal targets and progress - Updated to use direct value from API
  const calculateTeamTargets = (team) => {
    if (!team) return { total: 0, completed: 0, progress: 0 };
    
    // Use the calculated value from API if available
    if (team.calculatedTargetValue !== undefined) {
      const completed = team.members?.reduce((sum, member) => sum + (member.completedActivities || 0), 0) || 0;
      const progress = team.calculatedTargetValue > 0 
        ? Math.round((completed / team.calculatedTargetValue) * 100) 
        : 0;
      
      return { 
        total: team.calculatedTargetValue, 
        completed, 
        progress 
      };
    }
    
    // Fallback to target value in team document
    const targetValue = team.targetValue || 0;
    const completed = team.members?.reduce((sum, member) => sum + (member.completedActivities || 0), 0) || 0;
    const progress = targetValue > 0 ? Math.round((completed / targetValue) * 100) : 0;
    
    return { total: targetValue, completed, progress };
  };

  useEffect(() => {
    if (userTeam) {
      const teamTargets = calculateTeamTargets(userTeam);
      setTeamProgress(teamTargets.progress);
    }
  }, [userTeam]);

  // Enter team instead of joining (already a member)
  const handleEnterTeam = (team) => {
    // Initialize edit state
    setIsEditingTeam(false);
    setEditedTeam({
      name: team.name || '',
      description: team.description || ''
    });
    setUserTeam(team);
    
    // Load team member activities when entering a team
    setTimeout(() => {
      loadTeamMemberActivities();
    }, 500);
  };
  
  const renderTeamCard = ({ item }) => {
    // Check if user is a team member.
    // item.members are populated user objects from the backend.
    // Each member object should have an _id (ObjectId) and/or id (string virtual).
    // userId is the current logged-in user's ID string.
    const isTeamMember = item.members && Array.isArray(item.members) && item.members.some(member => {
      if (member && userId) { // Ensure both member object and current userId are available
        // Compare string versions of IDs to be safe
        const memberIdString = member.id || (member._id ? member._id.toString() : null);
        return memberIdString === userId;
      }
      return false;
    });
    
    // It's helpful to keep this log for debugging if issues persist.
    console.log(`Team: ${item.name}, Current UserID: ${userId}`);
    item.members.forEach(m => {
      const memberIdStr = m.id || (m._id ? m._id.toString() : 'NO_ID');
      console.log(`  Comparing Member ID: ${memberIdStr} (name: ${m.username || m.name}) with UserID: ${userId}. Match: ${memberIdStr === userId}`);
    });
    console.log(`Result for ${item.name} - isTeamMember: ${isTeamMember}`);
    
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

      // Always use the deployed URL
      const apiUrl = 'https://slugger-app-group6.onrender.com/api';
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

      // Always use the deployed URL
      const apiUrl = 'https://slugger-app-group6.onrender.com/api';
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

      // Always use the deployed URL
      const apiUrl = 'https://slugger-app-group6.onrender.com/api';
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

  // Function to calculate and format the end of the current 7-day cycle
  const calculateCycleEndDate = (team) => {
    if (team?.cycleInfo) {
      // Use the cycleInfo from API response
      const cycleEnd = new Date(team.cycleInfo.cycleEnd);
      
      // Calculate remaining time correctly
      const now = new Date();
      const msUntilCycleEnd = cycleEnd.getTime() - now.getTime();
      
      // Get full days (use Math.floor to avoid having extra days)
      const daysUntilCycleEnd = Math.floor(msUntilCycleEnd / (1000 * 60 * 60 * 24));
      
      // Get remaining hours after full days are counted
      const hoursUntilCycleEnd = Math.floor((msUntilCycleEnd % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      
      return `${daysUntilCycleEnd}d ${hoursUntilCycleEnd}h left (${cycleEnd.toUTCString()})`;
    }
    
    // Fallback to calculating based on team creation date
    if (!team || !team.createdAt) return 'Unknown';
    
    const teamCreationDate = new Date(team.createdAt);
    const now = new Date();
    const msSinceCreation = now.getTime() - teamCreationDate.getTime();
    const daysSinceCreation = Math.floor(msSinceCreation / (1000 * 60 * 60 * 24));
    const currentCycleNumber = Math.floor(daysSinceCreation / 7);
    
    const cycleStartDate = new Date(teamCreationDate);
    cycleStartDate.setUTCDate(teamCreationDate.getUTCDate() + currentCycleNumber * 7);
    
    const cycleEndDate = new Date(cycleStartDate);
    cycleEndDate.setUTCDate(cycleStartDate.getUTCDate() + 7);
    
    const msUntilCycleEnd = cycleEndDate.getTime() - now.getTime();
    // Use Math.floor instead of Math.ceil for days to avoid overflow
    const daysUntilCycleEnd = Math.floor(msUntilCycleEnd / (1000 * 60 * 60 * 24));
    // Calculate remaining hours after full days
    const hoursUntilCycleEnd = Math.floor((msUntilCycleEnd % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    return `${daysUntilCycleEnd}d ${hoursUntilCycleEnd}h left (${cycleEndDate.toUTCString()})`;
  };

  // Team members section with personal targets
  const renderTeamMembers = () => (
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
            <Text style={styles.memberTarget}>Personal Target: {member.personalTarget || 3}</Text>
          </View>
        </View>
      ))}
    </View>
  );

  // Team progress section showing sum of personal targets
  const renderTeamProgress = () => (
    <View style={styles.progressContainer}>
      <Text style={styles.sectionTitle}>Team Progress</Text>
      <View style={styles.teamTargetInfo}>
        <Text style={styles.teamTargetText}>
          Team Target: {calculateTeamTargets(userTeam).total} points 
          ({calculateTeamTargets(userTeam).completed} completed)
        </Text>
      </View>
      
      {/* Current cycle information */}
      <View style={styles.cycleInfoContainer}>
        <Text style={styles.cycleLabel}>
          Current 7-Day Cycle: {userTeam?.cycleInfo?.currentCycle || 0}
        </Text>
        <Text style={styles.cycleEndInfo}>
          Cycle Ends: {calculateCycleEndDate(userTeam)}
        </Text>
      </View>
      <Text style={styles.cycleNote}>
        * Progress resets at the end of each 7-day cycle
      </Text>
      
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${teamProgress}%` }]} />
      </View>
      <Text style={styles.progressText}>{teamProgress}% Complete</Text>
    </View>
  );

  // Team targets section showing weekly limits
  const renderTeamTargets = () => (
    <View style={styles.targetsContainer}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Team Target Settings</Text>
        <TouchableOpacity onPress={handleEditTargets}>
          <Ionicons name="create-outline" size={24} color="#4A90E2" />
        </TouchableOpacity>
      </View>
      
      {!editingTargets ? (
        <View>
          <View style={styles.targetCard}>
            <Text style={styles.targetName}>{userTeam.targetName}</Text>
            <View style={styles.targetValues}>
              <Text style={styles.targetValue}>Weekly Mental Limit: {userTeam.weeklyLimitMental || 7}</Text>
              <Text style={styles.targetValue}>Weekly Physical Limit: {userTeam.weeklyLimitPhysical || 7}</Text>
              <Text style={styles.targetValue}>Total Personal Targets: {calculateTeamTargets(userTeam).total}</Text>
            </View>
          </View>
          
          {/* Add explanation for weekly limits */}
          <View style={styles.limitsExplanationContainer}>
            <Text style={styles.limitsExplanationTitle}>What are weekly limits?</Text>
            <Text style={styles.limitsExplanationText}>
              Weekly limits determine how many activities of each type (mental/physical) you can log per 7-day cycle. 
              Once you reach both mental and physical limits, you unlock the ability to log additional activities beyond these limits.
            </Text>
            <Text style={styles.limitsExplanationExample}>
              Example: With limits of 6 mental and 6 physical, you must complete 6 of each type before unlocking unlimited logging for the remainder of the cycle.
            </Text>
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
          <View style={[styles.formGroup, styles.row]}>
            <View style={styles.halfWidth}>
              <Text style={styles.label}>Weekly Mental Limit</Text>
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
                value={newTeam.weeklyLimitMental}
                onChange={item => {
                  setNewTeam({...newTeam, weeklyLimitMental: item.value});
                }}
              />
            </View>

            <View style={styles.halfWidth}>
              <Text style={styles.label}>Weekly Physical Limit</Text>
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
                value={newTeam.weeklyLimitPhysical}
                onChange={item => {
                  setNewTeam({...newTeam, weeklyLimitPhysical: item.value});
                }}
              />
            </View>
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
  );

  // Fix renderTeamDashboard to use new component functions and remove goals section
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
            <Text style={styles.utcTimeText}>Current UTC: {currentUtcTime}</Text>
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
          
          {/* Team cycle information */}
          <View style={styles.cycleDateContainer}>
            <Text style={styles.cycleDateLabel}>Current cycle ends:</Text>
            <Text style={styles.cycleDateValue}>{calculateCycleEndDate(userTeam)}</Text>
          </View>
        </View>
      </View>

      {/* Personal Target Update Section - Only visible on first day of cycle */}
      {isFirstDayOfCycle(userTeam) && (
        <View style={styles.personalTargetUpdateContainer}>
          <View style={styles.personalTargetUpdateHeader}>
            <Text style={styles.personalTargetUpdateTitle}>Your Personal Target</Text>
            <Text style={styles.personalTargetValue}>
              Current: {userTeam.members?.find(m => m.id === userId)?.personalTarget || personalTargetValue} points
            </Text>
          </View>
          <Text style={styles.personalTargetUpdateInfo}>
            You can adjust your personal target on the first day of each 7-day cycle.
          </Text>
          <TouchableOpacity 
            style={styles.updateTargetButton}
            onPress={() => {
              // Initialize with current personal target
              const currentTarget = userTeam.members?.find(m => m.id === userId)?.personalTarget || personalTargetValue;
              setNewPersonalTarget(currentTarget);
              setUpdateTargetModal(true);
            }}
          >
            <Text style={styles.updateTargetButtonText}>Update Personal Target</Text>
          </TouchableOpacity>
        </View>
      )}

      {renderTeamProgress()}
      {renderTeamMembers()}
      {renderTeamTargets()}

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
              <Text style={styles.label}>Weekly Mental Limit</Text>
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
                value={newTeam.weeklyLimitMental}
                onChange={item => {
                  setNewTeam({...newTeam, weeklyLimitMental: item.value});
                }}
              />
            </View>

            <View style={styles.halfWidth}>
              <Text style={styles.label}>Weekly Physical Limit</Text>
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
                value={newTeam.weeklyLimitPhysical}
                onChange={item => {
                  setNewTeam({...newTeam, weeklyLimitPhysical: item.value});
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
          onPress={() => {
            console.log('Create button pressed');
            router.push('/screens/create-group');
          }}
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

  // Handle setting personal target and joining team
  const handleSetPersonalTargetAndJoin = async () => {
    if (!teamToJoin) return;
    
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert('Error', 'Please log in first');
        return;
      }
      
      const apiUrl = global.workingApiUrl || 'http://localhost:5001/api';
      console.log('Joining team with personal target:', personalTargetValue);
      
      // First join the team
      const joinResponse = await fetch(`${apiUrl}/teams/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          teamId: teamToJoin._id
        })
      });
      
      const joinData = await joinResponse.json();
      
      if (!joinResponse.ok && joinData.message !== 'Already a member') {
        throw new Error(joinData.message || 'Failed to join team');
      }
      
      console.log('Successfully joined team, setting personal target:', personalTargetValue);
      
      // Now set the personal target for this team
      const targetResponse = await fetch(`${apiUrl}/user-team-targets/${teamToJoin._id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          targetValue: parseInt(personalTargetValue) // Ensure it's an integer
        })
      });
      
      const targetData = await targetResponse.json();
      console.log('Target response data:', targetData);
      
      if (!targetResponse.ok) {
        console.error('Failed to set personal target, but joined team');
      }
      
      // Create a new team object with updated personal target info
      const updatedTeam = {...teamToJoin};
      
      // Make sure we apply the personal target to the right user
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        const userId = user.id;
        
        // Update the personal target for this user in the members array
        if (updatedTeam.members) {
          updatedTeam.members = updatedTeam.members.map(member => {
            const memberId = member._id || member.id || (member.user && (member.user._id || member.user.id));
            if (memberId === userId) {
              return {
                ...member,
                personalTarget: parseInt(personalTargetValue)
              };
            }
            return member;
          });
        }
      }
      
      // Update local state
      setUserTeam(updatedTeam);
      setPersonalTargetModal(false);
      setTeamToJoin(null);
      
      Alert.alert('Success', 'Successfully joined the team with your personal target');
      
      // Reload the team data to get fresh information
      loadTeams();
      
      // Load team activities to update the progress
      setTimeout(() => {
        loadTeamMemberActivities();
      }, 500);
      
    } catch (error) {
      console.error('Error setting personal target and joining team:', error);
      Alert.alert('Error', error.message || 'Failed to join team');
    } finally {
      setLoading(false);
    }
  };

  // Add a personal target modal renderer
  const renderPersonalTargetModal = () => (
    <Modal
      visible={personalTargetModal}
      transparent
      animationType="slide"
      onRequestClose={() => {
        setPersonalTargetModal(false);
        setTeamToJoin(null);
      }}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Set Your Personal Target</Text>
          <Text style={styles.modalDescription}>
            How many activities do you want to complete for this team? This will contribute to the team's overall target.
          </Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Your Personal Target</Text>
            <TextInput
              style={styles.input}
              value={String(personalTargetValue)}
              onChangeText={(text) => {
                const numValue = parseInt(text) || 0;
                if (numValue < 99) {
                  setPersonalTargetValue(numValue);
                }
              }}
              keyboardType="numeric"
              placeholder="Enter your target (0-99)"
              maxLength={2}
            />
          </View>
          
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => {
                setPersonalTargetModal(false);
                setTeamToJoin(null);
              }}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.saveButton]}
              onPress={handleSetPersonalTargetAndJoin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Join Team</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Add a new function to check if today is the first day of the cycle
  const isFirstDayOfCycle = (team) => {
    if (!team || !team.cycleInfo) return false;
    
    const cycleStart = new Date(team.cycleInfo.cycleStart);
    const now = new Date();
    
    // Check if today's date matches the cycle start date
    return (
      now.getUTCFullYear() === cycleStart.getUTCFullYear() &&
      now.getUTCMonth() === cycleStart.getUTCMonth() &&
      now.getUTCDate() === cycleStart.getUTCDate()
    );
  };

  // Handle updating personal target
  const handleUpdatePersonalTarget = async () => {
    if (!userTeam || !userTeam._id) return;
    
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert('Error', 'Please log in first');
        return;
      }
      
      const apiUrl = global.workingApiUrl || 'http://localhost:5001/api';
      
      // Update the personal target for this team
      const response = await fetch(`${apiUrl}/user-team-targets/${userTeam._id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          targetValue: parseInt(newPersonalTarget) // Ensure it's an integer
        })
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to update personal target');
      }
      
      // Update the UI
      Alert.alert('Success', 'Your personal target has been updated for this cycle');
      setUpdateTargetModal(false);
      
      // Reload team activities to update the UI
      loadTeamMemberActivities();
      
    } catch (error) {
      console.error('Error updating personal target:', error);
      Alert.alert('Error', error.message || 'Failed to update personal target');
    } finally {
      setLoading(false);
    }
  };

  // Add a new modal for updating personal target
  const renderUpdatePersonalTargetModal = () => (
    <Modal
      visible={updateTargetModal}
      transparent
      animationType="slide"
      onRequestClose={() => setUpdateTargetModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Update Personal Target</Text>
          <Text style={styles.modalDescription}>
            Set your personal activity target for this 7-day cycle. 
            This represents how many activities you aim to complete during this cycle.
          </Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Your Personal Target</Text>
            <TextInput
              style={styles.input}
              value={String(newPersonalTarget)}
              onChangeText={(text) => {
                const numValue = parseInt(text) || 0;
                if (numValue < 99) {
                  setNewPersonalTarget(numValue);
                }
              }}
              keyboardType="numeric"
              placeholder="Enter your target (0-99)"
              maxLength={2}
            />
          </View>
          
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setUpdateTargetModal(false)}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.saveButton]}
              onPress={handleUpdatePersonalTarget}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      {userTeam ? (
        <ScrollView style={styles.scrollView}>
          {renderTeamDashboard()}
        </ScrollView>
      ) : (
        renderTeamList()
      )}

      {renderCreateTeamModal()}
      {renderPersonalTargetModal()}
      {renderUpdatePersonalTargetModal()}
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
  },
  utcTimeText: {
    fontSize: 14,
    color: '#7F8C8D',
    marginLeft: 8,
  },
  cycleDateContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  cycleDateLabel: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  cycleDateValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  teamTargetInfo: {
    marginBottom: 10,
    backgroundColor: '#F8F9FA',
    padding: 10,
    borderRadius: 8,
  },
  teamTargetText: {
    fontSize: 14,
    color: '#2C3E50',
    fontWeight: '500',
  },
  modalDescription: {
    fontSize: 16,
    color: '#7F8C8D',
    marginBottom: 16,
  },
  memberTarget: {
    fontSize: 14,
    color: '#4A90E2',
    fontWeight: '500',
  },
  cycleInfoContainer: {
    marginVertical: 8,
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    padding: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#4A90E2',
  },
  cycleLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 4,
  },
  cycleEndInfo: {
    fontSize: 14,
    color: '#2C3E50',
  },
  cycleNote: {
    fontSize: 12,
    color: '#7F8C8D',
    fontStyle: 'italic',
    marginBottom: 10,
  },
  limitsExplanationContainer: {
    marginTop: 15,
    backgroundColor: '#f8f9ff',
    padding: 15,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#7f8be4',
  },
  limitsExplanationTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 8,
  },
  limitsExplanationText: {
    fontSize: 14,
    color: '#34495e',
    lineHeight: 20,
    marginBottom: 8,
  },
  limitsExplanationExample: {
    fontSize: 13,
    color: '#7f8be4',
    fontStyle: 'italic',
  },
  personalTargetUpdateContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  personalTargetUpdateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  personalTargetUpdateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  personalTargetValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#4A90E2',
  },
  personalTargetUpdateInfo: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  updateTargetButton: {
    backgroundColor: '#4A90E2',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  updateTargetButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
