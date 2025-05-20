import React, { useState, useRef, useEffect } from 'react';
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
  Platform,
  ScrollView
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { FontAwesome, FontAwesome5, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

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
    text: 'To encourage consistency, you can log up to 1 physical/mental activity per day.\n You can only log additional activities to help your team after reaching your weekly target. (So don\'t be a weekend warrior—stay active every day!)',
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
  const { initialIndex } = useLocalSearchParams();
  // Initialize currentIndex directly with initialIndex if available
  const [currentIndex, setCurrentIndex] = useState(() => {
    if (initialIndex) {
      const index = parseInt(initialIndex, 10);
      if (!isNaN(index) && index >= 0 && index < slides.length) {
        return index;
      }
    }
    return 0;
  });
  const flatListRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const router = useRouter();

  // Initialize scrollX for web
  useEffect(() => {
    if (Platform.OS === 'web' && currentIndex > 0) {
      // Set initial value for scrollX when starting with non-zero index
      scrollX.setValue(currentIndex * width);
    }
  }, []);

  // Update scrollX when currentIndex changes (for web platform)
  useEffect(() => {
    if (Platform.OS === 'web') {
      // Manually update the scrollX value for web to trigger animations
      Animated.timing(scrollX, {
        toValue: currentIndex * width,
        duration: 300,
        useNativeDriver: false
      }).start();
    }
  }, [currentIndex]);

  // Scroll FlatList to initial position on mount (for mobile)
  useEffect(() => {
    if (Platform.OS !== 'web' && currentIndex > 0 && flatListRef.current) {
      // Use a short delay to ensure the FlatList is fully rendered
      const timer = setTimeout(() => {
        if (flatListRef.current) {
          flatListRef.current.scrollToIndex({
            index: currentIndex,
            animated: false
          });
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, []);

  // Check if user should skip welcome screen on first render
  useEffect(() => {
    const checkWelcomeStatus = async () => {
      try {
        const welcomeCompleted = await AsyncStorage.getItem('welcomeCompleted');
        const userIsNew = await AsyncStorage.getItem('userIsNew');
        
        // If user is not new and has already completed welcome, redirect to home
        if (welcomeCompleted === 'true' && userIsNew !== 'true') {
          console.log('User already completed welcome. Redirecting to home.');
          router.replace('/screens/(tabs)/home');
        } else if (userIsNew === 'true') {
          // Clear the new user flag as they're now viewing the welcome screen
          await AsyncStorage.removeItem('userIsNew');
        }
      } catch (error) {
        console.error('Error checking welcome status:', error);
      }
    };
    
    checkWelcomeStatus();
  }, []);

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
    // For web platform, we need to adjust the calculation
    let inputRange, opacity, translateY;
    
    if (Platform.OS === 'web') {
      // Simpler calculation for web platform
      opacity = index === currentIndex ? 1 : 0;
      translateY = index === currentIndex ? 0 : 50;
    } else {
      // Original animation for mobile platforms
      inputRange = [
        (index - 1) * width,
        index * width,
        (index + 1) * width
      ];
      
      opacity = scrollX.interpolate({
        inputRange,
        outputRange: [0, 1, 0],
        extrapolate: 'clamp'
      });

      translateY = scrollX.interpolate({
        inputRange,
        outputRange: [50, 0, 50],
        extrapolate: 'clamp'
      });
    }

    // For web platform, we need to directly render the slide if it's the current one
    if (Platform.OS === 'web' && index !== currentIndex) {
      return null;
    }

    return (
      <View style={styles.slide}>
        <Animated.View 
          style={[
            styles.slideContent, 
            Platform.OS === 'web' 
              ? { opacity, transform: [{ translateY }] }
              : { opacity, transform: [{ translateY }] }
          ]}
        >
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
              >
                <Text style={styles.buttonText}>Join a team</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.button, styles.createButton]} 
                onPress={handleCreateGroup}
              >
                <Text style={styles.buttonText}>Create a team</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.button, styles.skipButton]} 
                onPress={handleSkipForNow}
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
      // Only try to scroll if we're in the mobile view and flatListRef is available
      if (Platform.OS !== 'web' && flatListRef.current) {
        flatListRef.current.scrollToIndex({
          index: currentIndex + 1,
          animated: true
        });
      } else if (Platform.OS === 'web') {
        // For web, we just update the current index
        setCurrentIndex(currentIndex + 1);
      }
    }
  };

  // Function to handle previous slide
  const handlePrev = () => {
    if (currentIndex > 0) {
      // Only try to scroll if we're in the mobile view and flatListRef is available
      if (Platform.OS !== 'web' && flatListRef.current) {
        flatListRef.current.scrollToIndex({
          index: currentIndex - 1,
          animated: true
        });
      } else if (Platform.OS === 'web') {
        // For web, we just update the current index
        setCurrentIndex(currentIndex - 1);
      }
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

  // Web-specific or native rendering
  if (Platform.OS === 'web') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.webContainer}>
          {/* Current slide content - Force rendering without animation conditions */}
          <View style={styles.slide}>
            <View style={styles.slideContent}>
              <View style={styles.iconContainer}>
                {slides[currentIndex].iconType === 'font' ? (
                  <FontAwesome name={slides[currentIndex].icon} size={80} color="#4CAF50" />
                ) : slides[currentIndex].iconType === 'fa5' ? (
                  <FontAwesome5 name={slides[currentIndex].icon} size={80} color="#4CAF50" />
                ) : (
                  <MaterialCommunityIcons name={slides[currentIndex].icon} size={80} color="#4CAF50" />
                )}
              </View>
              <Text style={styles.title}>{slides[currentIndex].title}</Text>
              <Text style={styles.text}>{slides[currentIndex].text}</Text>
              
              {currentIndex === slides.length - 1 && (
                <View style={styles.buttonContainer}>
                  <TouchableOpacity 
                    style={[styles.button, styles.joinButton]} 
                    onPress={handleJoinGroup}
                  >
                    <Text style={styles.buttonText}>Join a team</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.button, styles.createButton]} 
                    onPress={handleCreateGroup}
                  >
                    <Text style={styles.buttonText}>Create a team</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.button, styles.skipButton]} 
                    onPress={handleSkipForNow}
                  >
                    <Text style={styles.skipButtonText}>Not for now</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
          
          {renderPagination()}
          
          {/* Always display the navigation buttons container, with improved visibility */}
          <View style={[styles.navigationButtons, { zIndex: 100 }]}>
            {currentIndex > 0 ? (
              <TouchableOpacity 
                style={[styles.navButton, { backgroundColor: '#e0f2e0' }]} 
                onPress={handlePrev}
              >
                <Ionicons name="chevron-back" size={24} color="#4CAF50" />
              </TouchableOpacity>
            ) : (
              // Empty view to maintain layout
              <View style={{ width: 50 }} />
            )}
            
            {currentIndex < slides.length - 1 && (
              <TouchableOpacity 
                style={[styles.navButton, { backgroundColor: '#e0f2e0' }]} 
                onPress={handleNext}
              >
                <Ionicons name="chevron-forward" size={24} color="#4CAF50" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Mobile rendering
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
        getItemLayout={(data, index) => (
          {length: width, offset: width * index, index}
        )}
        onScrollToIndexFailed={info => {
          const wait = new Promise(resolve => setTimeout(resolve, 500));
          wait.then(() => {
            if (flatListRef.current) {
              flatListRef.current.scrollToIndex({ 
                index: info.index, 
                animated: true 
              });
            }
          });
        }}
      />
      
      {renderPagination()}
      
      {/* Always display the navigation buttons container, with improved visibility */}
      <View style={[styles.navigationButtons, { zIndex: 100 }]}>
        {currentIndex > 0 ? (
          <TouchableOpacity 
            style={[styles.navButton, { backgroundColor: '#e0f2e0' }]} 
            onPress={handlePrev}
          >
            <Ionicons name="chevron-back" size={24} color="#4CAF50" />
          </TouchableOpacity>
        ) : (
          // Empty view to maintain layout
          <View style={{ width: 50 }} />
        )}
        
        {currentIndex < slides.length - 1 && (
          <TouchableOpacity 
            style={[styles.navButton, { backgroundColor: '#e0f2e0' }]} 
            onPress={handleNext}
          >
            <Ionicons name="chevron-forward" size={24} color="#4CAF50" />
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  webContainer: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slide: {
    width,
    height,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  slideContent: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
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
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  buttonContainer: {
    width: '100%',
    marginTop: 40,
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