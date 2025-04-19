import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Dimensions, 
  FlatList,
  Image,
  Animated,
  SafeAreaView,
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { FontAwesome, FontAwesome5, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import platformHelpers from '../utils/platformHelpers';

const { width, height } = platformHelpers.getScreenDimensions();

// Welcome page slides data
const slides = [
  {
    id: '1',
    title: 'Welcome to Slugger!',
    text: 'Slugger is a lifestyle app designed to keep you and your group motivated to stay active every day.',
    icon: 'running',
    iconType: 'fa5'
  },
  {
    id: '2',
    title: 'Weekly Targets',
    text: 'Each week, your group sets a target, and everyone contributes by logging their daily activities to earn points. Activities can be:\n\n• Physical: Soccer, HIIT, running, etc.\n• Mental: Reading, writing, meditation, etc.\n• Cumulative: Calories burned, sleep hours, etc.\n• Bonus: Extra points! For personal bests and so on.',
    icon: 'bullseye',
    iconType: 'fa5'
  },
  {
    id: '3',
    title: 'Daily Consistency',
    text: 'To encourage consistency, you can log up to 4 activities per category per day. (So don\'t be a weekend warrior, keep active everyday!)',
    icon: 'calendar-check',
    iconType: 'fa5'
  },
  {
    id: '4',
    title: 'Challenge Mode',
    text: 'To make things more interesting, we have challenge Mode — If your group doesn\'t hit the weekly target, a random forfeit will be assigned—like 500 push-ups or 12 hours without your phone.',
    icon: 'trophy',
    iconType: 'font'
  },
  {
    id: '5',
    title: 'Ready to Start?',
    text: 'Are you ready? Let\'s make healthy living fun!',
    icon: 'rocket',
    iconType: 'font'
  },
  {
    id: '6',
    title: 'Join or Create a Team',
    text: 'To get started, join an existing team or create your own.',
    icon: 'users',
    iconType: 'font'
  }
];

export default function WelcomeScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const router = useRouter();

  // Function to handle joining a group
  const handleJoinGroup = async () => {
    try {
      console.log('Setting welcomeCompleted flag before redirecting to join group');
      await AsyncStorage.setItem('welcomeCompleted', 'true');
      router.replace('/screens/join-group');
    } catch (error) {
      console.error('Error saving welcome completion state:', error);
    }
  };

  // Function to handle creating a group
  const handleCreateGroup = async () => {
    try {
      console.log('Setting welcomeCompleted flag before redirecting to create group');
      await AsyncStorage.setItem('welcomeCompleted', 'true');
      router.replace('/screens/create-group');
    } catch (error) {
      console.error('Error saving welcome completion state:', error);
    }
  };

  // Function to skip for now and go to profile
  const handleSkipForNow = async () => {
    try {
      console.log('Setting welcomeCompleted flag before redirecting to profile');
      await AsyncStorage.setItem('welcomeCompleted', 'true');
      router.replace('/screens/(tabs)/profile');
    } catch (error) {
      console.error('Error saving welcome completion state:', error);
    }
  };

  // Function to render each slide
  const renderSlide = ({ item, index }) => {
    // Calculate opacity for fade-in effect
    const inputRange = [
      (index - 1) * width,
      index * width,
      (index + 1) * width
    ];
    
    const opacity = scrollX.interpolate({
      inputRange,
      outputRange: [0, 1, 0],
      extrapolate: 'clamp'
    });

    const translateY = scrollX.interpolate({
      inputRange,
      outputRange: [50, 0, 50],
      extrapolate: 'clamp'
    });

    return (
      <View style={styles.slide}>
        <Animated.View style={[styles.slideContent, { opacity, transform: [{ translateY }] }]}>
          <View style={styles.iconContainer}>
            {item.iconType === 'font' ? (
              <FontAwesome name={item.icon} size={80} color="#4CAF50" />
            ) : item.iconType === 'fa5' ? (
              <FontAwesome5 name={item.icon} size={80} color="#4CAF50" />
            ) : (
              <MaterialCommunityIcons name={item.icon} size={80} color="#4CAF50" />
            )}
          </View>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.text}>{item.text}</Text>
          
          {index === slides.length - 1 && (
            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={[styles.button, styles.joinButton]} 
                onPress={handleJoinGroup}
                {...platformHelpers.getTouchableProps()}
              >
                <Text style={styles.buttonText}>Join a team</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.button, styles.createButton]} 
                onPress={handleCreateGroup}
                {...platformHelpers.getTouchableProps()}
              >
                <Text style={styles.buttonText}>Create a team</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.button, styles.skipButton]} 
                onPress={handleSkipForNow}
                {...platformHelpers.getTouchableProps()}
              >
                <Text style={styles.skipButtonText}>Not for now</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </View>
    );
  };

  // Function to handle next slide
  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current.scrollToIndex({
        index: currentIndex + 1,
        animated: true
      });
    }
  };

  // Function to handle previous slide
  const handlePrev = () => {
    if (currentIndex > 0) {
      flatListRef.current.scrollToIndex({
        index: currentIndex - 1,
        animated: true
      });
    }
  };

  // Function to render pagination dots
  const renderPagination = () => {
    return (
      <View style={styles.paginationContainer}>
        {slides.map((_, index) => {
          const inputRange = [
            (index - 1) * width,
            index * width,
            (index + 1) * width
          ];
          
          const dotWidth = scrollX.interpolate({
            inputRange,
            outputRange: [10, 20, 10],
            extrapolate: 'clamp'
          });
          
          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.3, 1, 0.3],
            extrapolate: 'clamp'
          });
          
          return (
            <Animated.View
              key={index}
              style={[
                styles.dot,
                { width: dotWidth, opacity, backgroundColor: index === currentIndex ? '#4CAF50' : '#ccc' }
              ]}
            />
          );
        })}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onMomentumScrollEnd={(event) => {
          const index = Math.round(event.nativeEvent.contentOffset.x / width);
          setCurrentIndex(index);
        }}
        scrollEventThrottle={16}
        scrollEnabled={true}
        nestedScrollEnabled={true}
        snapToInterval={width}
        decelerationRate="fast"
        snapToAlignment="center"
      />
      
      {renderPagination()}
      
      {currentIndex < slides.length - 1 && (
        <View style={styles.navigationButtons}>
          {currentIndex > 0 && (
            <TouchableOpacity 
              style={styles.navButton} 
              onPress={handlePrev}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={24} color="#4CAF50" />
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={styles.navButton} 
            onPress={handleNext}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-forward" size={24} color="#4CAF50" />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  slide: {
    width,
    height: platformHelpers.getPlatformStyleValue('100vh', height),
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  slideContent: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    maxWidth: platformHelpers.getPlatformStyleValue(600, '100%'),
  },
  iconContainer: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#f0f8f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  text: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: 100,
    width: '100%',
  },
  dot: {
    height: 10,
    borderRadius: 5,
    marginHorizontal: 5,
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    position: 'absolute',
    bottom: 40,
    width: '80%',
    maxWidth: 500,
    alignSelf: 'center',
  },
  navButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f8f0',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    ...platformHelpers.isWeb && { cursor: 'pointer' },
  },
  buttonContainer: {
    width: '100%',
    marginTop: 40,
    maxWidth: platformHelpers.getPlatformStyleValue(400, '100%'),
  },
  button: {
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    ...platformHelpers.isWeb && { cursor: 'pointer' },
  },
  joinButton: {
    backgroundColor: '#4CAF50',
  },
  createButton: {
    backgroundColor: '#2196F3',
  },
  skipButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  skipButtonText: {
    color: '#666',
    fontSize: 16,
  }
}); 