import { Feather, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  verifyBeforeUpdateEmail,
} from "firebase/auth";
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

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function FloatingInput({
  label,
  value,
  onChangeText,
  keyboardType = "default",
  autoCapitalize = "none",
  editable = true,
  secureTextEntry = false,
}) {
  const [isFocused, setIsFocused] = useState(false);
  const [showValue, setShowValue] = useState(false);
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
          secureTextEntry && styles.inputFieldPassword,
          isFocused && styles.inputFieldFocused,
          !editable && styles.inputFieldDisabled,
        ]}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        secureTextEntry={secureTextEntry && !showValue}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        editable={editable}
        placeholder={isFocused && !value ? label : undefined}
        placeholderTextColor="#BFBFBF"
      />

      {secureTextEntry && (
        <TouchableOpacity
          style={styles.eyeIcon}
          onPress={() => setShowValue((current) => !current)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={showValue ? "eye-off-outline" : "eye-outline"}
            size={19}
            color={COLORS.textLight}
          />
        </TouchableOpacity>
      )}
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
  const [initialEmail, setInitialEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const user = auth.currentUser;
  const isGoogleOnly =
    !!user &&
    user.providerData.length > 0 &&
    user.providerData.every((p) => p.providerId === "google.com");

  const emailChanged =
    !isGoogleOnly && email.trim() !== initialEmail && email.trim().length > 0;

  useEffect(() => {
    if (!user) {
      router.replace("/(auth)/login");
      return;
    }

    setEmail(user.email || "");
    setInitialEmail(user.email || "");

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

  const saveName = async () => {
    await setDoc(
      doc(db, "users", user.uid),
      { name: name.trim() },
      { merge: true },
    );
  };

  const handleConfirmChanges = async () => {
    if (!user) return;

    if (!name.trim()) {
      Alert.alert("Error", "Name can't be empty.");
      return;
    }

    if (emailChanged) {
      if (!EMAIL_REGEX.test(email.trim())) {
        Alert.alert("Error", "Please enter a valid email address.");
        return;
      }
      if (!currentPassword) {
        Alert.alert(
          "Error",
          "Enter your current password to confirm the email change.",
        );
        return;
      }
    }

    setSaving(true);
    try {
      // Always save the name, whether or not the email is changing.
      await saveName();

      if (emailChanged) {
        // Changing your login email is sensitive — Firebase requires a
        // recent sign-in, so re-authenticate with the current password first.
        const credential = EmailAuthProvider.credential(
          initialEmail,
          currentPassword,
        );
        await reauthenticateWithCredential(user, credential);

        // This sends a verification link to the NEW address. The email on
        // the account only actually changes once the user clicks it — until
        // then auth.currentUser.email stays the old one.
        await verifyBeforeUpdateEmail(user, email.trim());

        setCurrentPassword("");
        setEmail(initialEmail); // reflect that nothing has changed yet

        Alert.alert(
          "Verify your new email",
          `We've sent a verification link to ${email.trim()}. Your sign-in email will update once you confirm it — until then, keep using ${initialEmail} to log in.`,
          [{ text: "OK", onPress: goToProfile }],
        );
      } else {
        Alert.alert("Success", "Profile information updated successfully!", [
          { text: "OK", onPress: goToProfile },
        ]);
      }
    } catch (err) {
      if (
        err.code === "auth/wrong-password" ||
        err.code === "auth/invalid-credential"
      ) {
        Alert.alert("Error", "Current password is incorrect.");
      } else if (err.code === "auth/email-already-in-use") {
        Alert.alert(
          "Error",
          "That email is already associated with another account.",
        );
      } else if (err.code === "auth/invalid-email") {
        Alert.alert("Error", "Please enter a valid email address.");
      } else if (err.code === "auth/requires-recent-login") {
        Alert.alert(
          "Please sign in again",
          "For security, you need to log in again before changing your email.",
        );
      } else {
        Alert.alert("Error", "Couldn't save your changes. Please try again.");
      }
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
              editable={!isGoogleOnly}
            />

            {isGoogleOnly && (
              <Text style={styles.infoText}>
                Your account signs in with Google, so the email is managed
                there.
              </Text>
            )}

            {emailChanged && (
              <FloatingInput
                label="Current Password"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry
              />
            )}

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
