import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from '@expo/vector-icons';

export default function StatBox() {
  return (
    <View style={styles.statBox}>
      <View style={styles.statColumn}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Total</Text>
          <View style={styles.statHeader}>
            <Text style={styles.statValue}>46</Text>
            <Ionicons name="trending-up" size={20} color="#3A8891" />
          </View>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Group target</Text>
          <Text style={styles.groupTarget}>68</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.statColumn}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>% of target</Text>
          <Text style={[styles.percentValue, { color: '#3A8891' }]}>68%</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>% of time gone</Text>
          <Text style={styles.percentValue}>65%</Text>
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
    height: "100%",
    backgroundColor: "#D8E1E5",
  },
});