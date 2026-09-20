import { Feather, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  SafeAreaView,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
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
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.avatarWrapper}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={64} color="#CA74A6" />
          </View>
          <TouchableOpacity
            style={styles.editIconButton}
            activeOpacity={0.7}
            onPress={() => router.push("/profile/edit")}
          >
            <Feather name="edit-2" size={16} color="#CA74A6" />
          </TouchableOpacity>
        </View>

        <Text style={styles.userName}>Name</Text>

        <View style={styles.menuCard}>
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.6}
            onPress={() => router.push("/profile/edit")}
          >
            <View style={styles.menuLeft}>
              <Ionicons name="card-outline" size={22} color="#CA74A6" />
              <Text style={styles.menuText}>Edit Profile Information</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#CCCCCC" />
          </TouchableOpacity>

          <View style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <Ionicons
                name="notifications-outline"
                size={22}
                color="#CA74A6"
              />
              <Text style={styles.menuText}>Notifications</Text>
            </View>
            <Switch
              trackColor={{ false: "#E0E0E0", true: "#E8A5C8" }}
              thumbColor={isNotificationsEnabled ? "#CA74A6" : "#F4F3F4"}
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
              <Ionicons name="lock-closed-outline" size={22} color="#CA74A6" />
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
