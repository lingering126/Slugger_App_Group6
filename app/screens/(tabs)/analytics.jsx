import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions, ScrollView, SafeAreaView, ImageBackground, ActivityIndicator } from "react-native";
import { useState, useEffect, useRef } from "react";
import { LineChart } from "react-native-chart-kit";
import StatBox from "../components/StatBox";
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import teamService from "../../services/teamService";
import { Dropdown } from 'react-native-element-dropdown';
import axios from 'axios';
import { API_URL } from '../../config';

// Helper to get auth token for axios
const getAuthAxios = async () => {
  const token = await AsyncStorage.getItem('userToken');
  const instance = axios.create({
    baseURL: API_URL,
    headers: {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : ''
    }
  });
  return instance;
};

export default function AnalyticsScreen() {
  const [timeRange, setTimeRange] = useState("24H");
  const [tooltipData, setTooltipData] = useState(null);
  const dotRefs = useRef([]); // To store the position of all data points
  const chartRef = useRef(null); // To get the chart container position information

  // new states
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [overview, setOverview] = useState(null);
  const [chartState, setChartState] = useState({ labels: [], fullLabels: [], data: [] });
  const [isPersonal, setIsPersonal] = useState(false); // toggle
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [memberProgress, setMemberProgress] = useState([]);
  const [personalOverview, setPersonalOverview] = useState(null);
  const [showAllMembers, setShowAllMembers] = useState(false); // To control whether to show all members

  // Load user & teams on mount
  useEffect(() => {
    const init = async () => {
      try {
        const userJson = await AsyncStorage.getItem('user');
        if (userJson) {
          const userObj = JSON.parse(userJson);
          setUserId(userObj.id || userObj._id);
        }

        const userTeams = await teamService.getUserTeams();
        setTeams(userTeams);
        if (userTeams && userTeams.length) {
          // default last team
          const lastTeam = userTeams[userTeams.length - 1];
          setSelectedTeam(lastTeam);
        }
      } catch (err) {
        console.error('Error initializing analytics screen', err);
      }
    };
    init();
  }, []);

  // Fetch analytics whenever team, range, or personal toggle changes
  useEffect(() => {
    if (!selectedTeam) return;
    const fetchData = async () => {
      try {
        setLoading(true);
        const api = await getAuthAxios();
        
        // Overview - According to the selected mode, get different data
        const overviewRes = await api.get(`/analytics/overview/${selectedTeam._id}`);
        // Validate overview data
        const validatedOverview = overviewRes.data ? {
          totalScore: isFinite(overviewRes.data.totalScore) ? overviewRes.data.totalScore : 0,
          groupTarget: isFinite(overviewRes.data.groupTarget) ? overviewRes.data.groupTarget : 100,
          percentageOfTarget: isFinite(overviewRes.data.percentageOfTarget) ? overviewRes.data.percentageOfTarget : 0,
          percentageOfTimeGone: isFinite(overviewRes.data.percentageOfTimeGone) ? overviewRes.data.percentageOfTimeGone : 0
        } : null;
        setOverview(validatedOverview);
        
        // If it's personal mode, also get personal overview data
        if (isPersonal && userId) {
          try {
            const personalOverviewRes = await api.get(`/analytics/user-overview/${selectedTeam._id}/${userId}`);
            // Validate personal overview data
            const validatedPersonalOverview = personalOverviewRes.data ? {
              totalScore: isFinite(personalOverviewRes.data.totalScore) ? personalOverviewRes.data.totalScore : 0,
              individualTarget: isFinite(personalOverviewRes.data.individualTarget) ? personalOverviewRes.data.individualTarget : 100,
              percentageOfTarget: isFinite(personalOverviewRes.data.percentageOfTarget) ? personalOverviewRes.data.percentageOfTarget : 0,
              percentageOfTimeGone: isFinite(personalOverviewRes.data.percentageOfTimeGone) ? personalOverviewRes.data.percentageOfTimeGone : 0
            } : null;
            setPersonalOverview(validatedPersonalOverview);
          } catch (err) {
            console.error('Error fetching personal overview:', err.message);
            setPersonalOverview(null);
          }
        }

        // Timeline
        let timelineUrl = isPersonal
          ? `/analytics/user-timeline/${selectedTeam._id}/${userId}?range=${timeRange}`
          : `/analytics/timeline/${selectedTeam._id}?range=${timeRange}`;
        try {
          const timelineRes = await api.get(timelineUrl);
          const timelineData = timelineRes.data.data;
          
          // console.log(`${timeRange} Pattern Data:`, JSON.stringify(timelineData.data).substring(0, 100) + '...');
          
          // Validate and sanitize timeline data
          const labels = Array.isArray(timelineData.labels) ? timelineData.labels : [];
          const fullLabels = Array.isArray(timelineData.fullLabels) ? timelineData.fullLabels : [];
          let data = [];
          
          // Validate data based on type
          if (Array.isArray(timelineData.data)) {
            if (timeRange === '1Y') {
              // For object data with value property
              data = timelineData.data.map(item => {
                if (typeof item === 'object') {
                  return {
                    ...item,
                    // Ensure value is valid
                    value: isFinite(item.value) ? item.value : 0,
                    // Ensure cycle counts are valid
                    cycleCount: isFinite(item.cycleCount) ? item.cycleCount : 0,
                    fullyCompletedCycleCount: isFinite(item.fullyCompletedCycleCount) ? item.fullyCompletedCycleCount : 0
                  };
                }
                return { value: 0, cycleCount: 0, fullyCompletedCycleCount: 0 };
              });
            } else {
              // For simple number array
              data = timelineData.data.map(val => isFinite(val) ? val : 0);
            }
          }
          
          // Set validated chart state
          setChartState({
            labels,
            fullLabels,
            data
          });
        } catch (err) {
          console.error('Error fetching timeline data:', err.message);
          // Set empty chart state on error
          setChartState({ labels: [], fullLabels: [], data: [] });
        }
        
        // Get member progress
        try {
          const memberProgressRes = await api.get(`/analytics/member-progress/${selectedTeam._id}`);
          const memberProgressData = Array.isArray(memberProgressRes.data) ? memberProgressRes.data : [];
          
          // Sanitize member data by ensuring scores are valid numbers
          const sanitizedMemberProgress = memberProgressData.map(member => ({
            ...member,
            score: isFinite(member.score) ? member.score : 0
          }));
          
          // Sort member progress by score (descending)
          const sortedMemberProgress = [...sanitizedMemberProgress].sort((a, b) => b.score - a.score);
          
          // Add ranking identifier to members (handle same score situation)
          let currentRank = 1;
          let prevScore = -1;
          const rankedMembers = sortedMemberProgress.map((member, index) => {
            // If the score is different from the previous one, update the current rank to the actual index+1
            if (member.score !== prevScore) {
              currentRank = index + 1;
            }
            prevScore = member.score;
            
            // Only users with a score greater than 0 have a rank
            const rank = member.score > 0 ? currentRank : 0;
            
            return {
              ...member,
              rank
            };
          });
          
          setMemberProgress(rankedMembers);
        } catch (err) {
          console.error('Error fetching member progress:', err.message);
          setMemberProgress([]);
        }
      } catch (err) {
        console.error('Error fetching analytics', err);
        // Set safe default values on error
        setOverview(null);
        setPersonalOverview(null);
        setChartState({ labels: [], fullLabels: [], data: [] });
        setMemberProgress([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedTeam, timeRange, isPersonal]);

  // Chart config generation based on chartState
  const generateChartData = () => {
    // Process label display dynamically based on screen width
    const MIN_LABEL_SPACING = 30; // Minimum space between labels in pixels
    const screenWidth = Dimensions.get("window").width - 72; // Chart width
    let displayLabels = chartState.labels;
    
    // Only apply spacing logic if we have labels
    if (chartState.labels.length > 0) {
      // Calculate maximum number of labels that can fit on screen
      const maxLabelsToShow = Math.floor(screenWidth / MIN_LABEL_SPACING);
      // Only apply spacing if we have more labels than can fit
      if (chartState.labels.length > maxLabelsToShow) {
        // Calculate step size (show every 'step' labels)
        const step = Math.ceil(chartState.labels.length / maxLabelsToShow);
        // Apply step to create displayLabels
        displayLabels = chartState.labels.map((label, index) => {
          return index % step === 0 ? label : '';
        });
      }
    }
    
    // Extract chart data
    let dataValues = [];
    
    try {
      if (Array.isArray(chartState.data)) {
        if (timeRange === '1Y') {
        // 1Y mode, data is an array of objects, each object has a value property
          dataValues = chartState.data.map(item => {
            if (typeof item === 'object' && item !== null) {
              // Use default value 0 to avoid invalid values
              const rawValue = item.value !== undefined ? item.value : 0;
              const value = Math.round(rawValue);
              return isFinite(value) ? value : 0;
            }
            return 0;
          });
        } else {
        // Other modes, data is an array of numbers
          dataValues = chartState.data.map(val => {
            const rawValue = val !== undefined ? val : 0;
            const value = Math.round(rawValue);
            return isFinite(value) ? value : 0;
          });
        }
      }
    } catch (error) {
      console.error('Error processing chart data:', error);
      // When an error occurs, use an empty array
      dataValues = [];
    }
    
    // Ensure there must be data
    if (dataValues.length === 0) {
      dataValues = [0]; // At least one point
    }
    
    // Reset dotRefs array, ensure length consistent with data points
    dotRefs.current = Array(dataValues.length).fill(null);
    
    return {
      labels: displayLabels,
      datasets: [
        {
          data: dataValues,
          color: (opacity = 1) => `rgba(58, 136, 145, ${opacity})`,
          strokeWidth: 2,
        },
      ],
      fullLabels: chartState.fullLabels,
      rawData: chartState.data, // Pass the original data to the chart
    };
  };

  const chartData = generateChartData();

  // Function to get the actual screen coordinates of the data point
  const measureDot = (index, layout) => {
    if (index !== undefined && index >= 0) {
      dotRefs.current[index] = layout;
    }
  };

  const handleDataPointClick = (data) => {
    const index = data.index;
    if (!chartData.fullLabels[index]) return;
    
    // Ensure value is a valid number
    let value = isFinite(data.value) ? data.value : 0;
    let label = chartData.fullLabels[index];
    let additionalInfo = null;
    
    // Get completion data for 1Y mode
    if (timeRange === '1Y' && Array.isArray(chartData.rawData) && chartData.rawData[index]) {
      const rawPoint = chartData.rawData[index]; // Get directly from original data
      if (rawPoint.cycleCount !== undefined && rawPoint.fullyCompletedCycleCount !== undefined) {
        additionalInfo = {
          cycleCount: rawPoint.cycleCount,
          fullyCompletedCycleCount: rawPoint.fullyCompletedCycleCount
        };
      }
    }
    
    // Use the actual position stored in dotRefs, if any
    const dotPosition = dotRefs.current[index];
    let tooltipPosition = { x: data.x, y: data.y }; // Default to using the coordinates provided by onDataPointClick
    
    if (dotPosition) {
      tooltipPosition = {
        x: dotPosition.x,
        y: dotPosition.y
      };
    }
    
    setTooltipData({ 
      value, 
      label, 
      x: tooltipPosition.x, 
      y: tooltipPosition.y, 
      index,
      additionalInfo,
      timestamp: Date.now() // Add timestamp to force component update
    });
  };

  // Add a function to handle closing the tooltip when clicking on the chart background
  const handleBackgroundPress = () => {
    if (tooltipData) {
      setTooltipData(null);
    }
  };

  // Custom decorator function, used to draw data points and record their position
  const customDecorator = (props) => {
    const { x, y, index, indexData } = props;
    
    // If the data point is invalid, do not render anything
    if (!isFinite(indexData) || indexData === null) {
      return null;
    }
    
    return (
      <View
        key={index}
        onLayout={(event) => {
          const layout = event.nativeEvent.layout;
          const dotCenter = {
            x: layout.x + layout.width / 2,
            y: layout.y + layout.height / 2
          };
          measureDot(index, dotCenter);
        }}
        style={{
          position: 'absolute',
          left: x - 4, // The radius of the dot is 4
          top: y - 4,
          width: 8, // The diameter is 8
          height: 8,
          borderRadius: 4,
          backgroundColor: '#3A8891',
          borderWidth: 2,
          borderColor: '#3A8891'
        }}
      />
    );
  };

  const rangeOptions = ["24H", "1W", "1M", "1Y"];

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
          <ScrollView style={styles.scrollView}>
            {/* Header */}
            <View style={styles.header}>
              <Ionicons name="analytics" size={43} color="#3A8891" />
            </View>

            {/* Team Selector */}
            <View style={styles.teamSelectorContainer}>
              <Text style={styles.teamSelectorLabel}>Current Team</Text>
              <View style={styles.teamSelectorCardContainer}>
                <Dropdown
                  style={styles.teamSelectorDropdown}
                  placeholderStyle={styles.teamSelectorPlaceholder}
                  selectedTextStyle={styles.teamSelectorSelectedText}
                  containerStyle={styles.teamSelectorContainerStyle}
                  itemContainerStyle={styles.teamSelectorItemContainer}
                  itemTextStyle={styles.teamSelectorItemText}
                  activeColor="rgba(58, 136, 145, 0.1)"
                  showsVerticalScrollIndicator={false}
                  data={teams.map(t => ({ label: t.name, value: t._id }))}
                  labelField="label"
                  valueField="value"
                  placeholder={teams.length ? 'Select Team' : 'No Team'}
                  value={selectedTeam?._id}
                  onChange={item => {
                    const teamObj = teams.find(t => t._id === item.value);
                    setSelectedTeam(teamObj);
                  }}
                  renderLeftIcon={() => (
                    <Ionicons name="people" style={styles.teamSelectorIcon} size={20} color="#3A8891" />
                  )}
                />
              </View>
            </View>

            {/* Stat Box */}
            {isPersonal ? (
              // Personal mode - Display personal overview
              personalOverview ? (
                <StatBox
                  total={personalOverview.totalScore}
                  groupTarget={personalOverview.individualTarget}
                  percentOfTarget={personalOverview.percentageOfTarget}
                  percentOfTimeGone={personalOverview.percentageOfTimeGone}
                  isPersonal={true}
                />
              ) : (
                <StatBox />
              )
            ) : (
              // Team mode - Display team overview
              overview ? (
                <StatBox
                  total={overview.totalScore}
                  groupTarget={overview.groupTarget}
                  percentOfTarget={overview.percentageOfTarget}
                  percentOfTimeGone={overview.percentageOfTimeGone}
                  isPersonal={false}
                />
              ) : (
                <StatBox />
              )
            )}

              {/* Avatars Section */}
              <View style={styles.avatarSection}>
              {/* Top Border */}
              <View style={styles.topBorder}>
                <LinearGradient
                  colors={['rgba(106, 90, 205, 0)', 'rgba(106, 90, 205, 0.7)', 'rgba(106, 90, 205, 0.7)', 'rgba(106, 90, 205, 0)']}
                  locations={[0, 0.05, 0.95, 1]}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 0}}
                  style={styles.borderGradient}
                />
              </View>
              
              {/* Bottom Border */}
              <View style={styles.bottomBorder}>
                <LinearGradient
                  colors={['rgba(106, 90, 205, 0)', 'rgba(106, 90, 205, 0.7)', 'rgba(106, 90, 205, 0.7)', 'rgba(106, 90, 205, 0)']}
                  locations={[0, 0.05, 0.95, 1]}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 0}}
                  style={styles.borderGradient}
                />
              </View>
              
              {/* Left Border */}
              <View style={styles.leftBorder}>
                <LinearGradient
                  colors={['rgba(106, 90, 205, 0)', 'rgba(106, 90, 205, 0.7)', 'rgba(106, 90, 205, 0.7)', 'rgba(106, 90, 205, 0)']}
                  locations={[0, 0.05, 0.95, 1]}
                  start={{x: 0, y: 0}}
                  end={{x: 0, y: 1}}
                  style={styles.borderGradient}
                />
              </View>
              
              {/* Right Border */}
              <View style={styles.rightBorder}>
                <LinearGradient
                  colors={['rgba(106, 90, 205, 0)', 'rgba(106, 90, 205, 0.7)', 'rgba(106, 90, 205, 0.7)', 'rgba(106, 90, 205, 0)']}
                  locations={[0, 0.05, 0.95, 1]}
                  start={{x: 0, y: 0}}
                  end={{x: 0, y: 1}}
                  style={styles.borderGradient}
                />
              </View>
              
              {loading && memberProgress.length === 0 ? (
                <ActivityIndicator color="#3A8891" size="large" style={{ padding: 20 }} />
              ) : (
                <View style={styles.avatarRowsContainer}>
                  <View style={[styles.avatarRow, { flexWrap: 'wrap', justifyContent: 'center' }]}>
                    {/* Only show the top 10 or all, depending on the value of showAllMembers */}
                    {memberProgress
                      .slice(0, showAllMembers ? memberProgress.length : 10)
                      .map((member, index) => (
                        <View key={member.userId || index} style={styles.avatarContainer}>
                          <View style={styles.avatarWrapper}>
                            {member.avatarUrl ? (
                              <Image 
                                source={{ uri: member.avatarUrl }} 
                                style={[
                                  styles.avatar,
                                  member.rank > 0 && member.rank <= 3 && styles.topRankAvatar,
                                  member.rank === 1 && styles.firstRankAvatar,
                                  member.rank === 2 && styles.secondRankAvatar,
                                  member.rank === 3 && styles.thirdRankAvatar
                                ]}
                                onError={() => console.log('Avatar image error for', member.displayName)}
                              />
                            ) : (
                              <View style={[
                                styles.avatar,
                                styles.avatarPlaceholder,
                                member.rank > 0 && member.rank <= 3 && styles.topRankAvatar,
                                member.rank === 1 && styles.firstRankAvatar,
                                member.rank === 2 && styles.secondRankAvatar,
                                member.rank === 3 && styles.thirdRankAvatar
                              ]}>
                                <Text style={styles.avatarText}>
                                  {member.displayName ? member.displayName.substring(0, 2).toUpperCase() : "??"}
                                </Text>
                              </View>
                            )}
                            
                            {/* Medal icon */}
                            {member.rank === 1 && member.score > 0 && (
                              <View style={styles.medalBadge}>
                                <Ionicons name="trophy" size={16} color="#FFD700" />
                              </View>
                            )}
                            {member.rank === 2 && member.score > 0 && (
                              <View style={styles.medalBadge}>
                                <Ionicons name="trophy" size={16} color="#C0C0C0" />
                              </View>
                            )}
                            {member.rank === 3 && member.score > 0 && (
                              <View style={styles.medalBadge}>
                                <Ionicons name="trophy" size={16} color="#CD7F32" />
                              </View>
                            )}
                          </View>
                          <Text style={styles.avatarName}>{member.displayName || 'Member'}</Text>
                          <Text style={[
                            styles.avatarScore,
                            member.rank === 1 && styles.firstRankScore,
                            member.rank === 2 && styles.secondRankScore,
                            member.rank === 3 && styles.thirdRankScore
                          ]}>{member.score || 0}</Text>
                        </View>
                      ))}
                    {memberProgress.length === 0 && (
                      <Text style={{ padding: 10, color: '#666' }}>No members data</Text>
                    )}
                  </View>
                  
                  {/* Show the expand/collapse button, only when the number of members > 10 */}
                  {memberProgress.length > 10 && (
                    <TouchableOpacity 
                      style={styles.expandButton}
                      onPress={() => setShowAllMembers(!showAllMembers)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.expandButtonContent}>
                        <Text style={styles.expandButtonText}>
                          {showAllMembers ? "Collapse" : `Show all (${memberProgress.length})`}
                        </Text>
                        <Ionicons 
                          name={showAllMembers ? "chevron-up" : "chevron-down"} 
                          size={16} 
                          color="#345C6F" 
                          style={{ marginLeft: 4 }}
                        />
                      </View>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>

            {/* Toggle Team / Personal */}
            <View style={styles.toggleContainer}>
              <Text style={styles.toggleLabel}>Chart Type:</Text>
              <View style={styles.toggleSwitchContainer}>
                <Text style={[styles.toggleOptionText, !isPersonal && styles.toggleActiveText]}>Team</Text>
                <TouchableOpacity 
                  style={styles.toggleSwitch}
                  onPress={() => setIsPersonal(!isPersonal)}
                  activeOpacity={0.8}
                >
                  <View style={[
                    styles.toggleTrack,
                  ]}>
                    <View style={[
                      styles.toggleThumb,
                      isPersonal && styles.toggleThumbActive
                    ]} />
                  </View>
                </TouchableOpacity>
                <Text style={[styles.toggleOptionText, isPersonal && styles.toggleActiveText]}>Personal</Text>
              </View>
            </View>

            {/* Graph Section */}
            <View style={styles.graphSection}>
              {loading ? (
                <ActivityIndicator size="large" color="#3A8891" />
              ) : (
                <View 
                  style={styles.chartContainer}
                  ref={chartRef}
                  onLayout={(event) => {
                    // Record the position information of the chart container, to improve positioning accuracy
                    chartRef.current = event.nativeEvent.layout;
                  }}
                >
                  <TouchableOpacity 
                    activeOpacity={1}
                    onPress={handleBackgroundPress}
                    delayPressIn={150}
                  >
                    <LineChart
                      data={chartData}
                      width={Dimensions.get("window").width - 72}
                      height={220}
                      yAxisLabel=""
                      yAxisSuffix="%"
                      withInnerLines={false}
                      withOuterLines={true}
                      withVerticalLines={false}
                      withHorizontalLines={true}
                      bezier={false}
                      onDataPointClick={(data) => {
                        // Validate the validity of the data point
                        if (!isFinite(data.value) || !isFinite(data.x) || !isFinite(data.y)) {
                          console.log("Invalid data point clicked, ignoring");
                          return;
                        }
                        
                        // Prevent background click event - since it's not possible to directly prevent bubbling, use the immediate display of a new tooltip
                        // Regardless of whether the tooltip currently exists, force an update to the new data point tooltip
                        handleDataPointClick(data);
                        
                        // Return true to indicate that the click event has been processed
                        return true;
                      }}
                      getDotColor={(dataPoint, index) => {
                        // Return transparent if data point is not valid
                        if (!isFinite(dataPoint) || dataPoint === null) return 'transparent';
                        return '#3A8891';
                      }}
                      getDotProps={(dataPoint, index) => {
                        // Do not render invalid data points
                        if (!isFinite(dataPoint) || dataPoint === null) {
                          return {
                            r: "0", // The radius is 0, indicating that it is not visible
                            strokeWidth: "0",
                            stroke: "transparent",
                            fill: "transparent"
                          };
                        }
                        return {
                          r: "4",
                          strokeWidth: "2",
                          stroke: "#3A8891",
                          fill: "#3A8891",
                          // SVG elements cannot directly use onLayout or ref, so we rely on decorator
                          'data-index': index, // Add a custom property to identify in decorator
                        };
                      }}
                      chartConfig={{
                        backgroundColor: "#FFF",
                        backgroundGradientFrom: "#FFF",
                        backgroundGradientTo: "#FFF",
                        decimalPlaces: 0,
                        color: (opacity = 1) => `rgba(106, 90, 205, ${opacity})`,
                        labelColor: (opacity = 1) => `rgba(153, 153, 153, ${opacity})`,
                        style: { borderRadius: 15 },
                        propsForDots: { 
                          r: "4", 
                          strokeWidth: "2", 
                          stroke: "#3A8891" 
                        },
                        propsForBackgroundLines: { 
                          strokeDasharray: "4, 4", 
                          strokeWidth: 1, 
                          stroke: "#E0E4E8" 
                        },
                        fillShadowGradient: "#6A5ACD",
                        fillShadowGradientOpacity: 0.15,
                        tooltipDecorator: () => null,
                        // Filter out invalid data points when drawing the line
                        formatYLabel: (value) => {
                          return isFinite(parseFloat(value)) ? value : '0';
                        },
                        // Add custom line function to handle NaN and Infinity values
                        useBezierCurve: false,
                        // Override line drawing to prevent invalid points from being included
                        renderLine: (datapoints, { x, y, width, height, paddingRight, paddingTop, lastData }) => {
                          // Filter out invalid data points
                          const validPoints = datapoints
                            .map((value, index) => {
                              // Ensure value is valid and a number
                              if (!isFinite(value)) return null;
                              // Calculate SVG coordinates
                              const xVal = paddingRight + (index * (width - paddingRight)) / datapoints.length;
                              const yVal = height * (1 - (value / 100)) + paddingTop;
                              // Ensure coordinates are valid numbers
                              if (!isFinite(xVal) || !isFinite(yVal)) return null;
                              return { x: xVal, y: yVal };
                            })
                            .filter(point => point !== null);
                        
                          // If there are no valid points, return nothing
                          if (validPoints.length === 0) return '';
                          
                          // If there's only one valid point, draw a dot instead of a line
                          if (validPoints.length === 1) {
                            const point = validPoints[0];
                            return `M ${point.x} ${point.y} a 0.5 0.5 0 1 1 1 0`;
                          }
                        
                          // Create SVG path with valid points only
                          let path = `M ${validPoints[0].x.toFixed(1)} ${validPoints[0].y.toFixed(1)}`;
                          for (let i = 1; i < validPoints.length; i++) {
                            path += ` L ${validPoints[i].x.toFixed(1)} ${validPoints[i].y.toFixed(1)}`;
                          }
                          
                          return path;
                        }
                      }}
                      style={{ marginVertical: 8, borderRadius: 15 }}
                      decorator={customDecorator}
                    />
                  </TouchableOpacity>

                  {/* Tooltip Handling */}
                  {tooltipData && (
                    <View 
                      style={styles.tooltipContainer}
                      pointerEvents="box-none"
                    >
                      {/* Use a more compatible way to implement vertical dashed lines */}
                      <View 
                        style={{
                          position: 'absolute',
                          left: isFinite(tooltipData.x) ? tooltipData.x - 1 : 0,
                          top: isFinite(tooltipData.y) ? tooltipData.y + 14 : 0,
                          height: isFinite(tooltipData.y) ? Math.max(0, 180 - tooltipData.y) : 0,
                          overflow: 'hidden',
                          pointerEvents: 'none'
                        }}
                      >
                        {/* Use multiple short Views to simulate the dashed line effect */}
                        {(() => {
                          const segmentHeight = 4;
                          const segmentSpacing = 3;
                          const segmentTotal = segmentHeight + segmentSpacing;
                          const availableHeight = Math.max(0, isFinite(tooltipData.y) ? 180 - tooltipData.y : 0);
                          const dashCount = Math.floor((availableHeight + segmentSpacing) / segmentTotal);
                          
                          return Array.from({ length: dashCount }).map((_, index) => (
                            <View
                              key={`dash-${index}`}
                              style={{
                                width: 2,
                                height: segmentHeight,
                                backgroundColor: '#345C6F',
                                marginBottom: index === dashCount - 1 ? 0 : segmentSpacing
                              }}
                            />
                          ));
                        })()}
                      </View>
                      
                      {/* Dynamically adjust the tooltip direction based on the vertical position of the data point */}
                      {(() => {
                        // Define constants
                        const CHART_HEIGHT = 180;
                        const TOOLTIP_WIDTH = 90;
                        const TOOLTIP_OFFSET = 10;
                        
                        // Determine if the data point is in the upper half of the chart
                        const isInUpperHalf = tooltipData.y < CHART_HEIGHT / 2;
                        
                        // Calculate the tooltip height (base height + extra content height)
                        const baseTooltipHeight = 70;
                        const extraHeight = timeRange === '1Y' && tooltipData.additionalInfo ? 40 : 0;
                        const tooltipHeight = baseTooltipHeight + extraHeight;
                        
                        return (
                          <TouchableOpacity
                            activeOpacity={1}
                            onPress={(event) => {
                              // Prevent event bubbling
                              event.stopPropagation();
                            }}
                            style={[
                              styles.tooltip,
                              {
                                left: tooltipData.x - TOOLTIP_WIDTH / 2,
                                top: isInUpperHalf
                                  ? tooltipData.y + TOOLTIP_OFFSET + 12 // Upper half → tooltip displayed below
                                  : tooltipData.y - tooltipHeight - TOOLTIP_OFFSET + 21 // Lower half → tooltip displayed above
                              }
                            ]}
                          >
                            <View style={styles.tooltipContent}>
                              <Text style={styles.tooltipLabel}>{tooltipData.label || ''}</Text>
                              <Text style={styles.tooltipValue}>{isFinite(tooltipData.value) ? tooltipData.value : 0}%</Text>
                              {timeRange === '1Y' && tooltipData.additionalInfo && (
                                <>
                                  <Text style={styles.tooltipCompletion}>Completed:</Text>
                                  <Text style={styles.tooltipCompletion}>
                                    {tooltipData.additionalInfo.fullyCompletedCycleCount}/{tooltipData.additionalInfo.cycleCount}
                                  </Text>
                                </>
                              )}
                            </View>
                            {/* Dynamically switch the arrow direction based on position */}
                            <View style={isInUpperHalf ? styles.arrowUp : styles.arrowDown} />
                          </TouchableOpacity>
                        );
                      })()}
                    </View>
                  )}
                </View>
              )}

              {/* Time Range Buttons */}
              <View style={styles.timeRangeContainer}>
                {rangeOptions.map(range => (
                  <TouchableOpacity
                    key={range}
                    style={[styles.timeRangeButton, timeRange === range && styles.timeRangeButtonActive]}
                    onPress={() => setTimeRange(range)}
                  >
                    <Text style={[styles.timeRangeText, timeRange === range && styles.timeRangeTextActive]}>{range}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
        </LinearGradient>
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  /* ==================== 
   * Main container and background styles
   * ==================== */
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
  },
  gradient: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  
  /* ==================== 
   * Page title area
   * ==================== */
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 30,
    paddingBottom: 45,
  },
  
  /* ==================== 
   * Member ranking area
   * ==================== */
  avatarSection: {
    backgroundColor: "#FFF",
    borderRadius: 15,
    padding: 20,
    paddingTop: 25,
    paddingBottom: 25,
    borderWidth: 0,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 5,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  topBorder: {
    position: 'absolute',
    top: 0,
    left: 18,
    right: 18,
    height: 3,
    zIndex: 10,
  },
  bottomBorder: {
    position: 'absolute',
    bottom: 0,
    left: 18,
    right: 18,
    height: 3,
    zIndex: 10,
  },
  leftBorder: {
    position: 'absolute',
    left: 0,
    top: 18,
    bottom: 18,
    width: 3,
    zIndex: 10,
  },
  rightBorder: {
    position: 'absolute',
    right: 0,
    top: 18,
    bottom: 18,
    width: 3,
    zIndex: 10,
  },
  borderGradient: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  avatarRowsContainer: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 10,
  },
  avatarRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginVertical: 5,
    flexWrap: "wrap",
    width: '100%',
  },
  avatarContainer: {
    alignItems: "center",
    marginHorizontal: 10,
    marginVertical: 5,
    width: 60,
  },
  
  /* ==================== 
   * User avatar and medal styles
   * ==================== */
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginBottom: 8,
    borderWidth: 0,
    backgroundColor: '#F5F5FF',
  },
  avatarName: {
    fontSize: 12,
    color: "#333",
    marginBottom: 2,
  },
  avatarScore: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6A5ACD",
  },
  avatarPlaceholder: {
    backgroundColor: '#0E5E6F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  avatarWrapper: {
    position: 'relative',
  },
  
  /* ==================== 
   * Ranking medal and special styles
   * ==================== */
  medalBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: 'white',
    borderRadius: 12,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F4F8',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
  },
  topRankAvatar: {
    borderWidth: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  firstRankAvatar: {
    borderColor: '#FFD700',
  },
  secondRankAvatar: {
    borderColor: '#C0C0C0',
  },
  thirdRankAvatar: {
    borderColor: '#CD7F32',
  },
  firstRankScore: {
    color: '#FFC107',
    fontWeight: '700',
    fontSize: 18,
  },
  secondRankScore: {
    color: '#6A5ACD',
    fontWeight: '700',
  },
  thirdRankScore: {
    color: '#6A5ACD',
    fontWeight: '600',
  },
  
  /* ==================== 
   * Team selector styles
   * ==================== */
  teamSelectorContainer: {
    marginVertical: 15,
    paddingHorizontal: 20,
  },
  teamSelectorLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0E5E6F',
    marginBottom: 8,
    paddingLeft: 4,
  },
  teamSelectorCardContainer: {
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  teamSelectorDropdown: {
    padding: 12,
    borderRadius: 12,
  },
  teamSelectorPlaceholder: {
    color: '#94A3B8',
    fontSize: 16,
  },
  teamSelectorSelectedText: {
    color: '#0E5E6F',
    fontSize: 16,
    fontWeight: '500',
  },
  teamSelectorIcon: {
    marginRight: 10,
  },
  teamSelectorContainerStyle: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 0,
    paddingVertical: 6,
    marginTop: 5,
  },
  teamSelectorItemContainer: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F4F8',
  },
  teamSelectorItemText: {
    fontSize: 16,
    color: '#2C3E50',
    fontWeight: '500',
  },
  
  /* ==================== 
   * Chart area styles
   * ==================== */
  graphSection: {
    backgroundColor: "#FFF",
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 5,
    alignItems: 'center',
  },
  chartContainer: {
    alignItems: 'center',
    width: '100%',
  },
  
  /* ==================== 
   * Time range selector styles
   * ==================== */
  timeRangeContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 15,
    paddingHorizontal: 10,
    gap: 12,
  },
  timeRangeButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    minWidth: 45,
    alignItems: 'center',
  },
  timeRangeButtonActive: {
    backgroundColor: "#345C6F",
  },
  timeRangeText: {
    fontSize: 13,
    color: "#666",
    fontWeight: "500",
  },
  timeRangeTextActive: {
    color: "#FFF",
    fontWeight: "600",
  },
  
  /* ==================== 
   * Tooltip styles
   * ==================== */
  tooltipContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 900,
    pointerEvents: 'none',
  },
  tooltip: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  tooltipContent: {
    backgroundColor: '#6A5ACD',
    borderRadius: 6,
    padding: 8,
    width: 90,
    alignItems: 'center',
  },
  tooltipLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    marginBottom: 2,
  },
  tooltipValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  tooltipCompletion: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    marginTop: 2,
  },
  arrowUp: {
    position: 'absolute',
    top: -8,
    left: '50%',
    marginLeft: -8,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#6A5ACD',
  },
  arrowDown: {
    position: 'absolute',
    bottom: -8,
    left: '50%',
    marginLeft: -8,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#6A5ACD',
  },
  
  /* ==================== 
   * Team/personal switch styles
   * ==================== */
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 14,
    paddingRight: 10,
  },
  toggleLabel: {
    fontSize: 14,
    color: '#64748B',
    marginRight: 8,
  },
  toggleSwitchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleOptionText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#94A3B8',
    paddingHorizontal: 4,
  },
  toggleActiveText: {
    color: '#345C6F',
    fontWeight: '600',
  },
  toggleSwitch: {
    marginHorizontal: 6,
  },
  toggleTrack: {
    width: 40,
    height: 24,
    borderRadius: 16,
    backgroundColor: '#0E5E6F',
    padding: 2,
    justifyContent: 'center',
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 12,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2,
    transform: [{ translateX: 0 }],
  },
  toggleThumbActive: {
    transform: [{ translateX: 16 }],
  },
  expandButton: {
    marginTop: 15,
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  expandButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#345C6F',
  },
});