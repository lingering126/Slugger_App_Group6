import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList, Modal, StyleSheet, Image, ScrollView, Alert, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import teamService from "../../services/teamService";
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function TeamsScreen() {
  const [teams, setTeams] = useState([]);
  const [userTeam, setUserTeam] = useState(null);
  const [search, setSearch] = useState("");
  const [newTeam, setNewTeam] = useState("");
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

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      console.log('Loading user data from AsyncStorage...');
      const userData = await AsyncStorage.getItem('user');
      console.log('User data from AsyncStorage:', userData);
      
      if (userData) {
        const parsedData = JSON.parse(userData);
        console.log('Parsed user data:', parsedData);
        const { id } = parsedData;
        setUserId(id);
        loadTeams(id);
      } else {
        console.log('No user data found in AsyncStorage');
        Alert.alert("Error", "Please login first");
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      Alert.alert("Error", "Failed to load user data");
    }
  };

  const loadTeams = async (currentUserId) => {
    try {
      const teamsData = await teamService.getAllTeams();
      setTeams(teamsData);
      // Find user's team
      const userTeamData = teamsData.find(team => 
        team.members.some(member => member.user._id === currentUserId || member.user.id === currentUserId)
      );
      if (userTeamData) {
        setUserTeam(userTeamData);
        calculateTeamProgress(userTeamData);
      }
    } catch (error) {
      console.error('Error loading teams:', error);
      Alert.alert("Error", "Failed to load teams");
    }
  };

  const calculateTeamProgress = (team) => {
    if (!team.goals.length) return;
    const totalProgress = team.goals.reduce((sum, goal) => {
      return sum + (parseInt(goal.current) / parseInt(goal.target)) * 100;
    }, 0);
    setTeamProgress(Math.round(totalProgress / team.goals.length));
  };

  const handleCreateTeam = async () => {
    console.log('Creating team...', { userId, newTeam });
    
    if (!userId) {
      Alert.alert("Error", "Please login first");
      return;
    }

    if (!newTeam.trim()) {
      Alert.alert("Error", "Please enter a team name");
      return;
    }

    try {
      setLoading(true);
      console.log('Sending request to create team...');
      
      const teamData = await teamService.createTeam({ 
        name: newTeam,
        userId: userId
      });
      
      console.log('Team created successfully:', teamData);
      
      if (teamData) {
        setTeams([...teams, teamData]);
        setUserTeam(teamData);
        setNewTeam("");
        setModalVisible(false);
        Alert.alert("Success", "Team created successfully!");
      } else {
        throw new Error("Failed to create team");
      }
    } catch (error) {
      console.error('Error creating team:', error);
      Alert.alert(
        "Error", 
        error.message || "Failed to create team. Please check console for details."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleJoinTeam = async (team) => {
    if (!userTeam) {
      try {
        const updatedTeam = await teamService.joinTeam(team._id);
        setTeams(teams.map(t => (t._id === team._id ? updatedTeam : t)));
        setUserTeam(updatedTeam);
        calculateTeamProgress(updatedTeam);
      } catch (error) {
        Alert.alert("Error", "Failed to join team");
      }
    }
  };

  const handleLeaveTeam = async () => {
    if (userTeam) {
      try {
        await teamService.leaveTeam(userTeam._id);
        setTeams(teams.map(t => (t._id === userTeam._id ? { ...t, members: t.members.filter(m => m.user._id !== "currentUserId") } : t)));
        setUserTeam(null);
      } catch (error) {
        Alert.alert("Error", "Failed to leave team");
      }
    }
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

  const renderTeamDashboard = () => (
    <View style={styles.dashboardContainer}>
      <View style={styles.progressContainer}>
        <Text style={styles.progressTitle}>Team Progress</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${teamProgress}%` }]} />
        </View>
        <Text style={styles.progressText}>{teamProgress}% Complete</Text>
      </View>

      <View style={styles.membersContainer}>
        <Text style={styles.sectionTitle}>Team Members</Text>
        <FlatList
          data={userTeam.members}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <View style={styles.memberCard}>
              <Image source={{ uri: item.avatar }} style={styles.avatar} />
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>{item.name}</Text>
                <Text style={styles.memberRole}>{item.role}</Text>
                <Text style={styles.memberPoints}>{item.points} points</Text>
              </View>
            </View>
          )}
        />
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

  const renderCreateTeamModal = () => (
    <Modal visible={modalVisible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Create New Team</Text>
          <TextInput
            style={styles.input}
            value={newTeam}
            onChangeText={setNewTeam}
            placeholder="Enter team name"
            placeholderTextColor="#999"
          />
          <View style={styles.modalButtons}>
            <TouchableOpacity 
              style={[styles.modalButton, loading && styles.disabledButton]} 
              onPress={handleCreateTeam}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Create Team</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.modalButton, styles.closeButton]} 
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderTeamCard = ({ item }) => (
    <View style={styles.teamCard}>
      <View style={styles.teamCardHeader}>
        <Ionicons name="people" size={24} color="#4A90E2" />
        <Text style={styles.teamName}>{item.name}</Text>
      </View>
      <View style={styles.teamCardBody}>
        <Text style={styles.memberCount}>
          {item.members?.length || 0} members
        </Text>
        <Text style={styles.goalCount}>
          {item.goals?.length || 0} active goals
        </Text>
      </View>
      <TouchableOpacity 
        style={styles.joinButton} 
        onPress={() => handleJoinTeam(item)}
      >
        <Text style={styles.joinButtonText}>Join Team</Text>
      </TouchableOpacity>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="people-outline" size={64} color="#4A90E2" />
      <Text style={styles.emptyStateTitle}>No Teams Found</Text>
      <Text style={styles.emptyStateText}>
        Create a new team or join an existing one to get started!
      </Text>
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
          <View style={styles.teamActions}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.leaveButton]}
              onPress={handleLeaveTeam}
            >
              <Text style={styles.actionButtonText}>Leave Team</Text>
            </TouchableOpacity>
            {userTeam.members.find(m => m.user._id === userId)?.role === 'leader' && (
              <TouchableOpacity 
                style={[styles.actionButton, styles.deleteButton]}
                onPress={handleDeleteTeam}
              >
                <Text style={styles.actionButtonText}>Delete Team</Text>
              </TouchableOpacity>
            )}
          </View>
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
  goalCount: {
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
  dashboardContainer: { marginBottom: 20 },
  progressContainer: { backgroundColor: "#fff", padding: 15, borderRadius: 10, marginBottom: 15 },
  progressTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  progressBar: { height: 20, backgroundColor: "#E8F0F2", borderRadius: 10, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: "#4A90E2" },
  progressText: { textAlign: "center", marginTop: 5 },
  membersContainer: { backgroundColor: "#fff", padding: 15, borderRadius: 10, marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  memberCard: { flexDirection: "row", alignItems: "center", padding: 10, borderBottomWidth: 1, borderBottomColor: "#E8F0F2" },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 16, fontWeight: "bold" },
  memberRole: { fontSize: 14, color: "#666" },
  memberPoints: { fontSize: 14, color: "#4A90E2" },
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
  scrollView: { padding: 16 },
  teamActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
  },
  actionButton: {
    backgroundColor: "#4A90E2",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  leaveButton: {
    backgroundColor: "#E74C3C",
  },
  deleteButton: {
    backgroundColor: "#E74C3C",
  },
});
