import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  FloatingInput,
  PrimaryButton,
} from "../../components/common";
import { IMAGES } from "../../constants/images";
import {
  accountErrorMessage,
  loginWithEmail,
} from "../../services/account";
import { canSignInWithGoogle } from "../../services/google-auth";
import { styles } from "../../styles/login.styles";

export default function LoginScreen() {
  const router = useRouter();

  const [pageHeight, setPageHeight] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [loading, setLoading] = useState(false);
  const submitting = useRef(false);

  const handleLayout = (event) => {
    const height = event.nativeEvent.layout.height;

    if (height > 0) {
      setPageHeight((previous) => previous ?? height);
    }
  };

  const handleLogin = async () => {
    if (submitting.current) return;

    const missingEmail = !email.trim();
    const missingPassword = !password;

    setEmailError(missingEmail);
    setPasswordError(missingPassword);

    if (missingEmail || missingPassword) return;

    Keyboard.dismiss();
    submitting.current = true;
    setLoading(true);

    try {
      await loginWithEmail(email, password);
      router.replace("/(tabs)/home");
    } catch (error) {
      Alert.alert("Log In failed", accountErrorMessage(error));
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen} onLayout={handleLayout}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.pageScroll}
          contentContainerStyle={styles.pageScrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="none"
          automaticallyAdjustKeyboardInsets={false}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.page,
              pageHeight !== null && {
                flex: 0,
                height: pageHeight,
              },
            ]}
          >
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
                  editable={!loading}
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
                  editable={!loading}
                  showRequired={passwordError}
                />

                <TouchableOpacity
                  disabled={loading}
                  onPress={() =>
                    router.push("/(auth)/reset-password")
                  }
                  activeOpacity={0.7}
                >
                  <Text style={styles.forgotText}>
                    Forgot Password?
                  </Text>
                </TouchableOpacity>

                <PrimaryButton
                  title="Log In"
                  onPress={handleLogin}
                  disabled={loading}
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
                  disabled={loading}
                  onPress={() => {
                    if (canSignInWithGoogle()) {
                      router.push("/(auth)/google-consent");
                    }
                  }}
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
                    Don't have an account?{" "}
                  </Text>

                  <TouchableOpacity
                    disabled={loading}
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
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}