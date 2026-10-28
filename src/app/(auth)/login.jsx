import { AuthFormLayout } from "../../components/AuthFormLayout";
import { LegalLinks } from "../../components/LegalLinks";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { Alert, Image, Keyboard, Text, TouchableOpacity, View } from "react-native";
import { FloatingInput, PrimaryButton } from "../../components/common";
import { IMAGES } from "../../constants/images";
import { accountErrorMessage, loginWithEmail } from "../../services/auth/account";
import { signInWithGoogle } from "../../services/auth/google-auth";
import { styles } from "../../styles/login.styles";

export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [loading, setLoading] = useState(false);
  const submitting = useRef(false);

  // Authentication: keep form feedback separate from the sign-in request.
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

  const handleGoogleSignIn = async () => {
    if (submitting.current) return;
    Keyboard.dismiss();
    submitting.current = true;
    setLoading(true);
    try {
      const user = await signInWithGoogle();
      if (user) router.replace("/(tabs)/home");
    } catch (error) {
      Alert.alert("Google Sign In failed", accountErrorMessage(error));
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  return (
    <AuthFormLayout footer={<LegalLinks disabled={loading} />}>
      {({ onInputFocus, compact }) => (
        <View style={styles.form}>
          <View style={[styles.logoRow, compact && styles.compactLogoRow]}>
            <Image source={IMAGES.logo} style={styles.logoIcon} />

            <Image source={IMAGES.wordmark} style={styles.wordmark} />
          </View>

          <View style={styles.content}>
            {(emailError || passwordError) && (
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
            )}

            <FloatingInput
              onFocus={onInputFocus}
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
              onFocus={onInputFocus}
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
              onPress={() => router.push("/(auth)/reset-password")}
              activeOpacity={0.7}
            >
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>

            <PrimaryButton
              title="Log In"
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            />

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />

              <Text style={styles.dividerText}>Or continue with</Text>

              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={styles.googleButton}
              disabled={loading}
              onPress={handleGoogleSignIn}
              activeOpacity={0.8}
            >
              <Image source={IMAGES.googleIcon} style={styles.googleIcon} />

              <Text style={styles.googleButtonText}>Google</Text>
            </TouchableOpacity>

            <View style={[styles.signupRow, compact && styles.compactSignupRow]}>
              <Text style={styles.signupText}>Don't have an account? </Text>

              <TouchableOpacity
                disabled={loading}
                onPress={() => router.push("/(auth)/sign-up")}
                activeOpacity={0.7}
              >
                <Text style={styles.signupLink}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </AuthFormLayout>
  );
}
