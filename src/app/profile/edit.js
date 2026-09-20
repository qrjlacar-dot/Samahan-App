import { Feather, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    Alert,
    Animated,
    SafeAreaView,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { editStyles as styles } from "../../styles/editProfile.styles";

function FloatingLabelInput({
  label,
  value,
  onChangeText,
  keyboardType = "default",
  autoCapitalize = "none",
}) {
  const [isFocused, setIsFocused] = useState(false);
  const animatedIsFocused = useRef(
    new Animated.Value(value === "" ? 0 : 1),
  ).current;

  useEffect(() => {
    Animated.timing(animatedIsFocused, {
      toValue: isFocused || value !== "" ? 1 : 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [isFocused, value]);

  const labelStyle = {
    position: "absolute",
    left: 10,
    top: animatedIsFocused.interpolate({
      inputRange: [0, 1],
      outputRange: [16, -9],
    }),
    fontSize: animatedIsFocused.interpolate({
      inputRange: [0, 1],
      outputRange: [14, 11],
    }),
    color: animatedIsFocused.interpolate({
      inputRange: [0, 1],
      outputRange: ["#B0B0B0", "#CA74A6"],
    }),
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 4,
    zIndex: 2,
    fontWeight: "500",
  };

  return (
    <View
      style={[
        styles.floatingInputContainer,
        isFocused && styles.floatingInputContainerFocused,
      ]}
    >
      <Animated.Text style={labelStyle} pointerEvents="none">
        {label}
      </Animated.Text>
      <View style={styles.inputInnerRow}>
        <TextInput
          style={styles.floatingInput}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
      </View>
    </View>
  );
}

export default function EditProfile() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const handleConfirmChanges = () => {
    Alert.alert("Success", "Profile information updated successfully!", [
      { text: "OK", onPress: () => router.back() },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#333333" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.editTitle}>Edit Profile Information</Text>

        <View style={styles.avatarWrapper}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={64} color="#CA74A6" />
          </View>
          <View style={styles.avatarEditBadge}>
            <Feather name="edit-2" size={14} color="#CA74A6" />
          </View>
        </View>

        <View style={styles.formContainer}>
          <FloatingLabelInput
            label="Name"
            value={name}
            onChangeText={setName}
          />

          <FloatingLabelInput
            label="Email Address"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <FloatingLabelInput
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
    </SafeAreaView>
  );
}
