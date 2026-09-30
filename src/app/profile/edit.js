import { Feather, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../../constants/theme";
import { auth, db } from "../../services/firebase";
import { editStyles as styles } from "../../styles/editProfile.styles";

function FloatingInput({
  label,
  value,
  onChangeText,
  keyboardType = "default",
  autoCapitalize = "none",
  editable = true,
}) {
  const [isFocused, setIsFocused] = useState(false);
  const animatedLabel = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(animatedLabel, {
      toValue: isFocused || value ? 1 : 0,
      duration: 150,
      useNativeDriver: false,
    }).start();
  }, [isFocused, value]);

  const labelStyle = {
    top: animatedLabel.interpolate({
      inputRange: [0, 1],
      outputRange: [13, -8],
    }),
    fontSize: animatedLabel.interpolate({
      inputRange: [0, 1],
      outputRange: [16, 12],
    }),
    color: animatedLabel.interpolate({
      inputRange: [0, 1],
      outputRange: ["#AA8899", COLORS.pink],
    }),
  };

  return (
    <View style={styles.inputWrapper}>
      <Animated.Text style={[styles.floatingLabel, labelStyle]}>
        {label}
      </Animated.Text>

      <TextInput
        style={[
          styles.inputField,
          isFocused && styles.inputFieldFocused,
          !editable && styles.inputFieldDisabled,
        ]}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        editable={editable}
        placeholder={isFocused && !value ? label : undefined}
        placeholderTextColor="#BFBFBF"
      />
    </View>
  );
}

export default function EditProfile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Navigate back to Profile with a fresh `refresh` param so it reloads
  // the latest data instead of showing whatever it last had cached.
  const goToProfile = () =>
    router.replace({
      pathname: "/(tabs)/profile",
      params: { refresh: Date.now().toString() },
    });

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      router.replace("/(auth)/login");
      return;
    }

    setEmail(user.email || "");

    (async () => {
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          const data = snap.data();
          setName(data.name || "");
          // Phone is left untouched for now — not loaded or saved yet.
        }
      } catch (err) {
        Alert.alert("Error", "Couldn't load your profile. Please try again.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleConfirmChanges = async () => {
    const user = auth.currentUser;
    if (!user) return;

    if (!name.trim()) {
      Alert.alert("Error", "Name can't be empty.");
      return;
    }

    setSaving(true);
    try {
      await setDoc(
        doc(db, "users", user.uid),
        {
          name: name.trim(),
        },
        { merge: true },
      );

      Alert.alert("Success", "Profile information updated successfully!", [
        { text: "OK", onPress: goToProfile },
      ]);
    } catch (err) {
      Alert.alert("Error", "Couldn't save your changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.navbar, { paddingTop: insets.top }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={goToProfile}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color="#333333" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerFill}>
          <ActivityIndicator size="large" color={COLORS.pink} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
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
            <FloatingInput
              label="Name"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />

            <FloatingInput
              label="Email Address"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={false}
            />

            <FloatingInput
              label="Phone Number"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />

            <TouchableOpacity
              style={[
                styles.confirmButton,
                saving && styles.confirmButtonDisabled,
              ]}
              onPress={handleConfirmChanges}
              activeOpacity={0.7}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.confirmButtonText}>Confirm Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </View>
  );
}
