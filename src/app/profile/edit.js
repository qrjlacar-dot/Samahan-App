import { Feather, Ionicons } from "@expo/vector-icons";
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
import { COLORS } from "../../constants/theme";
import { editStyles as styles } from "../../styles/editProfile.styles";

function FloatingInput({
  label,
  value,
  onChangeText,
  keyboardType = "default",
  autoCapitalize = "none",
}) {
  const [isFocused, setIsFocused] = useState(false);
  const animatedLabel = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(animatedLabel, {
      toValue: isFocused || value ? 1 : 0,
      duration: 150,
      useNativeDriver: false,
    }).start();
  }, [isFocused, value]);

  const labelStyle = {
    top: animatedLabel.interpolate({ inputRange: [0, 1], outputRange: [13, -8] }),
    fontSize: animatedLabel.interpolate({ inputRange: [0, 1], outputRange: [16, 12] }),
    color: animatedLabel.interpolate({
      inputRange: [0, 1],
      outputRange: ["#AA8899", COLORS.pink],
    }),
  };

  return (
    <View style={styles.inputWrapper}>
      <Animated.Text style={[styles.floatingLabel, labelStyle]}>
        {label}
      </Animated.Text>

      <TextInput
        style={[styles.inputField, isFocused && styles.inputFieldFocused]}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        placeholder={isFocused && !value ? label : undefined}
        placeholderTextColor="#BFBFBF"
      />
    </View>
  );
}

export default function EditProfile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const handleConfirmChanges = () => {
    Alert.alert("Success", "Profile information updated successfully!", [
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
          <Ionicons name="arrow-back" size={22} color="#333333" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.editTitle}>Edit Profile Information</Text>

        <View style={styles.avatarWrapper}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={50} color={COLORS.pink} />
          </View>
          <View style={styles.avatarEditBadge}>
            <Feather name="edit-2" size={14} color={COLORS.pink} />
          </View>
        </View>

        <View style={styles.formContainer}>
          <FloatingInput label="Name" value={name} onChangeText={setName} />

          <FloatingInput
            label="Email Address"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <FloatingInput
            label="Phone Number"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />

          <TouchableOpacity
            style={styles.confirmButton}
            onPress={handleConfirmChanges}
            activeOpacity={0.7}
          >
            <Text style={styles.confirmButtonText}>Confirm Changes</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}