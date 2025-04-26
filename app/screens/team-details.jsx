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
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import teamService from '../services/teamService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function TeamDetailsScreen() {
  const { teamId } = useLocalSearchParams();
  const router = useRouter();
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  
  // Weekly limit state variables
  const [mentalLimit, setMentalLimit] = useState(0);
  const [physicalLimit, setPhysicalLimit] = useState(0);
  const [isEditingMentalLimit, setIsEditingMentalLimit] = useState(false);
  const [isEditingPhysicalLimit, setIsEditingPhysicalLimit] = useState(false);
  const [temporaryMentalLimit, setTemporaryMentalLimit] = useState(0);
  const [temporaryPhysicalLimit, setTemporaryPhysicalLimit] = useState(0);

  useEffect(() => {
    console.log('Team ID from params:', teamId);
    console.log('Team ID type:', typeof teamId);
    loadTeamDetails();
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (team) {
      setMentalLimit(team.weeklyLimitMental || 0);
      setPhysicalLimit(team.weeklyLimitPhysical || 0);
    }
  }, [team]);

  const fetchCurrentUser = async () => {
    try {
      const userId = await AsyncStorage.getItem('userId');
      setUserId(userId);
      console.log('Current user ID in team details:', userId);
    } catch (error) {
      console.error('Error fetching current user ID:', error);
    }
  };

  const loadTeamDetails = async () => {
    try {
      setLoading(true);
      
      if (!teamId) {
        console.error('Team ID is missing');
        Alert.alert('Error', 'No team ID provided');
        return;
      }
      
      // Remove any URL encoding that might be affecting the ID
      const cleanTeamId = decodeURIComponent(teamId.toString().trim());
      console.log('Cleaned team ID:', cleanTeamId);
      
      const teamData = await teamService.getTeamById(cleanTeamId);
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
      
      // First, check if the current user is actually a member of this team
      if (!team || !team.members || !userId) {
        Alert.alert('Error', 'Unable to verify team membership');
        setLoading(false);
        return;
      }
      
      // Check if current user is in the members array
      const isMember = team.members.some(member => 
        (typeof member === 'object' && member._id === userId) || member === userId
      );
      
      if (!isMember) {
        Alert.alert('Error', 'You are not a member of this team');
        setLoading(false);
        return;
      }
      
      // Proceed with leaving the team
      console.log('Attempting to leave team with ID:', teamId);
      await teamService.leaveTeam(teamId);
      
      // 成功后直接跳转，不显示Alert
      console.log('Successfully left the team. Navigating to team tab...');
      setLoading(false);
      
      // 直接强制跳转至team界面
      router.replace('screens/team');
      
    } catch (error) {
      console.error('Error leaving team:', error);
      
      // Provide more specific error messages based on the error
      let errorMessage = 'Failed to leave team';
      
      if (error.message === 'Not a member of this team') {
        errorMessage = 'You are not currently a member of this team';
      } else if (error.message && error.message.includes('Authentication')) {
        errorMessage = 'Authentication error. Please log in again';
      }
      
      Alert.alert('Error', errorMessage);
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
  
  // 获取用户头像文本（使用用户名首字母）
  const getAvatarText = (name) => {
    if (!name) return '?';
    return name.substring(0, 2).toUpperCase();
  };
  
  // 检查当前成员是否为当前登录用户
  const isCurrentUser = (member) => {
    if (!userId || !member) return false;
    
    if (typeof member === 'object') {
      return member._id === userId;
    }
    return member === userId;
  };
  
  // 格式化加入日期
  const formatJoinDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };
  
  // Functions to handle weekly limit updates
  const handleOpenMentalLimitModal = () => {
    setTemporaryMentalLimit(mentalLimit);
    setIsEditingMentalLimit(true);
  };

  const handleOpenPhysicalLimitModal = () => {
    setTemporaryPhysicalLimit(physicalLimit);
    setIsEditingPhysicalLimit(true);
  };

  const handleSaveMentalLimit = async () => {
    try {
      setLoading(true);
      await teamService.updateTeamTargets(teamId, { 
        weeklyLimitMental: temporaryMentalLimit,
        weeklyLimitPhysical: physicalLimit
      });
      setMentalLimit(temporaryMentalLimit);
      setIsEditingMentalLimit(false);
      
      // Update team object to reflect changes
      setTeam({
        ...team,
        weeklyLimitMental: temporaryMentalLimit
      });
      
      Alert.alert('Success', 'Mental weekly limit updated successfully');
    } catch (error) {
      console.error('Error updating mental limit:', error);
      Alert.alert('Error', 'Failed to update mental weekly limit');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePhysicalLimit = async () => {
    try {
      setLoading(true);
      await teamService.updateTeamTargets(teamId, {
        weeklyLimitMental: mentalLimit,
        weeklyLimitPhysical: temporaryPhysicalLimit
      });
      setPhysicalLimit(temporaryPhysicalLimit);
      setIsEditingPhysicalLimit(false);
      
      // Update team object to reflect changes
      setTeam({
        ...team,
        weeklyLimitPhysical: temporaryPhysicalLimit
      });
      
      Alert.alert('Success', 'Physical weekly limit updated successfully');
    } catch (error) {
      console.error('Error updating physical limit:', error);
      Alert.alert('Error', 'Failed to update physical weekly limit');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEditLimit = (type) => {
    if (type === 'mental') {
      setIsEditingMentalLimit(false);
    } else {
      setIsEditingPhysicalLimit(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  if (!team) {
    return (
      <View style={styles.container}>
        <Text>Team not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Team Header */}
      <View style={styles.header}>
        <Text style={styles.teamName}>{team.name}</Text>
        <View style={styles.teamIdContainer}>
          <Text style={styles.teamIdLabel}>Team ID:</Text>
          <Text style={styles.teamIdValue}>{team.teamId}</Text>
        </View>
        <Text style={styles.teamDescription}>{team.description || 'No description'}</Text>
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
        <Text style={styles.sectionTitle}>Weekly Limits</Text>
        <View style={styles.targetContainer}>
          <TouchableOpacity 
            style={styles.targetItem} 
            onPress={handleOpenMentalLimitModal}
          >
            <Text style={styles.targetLabel}>Mental Weekly Limit</Text>
            <View style={styles.targetValueContainer}>
              <Text style={styles.targetValue}>{mentalLimit}</Text>
              <Ionicons name="chevron-down" size={16} color="#7F8C8D" />
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.targetItem} 
            onPress={handleOpenPhysicalLimitModal}
          >
            <Text style={styles.targetLabel}>Physical Weekly Limit</Text>
            <View style={styles.targetValueContainer}>
              <Text style={styles.targetValue}>{physicalLimit}</Text>
              <Ionicons name="chevron-down" size={16} color="#7F8C8D" />
            </View>
          </TouchableOpacity>
        </View>
        
        {team.targetName && (
          <View style={styles.targetNameContainer}>
            <Text style={styles.targetNameLabel}>Target Name:</Text>
            <Text style={styles.targetNameValue}>{team.targetName}</Text>
          </View>
        )}
      </View>

      {/* Mental Limit Picker Modal */}
      <Modal
        visible={isEditingMentalLimit}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Set Mental Weekly Limit</Text>
            
            <Picker
              selectedValue={temporaryMentalLimit}
              onValueChange={(value) => setTemporaryMentalLimit(value)}
              style={styles.picker}
            >
              {[...Array(21).keys()].map(value => (
                <Picker.Item key={value} label={value.toString()} value={value} />
              ))}
            </Picker>
            
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => handleCancelEditLimit('mental')}
              >
                <Text style={styles.cancelButtonText}>取消</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveMentalLimit}
              >
                <Text style={styles.saveButtonText}>保存</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Physical Limit Picker Modal */}
      <Modal
        visible={isEditingPhysicalLimit}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Set Physical Weekly Limit</Text>
            
            <Picker
              selectedValue={temporaryPhysicalLimit}
              onValueChange={(value) => setTemporaryPhysicalLimit(value)}
              style={styles.picker}
            >
              {[...Array(21).keys()].map(value => (
                <Picker.Item key={value} label={value.toString()} value={value} />
              ))}
            </Picker>
            
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => handleCancelEditLimit('physical')}
              >
                <Text style={styles.cancelButtonText}>取消</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSavePhysicalLimit}
              >
                <Text style={styles.saveButtonText}>保存</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Members Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Team Members</Text>
          <Text style={styles.memberCount}>{team.members?.length || 0} {team.members?.length === 1 ? 'Member' : 'Members'}</Text>
        </View>
        
        {!team.members || team.members.length === 0 ? (
          <View style={styles.emptyMembersContainer}>
            <Ionicons name="people-outline" size={48} color="#95A5A6" />
            <Text style={styles.emptyMembersText}>No members in this team</Text>
          </View>
        ) : (
          team.members.map((member) => {
            const isCurrentUserMember = isCurrentUser(member);
            return (
              <View 
                key={typeof member === 'object' ? member._id : member} 
                style={[
                  styles.memberCard,
                  isCurrentUserMember && styles.currentUserMemberCard
                ]}
              >
                <View style={[
                  styles.avatarContainer,
                  isCurrentUserMember && styles.currentUserAvatarContainer
                ]}>
                  {member.avatar ? (
                    <Image 
                      source={{ uri: member.avatar }} 
                      style={styles.avatar} 
                    />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarText}>
                        {getAvatarText(member.name || member.email)}
                      </Text>
                    </View>
                  )}
                </View>
                
                <View style={styles.memberInfo}>
                  <View style={styles.memberNameRow}>
                    <Text style={styles.memberName}>
                      {member.name || member.email || 'Unknown Member'}
                    </Text>
                    {isCurrentUserMember && (
                      <View style={styles.currentUserBadge}>
                        <Text style={styles.currentUserBadgeText}>You</Text>
                      </View>
                    )}
                  </View>
                  
                  <Text style={styles.memberJoinDate}>
                    {member.joinDate ? formatJoinDate(member.joinDate) : 'Joined recently'}
                  </Text>
                  
                  <View style={styles.memberStatsRow}>
                    <View style={styles.memberStatItem}>
                      <Ionicons name="trophy-outline" size={16} color="#4A90E2" />
                      <Text style={styles.memberStatText}>{member.points || 0} pts</Text>
                    </View>
                    
                    <View style={styles.memberStatItem}>
                      <Ionicons name="flame-outline" size={16} color="#FF9500" />
                      <Text style={styles.memberStatText}>{member.streak || 0} streak</Text>
                    </View>
                    
                    <View style={styles.memberStatItem}>
                      <Ionicons name="fitness-outline" size={16} color="#4CAF50" />
                      <Text style={styles.memberStatText}>{member.activities || 0} activities</Text>
                    </View>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* Goals Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Team Goals</Text>
        {!team.goals || team.goals.length === 0 ? (
          <View style={styles.emptyGoalsContainer}>
            <Ionicons name="flag-outline" size={48} color="#95A5A6" />
            <Text style={styles.emptyGoalsText}>No goals set for this team</Text>
          </View>
        ) : (
          team.goals.map((goal) => (
            <View key={goal._id} style={styles.goalCard}>
              <Text style={styles.goalTitle}>{goal.title}</Text>
              <View style={styles.goalProgress}>
                <View style={styles.progressBar}>
                  <View 
                    style={[

                      styles.progressFill, 
                      { width: `${(goal.current / goal.target) * 100}%` }
                    ]} 
                  />
                </View>
                <Text style={styles.progressText}>
                  {goal.current} / {goal.target}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Leave Team Button */}
      <TouchableOpacity 
        style={styles.leaveButton}
        onPress={handleLeaveTeam}
      >
        <Ionicons name="exit-outline" size={20} color="#FFFFFF" />
        <Text style={styles.leaveButtonText}>Leave Team</Text>
      </TouchableOpacity>
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
  teamIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  teamIdLabel: {
    fontSize: 14,
    color: '#7F8C8D',
    marginRight: 4,
  },
  teamIdValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A90E2',
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  memberCount: {
    fontSize: 14,
    color: '#7F8C8D',
    fontWeight: '500',
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
    marginBottom: 16,
  },
  targetItem: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    marginHorizontal: 4,
  },
  targetLabel: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 4,
  },
  targetValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  targetValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  targetNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
  },
  targetNameLabel: {
    fontSize: 14,
    color: '#7F8C8D',
    marginRight: 4,
  },
  targetNameValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    marginBottom: 10,
  },
  currentUserMemberCard: {
    backgroundColor: '#EBF5FB',
    borderWidth: 1,
    borderColor: '#AED6F1',
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    overflow: 'hidden',
  },
  currentUserAvatarContainer: {
    borderWidth: 2,
    borderColor: '#3498DB',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#95A5A6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  memberInfo: {
    flex: 1,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  memberName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginRight: 8,
  },
  currentUserBadge: {
    backgroundColor: '#3498DB',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  currentUserBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  memberJoinDate: {
    fontSize: 12,
    color: '#7F8C8D',
    marginBottom: 4,
  },
  memberRole: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  memberStatsRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  memberStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  memberStatText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  emptyMembersContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
  },
  emptyMembersText: {
    marginTop: 8,
    fontSize: 16,
    color: '#7F8C8D',
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
  emptyGoalsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
  },
  emptyGoalsText: {
    marginTop: 8,
    fontSize: 16,
    color: '#7F8C8D',
  },
  leaveButton: {
    flexDirection: 'row',
    backgroundColor: '#E74C3C',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    marginBottom: 32,
  },
  leaveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  cancelButton: {
    backgroundColor: '#E74C3C',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
  },
  cancelButtonText: {
    color: '#FFFFFF',
    textAlign: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    textAlign: 'center',
  },
  picker: {
    height: 50,
    width: '100%',
  },
});