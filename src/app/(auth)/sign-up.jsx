import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { FloatingInput, PrimaryButton } from "../../components/common";
import { COLORS } from "../../constants/theme";
import { styles } from "../../styles/sign-up.styles";

export default function SignUpScreen() {
  const router = useRouter();

  const [pageHeight, setPageHeight] = useState(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

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
                  <View style={styles.avatarCircle}>
                    <Ionicons name="person" size={50} color={COLORS.pink} />
                  </View>

                  <TouchableOpacity
                    style={styles.cameraBadge}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="camera" size={14} color="#fff" />
                  </TouchableOpacity>
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
