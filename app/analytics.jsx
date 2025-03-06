import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { LineChart } from "react-native-chart-kit";
import { Dimensions } from "react-native";

const screenWidth = Dimensions.get("window").width;

export default function AnalyticsScreen() {
  // Sample data for the chart
  const chartData = {
    labels: ["6H", "12H", "24H", "1W", "1Y"],
    datasets: [
      {
        data: [80, 85, 90, 88, 92],
      },
    ],
  };

  // Sample team data
  const teamMembers = [
    { name: "John", score: 7, image: "https://placehold.co/50x50" },
    { name: "Jim", score: 9, image: "https://placehold.co/50x50" },
    { name: "You", score: 5, image: "https://placehold.co/50x50" },
    { name: "Alice", score: 6, image: "https://placehold.co/50x50" },
    { name: "Cloe", score: 9, image: "https://placehold.co/50x50" },
    { name: "Sam", score: 4, image: "https://placehold.co/50x50" },
    { name: "Jade", score: 5, image: "https://placehold.co/50x50" },
  ];

  return (
    <View style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>Total</Text>
          <Text style={styles.metricValue}>46</Text>
          <Text style={styles.metricLabel}>Group target</Text>
          <Text style={styles.metricValue}>68</Text>
        </View>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>% of target</Text>
          <Text style={styles.metricValue}>68%</Text>
          <Text style={styles.metricLabel}>% of time gone</Text>
          <Text style={styles.metricValue}>65%</Text>
        </View>
      </View>

      {/* Team Members Section */}
      <View style={styles.teamContainer}>
        {teamMembers.map((member, index) => (
          <View key={index} style={styles.teamMember}>
            <Image source={member.image} style={styles.avatar} />
            <Text style={styles.memberName}>{member.name}</Text>
            <Text style={styles.memberScore}>{member.score}</Text>
          </View>
        ))}
      </View>

      {/* Chart Section */}
      <View style={styles.chartContainer}>
        <LineChart
          data={chartData}
          width={screenWidth - 40}
          height={220}
          chartConfig={{
            backgroundColor: "#E8F0F2",
            backgroundGradientFrom: "#E8F0F2",
            backgroundGradientTo: "#E8F0F2",
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(0, 128, 255, ${opacity})`,
            style: {
              borderRadius: 16,
            },
          }}
          bezier
          style={{
            marginVertical: 8,
            borderRadius: 16,
          }}
        />
        <View style={styles.timeButtons}>
          {["6H", "12H", "24H", "1W", "1Y"].map((time) => (
            <TouchableOpacity
              key={time}
              style={[
                styles.timeButton,
                time === "24H" && styles.activeTimeButton,
              ]}
            >
              <Text
                style={[
                  styles.timeButtonText,
                  time === "24H" && styles.activeTimeButtonText,
                ]}
              >
                {time}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E8F0F2",
    paddingTop: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 20,
  },
  metricBox: {
    backgroundColor: "#D3E0E5",
    padding: 15,
    borderRadius: 10,
    width: "40%",
  },
  metricLabel: {
    fontSize: 14,
    color: "#333",
    textAlign: "center",
  },
  metricValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#000",
    textAlign: "center",
  },
  teamContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-around",
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  teamMember: {
    alignItems: "center",
    marginBottom: 10,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginBottom: 5,
  },
  memberName: {
    fontSize: 14,
    color: "#333",
  },
  memberScore: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000",
  },
  chartContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  timeButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: screenWidth - 40,
    marginTop: 10,
  },
  timeButton: {
    padding: 10,
    backgroundColor: "#D3E0E5",
    borderRadius: 5,
  },
  activeTimeButton: {
    backgroundColor: "#A3BFFA",
  },
  timeButtonText: {
    fontSize: 14,
    color: "#333",
  },
  activeTimeButtonText: {
    color: "#fff",
  },
  navBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#D3E0E5",
    paddingVertical: 10,
    position: "absolute",
    bottom: 0,
    width: "100%",
  },
  navItem: {
    alignItems: "center",
  },
  navText: {
    fontSize: 14,
    color: "#333",
  },
});
