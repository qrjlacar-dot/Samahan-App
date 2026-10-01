import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { sendPasswordResetEmail } from "firebase/auth";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scale, scaleFont } from "../../constants/scale";
import { COLORS, FONT_SIZES } from "../../constants/theme";
import { auth } from "../../services/firebase";
import { styles } from "../../styles/reset-password.styles";

function EmailInput({ value, onChangeText, disabled, showRequired }) {
  const [isFocused, setIsFocused] = useState(false);
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
      outputRange: [scale(13), scale(-8)],
    }),
    fontSize: animatedLabel.interpolate({
      inputRange: [0, 1],
      outputRange: [scaleFont(FONT_SIZES.input), scaleFont(FONT_SIZES.small)],
    }),
    color: animatedLabel.interpolate({
      inputRange: [0, 1],
      outputRange: [COLORS.textLight, COLORS.pink],
    }),
  };

  return (
    <View style={styles.inputWrapper}>
      <Animated.Text style={[styles.floatingLabel, labelStyle]}>
        Email Address
        {showRequired && <Text style={styles.requiredAsterisk}> *</Text>}
      </Animated.Text>

      <TextInput
        style={[
          styles.inputField,
          isFocused && styles.inputFieldFocused,
          showRequired && styles.inputFieldError,
        ]}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        editable={!disabled}
        placeholder={isFocused && !value ? "Email Address" : undefined}
        placeholderTextColor={COLORS.placeholder}
      />
    </View>
  );
}

export default function ResetPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (loading) return;

    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      setEmailError(true);
      setError("* Please input your email address.");
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
      setEmailError(false);
      setError("* Please enter a valid email address.");
      return;
    }

    setEmailError(false);
    setError("");
    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, trimmedEmail);

      Alert.alert(
        "Check your email",
        "If this address has an account, you'll receive a password reset link.",
        [{ text: "OK", onPress: () => router.replace("/(auth)/login") }]
      );
    } catch {
      setError("We couldn't send the email. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.page}>
      <View style={[styles.navbar, { paddingTop: insets.top }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons
            name="arrow-back"
            size={scale(22)}
            color={COLORS.textDark}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.mailIconCircle}>
          <Ionicons
            name="mail-outline"
            size={scale(42)}
            color={COLORS.pink}
          />
        </View>

        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>
          Enter your email address and we'll send you a link to create a new password.
        </Text>

        <View style={styles.formContainer}>
          {!!error && (
            <Text
              style={[
                styles.errorText,
                {
                  position: "absolute",
                  top: -scale(34),
                  left: 0,
                  right: 0,
                  marginBottom: 0,
                },
              ]}
            >
              {error}
            </Text>
          )}

          <EmailInput
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (text) {
                setEmailError(false);
                setError("");
              }
            }}
            disabled={loading}
            showRequired={emailError}
          />

          <TouchableOpacity
            style={styles.resetButton}
            onPress={handleReset}
            disabled={loading}
            activeOpacity={0.7}
          >
            <Text style={styles.resetButtonText}>
              {loading ? "Sending..." : "Send Reset Link"}
            </Text>
          </TouchableOpacity>

          <Text style={styles.helperText}>
            Check your inbox and spam folder for the link.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}