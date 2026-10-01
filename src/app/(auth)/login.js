import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Animated,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { styles, PINK } from "../../styles/login.styles";

function FloatingInput({
  label,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  showRequired,
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
  }, [isFocused, value, animatedLabel]);

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
        {showRequired && (
          <Text style={styles.requiredAsterisk}> *</Text>
        )}
      </Animated.Text>

      <TextInput
        style={[
          styles.inputField,
          isFocused && styles.inputFieldFocused,
          showRequired && !value.trim() && styles.inputFieldError,
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

export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);

  // Check required fields, then open Home without Firebase authentication.
  const handleLogin = () => {
    const missingEmail = !email.trim();
    const missingPassword = !password.trim();

    setEmailError(missingEmail);
    setPasswordError(missingPassword);

    if (missingEmail || missingPassword) {
      return;
    }

    router.replace("/(tabs)/home");
  };

  return (
    <View style={styles.page}>
      <View style={styles.card}>
        <View style={styles.logoRow}>
          <Image
            source={require("../../../assets/images/logo.png")}
            style={styles.logoIcon}
          />
          <Image
            source={require("../../../assets/images/wordmark.png")}
            style={styles.wordmark}
          />
        </View>

        <View style={styles.content}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>
              {[
                emailError && "* Please input your email address.",
                passwordError && "* Please input your password.",
              ]
                .filter(Boolean)
                .join("\n")}
            </Text>
          </View>

          <FloatingInput
            label="Email Address"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (text.trim()) setEmailError(false);
            }}
            autoCapitalize="none"
            keyboardType="email-address"
            showRequired={emailError}
          />

          <FloatingInput
            label="Password"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (text.trim()) setPasswordError(false);
            }}
            autoCapitalize="none"
            secureTextEntry
            showRequired={passwordError}
          />

          <TouchableOpacity
            onPress={() => router.push("/(auth)/reset-password")}
            activeOpacity={0.7}
          >
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleLogin}
            activeOpacity={0.8}
          >
            <Text style={styles.loginButtonText}>Log In</Text>
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>Or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.googleButton}
            activeOpacity={0.8}
          >
            <Image
              source={require("../../../assets/images/google-icon.png")}
              style={styles.googleIcon}
            />
            <Text style={styles.googleButtonText}>Google</Text>
          </TouchableOpacity>

          <View style={styles.signupRow}>
            <Text style={styles.signupText}>Don't have an account? </Text>
            <TouchableOpacity
              onPress={() => router.push("/(auth)/sign-up")}
              activeOpacity={0.7}
            >
              <Text style={styles.signupLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}