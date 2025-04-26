import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import teamService from "../../services/teamService";
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function TeamsScreen() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joiningTeamId, setJoiningTeamId] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const router = useRouter();

  // 获取所有团队数据
  useEffect(() => {
    fetchTeams();
    fetchCurrentUser();
  }, []);

  // 获取当前用户ID
  const fetchCurrentUser = async () => {
    try {
      const userId = await AsyncStorage.getItem('userId');
      setCurrentUserId(userId);
      console.log('Current user ID:', userId);
    } catch (error) {
      console.error('Error fetching current user ID:', error);
    }
  };

  // 获取团队数据的函数
  const fetchTeams = async () => {
    try {
      setLoading(true);
<<<<<<< Updated upstream
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.log('No token found');
        return;
      }

      const apiUrl = global.workingApiUrl || 'http://localhost:5001/api';
      console.log('Loading teams from:', `${apiUrl}/groups/all`);
      
      const response = await fetch(`${apiUrl}/groups/all`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);

      if (!response.ok) {
        throw new Error(data.message || 'Failed to load teams');
      }

      if (!Array.isArray(data)) {
        console.error('Teams data is not an array:', data);
        setTeams([]);
        return;
      }

      // Filter out teams with no members
      const activeTeams = data.filter(team => team.members && team.members.length > 0);
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
        setUserTeam(userTeam);
      }
=======
      const teamsData = await teamService.getAllTeams();
      console.log('Fetched teams data:', teamsData);
      setTeams(teamsData);
>>>>>>> Stashed changes
    } catch (error) {
      console.error('Error fetching teams:', error);
      Alert.alert('Error', 'Failed to load teams');
    } finally {
      setLoading(false);
    }
  };

