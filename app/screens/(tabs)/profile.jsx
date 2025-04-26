import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Modal, FlatList, Alert } from 'react-native'
import React, { useState, useEffect } from 'react'
import { useNavigation } from '@react-navigation/native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import axios from 'axios'
import { getServerIP, getServerUrl } from '../../config/ipConfig'
import API_CONFIG from '../../config/api' // 添加API_CONFIG导入

// Mock data (would normally come from a database)
const mockUserData = {
  name: "Huixian",
  status: "Active",
  joinDate: "March 2025"
}

// Physical activities library
const physicalActivities = [
  { id: 1, name: 'Cricket' },
  { id: 2, name: 'Soccer' },
  { id: 3, name: 'Run' },
  { id: 4, name: 'Walk' },
  { id: 5, name: 'HIIT' },
  { id: 6, name: 'Gym Workout' },
  { id: 7, name: 'Cycle' },
  { id: 8, name: 'Swim' },
  { id: 9, name: 'Home Workout' },
  { id: 10, name: 'Physio' },
  { id: 11, name: 'Yoga' },
  { id: 12, name: 'Squash' },
  { id: 13, name: 'Rugby' },
  { id: 14, name: 'Touch Rugby' },
  { id: 15, name: 'Steps goal' },
  { id: 16, name: 'DIY' },
  { id: 17, name: 'Gardening' },
  { id: 18, name: 'Physical other' }
]

// Mental activities library
const mentalActivities = [
  { id: 1, name: 'Meditation' },
  { id: 2, name: 'Reading' },
  { id: 3, name: 'Writing' },
  { id: 4, name: 'Music Practice' },
  { id: 5, name: 'Mental Gym' },
  { id: 6, name: 'Duolingo' },
  { id: 7, name: 'Language Training' },
  { id: 8, name: 'Cold shower' },
  { id: 9, name: 'Mental other' },
  { id: 10, name: 'Journal' },
  { id: 11, name: 'Breathing exercise' }
]

// Bonus activities library
const bonusActivities = [
  { id: 1, name: 'Community Service' },
  { id: 2, name: 'Family' },
  { id: 3, name: 'Personal Best' },
  { id: 4, name: 'Personal Goal' },
  { id: 5, name: 'Bonus other' }
]

