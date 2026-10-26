import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Text, View } from "react-native";
import { FloatingInput, PageLayout, PrimaryButton } from "../../components/common";
import { ProfileAvatar } from "../../components/ProfileAvatar";
import { useAuth } from "../../context/AuthContext";
import { accountErrorMessage, saveAccountProfile } from "../../services/auth/account";
import { editStyles as styles } from "../../styles/editProfile.styles";

function GoogleAccountField({ label, value }) {
  return (
    <View
      style={styles.readOnlyField}
      accessibilityLabel={`${label}: ${value}. Managed by Google.`}
    >
      <Text style={styles.readOnlyLabel}>{label}</Text>

      <Text style={styles.readOnlyValue}>{value}</Text>

      <Ionicons name="lock-closed-outline" size={18} color="#94828D" style={styles.lockIcon} />
    </View>
  );
}

export default function EditProfile() {
  const router = useRouter();
  const { identity, isGoogle } = useAuth();

  const [name, setName] = useState(identity.name);
  const [email, setEmail] = useState(identity.email);
  const [currentPassword, setCurrentPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [edited, setEdited] = useState(false);

  const emailChanged = !isGoogle && email.trim().toLowerCase() !== identity.email.toLowerCase();

  useEffect(() => {
    if (!edited) {
      setName(identity.name);
      setEmail(identity.email);
    }
  }, [identity.name, identity.email, edited]);

  const handleConfirmChanges = async () => {
    if (isGoogle || saving) return;

    if (!name.trim()) {
      Alert.alert("Error", "Name can't be empty.");
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      Alert.alert("Error", "Please enter a valid email address.");
      return;
    }

    if (emailChanged && !currentPassword) {
      Alert.alert("Error", "Enter your current password to confirm the email change.");
      return;
    }

    setSaving(true);

    try {
      const verificationSent = await saveAccountProfile(name, email, currentPassword);

      setCurrentPassword("");

      if (verificationSent) {
        Alert.alert(
          "Verify your new email",
          `We've sent a verification link to ${email.trim()}. Your sign-in email will update once you confirm it. Until then, keep using ${identity.email} to log in.`,
          [{ text: "OK", onPress: () => router.back() }],
        );
      } else {
        Alert.alert("Success", "Profile information updated successfully!", [
          { text: "OK", onPress: () => router.back() },
        ]);
      }
    } catch (error) {
      Alert.alert("Error", accountErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageLayout contentStyle={styles.content}>
      <Text style={styles.editTitle}>Edit Profile Information</Text>

      <View style={styles.avatarWrapper}>
        <ProfileAvatar
          name={isGoogle ? identity.name : name}
          photoURL={identity.photoURL}
          style={styles.avatarCircle}
        />
      </View>

      <View style={styles.formContainer}>
        {isGoogle ? (
          <>
            <GoogleAccountField label="Name" value={identity.name} />

            <GoogleAccountField label="Email Address" value={identity.email} />

            <Text style={styles.googleAccountNote}>
              Your name, email address, and profile photo are managed by Google. You can update them
              in your Google account.
            </Text>
          </>
        ) : (
          <>
            <FloatingInput
              label="Name"
              value={name}
              onChangeText={(text) => {
                setEdited(true);
                setName(text);
              }}
              autoCapitalize="words"
              editable={!saving}
            />

            <FloatingInput
              label="Email Address"
              value={email}
              onChangeText={(text) => {
                setEdited(true);
                setEmail(text);
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!saving}
            />
          </>
        )}

        {emailChanged && (
          <FloatingInput
            label="Current Password"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry
            editable={!saving}
          />
        )}

        <PrimaryButton
          title="Confirm Changes"
          style={styles.confirmButton}
          onPress={handleConfirmChanges}
          disabled={isGoogle || saving}
          activeOpacity={0.7}
        />
      </View>
    </PageLayout>
  );
}
