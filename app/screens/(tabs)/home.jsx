import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, SafeAreaView, ImageBackground, Image, TextInput } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { StatusBar } from 'expo-status-bar';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SocialButtons } from '../../components/SocialButtons';

// 活动分类数据
const activityData = {
  Physical: [
    "Cricket", "Soccer", "Run", "Walk", "HIIT", "Gym Workout", 
    "Cycle", "Swim", "Home Workout", "Physio", "Yoga", "Squash", 
    "Rugby", "Touch Rugby", "Steps goal", "DIY", "Gardening", 
    "Physical other"
  ],
  Mental: [
    "Meditation", "Reading", "Writing", "Music Practice", 
    "Mental Gym", "Duolingo", "Language Training", "Cold shower", 
    "Mental other", "Journal", "Breathing exercise"
  ],
  Bonus: [
    "Community Service", "Family", "Personal Best", "Personal Goal", "Bonus other"
  ]
};

// 示例团队数据
const teams = [
  { id: 1, name: "Alpha Team" },
  { id: 2, name: "Beta Squad" },
  { id: 3, name: "Gamma Force" }
];

// 示例帖子数据 - 按频道分类
const samplePosts = {
  public: [
    {
      id: 1,
      type: 'text',
      author: 'Jake',
      content: 'Ready for today\'s challenge! 💪',
      likes: 12,
      comments: []
    },
    {
      id: 2,
      type: 'activity',
      author: 'Tina',
      activityType: 'Physical Exercise',
      activity: 'Running',
      duration: '45 mins',
      points: 5,
      progress: 68,
      likes: 24,
      comments: [
        { id: 1, author: 'Chris', content: 'Great job!' }
      ]
    }
  ],
  team: {
    1: [
      {
        id: 3,
        type: 'activity',
        author: 'Sarah',
        activityType: 'Mental Training',
        activity: 'Meditation',
        duration: '20 mins',
        points: 3,
        progress: 75,
        likes: 8,
        comments: []
      }
    ],
    2: [
      {
        id: 4,
        type: 'activity',
        author: 'Mike',
        activityType: 'Bonus Activity',
        activity: 'Community Service',
        duration: '2 hours',
        points: 8,
        progress: 100,
        likes: 15,
        comments: []
      }
    ],
    3: [
      {
        id: 5,
        type: 'image',
        author: 'Lisa',
        content: 'Team workout session! 💪',
        imageUrl: 'https://picsum.photos/400/300',
        likes: 20,
        comments: []
      }
    ]
  }
};

