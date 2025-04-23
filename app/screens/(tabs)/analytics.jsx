import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions, ScrollView, SafeAreaView, ImageBackground, ActivityIndicator, Platform } from "react-native";
import { useState, useEffect, useCallback } from "react";
import { LineChart } from "react-native-chart-kit";
import { Picker } from "@react-native-picker/picker";
import StatBox from "../components/StatBox";
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from "../../services/api";
// import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AnalyticsScreen() {
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [overviewData, setOverviewData] = useState(null);
  const [memberProgressData, setMemberProgressData] = useState({ membersProgress: [] });
  const [timelineData, setTimelineData] = useState({ labels: [], datasets: [{ data: [] }], fullLabels: [], rawData: [], groupTarget: 0 });
  const [timeRange, setTimeRange] = useState("1W");
  const [tooltipData, setTooltipData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPicker, setShowPicker] = useState(false);

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/groups');
      if (response.data && response.data.length > 0) {
        setGroups(response.data);
        setSelectedGroupId(response.data[0].groupId);
      } else {
        setGroups([]);
        setError('You are not part of any group.');
      }
    } catch (err) {
      console.error("Error fetching groups:", err);
      setError('Failed to fetch groups. Please try again.');
      setGroups([]);
    } finally {
    }
  }, []);

  const fetchAnalyticsData = useCallback(async (groupId, range, fetchAll = true) => {
    if (!groupId) return;
    setLoading(true);
    setError(null);
    let overviewSuccess = !fetchAll;
    let membersSuccess = !fetchAll;
    let timelineSuccess = false;

    try {
      const requests = [];
      if (fetchAll) {
          requests.push(api.get(`/analytics/overview/${groupId}`));
          requests.push(api.get(`/analytics/member-progress/${groupId}`));
      }
      requests.push(api.get(`/analytics/timeline/${groupId}?range=${range}`));

      const results = await Promise.allSettled(requests);
      
      let overviewRes, membersRes, timelineRes;
      if (fetchAll) {
          [overviewRes, membersRes, timelineRes] = results;
      } else {
          [timelineRes] = results;
      }

      if (fetchAll && overviewRes.status === 'fulfilled' && overviewRes.value.data.success) {
        setOverviewData(overviewRes.value.data.data);
        overviewSuccess = true;
      } else if (fetchAll) {
        console.error("Error fetching overview:", overviewRes.reason || overviewRes.value?.data?.message);
        setError(prev => prev ? prev + '\nFailed to fetch overview.' : 'Failed to fetch overview.');
      }

      if (fetchAll && membersRes.status === 'fulfilled' && membersRes.value.data.success) {
        setMemberProgressData(membersRes.value.data.data || { membersProgress: [] });
         membersSuccess = true;
      } else if (fetchAll) {
        console.error("Error fetching member progress:", membersRes.reason || membersRes.value?.data?.message);
         setError(prev => prev ? prev + '\nFailed to fetch member progress.' : 'Failed to fetch member progress.');
      }

      if (timelineRes.status === 'fulfilled' && timelineRes.value.data.success) {
        const apiTimeline = timelineRes.value.data.data;
        
        const timelineLabels = apiTimeline.labels || [];
        const timelineFullLabels = apiTimeline.fullLabels || [];
        const rawData = apiTimeline.data || [];
        let percentData = [...rawData];
        const groupTarget = apiTimeline.groupTarget || 0;
        
        if (groupTarget > 0 && !apiTimeline.isPercentage) {
          percentData = rawData.map(value => 
            Math.min(Math.round((value / groupTarget) * 100), 100)
          );
        }
        
        setTimelineData({
          labels: timelineLabels,
          datasets: [
            {
              data: percentData,
              color: (opacity = 1) => `rgba(58, 136, 145, ${opacity})`,
              strokeWidth: 2,
            },
          ],
          fullLabels: timelineFullLabels,
          rawData: rawData,
          groupTarget: groupTarget,
          meta: apiTimeline.meta || {
            completedCycles: [],
            totalCycles: []
          },
          isoTimestamps: apiTimeline.isoTimestamps || [],
          currentRange: range
        });
        timelineSuccess = true;
      } else {
        console.error("Error fetching timeline:", timelineRes.reason || timelineRes.value?.data?.message);
        setError(prev => prev ? prev + '\nFailed to fetch timeline.' : 'Failed to fetch timeline.');
        setTimelineData({ 
          labels: [], 
          datasets: [{ data: [] }], 
          fullLabels: [], 
          rawData: [], 
          groupTarget: 0,
          meta: { completedCycles: [], totalCycles: [] },
          isoTimestamps: [],
          currentRange: range
        });
      }

       if (fetchAll && (!overviewSuccess || !membersSuccess || !timelineSuccess)) {
       } else if (!timelineSuccess && !fetchAll) {
       }

    } catch (err) {
      console.error("Error fetching analytics data:", err);
      setError('An unexpected error occurred while fetching analytics data.');
      if(fetchAll) {
          setOverviewData(null);
          setMemberProgressData({ membersProgress: [] });
      }
      setTimelineData({ labels: [], datasets: [{ data: [] }], fullLabels: [], rawData: [], groupTarget: 0 });
    } finally {
      setLoading(false);
    }
  }, []);

  const handleTimeRangeChange = useCallback((range) => {
    setTimeRange(range);
  }, []);

  // 处理横轴标签，根据时间范围进行优化
  const getOptimizedTimelineData = useCallback((data) => {
    if (!data || !data.labels || data.labels.length === 0) {
      return data;
    }

    // 创建数据的深拷贝，避免修改原始数据
    const optimizedData = JSON.parse(JSON.stringify(data));
    const totalPoints = optimizedData.labels.length;
    let interval = 1; // 默认显示所有标签

    // 根据不同的时间范围和数据点数量进行标签优化
    if (timeRange === "24H") {
      // 24小时模式
      if (totalPoints >= 24) {
        interval = 4; // 24个点或更多时，每4个点显示一个标签 (0h, 4h, 8h...)
      } else if (totalPoints >= 12) {
        interval = 3; // 12-23个点时，每3个点显示一个标签 (0h, 3h, 6h...)
      } else if (totalPoints > 6) {
        interval = 2; // 7-11个点时，每2个点显示一个标签
      }
    } else if (timeRange === "1W") {
      // 一周模式，转换为相对时间标签（Now, 1d, 2d, 3d...）
      let newLabels = [];
      
      // 计算相对时间标签
      for (let i = 0; i < totalPoints; i++) {
        let daysAgo = totalPoints - 1 - i;
        if (daysAgo === 0) {
          newLabels.push("Now");
        } else if (daysAgo === 1) {
          newLabels.push("1d");
        } else {
          newLabels.push(`${daysAgo}d`);
        }
      }
      
      optimizedData.labels = newLabels;
      
      // 如果标签太多，还需要进行间隔优化
      if (totalPoints > 10) {
        interval = Math.ceil(totalPoints / 6); // 尝试显示约6个标签
      }
    } else if (timeRange === "1M" && totalPoints > 10) {
      // 一个月模式，数据点多时优化
      interval = Math.ceil(totalPoints / 6); // 尝试显示约6个标签
    } else if (timeRange === "1Y" && totalPoints > 6) {
      // 一年模式，数据点多时优化
      interval = Math.ceil(totalPoints / 6); // 尝试显示约6个标签
    }
    
    // 如果需要优化标签间隔，应用间隔（对于1W已经替换了标签内容，但仍可能需要间隔）
    if (interval > 1) {
      const finalLabels = optimizedData.labels.map((label, index) => {
        // 始终显示第一个和最后一个标签，其他按间隔显示
        if (index === 0 || index === totalPoints - 1) {
          return label;
        }
        return index % interval === 0 ? label : "";
      });
      
      optimizedData.labels = finalLabels;
    }

    return optimizedData;
  }, [timeRange]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  useEffect(() => {
    if (selectedGroupId) {
      fetchAnalyticsData(selectedGroupId, timeRange, true);
    }
  }, [selectedGroupId, fetchAnalyticsData]);

  useEffect(() => {
    if (selectedGroupId) {
      fetchAnalyticsData(selectedGroupId, timeRange, false);
    }
  }, [timeRange]);

  const handleDataPointClick = (data) => {
    if (!timelineData || !timelineData.fullLabels || data.index >= timelineData.fullLabels.length) {
        console.warn('Tooltip click on invalid data point:', data);
        return;
    }
    const index = data.index;
    const percentValue = data.value; // This is the percentage value
    let rawValue = percentValue;
    
    // If there is original data, show more detailed information
    if (timelineData.rawData && timelineData.rawData[index] !== undefined) {
      rawValue = timelineData.rawData[index];
    }
    
    const label = timelineData.fullLabels[index];
    
    // Calculate the screen width, for boundary check
    const screenWidth = Dimensions.get('window').width;
    
    // Calculate the half of the chart height, for judging the click position is in the upper half or lower half
    const chartHeight = 220;
    const chartMidPoint = chartHeight / 2 + 25; // 25 is the top offset
    
    // Decide whether the tooltip is displayed above or below the point
    const isTopHalf = data.y < chartMidPoint;
    
    // Calculate the x position, ensure the tooltip does not exceed the screen boundaries
    let xPosition = data.x - 75; // Increase the left offset, from -5 to -15, to make the tooltip closer to the left
    if (xPosition < 20) xPosition = 20; // Prevent exceeding the left boundary
    if (xPosition > screenWidth - 120) xPosition = screenWidth - 120; // Prevent exceeding the right boundary
    
    // Decide the y position based on the click position in the upper or lower half of the chart
    let yPosition;
    if (isTopHalf) {
      // Click position in the upper half, tooltip displayed below, arrow above the tooltip
      yPosition = data.y + 15; // Display below the point, reduce the offset to approach the data point
    } else {
      // Click position in the lower half, tooltip displayed above, arrow below the tooltip
      yPosition = data.y - 75; // Display above the point, reduce the offset to approach the data point
    }
    
    // Prevent the tooltip from exceeding the upper boundary
    if (yPosition < 10) yPosition = 10;
    
    let cycleInfo = null;
    if (timelineData.currentRange === "1Y" && 
        timelineData.meta && 
        timelineData.meta.completedCycles && 
        timelineData.meta.totalCycles &&
        timelineData.meta.completedCycles.length > index &&
        timelineData.meta.totalCycles.length > index) {
      cycleInfo = {
        completedCycles: timelineData.meta.completedCycles[index],
        totalCycles: timelineData.meta.totalCycles[index]
      };
    }
    
    setTooltipData({
      percentValue,
      rawValue,
      label,
      x: data.x,
      y: data.y,
      index: data.index,
      dataPointX: data.x,
      dataPointY: data.y,
      groupTarget: timelineData.groupTarget,
      tooltipX: xPosition,
      tooltipY: yPosition,
      isTopHalf,
      cycleInfo
    });
    
    setTimeout(() => {
      setTooltipData(null);
    }, 5000);
  };

  const getVerticalLineHeight = (yPosition) => {
    const chartHeight = 180;
    const topOffset = 8;
    return chartHeight - (yPosition - topOffset);
  };

  const selectedGroup = groups.find(g => g.groupId === selectedGroupId);

  if (loading && !overviewData && !memberProgressData.membersProgress.length && !timelineData.datasets[0].data.length) {
    return (
      <SafeAreaView style={[styles.container, styles.centerStatus]}>
        <ActivityIndicator size="large" color="#6A5ACD" />
        <Text style={styles.statusText}>Loading Analytics...</Text>
      </SafeAreaView>
    );
  }
  
  if (!groups.length && error && !loading) {
     return (
      <SafeAreaView style={[styles.container, styles.centerStatus]}>
        <Ionicons name="warning-outline" size={50} color="#DC143C" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchGroups}>
            <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

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
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollViewContent}>
            <View style={styles.header}>
              <Ionicons name="analytics" size={43} color="#3A8891" />
            </View>

            {groups.length > 0 && (
              <TouchableOpacity 
                style={styles.groupSelector} 
                onPress={() => setShowPicker(!showPicker)}
                activeOpacity={0.7}
              >
                <Text style={styles.selectedGroupText}>
                  {selectedGroup ? selectedGroup.name : 'Select Group'}
                </Text>
                <Ionicons 
                  name={showPicker ? "chevron-up" : "chevron-down"} 
                  size={20} 
                  color="#345C6F" 
                />
                
                {showPicker && groups.length > 0 && (
                  <View style={styles.pickerWrapper}>
                    {groups.map(group => (
                      <TouchableOpacity
                        key={group.groupId}
                        style={[
                          styles.pickerItem,
                          selectedGroupId === group.groupId && styles.pickerItemSelected
                        ]}
                        onPress={() => {
                          setSelectedGroupId(group.groupId);
                          setShowPicker(false);
                        }}
                      >
                        <Text 
                          style={[
                            styles.pickerItemText,
                            selectedGroupId === group.groupId && styles.pickerItemTextSelected
                          ]}
                        >
                          {group.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            )}

             {loading && <ActivityIndicator size="small" color="#6A5ACD" style={{ marginVertical: 10 }} />} 

            {error && !loading && <Text style={styles.inlineErrorText}>{error}</Text>} 

            {overviewData && <StatBox 
                groupTarget={overviewData.groupTarget}
                currentTotal={overviewData.currentTotal}
                percentOfTarget={overviewData.percentOfTarget}
                percentOfTimeGone={overviewData.percentOfTimeGone}
            />}

            {memberProgressData.membersProgress.length > 0 && (
                <View style={styles.avatarSection}>
                    <View style={styles.topBorder}><LinearGradient colors={['rgba(106, 90, 205, 0)', 'rgba(106, 90, 205, 0.7)', 'rgba(106, 90, 205, 0.7)', 'rgba(106, 90, 205, 0)']} locations={[0, 0.05, 0.95, 1]} start={{x: 0, y: 0}} end={{x: 1, y: 0}} style={styles.borderGradient}/></View>
                    <View style={styles.bottomBorder}><LinearGradient colors={['rgba(106, 90, 205, 0)', 'rgba(106, 90, 205, 0.7)', 'rgba(106, 90, 205, 0.7)', 'rgba(106, 90, 205, 0)']} locations={[0, 0.05, 0.95, 1]} start={{x: 0, y: 0}} end={{x: 1, y: 0}} style={styles.borderGradient}/></View>
                    <View style={styles.leftBorder}><LinearGradient colors={['rgba(106, 90, 205, 0)', 'rgba(106, 90, 205, 0.7)', 'rgba(106, 90, 205, 0.7)', 'rgba(106, 90, 205, 0)']} locations={[0, 0.05, 0.95, 1]} start={{x: 0, y: 0}} end={{x: 0, y: 1}} style={styles.borderGradient}/></View>
                    <View style={styles.rightBorder}><LinearGradient colors={['rgba(106, 90, 205, 0)', 'rgba(106, 90, 205, 0.7)', 'rgba(106, 90, 205, 0.7)', 'rgba(106, 90, 205, 0)']} locations={[0, 0.05, 0.95, 1]} start={{x: 0, y: 0}} end={{x: 0, y: 1}} style={styles.borderGradient}/></View>
                    
                    <View style={styles.avatarSectionInner}>
                        <ScrollView 
                            showsVerticalScrollIndicator={false}
                            style={styles.memberScrollView}
                            contentContainerStyle={styles.memberScrollContent}
                        >
                            <View style={styles.memberGrid}>
                                {(() => {
                                  // 预先处理排名，处理同分情况
                                  const sortedMembers = memberProgressData.membersProgress
                                    .slice() // 创建副本
                                    .sort((a, b) => b.completed - a.completed); // 按积分从高到低排序
                                  
                                  // 计算每个成员的实际排名（考虑同分情况）
                                  const membersWithRank = [];
                                  let currentRank = 0;
                                  let prevScore = -1;
                                  
                                  // 处理排名逻辑
                                  sortedMembers.forEach((member, index) => {
                                    if (member.completed === 0) {
                                      // 0分没有排名
                                      membersWithRank.push({ ...member, actualRank: 0 });
                                    } else if (member.completed !== prevScore) {
                                      // 新的分数，获得新的排名
                                      currentRank = index + 1;
                                      membersWithRank.push({ ...member, actualRank: currentRank });
                                      prevScore = member.completed;
                                    } else {
                                      // 与前一个分数相同，排名也相同
                                      membersWithRank.push({ ...member, actualRank: currentRank });
                                    }
                                  });
                                  
                                  return membersWithRank.map((member) => {
                                    const isTop3WithScore = member.actualRank > 0 && member.actualRank <= 3;
                                    
                                    return (
                                      <View key={member.userId} style={[
                                          styles.memberItem,
                                          isTop3WithScore && styles.topMemberItem,
                                      ]}>
                                          <View style={styles.avatarContainer}>
                                              {member.actualRank === 1 && (
                                                  <View style={styles.rankingBadge}>
                                                      <Ionicons name="trophy" size={14} color="#FFFFFF" />
                                                  </View>
                                              )}
                                              {member.actualRank === 2 && (
                                                  <View style={[styles.rankingBadge, styles.secondRankBadge]}>
                                                      <Ionicons name="trophy" size={14} color="#FFFFFF" />
                                                  </View>
                                              )}
                                              {member.actualRank === 3 && (
                                                  <View style={[styles.rankingBadge, styles.thirdRankBadge]}>
                                                      <Ionicons name="trophy" size={14} color="#FFFFFF" />
                                                  </View>
                                              )}
                                              <Image 
                                                  source={
                                                      member.avatar ? 
                                                      { uri: member.avatar } : 
                                                      { uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name || 'User')}&color=fff&background=random&size=64&format=png` }
                                                  }
                                                  style={[
                                                      styles.memberAvatar,
                                                      isTop3WithScore && styles.topMemberAvatar,
                                                  ]} 
                                              />
                                          </View>
                                          <Text style={[
                                              styles.memberName,
                                              isTop3WithScore && styles.topMemberName,
                                          ]} numberOfLines={1}>{member.name}</Text>
                                          <Text style={[
                                              styles.memberScore,
                                              isTop3WithScore && styles.topMemberScore,
                                          ]}>{member.completed}</Text>
                                      </View>
                                    );
                                  });
                                })()}
                            </View>
                        </ScrollView>
                    </View>
                </View>
            )}

            {timelineData.datasets[0].data.length > 0 ? (
            <View style={styles.graphSection}>
              <View style={styles.chartContainer}>
                <LineChart
                      data={getOptimizedTimelineData(timelineData)}
                  width={Dimensions.get("window").width - (Platform.OS === 'web' ? 50 : 30)}
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
                    tooltipDecorator: () => null,
                  }}
                  style={{
                    marginVertical: 8,
                    borderRadius: 15,
                    marginLeft: -15,
                    marginRight: -10,
                    alignSelf: 'center',
                  }}
                  decorator={() => null}
                />
                
                {tooltipData && (
                  <View style={styles.tooltipContainer}>
                    <View 
                      style={[
                        styles.verticalDashedLine, 
                        {
                          left: tooltipData.x - 16, // Increase the left offset, from -5 to -15, to make the indicator line closer to the left
                          top: tooltipData.y + 4,
                          height: getVerticalLineHeight(tooltipData.y),
                        }
                      ]}
                    />
                    <View 
                      style={[
                        styles.tooltip, 
                        {
                          left: tooltipData.tooltipX || tooltipData.x - 50,
                          top: tooltipData.tooltipY || tooltipData.y - 60,
                        }
                      ]}
                    >
                      {tooltipData.isTopHalf && (
                        // When in the upper half, the arrow is placed above the tooltip (arrow pointing up)
                        <View style={styles.tooltipArrowUp} />
                      )}
                      <View style={styles.tooltipContent}>
                        <Text style={styles.tooltipLabel}>{tooltipData.label}</Text>
                        <Text style={styles.tooltipValue}>{tooltipData.percentValue}%</Text>
                        {tooltipData.rawValue !== tooltipData.percentValue && (
                          <Text style={styles.tooltipDetail}>
                            {tooltipData.rawValue}/{tooltipData.groupTarget || '?'}
                          </Text>
                        )}
                        {tooltipData.cycleInfo && (
                          <View style={styles.tooltipCyclesContainer}>
                            <Text style={styles.tooltipCyclesLabel}>Completed:</Text>
                            <Text style={styles.tooltipCycles}>
                              {tooltipData.cycleInfo.completedCycles}/{tooltipData.cycleInfo.totalCycles}
                            </Text>
                          </View>
                        )}
                      </View>
                      {!tooltipData.isTopHalf && (
                        // When in the lower half, the arrow is placed below the tooltip (arrow pointing down)
                        <View style={styles.tooltipArrow} />
                      )}
                    </View>
                  </View>
                )}
              </View>

              <View style={styles.timeRangeContainer}>
                {["24H", "1W", "1M", "1Y"].map((range) => (
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
             ) : (
                 <View style={styles.noDataContainer}>
                    <Text style={styles.noDataText}>No activity data available for this period.</Text>
                 </View>
             )}

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
   centerStatus: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  statusText: {
      marginTop: 15,
      fontSize: 16,
      color: '#666',
  },
  errorText: {
    marginTop: 15,
    fontSize: 16,
    color: '#DC143C',
    textAlign: 'center',
  },
  inlineErrorText: {
      fontSize: 14,
      color: '#DC143C',
      textAlign: 'center',
      marginVertical: 10,
      paddingHorizontal: 20,
  },
  retryButton: {
      marginTop: 20,
      backgroundColor: '#6A5ACD',
      paddingVertical: 10,
      paddingHorizontal: 25,
      borderRadius: 8,
  },
  retryButtonText: {
      color: '#FFF',
      fontSize: 16,
      fontWeight: 'bold',
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
  },
  scrollViewContent: {
    padding: Platform.OS === 'web' ? 20 : 15,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? 45 : 30,
    paddingBottom: 35,
    marginBottom: 10,
  },
  groupSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    paddingVertical: 8,
    paddingHorizontal: 15,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 20,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    position: 'relative',
    zIndex: 10,
  },
  selectedGroupText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#345C6F',
    marginRight: 10,
  },
  pickerWrapper: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 5,
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 5,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 4,
    maxHeight: 200,
    overflow: 'hidden',
    zIndex: 100,
  },
  pickerItem: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginVertical: 2,
  },
  pickerItemSelected: {
    backgroundColor: 'rgba(106, 90, 205, 0.1)',
  },
  pickerItemText: {
    fontSize: 15,
    color: '#345C6F',
    textAlign: 'center',
  },
  pickerItemTextSelected: {
    fontWeight: '600',
    color: '#6A5ACD',
  },
  avatarSection: {
    backgroundColor: "#FFF",
    borderRadius: 15,
    paddingVertical: 15,
    borderWidth: 0,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 5,
    position: 'relative',
    overflow: 'hidden',
  },
  avatarSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 5,
    marginBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(106, 90, 205, 0.1)',
  },
  avatarSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#345C6F',
  },
  avatarSectionInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 5,
    maxHeight: 200,
  },
  memberScrollView: {
    width: '100%',
  },
  memberScrollContent: {
    paddingBottom: 10,
  },
  memberGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    paddingHorizontal: 5,
  },
  memberItem: {
    alignItems: 'center',
    justifyContent: 'center',
    margin: 8,
    width: Dimensions.get('window').width > 500 ? '20%' : '25%', // 根据屏幕宽度调整每行显示数量
    maxWidth: 90,
    minWidth: 60,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 5,
  },
  rankingBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    zIndex: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFD700',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  secondRankBadge: {
    backgroundColor: '#C0C0C0',
    borderColor: '#FFFFFF',
  },
  thirdRankBadge: {
    backgroundColor: '#CD7F32',
    borderColor: '#FFFFFF',
  },
  topMemberItem: {
    backgroundColor: 'rgba(106, 90, 205, 0.045)',
    borderRadius: 10,
    padding: 6,
    margin: 6,
    borderWidth: 1,
    borderColor: 'rgba(106, 90, 205, 0.2)',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  topMemberAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: '#FFD700',
    shadowColor: "#FFD700",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  topMemberName: {
    fontWeight: 'bold',
    fontSize: 12,
    color: '#345C6F',
  },
  topMemberScore: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6A5ACD',
  },
  memberScore: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#6A5ACD',
  },
  memberAvatar: {
    width: 45,
    height: 45,
    borderRadius: 23,
    marginBottom: 5,
    borderWidth: 1,
    borderColor: 'rgba(106, 90, 205, 0.3)',
  },
  memberName: {
    fontSize: 11,
    color: '#333',
    textAlign: 'center',
    width: '100%',
    marginBottom: 2,
  },
  graphSection: {
    backgroundColor: "#FFF",
    borderRadius: 15,
    padding: Platform.OS === 'web' ? 12 : 8,
    paddingTop: 25,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 5,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    overflow: 'visible',
  },
  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    position: 'relative',
  },
  noDataContainer: {
      padding: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#FFF',
      borderRadius: 15,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: '#E2E8F0',
  },
  noDataText: {
      fontSize: 15,
      color: '#666',
  },
  timeRangeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 15,
    paddingHorizontal: 5,
    width: '100%',
  },
  timeRangeButton: {
    paddingVertical: 6,
    paddingHorizontal: Platform.OS === 'web' ? 12 : 8,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    minWidth: Platform.OS === 'web' ? 45 : 40,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 3,
  },
  timeRangeButtonActive: {
    backgroundColor: "#345C6F",
  },
  timeRangeText: {
    fontSize: Platform.OS === 'web' ? 13 : 11,
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
    overflow: 'visible',
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
    width: 120,
    overflow: 'visible',
  },
  tooltipContent: {
    backgroundColor: '#6A5ACD',
    borderRadius: 8,
    padding: 10,
    minWidth: 100,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  tooltipLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 11,
    marginBottom: 2,
  },
  tooltipValue: {
    color: '#FFFFFF',
    fontSize: 13,
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
  tooltipArrowUp: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#6A5ACD',
    marginTop: -1,
  },
  tooltipDetail: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 11,
    marginTop: 2,
  },
  tooltipCyclesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  tooltipCyclesLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    marginRight: 4,
  },
  tooltipCycles: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  topBorder: { position: 'absolute', top: 0, left: 18, right: 18, height: 3, zIndex: 10 },
  bottomBorder: { position: 'absolute', bottom: 0, left: 18, right: 18, height: 3, zIndex: 10 },
  leftBorder: { position: 'absolute', left: 0, top: 30, bottom: 30, width: 3, zIndex: 10 },
  rightBorder: { position: 'absolute', right: 0, top: 30, bottom: 30, width: 3, zIndex: 10 },
  borderGradient: { flex: 1, width: '100%', height: '100%' },
});