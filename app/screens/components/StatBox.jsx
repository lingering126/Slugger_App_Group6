import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from '@expo/vector-icons';

// Function to safely format numbers, handling null/undefined
const formatNumber = (num) => {
  return (typeof num === 'number' && !isNaN(num)) ? num.toFixed(0) : '...';
};

// Function to safely format percentages
const formatPercent = (num) => {
  return (typeof num === 'number' && !isNaN(num)) ? `${num.toFixed(0)}%` : '...';
};

export default function StatBox({ groupTarget, currentTotal, percentOfTarget, percentOfTimeGone }) {
  // Optional: Add a console log here to verify props are received
  // console.log('StatBox props:', { groupTarget, currentTotal, percentOfTarget, percentOfTimeGone });
  
  return (
    <View style={styles.statBox}>
      <View style={styles.statColumn}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Total</Text>
          <View style={styles.statHeader}>
            {/* Use currentTotal prop */}
            <Text style={styles.statValue}>{formatNumber(currentTotal)}</Text>
            {/* Icon logic might need adjustment based on data trends if available */}
            <Ionicons name="trending-up" size={20} color="#3A8891" /> 
          </View>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Group target</Text>
          {/* Use groupTarget prop */}
          <Text style={styles.groupTarget}>{formatNumber(groupTarget)}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.statColumn}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>% of target</Text>
          {/* Use percentOfTarget prop and format */}
          <Text style={[styles.percentValue, { color: '#3A8891' }]}>{formatPercent(percentOfTarget)}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>% of time gone</Text>
          {/* Use percentOfTimeGone prop and format */}
          <Text style={styles.percentValue}>{formatPercent(percentOfTimeGone)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  statBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#E8F0F2", 
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
  },
  statColumn: {
    flex: 1,
    paddingHorizontal: 10,
  },
  statItem: {
    marginBottom: 15,
    // Ensure items don't push divider away if text gets long
    minHeight: 50, 
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1E293B",
    marginRight: 8,
  },
  groupTarget: {
    fontSize: 22,
    fontWeight: "600",
    color: "#64748B",
  },
  percentValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1E293B",
  },
  divider: {
    width: 1,
    // Make divider stretch to full height
    alignSelf: 'stretch',
    backgroundColor: "#D8E1E5",
  },
});