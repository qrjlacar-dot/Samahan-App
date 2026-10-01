import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { scale } from "../../constants/scale";
import { COLORS } from "../../constants/theme";
import { auth, db } from "../../services/firebase";
import { styles } from "../../styles/profile.styles";

export default function Profile() {
  const router = useRouter();

  const [isNotificationsEnabled, setIsNotificationsEnabled] = useState(true);
  const [user, setUser] = useState(auth.currentUser);
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);

  const showDefaultProfileMessage = () => {
    Alert.alert(
      "Default Profile Picture",
      "Samahan uses this default icon for all accounts. Profile photo customization is currently unavailable.",
      [{ text: "OK" }]
    );
  };

  const toggleNotifications = () => {
    setIsNotificationsEnabled((previousState) => !previousState);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);

      if (!firebaseUser) {
        router.replace("/(auth)/login");
      }
    });

    return unsubscribe;
  }, [router]);

  const loadProfile = useCallback(async (uid) => {
    try {
      const snap = await getDoc(doc(db, "users", uid));

      if (snap.exists()) {
        const data = snap.data();

        setProfileData({
          name: data.name || "",
          phone: data.phone || "",
        });
      } else {
        setProfileData({ name: "", phone: "" });
      }
    } catch (err) {
      console.warn("Failed to load profile:", err);
      setProfileData({ name: "", phone: "" });
    } finally {
      setLoading(false);
    }
  }, []);

  // Reload profile information whenever this screen becomes active.
  useFocusEffect(
    useCallback(() => {
      if (user?.uid) {
        loadProfile(user.uid);
      }
    }, [user?.uid, loadProfile])
  );

  const isGoogleOnly =
    !!user &&
    user.providerData.length > 0 &&
    user.providerData.every((p) => p.providerId === "google.com");

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          try {
            await signOut(auth);
            router.replace("/(auth)/login");
          } catch (err) {
            Alert.alert("Error", "Something went wrong while signing out.");
          }
        },
      },
    ]);
  };

  if (loading || !user) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.centerFill}>
          <ActivityIndicator size="large" color={COLORS.pink} />
        </View>
      </SafeAreaView>
    );
  }

  const displayName =
    profileData?.name ||
    user.displayName ||
    user.email?.split("@")[0] ||
    "Name";

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity
          style={styles.avatarWrapper}
          onPress={showDefaultProfileMessage}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="About the default profile picture"
        >
          <View style={styles.avatarCircle}>
            <Ionicons
              name="person"
              size={scale(50)}
              color={COLORS.pink}
            />
          </View>
        </TouchableOpacity>

        <View style={styles.identity}>
          <Text style={styles.userName}>{displayName}</Text>

          {!!user.email && (
            <Text style={styles.userEmail}>{user.email}</Text>
          )}
        </View>

        <View style={styles.menuCard}>
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.6}
            onPress={() => router.push("/profile/edit")}
          >
            <View style={styles.menuLeft}>
              <Ionicons
                name="card-outline"
                size={22}
                color={COLORS.pink}
              />
              <Text style={styles.menuText}>
                Edit Profile Information
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={18}
              color="#CCCCCC"
            />
          </TouchableOpacity>

          <View
            style={[
              styles.menuItem,
              isGoogleOnly && styles.lastMenuItem,
            ]}
          >
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
              thumbColor={
                isNotificationsEnabled ? COLORS.pink : "#F4F3F4"
              }
              onValueChange={toggleNotifications}
              value={isNotificationsEnabled}
            />
          </View>

          {!isGoogleOnly && (
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

              <Ionicons
                name="chevron-forward"
                size={18}
                color="#CCCCCC"
              />
            </TouchableOpacity>
          )}
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