import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS } from "../../constants/theme";
import { styles } from "../../styles/profile.styles";

export default function Profile() {
  const router = useRouter();
  const [isNotificationsEnabled, setIsNotificationsEnabled] = useState(true);

  const toggleNotifications = () => {
    setIsNotificationsEnabled((previousState) => !previousState);
  };

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: () => {
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.avatarWrapper}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={50} color={COLORS.pink} />
          </View>
        </View>

        <Text style={styles.userName}>Name</Text>

        <View style={styles.menuCard}>
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.6}
            onPress={() => router.push("/profile/edit")}
          >
            <View style={styles.menuLeft}>
              <Ionicons name="card-outline" size={22} color={COLORS.pink} />
              <Text style={styles.menuText}>Edit Profile Information</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#CCCCCC" />
          </TouchableOpacity>

          <View style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <Ionicons
                name="notifications-outline"
                size={22}
                color={COLORS.pink}
              />
              <Text style={styles.menuText}>Notifications</Text>
            </View>
            <Switch
              trackColor={{ false: "#E0E0E0", true: "#E8A5C8" }}
              thumbColor={isNotificationsEnabled ? COLORS.pink : "#F4F3F4"}
              onValueChange={toggleNotifications}
              value={isNotificationsEnabled}
            />
          </View>

          <TouchableOpacity
            style={[styles.menuItem, styles.lastMenuItem]}
            activeOpacity={0.6}
            onPress={() => router.push("/profile/reset")}
          >
            <View style={styles.menuLeft}>
              <Ionicons
                name="lock-closed-outline"
                size={22}
                color={COLORS.pink}
              />
              <Text style={styles.menuText}>Reset Password</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#CCCCCC" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.signOutButton}
          activeOpacity={0.7}
          onPress={handleSignOut}
        >
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}