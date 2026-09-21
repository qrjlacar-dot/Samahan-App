import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
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
import { editStyles as styles } from "../../styles/editProfile.styles";

function FloatingInput({
  label,
  value,
  onChangeText,
  secureTextEntry = false,
  keyboardType = "default",
  autoCapitalize = "none",
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
  }, [isFocused, value]);

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
        placeholderTextColor={COLORS.placeholder}
      />

      {secureTextEntry && (
        <TouchableOpacity
          style={styles.eyeIcon}
          onPress={() => setShowValue((current) => !current)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={showValue ? "eye-off-outline" : "eye-outline"}
            size={scale(19)}
            color={COLORS.textLight}
          />
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function ResetPassword() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleConfirmPasswordChange = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert("Error", "Please fill in all password fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "New passwords do not match.");
      return;
    }

    Alert.alert("Success", "Password reset successfully!", [
      { text: "OK", onPress: () => router.back() },
    ]);
  };

  return (
    <View style={styles.container}>
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
        <Text style={styles.editTitle}>Reset Password</Text>

        <View style={styles.formContainer}>
          <FloatingInput
            label="Current Password"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry
          />

          <FloatingInput
            label="New Password"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
          />

          <FloatingInput
            label="Confirm New Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={styles.confirmButton}
            onPress={handleConfirmPasswordChange}
            activeOpacity={0.7}
          >
            <Text style={styles.confirmButtonText}>Confirm Changes</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}