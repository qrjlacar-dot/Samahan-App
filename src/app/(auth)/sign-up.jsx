import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { FloatingInput, PrimaryButton } from "../../components/common";
import { ProfileAvatar } from "../../components/ProfileAvatar";
import { accountErrorMessage, registerWithEmail } from "../../services/account";
import { styles } from "../../styles/sign-up.styles";

export default function SignUpScreen() {
  const router = useRouter();

  const [pageHeight, setPageHeight] = useState(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (loading) return;
    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      Alert.alert("Missing details", "Please fill in all fields.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
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
    try {
      await registerWithEmail(name, email, password);
      router.replace("/(tabs)/home");
    } catch (error) {
      Alert.alert(
        "Sign Up failed",
        error.code === "account/profile-incomplete"
          ? error.message
          : accountErrorMessage(error),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLayout = (event) => {
    const height = event.nativeEvent.layout.height;

    if (height > 0) {
      setPageHeight((previousHeight) => previousHeight ?? height);
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
              <View style={styles.content}>
                <View style={styles.headerRow}>
                  <Text style={styles.title}>Create Account</Text>
                  <Text style={styles.subtitle}>Let's get you started!</Text>
                </View>

                <View style={styles.avatarWrapper}>
                  <ProfileAvatar name={name} style={styles.avatarCircle} />
                </View>

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

                <PrimaryButton
                  title="Sign Up"
                  onPress={handleSignUp}
                  disabled={loading}
                  style={styles.signUpButton}
                  activeOpacity={0.8}
                />

                <View style={styles.loginRow}>
                  <Text style={styles.loginText}>
                    Already have an account?{" "}
                  </Text>

                  <TouchableOpacity
                    onPress={() => router.push("/(auth)/login")}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.loginLink}>Log In</Text>
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
