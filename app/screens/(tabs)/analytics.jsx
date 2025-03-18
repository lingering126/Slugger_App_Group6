import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions, ScrollView, SafeAreaView, ImageBackground } from "react-native";
import { useState } from "react";
import { LineChart } from "react-native-chart-kit";
import StatBox from "../components/StatBox";
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const avatars = {
  john: "https://randomuser.me/api/portraits/men/1.jpg",
  jim: "https://randomuser.me/api/portraits/men/2.jpg",
  you: "https://randomuser.me/api/portraits/women/1.jpg",
  alice: "https://randomuser.me/api/portraits/women/2.jpg",
  cleo: "https://randomuser.me/api/portraits/women/3.jpg",
  sam: "https://randomuser.me/api/portraits/men/3.jpg",
  jade: "https://randomuser.me/api/portraits/women/4.jpg",
};

const mockData = {
  "6H": [75, 78, 80, 82, 85, 88], // 6 hours data
  "12H": [65, 75, 72, 86, 77, 82, 74, 75, 72, 80, 82, 78], // 12 hours data
  "24H": [0, 20, 40, 50, 88, 90, 87, 85, 92, 95, 93, 90, 88, 85, 87, 90, 92, 95, 93, 90, 88, 85, 87, 90], // 24 hours data
  "1W": [65, 68, 70, 72, 75, 78, 80], // 1 week data
  "1Y": [50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 92, 88], // 1 year data
};

