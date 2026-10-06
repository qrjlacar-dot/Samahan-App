import { FloatingInput, PageLayout, PrimaryButton } from "../../components/common";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Text, View } from "react-native";
import { COLORS } from "../../constants/theme";
import { editStyles as styles } from "../../styles/editProfile.styles";
export default function EditProfile() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const handleConfirmChanges = () => {
    Alert.alert("Success", "Profile information updated successfully!", [{
      text: "OK",
      onPress: () => router.back()
    }]);
  };
  return <PageLayout contentStyle={styles.content}>
        <Text style={styles.editTitle}>Edit Profile Information</Text>

        <View style={styles.avatarWrapper}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={50} color={COLORS.pink} />
          </View>
          <View style={styles.avatarEditBadge}>
            <Feather name="edit-2" size={14} color={COLORS.pink} />
          </View>
        </View>

        <View style={styles.formContainer}>
          <FloatingInput label="Name" value={name} onChangeText={setName} />

          <FloatingInput label="Email Address" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />

          <PrimaryButton
            title="Confirm Changes"
            style={styles.confirmButton}
            onPress={handleConfirmChanges}
            activeOpacity={0.7}
          />
        </View>
    </PageLayout>;
}