const ActivityModal = ({ visible, category, onClose }) => {
  const [selectedTime, setSelectedTime] = useState('1');
  const [selectedActivity, setSelectedActivity] = useState(null);
  const activities = activityData[category] || [];

  const handleConfirm = () => {
    if (selectedActivity) {
      // TODO: Handle activity submission
      console.log('Activity logged:', {
        category,
        activity: selectedActivity,
        duration: selectedTime
      });
    }
    onClose();
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Log {category} Activity</Text>

          <Text style={styles.modalLabel}>Select Duration (Hours)</Text>
          <Picker
            selectedValue={selectedTime}
            style={styles.picker}
            onValueChange={(itemValue) => setSelectedTime(itemValue)}
          >
            {[...Array(24).keys()].map((num) => (
              <Picker.Item key={num + 1} label={`${num + 1} hour`} value={`${num + 1}`} />
            ))}
          </Picker>

          <Text style={styles.modalLabel}>Select Activity</Text>
          <ScrollView style={styles.activityList}>
            {activities.map((activity, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.activityOption,
                  selectedActivity === activity && styles.selectedActivity
                ]}
                onPress={() => setSelectedActivity(activity)}
              >
                <Text style={[
                  styles.activityOptionText,
                  selectedActivity === activity && styles.selectedActivityText
                ]}>
                  {activity}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.confirmButton]}
              onPress={handleConfirm}
            >
              <Text style={styles.modalButtonText}>Confirm</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={onClose}
            >
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const PostCard = ({ post }) => {
  const renderContent = () => {
    switch (post.type) {
      case 'activity':
        return (
          <View style={styles.activityCard}>
            <View style={styles.activityHeader}>
              <Text style={styles.activityTitle}>{post.activityType}</Text>
              <Text style={styles.activityPoints}>+{post.points} pts</Text>
            </View>
            <View style={styles.activityDetails}>
              <Text style={styles.activityText}>Activity: {post.activity}</Text>
              <Text style={styles.activityText}>Duration: {post.duration}</Text>
              <Text style={styles.activityText}>Personal target completed: {post.progress}%</Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBarBackground}>
                <View style={[styles.progressBarFill, { width: `${post.progress}%` }]} />
              </View>
            </View>
          </View>
        );
      case 'image':
        return (
          <View>
            <Text style={styles.postContent}>{post.content}</Text>
            <Image 
              source={{ uri: post.imageUrl }}
              style={styles.postImage}
            />
          </View>
        );
      default:
        return <Text style={styles.postContent}>{post.content}</Text>;
    }
  };

  return (
    <View style={styles.postCard}>
      <View style={styles.postHeader}>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{post.author[0]}</Text>
          </View>
          <Text style={styles.username}>{post.author}</Text>
        </View>
      </View>
      {renderContent()}
      {post.comments && post.comments.length > 0 && (
        <View style={styles.commentsSection}>
          {post.comments.map((comment, index) => (
            <View key={index} style={styles.commentContainer}>
              <View style={styles.commentHeader}>
                <View style={styles.commentAvatar}>
                  <Text style={styles.commentAvatarText}>{comment.author[0]}</Text>
                </View>
                <Text style={styles.commentAuthor}>{comment.author}</Text>
                <Text style={styles.commentContent}>{comment.content}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
      <SocialButtons likes={post.likes} comments={post.comments} showComments={false} />
    </View>
  );
};

const ChannelSelector = ({ selectedChannel, selectedTeam, onChannelSelect, onTeamSelect }) => {
  return (
    <View style={styles.channelSelectorContainer}>
      <TouchableOpacity 
        style={[
          styles.channelRow,
          selectedChannel === 'public' && styles.selectedChannel
        ]}
        onPress={() => onChannelSelect('public')}
      >
        <Ionicons name="globe-outline" size={20} color={selectedChannel === 'public' ? '#fff' : '#666'} />
        <Text style={[styles.channelText, selectedChannel === 'public' && styles.selectedChannelText]}>
          Public
        </Text>
      </TouchableOpacity>
      
      <View style={styles.teamSection}>
        <TouchableOpacity 
          style={[
            styles.channelRow,
            selectedChannel === 'team' && styles.selectedChannel
          ]}
          onPress={() => onChannelSelect('team')}
        >
          <Ionicons name="people-outline" size={20} color={selectedChannel === 'team' ? '#fff' : '#666'} />
          <Text style={[styles.channelText, selectedChannel === 'team' && styles.selectedChannelText]}>
            Team
          </Text>
        </TouchableOpacity>
        
        {selectedChannel === 'team' && (
          <View style={styles.teamList}>
            {teams.map(team => (
              <TouchableOpacity 
                key={team.id}
                style={[
                  styles.teamItem,
                  selectedTeam === team.id && styles.selectedTeam
                ]}
                onPress={() => onTeamSelect(team.id)}
              >
                <Text style={[
                  styles.teamText,
                  selectedTeam === team.id && styles.selectedTeamText
                ]}>
                  {team.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </View>
  );
};

const StatsCard = ({ title, personalProgress, teamProgress }) => (
  <View style={styles.statsCard}>
    <View style={styles.statsHeader}>
      <Text style={styles.statsTitle}>{title}</Text>
      {title.includes('mental') && <Ionicons name="diamond" size={20} color="#6c63ff" />}
    </View>
    <View style={styles.statsContent}>
      <View style={styles.statsProgressContainer}>
        {/* 团队目标进度条 */}
        <View style={styles.statsProgressRow}>
          <View style={styles.progressLabel}>
            <Text style={styles.progressLabelText}>Team Target</Text>
          </View>
          <View style={styles.statsProgressBarBackground}>
            <View 
              style={[
                styles.statsProgressBarFill, 
                { width: `${teamProgress}%` }
              ]} 
            />
          </View>
          <Text style={styles.statsProgressText}>{teamProgress}%</Text>
        </View>
        
        {/* 个人目标进度条 */}
        <View style={styles.statsProgressRow}>
          <View style={styles.progressLabel}>
            <Text style={styles.progressLabelText}>Personal Target</Text>
          </View>
          <View style={styles.statsProgressBarBackground}>
            <View 
              style={[
                styles.statsProgressBarFill, 
                { width: `${personalProgress}%`, backgroundColor: '#ff9800' }
              ]} 
            />
          </View>
          <Text style={styles.statsProgressText}>{personalProgress}%</Text>
        </View>
      </View>
    </View>
  </View>
);

const HomeScreen = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedChannel, setSelectedChannel] = useState('public');
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [showNewPostModal, setShowNewPostModal] = useState(false);
  const [postType, setPostType] = useState(null);
  const [contentType, setContentType] = useState(null);
  const [postContent, setPostContent] = useState('');
  const [selectedActivity, setSelectedActivity] = useState(null);

  const handleChannelSelect = (channel) => {
    setSelectedChannel(channel);
    if (channel === 'public') {
      setSelectedTeam(null);
    }
  };

  const handleTeamSelect = (teamId) => {
    setSelectedTeam(teamId);
  };

  const getCurrentPosts = () => {
    if (selectedChannel === 'public') {
      return samplePosts.public;
    } else if (selectedChannel === 'team' && selectedTeam) {
      return samplePosts.team[selectedTeam] || [];
    }
    return [];
  };

  return (
    <SafeAreaView style={styles.container}>
      <ImageBackground 
        source={require('../../../assets/analytics_bg.png')}
        style={styles.backgroundImage}
        imageStyle={{ opacity: 0.16 }}
      >
        <LinearGradient
          colors={['rgba(248, 250, 252, 0.1)', 'rgba(248, 250, 252, 0.6)', 'rgba(248, 250, 252, 0.95)', 'rgba(248, 250, 252, 1)']}
          locations={[0, 0.2, 0.5, 0.7]}
          style={styles.gradient}
        >
          <View style={styles.mainContainer}>
            {/* Fixed Header */}
            <View style={styles.fixedHeader}>
              <View style={styles.header}>
                <Ionicons name="home" size={43} color="#3A8891" />
              </View>

              {/* Stats Cards */}
              <View style={styles.statsContainer}>
                <StatsCard
                  title="Mental Points Progress"
                  personalProgress={68}
                  teamProgress={65}
                />
              </View>
            </View>

            {/* Channel Selector */}
            <ChannelSelector 
              selectedChannel={selectedChannel}
              selectedTeam={selectedTeam}
              onChannelSelect={handleChannelSelect}
              onTeamSelect={handleTeamSelect}
            />

            {/* Posts List */}
            <ScrollView style={styles.scrollView}>
              {getCurrentPosts().map(post => (
                <PostCard key={post.id} post={post} />
              ))}
            </ScrollView>

            {/* Activity Buttons */}
            <View style={styles.activityButtonsContainer}>
              <TouchableOpacity 
                style={styles.activityButton}
                onPress={() => {
                  setSelectedCategory('Physical');
                  setModalVisible(true);
                }}
              >
                <Text style={styles.activityButtonText}>Physical</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.activityButton}
                onPress={() => {
                  setSelectedCategory('Mental');
                  setModalVisible(true);
                }}
              >
                <Text style={styles.activityButtonText}>Mental</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.activityButton}
                onPress={() => {
                  setSelectedCategory('Bonus');
                  setModalVisible(true);
                }}
              >
                <Text style={styles.activityButtonText}>Bonus</Text>
              </TouchableOpacity>
            </View>

            {/* Add Post Button */}
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => setShowNewPostModal(true)}
            >
              <Ionicons name="add" size={30} color="#fff" />
            </TouchableOpacity>

            {/* Activity Modal */}
            <ActivityModal
              visible={modalVisible}
              category={selectedCategory}
              onClose={() => setModalVisible(false)}
            />

            {/* New Post Modal */}
            <Modal
              visible={showNewPostModal}
              animationType="slide"
              transparent={true}
              onRequestClose={() => setShowNewPostModal(false)}
            >
              <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Create New Post</Text>
                  
                  {/* Channel Selection */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Select Channel</Text>
                    <View style={styles.modalButtonRow}>
                      <TouchableOpacity 
                        style={[styles.modalOptionButton, postType === 'public' && styles.modalOptionSelected]}
                        onPress={() => {
                          setPostType('public');
                          setSelectedTeam(null);
                          setContentType(null);
                        }}
                      >
                        <Ionicons name="globe-outline" size={24} color={postType === 'public' ? '#fff' : '#666'} />
                        <Text style={[styles.modalOptionText, postType === 'public' && styles.modalOptionTextSelected]}>
                          Public
                        </Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={[styles.modalOptionButton, postType === 'team' && styles.modalOptionSelected]}
                        onPress={() => {
                          setPostType('team');
                          setContentType(null);
                        }}
                      >
                        <Ionicons name="people-outline" size={24} color={postType === 'team' ? '#fff' : '#666'} />
                        <Text style={[styles.modalOptionText, postType === 'team' && styles.modalOptionTextSelected]}>
                          Team
                        </Text>
                      </TouchableOpacity>
                    </View>
                    
                    {postType === 'team' && (
                      <View style={styles.teamListModal}>
                        {teams.map(team => (
                          <TouchableOpacity 
                            key={team.id}
                            style={[
                              styles.teamItemModal,
                              selectedTeam === team.id && styles.selectedTeamModal
                            ]}
                            onPress={() => {
                              setSelectedTeam(team.id);
                              setContentType(null);
                            }}
                          >
                            <Text style={[
                              styles.teamTextModal,
                              selectedTeam === team.id && styles.selectedTeamTextModal
                            ]}>
                              {team.name}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>

                  {/* Content Type Selection */}
                  {(postType === 'public' || (postType === 'team' && selectedTeam)) && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>Select Content Type</Text>
                      <View style={styles.modalButtonRow}>
                        <TouchableOpacity 
                          style={[styles.modalOptionButton, contentType === 'message' && styles.modalOptionSelected]}
                          onPress={() => {
                            setContentType('message');
                            setSelectedActivity(null);
                          }}
                        >
                          <Ionicons name="chatbox-outline" size={24} color={contentType === 'message' ? '#fff' : '#666'} />
                          <Text style={[styles.modalOptionText, contentType === 'message' && styles.modalOptionTextSelected]}>
                            Message
                          </Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                          style={[styles.modalOptionButton, contentType === 'activity' && styles.modalOptionSelected]}
                          onPress={() => {
                            setContentType('activity');
                            setPostContent('');
                          }}
                        >
                          <Ionicons name="fitness-outline" size={24} color={contentType === 'activity' ? '#fff' : '#666'} />
                          <Text style={[styles.modalOptionText, contentType === 'activity' && styles.modalOptionTextSelected]}>
                            Activity Data
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {/* Message Input */}
                  {contentType === 'message' && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>Message</Text>
                      <TextInput
                        style={styles.messageInput}
                        placeholder="Write your message..."
                        value={postContent}
                        onChangeText={setPostContent}
                        multiline
                      />
                    </View>
                  )}

                  {/* Activity Selection */}
                  {contentType === 'activity' && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>Select Activity to Share</Text>
                      <ScrollView style={styles.activityList}>
                        {samplePosts.public.map((post, index) => (
                          post.type === 'activity' && (
                            <TouchableOpacity
                              key={index}
                              style={[
                                styles.activityOption,
                                selectedActivity === post.id && styles.selectedActivity
                              ]}
                              onPress={() => setSelectedActivity(post.id)}
                            >
                              <Text style={styles.activityTitle}>{post.activity}</Text>
                              <Text style={styles.activityDuration}>{post.duration}</Text>
                              <Text style={styles.activityPoints}>+{post.points} pts</Text>
                            </TouchableOpacity>
                          )
                        ))}
                      </ScrollView>
                    </View>
                  )}

                  {/* Action Buttons */}
                  <View style={styles.modalActions}>
                    <TouchableOpacity 
                      style={[
                        styles.postButton,
                        (!contentType || (contentType === 'message' && !postContent.trim()) || 
                         (contentType === 'activity' && !selectedActivity)) && styles.postButtonDisabled
                      ]}
                      onPress={() => {
                        // TODO: Handle post submission
                        setShowNewPostModal(false);
                        setPostContent('');
                        setPostType(null);
                        setSelectedTeam(null);
                        setContentType(null);
                        setSelectedActivity(null);
                      }}
                      disabled={!contentType || (contentType === 'message' && !postContent.trim()) || 
                               (contentType === 'activity' && !selectedActivity)}
                    >
                      <Text style={styles.postButtonText}>Post</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.closeButton}
                      onPress={() => {
                        setShowNewPostModal(false);
                        setPostContent('');
                        setPostType(null);
                        setSelectedTeam(null);
                        setContentType(null);
                        setSelectedActivity(null);
                      }}
                    >
                      <Ionicons name="close" size={24} color="#ff4b4b" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>
          </View>
        </LinearGradient>
      </ImageBackground>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8F0F2',
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    backgroundColor: '#f8f9fa',
    position: 'relative',
  },
  gradient: {
    flex: 1,
    backgroundColor: 'rgba(248, 250, 252, 0.95)',
  },
  mainContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'rgba(248, 250, 252, 0.95)',
  },
  fixedHeader: {
    backgroundColor: 'transparent',
    paddingTop: 2,
    paddingBottom: 2,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 2,
  },
  statsContainer: {
    padding: 8,
  },
  statsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 15,
    padding: 12,
    marginBottom: 2,
    borderWidth: 1,
    borderColor: '#e1e8ed',
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
  },
  statsContent: {
    marginTop: 5,
  },
  statsProgressContainer: {
    gap: 15,
  },
  statsProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  progressLabel: {
    width: 100,
  },
  progressLabelText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  statsProgressBarBackground: {
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    flex: 1,
  },
  statsProgressBarFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  statsProgressText: {
    fontSize: 14,
    color: '#666',
    width: 40,
    textAlign: 'right',
  },
  activityButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  activityButton: {
    backgroundColor: '#4A90E2',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    flex: 1,
    marginHorizontal: 5,
  },
  activityButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  channelSelectorContainer: {
    padding: 3,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginBottom: 8,
  },
  teamSection: {
    marginLeft: 20,
  },
  selectedChannel: {
    backgroundColor: '#6c63ff',
  },
  channelText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  selectedChannelText: {
    color: '#fff',
  },
  teamList: {
    marginLeft: 20,
    marginTop: 8,
  },
  teamItem: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 15,
    marginBottom: 5,
    backgroundColor: '#f5f5f5',
  },
  selectedTeam: {
    backgroundColor: '#6c63ff',
  },
  teamText: {
    color: '#666',
  },
  selectedTeamText: {
    color: '#fff',
  },
  scrollView: {
    flex: 1,
    marginBottom: 60,
  },
  postCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6c63ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  username: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  postContent: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 10,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    marginBottom: 10,
  },
  activityCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  activityPoints: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  activityDetails: {
    marginBottom: 5,
  },
  activityText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
    textAlign: 'left',
  },
  addButton: {
    position: 'absolute',
    right: 20,
    bottom: 80,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#6c63ff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalSection: {
    marginBottom: 20,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  modalOptionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    gap: 8,
  },
  modalOptionSelected: {
    backgroundColor: '#6c63ff',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#666',
  },
  modalOptionTextSelected: {
    color: '#fff',
  },
  teamListModal: {
    marginTop: 10,
  },
  teamItemModal: {
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    marginBottom: 5,
  },
  selectedTeamModal: {
    backgroundColor: '#6c63ff',
  },
  teamTextModal: {
    fontSize: 16,
    color: '#666',
  },
  selectedTeamTextModal: {
    color: '#fff',
  },
  messageInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 15,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
  },
  postButton: {
    backgroundColor: '#6c63ff',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 10,
  },
  postButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  picker: {
    width: '100%',
    marginBottom: 20,
  },
  activityList: {
    maxHeight: 200,
    marginBottom: 20,
  },
  activityOption: {
    padding: 15,
    borderRadius: 10,
    backgroundColor: '#f5f5f5',
    marginBottom: 5,
  },
  selectedActivity: {
    backgroundColor: '#6c63ff',
  },
  activityOptionText: {
    fontSize: 16,
    color: '#666',
  },
  selectedActivityText: {
    color: '#fff',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
  },
  cancelButton: {
    backgroundColor: '#ff4b4b',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  postButtonDisabled: {
    backgroundColor: '#ccc',
  },
  progressBarContainer: {
    marginTop: 5,
    paddingRight: 15,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    flex: 1,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  progressDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    textAlign: 'right',
  },
  commentsSection: {
    marginTop: 10,
    marginBottom: 10,
    paddingTop: 10,
    paddingLeft: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#f8f9fa',
  },
  commentContainer: {
    marginBottom: 6,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  commentAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#6c63ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  commentAvatarText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  commentAuthor: {
    fontWeight: '600',
    fontSize: 14,
    color: '#1a1a1a',
    marginRight: 8,
  },
  commentContent: {
    flex: 1,
    fontSize: 14,
    color: '#4a4a4a',
  },
});

export default HomeScreen; 