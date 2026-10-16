import {
  FloatingInput,
  PrimaryButton,
  PageLayout,
} from "../../components/common";
import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Text, View } from "react-native";
import { editStyles as styles } from "../../styles/editProfile.styles";

import { useAuth } from "../../context/AuthContext";
import {
  accountErrorMessage,
  changeAccountPassword,
} from "../../services/account";

export default function ResetPassword() {
  const router = useRouter();
  const { isGoogle } = useAuth();
  const [saving, setSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const handleConfirmPasswordChange = async () => {
    if (saving || isGoogle) return;
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert("Error", "Please fill in all password fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "New passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert("Error", "Use at least 6 characters.");
      return;
    }
    setSaving(true);
    try {
      await changeAccountPassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      Alert.alert("Success", "Password reset successfully!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error) {
      Alert.alert("Error", accountErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };
  if (isGoogle) return <Redirect href="/(tabs)/profile" />;

  return (
    <PageLayout contentStyle={styles.content}>
      <Text style={styles.editTitle}>Reset Password</Text>
      <View style={styles.formContainer}>
        <FloatingInput
          label="Current Password"
          value={currentPassword}
          onChangeText={setCurrentPassword}
          secureTextEntry
        />
        <FloatingInput
          label="New Password"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
        />
        <FloatingInput
          label="Confirm New Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />
        <PrimaryButton
          title="Confirm Changes"
          style={styles.confirmButton}
          onPress={handleConfirmPasswordChange}
          disabled={saving}
          activeOpacity={0.7}
        />
      </View>
    </PageLayout>
  );
}
