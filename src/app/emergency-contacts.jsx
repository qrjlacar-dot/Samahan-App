import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { Alert, Linking, Pressable, Text, View } from "react-native";

import {
  FloatingInput,
  PageLayout,
  PrimaryButton,
} from "../components/common";
import { scale } from "../constants/scale";
import { COLORS } from "../constants/theme";
import {
  cleanPhoneNumber,
  isValidPhoneNumber,
  loadContacts,
  saveContacts,
} from "../services/emergencyContacts";
import { styles } from "../styles/emergency-contacts.styles";

export default function EmergencyContactsScreen() {
  const [contacts, setContacts] = useState([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const contactsRef = useRef([]);
  const savingRef = useRef(false);

  useEffect(() => {
    let active = true;

    loadContacts()
      .then((savedContacts) => {
        if (!active) return;

        contactsRef.current = savedContacts;
        setContacts(savedContacts);
        setIsLoaded(true);
      })
      .catch(() => {
        if (!active) return;

        setLoadFailed(true);
        Alert.alert(
          "Error",
          "Could not load emergency contacts. Please reopen this page to try again."
        );
      });

    return () => {
      active = false;
    };
  }, []);

  // Save one change at a time using the latest contact list.
  const persistContacts = async (update) => {
    if (!isLoaded || savingRef.current) return false;

    savingRef.current = true;
    setIsSaving(true);

    try {
      const updatedContacts = update(contactsRef.current);

      await saveContacts(updatedContacts);

      contactsRef.current = updatedContacts;
      setContacts(updatedContacts);

      return true;
    } catch {
      Alert.alert(
        "Error",
        "Could not save emergency contacts. Please try again."
      );

      return false;
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  const addContact = async () => {
    if (!isLoaded || savingRef.current) return;

    const cleanedName = name.trim();
    const cleanedPhone = cleanPhoneNumber(phone);

    if (!cleanedName || !cleanedPhone) {
      Alert.alert(
        "Missing information",
        "Enter a name and phone number."
      );
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
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      name: cleanedName,
      phone: cleanedPhone,
    };

    const saved = await persistContacts((currentContacts) => [
      ...currentContacts,
      newContact,
    ]);

    if (saved) {
      setName("");
      setPhone("");
    }
  };

  const deleteContact = (contact) => {
    Alert.alert(
      "Delete contact?",
      `Remove ${contact.name} from your emergency contacts?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () =>
            persistContacts((currentContacts) =>
              currentContacts.filter((item) => item.id !== contact.id)
            ),
        },
      ]
    );
  };

  const callNumber = async (number) => {
    try {
      await Linking.openURL(`tel:${cleanPhoneNumber(number)}`);
    } catch {
      Alert.alert(
        "Unable to call",
        "Your device could not open the dialer."
      );
    }
  };

  return (
    <PageLayout contentStyle={styles.content}>
      <Text style={styles.title}>Emergency Contacts</Text>

      <Text style={styles.subtitle}>
        Save people you can quickly contact in an emergency.
      </Text>

      <View style={styles.addCard}>
        <Text style={styles.sectionTitle}>Add Personal Contact</Text>

        <View style={styles.form}>
          <FloatingInput
            label="Contact Name"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            editable={isLoaded && !isSaving}
          />

          <FloatingInput
            label="Phone Number"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            editable={isLoaded && !isSaving}
          />

          <PrimaryButton
            title={isSaving ? "Saving..." : "Save Contact"}
            iconName="add-circle-outline"
            onPress={addContact}
            disabled={!isLoaded || isSaving}
          />
        </View>
      </View>

      <Text style={styles.listTitle}>Personal Emergency Contacts</Text>

      {!isLoaded ? (
        <Text style={styles.statusText}>
          {loadFailed
            ? "Contacts could not be loaded. Reopen this page to try again."
            : "Loading contacts..."}
        </Text>
      ) : contacts.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons
            name="people-outline"
            size={scale(32)}
            color={COLORS.pink}
          />

          <Text style={styles.emptyText}>
            No personal emergency contacts yet.
          </Text>
        </View>
      ) : (
        contacts.map((contact) => (
          <View key={contact.id} style={styles.contactCard}>
            <View style={styles.avatar}>
              <Ionicons
                name="person"
                size={scale(23)}
                color={COLORS.pink}
              />
            </View>

            <View style={styles.contactInfo}>
              <Text style={styles.contactName}>{contact.name}</Text>
              <Text style={styles.contactPhone}>{contact.phone}</Text>
            </View>

            <Pressable
              style={styles.callButton}
              onPress={() => callNumber(contact.phone)}
              accessibilityRole="button"
              accessibilityLabel={`Call ${contact.name}`}
              hitSlop={4}
            >
             <Ionicons
              name="call"
              size={scale(20)}
              color={COLORS.cardBg}
            />
            </Pressable>

            <Pressable
              style={styles.deleteButton}
              onPress={() => deleteContact(contact)}
              disabled={isSaving}
              accessibilityRole="button"
              accessibilityLabel={`Delete ${contact.name}`}
              accessibilityState={{ disabled: isSaving }}
              hitSlop={4}
            >
              <Ionicons
                name="trash-outline"
                size={scale(21)}
                color={COLORS.pink}
              />
            </Pressable>
          </View>
        ))
      )}
    </PageLayout>
  );
}