export default function AnalyticsScreen() {
  const [timeRange, setTimeRange] = useState("12H");
  const [tooltipData, setTooltipData] = useState(null);

  const generateChartData = () => {
    let labels, data, fullLabels;
    switch (timeRange) {
      case "6H":
        labels = ["6h", "5h", "4h", "3h", "2h", "1h"];
        fullLabels = ["6 hours ago", "5 hours ago", "4 hours ago", "3 hours ago", "2 hours ago", "1 hour ago"];
        data = mockData["6H"];
        break;
      case "12H":
        labels = ["12h", "11h", "10h", "9h", "8h", "7h", "6h", "5h", "4h", "3h", "2h", "1h"];
        fullLabels = ["12 hours ago", "11 hours ago", "10 hours ago", "9 hours ago", "8 hours ago", "7 hours ago", "6 hours ago", "5 hours ago", "4 hours ago", "3 hours ago", "2 hours ago", "1 hour ago"];
        data = mockData["12H"];
        break;
      case "24H":
        labels = ["24", "22", "20", "18", "16", "14", "12", "10", "8", "6", "4", "2", ];
        fullLabels = ["24 hours ago", "23 hours ago", "22 hours ago", "21 hours ago", "20 hours ago", "19 hours ago", "18 hours ago", "17 hours ago", "16 hours ago", "15 hours ago", "14 hours ago", "13 hours ago", "12 hours ago", "11 hours ago", "10 hours ago", "9 hours ago", "8 hours ago", "7 hours ago", "6 hours ago", "5 hours ago", "4 hours ago", "3 hours ago", "2 hours ago", "1 hour ago", "Now"];
        data = mockData["24H"];
        break;
      case "1W":
        labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
        fullLabels = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
        data = mockData["1W"];
        break;
      case "1Y":
        labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        fullLabels = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        data = mockData["1Y"];
        break;
      default:
        labels = ["12h", "11h", "10h", "9h", "8h", "7h", "6h", "5h", "4h", "3h", "2h", "1h"];
        fullLabels = ["12 hours ago", "11 hours ago", "10 hours ago", "9 hours ago", "8 hours ago", "7 hours ago", "6 hours ago", "5 hours ago", "4 hours ago", "3 hours ago", "2 hours ago", "1 hour ago"];
        data = mockData["12H"];
    }

    return {
      labels,
      datasets: [
        {
          data,
          color: (opacity = 1) => `rgba(58, 136, 145, ${opacity})`,
          strokeWidth: 2,
        },
      ],
      fullLabels,
    };
  };

  const chartData = generateChartData();

  const handleDataPointClick = (data) => {
    const index = data.index;
    const value = data.value;
    const label = chartData.fullLabels[index];
    
    setTooltipData({
      value,
      label,
      x: data.x,
      y: data.y,
      index: data.index,
      dataPointX: data.x,
      dataPointY: data.y,
    });
    
    // Auto hide tooltip after 5 seconds
    setTimeout(() => {
      setTooltipData(null);
    }, 5000);
  };

  // 调整计算函数以更精确
  const getVerticalLineHeight = (yPosition) => {
    // Chart effective height is about 180px, with 20px space at the bottom for labels
    const chartHeight = 180;
    const topOffset = 8; // Some space above the data point
    
    // Calculate the distance from data point to chart bottom edge
    return chartHeight - (yPosition - topOffset);
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
          <ScrollView style={styles.scrollView}>
            {/* Header */}
            <View style={styles.header}>
              <Ionicons name="analytics" size={43} color="#3A8891" />
            </View>

            <StatBox />

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
              
              <View style={styles.avatarRowsContainer}>
                <View style={styles.avatarRow}>
                  <View style={styles.avatarContainer}>
                    <Image source={{ uri: avatars.john }} style={styles.avatar} />
                    <Text style={styles.avatarName}>John</Text>
                    <Text style={styles.avatarScore}>7</Text>
                  </View>
                  <View style={styles.avatarContainer}>
                    <Image source={{ uri: avatars.jim }} style={styles.avatar} />
                    <Text style={styles.avatarName}>Jim</Text>
                    <Text style={styles.avatarScore}>9</Text>
                  </View>
                  <View style={styles.avatarContainer}>
                    <Image source={{ uri: avatars.you }} style={styles.avatar} />
                    <Text style={styles.avatarName}>You</Text>
                    <Text style={styles.avatarScore}>5</Text>
                  </View>
                </View>
                <View style={styles.avatarRow}>
                  <View style={styles.avatarContainer}>
                    <Image source={{ uri: avatars.alice }} style={styles.avatar} />
                    <Text style={styles.avatarName}>Alice</Text>
                    <Text style={styles.avatarScore}>6</Text>
                  </View>
                  <View style={styles.avatarContainer}>
                    <Image source={{ uri: avatars.cleo }} style={styles.avatar} />
                    <Text style={styles.avatarName}>Cleo</Text>
                    <Text style={styles.avatarScore}>9</Text>
                  </View>
                  <View style={styles.avatarContainer}>
                    <Image source={{ uri: avatars.sam }} style={styles.avatar} />
                    <Text style={styles.avatarName}>Sam</Text>
                    <Text style={styles.avatarScore}>4</Text>
                  </View>
                  <View style={styles.avatarContainer}>
                    <Image source={{ uri: avatars.jade }} style={styles.avatar} />
                    <Text style={styles.avatarName}>Jade</Text>
                    <Text style={styles.avatarScore}>5</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Graph Section */}
            <View style={styles.graphSection}>
              <View style={styles.chartContainer}>
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
                  onDataPointClick={handleDataPointClick}
                  chartConfig={{
                    backgroundColor: "#FFF",
                    backgroundGradientFrom: "#FFF",
                    backgroundGradientTo: "#FFF",
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(106, 90, 205, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(153, 153, 153, ${opacity})`,
                    style: {
                      borderRadius: 15,
                    },
                    propsForDots: {
                      r: "4",
                      strokeWidth: "2",
                      stroke: "#3A8891",
                    },
                    propsForBackgroundLines: {
                      strokeDasharray: "4, 4",
                      strokeWidth: 1,
                      stroke: "#E0E4E8",
                    },
                    fillShadowGradient: "#6A5ACD",
                    fillShadowGradientOpacity: 0.15,
                    // Disable default tooltip
                    tooltipDecorator: () => null,
                  }}
                  style={{
                    marginVertical: 8,
                    borderRadius: 15,
                  }}
                  decorator={() => null}
                />
                
                {/* Add vertical dashed line */}
                {tooltipData && (
                  <View style={styles.tooltipContainer}>
                    {/* Vertical dashed line */}
                    <View 
                      style={[
                        styles.verticalDashedLine, 
                        {
                          left: tooltipData.x,
                          top: tooltipData.y + 4,
                          height: getVerticalLineHeight(tooltipData.y),
                        }
                      ]}
                    />
                    
                    {/* Tooltip */}
                    <View 
                      style={[
                        styles.tooltip, 
                        {
                          left: tooltipData.x - 50,
                          top: tooltipData.y - 60,
                        }
                      ]}
                    >
                      <View style={styles.tooltipContent}>
                        <Text style={styles.tooltipLabel}>{tooltipData.label}</Text>
                        <Text style={styles.tooltipValue}>{tooltipData.value}%</Text>
                      </View>
                      <View style={styles.tooltipArrow} />
                    </View>
                  </View>
                )}
              </View>

              {/* Time Range Buttons */}
              <View style={styles.timeRangeContainer}>
                {["6H", "12H", "24H", "1W", "1Y"].map((range) => (
                  <TouchableOpacity
                    key={range}
                    style={[
                      styles.timeRangeButton,
                      timeRange === range && styles.timeRangeButtonActive,
                    ]}
                    onPress={() => setTimeRange(range)}
                  >
                    <Text
                      style={[
                        styles.timeRangeText,
                        timeRange === range && styles.timeRangeTextActive,
                      ]}
                    >
                      {range}
                    </Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 30,
    paddingBottom: 45,
  },
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
  tooltipContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 900,
    pointerEvents: 'none',
  },
  verticalDashedLine: {
    position: 'absolute',
    width: 0,
    borderLeftWidth: 2,
    borderColor: '#345C6F',
    borderStyle: 'dashed',
    borderRadius: 0,
    zIndex: 995,
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
    minWidth: 80,
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
  tooltipArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#6A5ACD',
  },
});