import { AuthFormLayout } from "../../components/AuthFormLayout";
import { LegalLinks } from "../../components/LegalLinks";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { Alert, Text, TouchableOpacity, View } from "react-native";
import { FloatingInput, PrimaryButton } from "../../components/common";
import { ProfileAvatar } from "../../components/ProfileAvatar";
import { accountErrorMessage, registerWithEmail } from "../../services/auth/account";
import { styles } from "../../styles/sign-up.styles";

export default function SignUpScreen() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const submitting = useRef(false);

  const handleSignUp = async () => {
    if (submitting.current) return;
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
    submitting.current = true;
    setLoading(true);
    try {
      await registerWithEmail(name, email, password);
      router.replace("/(tabs)/home");
    } catch (error) {
      Alert.alert(
        "Sign Up failed",
        error.code === "account/profile-incomplete" ? error.message : accountErrorMessage(error),
      );
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  return (
    <AuthFormLayout footer={<LegalLinks disabled={loading} />}>
      {({ onInputFocus, compact }) => (
        <View style={styles.form}>
          <View style={styles.content}>
            <View style={styles.headerRow}>
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>Let's get you started!</Text>
            </View>

            <View style={[styles.avatarWrapper, compact && styles.compactAvatarWrapper]}>
              <ProfileAvatar
                name={name}
                style={[styles.avatarCircle, compact && styles.compactAvatarCircle]}
              />
            </View>

            <FloatingInput
              onFocus={onInputFocus}
              editable={!loading}
              label="Name"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />

            <FloatingInput
              onFocus={onInputFocus}
              editable={!loading}
              label="Email Address"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <FloatingInput
              onFocus={onInputFocus}
              editable={!loading}
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <FloatingInput
              onFocus={onInputFocus}
              editable={!loading}
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

            <View style={[styles.loginRow, compact && styles.compactLoginRow]}>
              <Text style={styles.loginText}>Already have an account? </Text>

              <TouchableOpacity
                disabled={loading}
                onPress={() => router.replace("/(auth)/login")}
                activeOpacity={0.7}
              >
                <Text style={styles.loginLink}>Log In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </AuthFormLayout>
  );
}