const Profile = () => {
  const navigation = useNavigation()
  const [selectedPhysicalActivities, setSelectedPhysicalActivities] = useState([])
  const [physicalModalVisible, setPhysicalModalVisible] = useState(false)
  const [selectedMentalActivities, setSelectedMentalActivities] = useState([])
  const [mentalModalVisible, setMentalModalVisible] = useState(false)
  const [selectedBonusActivities, setSelectedBonusActivities] = useState([])
  const [bonusModalVisible, setBonusModalVisible] = useState(false)
  const [targetModalVisible, setTargetModalVisible] = useState(false);
  const [userTarget, setUserTarget] = useState(3); // Default target value
  const [isLoading, setIsLoading] = useState(false);

  // 更新用户目标值并保存到数据库
  const updateUserTarget = async (target) => {
    setIsLoading(true);
    try {
      // 获取用户ID（去除认证部分）
      const userId = await AsyncStorage.getItem('userId');
      
      // 验证必要数据
      if (!userId) {
        Alert.alert('提示', '找不到用户ID，请重新登录');
        setIsLoading(false);
        return;
      }
      
      // 构建API请求URL
      const apiUrl = `${API_CONFIG.API_URL}/user-targets`;
      console.log(`尝试保存目标值 ${target} 到 ${apiUrl}`);
      
      // 发送PUT请求（去除认证头）
      const response = await axios({
        method: 'put',
        url: apiUrl,
        headers: {
          'Content-Type': 'application/json'
        },
        data: {
          userId,
          weeklyTarget: parseInt(target)
        }
      });
      
      if (response.status === 200) {
        console.log('目标更新成功:', response.data);
        // 更新本地状态
        setUserTarget(target);
        await AsyncStorage.setItem('userTarget', target.toString());
        Alert.alert('成功', '目标设置已保存');
      }
    } catch (error) {
      console.error('保存目标失败:', error);
      
      // 错误处理（去除认证相关错误处理）
      if (error.response) {
        const status = error.response.status;
        
        if (status === 404) {
          // 如果目标不存在，尝试创建
          try {
            const userId = await AsyncStorage.getItem('userId');
            const apiUrl = `${API_CONFIG.API_URL}/user-targets`;
            
            const createResponse = await axios({
              method: 'post',
              url: apiUrl,
              headers: {
                'Content-Type': 'application/json'
              },
              data: {
                userId,
                weeklyTarget: parseInt(target)
              }
            });
            
            if (createResponse.status === 201) {
              console.log('目标创建成功:', createResponse.data);
              setUserTarget(target);
              await AsyncStorage.setItem('userTarget', target.toString());
              Alert.alert('成功', '目标设置已创建');
            }
          } catch (createError) {
            console.error('创建目标失败:', createError);
            Alert.alert('错误', '无法创建目标，请稍后再试');
          }
        } else {
          Alert.alert('错误', `保存失败: ${status}`);
        }
      } else {
        Alert.alert('错误', '无法连接到服务器，请检查网络连接或服务器状态');
      }
    } finally {
      setIsLoading(false);
      setTargetModalVisible(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header/Top Information Area */}
      <View style={styles.headerContainer}>
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{mockUserData.name.substring(0, 2).toUpperCase()}</Text>
            </View>
          </View>
          <View style={styles.userInfoContainer}>
            <Text style={styles.userName}>{mockUserData.name}</Text>
            <Text style={styles.userStatus}>Status: {mockUserData.status}</Text>
            <Text style={styles.userJoinDate}>Member since: {mockUserData.joinDate}</Text>
          </View>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={styles.targetButton}
            onPress={() => setTargetModalVisible(true)}
          >
            <Text style={styles.targetButtonText}>{`Target: ${userTarget}`}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.editButton}>
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Rest of the profile content */}
      <ScrollView style={styles.content}>
        <Text style={styles.sectionTitle}>My Groups</Text>
        {/* Group list would go here */}
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>No groups joined yet</Text>
        </View>
        
        <Text style={styles.sectionTitle}>Group Members</Text>
        {/* Group members would go here */}
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>Join a group to see members</Text>
        </View>
        
        <Text style={styles.sectionTitle}>Activity Settings</Text>
        
        {/* Physical Activities Section */}
        <View style={styles.activitySection}>
          <Text style={styles.activityTitle}>Physical Activities</Text>
          <Text style={styles.activityDescription}>Select the physical activities you want to track</Text>
          
          <TouchableOpacity 
            style={styles.activitySelector} 
            onPress={() => setPhysicalModalVisible(true)}
          >
            <Text style={styles.activitySelectorText}>
              {selectedPhysicalActivities.length 
                ? `${selectedPhysicalActivities.length} activities selected` 
                : 'Select activities'}
            </Text>
            <Text style={styles.dropdownIcon}>▼</Text>
          </TouchableOpacity>
          
          {selectedPhysicalActivities.length > 0 && (
            <View style={styles.selectedActivitiesContainer}>
              {selectedPhysicalActivities.map(activity => (
                <View key={activity.id} style={styles.activityChip}>
                  <Text style={styles.activityChipText}>{activity.name}</Text>
                  <TouchableOpacity 
                    onPress={() => {
                      setSelectedPhysicalActivities(
                        selectedPhysicalActivities.filter(item => item.id !== activity.id)
                      )
                    }}
                    style={styles.activityChipRemove}
                  >
                    <Text style={styles.activityChipRemoveText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Mental Activities Section */}
        <View style={styles.activitySection}>
          <Text style={styles.activityTitle}>Mental Activities</Text>
          <Text style={styles.activityDescription}>Select the mental activities you want to track</Text>
          
          <TouchableOpacity 
            style={styles.activitySelector} 
            onPress={() => setMentalModalVisible(true)}
          >
            <Text style={styles.activitySelectorText}>
              {selectedMentalActivities.length 
                ? `${selectedMentalActivities.length} activities selected` 
                : 'Select activities'}
            </Text>
            <Text style={styles.dropdownIcon}>▼</Text>
          </TouchableOpacity>
          
          {selectedMentalActivities.length > 0 && (
            <View style={styles.selectedActivitiesContainer}>
              {selectedMentalActivities.map(activity => (
                <View key={activity.id} style={[styles.activityChip, { backgroundColor: '#0E5E6F' }]}>
                  <Text style={styles.activityChipText}>{activity.name}</Text>
                  <TouchableOpacity 
                    onPress={() => {
                      setSelectedMentalActivities(
                        selectedMentalActivities.filter(item => item.id !== activity.id)
                      )
                    }}
                    style={styles.activityChipRemove}
                  >
                    <Text style={styles.activityChipRemoveText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Bonus Activities Section */}
        <View style={styles.activitySection}>
          <Text style={styles.activityTitle}>Bonus Activities</Text>
          <Text style={styles.activityDescription}>Select bonus activities to earn extra points</Text>
          
          <TouchableOpacity 
            style={styles.activitySelector} 
            onPress={() => setBonusModalVisible(true)}
          >
            <Text style={styles.activitySelectorText}>
              {selectedBonusActivities.length 
                ? `${selectedBonusActivities.length} activities selected` 
                : 'Select activities'}
            </Text>
            <Text style={styles.dropdownIcon}>▼</Text>
          </TouchableOpacity>
          
          {selectedBonusActivities.length > 0 && (
            <View style={styles.selectedActivitiesContainer}>
              {selectedBonusActivities.map(activity => (
                <View key={activity.id} style={[styles.activityChip, { backgroundColor: '#FF6B6B' }]}>
                  <Text style={styles.activityChipText}>{activity.name}</Text>
                  <TouchableOpacity 
                    onPress={() => {
                      setSelectedBonusActivities(
                        selectedBonusActivities.filter(item => item.id !== activity.id)
                      )
                    }}
                    style={styles.activityChipRemove}
                  >
                    <Text style={styles.activityChipRemoveText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Developer Tools Section - For testing only */}
        <View style={styles.devToolsSection}>
          <Text style={styles.devToolsTitle}>Developer Tools</Text>
          <Text style={styles.devToolsDescription}>These tools are for development testing only</Text>
          
          <TouchableOpacity 
            style={styles.resetButton} 
            onPress={async () => {
              try {
                // Remove the welcomeCompleted flag from AsyncStorage
                await AsyncStorage.removeItem('welcomeCompleted');
                alert('Welcome flow has been reset. Log out and back in to see the welcome screens.');
              } catch (error) {
                console.error('Error resetting welcome flow:', error);
                alert('Failed to reset welcome flow: ' + error.message);
              }
            }}
          >
            <Text style={styles.resetButtonText}>Reset Welcome Flow</Text>
          </TouchableOpacity>
        </View>
        
        {/* Save Button */}
        <TouchableOpacity style={styles.saveButton}>
          <Text style={styles.saveButtonText}>Save Settings</Text>
        </TouchableOpacity>
      </ScrollView>
      
      {/* Modal for selecting physical activities */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={physicalModalVisible}
        onRequestClose={() => setPhysicalModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Physical Activities</Text>
              <TouchableOpacity 
                onPress={() => setPhysicalModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={physicalActivities}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.activityItem}
                  onPress={() => {
                    const isSelected = selectedPhysicalActivities.some(
                      activity => activity.id === item.id
                    )
                    
                    if (isSelected) {
                      setSelectedPhysicalActivities(
                        selectedPhysicalActivities.filter(activity => activity.id !== item.id)
                      )
                    } else {
                      setSelectedPhysicalActivities([...selectedPhysicalActivities, item])
                    }
                  }}
                >
                  <Text style={styles.activityItemText}>{item.name}</Text>
                  {selectedPhysicalActivities.some(activity => activity.id === item.id) && (
                    <Text style={styles.activityItemSelected}>✓</Text>
                  )}
                </TouchableOpacity>
              )}
              style={styles.modalList}
            />
            
            <TouchableOpacity 
              style={styles.modalDoneButton}
              onPress={() => setPhysicalModalVisible(false)}
            >
              <Text style={styles.modalDoneText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal for selecting mental activities */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={mentalModalVisible}
        onRequestClose={() => setMentalModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Mental Activities</Text>
              <TouchableOpacity 
                onPress={() => setMentalModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={mentalActivities}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.activityItem}
                  onPress={() => {
                    const isSelected = selectedMentalActivities.some(
                      activity => activity.id === item.id
                    )
                    
                    if (isSelected) {
                      setSelectedMentalActivities(
                        selectedMentalActivities.filter(activity => activity.id !== item.id)
                      )
                    } else {
                      setSelectedMentalActivities([...selectedMentalActivities, item])
                    }
                  }}
                >
                  <Text style={styles.activityItemText}>{item.name}</Text>
                  {selectedMentalActivities.some(activity => activity.id === item.id) && (
                    <Text style={styles.activityItemSelected}>✓</Text>
                  )}
                </TouchableOpacity>
              )}
              style={styles.modalList}
            />
            
            <TouchableOpacity 
              style={styles.modalDoneButton}
              onPress={() => setMentalModalVisible(false)}
            >
              <Text style={styles.modalDoneText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal for selecting bonus activities */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={bonusModalVisible}
        onRequestClose={() => setBonusModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Bonus Activities</Text>
              <TouchableOpacity 
                onPress={() => setBonusModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={bonusActivities}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.activityItem}
                  onPress={() => {
                    const isSelected = selectedBonusActivities.some(
                      activity => activity.id === item.id
                    )
                    
                    if (isSelected) {
                      setSelectedBonusActivities(
                        selectedBonusActivities.filter(activity => activity.id !== item.id)
                      )
                    } else {
                      setSelectedBonusActivities([...selectedBonusActivities, item])
                    }
                  }}
                >
                  <Text style={styles.activityItemText}>{item.name}</Text>
                  {selectedBonusActivities.some(activity => activity.id === item.id) && (
                    <Text style={styles.activityItemSelected}>✓</Text>
                  )}
                </TouchableOpacity>
              )}
              style={styles.modalList}
            />
            
            <TouchableOpacity 
              style={[styles.modalDoneButton, { backgroundColor: '#4A9D63' }]}
              onPress={() => setBonusModalVisible(false)}
            >
              <Text style={styles.modalDoneText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal for setting user target */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={targetModalVisible}
        onRequestClose={() => setTargetModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Set User Target</Text>
              <TouchableOpacity 
                onPress={() => setTargetModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.targetModalContent}>
              <Text style={styles.targetDescription}>
                Set your user target (1-7 activities per week)
              </Text>
              
              <View style={styles.targetSelectorContainer}>
                {[1, 2, 3, 4, 5, 6, 7].map((value) => (
                  <TouchableOpacity
                    key={value}
                    style={[

                      styles.targetSelectorItem,
                      userTarget === value && styles.targetSelectorItemSelected
                    ]}
                    onPress={() => setUserTarget(value)}
                  >
                    <Text 
                      style={[

                        styles.targetSelectorText,
                        userTarget === value && styles.targetSelectorTextSelected
                      ]}
                    >
                      {value}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              <TouchableOpacity 
                style={styles.targetSaveButton}
                onPress={() => updateUserTarget(userTarget)}
                disabled={isLoading}
              >
                <Text style={styles.targetSaveButtonText}>
                  {isLoading ? 'Updating...' : 'Save Target'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

export default Profile

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8F0F2',
  },
  headerContainer: {
    backgroundColor: '#3A8891',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#fff',
    overflow: 'hidden',
    backgroundColor: '#ccc',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#0E5E6F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  userInfoContainer: {
    marginLeft: 20,
    flex: 1,
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  userStatus: {
    fontSize: 16,
    color: '#E8F0F2',
    marginBottom: 2,
  },
  userJoinDate: {
    fontSize: 14,
    color: '#E8F0F2',
    opacity: 0.8,
  },
  headerButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 15,
  },
  targetButton: {
    backgroundColor: '#0E5E6F',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 10,
  },
  targetButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  editButton: {
    backgroundColor: '#0E5E6F',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  editButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0E5E6F',
    marginTop: 20,
    marginBottom: 10,
  },
  placeholder: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 15,
  },
  placeholderText: {
    color: '#999',
    fontSize: 16,
  },
  activitySection: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0E5E6F',
    marginBottom: 5,
  },
  activityDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  activitySelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f9f9f9',
  },
  activitySelectorText: {
    fontSize: 16,
    color: '#333',
  },
  dropdownIcon: {
    fontSize: 14,
    color: '#666',
  },
  selectedActivitiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  activityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3A8891',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 10,
    margin: 5,
  },
  activityChipText: {
    color: '#fff',
    fontSize: 14,
  },
  activityChipRemove: {
    marginLeft: 5,
    padding: 2,
  },
  activityChipRemoveText: {
    color: '#fff',
    fontSize: 12,
  },
  saveButton: {
    backgroundColor: '#0E5E6F',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderRadius: 10,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0E5E6F',
  },
  modalCloseButton: {
    padding: 5,
  },
  modalCloseText: {
    fontSize: 18,
    color: '#666',
  },
  modalList: {
    maxHeight: 400,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  activityItemText: {
    fontSize: 16,
    flex: 1,
  },
  activityItemSelected: {
    fontSize: 18,
    color: '#3A8891',
    fontWeight: 'bold',
  },
  modalDoneButton: {
    padding: 15,
    backgroundColor: '#3A8891',
    alignItems: 'center',
    margin: 15,
    borderRadius: 8,
  },
  modalDoneText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  devToolsSection: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  devToolsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0E5E6F',
    marginBottom: 5,
  },
  devToolsDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  resetButton: {
    backgroundColor: '#0E5E6F',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  targetModalContent: {
    padding: 20,
  },
  targetDescription: {
    fontSize: 16,
    marginBottom: 10,
    textAlign: 'center',
  },
  targetSelectorContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  targetSelectorItem: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#0E5E6F',
  },
  targetSelectorItemSelected: {
    backgroundColor: '#0E5E6F',
  },
  targetSelectorText: {
    fontSize: 16,
    color: '#0E5E6F',
  },
  targetSelectorTextSelected: {
    color: '#fff',
  },
  targetSaveButton: {
    backgroundColor: '#0E5E6F',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  targetSaveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
})
