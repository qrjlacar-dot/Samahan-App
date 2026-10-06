import { IMAGES } from "../../constants/images";
import { FloatingInput, PrimaryButton } from "../../components/common";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { styles } from "../../styles/login.styles";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);

  // Check required fields, then open Home without authentication.
  const handleLogin = () => {
    const missingEmail = !email.trim();
    const missingPassword = !password.trim();
    setEmailError(missingEmail);
    setPasswordError(missingPassword);
    if (missingEmail || missingPassword) return;
    router.replace("/(tabs)/home");
  };
  return (
    <View style={styles.page}>
      <View style={styles.card}>
        <View style={styles.logoRow}>
          <Image
            source={IMAGES.logo}
            style={styles.logoIcon}
          />
          <Image
            source={IMAGES.wordmark}
            style={styles.wordmark}
          />
        </View>
        <View style={styles.content}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>
              {[emailError && "* Please input your email address.", passwordError && "* Please input your password."].filter(Boolean).join("\n")}
            </Text>
          </View>
          <FloatingInput
            label="Email Address"
            value={email}
            onChangeText={text => {
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
            onChangeText={text => {
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
            <Text style={styles.forgotText}>
              Forgot Password?
            </Text>
          </TouchableOpacity>
          <PrimaryButton
            title="Log In"
            onPress={handleLogin}
            activeOpacity={0.8}
          />
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>
              Or continue with
            </Text>
            <View style={styles.dividerLine} />
          </View>
          <TouchableOpacity
            style={styles.googleButton}
            onPress={() => router.push("/(auth)/google-consent")}
            activeOpacity={0.8}
          >
            <Image
              source={IMAGES.googleIcon}
              style={styles.googleIcon}
            />
            <Text style={styles.googleButtonText}>
              Google
            </Text>
          </TouchableOpacity>
          <View style={styles.signupRow}>
            <Text style={styles.signupText}>
              Don't have an account?
              {" "}
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/(auth)/sign-up")}
              activeOpacity={0.7}
            >
              <Text style={styles.signupLink}>
                Sign Up
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}
