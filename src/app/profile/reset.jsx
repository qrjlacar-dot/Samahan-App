import { FloatingInput, PrimaryButton, PageLayout } from "../../components/common";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Text, View } from "react-native";
import { editStyles as styles } from "../../styles/editProfile.styles";

export default function ResetPassword() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const handleConfirmPasswordChange = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert("Error", "Please fill in all password fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "New passwords do not match.");
      return;
    }
    Alert.alert("Success", "Password reset successfully!", [{
      text: "OK",
      onPress: () => router.back()
    }]);
  };
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
          activeOpacity={0.7}
        />
      </View>
    </PageLayout>
  );
}
