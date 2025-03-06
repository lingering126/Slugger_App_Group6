import { View, Text, StyleSheet } from "react-native";

export default function TeamScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>This is the Team Page</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#E8F0F2",
  },
  text: {
    fontSize: 20,
  },
});