<<<<<<< Updated upstream
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
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'Please log in first');
        return;
      }

      const apiUrl = global.workingApiUrl || 'http://localhost:5001/api';
      const response = await fetch(`${apiUrl}/groups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newTeam.name,
          description: newTeam.description,
          targetName: newTeam.targetName,
          targetMentalValue: parseInt(newTeam.targetMentalValue),
          targetPhysicalValue: parseInt(newTeam.targetPhysicalValue),
          dailyLimitPhysical: parseInt(newTeam.dailyLimitPhysical),
          dailyLimitMental: parseInt(newTeam.dailyLimitMental)
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to create team');
      }

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
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'Please log in first');
        return;
      }

      const apiUrl = global.workingApiUrl || 'http://localhost:5001/api';
      console.log('Joining team by ID:', teamIdToJoin);
      
      const response = await fetch(`${apiUrl}/groups/join-by-id`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ groupId: teamIdToJoin })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to join team');
      }

      Alert.alert('Success', 'Joined team successfully');
      setTeamIdToJoin('');
      await loadTeams();
      
      // Find the recently joined team and set it as current team
      const joinedTeam = teams.find(team => team._id === teamIdToJoin);
      if (joinedTeam) {
        setUserTeam(joinedTeam);
      }
    } catch (error) {
      console.error('Error joining team by ID:', error);
      Alert.alert('Error', error.message || 'Failed to join team');
    } finally {
      setLoading(false);
    }
=======
  // 处理创建新团队
  const handleCreateTeam = () => {
    router.push('/screens/create-group');
  };

  // 处理查看团队详情
  const handleViewTeamDetails = (teamId) => {
    router.push({
      pathname: "/screens/team-details",
      params: { teamId }
    });
>>>>>>> Stashed changes
  };

  // 处理加入团队请求
  const handleJoinTeam = async (teamId) => {
    try {
<<<<<<< Updated upstream
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
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
=======
      setJoiningTeamId(teamId);
      await teamService.joinTeam(teamId);
      Alert.alert('Success', 'You have successfully joined the team!');
      // 重新获取团队列表，更新UI
      await fetchTeams();
>>>>>>> Stashed changes
    } catch (error) {
      console.error('Error joining team:', error);
      Alert.alert('Error', error.message || 'Failed to join team');
    } finally {
      setJoiningTeamId(null);
    }
  };

  // 检查用户是否已经是团队成员
  const isMemberOfTeam = (team) => {
    if (!currentUserId || !team.members) return false;
    
<<<<<<< Updated upstream
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
      AsyncStorage.getItem('token').then(token => {
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
=======
    return team.members.some(member => {
      if (typeof member === 'object') {
        return member._id === currentUserId;
>>>>>>> Stashed changes
      }
      return member === currentUserId;
    });
  };

  // 渲染单个团队卡片
  const renderTeamCard = (team) => {
    const isAlreadyMember = isMemberOfTeam(team);

    return (
      <TouchableOpacity
        key={team._id}
        style={styles.teamCard}
        onPress={() => handleViewTeamDetails(team._id)}
      >
        <View style={styles.teamCardHeader}>
          <Text style={styles.teamName}>{team.name}</Text>
          <Text style={styles.teamId}>ID: {team.teamId}</Text>
        </View>
        <Text style={styles.teamDescription}>{team.description || 'No description'}</Text>
        <View style={styles.teamMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="people" size={16} color="#666" />
            <Text style={styles.metaText}>
              {team.members?.length || 0} {team.members?.length === 1 ? 'Member' : 'Members'}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="trophy" size={16} color="#666" />
            <Text style={styles.metaText}>Target: {team.targetName || 'None'}</Text>
          </View>
        </View>
        
        {/* Join/Enter 按钮 */}
        <View style={styles.joinButtonContainer}>
          {isAlreadyMember ? (
            <TouchableOpacity 
              style={styles.enterButton}
              onPress={(e) => {
                e.stopPropagation(); // 防止触发卡片的点击事件
                handleViewTeamDetails(team._id);
              }}
            >
              <Ionicons name="enter-outline" size={16} color="#FFF" />
              <Text style={styles.enterButtonText}>Enter</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={styles.joinButton}
              onPress={(e) => {
                e.stopPropagation(); // 防止触发卡片的点击事件
                handleJoinTeam(team._id);
              }}
              disabled={joiningTeamId === team._id}
            >
              {joiningTeamId === team._id ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Ionicons name="add-circle-outline" size={16} color="#FFF" />
                  <Text style={styles.joinButtonText}>Join</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

<<<<<<< Updated upstream
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
      const token = await AsyncStorage.getItem('token');
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
      const token = await AsyncStorage.getItem('token');
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
      const token = await AsyncStorage.getItem('token');
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
              <Text style={styles.teamId}>{userTeam.groupId}</Text>
            </View>
            <TouchableOpacity 
              style={styles.copyButton}
              onPress={async () => {
                try {
                  // Use the newly installed expo-clipboard package
                  if (userTeam.groupId) {
                    await Clipboard.setStringAsync(userTeam.groupId.toString());
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

=======
>>>>>>> Stashed changes
  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.headerContainer}>
          <Text style={styles.header}>Teams</Text>
          <TouchableOpacity style={styles.createButton} onPress={handleCreateTeam}>
            <Ionicons name="add-circle" size={20} color="#fff" />
            <Text style={styles.createButtonText}>Create</Text>
          </TouchableOpacity>
        </View>

        {/* Join team by ID section */}
        <TouchableOpacity 
          style={styles.joinByIdCard}
          onPress={() => router.push('/join-group')}
        >
          <Text style={styles.joinByIdTitle}>Join a Team</Text>
          <Text style={styles.joinByIdSubtitle}>Enter a team ID to join an existing team</Text>
        </TouchableOpacity>

        {/* Loading indicator */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4A90E2" />
            <Text style={styles.loadingText}>Loading teams...</Text>
          </View>
        ) : (
          <>
            {/* Team list or empty state */}
            {teams.length > 0 ? (
              <View style={styles.teamList}>
                {teams.map(team => renderTeamCard(team))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={64} color="#4A90E2" />
                <Text style={styles.emptyStateTitle}>No Teams Found</Text>
                <Text style={styles.emptyStateText}>
                  Create a new team or join an existing one to get started!
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
    padding: 16,
  },
  scrollView: {
    flex: 1,
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  header: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#2C3E50",
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
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
  joinByIdCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  joinByIdTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2C3E50",
    marginBottom: 6,
  },
  joinByIdSubtitle: {
    fontSize: 14,
    color: "#7F8C8D",
    marginBottom: 16,
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
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
    textAlign: "center",
  },
  teamList: {
    marginTop: 10,
  },
  teamCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  teamCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  teamName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2C3E50",
    flex: 1,
  },
  teamId: {
    fontSize: 12,
    color: "#95A5A6",
  },
  teamDescription: {
    fontSize: 14,
    color: "#34495E",
    marginBottom: 12,
  },
  teamMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  metaText: {
    fontSize: 12,
    color: "#666",
    marginLeft: 5,
  },
  joinButtonContainer: {
    marginTop: 12,
    alignItems: 'flex-end',
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4A90E2',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  joinButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 4,
  },
  enterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  enterButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 4,
  },
  alreadyMemberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  alreadyMemberText: {
    color: '#4CAF50',
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 4,
  }
});

