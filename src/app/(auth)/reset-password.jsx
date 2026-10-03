import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Alert, Text, View } from "react-native";
import {
  FloatingInput,
  PageLayout,
  PrimaryButton,
} from "../../components/common";
import { scale } from "../../constants/scale";
import { COLORS } from "../../constants/theme";
import { styles } from "../../styles/reset-password.styles";

export default function ResetPasswordScreen() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState(false);

  const handleEmailChange = (text) => {
    setEmail(text);
    setEmailError(false);
    setError("");
  };

  const handleReset = () => {
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

    Alert.alert(
      "Reset Password Preview",
      "Your email address is valid. Sending reset links is not connected yet."
    );
  };

  return (
    <PageLayout contentStyle={styles.content}>
      <View style={styles.mailIconCircle}>
        <Ionicons
          name="mail-outline"
          size={scale(42)}
          color={COLORS.pink}
        />
      </View>

      <Text style={styles.title}>Reset Password</Text>

      <Text style={styles.subtitle}>
        Don't worry, we'll help you get back in :{">"}
      </Text>

      <View style={styles.formContainer}>
        {!!error && (
          <Text style={styles.errorText}>{error}</Text>
        )}

        <FloatingInput
          label="Email Address"
          value={email}
          onChangeText={handleEmailChange}
          keyboardType="email-address"
          autoCapitalize="none"
          showRequired={emailError}
        />

        <PrimaryButton
          title="Send Reset Link"
          onPress={handleReset}
          style={styles.resetButton}
          textStyle={styles.resetButtonText}
          activeOpacity={0.7}
        />

        <Text style={styles.helperText}>
          Check your inbox and spam folder for the link.
        </Text>
      </View>
    </PageLayout>
  );
}