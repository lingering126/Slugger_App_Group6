import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Icon } from 'react-native-elements';

export default function App() {
  return (
    <View style={styles.container}>
      <StatusBar style="auto" />

      {/* 进度条 */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { width: '61%' }]} />
        <View style={[styles.progressBar, { width: '68%', backgroundColor: 'green' }]} />
      </View>

      {/* 聊天区域 */}
      <ScrollView style={styles.chatContainer}>
        <View style={styles.chatBubble}>
          <Text style={styles.chatUser}>Jake</Text>
          <Text style={styles.chatMessage}>Who wants to do an Ironman?</Text>
        </View>

        {/* 数据统计 */}
        <View style={styles.statsCard}>
          <Text style={styles.statTitle}>Tina has earned a mental point</Text>
          <View style={styles.statBox}>
            <View style={styles.statColumn}>
              <Text style={styles.statValue}>46</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statColumn}>
              <Text style={styles.statValue}>68%</Text>
              <Text style={styles.statLabel}>% of target</Text>
            </View>
            <View style={styles.statColumn}>
              <Text style={styles.statValue}>65%</Text>
              <Text style={styles.statLabel}>% of time gone</Text>
            </View>
          </View>
        </View>

        {/* 其他聊天 */}
        <View style={styles.chatBubble}>
          <Text style={styles.chatUser}>Junu</Text>
          <Text style={styles.chatMessage}>Ironman, I'm in!</Text>
        </View>

        <View style={styles.chatBubble}>
          <Text style={styles.chatUser}>Chris</Text>
          <Text style={styles.chatMessage}>Nice Tina!</Text>
        </View>
      </ScrollView>

      {/* 按钮 */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>Log physical</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>Log mental</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>Log bonus</Text>
        </TouchableOpacity>
      </View>

      {/* 底部导航栏 */}
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.navItem}>
          <Icon name="home" type="feather" color="#fff" />
          <Text style={styles.navText}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Icon name="user" type="feather" color="#fff" />
          <Text style={styles.navText}>Profile</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Icon name="users" type="feather" color="#fff" />
          <Text style={styles.navText}>Team</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Icon name="bar-chart" type="feather" color="#fff" />
          <Text style={styles.navText}>Analytics</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Icon name="more-horizontal" type="feather" color="#fff" />
          <Text style={styles.navText}>More</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8F0F2',
  },
  progressContainer: {
    flexDirection: 'row',
    height: 10,
    margin: 10,
    backgroundColor: '#ccc',
    borderRadius: 5,
  },
  progressBar: {
    height: '100%',
    backgroundColor: 'orange',
  },
  chatContainer: {
    flex: 1,
    paddingHorizontal: 10,
  },
  chatBubble: {
    backgroundColor: '#fff',
    padding: 10,
    marginVertical: 5,
    borderRadius: 10,
  },
  chatUser: {
    fontWeight: 'bold',
    color: '#555',
  },
  chatMessage: {
    fontSize: 16,
  },
  statsCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginVertical: 10,
  },
  statTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  statBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statColumn: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    color: '#777',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
  },
  button: {
    backgroundColor: '#4A90E2',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
  },
  navBar: {
    flexDirection: 'row',
    backgroundColor: '#4A90E2',
    paddingVertical: 10,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
  },
  navText: {
    color: '#fff',
    fontSize: 12,
  },
});
