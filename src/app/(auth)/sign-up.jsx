import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { auth, db } from "../../services/firebase";
import { styles, PINK } from "../../styles/sign-up.styles";

function FloatingInput({
  label,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
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
  }, [animatedLabel, isFocused, value]);

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
      outputRange: ["#AA8899", PINK],
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
        ]}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        secureTextEntry={secureTextEntry && !showValue}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        placeholder={isFocused && !value ? label : undefined}
        placeholderTextColor="#BFBFBF"
      />

      {secureTextEntry && (
        <TouchableOpacity
          style={styles.eyeIcon}
          onPress={() => setShowValue((current) => !current)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={showValue ? "Hide password" : "Show password"}
        >
          <Ionicons
            name={showValue ? "eye-off-outline" : "eye-outline"}
            size={19}
            color="#999"
          />
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function SignUpScreen() {
  const router = useRouter();
  const cardHeight = useRef(Dimensions.get("screen").height * 0.8).current;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const showDefaultProfileMessage = () => {
    Alert.alert(
      "Default Profile Picture",
      "Samahan uses this default icon for all accounts. Profile photo customization is currently unavailable.",
      [{ text: "OK" }]
    );
  };

  const handleSignUp = async () => {
    if (loading) return;

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedName || !trimmedEmail || !password || !confirmPassword) {
      Alert.alert("Missing details", "Please fill in all fields.");
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
      Alert.alert("Invalid email", "Please enter a valid email address.");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Short password", "Use at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Passwords don't match", "Please check both passwords.");
      return;
    }

    setLoading(true);
    let accountCreated = false;

    try {
      const { user } = await createUserWithEmailAndPassword(
        auth,
        trimmedEmail,
        password
      );

      accountCreated = true;

      await updateProfile(user, {
        displayName: trimmedName,
      });

      await setDoc(doc(db, "users", user.uid), {
        name: trimmedName,
        email: trimmedEmail,
        phone: "",
      });

      router.replace("/(tabs)/home");
    } catch (err) {
      if (accountCreated) {
        await signOut(auth).catch(() => {});

        Alert.alert(
          "Account created",
          "Your account was created, but its profile could not be saved. Please log in with this email instead of signing up again."
        );
      } else if (err.code === "auth/email-already-in-use") {
        Alert.alert(
          "Email already used",
          "This email already has an account. Please log in."
        );
      } else if (err.code === "auth/weak-password") {
        Alert.alert("Weak password", "Please choose a stronger password.");
      } else {
        Alert.alert("Sign Up failed", "Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.page}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={[styles.card, { minHeight: cardHeight }]}>
          <View style={styles.content}>
            <View style={styles.headerRow}>
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>Let's get you started!</Text>
            </View>

            <TouchableOpacity
              style={styles.avatarWrapper}
              onPress={showDefaultProfileMessage}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="About the default profile picture"
            >
              <View style={styles.avatarCircle}>
                <Ionicons name="person" size={50} color={PINK} />
              </View>
            </TouchableOpacity>

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
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <FloatingInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <FloatingInput
              label="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />

            <TouchableOpacity
              style={styles.signUpButton}
              onPress={handleSignUp}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={styles.signUpButtonText}>
                {loading ? "Creating account..." : "Sign Up"}
              </Text>
            </TouchableOpacity>

            <View style={styles.loginRow}>
              <Text style={styles.loginText}>Already have an account? </Text>

              <TouchableOpacity
                onPress={() => router.push("/(auth)/login")}
                activeOpacity={0.7}
              >
                <Text style={styles.loginLink}>Log In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}