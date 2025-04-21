import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList, Modal, StyleSheet, Image, ScrollView, Alert, ActivityIndicator, Picker } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import teamService from "../../services/teamService";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

export default function TeamsScreen() {
  const [teams, setTeams] = useState([]);
  const [userTeam, setUserTeam] = useState(null);
  const [search, setSearch] = useState("");
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

      // 过滤掉没有成员的团队
      const activeTeams = data.filter(team => team.members && team.members.length > 0);
      setTeams(activeTeams);

      // 查找用户所在的团队
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

  const handleJoinTeam = async (teamId) => {
    try {
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
        // 如果已经是成员，直接更新状态
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

      // 更新用户团队状态
      const team = teams.find(t => t._id === teamId);
      if (team) {
        setUserTeam(team);
      }

      Alert.alert('Success', 'Successfully joined the team');
      await loadTeams(); // 重新加载团队列表
    } catch (error) {
      console.error('Error joining team:', error);
      Alert.alert('Error', error.message || 'Failed to join team');
    } finally {
      setLoading(false);
    }
  };

  // 增强版退出团队功能，确保退出后自动刷新状态
  const handleLeaveTeam = () => {
    if (!userTeam) {
      console.log('No team to leave');
      return;
    }
    
    console.log('Preparing to leave team:', userTeam._id);
    
    // 保存团队ID以便后续使用
    const teamIdToLeave = userTeam._id;
    
    // 立即清除用户团队状态，返回团队列表
    setUserTeam(null);
    
    // 立即重新加载团队列表
    loadTeams();
    
    // 设置定时器，延迟再次刷新团队列表，确保状态更新
    setTimeout(() => {
      console.log('Refreshing team list after delay');
      loadTeams();
    }, 1000);
    
    // 再次延迟刷新，确保后端数据已更新
    setTimeout(() => {
      console.log('Final refresh of team list');
      loadTeams();
    }, 2000);
    
    // 在后台尝试调用API退出团队
    try {
      // 获取token
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
            // API调用成功后再次刷新团队列表
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
  
  // 单独的函数处理团队列表中的“返回”按钮
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

  // 进入团队而不是加入团队（已经是成员的情况）
  const handleEnterTeam = (team) => {
    setUserTeam(team);
  };
  
  const renderTeamCard = ({ item }) => {
    // 检查用户是否是团队成员，简化逻辑以适应不同的数据结构
    const isTeamMember = item.members && Array.isArray(item.members) && item.members.some(member => {
      // 如果成员是对象并且有user属性
      if (typeof member === 'object' && member.user) {
        return member.user._id === userId || member.user.id === userId;
      }
      // 如果成员是字符串ID
      if (typeof member === 'string') {
        return member === userId;
      }
      // 如果成员是对象但没有user属性（可能直接是ID）
      if (typeof member === 'object' && member._id) {
        return member._id === userId;
      }
      return false;
    });
    
    console.log(`Checking if user ${userId} is member of team ${item.name}: ${isTeamMember}`);
    
    return (
      <View style={styles.teamCard}>
        <View style={styles.teamCardHeader}>
          <Ionicons name="people" size={24} color="#4A90E2" />
          <Text style={styles.teamName}>{item.name}</Text>
        </View>
        <View style={styles.teamCardBody}>
          <Text style={styles.memberCount}>
            {item.members?.length || 0} members
          </Text>
          <Text style={styles.targetInfo}>
            Target: {item.targetName}
          </Text>
          <Text style={styles.description}>
            {item.description || 'No description provided'}
          </Text>
        </View>
        {!userTeam && (
          <TouchableOpacity 
            style={[styles.joinButton, isTeamMember ? styles.enterButton : styles.joinButton]} 
            onPress={() => isTeamMember ? handleEnterTeam(item) : handleJoinTeam(item._id)}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.joinButtonText}>{isTeamMember ? 'Enter Team' : 'Join Team'}</Text>
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

  const renderTeamDashboard = () => (
    <View style={styles.teamDashboard}>
      <View style={styles.teamHeader}>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={handleBackToTeamList}
          >
            <Ionicons name="arrow-back" size={24} color="#4A90E2" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.teamTitle}>{userTeam.name}</Text>
        <Text style={styles.teamDescription}>{userTeam.description}</Text>
      </View>
      
      <View style={styles.progressContainer}>
        <Text style={styles.sectionTitle}>Team Progress</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: '50%' }]} />
        </View>
        <Text style={styles.progressText}>50% Complete</Text>
      </View>

      <View style={styles.membersContainer}>
        <Text style={styles.sectionTitle}>Team Members ({userTeam.members?.length || 0})</Text>
        {userTeam.members?.map((member, index) => (
          <View key={index} style={styles.memberCard}>
            <Ionicons name="person-circle" size={40} color="#4A90E2" />
            <View style={styles.memberInfo}>
              <Text style={styles.memberName}>{member.user?.name || (member.user?.email ? member.user.email.split('@')[0] : 'Anonymous')}</Text>
              <Text style={styles.memberRole}>{member.role || 'Member'}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.targetsContainer}>
        <Text style={styles.sectionTitle}>Team Targets</Text>
        <View style={styles.targetCard}>
          <Text style={styles.targetName}>{userTeam.targetName}</Text>
          <View style={styles.targetValues}>
            <Text style={styles.targetValue}>Mental: {userTeam.targetMentalValue}</Text>
            <Text style={styles.targetValue}>Physical: {userTeam.targetPhysicalValue}</Text>
          </View>
        </View>
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
    </View>
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
            <Picker
              selectedValue={newTeam.targetName}
              onValueChange={(itemValue) => setNewTeam({ ...newTeam, targetName: itemValue })}
              style={styles.picker}
            >
              <Picker.Item label="Select a category" value="" />
              <Picker.Item label="Target 1" value="Target 1" />
              <Picker.Item label="Target 2" value="Target 2" />
              <Picker.Item label="Target 3" value="Target 3" />
              <Picker.Item label="Target 4" value="Target 4" />
              <Picker.Item label="Target 5" value="Target 5" />
              <Picker.Item label="Target 6" value="Target 6" />
              <Picker.Item label="Target 7" value="Target 7" />
              <Picker.Item label="Target 8" value="Target 8" />
              <Picker.Item label="Target 9" value="Target 9" />
              <Picker.Item label="Target 10" value="Target 10" />
            </Picker>
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
              <Picker
                selectedValue={newTeam.dailyLimitMental}
                onValueChange={(itemValue) => setNewTeam({ ...newTeam, dailyLimitMental: itemValue })}
                style={styles.picker}
              >
                <Picker.Item label="0" value={0} />
                <Picker.Item label="1" value={1} />
                <Picker.Item label="2" value={2} />
                <Picker.Item label="3" value={3} />
                <Picker.Item label="4" value={4} />
                <Picker.Item label="5" value={5} />
                <Picker.Item label="6" value={6} />
                <Picker.Item label="7" value={7} />
              </Picker>
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
              <Picker
                selectedValue={newTeam.dailyLimitPhysical}
                onValueChange={(itemValue) => setNewTeam({ ...newTeam, dailyLimitPhysical: itemValue })}
                style={styles.picker}
              >
                <Picker.Item label="0" value={0} />
                <Picker.Item label="1" value={1} />
                <Picker.Item label="2" value={2} />
                <Picker.Item label="3" value={3} />
                <Picker.Item label="4" value={4} />
                <Picker.Item label="5" value={5} />
                <Picker.Item label="6" value={6} />
                <Picker.Item label="7" value={7} />
              </Picker>
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

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.header}>Teams</Text>
        {!userTeam && (
          <TouchableOpacity 
            style={styles.createButton}
            onPress={() => setModalVisible(true)}
          >
            <Ionicons name="add-circle" size={24} color="#fff" />
            <Text style={styles.createButtonText}>Create Team</Text>
          </TouchableOpacity>
        )}
      </View>

      {userTeam ? (
        <ScrollView style={styles.scrollView}>
          {renderTeamDashboard()}
          {renderGoals()}
          {renderForfeits()}
        </ScrollView>
      ) : (
        <>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search teams..."
              placeholderTextColor="#999"
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
        </>
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
  enterButton: {
    backgroundColor: "#2ECC71",
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
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
});
