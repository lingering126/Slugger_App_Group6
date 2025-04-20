import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, SafeAreaView, ImageBackground } from 'react-native';
import { Picker } from '@react-native-picker/picker'; // import picker
import { StatusBar } from 'expo-status-bar';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// 将所有活动按 Category 分类
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
  ],
  // 如果将来需要 Cummulative 类别，可以留在这里
  Cummulative: [
    "Calories Target", "Sleep Time Target", "Apocolyps", 
    "Cumulative other (4)", "Cumulative other (6)", "Cumulative other (7)", "Cumulative other (3)"
  ]
};

// 用来把"Physical Exercise"、"Mental Training"、"Bonus Activity"映射到真正的分类名
const categoryMap = {
  "Physical Exercise": "Physical",
  "Mental Training": "Mental",
  "Bonus Activity": "Bonus"
  // 如果将来需要 "Cummulative Activity"，可以在这里加
};

const SocialButtons = () => (
  <View style={styles.socialButtonsContainer}>
    <TouchableOpacity style={styles.socialButton}>
      <FontAwesome5 name="heart" size={16} color="#666" />
      <Text style={styles.socialButtonText}>Like</Text>
    </TouchableOpacity>
    <TouchableOpacity style={styles.socialButton}>
      <FontAwesome5 name="comment" size={16} color="#666" />
      <Text style={styles.socialButtonText}>Comment</Text>
    </TouchableOpacity>
    <TouchableOpacity style={styles.socialButton}>
      <FontAwesome5 name="share" size={16} color="#666" />
      <Text style={styles.socialButtonText}>Share</Text>
    </TouchableOpacity>
  </View>
);

const ChatBubble = ({ user, message }) => {
  return (
    <View style={styles.chatBubbleContainer}>
      <View style={styles.chatBubbleContent}>
        <Text style={styles.chatUser}>{user}</Text>
        <Text style={styles.chatMessage}>{message}</Text>
        <SocialButtons />
      </View>
    </View>
  );
};

const StatsCard = () => {
  return (
    <View style={styles.statsCard}>
      <View style={styles.statsHeader}>
        <Text style={styles.statTitle}>Tina has earned a mental point</Text>
        <FontAwesome5 name="gem" size={18} color="#6C63FF" />
      </View>

      <View style={styles.statBox}>
        <View style={styles.statColumn}>
          <Text style={styles.statLabel}>Total</Text>
          <Text style={styles.statValue}>46</Text>
          <Text style={styles.statLabel}>Group target</Text>
          <Text style={styles.statValue}>68</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.statColumn}>
          <Text style={styles.statLabel}>% of target</Text>
          <Text style={styles.statValue}>68%</Text>
          <Text style={styles.statLabel}>% of time gone</Text>
          <Text style={styles.statValue}>65%</Text>
        </View>
      </View>
      <SocialButtons />
    </View>
  );
};

