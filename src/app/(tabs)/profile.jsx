import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  Linking,
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
import { accountErrorMessage, signOutAccount } from "../../services/auth/account";
import {
  getNotificationPreferences,
  setNotificationPreferences,
} from "../../services/notifications";
import { getPhonePermission, requestPhonePermission } from "../../services/phoneNotifications";
import { styles } from "../../styles/profile.styles";

export default function Profile() {
  const router = useRouter();
  const { identity, isGoogle, user, profileError, profileSyncing, retryProfile } = useAuth();
  const uid = user?.uid;

  const [signingOut, setSigningOut] = useState(false);
  const [isNotificationsEnabled, setIsNotificationsEnabled] = useState(true);

  const [preferencesLoading, setPreferencesLoading] = useState(true);
  const savingPreference = useRef(false);

  // The switch means "phone notifications". It shows on only when the account
  // choice is on AND the phone has not blocked notifications for SAMAHAN.
  // Refreshed every time this tab opens (for example after the phone settings).
  useFocusEffect(
    useCallback(() => {
      if (!uid) return undefined;

      let active = true;

      const refreshPreferences = () =>
        Promise.all([getNotificationPreferences(uid), getPhonePermission()])
          .then(([preferences, permission]) => {
            if (active && !savingPreference.current) {
              setIsNotificationsEnabled(preferences.enabled && permission === "granted");
            }
          })
          .catch(() => {
            // Keep the current value; the switch still works.
          })
          .finally(() => {
            if (active) setPreferencesLoading(false);
          });

      void refreshPreferences();
      const subscription = AppState?.addEventListener("change", (state) => {
        if (state === "active") void refreshPreferences();
      });
      return () => {
        active = false;
        subscription?.remove();
      };
    }, [uid]),
  );

  const toggleNotifications = async (nextValue) => {
    if (!uid || savingPreference.current) return;

    savingPreference.current = true;
    const previousValue = isNotificationsEnabled;
    setIsNotificationsEnabled(nextValue);

    try {
      if (nextValue) {
        const permission = await requestPhonePermission();

        if (permission === "denied") {
          setIsNotificationsEnabled(false);
          Alert.alert(
            "Notifications are blocked",
            "Turn on notifications for SAMAHAN in your phone settings to get trip updates on your phone. Trip updates are still saved in Notifications.",
            [
              { text: "Not now", style: "cancel" },
              {
                text: "Open settings",
                onPress: () => Linking.openSettings(),
              },
            ],
          );
          return;
        }
      }

      await setNotificationPreferences(uid, { enabled: nextValue });
    } catch {
      setIsNotificationsEnabled(previousValue);
      Alert.alert("Could not save", "Your notification setting was not changed. Please try again.");
    } finally {
      savingPreference.current = false;
    }
  };

  const handleSignOut = () => {
    if (signingOut) return;

    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
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
    ]);
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
          <Text style={styles.userName}>{identity.name}</Text>

          {!!identity.email && (
            <Text style={styles.userEmail} selectable>
              {identity.email}
            </Text>
          )}
        </View>

        {!!profileError && (
          <View style={styles.syncCard}>
            <Text style={styles.syncMessage} accessibilityLiveRegion="polite">
              {profileError}
            </Text>
            <TouchableOpacity
              onPress={retryProfile}
              disabled={profileSyncing}
              accessibilityRole="button"
              style={styles.syncButton}
            >
              {profileSyncing ? (
                <ActivityIndicator color={COLORS.pink} />
              ) : (
                <Text style={styles.syncButtonText}>Retry sync</Text>
              )}
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
              <Ionicons name="card-outline" size={22} color={COLORS.pink} />

              <Text style={styles.menuText}>Edit Profile Information</Text>
            </View>

            <Ionicons name="chevron-forward" size={18} color="#CCCCCC" />
          </TouchableOpacity>

          <View style={[styles.menuItem, isGoogle && styles.lastMenuItem]}>
            <View style={styles.menuLeft}>
              <Ionicons name="notifications-outline" size={22} color={COLORS.pink} />

              <Text style={styles.menuText}>Notifications</Text>
            </View>

            <Switch
              trackColor={{
                false: "#E0E0E0",
                true: "#E8A5C8",
              }}
              thumbColor={isNotificationsEnabled ? COLORS.pink : "#F4F3F4"}
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
                <Ionicons name="lock-closed-outline" size={22} color={COLORS.pink} />

                <Text style={styles.menuText}>Reset Password</Text>
              </View>

              <Ionicons name="chevron-forward" size={18} color="#CCCCCC" />
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
            <ActivityIndicator size="small" color="#E57373" style={styles.signOutIndicator} />
          )}

          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
