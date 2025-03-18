import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList, Modal, StyleSheet, Image } from "react-native";

export default function TeamsScreen() {
  const [teams, setTeams] = useState([
    { id: "1", name: "Wellness Warriors", members: [{ id: "101", name: "Alice", role: "Leader", avatar: "https://via.placeholder.com/50" }] },
    { id: "2", name: "Mind & Body Boosters", members: [{ id: "102", name: "Bob", role: "Member", avatar: "https://via.placeholder.com/50" }] },
  ]);
  const [userTeam, setUserTeam] = useState(null);
  const [search, setSearch] = useState("");
  const [newTeam, setNewTeam] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [chatVisible, setChatVisible] = useState(false);

  const handleCreateTeam = () => {
    if (newTeam.trim()) {
      const newTeamObj = {
        id: String(teams.length + 1),
        name: newTeam,
        members: [{ id: String(teams.length + 100), name: "You", role: "Leader", avatar: "https://via.placeholder.com/50" }]
      };
      setTeams([...teams, newTeamObj]);
      setUserTeam(newTeamObj);
      setNewTeam("");
      setModalVisible(false);
    }
  };

  const handleJoinTeam = (team) => {
    if (!userTeam) {
      const updatedTeam = { ...team, members: [...team.members, { id: String(team.members.length + 100), name: "You", role: "Member", avatar: "https://via.placeholder.com/50" }] };
      setTeams(teams.map(t => (t.id === team.id ? updatedTeam : t)));
      setUserTeam(updatedTeam);
    }
  };

  const handleLeaveTeam = () => {
    if (userTeam) {
      const updatedTeam = { ...userTeam, members: userTeam.members.filter(m => m.name !== "You") };
      setTeams(teams.map(t => (t.id === userTeam.id ? updatedTeam : t)));
      setUserTeam(null);
    }
  };

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      setMessages([...messages, { id: messages.length + 1, sender: "You", text: newMessage }]);
      setNewMessage("");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Your Team</Text>
      {userTeam ? (
        <View style={styles.card}>
          <Text style={styles.teamName}>{userTeam.name}</Text>
          <FlatList
            data={userTeam.members}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.memberRow}>
                <Image source={{ uri: item.avatar }} style={styles.avatar} />
                <Text style={styles.memberName}>{item.name} ({item.role})</Text>
              </View>
            )}
          />
          <TouchableOpacity style={styles.button} onPress={() => setChatVisible(true)}>
            <Text style={styles.buttonText}>Open Chat</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.leaveButton]} onPress={handleLeaveTeam}>
            <Text style={styles.buttonText}>Leave Team</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <TextInput
            style={styles.input}
            value={search}
            onChangeText={setSearch}
            placeholder="Search teams"
          />
          <FlatList
            data={teams.filter(team => team.name.toLowerCase().includes(search.toLowerCase()))}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <Text style={styles.teamName}>{item.name}</Text>
                <TouchableOpacity style={styles.button} onPress={() => handleJoinTeam(item)}>
                  <Text style={styles.buttonText}>Join</Text>
                </TouchableOpacity>
              </View>
            )}
          />
          <TouchableOpacity style={styles.button} onPress={() => setModalVisible(true)}>
            <Text style={styles.buttonText}>Create New Team</Text>
          </TouchableOpacity>
        </>
      )}

      <Modal visible={chatVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Team Chat</Text>
            <FlatList
              data={messages}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <Text style={styles.messageText}><Text style={{ fontWeight: 'bold' }}>{item.sender}:</Text> {item.text}</Text>
              )}
            />
            <TextInput
              style={styles.input}
              value={newMessage}
              onChangeText={setNewMessage}
              placeholder="Type a message"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalButton} onPress={handleSendMessage}>
                <Text style={styles.buttonText}>Send</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.closeButton]} onPress={() => setChatVisible(false)}>
                <Text style={styles.buttonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TextInput
              style={styles.input}
              value={newTeam}
              onChangeText={setNewTeam}
              placeholder="Enter new team name"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalButton} onPress={handleCreateTeam}>
                <Text style={styles.buttonText}>Create Team</Text>
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
  container: { flex: 1, backgroundColor: "#E8F0F2", padding: 20 },
  header: { fontSize: 22, fontWeight: "bold", marginBottom: 10 },
  card: { backgroundColor: "#fff", padding: 15, borderRadius: 10, marginBottom: 10 },
  teamName: { fontSize: 18, fontWeight: "bold" },
  button: { backgroundColor: "#4A90E2", padding: 10, borderRadius: 10, alignItems: "center", marginTop: 10 },
  leaveButton: { backgroundColor: "#E74C3C" },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  input: { width: "100%", borderWidth: 1, borderColor: "#ccc", borderRadius: 5, padding: 10, marginBottom: 15 },
  messageText: { fontSize: 16, marginVertical: 5 },
  modalOverlay: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)" },
  modalContent: { backgroundColor: "#fff", padding: 20, borderRadius: 10, width: "80%" },
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 15 },
  modalButtons: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
  modalButton: { backgroundColor: "#4A90E2", padding: 10, borderRadius: 10, flex: 1, marginHorizontal: 5, alignItems: "center" },
  closeButton: { backgroundColor: "#E74C3C" },
  memberRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  avatar: { width: 30, height: 30, borderRadius: 15, marginRight: 10 },
  memberName: { fontSize: 16 },
});