const HomeScreen = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedTime, setSelectedTime] = useState('1');
  const [selectedActivity, setSelectedActivity] = useState(null);

  const openModal = (category) => {
    setSelectedCategory(category);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
  };

  const handleSelectActivity = (activity) => {
    setSelectedActivity(activity);
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

              {/* Progress Bars */}
              <View style={styles.progressContainer}>
                {/* Individual Progress */}
                <View style={styles.progressRow}>
                  <View style={styles.progressBarWrapper}>
                    <View style={[styles.progressBar, { width: '68%', backgroundColor: 'green' }]} />
                  </View>
                  <View style={styles.progressInfo}>
                    <FontAwesome5 name="user" size={16} color="black" style={styles.progressIcon} />
                    <Text style={styles.progressText}>  68%</Text>
                  </View>
                </View>

                {/* Team Progress */}
                <View style={styles.progressRow}>
                  <View style={styles.progressBarWrapper}>
                    <View style={[styles.progressBar, { width: '61%', backgroundColor: 'orange' }]} />
                  </View>
                  <View style={styles.progressInfo}>
                    <FontAwesome5 name="users" size={16} color="black" style={styles.progressIcon} />
                    <Text style={styles.progressText}> 61%</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Scrollable Chat Content */}
            <ScrollView style={styles.chatContainer}>
              <ChatBubble user="Jake" message="Who wants to do an Ironman?" />
              <StatsCard />
              <ChatBubble user="Junu" message="Ironman, I'm in!" />
              <ChatBubble user="Chris" message="Nice Tina!" />
              <ChatBubble user="Sarah" message="Great progress everyone! I just finished my morning run. 🏃‍♀️" />
              <ChatBubble user="Mike" message="Just completed a 2-hour cycling session. Anyone up for a group ride this weekend? 🚴‍♂️" />
              <StatsCard />
              <ChatBubble user="Emma" message="Did my first meditation session today. It's amazing how refreshed I feel! 🧘‍♀️" />
              <ChatBubble user="Tom" message="Hit a new personal best in the gym today! 💪" />
              <ChatBubble user="Lisa" message="Anyone interested in joining a yoga class next week? It's great for recovery!" />
              <ChatBubble user="David" message="Just logged 10km on my morning run. The weather was perfect! ☀️" />
              <StatsCard />
              <ChatBubble user="Alex" message="Completed today's HIIT workout. It was intense but worth it! 🔥" />
              <ChatBubble user="Sophie" message="Mental training is just as important as physical. Just finished reading a great book on sports psychology." />
              <ChatBubble user="Ryan" message="Who's up for a group swimming session this Friday? 🏊‍♂️" />
            </ScrollView>

            {/* Fixed Bottom Buttons */}
            <View style={styles.fixedButtonContainer}>
              <TouchableOpacity style={styles.button} onPress={() => openModal('Physical Exercise')}>
                <Text style={styles.buttonText}>Log physical</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.button} onPress={() => openModal('Mental Training')}>
                <Text style={styles.buttonText}>Log mental</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.button} onPress={() => openModal('Bonus Activity')}>
                <Text style={styles.buttonText}>Log bonus</Text>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </ImageBackground>

      {/* Modal for selecting exercise type and time */}
      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select {selectedCategory}</Text>

            {/* Time Picker */}
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

            {/* Activity Options */}
            <View style={styles.optionContainer}>
              {(activityData[categoryMap[selectedCategory]] || []).map((activityName) => (
                <TouchableOpacity 
                  key={activityName}
                  style={[
                    styles.optionButton, 
                    selectedActivity === activityName && styles.selectedButton
                  ]}
                  onPress={() => handleSelectActivity(activityName)}
                >
                  <Text style={[
                    styles.optionText, 
                    selectedActivity === activityName && styles.selectedText
                  ]}>
                    {activityName}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Confirm & Close Buttons */}
            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.modalButton} onPress={closeModal}>
                <Text style={styles.modalButtonText}>Confirm</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.closeButton]} onPress={closeModal}>
                <Text style={styles.modalButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8F0F2',
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
  },
  gradient: {
    flex: 1,
  },
  mainContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  fixedHeader: {
    backgroundColor: 'rgba(248, 250, 252, 0.95)',
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  progressContainer: {
    paddingHorizontal: 15,
    marginBottom: 20,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  progressBarWrapper: {
    flex: 1,
    height: 10,
    backgroundColor: '#ddd',
    borderRadius: 5,
    marginRight: 10,
  },
  progressBar: {
    height: '100%',
    borderRadius: 5,
  },
  progressInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: 70,
  },
  progressIcon: {
    marginRight: 5,
  },
  progressText: {
    fontWeight: 'bold',
  },
  chatContainer: {
    flex: 1,
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 80,
  },
  fixedButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 15,
  },
  button: {
    backgroundColor: '#4A90E2',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
    flex: 1,
    marginHorizontal: 5,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  modalLabel: {
    alignSelf: 'flex-start',
    marginBottom: 5,
  },
  picker: {
    width: '100%',
    marginBottom: 15,
  },
  optionContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
  },
  optionButton: {
    width: '48%',
    padding: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    marginBottom: 10,
    alignItems: 'center',
  },
  selectedButton: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  optionText: {
    color: '#34495E',
  },
  selectedText: {
    color: '#fff',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButton: {
    backgroundColor: '#4A90E2',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    width: '48%',
    alignItems: 'center',
  },
  closeButton: {
    backgroundColor: '#E74C3C',
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  // Chat Bubble Styles
  chatBubbleContainer: {
    marginBottom: 15,
  },
  chatBubbleContent: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
  },
  chatUser: {
    fontWeight: 'bold',
    marginBottom: 3,
    color: '#2C3E50',
  },
  chatMessage: {
    color: '#34495E',
  },

  // Stats Card Styles
  statsCard: {
    backgroundColor: '#DFF6FF',
    padding: 15,
    borderRadius: 10,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#A8DADC',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  statTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  statBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#BEE1E6',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  statColumn: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: '#34495E',
    marginBottom: 3,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 5,
  },
  divider: {
    width: 1,
    height: '80%',
    backgroundColor: '#A8DADC',
  },

  // Social Buttons Styles
  socialButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 5,
  },
  socialButtonText: {
    marginLeft: 5,
    color: '#666',
    fontSize: 12,
  },
}); 