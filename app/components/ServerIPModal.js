import React, { useState, useEffect } from 'react';
import { 
  Modal, 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform,
  Alert
} from 'react-native';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';

const ServerIPModal = ({ visible, onClose, onSave, currentIP = '' }) => {
  const [ipAddress, setIpAddress] = useState(currentIP);
  const [isValidIP, setIsValidIP] = useState(true);

  useEffect(() => {
    // When the modal opens, set the IP to the current IP
    if (visible && currentIP) {
      setIpAddress(currentIP);
    }
  }, [visible, currentIP]);

  const validateIP = (ip) => {
    // Basic IP validation
    const ipPattern = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipPattern.test(ip);
  };

  const handleTextChange = (text) => {
    setIpAddress(text);
    setIsValidIP(text === '' || validateIP(text));
  };

  const handleSave = () => {
    if (!ipAddress.trim()) {
      Alert.alert('Error', 'Please enter an IP address');
      return;
    }

    if (!validateIP(ipAddress)) {
      Alert.alert('Error', 'Please enter a valid IP address in the format xxx.xxx.xxx.xxx');
      return;
    }

    onSave(ipAddress);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.centeredView}
      >
        <View style={styles.modalView}>
          <View style={styles.header}>
            <Text style={styles.title}>Server IP Address</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <Text style={styles.description}>
            Enter the IP address of your server. This is typically your computer's IP address 
            on the same network as your phone.
          </Text>

          <View style={styles.inputContainer}>
            <FontAwesome name="server" size={18} color="#6C63FF" style={styles.icon} />
            <TextInput
              style={[styles.input, !isValidIP && styles.inputError]}
              value={ipAddress}
              onChangeText={handleTextChange}
              placeholder="e.g. 192.168.1.100"
              keyboardType="numeric"
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus={true}
            />
          </View>
          
          {!isValidIP && (
            <Text style={styles.errorText}>
              Please enter a valid IP address (e.g. 192.168.1.100)
            </Text>
          )}

          <View style={styles.helpContainer}>
            <FontAwesome name="info-circle" size={16} color="#6C63FF" style={styles.helpIcon} />
            <Text style={styles.helpText}>
              To find your IP address on Windows, open a command prompt and type "ipconfig".
              On Mac/Linux, open a terminal and type "ifconfig".
            </Text>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.button, styles.saveButton, (!ipAddress || !isValidIP) && styles.disabledButton]}
              onPress={handleSave}
              disabled={!ipAddress || !isValidIP}
            >
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 20,
  },
  modalView: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  inputError: {
    borderColor: '#f44336',
  },
  errorText: {
    color: '#f44336',
    fontSize: 12,
    marginBottom: 16,
  },
  helpContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
  },
  helpIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  helpText: {
    fontSize: 13,
    color: '#666',
    flex: 1,
    lineHeight: 18,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    marginRight: 12,
  },
  saveButton: {
    backgroundColor: '#6C63FF',
  },
  disabledButton: {
    backgroundColor: '#b3b3b3',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '500',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '500',
  },
});

export default ServerIPModal; 