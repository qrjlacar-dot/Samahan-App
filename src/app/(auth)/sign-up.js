import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc, updateDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadString } from "firebase/storage";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { auth, db, storage } from "../../services/firebase";
import { styles, PINK } from "../../styles/sign-up.styles";

function FloatingInput({
  label,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
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
  }, [animatedLabel, isFocused, value]);

  const labelStyle = {
    top: animatedLabel.interpolate({
      inputRange: [0, 1],
      outputRange: [13, -8],
    }),
    fontSize: animatedLabel.interpolate({
      inputRange: [0, 1],
      outputRange: [16, 12],
    }),
    color: animatedLabel.interpolate({
      inputRange: [0, 1],
      outputRange: ["#AA8899", PINK],
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
        secureTextEntry={secureTextEntry && !showValue}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        placeholder={isFocused && !value ? label : undefined}
        placeholderTextColor="#BFBFBF"
      />

      {secureTextEntry && (
        <TouchableOpacity
          style={styles.eyeIcon}
          onPress={() => setShowValue((current) => !current)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={showValue ? "eye-off-outline" : "eye-outline"}
            size={19}
            color="#999"
          />
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function SignUpScreen() {
  const router = useRouter();
  const cardHeight = useRef(Dimensions.get("screen").height * 0.8).current;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(false);

  const pickPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.65,
        base64: true,
      });

      if (!result.canceled && result.assets?.[0]) {
        setPhoto(result.assets[0]);
      }
    } catch {
      Alert.alert("Photo unavailable", "Please try choosing a photo again.");
    }
  };

  const confirmPhotoChoice = () => {
    Alert.alert(
      "Choose a profile picture",
      "Samahan will save the picture you choose as your profile picture when you create your account.",
      [
        { text: "Not now", style: "cancel" },
        { text: "Choose photo", onPress: pickPhoto },
      ]
    );
  };

  const handleSignUp = async () => {
    if (loading) return;

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedName || !trimmedEmail || !password || !confirmPassword) {
      Alert.alert("Missing details", "Please fill in all fields.");
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
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
    let accountCreated = false;

    try {
      const { user } = await createUserWithEmailAndPassword(
        auth,
        trimmedEmail,
        password
      );
      accountCreated = true;

      await updateProfile(user, { displayName: trimmedName });

      await setDoc(doc(db, "users", user.uid), {
        name: trimmedName,
        email: trimmedEmail,
        photoURL: "",
        phone: "",
      });

      let photoUploadFailed = false;

      if (photo?.base64) {
        try {
          const photoRef = ref(
            storage,
            `profilePictures/${user.uid}/avatar.jpg`
          );

          await uploadString(photoRef, photo.base64, "base64", {
            contentType: "image/jpeg",
          });

          const photoURL = await getDownloadURL(photoRef);
          await updateProfile(user, { photoURL });
          await updateDoc(doc(db, "users", user.uid), { photoURL });
        } catch {
          photoUploadFailed = true;
        }
      }

      if (photoUploadFailed) {
        Alert.alert(
          "Account created",
          "Your account is ready, but the picture could not be saved. You can add it later.",
          [{ text: "Continue", onPress: () => router.replace("/(tabs)/home") }]
        );
      } else {
        router.replace("/(tabs)/home");
      }
    } catch (err) {
      if (accountCreated) {
        await signOut(auth).catch(() => {});
        Alert.alert(
          "Account created",
          "Your account was created, but its profile could not be saved. Please log in with this email instead of signing up again."
        );
      } else if (err.code === "auth/email-already-in-use") {
        Alert.alert(
          "Email already used",
          "This email already has an account. Please log in."
        );
      } else if (err.code === "auth/weak-password") {
        Alert.alert("Weak password", "Please choose a stronger password.");
      } else {
        Alert.alert("Sign Up failed", "Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.page}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={[styles.card, { minHeight: cardHeight }]}>
          <View style={styles.content}>
            <View style={styles.headerRow}>
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>Let's get you started!</Text>
            </View>

            <View style={styles.avatarWrapper}>
              <View style={styles.avatarCircle}>
                {photo?.uri ? (
                  <Image
                    source={{ uri: photo.uri }}
                    style={{
                      width: "100%",
                      height: "100%",
                      borderRadius: 999,
                    }}
                  />
                ) : (
                  <Ionicons name="person" size={50} color={PINK} />
                )}
              </View>

              <TouchableOpacity
                style={styles.cameraBadge}
                onPress={confirmPhotoChoice}
                accessibilityLabel="Choose profile picture"
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

            <TouchableOpacity
              style={styles.signUpButton}
              onPress={handleSignUp}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={styles.signUpButtonText}>
                {loading ? "Creating account..." : "Sign Up"}
              </Text>
            </TouchableOpacity>

            <View style={styles.loginRow}>
              <Text style={styles.loginText}>Already have an account? </Text>
              <TouchableOpacity
                onPress={() => router.push("/(auth)/login")}
                activeOpacity={0.7}
              >
                <Text style={styles.loginLink}>Log In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}