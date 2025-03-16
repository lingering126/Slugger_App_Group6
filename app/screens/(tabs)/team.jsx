import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList, Modal, StyleSheet } from "react-native";

export default function TeamsScreen() {
  const [teams, setTeams] = useState([
    { id: "1", name: "Wellness Warriors", members: 5 },
    { id: "2", name: "Mind & Body Boosters", members: 8 },
  ]);
  const [newTeam, setNewTeam] = useState("");
  const [modalVisible, setModalVisible] = useState(false);

  const handleCreateTeam = () => {
    if (newTeam.trim()) {
      setTeams([...teams, { id: String(teams.length + 1), name: newTeam, members: 1 }]);
      setNewTeam("");
      setModalVisible(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Your Teams</Text>

      {/* Team */}
      <FlatList
        data={teams}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.teamName}>{item.name}</Text>
            <Text style={styles.teamMembers}>Members: {item.members}</Text>
          </View>
        )}
      />

      {/* Create Team */}
      <TouchableOpacity style={styles.button} onPress={() => setModalVisible(true)}>
        <Text style={styles.buttonText}>Create New Team</Text>
      </TouchableOpacity>

      {/* Create Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create a Team</Text>
            <TextInput
              style={styles.input}
              value={newTeam}
              onChangeText={setNewTeam}
              placeholder="Enter team name"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalButton} onPress={handleCreateTeam}>
                <Text style={styles.buttonText}>Create</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.closeButton]} onPress={() => setModalVisible(false)}>
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E8F0F2",
    padding: 20,
  },
  header: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 10,
  },
  card: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  teamName: {
    fontSize: 18,
    fontWeight: "bold",
  },
  teamMembers: {
    fontSize: 14,
    color: "#555",
    marginTop: 5,
  },
  button: {
    backgroundColor: "#4A90E2",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    width: "80%",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
  },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  modalButton: {
    flex: 1,
    backgroundColor: "#4A90E2",
    paddingVertical: 10,
    borderRadius: 5,
    alignItems: "center",
    marginHorizontal: 5,
  },
  closeButton: {
    backgroundColor: "#E74C3C",
  },
});
