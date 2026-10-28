import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PrimaryButton } from "../../components/PrimaryButton";
import { scale } from "../../constants/scale";
import { COLORS } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import {
  getNotificationPreferences,
  loadNotifications,
  markNotificationRead,
  removeNotification,
} from "../../services/notifications";
import { styles } from "../../styles/notifications.styles";
import { getPhonePermission } from "../../services/phoneNotifications";
import { AppState } from "react-native";

const FILTERS = [
  { label: "All", category: null },
  { label: "Trips", category: "trips" },
];

const EMPTY_MESSAGE = "Your completed and cancelled trips will appear here.";

function iconFor(item) {
  if (item.eventId?.startsWith("trip-cancelled:")) {
    return "close-circle-outline";
  }

  if (item.eventId?.startsWith("trip-completed:")) {
    return "checkmark-circle-outline";
  }

  return "bus-outline";
}

function startOfDay(date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime();
}

function formatTime(iso) {
  const created = new Date(iso);

  const minutes = Math.floor((Date.now() - created.getTime()) / 60000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;

  if (startOfDay(created) === startOfDay(new Date())) {
    return created.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return created.toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
}

function groupByDay(items) {
  const today = startOfDay(new Date());

  const todayItems = items.filter(
    (item) => startOfDay(new Date(item.createdAt)) >= today,
  );

  const earlierItems = items.filter(
    (item) => startOfDay(new Date(item.createdAt)) < today,
  );

  return [
    {
      key: "today",
      label: "TODAY",
      items: todayItems,
    },
    {
      key: "earlier",
      label: "EARLIER",
      items: earlierItems,
    },
  ].filter((section) => section.items.length > 0);
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const uid = user?.uid;

  // State: keep account history, filters and pending row actions together.
  const [notifications, setNotifications] = useState([]);
  const [enabled, setEnabled] = useState(true);
  const [status, setStatus] = useState("loading");
  const [filter, setFilter] = useState(FILTERS[0]);
  const [busyId, setBusyId] = useState(null);
  const requestId = useRef(0);

  // Loading: ignore results after an account change or a newer refresh.
  const load = useCallback(async () => {
    const id = ++requestId.current;

    if (!uid) {
      setNotifications([]);
      setStatus("ready");
      return;
    }

    setStatus("loading");

    try {
      const [items, preferences, permission] = await Promise.all([
        loadNotifications(uid),
        getNotificationPreferences(uid),
        getPhonePermission(),
      ]);

      if (id !== requestId.current) return;

      setNotifications(items);
      setEnabled(preferences.enabled && permission === "granted");
      setStatus("ready");
    } catch {
      if (id !== requestId.current) return;
      setStatus("error");
    }
  }, [uid]);

  useFocusEffect(
    useCallback(() => {
      load();
      const subscription = AppState?.addEventListener?.("change", (state) => {
        if (state === "active") void load();
      });

      return () => {
        requestId.current += 1;
        subscription?.remove();
      };
    }, [load]),
  );

  // This page is only for trip updates. Older saved notifications of other
  // kinds (for example "Favorite saved") are not shown.
  const visible = useMemo(
    () =>
      notifications.filter(
        (item) =>
          item.category === "trips" &&
          (!filter.category || item.category === filter.category),
      ),
    [notifications, filter],
  );

  const sections = useMemo(() => groupByDay(visible), [visible]);

  // Row actions: mark updates read before opening the related screen.
  const openNotification = async (item) => {
    if (!uid) return;

    if (!item.readAt) {
      const readAt = new Date().toISOString();

      setNotifications((current) =>
        current.map((entry) =>
          entry.id === item.id ? { ...entry, readAt } : entry,
        ),
      );

      try {
        await markNotificationRead(uid, item.id);
      } catch {}
    }

    if (item.target?.screen === "favorites") {
      router.navigate("/favorites");
    } else if (item.target?.screen === "directions") {
      router.push({
        pathname: "/directions",
        params: {
          journey: JSON.stringify(item.target.journey),
        },
      });
    }
  };

  const deleteNotification = async (item) => {
    if (!uid || busyId) return;

    setBusyId(item.id);

    try {
      await removeNotification(uid, item.id);

      setNotifications((current) =>
        current.filter((entry) => entry.id !== item.id),
      );
    } catch {
      Alert.alert("Could not delete", "Please try again.");
    } finally {
      setBusyId(null);
    }
  };

  const emptyMessage = EMPTY_MESSAGE;

  return (
    <SafeAreaView style={styles.page} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>

        <Text style={styles.subtitle}>
          Keep track of your completed and cancelled trips.
        </Text>
      </View>

      <ScrollView
        horizontal
        style={styles.filterScroll}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pillsRow}
      >
        {FILTERS.map((item) => {
          const active = item.label === filter.label;

          return (
            <TouchableOpacity
              key={item.label}
              style={[styles.pill, !active && styles.pillInactive]}
              activeOpacity={0.8}
              onPress={() => setFilter(item)}
              accessibilityRole="button"
              accessibilityState={{
                selected: active,
              }}
            >
              <Text
                style={[styles.pillText, !active && styles.pillTextInactive]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView
        style={styles.listScroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {status === "ready" && !enabled && (
          <Text style={styles.offNotice}>
            Phone notifications are off. Trip updates are still saved here. Turn
            them on in Profile to also get them on your phone.
          </Text>
        )}

        {status === "loading" && (
          <View style={styles.stateBox}>
            <ActivityIndicator color={COLORS.pink} />
          </View>
        )}

        {status === "error" && (
          <View style={styles.stateBox}>
            <Text style={styles.stateText}>
              We could not load your notifications.
            </Text>

            <PrimaryButton
              title="Try again"
              onPress={load}
              style={styles.retryButton}
            />
          </View>
        )}

        {status === "ready" && sections.length === 0 && (
          <View style={styles.stateBox}>
            <Text style={styles.stateText}>{emptyMessage}</Text>
          </View>
        )}

        {status === "ready" &&
          sections.map((section) => (
            <View key={section.key} style={styles.section}>
              <Text style={styles.sectionHeader}>{section.label}</Text>

              {section.items.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.row}
                  activeOpacity={0.7}
                  onPress={() => openNotification(item)}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.title}. ${item.body}`}
                  accessibilityHint={item.readAt ? undefined : "Unread"}
                >
                  <View style={styles.rowIcon}>
                    <Ionicons
                      name={iconFor(item)}
                      size={scale(20)}
                      color={COLORS.pink}
                    />
                  </View>

                  <View style={styles.rowText}>
                    <Text
                      style={[
                        styles.rowTitle,
                        !item.readAt && styles.rowTitleUnread,
                      ]}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>

                    <Text style={styles.rowBody} numberOfLines={2}>
                      {item.body}
                    </Text>

                    <Text style={styles.rowTime}>
                      {formatTime(item.createdAt)}
                    </Text>
                  </View>

                  {!item.readAt && <View style={styles.unreadDot} />}

                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => deleteNotification(item)}
                    disabled={busyId === item.id}
                    accessibilityRole="button"
                    accessibilityLabel="Delete notification"
                  >
                    <Ionicons
                      name="trash-outline"
                      size={scale(20)}
                      color={COLORS.textLight}
                    />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </View>
          ))}
      </ScrollView>
    </SafeAreaView>
  );
}
