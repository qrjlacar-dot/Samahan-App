import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
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
import { ProfileAvatar } from "../../components/ProfileAvatar";
import { useAuth } from "../../context/AuthContext";
import { COLORS } from "../../constants/theme";
import {
  accountErrorMessage,
  signOutAccount,
} from "../../services/account";
import {
  getNotificationPreferences,
  setNotificationPreferences,
} from "../../services/notifications";
import { styles } from "../../styles/profile.styles";

export default function Profile() {
  const router = useRouter();
  const { identity, isGoogle, user, profileError, profileSyncing, retryProfile } = useAuth();
  const uid = user?.uid;

  const [signingOut, setSigningOut] = useState(false);
  const [isNotificationsEnabled, setIsNotificationsEnabled] =
    useState(true);

  const [preferencesLoading, setPreferencesLoading] = useState(true);
  const savingPreference = useRef(false);

  // Load the saved choice for the signed-in account (defaults to on).
  useEffect(() => {
    if (!uid) return;

    let active = true;
    setPreferencesLoading(true);

    getNotificationPreferences(uid)
      .then((preferences) => {
        if (active) setIsNotificationsEnabled(preferences.enabled);
      })
      .catch(() => {
        // Keep the default; the switch still works.
      })
      .finally(() => {
        if (active) setPreferencesLoading(false);
      });

    return () => {
      active = false;
    };
  }, [uid]);

  const toggleNotifications = async (nextValue) => {
    if (!uid || savingPreference.current) return;

    savingPreference.current = true;
    const previousValue = isNotificationsEnabled;
    setIsNotificationsEnabled(nextValue);

    try {
      await setNotificationPreferences(uid, { enabled: nextValue });
    } catch {
      setIsNotificationsEnabled(previousValue);
      Alert.alert(
        "Could not save",
        "Your notification setting was not changed. Please try again.",
      );
    } finally {
      savingPreference.current = false;
    }
  };

  const handleSignOut = () => {
    if (signingOut) return;

    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            setSigningOut(true);

            try {
              await signOutAccount();
              router.replace("/(auth)/login");
            } catch (error) {
              setSigningOut(false);
              Alert.alert("Error", accountErrorMessage(error));
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.avatarWrapper}>
          <ProfileAvatar
            name={identity.name}
            photoURL={identity.photoURL}
            style={styles.avatarCircle}
          />
        </View>

        <View style={styles.identity}>
          <Text style={styles.userName}>
            {identity.name}
          </Text>

          {!!identity.email && (
            <Text style={styles.userEmail} selectable>
              {identity.email}
            </Text>
          )}
        </View>

        {!!profileError && (
          <View style={styles.syncCard}>
            <Text style={styles.syncMessage} accessibilityLiveRegion="polite">{profileError}</Text>
            <TouchableOpacity onPress={retryProfile} disabled={profileSyncing} accessibilityRole="button" style={styles.syncButton}>
              {profileSyncing ? <ActivityIndicator color={COLORS.pink} /> : <Text style={styles.syncButtonText}>Retry sync</Text>}
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.menuCard}>
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.6}
            disabled={signingOut}
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
              isGoogle && styles.lastMenuItem,
            ]}
          >
            <View style={styles.menuLeft}>
              <Ionicons
                name="notifications-outline"
                size={22}
                color={COLORS.pink}
              />

              <Text style={styles.menuText}>
                Notifications
              </Text>
            </View>

            <Switch
              trackColor={{
                false: "#E0E0E0",
                true: "#E8A5C8",
              }}
              thumbColor={
                isNotificationsEnabled ? COLORS.pink : "#F4F3F4"
              }
              disabled={signingOut || preferencesLoading}
              onValueChange={toggleNotifications}
              value={isNotificationsEnabled}
            />
          </View>

          {!isGoogle && (
            <TouchableOpacity
              style={[styles.menuItem, styles.lastMenuItem]}
              activeOpacity={0.6}
              disabled={signingOut}
              onPress={() => router.push("/profile/reset")}
            >
              <View style={styles.menuLeft}>
                <Ionicons
                  name="lock-closed-outline"
                  size={22}
                  color={COLORS.pink}
                />

                <Text style={styles.menuText}>
                  Reset Password
                </Text>
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
          disabled={signingOut}
          accessibilityRole="button"
          accessibilityState={{
            disabled: signingOut,
            busy: signingOut,
          }}
        >
          {signingOut && (
            <ActivityIndicator
              size="small"
              color="#E57373"
              style={styles.signOutIndicator}
            />
          )}

          <Text style={styles.signOutText}>
            Sign out
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
