import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
    Alert,
    Linking,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { auth } from "../services/firebase";

const getStorageKey = () => {
  const userId = auth.currentUser?.uid || "guest";
  return `@samahan_emergency_contacts_${userId}`;
};

export default function EmergencyContactsScreen() {
  const [contacts, setContacts] = useState([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      const savedContacts = await AsyncStorage.getItem(getStorageKey());

      if (savedContacts) {
        setContacts(JSON.parse(savedContacts));
      }
    } catch (error) {
      Alert.alert("Error", "Could not load emergency contacts.");
    }
  };

  const saveContacts = async (updatedContacts) => {
    try {
      await AsyncStorage.setItem(
        getStorageKey(),
        JSON.stringify(updatedContacts)
      );
      setContacts(updatedContacts);
    } catch (error) {
      Alert.alert("Error", "Could not save emergency contacts.");
    }
  };

  const isValidPhoneNumber = (number) => {
    const cleanedNumber = number.replace(/[\s-]/g, "");
    return /^09\d{9}$/.test(cleanedNumber);
  };

  const addContact = async () => {
    const cleanedPhone = phone.replace(/[\s-]/g, "");

    if (!name.trim() || !cleanedPhone) {
      Alert.alert("Missing information", "Enter a name and phone number.");
      return;
    }

    if (!isValidPhoneNumber(cleanedPhone)) {
      Alert.alert(
        "Invalid phone number",
        "Please enter a correct 11-digit mobile number starting with 09."
      );
      return;
    }

    const newContact = {
      id: Date.now().toString(),
      name: name.trim(),
      phone: cleanedPhone,
    };

    await saveContacts([...contacts, newContact]);
    setName("");
    setPhone("");
  };

  const deleteContact = (contact) => {
    Alert.alert(
      "Delete contact?",
      `Remove ${contact.name} from your emergency contacts?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () =>
            saveContacts(contacts.filter((item) => item.id !== contact.id)),
        },
      ]
    );
  };

  const callNumber = async (number) => {
    try {
      await Linking.openURL(`tel:${number}`);
    } catch (error) {
      Alert.alert("Unable to call", "Your device could not open the dialer.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={23} color="#CF6FA7" />
          </Pressable>

          <Text style={styles.title}>Emergency Contacts</Text>
        </View>

        <Text style={styles.subtitle}>
          Save people you can quickly contact in an emergency.
        </Text>

        <View style={styles.addCard}>
          <Text style={styles.sectionTitle}>Add Personal Contact</Text>

          <TextInput
            style={styles.input}
            placeholder="Contact name"
            placeholderTextColor="#B89BAA"
            value={name}
            onChangeText={setName}
          />

          <TextInput
            style={styles.input}
            placeholder="Phone number"
            placeholderTextColor="#B89BAA"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />

          <Pressable style={styles.addButton} onPress={addContact}>
            <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Save Contact</Text>
          </Pressable>
        </View>

        <Text style={styles.listTitle}>Personal Emergency Contacts</Text>

        {contacts.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="people-outline" size={32} color="#CF6FA7" />
            <Text style={styles.emptyText}>
              No personal emergency contacts yet.
            </Text>
          </View>
        ) : (
          contacts.map((contact) => (
            <View style={styles.contactCard} key={contact.id}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={23} color="#CF6FA7" />
              </View>

              <View style={styles.contactInfo}>
                <Text style={styles.contactName}>{contact.name}</Text>
                <Text style={styles.contactPhone}>{contact.phone}</Text>
              </View>

              <Pressable
                style={styles.iconButton}
                onPress={() => callNumber(contact.phone)}
              >
                <Ionicons name="call" size={20} color="#FFFFFF" />
              </Pressable>

              <Pressable
                style={styles.deleteButton}
                onPress={() => deleteContact(contact)}
              >
                <Ionicons name="trash-outline" size={21} color="#CF6FA7" />
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF8FC",
  },
  content: {
    padding: 22,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FCEAF4",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  title: {
    color: "#CF6FA7",
    fontSize: 26,
    fontWeight: "800",
  },
  subtitle: {
    color: "#7A5C6D",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
    marginBottom: 24,
  },
  sectionTitle: {
    color: "#7A435E",
    fontSize: 16,
    fontWeight: "700",
  },
  addCard: {
    backgroundColor: "#FCEAF4",
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#F0CDE0",
    borderRadius: 10,
    color: "#593947",
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 12,
  },
  addButton: {
    backgroundColor: "#BE6398",
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12,
    marginTop: 14,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    marginLeft: 7,
  },
  listTitle: {
    color: "#7A435E",
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 12,
  },
  emptyCard: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 25,
  },
  emptyText: {
    color: "#9B7A8D",
    fontSize: 13,
    marginTop: 10,
  },
  contactCard: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    flexDirection: "row",
    padding: 14,
    marginBottom: 12,
    elevation: 2,
  },
  avatar: {
    alignItems: "center",
    backgroundColor: "#F7DCEB",
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  contactInfo: {
    flex: 1,
    marginLeft: 12,
  },
  contactName: {
    color: "#7A435E",
    fontSize: 15,
    fontWeight: "700",
  },
  contactPhone: {
    color: "#9B7A8D",
    fontSize: 12,
    marginTop: 3,
  },
  iconButton: {
    alignItems: "center",
    backgroundColor: "#CF6FA7",
    borderRadius: 19,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  deleteButton: {
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
    padding: 5,
  },
});